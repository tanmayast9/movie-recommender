"""
SQLAlchemy database models for CineMatch.
Provides User authentication, Favorites, Watchlist, Recent Searches, and Preferences.
"""

from datetime import datetime
import json
from extensions import db

try:
    from werkzeug.security import generate_password_hash, check_password_hash
except ImportError:
    import hashlib
    def generate_password_hash(password: str) -> str:
        salt = "cinematch_salt_91"
        return hashlib.sha256((salt + password).encode()).hexdigest()
    def check_password_hash(hash_val: str, password: str) -> bool:
        salt = "cinematch_salt_91"
        return hash_val == hashlib.sha256((salt + password).encode()).hexdigest()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    theme_preference = db.Column(db.String(16), default="dark")  # "dark" or "light"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    favorites = db.relationship("Favorite", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    watchlist = db.relationship("WatchlistItem", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    recent_searches = db.relationship("RecentSearch", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    preference = db.relationship("UserPreference", backref="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "theme_preference": self.theme_preference,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    movie_id = db.Column(db.Integer, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    poster_path = db.Column(db.String(255), nullable=True)
    vote_average = db.Column(db.Float, default=0.0)
    vote_count = db.Column(db.Integer, default=0)
    release_date = db.Column(db.String(32), nullable=True)
    genres_json = db.Column(db.Text, default="[]")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "movie_id", name="uq_user_favorite_movie"),
    )

    def to_dict(self) -> dict:
        try:
            genres = json.loads(self.genres_json) if self.genres_json else []
        except Exception:
            genres = []
        return {
            "id": self.id,
            "movie_id": self.movie_id,
            "title": self.title,
            "poster_path": self.poster_path,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "release_date": self.release_date,
            "genres": genres,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class WatchlistItem(db.Model):
    __tablename__ = "watchlist"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    movie_id = db.Column(db.Integer, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    poster_path = db.Column(db.String(255), nullable=True)
    vote_average = db.Column(db.Float, default=0.0)
    vote_count = db.Column(db.Integer, default=0)
    release_date = db.Column(db.String(32), nullable=True)
    genres_json = db.Column(db.Text, default="[]")
    watched = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "movie_id", name="uq_user_watchlist_movie"),
    )

    def to_dict(self) -> dict:
        try:
            genres = json.loads(self.genres_json) if self.genres_json else []
        except Exception:
            genres = []
        return {
            "id": self.id,
            "movie_id": self.movie_id,
            "title": self.title,
            "poster_path": self.poster_path,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "release_date": self.release_date,
            "genres": genres,
            "watched": self.watched,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class RecentSearch(db.Model):
    __tablename__ = "recent_searches"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    search_query = db.Column(db.String(255), nullable=True)
    filters_json = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        try:
            filters = json.loads(self.filters_json) if self.filters_json else {}
        except Exception:
            filters = {}
        return {
            "id": self.id,
            "search_query": self.search_query,
            "filters": filters,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class UserPreference(db.Model):
    __tablename__ = "user_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    preferred_genres_json = db.Column(db.Text, default="[]")
    preferred_languages_json = db.Column(db.Text, default="[]")
    min_rating = db.Column(db.Float, default=7.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        try:
            genres = json.loads(self.preferred_genres_json) if self.preferred_genres_json else []
            langs = json.loads(self.preferred_languages_json) if self.preferred_languages_json else []
        except Exception:
            genres, langs = [], []
        return {
            "preferred_genres": genres,
            "preferred_languages": langs,
            "min_rating": self.min_rating
        }
