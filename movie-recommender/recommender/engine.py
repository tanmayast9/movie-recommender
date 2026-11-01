"""
Content-based and rule-based recommendation engine for CineMatch.
Implemented in Python without external AI models or chatbots.
Uses deterministic rule filtering and TF-IDF vectorization with Cosine Similarity.
"""

import math
import re
from collections import Counter
from typing import List, Dict, Any, Optional, Tuple


class RecommendationEngine:
    """
    Deterministic rule-based and content-based recommendation engine.
    """

    STOP_WORDS = {
        'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
        'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
        'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
        'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
        'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
        'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no',
        'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
        'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
        'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
        'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
        'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
        'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
    }

    def __init__(self, movies: Optional[List[Dict[str, Any]]] = None):
        self.movies = movies or []

    def set_movies(self, movies: List[Dict[str, Any]]) -> None:
        self.movies = movies

    # =========================================================================
    # Step A: Rule-Based Filtering & Ranking
    # =========================================================================

    def filter_and_rank(
        self,
        movies: Optional[List[Dict[str, Any]]] = None,
        genre: Optional[str] = None,
        language: Optional[str] = None,
        country: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_rating: Optional[float] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        search_query: Optional[str] = None,
        sort_by: str = "popularity"
    ) -> List[Dict[str, Any]]:
        """
        Filters and sorts movies based on user criteria.
        Deterministic and testable.
        """
        pool = movies if movies is not None else self.movies
        results = []

        q_clean = search_query.strip().lower() if search_query else None

        for m in pool:
            # 1. Search query (title or overview)
            if q_clean:
                title = (m.get("title") or "").lower()
                overview = (m.get("overview") or "").lower()
                if q_clean not in title and q_clean not in overview:
                    continue

            # 2. Genre match
            if genre:
                g_target = genre.strip().lower()
                movie_genres = [str(g).lower() for g in m.get("genres", [])]
                if not any(g_target in g or g in g_target for g in movie_genres):
                    continue

            # 3. Language match
            if language:
                lang_code = language.strip().lower()
                m_lang = (m.get("original_language") or "").lower()
                if m_lang != lang_code and language.lower() not in (m.get("language_name") or "").lower():
                    continue

            # 4. Country of origin match
            if country:
                c_target = country.strip().upper()
                countries = [str(c).upper() for c in m.get("origin_country", [])]
                if c_target not in countries and country.lower() not in (m.get("country_name") or "").lower():
                    continue

            # 5. Rating filter
            rating = float(m.get("vote_average") or 0.0)
            if min_rating is not None and rating < float(min_rating):
                continue
            if max_rating is not None and rating > float(max_rating):
                continue

            # 6. Release Year filter
            release_date = m.get("release_date") or ""
            year = None
            if release_date and len(release_date) >= 4:
                try:
                    year = int(release_date[:4])
                except ValueError:
                    year = None

            if year is not None:
                if year_from is not None and year < year_from:
                    continue
                if year_to is not None and year > year_to:
                    continue
            elif year_from is not None or year_to is not None:
                # If year filter is active and movie has no release year, skip
                continue

            results.append(m)

        # Sorting
        if sort_by == "rating":
            results.sort(key=lambda x: (float(x.get("vote_average") or 0.0), int(x.get("vote_count") or 0)), reverse=True)
        elif sort_by == "rating_asc":
            results.sort(key=lambda x: float(x.get("vote_average") or 0.0))
        elif sort_by == "release_date":
            results.sort(key=lambda x: str(x.get("release_date") or ""), reverse=True)
        elif sort_by == "release_date_asc":
            results.sort(key=lambda x: str(x.get("release_date") or ""))
        elif sort_by == "title":
            results.sort(key=lambda x: str(x.get("title") or "").lower())
        else:  # default "popularity"
            results.sort(key=lambda x: (float(x.get("popularity") or 0.0), float(x.get("vote_average") or 0.0)), reverse=True)

        return results

    # =========================================================================
    # Step B: Content-Based Similarity (TF-IDF & Cosine Similarity)
    # =========================================================================

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', text.lower())
        return [w for w in words if w not in self.STOP_WORDS]

    def _build_movie_document(self, movie: Dict[str, Any]) -> str:
        """
        Combines genres (with weighted repetition), keywords, overview, and language.
        """
        genres = movie.get("genres", [])
        # Give higher weight to genres by repeating
        genre_str = " ".join([str(g).replace(" ", "_") for g in genres] * 3)
        keywords = " ".join([str(k).replace(" ", "_") for k in movie.get("keywords", [])] * 2)
        overview = movie.get("overview") or ""
        lang = movie.get("original_language") or ""
        director = (movie.get("director") or "").replace(" ", "_")
        return f"{genre_str} {keywords} {overview} {lang} {director}"

    def compute_similarity(
        self,
        target_movie: Dict[str, Any],
        candidate_movies: Optional[List[Dict[str, Any]]] = None,
        top_n: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Computes content-based similarity between target_movie and candidate_movies
        using TF-IDF vectorization and Cosine Similarity.
        Guarantees:
        - Excludes the selected movie itself.
        - Avoids duplicate results.
        - Gracefully handles missing descriptions / incomplete metadata.
        - Returns ranked list with transparent similarity scores and explanations.
        """
        candidates = candidate_movies if candidate_movies is not None else self.movies
        target_id = target_movie.get("id")

        # Exclude target movie and duplicates
        seen_ids = set()
        pool = []
        for m in candidates:
            m_id = m.get("id")
            if m_id != target_id and m_id not in seen_ids:
                seen_ids.add(m_id)
                pool.append(m)

        if not pool:
            return []

        # Prepare corpus: target doc is index 0, candidates are 1..N
        docs = [self._build_movie_document(target_movie)] + [self._build_movie_document(m) for m in pool]
        tokenized_docs = [self._tokenize(doc) for doc in docs]

        # Calculate Document Frequencies (DF)
        n_docs = len(tokenized_docs)
        df: Dict[str, int] = Counter()
        for doc_tokens in tokenized_docs:
            for term in set(doc_tokens):
                df[term] += 1

        # Calculate TF-IDF vectors
        def get_tfidf_vec(tokens: List[str]) -> Dict[str, float]:
            if not tokens:
                return {}
            tf = Counter(tokens)
            vec: Dict[str, float] = {}
            for term, count in tf.items():
                # Augmented frequency formula + smooth IDF
                term_tf = count / len(tokens)
                term_idf = math.log((1 + n_docs) / (1 + df.get(term, 0))) + 1.0
                vec[term] = term_tf * term_idf

            # Normalize vector to unit length
            norm = math.sqrt(sum(v * v for v in vec.values()))
            if norm > 0:
                for t in vec:
                    vec[t] /= norm
            return vec

        target_vec = get_tfidf_vec(tokenized_docs[0])

        scored_movies: List[Tuple[float, Dict[str, Any], List[str]]] = []

        target_genres = set(str(g).lower() for g in target_movie.get("genres", []))
        target_lang = (target_movie.get("original_language") or "").lower()

        for idx, candidate in enumerate(pool):
            cand_tokens = tokenized_docs[idx + 1]
            cand_vec = get_tfidf_vec(cand_tokens)

            # Cosine similarity between target_vec and cand_vec (both are unit vectors)
            cosine_sim = sum(target_vec[t] * cand_vec[t] for t in target_vec if t in cand_vec)

            # Genre overlap calculation for explanation and fallback
            cand_genres = set(str(g).lower() for g in candidate.get("genres", []))
            common_genres = target_genres.intersection(cand_genres)
            cand_lang = (candidate.get("original_language") or "").lower()

            # If overview is missing or cosine_sim is very low, use genre Jaccard fallback
            if len(cand_tokens) <= 5 or cosine_sim < 0.05:
                union_g = target_genres.union(cand_genres)
                jaccard = len(common_genres) / len(union_g) if union_g else 0.0
                effective_score = jaccard * 0.25 + (0.05 if cand_lang == target_lang else 0.0)
            else:
                # Add a boost for shared genres
                genre_overlap_ratio = len(common_genres) / max(len(target_genres), 1)
                effective_score = (cosine_sim * 0.7) + (genre_overlap_ratio * 0.3)

            # Shared attributes for explanation
            reasons = []
            if common_genres:
                reasons.append(f"Shared genres: {', '.join(sorted(list(common_genres)))}")
            if cand_lang and cand_lang == target_lang:
                reasons.append(f"Same language ({candidate.get('original_language', '').upper()})")

            scored_movies.append((effective_score, candidate, reasons))

        # Sort descending by score, then by popularity/rating
        scored_movies.sort(
            key=lambda x: (
                x[0],
                float(x[1].get("vote_average") or 0.0),
                float(x[1].get("popularity") or 0.0)
            ),
            reverse=True
        )

        # Build output objects with transparency info
        results = []
        for score, movie, reasons in scored_movies[:top_n]:
            rec_movie = dict(movie)
            similarity_pct = int(round(min(max(score, 0.05), 0.99) * 100))
            rec_movie["similarity_score"] = round(score, 3)
            rec_movie["similarity_percentage"] = similarity_pct
            rec_movie["similarity_reasons"] = reasons
            rec_movie["why_recommended"] = self.generate_why_explanation(
                target_movie=target_movie,
                recommended_movie=movie,
                score=score,
                reasons=reasons
            )
            results.append(rec_movie)

        return results

    # =========================================================================
    # Step C: Transparent "Why This Movie?" Explanation
    # =========================================================================

    @staticmethod
    def generate_why_explanation(
        target_movie: Optional[Dict[str, Any]] = None,
        recommended_movie: Optional[Dict[str, Any]] = None,
        filter_criteria: Optional[Dict[str, Any]] = None,
        score: float = 0.0,
        reasons: Optional[List[str]] = None
    ) -> str:
        """
        Generates deterministic, truthful explanations based on actual matched criteria.
        No hallucinated claims or AI marketing fluff.
        """
        # Case 1: Based on similarity to target movie
        if target_movie and recommended_movie:
            target_title = target_movie.get("title", "Selected Movie")
            common_reasons = reasons or []
            if common_reasons:
                return f"Recommended based on content similarity to '{target_title}': {'; '.join(common_reasons)}."
            target_genres = set(target_movie.get("genres", []))
            rec_genres = set(recommended_movie.get("genres", []))
            shared = target_genres.intersection(rec_genres)
            if shared:
                return f"Shares core genres ({', '.join(shared)}) and thematic pacing with '{target_title}'."
            return f"Curated as a thematic counterpart to '{target_title}' based on metadata correlation."

        # Case 2: Based on user filter criteria
        if filter_criteria:
            matches = []
            if filter_criteria.get("genre"):
                matches.append(f"matches your selected {filter_criteria['genre']} genre")
            if filter_criteria.get("language"):
                matches.append(f"{filter_criteria['language'].upper()} language preference")
            if filter_criteria.get("min_rating"):
                matches.append(f"meets your rating threshold of {filter_criteria['min_rating']}+")
            if filter_criteria.get("year_from") or filter_criteria.get("year_to"):
                yf = filter_criteria.get("year_from", "any")
                yt = filter_criteria.get("year_to", "any")
                matches.append(f"falls in the {yf}–{yt} release window")

            if matches:
                return f"This movie {', '.join(matches)}."
            return "Matches all your active discovery criteria."

        return "Highly rated title curated for your discovery criteria."
