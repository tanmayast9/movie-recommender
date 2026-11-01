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

The React app filters and ranks its catalogue using the selected criteria. For similar-film suggestions, CineMatch compares movie text and metadata with TF-IDF and cosine similarity, then uses shared genres and language to explain the match. When TMDB is available, the app can also retrieve live movie listings and details.

The repository also includes a separate Flask application in `movie-recommender/`. That implementation provides movie discovery and recommendation endpoints, account and collection features, and SQLite-backed persistence. It uses its own Python recommendation engine and application structure.

## Technology

- **Main app:** React, TypeScript, Vite, Tailwind CSS, and Lucide icons.
- **Movie data:** TMDB API integration, with a bundled catalogue available in the React app.
- **Recommendation methods:** Rule-based filtering and TF-IDF/cosine similarity.
- **Companion Flask app:** Python, Flask, SQLAlchemy, SQLite, and Requests.

## Project preview

The repository does not currently include screenshots of the application.
