/**
 * CineMatch - Client-Side Vanilla JavaScript
 * Communicates with Flask / Express REST API endpoints via Fetch API.
 * Handles Theme Switching, Authentication, Discovery Filters, Details, Favorites & Watchlist.
 */

// Application State
const State = {
  currentUser: null,
  theme: localStorage.getItem('cinematch_theme') || 'dark',
  activeFilters: {
    genre: '',
    language: '',
    country: '',
    min_rating: 0,
    year_from: '',
    year_to: '',
    sort: 'popularity',
    search: '',
    page: 1,
    limit: 12
  },
  userFavorites: new Set(),
  userWatchlist: new Set()
};

// Fallback Poster SVG Generator for missing images
function getFallbackPoster(title) {
  const safeTitle = (title || 'Movie').replace(/[<>&"]/g, '');
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="%231a1a20"/><text x="50%" y="45%" fill="%2371717a" font-family="sans-serif" font-size="36" font-weight="bold" text-anchor="middle">&#127916;</text><text x="50%" y="60%" fill="%23a1a1aa" font-family="sans-serif" font-size="16" font-weight="600" text-anchor="middle">${encodeURIComponent(safeTitle)}</text><text x="50%" y="68%" fill="%2352525b" font-family="sans-serif" font-size="12" text-anchor="middle">Poster Unavailable</text></svg>`;
}

// ============================================================================
// 1. Theme Management (Dark / Light)
// ============================================================================

function applyTheme(theme) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cinematch_theme', theme);

  if (State.currentUser) {
    fetch('/api/auth/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    }).catch(() => {});
  }
}

function initTheme() {
  applyTheme(State.theme);
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const nextTheme = State.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }
}

// ============================================================================
// 2. Authentication & User Profile
// ============================================================================

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      State.currentUser = data.user;
      if (data.user.theme_preference) {
        applyTheme(data.user.theme_preference);
      }
      renderAuthNav(true, data.user.username);
      await loadUserCollections();
    } else {
      State.currentUser = null;
      renderAuthNav(false);
    }
  } catch (err) {
    console.warn('Auth check skipped:', err);
    renderAuthNav(false);
  }
}

function renderAuthNav(isLoggedIn, username = '') {
  const loginBtn = document.getElementById('loginNavBtn');
  const userMenu = document.getElementById('userProfileNav');
  const nameEl = document.getElementById('navUsername');

  if (isLoggedIn && userMenu && nameEl) {
    if (loginBtn) loginBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    nameEl.textContent = username;
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }
}

async function loadUserCollections() {
  if (!State.currentUser) return;
  try {
    const [favRes, watchRes] = await Promise.all([
      fetch('/api/favorites'),
      fetch('/api/watchlist')
    ]);
    if (favRes.ok) {
      const favData = await favRes.json();
      State.userFavorites = new Set((favData.favorites || []).map(f => f.movie_id));
    }
    if (watchRes.ok) {
      const watchData = await watchRes.json();
      State.userWatchlist = new Set((watchData.watchlist || []).map(w => w.movie_id));
    }
  } catch (e) {
    console.error('Failed to load user collections', e);
  }
}

// ============================================================================
// 3. Movie Card Generator
// ============================================================================

function createMovieCard(movie) {
  const isFav = State.userFavorites.has(movie.id);
  const isWatch = State.userWatchlist.has(movie.id);
  const posterUrl = movie.poster_path || getFallbackPoster(movie.title);
  const year = (movie.release_date || '').slice(0, 4) || 'N/A';
  const genres = (movie.genres || []).slice(0, 2).join(' · ') || 'General';
  const rating = Number(movie.vote_average || 0).toFixed(1);
  const ratingSource = movie.rating_source || 'TMDB';

  const card = document.createElement('div');
  card.className = 'movie-card';
  card.innerHTML = `
    <div class="poster-wrapper">
      <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='${getFallbackPoster(movie.title)}'"/>
      <div class="card-action-overlay">
        <button class="icon-action-btn ${isFav ? 'active' : ''}" data-fav-id="${movie.id}" title="${isFav ? 'Remove Favorite' : 'Add to Favorites'}">
          ${isFav ? '&#9829;' : '&#9825;'}
        </button>
        <button class="icon-action-btn ${isWatch ? 'active' : ''}" data-watch-id="${movie.id}" title="${isWatch ? 'Remove Watchlist' : 'Add to Watchlist'}">
          ${isWatch ? '&#10003;' : '&#128278;'}
        </button>
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title" title="${movie.title}">${movie.title}</h3>
      <div class="card-meta-row">
        <span>${year}</span>
        <span class="meta-sep">&middot;</span>
        <div class="rating-badge-sm">
          <span>&#9733;</span>
          <span>${rating}</span>
        </div>
        <span class="rating-source-text">(${ratingSource})</span>
      </div>
      <div class="card-genres">${genres}</div>
      <div class="card-footer">
        <a href="/movie/${movie.id}" class="view-details-link">View Details &rarr;</a>
      </div>
    </div>
  `;

  // Attach favorite click
  const favBtn = card.querySelector(`[data-fav-id="${movie.id}"]`);
  favBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFavorite(movie, favBtn);
  });

  // Attach watchlist click
  const watchBtn = card.querySelector(`[data-watch-id="${movie.id}"]`);
  watchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleWatchlist(movie, watchBtn);
  });

  return card;
}

async function toggleFavorite(movie, btnEl) {
  if (!State.currentUser) {
    window.location.href = '/login';
    return;
  }

  const isFav = State.userFavorites.has(movie.id);
  try {
    if (isFav) {
      const res = await fetch(`/api/favorites/${movie.id}`, { method: 'DELETE' });
      if (res.ok) {
        State.userFavorites.delete(movie.id);
        btnEl.classList.remove('active');
        btnEl.innerHTML = '&#9825;';
      }
    } else {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          release_date: movie.release_date,
          genres: movie.genres
        })
      });
      if (res.ok) {
        State.userFavorites.add(movie.id);
        btnEl.classList.add('active');
        btnEl.innerHTML = '&#9829;';
      }
    }
  } catch (err) {
    console.error('Favorite action failed', err);
  }
}

async function toggleWatchlist(movie, btnEl) {
  if (!State.currentUser) {
    window.location.href = '/login';
    return;
  }

  const isWatch = State.userWatchlist.has(movie.id);
  try {
    if (isWatch) {
      const res = await fetch(`/api/watchlist/${movie.id}`, { method: 'DELETE' });
      if (res.ok) {
        State.userWatchlist.delete(movie.id);
        btnEl.classList.remove('active');
        btnEl.innerHTML = '&#128278;';
      }
    } else {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          release_date: movie.release_date,
          genres: movie.genres
        })
      });
      if (res.ok) {
        State.userWatchlist.add(movie.id);
        btnEl.classList.add('active');
        btnEl.innerHTML = '&#10003;';
      }
    }
  } catch (err) {
    console.error('Watchlist action failed', err);
  }
}

// ============================================================================
// 4. Page A: Homepage Initializer
// ============================================================================

async function initHomepage() {
  const heroBackdrop = document.getElementById('heroBackdrop');
  const featuredContainer = document.getElementById('featuredMovieContainer');
  const topRatedGrid = document.getElementById('topRatedGrid');
  const popularGrid = document.getElementById('popularGrid');

  try {
    // 1. Fetch top movies for featured hero
    const res = await fetch('/api/movies?sort=rating&limit=8');
    const data = await res.json();
    const movies = data.results || [];

    if (movies.length > 0) {
      const featured = movies[0];

      // Set hero backdrop image from API
      if (heroBackdrop && featured.backdrop_path) {
        heroBackdrop.style.backgroundImage = `url('${featured.backdrop_path}')`;
      }

      // Render featured spotlight
      if (featuredContainer) {
        featuredContainer.innerHTML = `
          <div class="featured-backdrop" style="background-image: url('${featured.backdrop_path || featured.poster_path}')"></div>
          <div class="featured-scrim"></div>
          <div class="featured-content">
            <span class="featured-kicker">Featured Spotlight &middot; ${featured.genres ? featured.genres.join(', ') : ''}</span>
            <h3 class="featured-title">${featured.title}</h3>
            <p class="featured-overview">${featured.overview || 'An outstanding cinematic experience.'}</p>
            <div class="featured-actions">
              <a href="/movie/${featured.id}" class="btn btn-primary">View Details &amp; Availability</a>
            </div>
          </div>
        `;
      }

      // Render Top Rated Grid
      if (topRatedGrid) {
        topRatedGrid.innerHTML = '';
        movies.slice(0, 4).forEach(m => {
          topRatedGrid.appendChild(createMovieCard(m));
        });
      }
    }

    // 2. Fetch Popular Grid
    if (popularGrid) {
      const popRes = await fetch('/api/movies?sort=popularity&limit=4');
      const popData = await popRes.json();
      popularGrid.innerHTML = '';
      (popData.results || []).forEach(m => {
        popularGrid.appendChild(createMovieCard(m));
      });
    }
  } catch (err) {
    console.error('Error loading homepage data', err);
  }
}

// ============================================================================
// 5. Page B: Discover Page Initializer
// ============================================================================

async function initDiscoverPage() {
  const filterForm = document.getElementById('filterForm');
  const minRatingInput = document.getElementById('filterMinRating');
  const ratingDisplay = document.getElementById('ratingDisplay');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const resetFiltersEmptyBtn = document.getElementById('resetFiltersEmptyBtn');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  // Read URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('genre')) State.activeFilters.genre = urlParams.get('genre');
  if (urlParams.has('language')) State.activeFilters.language = urlParams.get('language');
  if (urlParams.has('country')) State.activeFilters.country = urlParams.get('country');
  if (urlParams.has('search')) State.activeFilters.search = urlParams.get('search');
  if (urlParams.has('min_rating')) State.activeFilters.min_rating = parseFloat(urlParams.get('min_rating'));
  if (urlParams.has('sort')) State.activeFilters.sort = urlParams.get('sort');

  // Sync inputs
  if (document.getElementById('filterGenre')) document.getElementById('filterGenre').value = State.activeFilters.genre;
  if (document.getElementById('filterLanguage')) document.getElementById('filterLanguage').value = State.activeFilters.language;
  if (document.getElementById('filterCountry')) document.getElementById('filterCountry').value = State.activeFilters.country;
  if (document.getElementById('filterSearch')) document.getElementById('filterSearch').value = State.activeFilters.search;
  if (document.getElementById('filterSort')) document.getElementById('filterSort').value = State.activeFilters.sort;
  if (minRatingInput) {
    minRatingInput.value = State.activeFilters.min_rating || 0;
    if (ratingDisplay) ratingDisplay.textContent = `${minRatingInput.value}+`;
    minRatingInput.addEventListener('input', (e) => {
      if (ratingDisplay) ratingDisplay.textContent = `${e.target.value}+`;
    });
  }

  // Filter Form Submit
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      State.activeFilters.genre = document.getElementById('filterGenre').value;
      State.activeFilters.language = document.getElementById('filterLanguage').value;
      State.activeFilters.country = document.getElementById('filterCountry').value;
      State.activeFilters.search = document.getElementById('filterSearch').value.trim();
      State.activeFilters.sort = document.getElementById('filterSort').value;
      State.activeFilters.min_rating = parseFloat(minRatingInput ? minRatingInput.value : 0);
      State.activeFilters.year_from = document.getElementById('filterYearFrom').value;
      State.activeFilters.year_to = document.getElementById('filterYearTo').value;
      State.activeFilters.page = 1;
      fetchDiscoverResults();
    });
  }

  // Clear filters
  const clearHandler = () => {
    State.activeFilters = {
      genre: '',
      language: '',
      country: '',
      min_rating: 0,
      year_from: '',
      year_to: '',
      sort: 'popularity',
      search: '',
      page: 1,
      limit: 12
    };
    if (filterForm) filterForm.reset();
    if (ratingDisplay) ratingDisplay.textContent = '0.0+';
    fetchDiscoverResults();
  };

  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearHandler);
  if (resetFiltersEmptyBtn) resetFiltersEmptyBtn.addEventListener('click', clearHandler);

  // Pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (State.activeFilters.page > 1) {
        State.activeFilters.page--;
        fetchDiscoverResults();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      State.activeFilters.page++;
      fetchDiscoverResults();
    });
  }

  // Initial fetch
  fetchDiscoverResults();
}

async function fetchDiscoverResults() {
  const grid = document.getElementById('discoverMovieGrid');
  const countText = document.getElementById('resultsCountText');
  const emptyBox = document.getElementById('emptySuggestionBox');
  const emptyText = document.getElementById('emptySuggestionText');
  const chipsContainer = document.getElementById('activeFilterChips');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  if (!grid) return;
  grid.innerHTML = '<div class="loading-spinner">Filtering movies...</div>';
  if (emptyBox) emptyBox.classList.add('hidden');

  // Build query string
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(State.activeFilters)) {
    if (val !== '' && val !== null && val !== 0) {
      params.append(key, val);
    }
  }

  // Record recent search if query present
  if (State.activeFilters.search && State.currentUser) {
    fetch('/api/recent-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: State.activeFilters.search, filters: State.activeFilters })
    }).catch(() => {});
  }

  renderActiveFilterChips(chipsContainer);

  try {
    const res = await fetch(`/api/movies?${params.toString()}`);
    const data = await res.json();
    const results = data.results || [];
    const total = data.total_results || 0;
    const totalPages = data.total_pages || 1;
    const curPage = data.page || 1;

    if (countText) {
      countText.textContent = `Showing ${results.length} of ${total} matching movies`;
    }

    if (pageIndicator) {
      pageIndicator.textContent = `Page ${curPage} of ${totalPages}`;
    }

    if (prevBtn) prevBtn.disabled = curPage <= 1;
    if (nextBtn) nextBtn.disabled = curPage >= totalPages;

    grid.innerHTML = '';
    if (results.length === 0) {
      if (emptyBox) {
        emptyBox.classList.remove('hidden');
        if (emptyText && data.suggestion) {
          emptyText.textContent = data.suggestion;
        }
      }
    } else {
      results.forEach(m => {
        grid.appendChild(createMovieCard(m));
      });
    }
  } catch (err) {
    grid.innerHTML = '<div class="empty-suggestion-box">Failed to load movies. Please check your connection.</div>';
  }
}

function renderActiveFilterChips(container) {
  if (!container) return;
  container.innerHTML = '';

  const chips = [];
  if (State.activeFilters.genre) chips.push({ label: `Genre: ${State.activeFilters.genre}`, key: 'genre' });
  if (State.activeFilters.language) chips.push({ label: `Lang: ${State.activeFilters.language.toUpperCase()}`, key: 'language' });
  if (State.activeFilters.country) chips.push({ label: `Country: ${State.activeFilters.country}`, key: 'country' });
  if (State.activeFilters.min_rating > 0) chips.push({ label: `Rating: ${State.activeFilters.min_rating}+`, key: 'min_rating' });
  if (State.activeFilters.search) chips.push({ label: `"${State.activeFilters.search}"`, key: 'search' });

  if (chips.length === 0) {
    container.innerHTML = '<span class="no-filter-tag">All titles included</span>';
    return;
  }

  chips.forEach(chip => {
    const span = document.createElement('span');
    span.className = 'filter-chip';
    span.innerHTML = `${chip.label} <span class="chip-remove" title="Remove">&times;</span>`;
    span.querySelector('.chip-remove').addEventListener('click', () => {
      State.activeFilters[chip.key] = chip.key === 'min_rating' ? 0 : '';
      if (document.getElementById(`filter${capitalize(chip.key)}`)) {
        document.getElementById(`filter${capitalize(chip.key)}`).value = '';
      }
      fetchDiscoverResults();
    });
    container.appendChild(span);
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================================
// 6. Page C: Movie Details Initializer
// ============================================================================

async function initMovieDetailPage() {
  const root = document.getElementById('movieDetailRoot');
  if (!root) return;
  const movieId = root.getAttribute('data-movie-id');
  if (!movieId) return;

  const loadingEl = document.getElementById('movieLoadingState');
  const contentEl = document.getElementById('movieContentState');

  try {
    // 1. Fetch movie details
    const res = await fetch(`/api/movies/${movieId}`);
    if (!res.ok) throw new Error('Movie not found');
    const data = await res.json();
    const movie = data.movie;

    document.title = `${movie.title} - CineMatch`;

    // Populate metadata
    document.getElementById('detailTitle').textContent = movie.title;
    document.getElementById('detailYear').textContent = (movie.release_date || '').slice(0, 4) || 'N/A';
    document.getElementById('detailRuntime').textContent = movie.runtime ? `${movie.runtime} min` : 'Runtime N/A';
    document.getElementById('detailLanguage').textContent = (movie.language_name || movie.original_language || 'EN').toUpperCase();
    document.getElementById('detailCountry').textContent = movie.origin_country ? movie.origin_country.join(', ') : 'Global';

    // Poster & Backdrop
    const posterEl = document.getElementById('detailPoster');
    posterEl.src = movie.poster_path || getFallbackPoster(movie.title);
    posterEl.onerror = () => { posterEl.src = getFallbackPoster(movie.title); };

    const heroEl = document.getElementById('detailHero');
    if (movie.backdrop_path) {
      heroEl.style.backgroundImage = `url('${movie.backdrop_path}')`;
    }

    // Rating with explicit source label
    document.getElementById('detailVoteAvg').textContent = Number(movie.vote_average || 0).toFixed(1);
    document.getElementById('detailVoteCount').textContent = `Based on ${(movie.vote_count || 0).toLocaleString()} votes`;
    document.getElementById('detailRatingSource').textContent = `Source: ${movie.rating_source || 'TMDB'} Verified`;

    // Genres
    const genresContainer = document.getElementById('detailGenres');
    genresContainer.innerHTML = '';
    (movie.genres || []).forEach(g => {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = g;
      genresContainer.appendChild(tag);
    });

    // Synopsis & Cast
    document.getElementById('detailOverview').textContent = movie.overview || 'No synopsis available for this title.';
    document.getElementById('detailDirector').textContent = movie.director || 'Information unavailable';
    document.getElementById('detailCast').textContent = movie.cast ? movie.cast.join(', ') : 'Information unavailable';

    // Action buttons
    const favBtn = document.getElementById('toggleFavoriteBtn');
    const watchBtn = document.getElementById('toggleWatchlistBtn');
    const favLabel = document.getElementById('favBtnLabel');
    const watchLabel = document.getElementById('watchlistBtnLabel');

    const updateBtnStates = () => {
      const isFav = State.userFavorites.has(Number(movieId));
      const isWatch = State.userWatchlist.has(Number(movieId));
      favLabel.textContent = isFav ? 'Favorited' : 'Add to Favorites';
      watchLabel.textContent = isWatch ? 'On Watchlist' : 'Add to Watchlist';
    };
    updateBtnStates();

    favBtn.addEventListener('click', async () => {
      await toggleFavorite(movie, favBtn);
      updateBtnStates();
    });

    watchBtn.addEventListener('click', async () => {
      await toggleWatchlist(movie, watchBtn);
      updateBtnStates();
    });

    // 2. Fetch Watch Providers (Where to Watch)
    const regionSelect = document.getElementById('watchRegionSelect');
    loadWatchProviders(movieId, regionSelect ? regionSelect.value : 'IN');

    if (regionSelect) {
      regionSelect.addEventListener('change', (e) => {
        loadWatchProviders(movieId, e.target.value);
      });
    }

    // 3. Fetch Similar Movies & Why Explanation
    loadSimilarMovies(movieId);

    // Switch view
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

  } catch (err) {
    if (loadingEl) {
      loadingEl.innerHTML = `<div class="empty-suggestion-box"><h3>Movie Not Found</h3><p>Could not retrieve details for this title.</p><a href="/discover" class="btn btn-primary">Back to Discovery</a></div>`;
    }
  }
}

async function loadWatchProviders(movieId, region = 'IN') {
  const container = document.getElementById('watchProvidersContent');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner">Retrieving streaming channels...</div>';

  try {
    const res = await fetch(`/api/movies/${movieId}/watch-providers?region=${region}`);
    const data = await res.json();

    if (!data.has_providers) {
      container.innerHTML = `
        <p class="watch-attribution-note">${data.message}</p>
        <p class="watch-attribution-note" style="margin-top:0.5rem;">${data.attribution}</p>
      `;
      return;
    }

    let html = '';
    if (data.flatrate && data.flatrate.length > 0) {
      html += `
        <div class="provider-group">
          <h4 class="provider-category-title">Subscription Streaming</h4>
          <div class="providers-pill-row">
            ${data.flatrate.map(p => `
              <div class="provider-item">
                ${p.logo_path ? `<img src="${p.logo_path}" alt="${p.provider_name}" class="provider-logo"/>` : ''}
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (data.rent && data.rent.length > 0) {
      html += `
        <div class="provider-group">
          <h4 class="provider-category-title">Rent</h4>
          <div class="providers-pill-row">
            ${data.rent.map(p => `
              <div class="provider-item">
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (data.buy && data.buy.length > 0) {
      html += `
        <div class="provider-group">
          <h4 class="provider-category-title">Buy</h4>
          <div class="providers-pill-row">
            ${data.buy.map(p => `
              <div class="provider-item">
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `<p class="watch-attribution-note">${data.attribution}</p>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p class="watch-attribution-note">Streaming information is currently unavailable.</p>';
  }
}

async function loadSimilarMovies(movieId) {
  const grid = document.getElementById('similarMoviesGrid');
  const whyText = document.getElementById('whyExplanationText');
  if (!grid) return;

  try {
    const res = await fetch(`/api/movies/${movieId}/similar?limit=6`);
    const data = await res.json();
    const similar = data.results || [];

    if (similar.length > 0 && whyText) {
      // Use the top recommendation's transparent rationale
      whyText.textContent = similar[0].why_recommended || 'Matched through content correlation and genre affinity.';
    }

    grid.innerHTML = '';
    if (similar.length === 0) {
      grid.innerHTML = '<div class="empty-suggestion-box">No close similar matches in catalogue.</div>';
      return;
    }

    similar.forEach(m => {
      const card = createMovieCard(m);
      if (m.similarity_percentage) {
        const badge = document.createElement('div');
        badge.className = 'similarity-badge';
        badge.style.fontSize = '0.75rem';
        badge.style.color = 'var(--accent-primary)';
        badge.style.padding = '0.25rem 0.5rem';
        badge.textContent = `${m.similarity_percentage}% Thematic Match`;
        card.querySelector('.card-body').insertBefore(badge, card.querySelector('.card-footer'));
      }
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<div class="empty-suggestion-box">Failed to calculate recommendations.</div>';
  }
}

// ============================================================================
// 7. Favorites & Watchlist Pages Initializers
// ============================================================================

async function initFavoritesPage() {
  const notLoggedIn = document.getElementById('favoritesNotLoggedIn');
  const emptyState = document.getElementById('favoritesEmptyState');
  const grid = document.getElementById('favoritesGrid');

  if (!State.currentUser) {
    if (notLoggedIn) notLoggedIn.classList.remove('hidden');
    if (grid) grid.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch('/api/favorites');
    const data = await res.json();
    const favs = data.favorites || [];

    if (grid) {
      grid.innerHTML = '';
      if (favs.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
      } else {
        favs.forEach(f => {
          // Normalize to movie schema
          const m = {
            id: f.movie_id,
            title: f.title,
            poster_path: f.poster_path,
            vote_average: f.vote_average,
            release_date: f.release_date,
            genres: f.genres,
            rating_source: 'TMDB'
          };
          grid.appendChild(createMovieCard(m));
        });
      }
    }
  } catch (err) {
    if (grid) grid.innerHTML = '<p>Failed to load favorites.</p>';
  }
}

async function initWatchlistPage() {
  const notLoggedIn = document.getElementById('watchlistNotLoggedIn');
  const emptyState = document.getElementById('watchlistEmptyState');
  const grid = document.getElementById('watchlistGrid');

  if (!State.currentUser) {
    if (notLoggedIn) notLoggedIn.classList.remove('hidden');
    if (grid) grid.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch('/api/watchlist');
    const data = await res.json();
    const items = data.watchlist || [];

    if (grid) {
      grid.innerHTML = '';
      if (items.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
      } else {
        items.forEach(w => {
          const m = {
            id: w.movie_id,
            title: w.title,
            poster_path: w.poster_path,
            vote_average: w.vote_average,
            release_date: w.release_date,
            genres: w.genres,
            rating_source: 'TMDB'
          };
          grid.appendChild(createMovieCard(m));
        });
      }
    }
  } catch (err) {
    if (grid) grid.innerHTML = '<p>Failed to load watchlist.</p>';
  }
}

// ============================================================================
// 8. Auth Page (Login / Register) Initializer
// ============================================================================

function initAuthPage() {
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');
  const alertEl = document.getElementById('authAlert');

  if (!tabLogin || !formLogin) return;

  const showAlert = (msg, isError = true) => {
    alertEl.textContent = msg;
    alertEl.className = `auth-alert ${isError ? 'error' : 'success'}`;
    alertEl.classList.remove('hidden');
  };

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.classList.remove('hidden');
    formReg.classList.add('hidden');
    alertEl.classList.add('hidden');
  });

  tabReg.addEventListener('click', () => {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.classList.remove('hidden');
    formLogin.classList.add('hidden');
    alertEl.classList.add('hidden');
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email: identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      showAlert('Signed in successfully! Redirecting...', false);
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (err) {
      showAlert(err.message, true);
    }
  });

  formReg.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      showAlert('Account registered! Redirecting to home...', false);
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (err) {
      showAlert(err.message, true);
    }
  });
}

// ============================================================================
// Application Entry Point
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await checkAuth();

  // Route dispatcher based on path or presence of elements
  if (document.getElementById('featuredMovieContainer')) {
    initHomepage();
  }
  if (document.getElementById('filterForm')) {
    initDiscoverPage();
  }
  if (document.getElementById('movieDetailRoot')) {
    initMovieDetailPage();
  }
  if (document.getElementById('favoritesGrid')) {
    initFavoritesPage();
  }
  if (document.getElementById('watchlistGrid')) {
    initWatchlistPage();
  }
  if (document.getElementById('loginForm')) {
    initAuthPage();
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    });
  }
});
