from flask import render_template, request, redirect, url_for, Blueprint, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import db, posts
from routes.login_auth import login_auth_bp
from routes.crud import create_post
from datetime import datetime, timezone
from sqlalchemy import text
import re
from markupsafe import escape, Markup

main_bp = Blueprint('main_bp', __name__)

# ===================================================================================

# URLをリンク化するフィルタ
URL_RE = re.compile(r'https?://[^\s<]+')

TRAILING_PUNCTUATION = '.,!?;:)])}'

def replace_url(match):
    url = match.group(0)

    trailing = ''

    while url and url[-1] in TRAILING_PUNCTUATION:
        trailing = url[-1] + trailing
        url = url[:-1]

    escaped_url = escape(url)

    return (
        f'<a href="{escaped_url}" '
        f'target="_blank" '
        f'rel="noopener noreferrer nofollow">'
        f'{escaped_url}</a>'
        f'{trailing}'
    )

# テキスト中のURLをリンク化するテンプレートフィルタ
@main_bp.app_template_filter('linkify')
def linkify(text):
    if not text:
        return ''

    # 正規化（CRLF → LF）
    escaped = escape(text).replace('\r\n', '\n').replace('\r', '\n')

    # 各行ごとに URL 置換を行い、最後に <br> で結合
    parts = [URL_RE.sub(replace_url, line) for line in escaped.split('\n')]

    linked = '<br>'.join(parts)
    return Markup(linked)

# ===================================================================================


# ホーム画面
@main_bp.route("/home")
@login_required # ログイン必須
def home():
    user = current_user.user  # Authモデルからusersモデルのインスタンスを取得
    return render_template("home.html", user=user)
    

@main_bp.route('/api/posts')
@login_required # ログイン必須
def get_posts():
     query = posts.query
     
    
     last_updated_at = request.args.get("last_updated_at")
     last_post_id = request.args.get("last_post_id")

     # ページング対象は常に「ピン以外」にする（重複回避）
     query = query.filter(posts.is_pinned.is_(False))

     pinned_post = None
     # 初回だけピンを別枠で取得
     if not last_updated_at and not last_post_id:
         pinned_post = (posts.query
             .filter(
                 posts.user_id == current_user.user_id,
                 posts.is_pinned.is_(True)
             )
             .order_by(posts.created_at.desc(), posts.post_id.desc())
             .first()
         )

     # ページングのパラメータがあれば、作成日時とIDで次のページ以降を取得する条件を追加
     if last_updated_at and last_post_id:
         last_updated_at = datetime.fromisoformat(
             last_updated_at.replace("Z", "+00:00")
         )
         last_post_id = int(last_post_id)
         query = query.filter(
             db.or_(
                 posts.updated_at < last_updated_at,
                 db.and_(
                     posts.updated_at == last_updated_at,
                     posts.post_id < last_post_id
                 )
             )
         )

     post_data = query.order_by(
         posts.updated_at.desc(),
         posts.post_id.desc()
     ).limit(15).all()

     # ピンと通常投稿を合わせてシリアライズする関数
     def serialize(post):
         return {
             "post_id": post.post_id,
             "content": post.content,
             "updated_at": post.updated_at.isoformat() + "Z",
             "user_id": post.user_id,
             "username": post.user.username,
             "is_pinned": post.is_pinned
         }

     result = []
     if pinned_post:
         result.append(serialize(pinned_post))
     result.extend([serialize(p) for p in post_data])

     return jsonify(result)


# ヒートマップ用API
# 日ごとの投稿数を返す
@main_bp.route("/heatmap")
def get_heatmap():
    # created_at を日単位に丸めて集計
    # DATE(created_at) によって
    # "2026-05-11" の形式になる
    rows = db.session.execute(text("""
        SELECT
            DATE(datetime(created_at, '+9 hours')) AS post_date,
            COUNT(*) AS post_count
        FROM posts
        GROUP BY DATE(datetime(created_at, '+9 hours'))
    """))

    # JSで扱いやすい辞書形式に変換
    heatmap_data = {
    row._mapping["post_date"]: row._mapping["post_count"]
    for row in rows
    }

    # JSONとして返却
    return jsonify(heatmap_data)

# ポストピン用API
@main_bp.route("/api/posts/<int:post_id>/pin", methods=["POST"])
@login_required
def toggle_pin(post_id):
    post = (posts.query
        .filter(
            posts.post_id == post_id,
            posts.user_id == current_user.user_id
        )
        .first_or_404()
    )

    data = request.get_json(silent=True) or {}
    # pin が指定されていなければトグル
    new_state = data.get("pin")
    if new_state is None:
        new_state = not post.is_pinned
    new_state = bool(new_state)

    if new_state:
        # 自分の他のピンを解除（1件制限）
        (posts.query
            .filter(
                posts.user_id == current_user.user_id,
                posts.is_pinned.is_(True),
                posts.post_id != post_id
            )
            .update({posts.is_pinned: False})
        )

    post.is_pinned = new_state
    db.session.commit()

    return jsonify({
        "success": True,
        "post_id": post_id,
        "is_pinned": post.is_pinned
    })

