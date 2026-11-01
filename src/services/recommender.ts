import { Movie, FilterState } from '../types';

const STOP_WORDS = new Set([
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
]);

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/\b[a-zA-Z0-9_-]{2,}\b/g) || [];
  return matches.filter(w => !STOP_WORDS.has(w));
}

function buildMovieDoc(movie: Movie): string {
  const genres = (movie.genres || []).map(g => g.replace(/\s+/g, '_')).join(' ');
  const title = movie.title || '';
  const overview = movie.overview || '';
  const lang = movie.original_language || '';
  const director = (movie.director || '').replace(/\s+/g, '_');
  // Weight genre repetition 3x
  return `${genres} ${genres} ${genres} ${title} ${overview} ${lang} ${director}`;
}

export class ClientRecommendationEngine {
  private movies: Movie[];

  constructor(movies: Movie[]) {
    this.movies = movies;
  }

  setMovies(movies: Movie[]) {
    this.movies = movies;
  }

  // Phase 2 Step A: Rule-Based Filtering & Ranking
  filterAndRank(filters: FilterState): { results: Movie[]; total: number; suggestion?: string } {
    let pool = [...this.movies];

    // Search query
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      pool = pool.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.overview && m.overview.toLowerCase().includes(q)) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.cast && m.cast.some(c => c.toLowerCase().includes(q)))
      );
    }

    // Genre
    if (filters.genre && filters.genre !== 'All Genres') {
      const gTarget = filters.genre.toLowerCase();
      pool = pool.filter(m =>
        m.genres.some(g => g.toLowerCase() === gTarget || g.toLowerCase().includes(gTarget))
      );
    }

    // Language
    if (filters.language) {
      const lTarget = filters.language.toLowerCase();
      pool = pool.filter(m =>
        m.original_language.toLowerCase() === lTarget ||
        m.language_name.toLowerCase().includes(lTarget)
      );
    }

    // Country
    if (filters.country) {
      const cTarget = filters.country.toUpperCase();
      pool = pool.filter(m =>
        (m.origin_country || []).some(c => c.toUpperCase() === cTarget)
      );
    }

    // Rating
    if (filters.min_rating > 0) {
      pool = pool.filter(m => m.vote_average >= filters.min_rating);
    }

    // Year
    if (filters.year_from) {
      const yf = parseInt(filters.year_from, 10);
      if (!isNaN(yf)) {
        pool = pool.filter(m => {
          const yr = parseInt((m.release_date || '').slice(0, 4), 10);
          return !isNaN(yr) && yr >= yf;
        });
      }
    }

    if (filters.year_to) {
      const yt = parseInt(filters.year_to, 10);
      if (!isNaN(yt)) {
        pool = pool.filter(m => {
          const yr = parseInt((m.release_date || '').slice(0, 4), 10);
          return !isNaN(yr) && yr <= yt;
        });
      }
    }

    // Sort
    switch (filters.sort) {
      case 'rating':
        pool.sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count);
        break;
      case 'rating_asc':
        pool.sort((a, b) => a.vote_average - b.vote_average);
        break;
      case 'release_date':
        pool.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
        break;
      case 'release_date_asc':
        pool.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
        break;
      case 'title':
        pool.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // popularity
        pool.sort((a, b) => b.popularity - a.popularity || b.vote_average - a.vote_average);
    }

    const total = pool.length;
    let suggestion: string | undefined;

    if (total === 0) {
      suggestion = "No movies match your exact combination of filters. Try lowering the minimum rating threshold, clearing the country constraint, or widening the release year range.";
    }

    const start = (filters.page - 1) * filters.limit;
    const paginated = pool.slice(start, start + filters.limit);

    return { results: paginated, total, suggestion };
  }

  // Phase 2 Step B: Content-Based Similarity (TF-IDF & Cosine Similarity)
  computeSimilarity(targetMovie: Movie, topN = 6): Movie[] {
    const pool = this.movies.filter(m => m.id !== targetMovie.id);
    if (pool.length === 0) return [];

    const docs = [buildMovieDoc(targetMovie), ...pool.map(buildMovieDoc)];
    const tokenized = docs.map(tokenize);
    const nDocs = tokenized.length;

    // Document frequencies
    const df: Record<string, number> = {};
    for (const docTokens of tokenized) {
      const seen = new Set(docTokens);
      for (const t of seen) {
        df[t] = (df[t] || 0) + 1;
      }
    }

    // TF-IDF vectorizer
    function getVec(tokens: string[]): Record<string, number> {
      if (!tokens.length) return {};
      const tf: Record<string, number> = {};
      for (const t of tokens) {
        tf[t] = (tf[t] || 0) + 1;
      }

      const vec: Record<string, number> = {};
      let sumSq = 0;
      for (const [term, count] of Object.entries(tf)) {
        const termTf = count / tokens.length;
        const termIdf = Math.log((1 + nDocs) / (1 + (df[term] || 0))) + 1.0;
        const val = termTf * termIdf;
        vec[term] = val;
        sumSq += val * val;
      }

      const norm = Math.sqrt(sumSq);
      if (norm > 0) {
        for (const t in vec) {
          vec[t] /= norm;
        }
      }
      return vec;
    }

    const targetVec = getVec(tokenized[0]);
    const targetGenres = new Set(targetMovie.genres.map(g => g.toLowerCase()));
    const targetLang = (targetMovie.original_language || '').toLowerCase();

    const scored = pool.map((cand, idx) => {
      const candTokens = tokenized[idx + 1];
      const candVec = getVec(candTokens);

      let cosineSim = 0;
      for (const t in targetVec) {
        if (candVec[t]) {
          cosineSim += targetVec[t] * candVec[t];
        }
      }

      const candGenres = new Set(cand.genres.map(g => g.toLowerCase()));
      const commonGenres = Array.from(targetGenres).filter(g => candGenres.has(g));
      const candLang = (cand.original_language || '').toLowerCase();

      let effectiveScore = cosineSim;
      if (candTokens.length <= 5 || cosineSim < 0.05) {
        const unionG = new Set([...targetGenres, ...candGenres]);
        const jaccard = unionG.size > 0 ? commonGenres.length / unionG.size : 0;
        effectiveScore = jaccard * 0.25 + (candLang === targetLang ? 0.05 : 0);
      } else {
        const genreRatio = commonGenres.length / Math.max(targetGenres.size, 1);
        effectiveScore = (cosineSim * 0.7) + (genreRatio * 0.3);
      }

      const reasons: string[] = [];
      if (commonGenres.length > 0) {
        reasons.push(`Shared genres: ${commonGenres.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}`);
      }
      if (candLang && candLang === targetLang) {
        reasons.push(`Same language (${cand.original_language.toUpperCase()})`);
      }

      return {
        movie: cand,
        score: effectiveScore,
        reasons
      };
    });

    scored.sort((a, b) => b.score - a.score || b.movie.vote_average - a.movie.vote_average);

    return scored.slice(0, topN).map(({ movie, score, reasons }) => {
      const pct = Math.round(Math.min(Math.max(score, 0.05), 0.99) * 100);
      const why = reasons.length > 0
        ? `Recommended based on content similarity to '${targetMovie.title}': ${reasons.join('; ')}.`
        : `Shares narrative pacing and thematic attributes with '${targetMovie.title}'.`;

      return {
        ...movie,
        similarity_score: Math.round(score * 1000) / 1000,
        similarity_percentage: pct,
        similarity_reasons: reasons,
        why_recommended: why
      };
    });
  }
}
