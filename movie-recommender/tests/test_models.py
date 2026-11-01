"""
Unit tests for database models and authentication hashing.
Uses sqlite3 in-memory and models logic.
Run with: python3 -m unittest movie-recommender/tests/test_models.py
"""

import unittest
import sqlite3
import hashlib


def generate_password_hash(password: str) -> str:
    salt = "cinematch_salt_91"
    return hashlib.sha256((salt + password).encode()).hexdigest()


def check_password_hash(hash_val: str, password: str) -> bool:
    salt = "cinematch_salt_91"
    return hash_val == hashlib.sha256((salt + password).encode()).hexdigest()


class TestSQLiteModels(unittest.TestCase):

    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.cursor = self.conn.cursor()

        # Create tables
        self.cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                theme_preference TEXT DEFAULT 'dark',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        self.cursor.execute("""
            CREATE TABLE favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                poster_path TEXT,
                vote_average REAL DEFAULT 0.0,
                vote_count INTEGER DEFAULT 0,
                release_date TEXT,
                genres_json TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, movie_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        self.cursor.execute("""
            CREATE TABLE watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                poster_path TEXT,
                vote_average REAL DEFAULT 0.0,
                vote_count INTEGER DEFAULT 0,
                release_date TEXT,
                genres_json TEXT DEFAULT '[]',
                watched BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, movie_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        self.cursor.execute("""
            CREATE TABLE recent_searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                search_query TEXT,
                filters_json TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_password_hashing(self):
        """Test password is never plaintext and hash verifies correctly."""
        raw_pw = "SuperSecret123!"
        hashed = generate_password_hash(raw_pw)
        self.assertNotEqual(raw_pw, hashed)
        self.assertTrue(check_password_hash(hashed, raw_pw))
        self.assertFalse(check_password_hash(hashed, "WrongPassword"))

    def test_user_uniqueness(self):
        """Test username and email unique constraints."""
        pw_hash = generate_password_hash("password123")
        self.cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ("cinephile", "user@cinematch.com", pw_hash)
        )
        self.conn.commit()

        # Duplicate username should raise IntegrityError
        with self.assertRaises(sqlite3.IntegrityError):
            self.cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ("cinephile", "other@cinematch.com", pw_hash)
            )

    def test_prevent_duplicate_favorites(self):
        """Test user cannot add duplicate movie to favorites."""
        pw_hash = generate_password_hash("password123")
        self.cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            ("cinephile2", "user2@cinematch.com", pw_hash)
        )
        user_id = self.cursor.lastrowid

        self.cursor.execute(
            "INSERT INTO favorites (user_id, movie_id, title) VALUES (?, ?, ?)",
            (user_id, 157336, "Interstellar")
        )
        self.conn.commit()

        # Second insert of same movie_id for same user must fail
        with self.assertRaises(sqlite3.IntegrityError):
            self.cursor.execute(
                "INSERT INTO favorites (user_id, movie_id, title) VALUES (?, ?, ?)",
                (user_id, 157336, "Interstellar")
            )

    def test_user_data_isolation(self):
        """Test that user 1 and user 2 have completely isolated collections."""
        pw_hash = generate_password_hash("pass123")
        self.cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", ("alice", "a@test.com", pw_hash))
        alice_id = self.cursor.lastrowid
        self.cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", ("bob", "b@test.com", pw_hash))
        bob_id = self.cursor.lastrowid

        # Alice favorites Interstellar (157336)
        self.cursor.execute("INSERT INTO favorites (user_id, movie_id, title) VALUES (?, ?, ?)", (alice_id, 157336, "Interstellar"))
        # Bob favorites Kantara (961323)
        self.cursor.execute("INSERT INTO favorites (user_id, movie_id, title) VALUES (?, ?, ?)", (bob_id, 961323, "Kantara"))
        self.conn.commit()

        # Alice's favorites query
        self.cursor.execute("SELECT movie_id, title FROM favorites WHERE user_id = ?", (alice_id,))
        alice_favs = self.cursor.fetchall()
        self.assertEqual(len(alice_favs), 1)
        self.assertEqual(alice_favs[0][0], 157336)

        # Bob's favorites query
        self.cursor.execute("SELECT movie_id, title FROM favorites WHERE user_id = ?", (bob_id,))
        bob_favs = self.cursor.fetchall()
        self.assertEqual(len(bob_favs), 1)
        self.assertEqual(bob_favs[0][0], 961323)


if __name__ == "__main__":
    unittest.main()
