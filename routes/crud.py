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
from models import db, posts, post_images



crud_bp = Blueprint('crud', __name__) 


# ハッシュタグ抽出関数

def extract_hashtags(text):

    hashtags = re.findall(
        r"#(\w+)",
        text
    )

    return list(set(hashtags))



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
        db.session.commit()

        return jsonify({
            "success": True,
            "post" : {
                "post_id": new_post.post_id,
                "content": new_post.content,
                "created_at": new_post.created_at.isoformat() + "Z",
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



