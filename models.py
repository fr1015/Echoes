from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

from flask_login import UserMixin

class Auth(db.Model, UserMixin):
    user_id = db.Column(db.String(30), primary_key=True)
    password_hash = db.Column(db.String(255))
    
    def get_id(self):
        return str(self.user_id)

