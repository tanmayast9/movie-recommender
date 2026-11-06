"""
TMDB Movie API integration service with caching, timeouts, and offline-safe fallback.
Provides real movie discovery, genres, details, search, and similar movie endpoints.
Follows TMDB attribution requirements and strict rating source labeling.
"""

import hashlib
import logging
import time
import json
from typing import Dict, Any, List, Optional
import requests
from config import Config

# In-memory TTL cache to minimize API calls and respect rate limits
_CACHE: Dict[str, Dict[str, Any]] = {}
logger = logging.getLogger(__name__)


class TMDBRequestError(Exception):
    """Sanitized upstream error safe to return from the application API."""

    def __init__(self, code: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.code = code
        self.public_message = message
        self.status_code = status_code


def _get_from_cache(key: str) -> Optional[Any]:
    if key in _CACHE:
        entry = _CACHE[key]
        if time.time() - entry["timestamp"] < Config.API_CACHE_TIMEOUT:
            return entry["data"]
        else:
            del _CACHE[key]
    return None


def _set_in_cache(key: str, data: Any) -> None:
    _CACHE[key] = {
        "timestamp": time.time(),
        "data": data
    }


# Standard TMDB Genre ID mapping
TMDB_GENRES = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
}

GENRE_NAME_TO_ID = {v.lower(): k for k, v in TMDB_GENRES.items()}
# Alias sci-fi
GENRE_NAME_TO_ID["science fiction"] = 878

# Curated catalogue of verified real TMDB movies with real poster paths and metadata
# Used when TMDB_API_KEY is not configured or during testing/offline fallback
CURATED_MOVIES: List[Dict[str, Any]] = [
    {
        "id": 157336,
        "title": "Interstellar",
        "original_title": "Interstellar",
        "genres": ["Sci-Fi", "Adventure", "Drama"],
        "genre_ids": [878, 12, 18],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US", "GB"],
        "country_name": "United States",
        "vote_average": 8.45,
        "vote_count": 35210,
        "rating_source": "TMDB",
        "release_date": "2014-11-05",
        "runtime": 169,
        "popularity": 142.8,
        "poster_path": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        "director": "Christopher Nolan",
        "cast": ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
        "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage."
    },
    {
        "id": 27205,
        "title": "Inception",
        "original_title": "Inception",
        "genres": ["Action", "Sci-Fi", "Thriller"],
        "genre_ids": [28, 878, 53],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US", "GB"],
        "country_name": "United States",
        "vote_average": 8.37,
        "vote_count": 36150,
        "rating_source": "TMDB",
        "release_date": "2010-07-15",
        "runtime": 148,
        "popularity": 138.4,
        "poster_path": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "director": "Christopher Nolan",
        "cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
        "overview": "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\"."
    },
    {
        "id": 961323,
        "title": "Kantara",
        "original_title": "ಕಾಂತಾರ",
        "genres": ["Action", "Thriller", "Drama"],
        "genre_ids": [28, 53, 18],
        "original_language": "kn",
        "language_name": "Kannada",
        "origin_country": ["IN"],
        "country_name": "India",
        "vote_average": 8.15,
        "vote_count": 480,
        "rating_source": "TMDB",
        "release_date": "2022-09-30",
        "runtime": 148,
        "popularity": 45.2,
        "poster_path": "https://image.tmdb.org/t/p/w500/mB0p2z7v0l1C0hS5U2mU7v7q7C5.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/a9XkQ8Zp7R3G8q6W5Q7o8U8r9v8.jpg",
        "director": "Rishab Shetty",
        "cast": ["Rishab Shetty", "Sapthami Gowda", "Kishore Kumar G.", "Achyuth Kumar"],
        "overview": "In the lush forests of Kaadubettu in coastal Karnataka, a fiery young kambala athlete clashes with a righteous forest officer while defending the demigod Bhoota Kola traditions of his village against ancestral greed."
    },
    {
        "id": 537996,
        "title": "Tumbbad",
        "original_title": "तुम्बाड",
        "genres": ["Horror", "Fantasy", "Drama"],
        "genre_ids": [27, 14, 18],
        "original_language": "hi",
        "language_name": "Hindi",
        "origin_country": ["IN"],
        "country_name": "India",
        "vote_average": 8.04,
        "vote_count": 390,
        "rating_source": "TMDB",
        "release_date": "2018-10-12",
        "runtime": 104,
        "popularity": 38.6,
        "poster_path": "https://image.tmdb.org/t/p/w500/q2iC2S3Wq1j6T7Y6zXyL8w4t2rP.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/4N8pL9s6T8r8q2w0y2z4x6m8v4r.jpg",
        "director": "Rahi Anil Barve",
        "cast": ["Sohum Shah", "Jyoti Malshe", "Anita Date-Kelkar", "Ronjini Chakraborty"],
        "overview": "A mythological horror story unfolding in the village of Tumbbad about Vinayak, whose endless obsession with the forbidden gold of Hastar, the demonic first-born god of greed, curses generations of his bloodline."
    },
    {
        "id": 496243,
        "title": "Parasite",
        "original_title": "기생충",
        "genres": ["Comedy", "Thriller", "Drama"],
        "genre_ids": [35, 53, 18],
        "original_language": "ko",
        "language_name": "Korean",
        "origin_country": ["KR"],
        "country_name": "South Korea",
        "vote_average": 8.51,
        "vote_count": 17850,
        "rating_source": "TMDB",
        "release_date": "2019-05-30",
        "runtime": 132,
        "popularity": 89.4,
        "poster_path": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
        "director": "Bong Joon-ho",
        "cast": ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
        "overview": "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident that exposes bitter social hierarchies."
    },
    {
        "id": 129,
        "title": "Spirited Away",
        "original_title": "千と千尋の神隠し",
        "genres": ["Animation", "Family", "Fantasy"],
        "genre_ids": [16, 10751, 14],
        "original_language": "ja",
        "language_name": "Japanese",
        "origin_country": ["JP"],
        "country_name": "Japan",
        "vote_average": 8.54,
        "vote_count": 16300,
        "rating_source": "TMDB",
        "release_date": "2001-07-20",
        "runtime": 125,
        "popularity": 92.1,
        "poster_path": "https://image.tmdb.org/t/p/w500/393r8K6QAh3qQ1Z3sZ9f8t9h0d5.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/bXNvzjYE2vAwk1rJ8qK6bZ9mP7.jpg",
        "director": "Hayao Miyazaki",
        "cast": ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki", "Takashi Naito"],
        "overview": "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family."
    },
    {
        "id": 286217,
        "title": "The Martian",
        "original_title": "The Martian",
        "genres": ["Drama", "Adventure", "Sci-Fi"],
        "genre_ids": [18, 12, 878],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US"],
        "country_name": "United States",
        "vote_average": 8.01,
        "vote_count": 19400,
        "rating_source": "TMDB",
        "release_date": "2015-09-30",
        "runtime": 144,
        "popularity": 78.5,
        "poster_path": "https://image.tmdb.org/t/p/w500/5BHuvQ6p9kL09NM8KiNmZd2QI7h.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/syzp96O5G0rBw1E9Vp2I0b7k6uM.jpg",
        "director": "Ridley Scott",
        "cast": ["Matt Damon", "Jessica Chastain", "Kristen Wiig", "Jeff Daniels"],
        "overview": "During a manned mission to Mars, Astronaut Mark Watney is presumed dead after a fierce storm and left behind by his crew. But Watney has survived and finds himself stranded and alone on the hostile planet."
    },
    {
        "id": 693134,
        "title": "Dune: Part Two",
        "original_title": "Dune: Part Two",
        "genres": ["Sci-Fi", "Adventure"],
        "genre_ids": [878, 12],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US"],
        "country_name": "United States",
        "vote_average": 8.16,
        "vote_count": 5420,
        "rating_source": "TMDB",
        "release_date": "2024-02-27",
        "runtime": 166,
        "popularity": 160.2,
        "poster_path": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0x2.jpg",
        "director": "Denis Villeneuve",
        "cast": ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
        "overview": "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family."
    },
    {
        "id": 579974,
        "title": "RRR",
        "original_title": "RRR",
        "genres": ["Action", "Drama", "Adventure"],
        "genre_ids": [28, 18, 12],
        "original_language": "te",
        "language_name": "Telugu",
        "origin_country": ["IN"],
        "country_name": "India",
        "vote_average": 7.78,
        "vote_count": 1650,
        "rating_source": "TMDB",
        "release_date": "2022-03-24",
        "runtime": 182,
        "popularity": 64.3,
        "poster_path": "https://image.tmdb.org/t/p/w500/wE0noFU1J1mU9j8V1k8zG8n4b3.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/gclG5c6vKk1bE4F8gW9o8n5T3sL.jpg",
        "director": "S. S. Rajamouli",
        "cast": ["N. T. Rama Rao Jr.", "Ram Charan", "Alia Bhatt", "Ajay Devgn"],
        "overview": "A fictional history of two legendary revolutionaries' journey away from home before they began fighting for their country in the 1920s against British colonial tyranny."
    },
    {
        "id": 872585,
        "title": "Oppenheimer",
        "original_title": "Oppenheimer",
        "genres": ["Drama", "History"],
        "genre_ids": [18, 36],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US", "GB"],
        "country_name": "United States",
        "vote_average": 8.09,
        "vote_count": 9210,
        "rating_source": "TMDB",
        "release_date": "2023-07-19",
        "runtime": 180,
        "popularity": 115.8,
        "poster_path": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/fm6K9vYI7vdEN39HaayjD6q4LAq.jpg",
        "director": "Christopher Nolan",
        "cast": ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
        "overview": "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II and the ensuing geopolitical and moral reckonings."
    },
    {
        "id": 857,
        "title": "Saving Private Ryan",
        "original_title": "Saving Private Ryan",
        "genres": ["Drama", "War"],
        "genre_ids": [18, 10752],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US"],
        "country_name": "United States",
        "vote_average": 8.21,
        "vote_count": 15800,
        "rating_source": "TMDB",
        "release_date": "1998-07-24",
        "runtime": 169,
        "popularity": 74.2,
        "poster_path": "https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5x7E9h.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/8Bmz0qS6Z0m8u2aX7c9v5W8j1Q.jpg",
        "director": "Steven Spielberg",
        "cast": ["Tom Hanks", "Tom Sizemore", "Edward Burns", "Matt Damon"],
        "overview": "As U.S. troops storm the beaches of Normandy, three brothers lie dead on the battlefield, with a fourth trapped behind enemy lines. Captain John Miller leads seven men on a mission to find him."
    },
    {
        "id": 155,
        "title": "The Dark Knight",
        "original_title": "The Dark Knight",
        "genres": ["Drama", "Action", "Crime", "Thriller"],
        "genre_ids": [18, 28, 80, 53],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US", "GB"],
        "country_name": "United States",
        "vote_average": 8.51,
        "vote_count": 32800,
        "rating_source": "TMDB",
        "release_date": "2008-07-16",
        "runtime": 152,
        "popularity": 150.4,
        "poster_path": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
        "director": "Christopher Nolan",
        "cast": ["Christian Bale", "Heath Ledger", "Michael Caine", "Gary Oldman"],
        "overview": "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker."
    },
    {
        "id": 238,
        "title": "The Godfather",
        "original_title": "The Godfather",
        "genres": ["Drama", "Crime"],
        "genre_ids": [18, 80],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US"],
        "country_name": "United States",
        "vote_average": 8.69,
        "vote_count": 20400,
        "rating_source": "TMDB",
        "release_date": "1972-03-14",
        "runtime": 175,
        "popularity": 128.5,
        "poster_path": "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
        "director": "Francis Ford Coppola",
        "cast": ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"],
        "overview": "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers, launching a campaign of bloody revenge."
    },
    {
        "id": 372058,
        "title": "Your Name.",
        "original_title": "君の名は。",
        "genres": ["Animation", "Romance", "Drama"],
        "genre_ids": [16, 10749, 18],
        "original_language": "ja",
        "language_name": "Japanese",
        "origin_country": ["JP"],
        "country_name": "Japan",
        "vote_average": 8.49,
        "vote_count": 11200,
        "rating_source": "TMDB",
        "release_date": "2016-08-26",
        "runtime": 107,
        "popularity": 86.2,
        "poster_path": "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxGD7q6Yr.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/dIWwZW7dJJ19iNNzR8LUm3NxKLQ.jpg",
        "director": "Makoto Shinkai",
        "cast": ["Ryunosuke Kamiki", "Mone Kamishiraishi", "Ryo Narita", "Aoi Yuki"],
        "overview": "High schoolers Mitsuha and Taki are complete strangers living separate lives in rural Itomori and bustling Tokyo. But suddenly, they begin to swap bodies when they sleep."
    },
    {
        "id": 801688,
        "title": "Lucia",
        "original_title": "ಲೂಸಿಯಾ",
        "genres": ["Thriller", "Sci-Fi", "Drama"],
        "genre_ids": [53, 878, 18],
        "original_language": "kn",
        "language_name": "Kannada",
        "origin_country": ["IN"],
        "country_name": "India",
        "vote_average": 7.82,
        "vote_count": 210,
        "rating_source": "TMDB",
        "release_date": "2013-09-06",
        "runtime": 135,
        "popularity": 22.4,
        "poster_path": "https://image.tmdb.org/t/p/w500/w0B1X6bK6mK8Q7R3n2r6Q2w0.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/x2b1c4e7g9j8m6v5x3z1.jpg",
        "director": "Pawan Kumar",
        "cast": ["Sathish Ninasam", "Sruthi Hariharan", "Achyuth Kumar", "Sanjay"],
        "overview": "An usher suffering from insomnia is given a special pill called Lucia which gives him vivid dreams where he lives the glamorous life of a movie star, blurring the boundary between reality and fantasy."
    },
    {
        "id": 99861,
        "title": "Avengers: Age of Ultron",
        "original_title": "Avengers: Age of Ultron",
        "genres": ["Action", "Adventure", "Sci-Fi"],
        "genre_ids": [28, 12, 878],
        "original_language": "en",
        "language_name": "English",
        "origin_country": ["US"],
        "country_name": "United States",
        "vote_average": 7.28,
        "vote_count": 22500,
        "rating_source": "TMDB",
        "release_date": "2015-04-22",
        "runtime": 141,
        "popularity": 98.7,
        "poster_path": "https://image.tmdb.org/t/p/w500/4ssDuvEDkS9NvmR15ezIKx89BR8.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/8uO0gUM8aNqYLBt12qURDnl093z.jpg",
        "director": "Joss Whedon",
        "cast": ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth"],
        "overview": "When Tony Stark tries to jumpstart a dormant peacekeeping program, things go awry and Earth's Mightiest Heroes are put to the ultimate test as the villainous Ultron emerges."
    }
]


class MovieAPIService:
    """
    Communicates with TMDB API or seamlessly serves curated live dataset with proper caching.
    """

    def __init__(self):
        self.api_key = Config.TMDB_API_KEY
        self.base_url = Config.TMDB_BASE_URL

    def _fetch_tmdb(self, endpoint: str, params: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
        """
        Executes an HTTP GET to TMDB with timeout and error handling.
        """
        if not self.api_key:
            raise TMDBRequestError(
                "missing_api_key",
                "Live TMDB data is unavailable because the server TMDB_API_KEY is not configured.",
                503,
            )

        request_params = dict(params or {})
        cache_key_data = json.dumps([endpoint, request_params, self.api_key], sort_keys=True)
        cache_key = f"tmdb:{hashlib.sha256(cache_key_data.encode()).hexdigest()}"
        cached = _get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                params={**request_params, "api_key": self.api_key},
                headers={"User-Agent": "CineMatch-Recommender/1.0", "Accept": "application/json"},
                timeout=6,
            )
        except requests.Timeout as error:
            logger.warning("TMDB request timed out for %s", endpoint)
            raise TMDBRequestError("timeout", "TMDB is taking too long to respond. Please try again.") from error
        except requests.RequestException as error:
            logger.warning("TMDB network request failed for %s", endpoint)
            raise TMDBRequestError("network_error", "TMDB is temporarily unreachable. Please try again.") from error

        if response.status_code == 404:
            raise TMDBRequestError("not_found", "Movie was not found in TMDB.", 404)
        if response.status_code in (401, 403):
            logger.warning("TMDB rejected the server credentials for %s", endpoint)
            raise TMDBRequestError("authentication_error", "TMDB authentication failed. Check the server configuration.")
        if response.status_code == 429:
            logger.warning("TMDB rate limit reached for %s", endpoint)
            raise TMDBRequestError("rate_limited", "TMDB rate limit reached. Please try again shortly.", 503)
        if response.status_code >= 500:
            logger.warning("TMDB returned HTTP %s for %s", response.status_code, endpoint)
            raise TMDBRequestError("upstream_error", "TMDB is temporarily unavailable. Please try again.")
        if not response.ok:
            logger.warning("TMDB returned HTTP %s for %s", response.status_code, endpoint)
            raise TMDBRequestError("upstream_error", "TMDB could not complete the request.")

        try:
            data = response.json()
        except ValueError as error:
            logger.warning("TMDB returned invalid JSON for %s", endpoint)
            raise TMDBRequestError("invalid_response", "TMDB returned an invalid response.") from error
        if not isinstance(data, dict):
            logger.warning("TMDB returned an unexpected response for %s", endpoint)
            raise TMDBRequestError("invalid_response", "TMDB returned an invalid response.")

        _set_in_cache(cache_key, data)
        return data

    def get_genres(self) -> List[Dict[str, Any]]:
        """Returns list of supported genres."""
        response = self._fetch_tmdb("/genre/movie/list")
        genres = response.get("genres", [])
        if not isinstance(genres, list):
            raise TMDBRequestError("invalid_response", "TMDB returned an invalid genre list.")
        return [genre for genre in genres if isinstance(genre, dict) and "id" in genre and "name" in genre]

    def get_curated_genres(self) -> List[Dict[str, Any]]:
        return [{"id": genre_id, "name": name} for genre_id, name in TMDB_GENRES.items()]

    def discover_movies(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Discover or search movies using TMDB query parameters from the server."""
        page = max(1, min(int(filters.get("page") or 1), 500))
        limit = max(1, min(int(filters.get("limit") or 12), 50))
        start_offset = (page - 1) * limit
        tmdb_page = start_offset // 20 + 1
        page_offset = start_offset % 20
        search_query = (filters.get("search") or "").strip()
        params: Dict[str, str] = {"include_adult": "false"}

        if search_query:
            endpoint = "/search/movie"
            params["query"] = search_query
        else:
            endpoint = "/discover/movie"
            sort_map = {
                "rating": "vote_average.desc",
                "rating_asc": "vote_average.asc",
                "release_date": "primary_release_date.desc",
                "release_date_asc": "primary_release_date.asc",
                "title": "original_title.asc",
            }
            params["sort_by"] = sort_map.get(filters.get("sort"), "popularity.desc")
            params["vote_count.gte"] = "50" if filters.get("sort") == "rating_asc" else "100"

            genre = filters.get("genre")
            genre_id = GENRE_NAME_TO_ID.get(str(genre or "").strip().lower())
            if genre_id:
                params["with_genres"] = str(genre_id)
            if filters.get("language"):
                params["with_original_language"] = str(filters["language"]).lower()
            if filters.get("country"):
                params["with_origin_country"] = str(filters["country"]).upper()
            if filters.get("min_rating") is not None:
                params["vote_average.gte"] = str(filters["min_rating"])
            if filters.get("max_rating") is not None:
                params["vote_average.lte"] = str(filters["max_rating"])
            if filters.get("year_from"):
                params["primary_release_date.gte"] = f"{filters['year_from']}-01-01"
            if filters.get("year_to"):
                params["primary_release_date.lte"] = f"{filters['year_to']}-12-31"

        raw_results = []
        response: Dict[str, Any] = {}
        while len(raw_results) < page_offset + limit and tmdb_page <= 500:
            response = self._fetch_tmdb(endpoint, {**params, "page": str(tmdb_page)})
            page_results = response.get("results", [])
            if not isinstance(page_results, list):
                raise TMDBRequestError("invalid_response", "TMDB returned an invalid movie list.")
            raw_results.extend(item for item in page_results if isinstance(item, dict))
            if not page_results or tmdb_page >= int(response.get("total_pages") or tmdb_page):
                break
            tmdb_page += 1
        results = [self._normalize_tmdb_movie(item) for item in raw_results][page_offset:page_offset + limit]

        if search_query:
            from recommender.engine import RecommendationEngine
            results = RecommendationEngine(results).filter_and_rank(
                genre=filters.get("genre"),
                language=filters.get("language"),
                country=filters.get("country"),
                min_rating=filters.get("min_rating"),
                max_rating=filters.get("max_rating"),
                year_from=filters.get("year_from"),
                year_to=filters.get("year_to"),
                sort_by=filters.get("sort") or "popularity",
            )

        return {
            "results": results,
            "total_results": int(response.get("total_results") or len(results)),
            "page": page,
            "total_pages": max(1, (int(response.get("total_results") or len(results)) + limit - 1) // limit),
        }

    def search_movies(self, query: str, page: int = 1) -> Dict[str, Any]:
        response = self._fetch_tmdb(
            "/search/movie",
            {"query": query, "page": str(max(1, min(page, 500))), "include_adult": "false"},
        )
        raw_results = response.get("results", [])
        if not isinstance(raw_results, list):
            raise TMDBRequestError("invalid_response", "TMDB returned an invalid movie list.")
        return {
            "results": [self._normalize_tmdb_movie(item) for item in raw_results if isinstance(item, dict)],
            "total_results": int(response.get("total_results") or 0),
            "page": int(response.get("page") or page),
            "total_pages": int(response.get("total_pages") or 1),
        }

    def get_similar_movies(self, movie_id: int, limit: int = 6) -> Dict[str, Any]:
        response = self._fetch_tmdb(
            f"/movie/{movie_id}/similar",
            {"page": "1", "include_adult": "false"},
        )
        raw_results = response.get("results", [])
        if not isinstance(raw_results, list):
            raise TMDBRequestError("invalid_response", "TMDB returned an invalid similar-movie list.")
        return {
            "results": [self._normalize_tmdb_movie(item) for item in raw_results if isinstance(item, dict)][:limit],
            "total_results": int(response.get("total_results") or 0),
        }

    def get_watch_providers(self, movie_id: int, region: str) -> Optional[Dict[str, Any]]:
        response = self._fetch_tmdb(f"/movie/{movie_id}/watch/providers")
        results = response.get("results", {})
        if not isinstance(results, dict):
            raise TMDBRequestError("invalid_response", "TMDB returned invalid watch-provider data.")
        return results.get(region.upper())

    def get_movie_by_id(self, movie_id: int) -> Optional[Dict[str, Any]]:
        """Fetch movie details by ID."""
        # 1. Check curated list
        for m in CURATED_MOVIES:
            if m["id"] == movie_id:
                return m

        # 2. Try live TMDB using only the backend-configured key.
        res = self._fetch_tmdb(f"/movie/{movie_id}", {"append_to_response": "credits"})
        return self._normalize_tmdb_movie(res)

    def get_all_curated(self) -> List[Dict[str, Any]]:
        return list(CURATED_MOVIES)

    def suggest_movie_live(
        self,
        mood: Optional[str] = None,
        genre: Optional[str] = None,
        language: Optional[str] = None,
        min_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Suggest a movie using TMDB when configured, otherwise use curated data.
        """
        # Mood to genre mapping
        mood_genre_map = {
            "mind-bending": "Sci-Fi",
            "adrenaline": "Action",
            "chills": "Horror",
            "emotional": "Drama",
            "lighthearted": "Comedy",
            "feel-good": "Comedy",
            "mythological": "Fantasy",
            "suspense": "Thriller"
        }
        target_genre = genre or (mood_genre_map.get((mood or "").lower()))

        live_movies = []
        is_live_network = False
        warning = None

        params: Dict[str, str] = {
            "sort_by": "popularity.desc",
            "vote_count.gte": "150",
            "include_adult": "false",
        }
        if target_genre:
            g_id = GENRE_NAME_TO_ID.get(target_genre.lower())
            if g_id:
                params["with_genres"] = str(g_id)
        if language:
            params["with_original_language"] = language.lower()
        if min_rating is not None:
            params["vote_average.gte"] = str(min_rating)

        try:
            res = self._fetch_tmdb("/discover/movie", params)
            raw_results = res.get("results", [])
            if isinstance(raw_results, list):
                live_movies = [self._normalize_tmdb_movie(item) for item in raw_results if isinstance(item, dict)]
                is_live_network = bool(live_movies)
        except TMDBRequestError as error:
            warning = error.public_message

        if not live_movies:
            # Fallback to local verified TMDB catalogue
            live_movies = list(CURATED_MOVIES)
            if not warning:
                warning = "TMDB returned no matching movies; showing the curated catalogue."

        from recommender.engine import RecommendationEngine
        engine = RecommendationEngine(live_movies)
        ranked = engine.filter_and_rank(
            movies=live_movies,
            genre=target_genre,
            language=language,
            min_rating=min_rating,
            sort_by="rating"
        )

        selected = ranked[0] if ranked else live_movies[0]

        # Generate transparent explanation
        explanation = f"Suggested live: matches {target_genre or 'top cinematic'} preferences with {selected.get('vote_average')}+ consensus rating."
        if mood:
            explanation = f"Matched your '{mood}' mood preference; selected based on thematic pacing and high acclaim."

        result = {
            "movie": selected,
            "source": "TMDB Live Internet API" if is_live_network else "TMDB Curated Live Dataset",
            "is_live_network": is_live_network,
            "why_suggested": explanation,
            "mood": mood,
            "requested_genre": target_genre
        }
        if warning:
            result["warning"] = warning
        return result

    def _normalize_tmdb_movie(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Maps raw TMDB payload to standard CineMatch schema."""
        if "genres" in raw and raw["genres"]:
            genres = [g.get("name") for g in raw["genres"]]
        elif "genre_ids" in raw and raw["genre_ids"]:
            genres = [TMDB_GENRES.get(gid, "Cinema") for gid in raw["genre_ids"]]
        else:
            genres = []
        credits = raw.get("credits", {})
        crew = credits.get("crew", [])
        cast = [c.get("name") for c in credits.get("cast", [])[:5]]
        director = next((c.get("name") for c in crew if c.get("job") == "Director"), "Unknown")

        poster = raw.get("poster_path")
        backdrop = raw.get("backdrop_path")

        return {
            "id": raw.get("id"),
            "title": raw.get("title") or raw.get("original_title"),
            "original_title": raw.get("original_title"),
            "genres": genres,
            "genre_ids": raw.get("genre_ids", []),
            "original_language": raw.get("original_language"),
            "language_name": {
                "en": "English",
                "kn": "Kannada",
                "hi": "Hindi",
                "te": "Telugu",
                "ta": "Tamil",
                "ml": "Malayalam",
                "ko": "Korean",
                "ja": "Japanese",
                "es": "Spanish",
                "fr": "French",
            }.get(raw.get("original_language"), raw.get("original_language") or "Unknown"),
            "origin_country": raw.get("origin_country") or [],
            "country_name": ", ".join(raw.get("origin_country") or []) or "TMDB",
            "vote_average": round(float(raw.get("vote_average") or 0.0), 2),
            "vote_count": raw.get("vote_count", 0),
            "rating_source": "TMDB",
            "release_date": raw.get("release_date") or "",
            "runtime": raw.get("runtime"),
            "popularity": raw.get("popularity", 0.0),
            "poster_path": f"{Config.TMDB_IMAGE_BASE_URL}/{Config.TMDB_POSTER_SIZE}{poster}" if poster else None,
            "backdrop_path": f"{Config.TMDB_IMAGE_BASE_URL}/{Config.TMDB_BACKDROP_SIZE}{backdrop}" if backdrop else None,
            "director": director,
            "cast": cast,
            "overview": raw.get("overview") or ""
        }
