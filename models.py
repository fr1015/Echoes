from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 投稿とタグの多対多を表現する中間テーブル
post_tags = db.Table(
    "post_tags",
    db.Column("post_id", db.Integer, db.ForeignKey("posts.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tags.id"), primary_key=True),
)


# ユーザーのデータモデル
class User(db.Model):

    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(50), nullable=False)
    icon_path = db.Column(db.String(255), nullable=True)

    posts = db.relationship("Post", back_populates="user")


# 投稿モデル
class Post(db.Model):

    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, index=True)
    body = db.Column(db.String(500), nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    # タイムラインの並び順に使う時刻
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    user = db.relationship("User", back_populates="posts")
    tags = db.relationship("Tag", secondary=post_tags, back_populates="posts")


# タグモデル
class Tag(db.Model):

    __tablename__ = "tags"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), nullable=False, unique=True)

    posts = db.relationship("Post", secondary=post_tags, back_populates="tags")


# タイマー稼働ログモデル
class TimerSession(db.Model):

    __tablename__ = "timer_sessions"

    id = db.Column(db.Integer, primary_key=True)
    selected_tag = db.Column(db.String(30), nullable=True, index=True)
    duration_seconds = db.Column(db.Integer, nullable=False)
    key_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )
