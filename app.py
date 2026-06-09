# 一人用マイクロブログ（SNSライク）アプリケーションの制作

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for, Blueprint
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import flask_login
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin

from sqlalchemy.orm import joinedload
from sqlalchemy import event
from sqlalchemy.engine import Engine

from dotenv import load_dotenv
import os

from models import db, Auth
from routes.login_auth import login_auth_bp
from routes.main import main_bp
from routes.crud import crud_bp
from routes.postlog import postlog_bp


# ==================================================================================================


load_dotenv()

# SQLiteで外部キー制約を有効にするためのイベントリスナー
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Flaskアプリケーションの作成と設定
def create_app():
    app = Flask(__name__)

    # 環境変数の読み込み
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

    login_manager.login_view = 'login_auth_bp.login'

    # ブループリントの登録
    app.register_blueprint(login_auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(crud_bp)
    app.register_blueprint(postlog_bp)

    return app

app = create_app()

import os

print("Current working directory:", os.getcwd())
print("DATABASE_URL:", app.config['SQLALCHEMY_DATABASE_URI'])
print("DB exists:", os.path.exists("db/database.db"))

# =================================================================================================



if __name__ == '__main__':
    # アプリの起動
    app.run(host='0.0.0.0', port=5000, debug=True)
