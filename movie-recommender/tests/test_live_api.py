"""
Unit tests for the Live Internet Movie Suggestion service.
Verifies live suggestion algorithms, mood mappings, fallbacks, and parameter filtering.
Run with: python3 -m unittest movie-recommender/tests/test_live_api.py
"""

import unittest
import sys
import os
from unittest.mock import patch, Mock
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.movie_api import MovieAPIService, TMDBRequestError
from routes.movies import api_service
from app import create_app
from config import TestingConfig


class TestLiveMovieSuggestion(unittest.TestCase):

    def setUp(self):
        self.api_service = MovieAPIService()
        self.api_service.api_key = ""

    def test_suggest_by_mood_mind_bending(self):
        """Test suggesting by 'mind-bending' mood returns Sci-Fi / Thriller title."""
        result = self.api_service.suggest_movie_live(mood="mind-bending")
        self.assertIn("movie", result)
        movie = result["movie"]
        self.assertTrue(any(g in ["Sci-Fi", "Thriller"] for g in movie.get("genres", [])))
        self.assertIn("why_suggested", result)
        self.assertIn("mind-bending", result["why_suggested"])

    def test_suggest_by_genre_horror(self):
        """Test suggesting by genre 'Horror' returns Tumbbad or horror title."""
        result = self.api_service.suggest_movie_live(genre="Horror")
        movie = result["movie"]
        self.assertIn("Horror", movie.get("genres", []))

    def test_suggest_by_language_kannada(self):
        """Test suggesting by language 'kn' returns Kannada movie."""
        result = self.api_service.suggest_movie_live(language="kn")
        movie = result["movie"]
        self.assertEqual(movie.get("original_language"), "kn")

    def test_suggest_with_rating_threshold(self):
        """Test suggestion meets minimum rating threshold."""
        result = self.api_service.suggest_movie_live(min_rating=8.0)
        movie = result["movie"]
        self.assertGreaterEqual(float(movie.get("vote_average", 0)), 8.0)

    def test_suggest_includes_source_attribution(self):
        """Test suggestion payload includes clear data source label."""
        result = self.api_service.suggest_movie_live()
        self.assertIn("source", result)
        self.assertTrue("TMDB" in result["source"])

    def test_api_routes_fall_back_without_server_key_and_ignore_client_key(self):
        client = create_app(TestingConfig).test_client()
        client_key = "client-provided-key"
        with patch.object(api_service, "api_key", ""):
            response = client.get(
                "/api/movies?api_key=client-provided-key&page=1",
                headers={"X-TMDB-Key": client_key},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["source"], "curated")
            self.assertIn("TMDB_API_KEY", response.json["warning"])
            self.assertNotIn(client_key, response.get_data(as_text=True))
            self.assertEqual(api_service.api_key, "")

            suggestion = client.get(
                "/api/suggest-live?mood=mind-bending&api_key=client-provided-key",
                headers={"X-TMDB-Key": client_key},
            )
            self.assertEqual(suggestion.status_code, 200)
            self.assertFalse(suggestion.json["is_live_network"])
            self.assertIn("TMDB_API_KEY", suggestion.json["warning"])
            self.assertNotIn(client_key, suggestion.get_data(as_text=True))

            genres = client.get("/api/genres")
            self.assertEqual(genres.status_code, 200)
            self.assertEqual(genres.json["source"], "curated")
            self.assertIn("TMDB_API_KEY", genres.json["warning"])

            search = client.get("/api/search?q=Interstellar")
            self.assertEqual(search.status_code, 200)
            self.assertEqual(search.json["source"], "curated")
            self.assertTrue(search.json["results"])

            details = client.get("/api/movies/157336")
            self.assertEqual(details.status_code, 200)
            self.assertEqual(details.json["movie"]["title"], "Interstellar")
            self.assertIn("TMDB_API_KEY", details.json["warning"])

            similar = client.get("/api/movies/157336/similar")
            self.assertEqual(similar.status_code, 200)
            self.assertEqual(similar.json["source"], "curated")
            self.assertTrue(similar.json["results"])

            providers = client.get("/api/movies/157336/watch-providers?region=IN")
            self.assertEqual(providers.status_code, 200)
            self.assertTrue(providers.json["has_providers"])
            self.assertIn("TMDB_API_KEY", providers.json["warning"])

            unknown_details = client.get("/api/movies/987654321")
            self.assertEqual(unknown_details.status_code, 503)
            self.assertIn("TMDB_API_KEY", unknown_details.json["error"])

    def test_tmdb_timeout_message_does_not_expose_credentials(self):
        service = MovieAPIService()
        service.api_key = "server-test-secret"
        with patch("services.movie_api.requests.get", side_effect=requests.Timeout()):
            with self.assertRaises(TMDBRequestError) as context:
                service._fetch_tmdb("/discover/movie")
        self.assertNotIn(service.api_key, str(context.exception))
        self.assertIn("taking too long", str(context.exception))

    def test_tmdb_rate_limit_and_invalid_response_are_sanitized(self):
        service = MovieAPIService()
        service.api_key = "server-test-secret"
        with patch("services.movie_api.requests.get", return_value=Mock(status_code=429, ok=False)):
            with self.assertRaises(TMDBRequestError) as rate_error:
                service._fetch_tmdb("/discover/movie")
        self.assertEqual(rate_error.exception.code, "rate_limited")
        self.assertNotIn(service.api_key, str(rate_error.exception))

        invalid_json = Mock(status_code=200, ok=True)
        invalid_json.json.side_effect = ValueError("invalid JSON")
        with patch("services.movie_api.requests.get", return_value=invalid_json):
            with self.assertRaises(TMDBRequestError) as response_error:
                service._fetch_tmdb("/genre/movie/list")
        self.assertEqual(response_error.exception.code, "invalid_response")
        self.assertNotIn(service.api_key, str(response_error.exception))


if __name__ == "__main__":
    unittest.main()
