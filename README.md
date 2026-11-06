# CineMatch

**Movie discovery shaped around your taste.**

CineMatch is a movie discovery and recommendation project that helps people move beyond endless browsing. Explore a curated movie catalogue, refine results around the qualities that matter to you, and find films related to a title you already enjoy.

## What it offers

- **Flexible discovery:** Search titles and filter by genre, language, country, rating, and release year; sort results by popularity, rating, release date, or title.
- **Similar-film recommendations:** Surface related movies using content-based TF-IDF and cosine similarity, with genre-based matching for sparse descriptions.
- **Clear recommendation context:** Show the shared genres, language, and other matching signals behind recommendations.
- **Personal collections:** Keep favorites, a watchlist, and recent searches, with separate browser-stored collections for guests and signed-in profiles in the React app.
- **Movie details:** Explore film descriptions, ratings, cast, and director. The React app can retrieve current movie information from TMDB and includes a local catalogue fallback.
- **A tailored interface:** Browse a responsive movie-focused experience with dark and light themes.

## How it works

The React app sends movie discovery, search, live suggestions, details, similar-movie, genre, and watch-provider requests to the Flask API using same-origin `/api/...` routes. Flask reads `TMDB_API_KEY` from its server environment and is the only application tier that contacts TMDB. When TMDB is unavailable or the server key is not configured, the API returns curated fallback data where possible; the React app also retains its bundled catalogue as a fallback if Flask cannot be reached.

For local development, run Flask on port 5001 and Vite on port 3000. The Vite development proxy forwards `/api/...` requests to Flask. In the deployed Vercel configuration, the existing `/api/(.*)` rewrite routes those same-origin requests to the `movie-recommender` Flask service before the catch-all frontend rewrite.

## Technology

- **Main app:** React, TypeScript, Vite, Tailwind CSS, and Lucide icons.
- **Movie data:** Server-side TMDB integration through Flask, with curated catalogues available as fallbacks.
- **Recommendation methods:** Rule-based filtering and TF-IDF/cosine similarity.
- **Companion Flask app:** Python, Flask, SQLAlchemy, SQLite, and Requests.

## Project preview

The repository does not currently include screenshots of the application.

## Backend TMDB configuration

Set `TMDB_API_KEY` as an environment variable for the Flask service (for example, in `movie-recommender/.env` during local development or the `movie-recommender` Vercel service environment). Keep TMDB credentials out of frontend build variables; the frontend has no TMDB credentials and does not contact TMDB directly. The Flask service can still serve curated movie data if `TMDB_API_KEY` is absent.
