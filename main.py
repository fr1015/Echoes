# 一人用マイクロブログ（SNSライク）アプリケーションの制作

from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for
from flask_migrate import Migrate
import flask_login

from dotenv import load_dotenv
import os

from werkzeug.security import generate_password_hash, check_password_hash

from models import db


# ========================================================================




# Flaskアプリケーションの作成と設定
def create_app():
    app = Flask(__name__)

    # ログインマネージャーの設定
    # login_manager = flask_login.LoginManager()
    # login_manager.init_app(app)
    # これ書くと動かねえ


    # 環境変数の読み込み
    load_dotenv()
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

    # DB接続
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

     # SQLAlchemyの初期化とマイグレーション紐づけ
    db.init_app(app)
    Migrate(app, db)

    return app

app = create_app()


# メイン画面
@app.route('/')
def index():
    # IDとパスワードでユーザー認証


    return render_template('index.html')

if __name__ == '__main__':
    # アプリの起動
    app.run(debug=True)