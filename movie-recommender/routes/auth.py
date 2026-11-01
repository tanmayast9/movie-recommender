"""
Authentication routes for CineMatch.
Handles user registration, login, logout, and session profile.
"""

from flask import Blueprint, request, jsonify, session
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    """
    Registers a new user account.
    Expects JSON: { "username": "...", "email": "...", "password": "..." }
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Validation
    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters long"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Uniqueness check
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    # Create user
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Automatically set session
    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "User registered successfully",
        "user": user.to_dict()
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """
    Authenticates an existing user and creates session.
    Expects JSON: { "username_or_email": "...", "password": "..." }
    """
    data = request.get_json() or {}
    identifier = data.get("username_or_email", "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required"}), 400

    # Query by username or email
    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username/email or password"}), 401

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Logged in successfully",
        "user": user.to_dict()
    }), 200


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    """Clears the current user session."""
    session.pop("user_id", None)
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """Returns profile of currently logged-in user."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False, "user": None}), 200

    user = User.query.get(user_id)
    if not user:
        session.pop("user_id", None)
        return jsonify({"authenticated": False, "user": None}), 200

    return jsonify({
        "authenticated": True,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/api/auth/theme", methods=["PUT"])
def update_theme():
    """Persists user's dark/light theme preference."""
    data = request.get_json() or {}
    theme = data.get("theme", "dark")
    if theme not in ("dark", "light"):
        return jsonify({"error": "Invalid theme"}), 400

    user_id = session.get("user_id")
    if user_id:
        user = User.query.get(user_id)
        if user:
            user.theme_preference = theme
            db.session.commit()

    return jsonify({"theme": theme}), 200
