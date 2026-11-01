"""
Personalization routes for favorites, watchlist, and recent searches.
Enforces user data isolation and duplicate prevention.
"""

from flask import Blueprint, request, jsonify, session
from extensions import db
from models import Favorite, WatchlistItem, RecentSearch
import json

users_bp = Blueprint("users", __name__)


def require_auth():
    """Helper to check if user is logged in."""
    user_id = session.get("user_id")
    if not user_id:
        return None, (jsonify({"error": "Authentication required for this action"}), 401)
    return user_id, None


# =============================================================================
# Favorites
# =============================================================================

@users_bp.route("/api/favorites", methods=["GET"])
def get_favorites():
    """Returns user's saved favorites list."""
    user_id, err = require_auth()
    if err:
        return err

    favs = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc()).all()
    return jsonify({
        "total": len(favs),
        "favorites": [f.to_dict() for f in favs]
    }), 200


@users_bp.route("/api/favorites", methods=["POST"])
def add_favorite():
    """Adds a movie to user's favorites; prevents duplicates."""
    user_id, err = require_auth()
    if err:
        return err

    data = request.get_json() or {}
    movie_id = data.get("movie_id")
    title = data.get("title", "").strip()

    if not movie_id or not title:
        return jsonify({"error": "movie_id and title are required"}), 400

    # Prevent duplicate
    existing = Favorite.query.filter_by(user_id=user_id, movie_id=movie_id).first()
    if existing:
        return jsonify({"message": "Movie is already in your favorites", "favorite": existing.to_dict()}), 200

    genres = data.get("genres", [])
    genres_json = json.dumps(genres) if isinstance(genres, list) else "[]"

    fav = Favorite(
        user_id=user_id,
        movie_id=movie_id,
        title=title,
        poster_path=data.get("poster_path"),
        vote_average=float(data.get("vote_average") or 0.0),
        vote_count=int(data.get("vote_count") or 0),
        release_date=data.get("release_date"),
        genres_json=genres_json
    )
    db.session.add(fav)
    db.session.commit()

    return jsonify({"message": "Added to favorites", "favorite": fav.to_dict()}), 201


@users_bp.route("/api/favorites/<int:movie_id>", methods=["DELETE"])
def remove_favorite(movie_id):
    """Removes a movie from user's favorites."""
    user_id, err = require_auth()
    if err:
        return err

    fav = Favorite.query.filter_by(user_id=user_id, movie_id=movie_id).first()
    if not fav:
        return jsonify({"error": "Movie not found in your favorites"}), 404

    db.session.delete(fav)
    db.session.commit()

    return jsonify({"message": "Removed from favorites", "movie_id": movie_id}), 200


# =============================================================================
# Watchlist
# =============================================================================

@users_bp.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    """Returns user's watchlist."""
    user_id, err = require_auth()
    if err:
        return err

    items = WatchlistItem.query.filter_by(user_id=user_id).order_by(WatchlistItem.created_at.desc()).all()
    return jsonify({
        "total": len(items),
        "watchlist": [item.to_dict() for item in items]
    }), 200


@users_bp.route("/api/watchlist", methods=["POST"])
def add_to_watchlist():
    """Adds a movie to user's watchlist; prevents duplicates."""
    user_id, err = require_auth()
    if err:
        return err

    data = request.get_json() or {}
    movie_id = data.get("movie_id")
    title = data.get("title", "").strip()

    if not movie_id or not title:
        return jsonify({"error": "movie_id and title are required"}), 400

    existing = WatchlistItem.query.filter_by(user_id=user_id, movie_id=movie_id).first()
    if existing:
        return jsonify({"message": "Movie is already in your watchlist", "watchlist_item": existing.to_dict()}), 200

    genres = data.get("genres", [])
    genres_json = json.dumps(genres) if isinstance(genres, list) else "[]"

    item = WatchlistItem(
        user_id=user_id,
        movie_id=movie_id,
        title=title,
        poster_path=data.get("poster_path"),
        vote_average=float(data.get("vote_average") or 0.0),
        vote_count=int(data.get("vote_count") or 0),
        release_date=data.get("release_date"),
        genres_json=genres_json,
        watched=bool(data.get("watched", False))
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Added to watchlist", "watchlist_item": item.to_dict()}), 201


@users_bp.route("/api/watchlist/<int:movie_id>", methods=["DELETE"])
def remove_from_watchlist(movie_id):
    """Removes a movie from user's watchlist."""
    user_id, err = require_auth()
    if err:
        return err

    item = WatchlistItem.query.filter_by(user_id=user_id, movie_id=movie_id).first()
    if not item:
        return jsonify({"error": "Movie not found in your watchlist"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Removed from watchlist", "movie_id": movie_id}), 200


@users_bp.route("/api/watchlist/<int:movie_id>/toggle-watched", methods=["PUT"])
def toggle_watched(movie_id):
    """Toggles watched status on a watchlist item."""
    user_id, err = require_auth()
    if err:
        return err

    item = WatchlistItem.query.filter_by(user_id=user_id, movie_id=movie_id).first()
    if not item:
        return jsonify({"error": "Movie not found in your watchlist"}), 404

    item.watched = not item.watched
    db.session.commit()

    return jsonify({"message": "Updated status", "watchlist_item": item.to_dict()}), 200


# =============================================================================
# Recent Searches
# =============================================================================

@users_bp.route("/api/recent-searches", methods=["GET"])
def get_recent_searches():
    """Returns recent search queries for current session user."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"recent_searches": []}), 200

    searches = RecentSearch.query.filter_by(user_id=user_id).order_by(RecentSearch.created_at.desc()).limit(10).all()
    return jsonify({
        "recent_searches": [s.to_dict() for s in searches]
    }), 200


@users_bp.route("/api/recent-searches", methods=["POST"])
def record_recent_search():
    """Records a search query or filter combination."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"message": "Anonymous search not stored"}), 200

    data = request.get_json() or {}
    query = data.get("query", "").strip()
    filters = data.get("filters", {})

    if not query and not filters:
        return jsonify({"message": "Empty search omitted"}), 200

    # Limit history to 15 entries per user
    existing_count = RecentSearch.query.filter_by(user_id=user_id).count()
    if existing_count >= 15:
        oldest = RecentSearch.query.filter_by(user_id=user_id).order_by(RecentSearch.created_at.asc()).first()
        if oldest:
            db.session.delete(oldest)

    entry = RecentSearch(
        user_id=user_id,
        search_query=query,
        filters_json=json.dumps(filters)
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({"message": "Search recorded", "recent_search": entry.to_dict()}), 201


@users_bp.route("/api/recent-searches", methods=["DELETE"])
def clear_recent_searches():
    """Clears all recent searches for current user."""
    user_id, err = require_auth()
    if err:
        return err

    RecentSearch.query.filter_by(user_id=user_id).delete()
    db.session.commit()

    return jsonify({"message": "Recent searches cleared"}), 200
