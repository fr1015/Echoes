from flask import render_template, request, redirect, url_for, Blueprint, session, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import users, db, posts
from collections import OrderedDict

postlog_bp = Blueprint('postlog_bp', __name__)


# ===================================================================================


@postlog_bp.route('/postlog')
@login_required
def postlog():
    user = users.query.get(current_user.user_id)
    page = request.args.get("page", 1, type=int)
    per_page = 50

    pagination = (posts.query
    # .filter(posts.user_id == current_user.user_id)
    .order_by(posts.created_at.desc(), posts.post_id.desc())
    .paginate(page=page, per_page=per_page, error_out=False)
    )

    posts_by_date = OrderedDict()
    for p in pagination.items:
        day = p.created_at.date()
        posts_by_date.setdefault(day, []).append(p)

    return render_template('postlog.html', posts_by_date=posts_by_date, user=user, pagination=pagination)


