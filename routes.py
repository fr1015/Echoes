# routes.py
from flask import request, redirect, url_for, Blueprint, render_template
from sqlalchemy.orm import joinedload
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3
from models import db, Auth

bp = Blueprint('main', __name__)

# パスワードハッシュ化のためのライブラリ
from werkzeug.security import generate_password_hash    


def hash_password(password):
    return generate_password_hash(password)


@bp.route('/register', methods=['POST'])
def register():
    username = 'a'
    password = hash_password('a')  # ハッシュ化処理

    user = Auth(Auth_userid=username, Auth_password_hash=password)
    db.session.add(user)
    db.session.commit()




