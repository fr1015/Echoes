from flask import render_template, request, redirect, url_for, Blueprint, session, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import users, db, posts
from collections import OrderedDict
from sqlalchemy import func
from datetime import datetime, timedelta

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
    all_posts_q = posts.query
    page_q = all_posts_q

    if date_str:
        # その日付だけ表示
        page_q = page_q.filter(func.date(posts.created_at) == date_str)

    pagination = (page_q
        .order_by(posts.created_at.desc(), posts.post_id.desc())
        .paginate(page=page, per_page=per_page, error_out=False))

    posts_by_date = OrderedDict()
    for p in pagination.items:
        day = p.created_at.date()
        posts_by_date.setdefault(day, []).append(p)

    # 日別件数ヒートマップ用
    count_rows = (all_posts_q
        .with_entities(func.date(posts.created_at), func.count())
        .group_by(func.date(posts.created_at))
        .all())
    post_count_map = {str(d): c for d, c in count_rows}

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        next_month_start = month_start.replace(year=now.year + 1, month=1)
    else:
        next_month_start = month_start.replace(month=now.month + 1)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    next_year_start = year_start.replace(year=now.year + 1)

    post_stats = {
        "today": all_posts_q.filter(posts.created_at >= today_start, posts.created_at < tomorrow_start).count(),
        "month": all_posts_q.filter(posts.created_at >= month_start, posts.created_at < next_month_start).count(),
        "year": all_posts_q.filter(posts.created_at >= year_start, posts.created_at < next_year_start).count(),
        "total": all_posts_q.count(),
    }

    return render_template(
        "postlog.html",
        posts_by_date=posts_by_date,
        post_count_map=post_count_map,
        post_stats=post_stats,
        user=user,
        pagination=pagination
    )


