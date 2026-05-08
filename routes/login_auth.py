from flask import render_template, request, redirect, url_for, Blueprint, session
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import Auth



login_auth_bp = Blueprint('login_auth_bp', __name__)


# ===================================================================================


@login_auth_bp.route('/')
def start():
    return redirect(url_for('login_auth_bp.login'))



#  ログイン画面
@login_auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    print(f"debug: {current_user},{type(current_user)},{current_user.is_authenticated}")

    # すでにログインしている場合はホームへリダイレクト
    if current_user.is_authenticated:
        return redirect(url_for('main_bp.home'))

    # IDとパスワードでユーザー認証
    if request.method == 'POST':
        user_id = request.form.get('userid')
        password = request.form.get('password')

        # IDでユーザー取得
        user = Auth.query.filter_by(user_id=user_id).first()

        # ユーザー存在 + パスワード一致
        if user and check_password_hash(user.password_hash, password):
            login_user(user)  # ログイン状態にする
            session["user_id"] = user.user_id  # セッションにユーザーIDを保存
            return redirect(url_for('main_bp.home'))  # ログイン後ページへ
        else:
            return render_template('index.html', error='ユーザーIDまたはパスワードが正しくありません。')

    return render_template('index.html')



# ログアウト処理
@login_auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login_auth_bp.login'))






