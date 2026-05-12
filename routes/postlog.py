from flask import render_template, request, redirect, url_for, Blueprint, session, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from models import users, db, posts



postlog_bp = Blueprint('postlog_bp', __name__)


# ===================================================================================


@postlog_bp.route('/postlog')
@login_required
def postlog():
    posts_data = (db.session.query(posts)
    .join(users, posts.user_id == users.user_id)
    .filter(users.user_id == current_user.user_id)
    .all())
    return render_template('postlog.html', posts=posts_data)


