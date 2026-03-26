# 一人用マイクロブログ（SNSライク）アプリケーションの制作

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import joinedload

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for
from flask_migrate import Migrate

from dotenv import load_dotenv
import os

from models import Post, Tag, User, TimerSession, db

def create_app():
    app = Flask(__name__)

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
    return render_template('index.html')


if __name__ == '__main__':
    # アプリの起動
    app.run(debug=True)