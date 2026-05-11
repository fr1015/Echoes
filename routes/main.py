from flask import render_template, request, redirect, url_for, Blueprint, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import db, posts
from routes.login_auth import login_auth_bp
from routes.crud import create_post
from datetime import datetime

main_bp = Blueprint('main_bp', __name__)


# ===================================================================================





# ===================================================================================


# ホーム画面
@main_bp.route("/home")
@login_required # ログイン必須
def home():
    user = current_user.user  # Authモデルからusersモデルのインスタンスを取得
    return render_template("home.html", user=user)
    

@main_bp.route('/posts')
@login_required # ログイン必須
def get_posts():
    query = posts.query

    last_created_at = request.args.get("last_created_at")
    last_post_id = request.args.get("last_post_id")

    print("========")
    print("last_created_at:", last_created_at)
    print("last_post_id:", last_post_id)

    if last_created_at and last_post_id:

        last_created_at = datetime.fromisoformat(
            last_created_at
        )

        last_post_id = int(last_post_id)

        query = query.filter(

            db.or_(

                posts.created_at < last_created_at,

                db.and_(
                    posts.created_at == last_created_at,
                    posts.post_id < last_post_id
                )

            )

        )

    post_data = query.order_by(
        posts.created_at.desc(),
        posts.post_id.desc()
    ).limit(15).all()

    return jsonify([
        {
            "post_id": post.post_id,
            "content": post.content,
            "created_at": post.created_at.isoformat() + "Z", 
            "user_id": post.user_id,
            "username": post.user.username
        }
        for post in post_data
    ])





