"""
CineMatch - Movie Discovery & Recommendation Website
Flask Application Entry Point and Factory.
"""

import os
from flask import Flask, render_template, send_from_directory, jsonify
from config import Config
from extensions import db
from routes.movies import movies_bp
from routes.auth import auth_bp
from routes.users import users_bp


def create_app(config_class=Config):
    """Application factory for CineMatch."""
    app = Flask(
        __name__,
        static_folder="static",
        template_folder="templates"
    )
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(movies_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

    # Create tables if not present
    with app.app_context():
        db.create_all()

    # Frontend Page Routes (Phase 1, 2, 3)
    @app.route("/")
    def homepage():
        """Page A: Cinematic Homepage."""
        return render_template("index.html")

    @app.route("/discover")
    def discover_page():
        """Page B: Discover Movies with Filter Panel."""
        return render_template("discover.html")

    @app.route("/movie/<int:movie_id>")
    def movie_detail_page(movie_id):
        """Page C: Dedicated Movie Details Page."""
        return render_template("movie_detail.html", movie_id=movie_id)

    @app.route("/favorites")
    def favorites_page():
        """User saved favorites."""
        return render_template("favorites.html")

    @app.route("/watchlist")
    def watchlist_page():
        """User personal watchlist."""
        return render_template("watchlist.html")

    @app.route("/login")
    def login_page():
        """User login and registration."""
        return render_template("login.html")

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "An internal server error occurred"}), 500

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    host = os.environ.get("HOST", "127.0.0.1")
    debug = os.environ.get("FLASK_DEBUG", "").lower() == "true"
    app.run(host=host, port=port, debug=debug)
