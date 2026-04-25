from flask import render_template, request, redirect, url_for, Blueprint
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import Auth



main_bp = Blueprint('main_bp', __name__)


# ===================================================================================



# ホーム画面
@main_bp.route('/home')
@login_required # ログイン必須
def home():
    return render_template('home.html', user=current_user)




