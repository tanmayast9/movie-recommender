"""
Movie discovery, search, and recommendation routes.
"""

from flask import Blueprint, request, jsonify
from services.movie_api import MovieAPIService
from services.streaming import StreamingService
from recommender.engine import RecommendationEngine

movies_bp = Blueprint("movies", __name__)
api_service = MovieAPIService()
streaming_service = StreamingService()
engine = RecommendationEngine(api_service.get_all_curated())


@movies_bp.route("/api/health", methods=["GET"])
def health_check():
    """Health endpoint returning system status."""
    return jsonify({
        "status": "healthy",
        "service": "CineMatch Recommendation API",
        "recommendation_engine": "Rule-Based + Content-Based (TF-IDF)",
        "external_api": "TMDB API",
        "database": "SQLite / SQLAlchemy"
    }), 200


@movies_bp.route("/api/genres", methods=["GET"])
def get_genres():
    """Returns list of supported genres."""
    return jsonify({
        "genres": api_service.get_genres()
    }), 200


@movies_bp.route("/api/movies", methods=["GET"])
def discover_movies():
    """
    Core discovery endpoint with combined multi-parameter filtering and sorting.
    Query parameters:
    - genre: Genre name or ID (e.g., 'Horror', 'Sci-Fi')
    - language: ISO 639-1 code (e.g., 'en', 'kn', 'hi', 'ko')
    - country: ISO 3166-1 alpha-2 code (e.g., 'US', 'IN', 'KR')
    - min_rating: Float (0-10)
    - max_rating: Float (0-10)
    - year_from: Integer (e.g., 2000)
    - year_to: Integer (e.g., 2026)
    - sort: 'popularity', 'rating', 'release_date', 'title'
    - search: Text query
    - page: Integer (default 1)
    - limit: Integer (default 12)
    """
    genre = request.args.get("genre")
    language = request.args.get("language")
    country = request.args.get("country")
    search_q = request.args.get("search")
    sort_by = request.args.get("sort", "popularity")

    min_rating = None
    if request.args.get("min_rating"):
        try:
            min_rating = float(request.args.get("min_rating"))
        except ValueError:
            pass

    max_rating = None
    if request.args.get("max_rating"):
        try:
            max_rating = float(request.args.get("max_rating"))
        except ValueError:
            pass

    year_from = None
    if request.args.get("year_from"):
        try:
            year_from = int(request.args.get("year_from"))
        except ValueError:
            pass

    year_to = None
    if request.args.get("year_to"):
        try:
            year_to = int(request.args.get("year_to"))
        except ValueError:
            pass

    page = max(int(request.args.get("page", 1)), 1)
    limit = max(min(int(request.args.get("limit", 12)), 50), 1)

    # 1. Filter and rank using Python RecommendationEngine
    all_movies = api_service.get_all_curated()
    engine.set_movies(all_movies)

    filtered = engine.filter_and_rank(
        movies=all_movies,
        genre=genre,
        language=language,
        country=country,
        min_rating=min_rating,
        max_rating=max_rating,
        year_from=year_from,
        year_to=year_to,
        search_query=search_q,
        sort_by=sort_by
    )

    total_results = len(filtered)
    total_pages = max(1, (total_results + limit - 1) // limit)
    start_idx = (page - 1) * limit
    paginated = filtered[start_idx:start_idx + limit]

    # Suggestion if empty
    suggestion = None
    if total_results == 0:
        suggestion = "No movies matched your exact filters. Try relaxing the rating threshold, broadening the release year range, or removing language/country constraints."

    return jsonify({
        "page": page,
        "limit": limit,
        "total_results": total_results,
        "total_pages": total_pages,
        "active_filters": {
            "genre": genre,
            "language": language,
            "country": country,
            "min_rating": min_rating,
            "max_rating": max_rating,
            "year_from": year_from,
            "year_to": year_to,
            "sort_by": sort_by,
            "search": search_q
        },
        "suggestion": suggestion,
        "results": paginated
    }), 200


@movies_bp.route("/api/movies/<int:movie_id>", methods=["GET"])
def get_movie_detail(movie_id):
    """Fetch movie details by ID."""
    movie = api_service.get_movie_by_id(movie_id)
    if not movie:
        return jsonify({"error": "Movie not found"}), 404
    return jsonify({"movie": movie}), 200


@movies_bp.route("/api/movies/<int:movie_id>/similar", methods=["GET"])
def get_similar_movies(movie_id):
    """
    Returns content-based similar movies calculated with TF-IDF and Cosine Similarity.
    Includes transparent 'Why This Movie?' explanations.
    """
    target = api_service.get_movie_by_id(movie_id)
    if not target:
        return jsonify({"error": "Movie not found"}), 404

    all_movies = api_service.get_all_curated()
    engine.set_movies(all_movies)

    top_n = min(int(request.args.get("limit", 6)), 12)
    similar = engine.compute_similarity(target, all_movies, top_n=top_n)

    return jsonify({
        "target_movie_id": movie_id,
        "target_title": target.get("title"),
        "algorithm": "Content-Based Filtering (TF-IDF Vectorization & Cosine Similarity)",
        "results": similar
    }), 200


@movies_bp.route("/api/movies/<int:movie_id>/watch-providers", methods=["GET"])
def get_movie_watch_providers(movie_id):
    """Streaming availability for India ('IN') and other supported regions."""
    region = request.args.get("region", "IN")
    providers = streaming_service.get_watch_providers(movie_id, region=region)
    return jsonify(providers), 200


@movies_bp.route("/api/suggest-live", methods=["GET"])
def suggest_live_movie():
    """
    Suggests a movie from the internet live.
    Query parameters:
    - mood: (e.g. 'mind-bending', 'adrenaline', 'chills', 'emotional', 'lighthearted')
    - genre: (e.g. 'Sci-Fi', 'Action', 'Horror', 'Drama')
    - language: ISO 639-1 code (e.g. 'en', 'kn', 'hi', 'ko')
    - min_rating: Float (e.g. 7.5)
    - api_key: Optional custom TMDB API key passed via query or X-TMDB-Key header
    """
    mood = request.args.get("mood")
    genre = request.args.get("genre")
    language = request.args.get("language")
    
    min_rating = None
    if request.args.get("min_rating"):
        try:
            min_rating = float(request.args.get("min_rating"))
        except ValueError:
            pass

    custom_key = request.headers.get("X-TMDB-Key") or request.args.get("api_key")

    result = api_service.suggest_movie_live(
        mood=mood,
        genre=genre,
        language=language,
        min_rating=min_rating,
        custom_api_key=custom_key
    )

    # Attach watch providers
    movie_id = result["movie"]["id"]
    watch_info = streaming_service.get_watch_providers(movie_id, region="IN")
    result["watch_providers"] = watch_info

    return jsonify(result), 200


@movies_bp.route("/api/search", methods=["GET"])
def search_movies():
    """Quick search by title."""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"results": []}), 200

    all_movies = api_service.get_all_curated()
    engine.set_movies(all_movies)
    matches = engine.filter_and_rank(movies=all_movies, search_query=q)
    return jsonify({"query": q, "results": matches[:10]}), 200
