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

UPLOAD_FOLDER = "uploads"

def save_image(image):

    # アップロードフォルダが存在しない場合は作成
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # ファイル名をUUIDで生成して保存
    ext = os.path.splitext(image.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filename = secure_filename(filename)

    # ファイルを保存
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    image.save(save_path)

    # 保存したファイルのパスを返す
    return save_path



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

        #　本文を取得して前後の空白と改行を削除
        content = request.form.get("content", "").strip()
        #  本文が空の場合はエラー、画像がある場合は本文が空でもOK
        if not content:
            if 'image' not in request.files:
                return jsonify({
                    "success": False,
                    "error": "本文が空です"
                }), 400
            else:
                pass

        # コンテンツハッシュを本文＋投稿日時から生成
        content_hash = hashlib.sha256((content + str(datetime.datetime.utcnow())).encode('utf-8')).hexdigest()
        
        # 新しいポストインスタンスを作成
        new_post = posts(
            user_id=user_id,
            content=content,
            created_app='Echoes',
            created_at=datetime.datetime.utcnow(),
            post_type=post_type,
            reply_to_post_id=reply_to_post_id,
            quote_of_post_id=quote_of_post_id,
            repost_of_post_id=repost_of_post_id,
            content_hash=content_hash
        )
        
        # DBに追加してコミット
        db.session.add(new_post)
        db.session.flush()  # post_id を生成するために flush

        # タグ抽出 → tags / post_tags へ登録
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
            "post" : {
                "post_id": new_post.post_id,
                "content": new_post.content,
                "created_at": new_post.created_at.isoformat() + "Z",
                "updated_at": new_post.updated_at.isoformat() + "Z",
                "post_type": new_post.post_type,
                "reply_to_post_id": new_post.reply_to_post_id,
                "quote_of_post_id": new_post.quote_of_post_id,
                "repost_of_post_id": new_post.repost_of_post_id,
                "user_id": new_post.user_id,
                "username": new_post.user.username
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



