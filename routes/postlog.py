from flask import render_template, request, redirect, url_for, Blueprint, session, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import users, db, posts
from collections import OrderedDict
from sqlalchemy import func
from datetime import datetime, timedelta
from datetime import timezone
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")

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
        # JST日付に合わせてフィルタ
        page_q = page_q.filter(
            func.date(func.datetime(posts.updated_at, "+9 hours")) == date_str
        )

    pagination = (page_q
        .order_by(posts.updated_at.desc(), posts.post_id.desc())
        .paginate(page=page, per_page=per_page, error_out=False))

    posts_by_date = OrderedDict()
    for p in pagination.items:
        day = p.updated_at_jst.date()
        posts_by_date.setdefault(day, []).append(p)

    # 日別件数ヒートマップ用（JST基準）
    count_rows = (all_posts_q
        .with_entities(
            func.date(func.datetime(posts.updated_at, "+9 hours")),
            func.count()
        )
        .group_by(func.date(func.datetime(posts.updated_at, "+9 hours")))
        .all())
    post_count_map = {str(d): c for d, c in count_rows}

    # 統計用の日時計算
    now_utc = datetime.now(timezone.utc)
    now_jst = now_utc.astimezone(JST)

    today_start_jst = now_jst.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start_jst = today_start_jst + timedelta(days=1)

    month_start_jst = now_jst.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now_jst.month == 12:
        next_month_start_jst = month_start_jst.replace(year=now_jst.year + 1, month=1)
    else:
        next_month_start_jst = month_start_jst.replace(month=now_jst.month + 1)

    year_start_jst = now_jst.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    next_year_start_jst = year_start_jst.replace(year=now_jst.year + 1)

    def to_utc_naive(dt):
        return dt.astimezone(timezone.utc).replace(tzinfo=None)

    # 日別、月別、年別、全体の投稿数を集計（JST基準）
    post_stats = {
        "today": all_posts_q.filter(
            posts.updated_at >= to_utc_naive(today_start_jst),
            posts.updated_at < to_utc_naive(tomorrow_start_jst)
        ).count(),
        "month": all_posts_q.filter(
            posts.updated_at >= to_utc_naive(month_start_jst),
            posts.updated_at < to_utc_naive(next_month_start_jst)
        ).count(),
        "year": all_posts_q.filter(
            posts.updated_at >= to_utc_naive(year_start_jst),
            posts.updated_at < to_utc_naive(next_year_start_jst)
        ).count(),
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


