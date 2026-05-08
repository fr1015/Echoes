from flask import render_template, request, redirect, url_for, Blueprint
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import Auth
from routes.login_auth import login_auth_bp
from routes.crud import create_post


main_bp = Blueprint('main_bp', __name__)


# ===================================================================================





# ===================================================================================


# ホーム画面
@main_bp.route('/home')
@login_required # ログイン必須
def home():

    posts = Post.query.order_by(
        Post.created_at.desc()
    ).all()

    return render_template(
        "home.html",
        posts=posts
    )





