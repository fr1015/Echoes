from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

from flask_login import UserMixin



# ---------------------------------
# ユーザー認証モデル
# ---------------------------------
class Auth(db.Model, UserMixin):
    # SQLite想定
    user_id = db.Column(db.String,db.ForeignKey('users.user_id'), primary_key=True)
    password_hash = db.Column(db.String)
    
    def get_id(self):
        return str(self.user_id)



# ---------------------------------
# ユーザーモデル（最新のものだけ保持）
# ---------------------------------
class users(db.Model):
    user_id = db.Column(db.String, primary_key=True)
    username = db.Column(db.String)
    icon_path = db.Column(db.String)
    header_path = db.Column(db.String)
    bio = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    auth = db.relationship('Auth', backref='user', uselist=False)
    posts = db.relationship('posts', backref='user', lazy=True)
    profile_updates = db.relationship('profile_update', backref='user', lazy=True)
    bookmarks = db.relationship('post_bookmark', backref='user', lazy=True)



# ---------------------------------
# プロフモデル（すべての履歴を残す）
# ---------------------------------
class profile_update(db.Model):
    update_id = db.Column(db.int, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    username = db.Column(db.String)
    icon_path = db.Column(db.String)
    header_path = db.Column(db.String)
    bio = db.Column(db.String)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)



# ---------------------------------
# ポストモデル
# ---------------------------------
class posts(db.Model):
    post_id = db.Column(db.int, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    content = db.Column(db.String)
    created_app = db.Column(db.String, db.CheckConstraint("created_app IN ('Echoes', 'Twitter', 'Misskey')"))

    reply_to_post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), nullable=True)
    quote_of_post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), nullable=True)
    repost_of_post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), nullable=True)

    thread_root_post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), nullable=True, index=True)

    post_type = db.Column(db.String, db.CheckConstraint("post_type IN ('normal', 'reply', 'quote', 'repost')"))
    content_hash = db.Column(db.String, unique=True)

    # self-referential
    reply_to_post = db.relationship('posts', remote_side=[post_id], foreign_keys=[reply_to_post_id], backref='replies')
    quote_of_post = db.relationship('posts', remote_side=[post_id], foreign_keys=[quote_of_post_id], backref='quotes')
    repost_of_post = db.relationship('posts', remote_side=[post_id], foreign_keys=[repost_of_post_id], backref='reposts')

    post_bookmarks = db.relationship('post_bookmark', backref='post', lazy=True)
    post_images = db.relationship('post_images', backref='post', lazy=True)



# ---------------------------------
# ポスト画像モデル
# ---------------------------------
class post_images(db.Model):
    image_id = db.Column(db.int, primary_key=True)
    post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), nullable=False)
    image_path = db.Column(db.String)


# ---------------------------------
# タグモデル
# ---------------------------------
class tags(db.Model):
    tags_id = db.Column(db.int, primary_key=True)
    tags_name = db.Column(db.String)



# ---------------------------------
# ブックマークモデル
# ---------------------------------
class post_bookmark(db.Model):
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'), primary_key=True, nullable=False)
    post_id = db.Column(db.int, db.ForeignKey('posts.post_id'), primary_key=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)





# ---------------------------------
# ポストモデル
# ---------------------------------
class posts(db.Model):
    post_id = db.Column(db.int, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    created_app = db.Column(db.String)
    content = db.Column(db.String)