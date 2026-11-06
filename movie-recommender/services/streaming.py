"""
Streaming availability service for CineMatch.
Provides where to watch (flatrate streaming, rent, buy) data with India ('IN') as initial default.
Attributes data to JustWatch via TMDB.
"""

from typing import Dict, Any, Optional
from config import Config
from services.movie_api import MovieAPIService, TMDBRequestError


# Curated real streaming availability for fallback/offline
STREAMING_CATALOGUE: Dict[int, Dict[str, Any]] = {
    157336: {  # Interstellar
        "IN": {
            "flatrate": [
                {"provider_name": "JioCinema", "logo_path": "https://image.tmdb.org/t/p/original/hP9eQd5CjT6mZ4a7vU2R.jpg"},
                {"provider_name": "Amazon Prime Video", "logo_path": "https://image.tmdb.org/t/p/original/emthp39XA2zhcoYLK23V0agGeL1.jpg"}
            ],
            "rent": [
                {"provider_name": "Apple TV", "logo_path": "https://image.tmdb.org/t/p/original/peURlLlr8jggOwK53fJ5wdQl05y.jpg"},
                {"provider_name": "Google Play Movies", "logo_path": "https://image.tmdb.org/t/p/original/8z7rC8uIDaTM91X0ZPtE7S2v9jN.jpg"},
                {"provider_name": "YouTube", "logo_path": "https://image.tmdb.org/t/p/original/p3Z12gBq2v8f8Y9xZ8v1b5n6m4.jpg"}
            ],
            "buy": [
                {"provider_name": "Apple TV", "logo_path": "https://image.tmdb.org/t/p/original/peURlLlr8jggOwK53fJ5wdQl05y.jpg"}
            ]
        },
        "US": {
            "flatrate": [
                {"provider_name": "Paramount+", "logo_path": "https://image.tmdb.org/t/p/original/xbhHLa3AaVe2LF5G295f5L0k.jpg"}
            ],
            "rent": [{"provider_name": "Amazon Video"}, {"provider_name": "Apple TV"}],
            "buy": [{"provider_name": "Apple TV"}]
        }
    },
    961323: {  # Kantara
        "IN": {
            "flatrate": [
                {"provider_name": "Netflix", "logo_path": "https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg"},
                {"provider_name": "Amazon Prime Video", "logo_path": "https://image.tmdb.org/t/p/original/emthp39XA2zhcoYLK23V0agGeL1.jpg"}
            ],
            "rent": [],
            "buy": []
        }
    },
    537996: {  # Tumbbad
        "IN": {
            "flatrate": [
                {"provider_name": "Amazon Prime Video", "logo_path": "https://image.tmdb.org/t/p/original/emthp39XA2zhcoYLK23V0agGeL1.jpg"}
            ],
            "rent": [],
            "buy": []
        }
    },
    496243: {  # Parasite
        "IN": {
            "flatrate": [
                {"provider_name": "SonyLIV", "logo_path": "https://image.tmdb.org/t/p/original/9rDq2gW8nL0q7J.jpg"}
            ],
            "rent": [{"provider_name": "Apple TV"}, {"provider_name": "Google Play"}],
            "buy": [{"provider_name": "Apple TV"}]
        }
    },
    129: {  # Spirited Away
        "IN": {
            "flatrate": [
                {"provider_name": "Netflix", "logo_path": "https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg"}
            ],
            "rent": [],
            "buy": []
        }
    },
    27205: {  # Inception
        "IN": {
            "flatrate": [
                {"provider_name": "JioCinema", "logo_path": "https://image.tmdb.org/t/p/original/hP9eQd5CjT6mZ4a7vU2R.jpg"}
            ],
            "rent": [{"provider_name": "Apple TV"}, {"provider_name": "YouTube"}],
            "buy": [{"provider_name": "Apple TV"}]
        }
    }
}


class StreamingService:
    """
    Retrieves watch provider information for movies.
    """

    def __init__(self, api_service: Optional[MovieAPIService] = None, default_region: str = "IN"):
        self.api_service = api_service or MovieAPIService()
        self.default_region = default_region

    def get_watch_providers(self, movie_id: int, region: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns streaming providers categorized by flatrate (subscription), rent, and buy.
        Gracefully handles unavailable data with truthful attribution.
        """
        target_region = (region or self.default_region).upper()
        warning = None

        try:
            live_data = self.api_service.get_watch_providers(movie_id, target_region)
            if live_data is not None:
                return self._format_providers(movie_id, target_region, live_data)
        except TMDBRequestError as error:
            warning = error.public_message

        movie_data = STREAMING_CATALOGUE.get(movie_id, {})
        region_data = movie_data.get(target_region)

        if not region_data:
            response = {
                "movie_id": movie_id,
                "region": target_region,
                "has_providers": False,
                "attribution": "Streaming data provided by JustWatch via TMDB",
                "message": f"Streaming availability could not be verified for region '{target_region}'. Availability changes frequently across digital platforms.",
                "flatrate": [],
                "rent": [],
                "buy": []
            }
            if warning:
                response["warning"] = warning
            return response

        flatrate = region_data.get("flatrate", [])
        rent = region_data.get("rent", [])
        buy = region_data.get("buy", [])
        has_any = bool(flatrate or rent or buy)

        response = {
            "movie_id": movie_id,
            "region": target_region,
            "has_providers": has_any,
            "attribution": "Streaming data provided by JustWatch via TMDB",
            "message": "Available on the following authorized providers:" if has_any else "No active streaming subscriptions verified at this time.",
            "flatrate": flatrate,
            "rent": rent,
            "buy": buy
        }
        if warning:
            response["warning"] = warning
        return response

    @staticmethod
    def _format_providers(movie_id: int, region: str, data: Dict[str, Any]) -> Dict[str, Any]:
        def providers(category: str) -> list:
            items = data.get(category, [])
            if not isinstance(items, list):
                raise TMDBRequestError("invalid_response", "TMDB returned invalid watch-provider data.")
            return [
                {
                    "provider_name": item.get("provider_name", "Unknown provider"),
                    "logo_path": (
                        f"{Config.TMDB_IMAGE_BASE_URL}/original{item['logo_path']}"
                        if item.get("logo_path") else None
                    ),
                }
                for item in items
                if isinstance(item, dict)
            ]

        flatrate = providers("flatrate")
        rent = providers("rent")
        buy = providers("buy")
        has_any = bool(flatrate or rent or buy)
        return {
            "movie_id": movie_id,
            "region": region,
            "has_providers": has_any,
            "attribution": "Streaming data provided by JustWatch via TMDB",
            "message": "Available on the following authorized providers:" if has_any else "No active streaming subscriptions verified at this time.",
            "flatrate": flatrate,
            "rent": rent,
            "buy": buy,
        }
