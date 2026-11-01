"""
Unit tests for the Live Internet Movie Suggestion service.
Verifies live suggestion algorithms, mood mappings, fallbacks, and parameter filtering.
Run with: python3 -m unittest movie-recommender/tests/test_live_api.py
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.movie_api import MovieAPIService


class TestLiveMovieSuggestion(unittest.TestCase):

    def setUp(self):
        self.api_service = MovieAPIService()

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


if __name__ == "__main__":
    unittest.main()
