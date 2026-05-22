# routes.py
from flask import request, redirect, url_for, Blueprint, render_template, jsonify, session
from sqlalchemy.orm import joinedload
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3
import hashlib
import re
import os
import uuid
import datetime
from werkzeug.utils import secure_filename
from models import db, posts, post_images, tags, post_tags
from flask_login import login_required, current_user

crud_bp = Blueprint('crud', __name__) 


# 記号の前後除去用（許可文字以外を端から落とす）
TRIM_RE = re.compile(r'^[^0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+|[^0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+$')

# 許可文字のみに限定
ALLOWED_RE = re.compile(r'^[0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+$')

# 行頭 or 空白の直後の # だけを拾う
HASHTAG_RE = re.compile(r'(?:^|\s)#([^\s#]+)')

# ハッシュタグ抽出関数（tag.py と同じ条件）
def extract_tags(text: str) -> list[str]:
    if not text:
        return []

    raw_tags = [m.group(1) for m in HASHTAG_RE.finditer(text)]
    normalized_tags = []

    for tag in raw_tags:
        # 前後の記号を除去
        tag = TRIM_RE.sub('', tag)

        if not tag:
            continue

        # 許可文字のみかチェック（絵文字や記号を排除）
        if not ALLOWED_RE.match(tag):
            continue

        # 英字を小文字化
        tag = tag.lower()

        # 30文字まで
        tag = tag[:30]

        if tag:
            normalized_tags.append(tag)

    return list(set(normalized_tags))



# 画像保存
UPLOAD_FOLDER = os.path.join("static", "uploads")

def save_image(image):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    ext = os.path.splitext(image.filename)[1]
    filename = secure_filename(f"{uuid.uuid4()}{ext}")

    save_path = os.path.join(UPLOAD_FOLDER, filename)
    image.save(save_path)

    # DB には Web から参照できる相対パスを保存する
    return f"uploads/{filename}"


# ポスト作成処理
@crud_bp.route("/post/create", methods=["POST"])
@login_required
def create_post():
    try:
        user_id = session.get("user_id")
        post_type = request.form.get("post_type", "normal")
        reply_to_post_id = request.form.get("reply_to_post_id")
        quote_of_post_id = request.form.get("quote_of_post_id")
        repost_of_post_id = request.form.get("repost_of_post_id")

        content = request.form.get("content", "").strip()

        # 画像ファイルの取得
        images = [
            image for image in request.files.getlist("images")
            if image and image.filename
        ]

        if not content and not images:
            return jsonify({
                "success": False,
                "error": "本文が空です"
            }), 400

        # content_hash を生成（内容と現在時刻の組み合わせでユニークに）
        content_hash = hashlib.sha256(
            (content + str(datetime.datetime.utcnow())).encode("utf-8")
        ).hexdigest()

        # DB に保存
        new_post = posts(
            user_id=user_id,
            content=content,
            created_app="Echoes",
            created_at=datetime.datetime.utcnow(),
            post_type=post_type,
            reply_to_post_id=reply_to_post_id,
            quote_of_post_id=quote_of_post_id,
            repost_of_post_id=repost_of_post_id,
            content_hash=content_hash
        )

        db.session.add(new_post)
        db.session.flush()

        for sort_order, image in enumerate(images, start=1):
            image_path = save_image(image)
            db.session.add(post_images(
                post_id=new_post.post_id,
                image_path=image_path,
                sort_order=sort_order
            ))

        # タグの抽出と保存
        tags_data = extract_tags(content)
        for tag_name in tags_data:
            tag_obj = tags.query.filter_by(tags_name=tag_name).first()
            if not tag_obj:
                tag_obj = tags(tags_name=tag_name)
                db.session.add(tag_obj)
                db.session.flush()

            exists = post_tags.query.filter_by(
                post_id=new_post.post_id,
                tags_id=tag_obj.tags_id
            ).first()
            if not exists:
                db.session.add(post_tags(
                    post_id=new_post.post_id,
                    tags_id=tag_obj.tags_id
                ))

        db.session.commit()

        return jsonify({
            "success": True,
            "post": {
                "post_id": new_post.post_id,
                "content": new_post.content,
                "created_at": new_post.created_at.isoformat() + "Z",
                "updated_at": new_post.updated_at.isoformat() + "Z",
                "post_type": new_post.post_type,
                "reply_to_post_id": new_post.reply_to_post_id,
                "quote_of_post_id": new_post.quote_of_post_id,
                "repost_of_post_id": new_post.repost_of_post_id,
                "user_id": new_post.user_id,
                "username": new_post.user.username,
                "is_pinned": new_post.is_pinned,
                "images": [
                    {
                        "image_id": image.image_id,
                        "image_path": image.image_path,
                        "image_url": url_for("static", filename=image.image_path)
                    }
                    for image in sorted(new_post.post_images, key=lambda x: x.sort_order)
                ]
            }
        })

    except Exception as e:
        db.session.rollback()
        print(f"Error creating post: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@crud_bp.route("/api/posts/<int:post_id>/edit", methods=["POST"])
@login_required
def edit_post(post_id):
    post = posts.query.filter_by(
        post_id=post_id,
        user_id=current_user.user_id
    ).first_or_404()

    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "error": "empty"}), 400

    post.content = content

    # 既存の関連を全削除
    post_tags.query.filter_by(post_id=post.post_id).delete()

    # 再抽出して再登録
    tags_data = extract_tags(content)
    for tag_name in tags_data:
        tag_obj = tags.query.filter_by(tags_name=tag_name).first()
        if not tag_obj:
            tag_obj = tags(tags_name=tag_name)
            db.session.add(tag_obj)
            db.session.flush()

        db.session.add(post_tags(
            post_id=post.post_id,
            tags_id=tag_obj.tags_id
        ))

    db.session.commit()

    return jsonify({
        "success": True,
        "post": {
            "post_id": post.post_id,
            "content": post.content,
            "created_at": post.created_at.isoformat() + "Z",
            "updated_at": post.updated_at.isoformat() + "Z",
            "user_id": post.user_id,
            "username": post.user.username
        }
    })



