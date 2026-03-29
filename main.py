# 一人用マイクロブログ（SNSライク）アプリケーションの制作

from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for
from flask_migrate import Migrate
import flask_login
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

from dotenv import load_dotenv
import os

from werkzeug.security import generate_password_hash, check_password_hash
import cryptography

from models import db, Auth


# ========================================================================




# Flaskアプリケーションの作成と設定
def create_app():
    app = Flask(__name__)

    # 環境変数の読み込み
    load_dotenv()
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

    # ログインマネージャーの設定
    login_manager = flask_login.LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return Auth.query.get(user_id)

    # DB接続
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

     # SQLAlchemyの初期化とマイグレーション紐づけ
    db.init_app(app)
    Migrate(app, db)

    return app

app = create_app()



@app.route('/')
def start():
    return redirect(url_for('index'))



# メイン画面
@app.route('/login', methods=['GET', 'POST'])
def index():
    # IDとパスワードでユーザー認証
    if request.method == 'POST':
        user_id = request.form.get('userid')
        password = request.form.get('password')

        # IDでユーザー取得
        user = Auth.query.filter_by(Auth_userid=user_id).first()

        # ユーザー存在 + パスワード一致
        if user and check_password_hash(user.Auth_password_hash, password):
            login_user(user)  # ログイン状態にする
            return redirect(url_for('home'))  # ログイン後ページへ
        else:
            print(user, "error")
            return "ログイン失敗"

    return render_template('index.html')

# ホーム画面
@app.route('/home')
@login_required # ログイン必須
def home():
    return render_template('home.html', user=current_user)

if __name__ == '__main__':
    # アプリの起動
    app.run(debug=True)