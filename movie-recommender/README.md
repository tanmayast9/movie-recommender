# CineMatch — Movie Discovery & Recommendation Website

A complete, responsive, full-stack movie discovery and recommendation platform built with **Python, Flask, SQLite, SQLAlchemy, HTML5, CSS3, and Vanilla JavaScript**.

CineMatch empowers users to discover movies based on multi-criteria preference matching, explore similar titles using content-based vector similarity (TF-IDF & Cosine Similarity), inspect transparent "Why This Movie?" rationales, check authorized streaming channels (JustWatch via TMDB), and curate personal collections (Favorites and Watchlists) with secure session authentication.

---

## Architecture & Technology Stack

### Backend
- **Python 3.10+**: Core programming language.
- **Flask 3.0+**: Lightweight web application framework with modular Blueprints.
- **SQLite 3**: Embedded relational database for persistence.
- **SQLAlchemy ORM**: Object-relational mapping with foreign keys, cascading deletes, and unique constraints.
- **Werkzeug Security**: Salted SHA-256 password hashing.
- **Urllib / Requests**: Safe external API requests with timeouts (6s) and rate-limiting safeguards.
- **In-Memory TTL Caching**: High-performance cache layer minimizing redundant external requests.

### Recommendation Engine
- **Deterministic Rule-Based Filtering**: Multi-parameter intersection over genres, languages, countries, rating bounds, and release windows.
- **Content-Based Similarity**: Pure algorithmic TF-IDF (Term Frequency-Inverse Document Frequency) text vectorization and Cosine Similarity calculated across movie genres, overviews, language, and directorial credits without external AI models or chatbots.
- **Truthful "Why This Movie?" Explanations**: Transparent rule citation explaining the exact overlap criteria.

### Frontend
- **Semantic HTML5 & Modern CSS3**: Custom dark/light theme switching using CSS variables.
- **Vanilla JavaScript (ES6+)**: Clean, asynchronous UI communication via the native `fetch()` API.
- **Zero-Pill Typography & Anti-Slop Discipline**: Designed according to human editorial aesthetics with clear typographic hierarchy and responsive CSS Grid.

---

## Project Structure

```
movie-recommender/
├── app.py                      # Flask Application entry point and factory
├── config.py                   # App configuration and environment variable loading
├── extensions.py               # Shared SQLAlchemy extension
├── models.py                   # Database models (User, Favorite, Watchlist, RecentSearch)
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment configuration
├── .gitignore                  # Git exclusions for DB, virtualenv, and cache
├── postman_collection.json     # Ready-to-import Postman API collection
├── README.md                   # Complete documentation
├── recommender/
│   └── engine.py               # Rule-based filter and TF-IDF Cosine Similarity engine
├── services/
│   ├── movie_api.py            # TMDB API client with caching, error handling & fallback
│   └── streaming.py            # Authorized streaming providers (JustWatch via TMDB)
├── routes/
│   ├── auth.py                 # User authentication (register, login, logout, me, theme)
│   ├── movies.py               # Discovery, movie details, similar, watch providers, search
│   └── users.py                # Favorites, watchlist, and recent searches
├── templates/
│   ├── base.html               # Shared HTML master layout (3-zone nav, footer, theme toggle)
│   ├── index.html              # Page A: Cinematic Homepage with hero and featured spotlight
│   ├── discover.html           # Page B: Filter panel, active tags, movie grid, pagination
│   ├── movie_detail.html       # Page C: Large backdrop, TMDB rating, Where to Watch, Similar
│   ├── favorites.html          # User Favorites collection
│   ├── watchlist.html          # User Watchlist with watched toggle
│   └── login.html              # Account login and registration
├── static/
│   ├── css/
│   │   └── style.css           # Production CSS with dark/light themes & responsive layout
│   └── js/
│       └── main.js             # Vanilla JS app controller, fetch handlers, and theme logic
└── tests/
    ├── test_recommender.py     # Unit tests for recommendation engine (TF-IDF & filtering)
    └── test_models.py          # Unit tests for SQLite models, password hashing & isolation
```

---

## Installation & Local Execution

### 1. Prerequisites
Ensure **Python 3.10+** and `git` are installed on your machine.

### 2. Clone and Setup Environment
```bash
git clone <your-repo-url>
cd movie-recommender

# Create a virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS / Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a local `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` to configure your settings:
- `SECRET_KEY`: Any secure random string for session encryption.
- `TMDB_API_KEY`: *(Optional)* Your TMDB API key. If omitted, CineMatch automatically runs on its verified curated catalogue of real movies with real posters and metadata.
- `DATABASE_URL`: Defaults to `sqlite:///cinematch.db`.

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://localhost:5000
```

---

## Running Automated Tests

Run the full automated test suite using Python's standard `unittest`:

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

The test suite validates:
1. Exact genre matching and multi-filter intersection.
2. Release year window constraints.
3. Empty result set detection.
4. TF-IDF vectorization and Cosine Similarity calculation.
5. Exclusion of the source movie from its own recommendations.
6. Deduplication and handling of incomplete metadata / missing overviews.
7. Truthful rationale generation ("Why This Movie?").
8. Salted password hashing (passwords never stored plaintext).
9. User data isolation (User A cannot access or modify User B's collections).
10. Unique constraints preventing duplicate favorites or watchlist entries.

---

## Recommendation Engine Architecture

### Phase 2 Step A: Rule-Based Filtering
Implemented in `recommender/engine.py`. Filters candidates by:
- **Genre Match**: Substring and list intersection.
- **Language**: ISO 639-1 code (`en`, `kn`, `hi`, `ko`, `ja`, etc.).
- **Country**: ISO 3166-1 alpha-2 code (`US`, `IN`, `KR`, etc.).
- **Rating Range**: Enforcing minimum and maximum rating bounds.
- **Release Year Range**: `year_from` to `year_to`.
- **Sorting**: Deterministic ordering by `popularity`, `rating`, `release_date`, or `title`.

### Phase 2 Step B: Content-Based Similarity (TF-IDF & Cosine Similarity)
- Computes weighted token frequencies across movie genres (boosted), keywords, synopsis/overview text, and original language.
- Normalizes document vectors into unit Euclidean hyperspace.
- Computes dot product (Cosine Similarity) between the target movie vector and all candidate vectors.
- Excludes the selected movie itself and eliminates duplicate IDs.
- Includes a Jaccard genre fallback for movies with short or missing plot synopses.

### Transparent "Why This Movie?" Explanations
Generated dynamically by `RecommendationEngine.generate_why_explanation()`.
- Cites specific matched genres and thematic attributes.
- Example: *"Recommended based on content similarity to 'Interstellar': Shared genres: Adventure, Drama, Sci-Fi; Same language (EN)."*

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and engine metadata |
| `GET` | `/api/genres` | List of supported genres with IDs |
| `GET` | `/api/suggest-live` | Suggest a movie live from the internet (mood, genre, language, rating, custom key) |
| `GET` | `/api/movies` | Discover movies with multi-criteria filters |
| `GET` | `/api/movies/<id>` | Full movie details with cast and director |
| `GET` | `/api/movies/<id>/similar` | Content-based similar movies (TF-IDF) |
| `GET` | `/api/movies/<id>/watch-providers` | Where to watch (India default, JustWatch) |
| `GET` | `/api/search?q=<query>` | Fast search by title |
| `POST` | `/api/auth/register` | Create user account |
| `POST` | `/api/auth/login` | Log in and start session |
| `POST` | `/api/auth/logout` | End user session |
| `GET` | `/api/auth/me` | Current user profile |
| `PUT` | `/api/auth/theme` | Persist dark/light theme preference |
| `GET` | `/api/favorites` | List authenticated user's favorites |
| `POST` | `/api/favorites` | Add movie to favorites |
| `DELETE` | `/api/favorites/<id>` | Remove movie from favorites |
| `GET` | `/api/watchlist` | List user's watchlist |
| `POST` | `/api/watchlist` | Add movie to watchlist |
| `DELETE` | `/api/watchlist/<id>` | Remove movie from watchlist |
| `GET` | `/api/recent-searches` | Get recent search queries |
| `DELETE` | `/api/recent-searches` | Clear search history |

---

## Postman API Testing

1. Open Postman.
2. Click **Import** and select `postman_collection.json`.
3. Set the collection variable `base_url` to `http://localhost:5000`.
4. Run requests in sequence to test discovery, similarity calculation, user registration, and personal collections.

---

## External API Attribution & Limitations

- **TMDB Attribution**: This product uses the TMDB API and image CDN but is not endorsed or certified by TMDB.
- **Rating Source**: All ratings are clearly labeled beside the score as `TMDB Rating`. TMDB ratings are never labeled as IMDb ratings.
- **Streaming Availability**: Streaming provider information is attributed to **JustWatch via TMDB**. If streaming providers cannot be verified for a specific title or region, the UI clearly discloses that availability cannot be confirmed rather than hallucinating direct links.
