from flask import render_template, request, redirect, url_for, Blueprint, session, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import users, db, posts
from collections import OrderedDict
from sqlalchemy import func

postlog_bp = Blueprint('postlog_bp', __name__)


# ===================================================================================


@postlog_bp.route('/postlog')
@login_required
def postlog():
    user = users.query.get(current_user.user_id)
    page = request.args.get("page", 1, type=int)
    per_page = 50

    # date=YYYY-MM-DD のパラメータ受け取り
    date_str = request.args.get("date")
    # base query
    base_q = posts.query  # 必要なら user_id で絞る

    if date_str:
        # その日付だけ表示
        base_q = base_q.filter(func.date(posts.created_at) == date_str)

    pagination = (base_q
        .order_by(posts.created_at.desc(), posts.post_id.desc())
        .paginate(page=page, per_page=per_page, error_out=False))

    posts_by_date = OrderedDict()
    for p in pagination.items:
        day = p.created_at.date()
        posts_by_date.setdefault(day, []).append(p)

    # 日別件数ヒートマップ用
    count_rows = (posts.query
        .with_entities(func.date(posts.created_at), func.count())
        .group_by(func.date(posts.created_at))
        .all())
    post_count_map = {str(d): c for d, c in count_rows}

    return render_template(
        "postlog.html",
        posts_by_date=posts_by_date,
        post_count_map=post_count_map,
        user=user,
        pagination=pagination
    )


