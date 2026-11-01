"""
Automated unit tests for RecommendationEngine.
Tests deterministic filtering, TF-IDF cosine similarity, edge cases, and explanations.
Can be executed with: python3 -m unittest movie-recommender/tests/test_recommender.py
"""

import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from recommender.engine import RecommendationEngine


class TestRecommendationEngine(unittest.TestCase):

    def setUp(self):
        self.sample_movies = [
            {
                "id": 1,
                "title": "Interstellar",
                "genres": ["Sci-Fi", "Adventure", "Drama"],
                "original_language": "en",
                "origin_country": ["US", "GB"],
                "vote_average": 8.7,
                "vote_count": 34000,
                "release_date": "2014-11-07",
                "popularity": 95.4,
                "overview": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival across interstellar dimensions."
            },
            {
                "id": 2,
                "title": "The Martian",
                "genres": ["Sci-Fi", "Adventure", "Drama"],
                "original_language": "en",
                "origin_country": ["US"],
                "vote_average": 8.0,
                "vote_count": 22000,
                "release_date": "2015-10-02",
                "popularity": 80.2,
                "overview": "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to signal to Earth."
            },
            {
                "id": 3,
                "title": "Kantara",
                "genres": ["Action", "Thriller", "Drama"],
                "original_language": "kn",
                "origin_country": ["IN"],
                "vote_average": 8.2,
                "vote_count": 12000,
                "release_date": "2022-09-30",
                "popularity": 75.0,
                "overview": "When greed paves the way for betrayal, wrath, and rebellion, a young tribal man in coastal Karnataka honors the demigod Bhoota Kola ritual."
            },
            {
                "id": 4,
                "title": "Tumbbad",
                "genres": ["Horror", "Fantasy", "Drama"],
                "original_language": "hi",
                "origin_country": ["IN"],
                "vote_average": 8.3,
                "vote_count": 9500,
                "release_date": "2018-10-12",
                "popularity": 72.1,
                "overview": "A mythological horror story about a family who builds a shrine for Hastar, a monster who should never be worshipped."
            },
            {
                "id": 5,
                "title": "Parasite",
                "genres": ["Comedy", "Thriller", "Drama"],
                "original_language": "ko",
                "origin_country": ["KR"],
                "vote_average": 8.5,
                "vote_count": 18000,
                "release_date": "2019-05-30",
                "popularity": 88.0,
                "overview": "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident."
            },
            {
                "id": 6,
                "title": "Spirited Away",
                "genres": ["Animation", "Family", "Fantasy"],
                "original_language": "ja",
                "origin_country": ["JP"],
                "vote_average": 8.5,
                "vote_count": 16000,
                "release_date": "2001-07-20",
                "popularity": 82.5,
                "overview": "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon courage."
            },
            {
                "id": 7,
                "title": "Mystery Film Without Overview",
                "genres": ["Sci-Fi", "Adventure"],
                "original_language": "en",
                "origin_country": ["US"],
                "vote_average": 7.1,
                "vote_count": 500,
                "release_date": "2020-01-01",
                "popularity": 30.0,
                "overview": ""  # Missing description edge case
            },
            {
                "id": 8,
                "title": "Incomplete Metadata Film",
                "genres": [],  # Missing genres edge case
                "original_language": "",
                "origin_country": [],
                "vote_average": 0.0,
                "vote_count": 0,
                "release_date": "",
                "popularity": 5.0,
                "overview": None
            }
        ]
        self.engine = RecommendationEngine(self.sample_movies)

    def test_filter_exact_genre(self):
        """Test filtering by exact genre returns matching movies."""
        results = self.engine.filter_and_rank(genre="Horror")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Tumbbad")

    def test_filter_multiple_criteria(self):
        """Test combining genre, language, country, and rating threshold."""
        results = self.engine.filter_and_rank(
            genre="Action",
            language="kn",
            country="IN",
            min_rating=8.0
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Kantara")

    def test_filter_year_range(self):
        """Test release year range filtering."""
        results = self.engine.filter_and_rank(year_from=2000, year_to=2010)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Spirited Away")

    def test_filter_empty_results(self):
        """Test when no movies match the strict criteria."""
        results = self.engine.filter_and_rank(
            genre="Horror",
            language="ja",
            min_rating=9.5
        )
        self.assertEqual(len(results), 0)

    def test_search_query(self):
        """Test title search query filtering."""
        results = self.engine.filter_and_rank(search_query="mars")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "The Martian")

    def test_similarity_excludes_self_and_duplicates(self):
        """Test that content-based similarity excludes the source movie and returns unique items."""
        target = self.sample_movies[0]  # Interstellar
        recs = self.engine.compute_similarity(target, self.sample_movies, top_n=5)
        # Target must not be in recommendations
        rec_ids = [m["id"] for m in recs]
        self.assertNotIn(target["id"], rec_ids)
        # Must be unique
        self.assertEqual(len(rec_ids), len(set(rec_ids)))
        # Top match should be The Martian (Sci-Fi, Adventure, space theme)
        self.assertEqual(recs[0]["id"], 2)
        self.assertGreater(recs[0]["similarity_score"], 0.2)

    def test_similarity_with_missing_overview(self):
        """Test similarity fallback when movie has empty overview."""
        target = self.sample_movies[6]  # Movie without overview
        recs = self.engine.compute_similarity(target, self.sample_movies, top_n=3)
        self.assertIsInstance(recs, list)
        self.assertNotIn(target["id"], [m["id"] for m in recs])

    def test_similarity_with_incomplete_metadata(self):
        """Test handling movies with completely missing metadata."""
        target = self.sample_movies[7]  # Incomplete metadata
        recs = self.engine.compute_similarity(target, self.sample_movies, top_n=3)
        self.assertIsInstance(recs, list)
        self.assertNotIn(target["id"], [m["id"] for m in recs])

    def test_why_explanation_contains_truthful_reasons(self):
        """Test that recommendation explanations cite real matched criteria."""
        target = self.sample_movies[0]  # Interstellar
        recs = self.engine.compute_similarity(target, self.sample_movies, top_n=1)
        self.assertTrue(len(recs) > 0)
        why = recs[0]["why_recommended"]
        self.assertIn("Interstellar", why)
        self.assertTrue(len(recs[0]["similarity_reasons"]) > 0)


if __name__ == "__main__":
    unittest.main()
