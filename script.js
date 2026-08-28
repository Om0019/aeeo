/**
 * Aeeo Streaming Platform - TMDB, Streaming Addons & Continue Watching Integration
 */

// TMDB API Configuration
const TMDB_API_KEY = 'af3fa2d2239e9d0e6c04a1076d3df76f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';
const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
const IMG_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const PLACEHOLDER_POSTER = 'https://via.placeholder.com/500x750/14151e/8b8d9b?text=No+Poster';

// Nuvio & Streaming Addon APIs (https://nuvio.tv/docs)
const NUVIO_API_URL = 'https://api.nuvio.tv';
const NUVIO_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxNTIxMzQ2LCJleHAiOjE5MzkyMDEzNDZ9.tmQaj682pwzehpqlgCDMnySOqiUvpgRbrE43T4VJpDI';

// Default Active Streaming Addons (FL4X English & Latino aggregators)
const DEFAULT_STREAMING_ADDONS = [
    {
        id: 'org.stremio.english-addon',
        name: 'FL4X English',
        url: 'https://addon.fl4x.com/english/manifest.json',
        type: 'Aggregated English Streams',
        version: '1.0.0',
        enabled: true
    },
    {
        id: 'com.latino.spanish',
        name: 'FL4X Latino 🇲🇽',
        url: 'https://addon.fl4x.com/manifest.json',
        type: 'Películas y Series Latino',
        version: '1.0.1',
        enabled: true
    }
];

function getMediaType(item) {
    if (!item) return 'movie';
    const candidate = item.mediaType || item.media_type || item.content_type || item.type;
    if (candidate) {
        const lower = String(candidate).toLowerCase().trim();
        if (lower === 'tv' || lower === 'series' || lower === 'show') return 'tv';
        if (lower === 'movie') return 'movie';
    }
    if (item.first_air_date || item.number_of_seasons || item.number_of_episodes || item.seasons) {
        return 'tv';
    }
    if (item.name && !item.title) {
        return 'tv';
    }
    return 'movie';
}

// Initial Demo / Starter In-Progress Titles
const INITIAL_CONTINUE_WATCHING = [
    {
        id: 634649,
        imdb_id: 'tt10872600',
        title: 'Spider-Man: No Way Home',
        poster_path: '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
        backdrop_path: '/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
        vote_average: 8.0,
        release_date: '2021',
        mediaType: 'movie',
        media_type: 'movie',
        progress: 68,
        lastWatched: Date.now() - 3600000
    },
    {
        id: 693134,
        imdb_id: 'tt15239678',
        title: 'Dune: Part Two',
        poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s520QIe.jpg',
        vote_average: 8.2,
        release_date: '2024',
        mediaType: 'movie',
        media_type: 'movie',
        progress: 42,
        lastWatched: Date.now() - 7200000
    },
    {
        id: 100088,
        imdb_id: 'tt3581920',
        title: 'The Last of Us',
        poster_path: '/uKvVjHNqB5VmOrdxqAt2V7JMrHG.jpg',
        backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
        vote_average: 8.6,
        first_air_date: '2023',
        release_date: '2023',
        mediaType: 'tv',
        media_type: 'tv',
        progress: 85,
        lastWatched: Date.now() - 10800000
    }
];

let initialCW = INITIAL_CONTINUE_WATCHING;
try {
    const raw = localStorage.getItem('aeeo_continue_watching');
    if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            initialCW = parsed.map(item => {
                const type = getMediaType(item);
                return {
                    ...item,
                    mediaType: type,
                    media_type: type
                };
            });
        }
    }
} catch (e) {
    initialCW = INITIAL_CONTINUE_WATCHING;
}

let loadedStreamingAddons = DEFAULT_STREAMING_ADDONS;
try {
    const rawAddons = localStorage.getItem('aeeo_streaming_addons');
    if (rawAddons) {
        const parsed = JSON.parse(rawAddons).filter(a => a.id !== 'torrentio');
        if (Array.isArray(parsed) && parsed.length > 0) {
            loadedStreamingAddons = parsed;
        } else {
            loadedStreamingAddons = DEFAULT_STREAMING_ADDONS;
        }
    }
} catch (e) {
    loadedStreamingAddons = DEFAULT_STREAMING_ADDONS;
}

// Application State
const state = {
    currentView: 'home',
    featuredItem: null,
    watchlist: JSON.parse(localStorage.getItem('aeeo_watchlist') || '[]'),
    continueWatching: initialCW,
    activeModalItem: null,
    nuvioSession: JSON.parse(localStorage.getItem('aeeo_nuvio_session') || 'null'),
    streamingAddons: loadedStreamingAddons,
    authMode: 'login' // 'login' | 'signup'
};

// DOM Elements
const contentContainer = document.getElementById('content-container');
const sectionsContainer = document.getElementById('sections-container');
const heroBanner = document.getElementById('hero-banner');
const heroBackdrop = document.getElementById('hero-backdrop');
const heroTitle = document.getElementById('hero-title');
const heroRating = document.getElementById('hero-rating');
const heroYear = document.getElementById('hero-year');
const heroType = document.getElementById('hero-type');
const heroOverview = document.getElementById('hero-overview');
const heroPlayBtn = document.getElementById('hero-play-btn');
const heroWatchlistBtn = document.getElementById('hero-watchlist-btn');
const heroInfoBtn = document.getElementById('hero-info-btn');
const heroBadge = document.getElementById('hero-badge');

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear');
const navItems = document.querySelectorAll('.sidebar-nav [data-view]');

// Full Detail Screen Elements
const detailScreen = document.getElementById('detail-screen');
const detailBackBtn = document.getElementById('detail-back-btn');
const detailBackdropBg = document.getElementById('detail-backdrop-bg');
const detailPosterImg = document.getElementById('detail-poster-img');
const detailTypeBadge = document.getElementById('detail-type-badge');
const detailTitle = document.getElementById('detail-title');
const detailTagline = document.getElementById('detail-tagline');
const detailRating = document.getElementById('detail-rating');
const detailYear = document.getElementById('detail-year');
const detailRuntime = document.getElementById('detail-runtime');
const detailGenres = document.getElementById('detail-genres');
const detailOverview = document.getElementById('detail-overview');
const detailPlayBtn = document.getElementById('detail-play-btn');
const detailTrailerBtn = document.getElementById('detail-trailer-btn');
const detailWatchlistBtn = document.getElementById('detail-watchlist-btn');
const detailPlayerSection = document.getElementById('detail-player-section');
const detailPlayerCloseBtn = document.getElementById('detail-player-close-btn');
const detailPlayerExternalLink = document.getElementById('detail-player-external-link');
const detailTrailerIframe = document.getElementById('detail-trailer-iframe');
const detailCastRow = document.getElementById('detail-cast-row');
const detailEpisodesSection = document.getElementById('detail-episodes-section');
const detailSeasonSelect = document.getElementById('detail-season-select');
const detailEpisodesList = document.getElementById('detail-episodes-list');
const episodesScrollLeftBtn = document.getElementById('episodes-scroll-left');
const episodesScrollRightBtn = document.getElementById('episodes-scroll-right');
const detailOrigTitle = document.getElementById('detail-orig-title');
const detailStatus = document.getElementById('detail-status');
const detailReleaseDate = document.getElementById('detail-release-date');
const detailOrigLang = document.getElementById('detail-orig-lang');
const detailRecommendationsRow = document.getElementById('detail-recommendations-row');

// Nuvio Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const authModalCloseBtn = document.getElementById('auth-modal-close-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSubmitText = document.getElementById('auth-submit-text');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTogglePrompt = document.getElementById('auth-toggle-prompt');
const authErrorMsg = document.getElementById('auth-error');
const authSuccessMsg = document.getElementById('auth-success');

// --- Helper Functions ---
async function fetchTMDB(endpoint, params = {}) {
    try {
        const url = new URL(`${BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', TMDB_API_KEY);
        url.searchParams.append('language', 'en-US');
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Error fetching TMDB (${endpoint}):`, err);
        return null;
    }
}

// Fetch Streams for a given Movie or Series from Configured Addons
async function fetchStreamsForMedia(imdbId, type = 'movie') {
    if (!imdbId) return [];
    if (!state.streamingAddons || state.streamingAddons.length === 0) return [];

    const targetType = type === 'tv' ? 'series' : 'movie';
    const allStreams = [];

    for (const addon of state.streamingAddons) {
        if (addon.enabled === false) continue;
        try {
            let baseUrl = (addon.url || '').replace('/manifest.json', '').replace(/\/+$/, '');
            if (!baseUrl) continue;

            // Pass web client and disable aiostreams parameters cleanly via URL query params (avoids CORS preflight failures)
            const streamUrl = `${baseUrl}/stream/${encodeURIComponent(targetType)}/${encodeURIComponent(imdbId)}.json?client=web&platform=web&isWeb=true&source=web&disableAiostreams=true`;

            const res = await fetch(streamUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.streams)) {
                    allStreams.push(...data.streams);
                }
            }
        } catch (e) {
            console.warn('Stream resolution error for addon:', addon.name, e);
        }
    }

    return allStreams;
}

function getTitle(item) {
    return item.title || item.name || item.original_title || item.original_name || 'Untitled';
}

function getYear(item) {
    const date = item.release_date || item.first_air_date || item.releaseInfo || item.year;
    return date ? String(date).substring(0, 4) : '';
}

function getRating(item) {
    return item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A';
}

// --- Watch Progress & Continue Watching Logic (Synced with Nuvio Cloud) ---
function recordWatchProgress(item, progressPercent = 45) {
    const type = getMediaType(item);
    const index = state.continueWatching.findIndex(i => i.id === item.id && (i.mediaType === type || i.media_type === type));
    
    // If 97% or more has been seen, remove it from Continue Watching
    if (progressPercent >= 97) {
        if (index > -1) {
            state.continueWatching.splice(index, 1);
            localStorage.setItem('aeeo_continue_watching', JSON.stringify(state.continueWatching));
            if (state.currentView === 'home') {
                renderHomeView();
            }
        }
        return;
    }

    const record = {
        id: item.id,
        imdb_id: item.imdb_id || item.external_ids?.imdb_id,
        title: getTitle(item),
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        release_date: item.release_date || item.first_air_date,
        first_air_date: item.first_air_date,
        mediaType: type,
        media_type: type,
        progress: Math.min(Math.max(progressPercent, 5), 96),
        lastWatched: Date.now()
    };

    if (index > -1) {
        state.continueWatching.splice(index, 1);
    }
    state.continueWatching.unshift(record);

    // Keep top 20 continue watching items
    if (state.continueWatching.length > 20) {
        state.continueWatching = state.continueWatching.slice(0, 20);
    }

    localStorage.setItem('aeeo_continue_watching', JSON.stringify(state.continueWatching));
    
    // Live update Home view if active
    if (state.currentView === 'home') {
        renderHomeView();
    }

    // Sync with Nuvio Cloud if logged in
    if (state.nuvioSession && state.nuvioSession.access_token) {
        syncWatchProgressToNuvio(record);
    }
}

/**
 * Pull Continue Watching / Watch Progress directly from Nuvio Cloud Account
 */
async function pullNuvioWatchProgress() {
    if (!state.nuvioSession || !state.nuvioSession.access_token) return;

    const headers = {
        'apikey': NUVIO_ANON_KEY,
        'Authorization': `Bearer ${state.nuvioSession.access_token}`,
        'Content-Type': 'application/json'
    };

    let progressItems = [];

    // 1. Query Nuvio's primary watch_progress table
    try {
        const wpRes = await fetch(`${NUVIO_API_URL}/rest/v1/watch_progress?select=*&order=last_watched.desc&limit=25`, { headers });
        if (wpRes.ok) {
            const data = await wpRes.json();
            if (Array.isArray(data) && data.length > 0) {
                progressItems = data;
            }
        }
    } catch (e) {
        console.warn('Nuvio watch_progress query failed:', e);
    }

    // 2. Query watched_item_events table if watch_progress was empty
    if (progressItems.length === 0) {
        try {
            const eventsRes = await fetch(`${NUVIO_API_URL}/rest/v1/watched_item_events?select=*&order=watched_at.desc&limit=25`, { headers });
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    progressItems = data;
                }
            }
        } catch (e) {
            console.warn('Nuvio watched_item_events query failed:', e);
        }
    }

    // 3. Try sync_pull_watch_progress RPC
    if (progressItems.length === 0) {
        try {
            const rpcRes = await fetch(`${NUVIO_API_URL}/rest/v1/rpc/sync_pull_watch_progress`, {
                method: 'POST',
                headers,
                body: JSON.stringify({})
            });
            if (rpcRes.ok) {
                const data = await rpcRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    progressItems = data;
                }
            }
        } catch (e) {
            console.warn('Nuvio RPC sync_pull_watch_progress failed:', e);
        }
    }

    // Process and enrich each item with TMDB artwork and title
    if (progressItems.length > 0) {
        const enrichedPromises = progressItems.map(async (item) => {
            let rawId = String(item.content_id || item.item_id || item.id || '');
            if (rawId.startsWith('tmdb:')) rawId = rawId.replace('tmdb:', '');
            
            let isSeries = false;
            if (rawId.includes(':')) {
                isSeries = true;
                rawId = rawId.split(':')[0];
            }

            let mediaType = item.content_type || item.media_type;
            if (!mediaType) {
                mediaType = isSeries ? 'tv' : 'movie';
            } else {
                mediaType = (mediaType === 'series' || mediaType === 'tv') ? 'tv' : 'movie';
            }

            let progress = item.progress;
            if (!progress && item.duration && item.position) {
                progress = Math.round((item.position / item.duration) * 100);
            }
            if (!progress) progress = 50;

            let meta = item.meta || item.item_data;
            if (!meta && rawId) {
                if (rawId.startsWith('tt')) {
                    const findData = await fetchTMDB(`/find/${rawId}`, { external_source: 'imdb_id' });
                    if (findData) {
                        if (findData.tv_results && findData.tv_results.length > 0) {
                            meta = findData.tv_results[0];
                            mediaType = 'tv';
                        } else if (findData.movie_results && findData.movie_results.length > 0) {
                            meta = findData.movie_results[0];
                            mediaType = 'movie';
                        }
                    }
                } else if (!isNaN(Number(rawId))) {
                    meta = await fetchTMDB(`/${mediaType}/${rawId}`);
                }
            }

            const title = meta ? getTitle(meta) : (item.title || 'In Progress');
            const posterPath = meta?.poster_path || item.poster || '';
            const backdropPath = meta?.backdrop_path || item.backdrop || '';

            return {
                id: meta?.id || rawId,
                imdb_id: item.imdb_id || (rawId.startsWith('tt') ? rawId : null),
                title: title,
                poster_path: posterPath,
                backdrop_path: backdropPath,
                vote_average: meta?.vote_average || 8.0,
                release_date: meta ? getYear(meta) : '',
                first_air_date: meta?.first_air_date || '',
                mediaType: mediaType,
                media_type: mediaType,
                progress: Math.min(Math.max(progress, 5), 95),
                lastWatched: item.last_watched ? new Date(item.last_watched).getTime() : (item.watched_at ? new Date(item.watched_at).getTime() : Date.now())
            };
        });

        const cloudItems = (await Promise.all(enrichedPromises)).filter(i => (i.progress || 0) < 97);
        
        // Merge with local continue watching items
        const mergedMap = new Map();
        cloudItems.forEach(i => mergedMap.set(`${i.id}-${i.mediaType}`, i));
        state.continueWatching.forEach(i => {
            if ((i.progress || 0) < 97) {
                const key = `${i.id}-${i.mediaType}`;
                if (!mergedMap.has(key)) mergedMap.set(key, i);
            }
        });

        state.continueWatching = Array.from(mergedMap.values()).sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        localStorage.setItem('aeeo_continue_watching', JSON.stringify(state.continueWatching));
    }
}

/**
 * Sync watch progress up to Nuvio Cloud
 */
async function syncWatchProgressToNuvio(record) {
    if (!state.nuvioSession || !state.nuvioSession.access_token) return;

    const headers = {
        'apikey': NUVIO_ANON_KEY,
        'Authorization': `Bearer ${state.nuvioSession.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    };

    const contentId = String(record.imdb_id || record.id);
    const contentType = record.mediaType === 'tv' ? 'series' : 'movie';
    const position = Math.round((record.progress / 100) * 7200);

    // Push to Nuvio watch_progress table
    try {
        await fetch(`${NUVIO_API_URL}/rest/v1/watch_progress`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: state.nuvioSession.user.id,
                content_id: contentId,
                content_type: contentType,
                position: position,
                duration: 7200,
                last_watched: new Date().toISOString()
            })
        });
    } catch (e) {
        console.warn('Watch progress sync to Nuvio table finished.');
    }
}

function isInWatchlist(id, type) {
    return state.watchlist.some(i => i.id === id && i.mediaType === type);
}

function toggleWatchlist(item) {
    const type = getMediaType(item);
    const index = state.watchlist.findIndex(i => i.id === item.id && i.mediaType === type);
    
    if (index > -1) {
        state.watchlist.splice(index, 1);
    } else {
        state.watchlist.push({
            id: item.id,
            imdb_id: item.imdb_id,
            title: getTitle(item),
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.release_date || item.first_air_date,
            mediaType: type
        });
    }

    localStorage.setItem('aeeo_watchlist', JSON.stringify(state.watchlist));
    updateWatchlistButtons();

    if (state.currentView === 'watchlist') {
        renderWatchlistView();
    }
}

function updateWatchlistButtons() {
    if (state.featuredItem) {
        const isAdded = isInWatchlist(state.featuredItem.id, getMediaType(state.featuredItem));
        heroWatchlistBtn.innerHTML = isAdded
            ? '<i class="fi fi-tr-check"></i> <span>Added</span>'
            : '<i class="fi fi-tr-plus"></i> <span>Watchlist</span>';
    }

    if (state.activeModalItem && detailWatchlistBtn) {
        const isAdded = isInWatchlist(state.activeModalItem.id, getMediaType(state.activeModalItem));
        detailWatchlistBtn.innerHTML = isAdded
            ? '<i class="fi fi-tr-check"></i> <span>In Watchlist</span>'
            : '<i class="fi fi-tr-plus"></i> <span>Watchlist</span>';
    }
}

// --- Render Media Card ---
function createMediaCard(item, badgeText = null, progressPercent = null) {
    const card = document.createElement('div');
    card.className = 'media-card';
    const title = getTitle(item);
    const year = getYear(item);
    const rating = getRating(item);
    const mediaType = getMediaType(item);

    let posterUrl = PLACEHOLDER_POSTER;
    if (item.poster_path) {
        posterUrl = item.poster_path.startsWith('http')
            ? item.poster_path
            : `${IMG_POSTER}${item.poster_path}`;
    }

    const progress = progressPercent || item.progress || null;
    const progressHtml = progress ? `
        <div class="card-progress-wrap">
            <div class="card-progress-fill" style="width: ${progress}%;"></div>
        </div>
    ` : '';

    card.innerHTML = `
        <div class="card-poster-wrap">
            <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.src='${PLACEHOLDER_POSTER}'">
            <div class="card-rating-badge">
                <i class="fi fi-tr-star"></i> ${rating}
            </div>
            <div class="card-play-overlay">
                <div class="card-play-icon"><i class="fi fi-tr-play"></i></div>
            </div>
            ${progressHtml}
        </div>
        <div class="card-info">
            <h4 class="card-title" title="${title}">${title}</h4>
            <div class="card-meta">
                <span>${year}</span>
                <span>${badgeText || (mediaType === 'tv' ? 'SERIES' : 'MOVIE')}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openModal(item.id, mediaType, item.imdb_id));
    return card;
}

// --- Render Media Row Section ---
function createMediaSection(title, items, badgeText = null, isContinueWatching = false) {
    if (!items || items.length === 0) return null;

    const section = document.createElement('section');
    section.className = 'media-section';

    const header = document.createElement('div');
    header.className = 'media-section-header';
    header.innerHTML = `<h3 class="media-section-title">${title}</h3>`;

    const rowWrap = document.createElement('div');
    rowWrap.className = 'media-row-wrap';

    const row = document.createElement('div');
    row.className = 'media-row';

    items.forEach(item => {
        if (item.poster_path || item.backdrop_path) {
            row.appendChild(createMediaCard(item, badgeText, isContinueWatching ? item.progress : null));
        }
    });

    rowWrap.appendChild(row);
    section.appendChild(header);
    section.appendChild(rowWrap);
    return section;
}

// --- Hero Banner Update ---
function updateHeroBanner(item, customBadge = 'Featured') {
    if (!item) return;
    state.featuredItem = item;

    const title = getTitle(item);
    const year = getYear(item);
    const rating = getRating(item);
    const type = getMediaType(item).toUpperCase();
    
    let backdropUrl = '';
    if (item.backdrop_path) {
        backdropUrl = item.backdrop_path.startsWith('http')
            ? item.backdrop_path
            : `${IMG_ORIGINAL}${item.backdrop_path}`;
    }

    heroBadge.textContent = customBadge;
    heroTitle.textContent = title;
    heroRating.innerHTML = `<i class="fi fi-tr-star"></i> ${rating}`;
    heroYear.textContent = year;
    heroType.textContent = type;
    heroOverview.textContent = item.overview || 'Experience high-definition streaming entertainment.';
    
    if (backdropUrl) {
        heroBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
    }

    updateWatchlistButtons();
}

/**
 * Helper to check if an item is completed (>= 97% watched)
 */
function isItemCompleted(item) {
    if (!item) return true;
    const progress = Number(item.progress);
    if (!isNaN(progress) && progress >= 97) return true;
    if (item.duration && item.position) {
        const pct = (Number(item.position) / Number(item.duration)) * 100;
        if (!isNaN(pct) && pct >= 97) return true;
    }
    return false;
}

/**
 * Deduplicate items so that each movie / show appears only once across the entire view
 */
function filterUniqueMedia(items, seenSet, isContinueWatching = false) {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item => {
        if (!item) return false;
        if (isContinueWatching && isItemCompleted(item)) return false;
        
        const id = item.id || item.imdb_id;
        const title = (item.title || item.name || '').toLowerCase().trim();
        const mediaType = getMediaType(item);
        
        const primaryKey = `${id}-${mediaType}`;
        if (id && seenSet.has(primaryKey)) return false;
        if (item.imdb_id && seenSet.has(item.imdb_id)) return false;
        if (title && seenSet.has(`title:${title}`)) return false;

        // Register in seenSet
        if (id) seenSet.add(primaryKey);
        if (item.imdb_id) seenSet.add(item.imdb_id);
        if (title) seenSet.add(`title:${title}`);

        return true;
    });
}

// --- Views & Navigation ---
async function renderHomeView() {
    heroBanner.style.display = 'flex';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 2rem;"><p>Curating your personalized stream...</p></div>';

    // 1. Sync Continue Watching from Nuvio Cloud (Non-blocking)
    if (state.nuvioSession && state.nuvioSession.access_token) {
        try {
            await pullNuvioWatchProgress();
        } catch (e) {
            console.warn('Nuvio watch progress sync skipped:', e);
        }
    }

    // Filter out any items >= 97% from Continue Watching
    state.continueWatching = (state.continueWatching || []).filter(item => !isItemCompleted(item));
    localStorage.setItem('aeeo_continue_watching', JSON.stringify(state.continueWatching));

    const seenSet = new Set();

    // 2. Build personalized recommendations if user has Continue Watching items
    let becauseYouWatchedSection = null;
    let moreLikeSecondSection = null;

    if (state.continueWatching && state.continueWatching.length > 0) {
        const firstItem = state.continueWatching[0];
        const firstType = firstItem.mediaType === 'tv' ? 'tv' : 'movie';
        
        if (!isNaN(Number(firstItem.id))) {
            const [recData, similarData] = await Promise.all([
                fetchTMDB(`/${firstType}/${firstItem.id}/recommendations`),
                fetchTMDB(`/${firstType}/${firstItem.id}/similar`)
            ]);
            const results = (recData && recData.results && recData.results.length > 0) 
                ? recData.results 
                : (similarData?.results || []);
            
            if (results.length > 0) {
                becauseYouWatchedSection = {
                    title: `Because You Watched ${firstItem.title}`,
                    items: results
                };
            }
        }

        if (state.continueWatching.length > 1) {
            const secondItem = state.continueWatching[1];
            const secondType = secondItem.mediaType === 'tv' ? 'tv' : 'movie';
            if (!isNaN(Number(secondItem.id))) {
                const rec2Data = await fetchTMDB(`/${secondType}/${secondItem.id}/recommendations`);
                if (rec2Data && rec2Data.results && rec2Data.results.length > 0) {
                    moreLikeSecondSection = {
                        title: `More Like ${secondItem.title}`,
                        items: rec2Data.results
                    };
                }
            }
        }
    }

    // Fetch baseline curated streaming collections
    const [trending, popularMovies, topRatedMovies, popularTV, actionTrending] = await Promise.all([
        fetchTMDB('/trending/all/day'),
        fetchTMDB('/movie/popular'),
        fetchTMDB('/movie/top_rated'),
        fetchTMDB('/tv/popular'),
        fetchTMDB('/discover/movie', { sort_by: 'popularity.desc', 'vote_count.gte': '250' })
    ]);

    sectionsContainer.innerHTML = '';

    // 1. Featured Hero Banner
    if (trending && trending.results && trending.results.length > 0) {
        const heroItem = trending.results.find(i => i.backdrop_path) || trending.results[0];
        updateHeroBanner(heroItem, 'Featured');
        seenSet.add(`${heroItem.id}-${getMediaType(heroItem)}`);
        if (heroItem.title) seenSet.add(`title:${heroItem.title.toLowerCase().trim()}`);
    }

    // 2. Continue Watching (Unique & uncompleted items < 97%)
    if (state.continueWatching && state.continueWatching.length > 0) {
        const uniqueCW = filterUniqueMedia(state.continueWatching, seenSet, true);
        if (uniqueCW.length > 0) {
            const cwSection = createMediaSection('Continue Watching', uniqueCW, null, true);
            if (cwSection) sectionsContainer.appendChild(cwSection);
        }
    }

    // 3. Personalized Recommendation: "Because You Watched {Title}"
    if (becauseYouWatchedSection && becauseYouWatchedSection.items.length > 0) {
        const uniqueRec1 = filterUniqueMedia(becauseYouWatchedSection.items, seenSet);
        if (uniqueRec1.length > 0) {
            const recSection = createMediaSection(becauseYouWatchedSection.title, uniqueRec1);
            if (recSection) sectionsContainer.appendChild(recSection);
        }
    }

    // 4. Personalized Recommendation: "More Like {2nd Title}"
    if (moreLikeSecondSection && moreLikeSecondSection.items.length > 0) {
        const uniqueRec2 = filterUniqueMedia(moreLikeSecondSection.items, seenSet);
        if (uniqueRec2.length > 0) {
            const moreSection = createMediaSection(moreLikeSecondSection.title, uniqueRec2);
            if (moreSection) sectionsContainer.appendChild(moreSection);
        }
    }

    // 5. Trending Today
    if (trending && trending.results) {
        const uniqueTrending = filterUniqueMedia(trending.results, seenSet);
        if (uniqueTrending.length > 0) {
            sectionsContainer.appendChild(createMediaSection('Trending Today', uniqueTrending));
        }
    }

    // 6. Top Picks for You (Action & Blockbusters)
    if (actionTrending && actionTrending.results) {
        const uniqueAction = filterUniqueMedia(actionTrending.results, seenSet);
        if (uniqueAction.length > 0) {
            sectionsContainer.appendChild(createMediaSection('Top Picks for You', uniqueAction));
        }
    }

    // 7. Popular TV Series
    if (popularTV && popularTV.results) {
        const uniqueTV = filterUniqueMedia(popularTV.results, seenSet);
        if (uniqueTV.length > 0) {
            sectionsContainer.appendChild(createMediaSection('Popular TV Series', uniqueTV));
        }
    }

    // 8. Critically Acclaimed Movies
    if (topRatedMovies && topRatedMovies.results) {
        const uniqueTopRated = filterUniqueMedia(topRatedMovies.results, seenSet);
        if (uniqueTopRated.length > 0) {
            sectionsContainer.appendChild(createMediaSection('Critically Acclaimed Movies', uniqueTopRated));
        }
    }

    // 9. Popular Blockbusters
    if (popularMovies && popularMovies.results) {
        const uniquePopular = filterUniqueMedia(popularMovies.results, seenSet);
        if (uniquePopular.length > 0) {
            sectionsContainer.appendChild(createMediaSection('Popular Blockbusters', uniquePopular));
        }
    }
}

async function renderMoviesView() {
    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 2rem;"><p>Loading movies...</p></div>';

    const seenSet = new Set();
    const [popular, topRated, action, horror, scifi] = await Promise.all([
        fetchTMDB('/movie/popular'),
        fetchTMDB('/movie/top_rated'),
        fetchTMDB('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
        fetchTMDB('/discover/movie', { with_genres: '27', sort_by: 'popularity.desc' }),
        fetchTMDB('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc' })
    ]);

    sectionsContainer.innerHTML = '';
    if (popular && popular.results) {
        const u = filterUniqueMedia(popular.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Popular Movies', u));
    }
    if (topRated && topRated.results) {
        const u = filterUniqueMedia(topRated.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Top Rated Movies', u));
    }
    if (action && action.results) {
        const u = filterUniqueMedia(action.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Action Blockbusters', u));
    }
    if (scifi && scifi.results) {
        const u = filterUniqueMedia(scifi.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Sci-Fi & Fantasy', u));
    }
    if (horror && horror.results) {
        const u = filterUniqueMedia(horror.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Horror & Thrillers', u));
    }
}

async function renderTVView() {
    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 2rem;"><p>Loading TV shows...</p></div>';

    const seenSet = new Set();
    const [popular, topRated, drama, comedy] = await Promise.all([
        fetchTMDB('/tv/popular'),
        fetchTMDB('/tv/top_rated'),
        fetchTMDB('/discover/tv', { with_genres: '18', sort_by: 'popularity.desc' }),
        fetchTMDB('/discover/tv', { with_genres: '35', sort_by: 'popularity.desc' })
    ]);

    sectionsContainer.innerHTML = '';
    if (popular && popular.results) {
        const u = filterUniqueMedia(popular.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Popular TV Series', u));
    }
    if (topRated && topRated.results) {
        const u = filterUniqueMedia(topRated.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Critically Acclaimed TV', u));
    }
    if (drama && drama.results) {
        const u = filterUniqueMedia(drama.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Gripping Dramas', u));
    }
    if (comedy && comedy.results) {
        const u = filterUniqueMedia(comedy.results, seenSet);
        if (u.length > 0) sectionsContainer.appendChild(createMediaSection('Comedy Series', u));
    }
}

function renderWatchlistView() {
    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'media-section-header';
    header.innerHTML = `<h2 class="media-section-title">My Watchlist (${state.watchlist.length})</h2>`;
    sectionsContainer.appendChild(header);

    if (state.watchlist.length === 0) {
        sectionsContainer.innerHTML += `
            <div class="empty-state">
                <i class="fi fi-tr-bookmark"></i>
                <h3>Your Watchlist is Empty</h3>
                <p>Save movies and shows you want to watch later by clicking the Watchlist button.</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'media-grid';
    state.watchlist.forEach(item => {
        grid.appendChild(createMediaCard(item));
    });
    sectionsContainer.appendChild(grid);
}

function renderSearchView() {
    heroBanner.style.display = 'none';
    if (!searchInput.value.trim()) {
        sectionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fi fi-tr-search"></i>
                <h3>Search Aeeo</h3>
                <p>Type above to discover movies, TV shows, actors, and directors.</p>
            </div>
        `;
    } else {
        performSearch(searchInput.value);
    }
    setTimeout(() => searchInput.focus(), 50);
}

function renderProfileView() {
    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '';

    if (!state.nuvioSession || !state.nuvioSession.user) {
        openAuthModal('login');
        sectionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fi fi-tr-user"></i>
                <h3>Sign in with Nuvio</h3>
                <p>Log in to access your synchronized cloud profile, continue watching, and streaming addons.</p>
                <button class="btn btn-primary" style="margin-top: 1.25rem;" onclick="openAuthModal('login')">
                    <i class="fi fi-tr-lock"></i> Open Nuvio Login
                </button>
            </div>
        `;
        return;
    }

    const user = state.nuvioSession.user;
    const email = user.email || 'Nuvio User';
    const initial = email.charAt(0).toUpperCase();

    sectionsContainer.innerHTML = `
        <div class="profile-dashboard">
            <div class="profile-avatar">${initial}</div>
            <h2 class="profile-email">${email}</h2>
            <span class="profile-badge"><i class="fi fi-tr-user-check"></i> Connected to Nuvio Account</span>

            <div class="profile-details-grid">
                <div class="profile-detail-card">
                    <div class="profile-detail-label">Account Provider</div>
                    <div class="profile-detail-val">Nuvio Cloud API</div>
                </div>
                <div class="profile-detail-card">
                    <div class="profile-detail-label">Continue Watching</div>
                    <div class="profile-detail-val" style="color: #2ed573;">${state.continueWatching.length} In Progress</div>
                </div>
                <div class="profile-detail-card">
                    <div class="profile-detail-label">User ID</div>
                    <div class="profile-detail-val" style="font-size: 0.8rem; word-break: break-all;">${user.id || 'N/A'}</div>
                </div>
                <div class="profile-detail-card">
                    <div class="profile-detail-label">Streaming Addons</div>
                    <div class="profile-detail-val" style="color: #2ed573;">${state.streamingAddons.length} Active</div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-secondary" id="profile-logout-btn">
                    <i class="fi fi-tr-sign-out-alt"></i> Log Out
                </button>
            </div>
        </div>
    `;

    document.getElementById('profile-logout-btn').addEventListener('click', handleNuvioLogout);
}

// --- Settings & Streaming Addons Dashboard ---
function renderSettingsView() {
    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = `
        <div class="settings-dashboard">
            <!-- Nuvio Account Section -->
            <div class="settings-card">
                <div class="settings-card-header">
                    <i class="fi fi-tr-user"></i>
                    <h3>Nuvio Account</h3>
                </div>
                
                <div class="setting-row">
                    <div class="setting-info">
                        <h4>Account Status</h4>
                        <p>${state.nuvioSession ? `Logged in as <strong>${state.nuvioSession.user.email}</strong>` : 'Log in with Nuvio to sync your watch history across all devices.'}</p>
                    </div>
                    <button class="btn btn-secondary" style="font-size: 0.85rem;" id="btn-settings-login">
                        ${state.nuvioSession ? '<i class="fi fi-tr-user"></i> Profile' : '<i class="fi fi-tr-lock"></i> Log In'}
                    </button>
                </div>
            </div>

            <!-- Streaming Addons Section -->
            <div class="settings-card">
                <div class="settings-card-header">
                    <i class="fi fi-tr-puzzle-piece"></i>
                    <h3>Streaming Addons</h3>
                </div>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">
                    Configured streaming addons provide live playback streams (4K HDR, 1080p, Debrid & Torrents).
                </p>

                <div class="addons-list" id="addons-list">
                    ${state.streamingAddons.length === 0 ? `
                        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
                            <i class="fi fi-tr-play" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
                            <p style="font-size: 0.95rem; margin-bottom: 0.25rem;">No streaming addons installed.</p>
                            <span style="font-size: 0.78rem;">Paste a manifest URL below to add your streaming scraper.</span>
                        </div>
                    ` : state.streamingAddons.map((addon, idx) => `
                        <div class="addon-item">
                            <div class="addon-left">
                                <div class="addon-icon"><i class="fi fi-tr-play"></i></div>
                                <div class="addon-meta">
                                    <h5>${addon.name} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${addon.version ? 'v' + addon.version : ''}</span></h5>
                                    <span style="font-size: 0.72rem; word-break: break-all;">${addon.url || 'Active Streaming Provider'}</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="addon-badge streaming">Active</span>
                                <button class="btn-icon btn-remove-addon" data-index="${idx}" title="Remove Addon" style="width: 28px; height: 28px; font-size: 0.8rem; background: rgba(255,255,255,0.06); cursor: pointer;">
                                    <i class="fi fi-tr-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Add Custom Streaming Addon URL -->
                <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
                    <input type="text" id="custom-addon-input" class="search-input" style="flex: 1; padding: 0.7rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: #fff; font-family: var(--font-family);" placeholder="Enter Streaming Addon Manifest URL">
                    <button class="btn btn-primary" id="btn-install-addon">
                        <i class="fi fi-tr-plus"></i> Add Scraper
                    </button>
                </div>
            </div>
        </div>
    `;

    // Login/Profile Button Listener
    document.getElementById('btn-settings-login').addEventListener('click', () => {
        switchView('profile');
    });

    // Install Custom Addon Listener
    document.getElementById('btn-install-addon').addEventListener('click', async () => {
        const input = document.getElementById('custom-addon-input');
        const url = input.value.trim();
        if (!url) return;

        try {
            let manifestUrl = url;
            if (!manifestUrl.endsWith('/manifest.json')) {
                manifestUrl = manifestUrl.replace(/\/+$/, '') + '/manifest.json';
            }
            const res = await fetch(manifestUrl);
            if (!res.ok) throw new Error('Manifest not found');
            const manifest = await res.json();

            const newAddon = {
                id: manifest.id || 'addon-' + Date.now(),
                name: manifest.name || 'Streaming Addon',
                url: manifestUrl,
                type: 'Streaming Provider',
                version: manifest.version || '1.0.0',
                enabled: true
            };

            state.streamingAddons.push(newAddon);
            localStorage.setItem('aeeo_streaming_addons', JSON.stringify(state.streamingAddons));

            input.value = '';
            renderSettingsView();
            alert(`Installed streaming addon: ${newAddon.name}!`);
        } catch (e) {
            alert('Failed to install streaming addon. Please check the manifest URL.');
        }
    });

    // Remove Addon Listeners
    document.querySelectorAll('.btn-remove-addon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = Number(btn.getAttribute('data-index'));
            if (!isNaN(index) && index >= 0 && index < state.streamingAddons.length) {
                const removed = state.streamingAddons.splice(index, 1);
                localStorage.setItem('aeeo_streaming_addons', JSON.stringify(state.streamingAddons));
                renderSettingsView();
            }
        });
    });
}

function switchView(viewName) {
    if (detailScreen && detailScreen.style.display !== 'none') {
        closeDetailScreen();
    }

    state.currentView = viewName;
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (viewName === 'search') {
        document.body.classList.add('search-active');
    } else {
        document.body.classList.remove('search-active');
    }

    if (viewName === 'home') {
        contentContainer.classList.remove('no-hero');
    } else {
        contentContainer.classList.add('no-hero');
    }

    switch (viewName) {
        case 'home':
            renderHomeView();
            break;
        case 'search':
            renderSearchView();
            break;
        case 'movies':
            renderMoviesView();
            break;
        case 'tv':
            renderTVView();
            break;
        case 'watchlist':
            renderWatchlistView();
            break;
        case 'profile':
            renderProfileView();
            break;
        case 'settings':
            renderSettingsView();
            break;
    }
}

// --- Cast Filmography Explorer ---
async function openPersonFilmography(personId, personName) {
    closeDetailScreen();
    switchView('search');
    searchInput.value = personName;
    searchClearBtn.style.display = 'flex';

    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 3rem;"><p>Loading filmography...</p></div>';

    try {
        const [person, credits] = await Promise.all([
            fetchTMDB(`/person/${personId}`),
            fetchTMDB(`/person/${personId}/combined_credits`)
        ]);

        const knownFor = (credits && credits.cast) ? credits.cast : [];
        const seen = new Set();
        const validTitles = [];
        knownFor
            .filter(item => (item.poster_path || item.backdrop_path) && (item.media_type === 'movie' || item.media_type === 'tv'))
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
            .forEach(item => {
                const key = `${item.media_type || 'movie'}-${item.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    validTitles.push(item);
                }
            });

        const bio = person?.biography ? person.biography.slice(0, 260) + (person.biography.length > 260 ? '...' : '') : '';
        const profileImg = person?.profile_path ? `${IMG_POSTER}${person.profile_path}` : PLACEHOLDER_POSTER;
        const dept = person?.known_for_department || 'Acting';

        sectionsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 2.5rem; background: rgba(255,255,255,0.03); padding: 1.75rem 2rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.08);">
                <img src="${profileImg}" alt="${personName}" style="width: 86px; height: 86px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); box-shadow: 0 4px 18px var(--accent-glow); flex-shrink: 0;" onerror="this.src='${PLACEHOLDER_POSTER}'">
                <div>
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: #ffffff; margin-bottom: 0.3rem;">${personName}</h2>
                    <div style="font-size: 0.88rem; color: var(--accent); font-weight: 600; margin-bottom: 0.45rem;">${dept} • ${validTitles.length} Titles</div>
                    ${bio ? `<p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; max-width: 800px; margin: 0;">${bio}</p>` : ''}
                </div>
            </div>
            <div class="media-section-header">
                <h3 class="media-section-title">Filmography</h3>
            </div>
        `;

        if (validTitles.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'media-grid';
            validTitles.forEach(item => grid.appendChild(createMediaCard(item)));
            sectionsContainer.appendChild(grid);
        } else {
            sectionsContainer.innerHTML += '<p style="color: var(--text-muted); padding: 1rem 0;">No filmography records found.</p>';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Error fetching filmography:', err);
        performSearch(personName);
    }
}

// --- Comprehensive Multi-Faceted Search (Actor, Title, Genre) ---
const TMDB_GENRE_MAP = {
    'action': { movie: 28, tv: 10759, name: 'Action' },
    'adventure': { movie: 12, tv: 10759, name: 'Adventure' },
    'animation': { movie: 16, tv: 16, name: 'Animation' },
    'anime': { movie: 16, tv: 16, name: 'Anime' },
    'comedy': { movie: 35, tv: 35, name: 'Comedy' },
    'comedies': { movie: 35, tv: 35, name: 'Comedy' },
    'crime': { movie: 80, tv: 80, name: 'Crime' },
    'documentary': { movie: 99, tv: 99, name: 'Documentary' },
    'documentaries': { movie: 99, tv: 99, name: 'Documentary' },
    'drama': { movie: 18, tv: 18, name: 'Drama' },
    'dramas': { movie: 18, tv: 18, name: 'Drama' },
    'family': { movie: 10751, tv: 10751, name: 'Family' },
    'fantasy': { movie: 14, tv: 10765, name: 'Fantasy' },
    'history': { movie: 36, tv: null, name: 'History' },
    'historical': { movie: 36, tv: null, name: 'History' },
    'horror': { movie: 27, tv: null, name: 'Horror' },
    'music': { movie: 10402, tv: null, name: 'Music' },
    'musical': { movie: 10402, tv: null, name: 'Musical' },
    'mystery': { movie: 9648, tv: 9648, name: 'Mystery' },
    'romance': { movie: 10749, tv: null, name: 'Romance' },
    'romantic': { movie: 10749, tv: null, name: 'Romance' },
    'rom-com': { movie: 10749, tv: null, name: 'Romantic Comedy' },
    'sci-fi': { movie: 878, tv: 10765, name: 'Sci-Fi' },
    'scifi': { movie: 878, tv: 10765, name: 'Sci-Fi' },
    'science fiction': { movie: 878, tv: 10765, name: 'Science Fiction' },
    'thriller': { movie: 53, tv: null, name: 'Thriller' },
    'thrillers': { movie: 53, tv: null, name: 'Thriller' },
    'war': { movie: 10752, tv: 10768, name: 'War' },
    'western': { movie: 37, tv: 37, name: 'Western' }
};

let searchDebounceTimeout = null;

async function performSearch(query) {
    const rawQuery = query.trim();
    if (!rawQuery) {
        if (state.currentView === 'search') renderSearchView();
        return;
    }

    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 2.5rem;"><p>Searching movies, shows, actors, and genres...</p></div>';

    const lower = rawQuery.toLowerCase();

    // 1. Detect Genre Match
    let matchedGenre = null;
    for (const [key, val] of Object.entries(TMDB_GENRE_MAP)) {
        if (lower === key || lower === `${key}s` || lower === `${key} movies` || lower === `${key} shows` || lower === `${key} series`) {
            matchedGenre = val;
            break;
        }
    }

    // 2. Parallel Queries: Multi-Search, Person Search, and Genre Discover (if genre matched)
    const promises = [
        fetchTMDB('/search/multi', { query: encodeURIComponent(rawQuery) }),
        fetchTMDB('/search/person', { query: encodeURIComponent(rawQuery) })
    ];

    if (matchedGenre) {
        promises.push(fetchTMDB('/discover/movie', { with_genres: matchedGenre.movie, sort_by: 'popularity.desc' }));
        if (matchedGenre.tv) {
            promises.push(fetchTMDB('/discover/tv', { with_genres: matchedGenre.tv, sort_by: 'popularity.desc' }));
        }
    }

    const [multiRes, personRes, genreMovies, genreTV] = await Promise.all(promises);

    // 3. Process People / Actors
    const peopleMap = new Map();
    if (personRes && personRes.results) {
        personRes.results.forEach(p => {
            if (p.profile_path || (p.known_for && p.known_for.length > 0)) {
                peopleMap.set(p.id, p);
            }
        });
    }
    if (multiRes && multiRes.results) {
        multiRes.results.forEach(item => {
            if (item.media_type === 'person') {
                peopleMap.set(item.id, item);
            }
        });
    }
    const peopleList = Array.from(peopleMap.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    // 4. Process Titles (Movies & TV Series)
    const titlesMap = new Map();

    // Add direct title search results
    if (multiRes && multiRes.results) {
        multiRes.results.forEach(item => {
            if ((item.media_type === 'movie' || item.media_type === 'tv') && (item.poster_path || item.backdrop_path)) {
                const key = `${item.media_type}-${item.id}`;
                titlesMap.set(key, item);
            }
        });
    }

    // Add Genre Discover results if matched
    if (genreMovies && genreMovies.results) {
        genreMovies.results.forEach(item => {
            if (item.poster_path || item.backdrop_path) {
                item.media_type = 'movie';
                titlesMap.set(`movie-${item.id}`, item);
            }
        });
    }
    if (genreTV && genreTV.results) {
        genreTV.results.forEach(item => {
            if (item.poster_path || item.backdrop_path) {
                item.media_type = 'tv';
                titlesMap.set(`tv-${item.id}`, item);
            }
        });
    }

    // Add Actor's Known-For titles if people matched
    peopleList.forEach(p => {
        if (Array.isArray(p.known_for)) {
            p.known_for.forEach(item => {
                if ((item.media_type === 'movie' || item.media_type === 'tv') && (item.poster_path || item.backdrop_path)) {
                    const key = `${item.media_type}-${item.id}`;
                    if (!titlesMap.has(key)) titlesMap.set(key, item);
                }
            });
        }
    });

    // If top person is a prominent actor and titles count is low, pull their filmography
    if (peopleList.length > 0 && titlesMap.size < 4) {
        const topPerson = peopleList[0];
        try {
            const filmography = await fetchTMDB(`/person/${topPerson.id}/combined_credits`);
            if (filmography && filmography.cast) {
                filmography.cast
                    .filter(c => (c.poster_path || c.backdrop_path) && (c.media_type === 'movie' || c.media_type === 'tv'))
                    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                    .slice(0, 16)
                    .forEach(item => {
                        const key = `${item.media_type || 'movie'}-${item.id}`;
                        if (!titlesMap.has(key)) titlesMap.set(key, item);
                    });
            }
        } catch (e) {}
    }

    const titlesList = Array.from(titlesMap.values());

    // 5. Check empty state
    if (peopleList.length === 0 && titlesList.length === 0) {
        sectionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fi fi-tr-search"></i>
                <h3>No results found for "${rawQuery}"</h3>
                <p>Try searching by actor name (e.g. Pedro Pascal), movie or series title, or genre (e.g. Action, Comedy, Sci-Fi).</p>
            </div>
        `;
        return;
    }

    // 6. Render Results
    sectionsContainer.innerHTML = '';

    // Render Actors & People Row (if any actors matched)
    if (peopleList.length > 0) {
        const personSection = document.createElement('div');
        personSection.innerHTML = `
            <div class="media-section-header">
                <h2 class="media-section-title">Actors & People</h2>
            </div>
            <div class="person-row">
                ${peopleList.slice(0, 12).map(p => {
                    const avatar = p.profile_path ? `${IMG_POSTER}${p.profile_path}` : PLACEHOLDER_POSTER;
                    const dept = p.known_for_department || 'Acting';
                    return `
                        <div class="person-card" data-person-id="${p.id}" data-person-name="${p.name}" title="View ${p.name}'s filmography">
                            <img class="person-avatar" src="${avatar}" alt="${p.name}" loading="lazy" onerror="this.src='${PLACEHOLDER_POSTER}'">
                            <span class="person-name">${p.name}</span>
                            <span class="person-dept">${dept}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        personSection.querySelectorAll('.person-card').forEach(card => {
            card.addEventListener('click', () => {
                const personId = card.getAttribute('data-person-id');
                const personName = card.getAttribute('data-person-name');
                if (personId && personName) openPersonFilmography(personId, personName);
            });
        });

        sectionsContainer.appendChild(personSection);
    }

    // Render Titles Section
    if (titlesList.length > 0) {
        const titlesHeader = document.createElement('div');
        titlesHeader.className = 'media-section-header';
        const headerTitle = matchedGenre 
            ? `Genre: ${matchedGenre.name} (${titlesList.length} titles)`
            : (peopleList.length > 0 && titlesList.length > 0 
                ? `Movies & TV Shows (${titlesList.length})` 
                : `Search Results for "${rawQuery}" (${titlesList.length})`);

        titlesHeader.innerHTML = `<h2 class="media-section-title">${headerTitle}</h2>`;
        sectionsContainer.appendChild(titlesHeader);

        const grid = document.createElement('div');
        grid.className = 'media-grid';
        titlesList.forEach(item => {
            grid.appendChild(createMediaCard(item));
        });
        sectionsContainer.appendChild(grid);
    }
}

searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    searchClearBtn.style.display = val ? 'flex' : 'none';

    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        performSearch(val);
    }, 350);
});

searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    if (state.currentView === 'search') {
        renderSearchView();
    }
});

// --- Video & Trailer Resolution Helper ---
async function getBestTrailer(id, type, tmdbData) {
    let videos = tmdbData?.videos?.results;
    if (!Array.isArray(videos) || videos.length === 0) {
        try {
            const fallback = await fetchTMDB(`/${type}/${id}/videos`);
            videos = fallback?.results || [];
        } catch (e) {
            videos = [];
        }
    }
    if (!Array.isArray(videos) || videos.length === 0) return null;
    const yt = videos.filter(v => v.site === 'YouTube' && v.key);
    if (yt.length === 0) return null;

    // Prioritize official trailer > any trailer > official teaser > any teaser > clip > first available
    return yt.find(v => v.type === 'Trailer' && v.official)
        || yt.find(v => v.type === 'Trailer')
        || yt.find(v => v.type === 'Teaser' && v.official)
        || yt.find(v => v.type === 'Teaser')
        || yt.find(v => v.type === 'Clip')
        || yt[0];
}

function playTrailerVideo(video) {
    if (!video || !video.key) {
        alert('No trailer available for this title.');
        return;
    }
    const embedUrl = `https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`;
    detailTrailerIframe.src = embedUrl;
    detailPlayerSection.style.display = 'block';

    if (detailPlayerExternalLink) {
        detailPlayerExternalLink.href = `https://www.youtube.com/watch?v=${video.key}`;
        detailPlayerExternalLink.style.display = 'inline-flex';
    }

    detailPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (state.activeModalItem) {
        recordWatchProgress(state.activeModalItem, 15);
    }
}

function closeDetailScreen() {
    if (detailTrailerIframe) detailTrailerIframe.src = '';
    if (detailPlayerSection) detailPlayerSection.style.display = 'none';
    if (detailScreen) detailScreen.style.display = 'none';
    state.activeModalItem = null;
    state.activeTrailerVideo = null;
}

// --- TV Episodes Loader with Poster and Details ---
async function loadSeasonEpisodes(tvId, seasonNumber, showData) {
    if (!detailEpisodesList) return;
    detailEpisodesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; padding: 1.5rem 0;">Loading episodes...</p>';
    try {
        const seasonData = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
        if (!seasonData || !seasonData.episodes || seasonData.episodes.length === 0) {
            detailEpisodesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; padding: 1.5rem 0;">No episode information available for this season.</p>';
            return;
        }

        const showTitle = getTitle(showData);
        detailEpisodesList.innerHTML = seasonData.episodes.map(ep => {
            const stillUrl = ep.still_path 
                ? `${IMG_POSTER}${ep.still_path}` 
                : (showData.backdrop_path ? `${IMG_BACKDROP}${showData.backdrop_path}` : PLACEHOLDER_POSTER);
            const runtimeStr = ep.runtime ? `${ep.runtime} min` : '';
            const ratingStr = ep.vote_average ? ep.vote_average.toFixed(1) : '';
            const airDateStr = ep.air_date ? new Date(ep.air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            const epNum = ep.episode_number || 1;
            const epTitle = ep.name || `Episode ${epNum}`;
            const overview = ep.overview || 'No synopsis available for this episode.';

            return `
                <div class="episode-card" data-season="${seasonNumber}" data-episode="${epNum}">
                    <div class="episode-still-wrap">
                        <img class="episode-still" src="${stillUrl}" alt="${epTitle}" loading="lazy" onerror="this.src='${PLACEHOLDER_POSTER}'">
                        <div class="episode-play-overlay">
                            <div class="episode-play-icon"><i class="fi fi-tr-play"></i></div>
                        </div>
                        ${runtimeStr ? `<span class="episode-runtime">${runtimeStr}</span>` : ''}
                    </div>
                    <div class="episode-info">
                        <div class="episode-title-row">
                            <h4 class="episode-title">
                                <span class="episode-num">${epNum}.</span> ${epTitle}
                            </h4>
                            ${ratingStr ? `<span class="episode-rating"><i class="fi fi-tr-star"></i> ${ratingStr}</span>` : ''}
                        </div>
                        <div class="episode-meta">
                            ${airDateStr ? `<span>${airDateStr}</span>` : ''}
                            ${runtimeStr ? `<span>${runtimeStr}</span>` : ''}
                        </div>
                        <p class="episode-overview">${overview}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Wire episode card clicks
        detailEpisodesList.querySelectorAll('.episode-card').forEach(card => {
            card.addEventListener('click', () => {
                const sNum = card.getAttribute('data-season');
                const eNum = card.getAttribute('data-episode');
                const epObj = seasonData.episodes.find(e => e.episode_number === Number(eNum));
                const fullEpTitle = `${showTitle} S${sNum}E${eNum}: ${epObj ? epObj.name : `Episode ${eNum}`}`;
                
                // Record progress with episode information
                const progressItem = {
                    ...showData,
                    title: fullEpTitle,
                    name: fullEpTitle,
                    mediaType: 'tv',
                    media_type: 'tv',
                    season: Number(sNum),
                    episode: Number(eNum),
                    episode_title: epObj ? epObj.name : `Episode ${eNum}`,
                    still_path: epObj ? epObj.still_path : null
                };
                recordWatchProgress(progressItem, 10);

                if (state.activeTrailerVideo) {
                    playTrailerVideo(state.activeTrailerVideo);
                } else {
                    alert(`Selected: ${fullEpTitle}`);
                }
            });
        });
        detailEpisodesList.scrollLeft = 0;
    } catch (err) {
        console.error('Error fetching season episodes:', err);
        detailEpisodesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; padding: 1.5rem 0;">Unable to load episodes at this time.</p>';
    }
}

// --- Full Detail Screen & Media Inspection ---
async function openModal(id, type = 'movie', directImdbId = null, autoPlayTrailer = false) {
    let imdbId = directImdbId;
    let data = null;

    if (String(id).startsWith('tt')) {
        imdbId = id;
        const findData = await fetchTMDB(`/find/${id}`, { external_source: 'imdb_id' });
        if (findData) {
            const results = (type === 'tv' ? findData.tv_results : findData.movie_results) || findData.movie_results;
            if (results && results.length > 0) {
                data = await fetchTMDB(`/${type}/${results[0].id}`, { append_to_response: 'videos,credits,external_ids,recommendations,similar' });
            }
        }
    } else {
        data = await fetchTMDB(`/${type}/${id}`, { append_to_response: 'videos,credits,external_ids,recommendations,similar' });
        if (data?.external_ids?.imdb_id) {
            imdbId = data.external_ids.imdb_id;
        }
    }

    if (!data) {
        data = { id, title: 'Title', overview: 'Media details' };
    }

    data.media_type = type;
    data.imdb_id = imdbId;
    state.activeModalItem = data;

    const title = getTitle(data);
    const year = getYear(data);
    const rating = getRating(data);
    const runtime = data.runtime ? `${data.runtime} min` : (data.number_of_seasons ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}` : '');
    const backdropUrl = data.backdrop_path ? `${IMG_BACKDROP}${data.backdrop_path}` : (data.poster_path ? `${IMG_POSTER}${data.poster_path}` : '');
    const posterUrl = data.poster_path ? `${IMG_POSTER}${data.poster_path}` : PLACEHOLDER_POSTER;

    // Populate Hero Details
    detailBackdropBg.style.backgroundImage = backdropUrl ? `url("${backdropUrl}")` : 'none';
    detailPosterImg.src = posterUrl;
    detailTypeBadge.textContent = type === 'tv' ? 'SERIES' : 'MOVIE';
    detailTitle.textContent = title;
    detailTagline.textContent = data.tagline || '';
    detailRating.innerHTML = `<i class="fi fi-tr-star"></i> ${rating}`;
    detailYear.textContent = year;
    detailRuntime.textContent = runtime;
    detailOverview.textContent = data.overview || 'No synopsis available.';

    // Genres
    detailGenres.innerHTML = (data.genres || [])
        .map(g => `<span class="genre-tag">${g.name}</span>`)
        .join('');

    // Meta details card
    detailOrigTitle.textContent = data.original_title || data.original_name || title;
    detailStatus.textContent = data.status || 'Released';
    detailReleaseDate.textContent = data.release_date || data.first_air_date || year || 'N/A';
    detailOrigLang.textContent = (data.original_language || 'en').toUpperCase();

    // Cast Row (Clickable)
    if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
        detailCastRow.innerHTML = data.credits.cast.slice(0, 15).map(c => {
            const avatar = c.profile_path ? `${IMG_POSTER}${c.profile_path}` : PLACEHOLDER_POSTER;
            return `
                <div class="cast-card" data-person-id="${c.id}" data-person-name="${c.name}" title="View ${c.name}'s filmography">
                    <img class="cast-avatar" src="${avatar}" alt="${c.name}" loading="lazy" onerror="this.src='${PLACEHOLDER_POSTER}'">
                    <span class="cast-name">${c.name}</span>
                    <span class="cast-character">${c.character || ''}</span>
                </div>
            `;
        }).join('');

        detailCastRow.querySelectorAll('.cast-card').forEach(card => {
            card.addEventListener('click', () => {
                const personId = card.getAttribute('data-person-id');
                const personName = card.getAttribute('data-person-name');
                if (personId && personName) {
                    openPersonFilmography(personId, personName);
                }
            });
        });
    } else {
        detailCastRow.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No cast information available.</p>';
    }

    // TV Episodes Section
    if (type === 'tv' && data.seasons && data.seasons.length > 0) {
        detailEpisodesSection.style.display = 'block';
        
        // Filter regular seasons (season_number > 0), falling back to specials if needed
        const regularSeasons = data.seasons.filter(s => s.season_number > 0);
        const allSeasons = regularSeasons.length > 0 ? regularSeasons : data.seasons;
        
        // Populate Season Dropdown
        detailSeasonSelect.innerHTML = allSeasons.map(s => `
            <option value="${s.season_number}">${s.name} (${s.episode_count || 0} Episodes)</option>
        `).join('');

        const initialSeason = allSeasons[0].season_number;
        detailSeasonSelect.value = initialSeason;

        // Load initial season episodes with posters and details
        loadSeasonEpisodes(data.id, initialSeason, data);

        // Listen for season changes
        detailSeasonSelect.onchange = () => {
            loadSeasonEpisodes(data.id, Number(detailSeasonSelect.value), data);
        };
    } else {
        detailEpisodesSection.style.display = 'none';
        detailEpisodesList.innerHTML = '';
        detailSeasonSelect.innerHTML = '';
    }

    // More Like This / Recommendations
    const recs = (data.recommendations?.results?.length > 0 ? data.recommendations.results : data.similar?.results) || [];
    if (recs.length > 0) {
        detailRecommendationsRow.innerHTML = '';
        recs.slice(0, 12).forEach(item => {
            if (item.poster_path || item.backdrop_path) {
                detailRecommendationsRow.appendChild(createMediaCard(item));
            }
        });
    } else {
        detailRecommendationsRow.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No recommendations found.</p>';
    }

    // Resolve Trailer
    const trailerVideo = await getBestTrailer(data.id, type, data);
    state.activeTrailerVideo = trailerVideo;

    // Reset Player section
    detailTrailerIframe.src = '';
    detailPlayerSection.style.display = 'none';

    // Check if progress exists in continue watching
    const existingProgress = (state.continueWatching || []).find(item => {
        const itemType = getMediaType(item);
        const matchesId = (
            String(item.id) === String(data.id) ||
            (imdbId && (item.id === imdbId || item.imdb_id === imdbId)) ||
            (item.tmdb_id && String(item.tmdb_id) === String(data.id)) ||
            (data.id && String(item.id).startsWith(`${data.id}:`))
        );
        return matchesId && (itemType === type);
    });

    const hasProgress = existingProgress && (existingProgress.progress > 0) && !isItemCompleted(existingProgress);
    if (hasProgress) {
        detailPlayBtn.innerHTML = '<i class="fi fi-tr-play"></i> <span>Continue Watching</span>';
    } else {
        detailPlayBtn.innerHTML = '<i class="fi fi-tr-play"></i> <span>Play</span>';
    }

    // Play / Continue Watching Button Handler
    detailPlayBtn.onclick = () => {
        if (trailerVideo) {
            playTrailerVideo(trailerVideo);
        } else {
            alert(`Playback ready for: ${title}`);
        }
        const currentProgress = existingProgress ? Math.min(existingProgress.progress + 10, 95) : 15;
        recordWatchProgress(existingProgress || data, currentProgress);
        detailPlayBtn.innerHTML = '<i class="fi fi-tr-play"></i> <span>Continue Watching</span>';
    };

    detailTrailerBtn.onclick = () => {
        if (trailerVideo) {
            playTrailerVideo(trailerVideo);
        } else {
            alert('No trailer available for this title.');
        }
    };

    updateWatchlistButtons();

    // Show Detail Screen as fixed overlay aligned with sidebar
    detailScreen.style.display = 'block';
    detailScreen.scrollTop = 0;

    if (autoPlayTrailer && trailerVideo) {
        playTrailerVideo(trailerVideo);
    }
}

// Detail Screen Back and Player Close Listeners
if (detailBackBtn) detailBackBtn.onclick = closeDetailScreen;
if (detailPlayerCloseBtn) {
    detailPlayerCloseBtn.onclick = () => {
        detailTrailerIframe.src = '';
        detailPlayerSection.style.display = 'none';
    };
}

// Episodes Horizontal Scroll Controls & Wheel Handler
if (episodesScrollLeftBtn) {
    episodesScrollLeftBtn.onclick = () => {
        if (detailEpisodesList) detailEpisodesList.scrollBy({ left: -320, behavior: 'smooth' });
    };
}
if (episodesScrollRightBtn) {
    episodesScrollRightBtn.onclick = () => {
        if (detailEpisodesList) detailEpisodesList.scrollBy({ left: 320, behavior: 'smooth' });
    };
}

if (detailEpisodesList) {
    detailEpisodesList.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0 && detailEpisodesList.scrollWidth > detailEpisodesList.clientWidth) {
            e.preventDefault();
            detailEpisodesList.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

// --- Nuvio Authentication Logic (https://nuvio.tv/docs) ---
function openAuthModal(mode = 'login') {
    state.authMode = mode;
    authErrorMsg.style.display = 'none';
    authSuccessMsg.style.display = 'none';

    if (mode === 'login') {
        authTitle.textContent = 'Log in with Nuvio';
        authSubtitle.textContent = 'Sync your watch history and streaming addons across devices.';
        authSubmitText.textContent = 'Log In';
        authTogglePrompt.textContent = "Don't have a Nuvio account?";
        authToggleBtn.textContent = 'Create one';
    } else {
        authTitle.textContent = 'Create a Nuvio Account';
        authSubtitle.textContent = 'Get started with cloud syncing for your media and addons.';
        authSubmitText.textContent = 'Sign Up';
        authTogglePrompt.textContent = 'Already have a Nuvio account?';
        authToggleBtn.textContent = 'Log In';
    }

    authModal.classList.add('active');
    authEmail.focus();
}

function closeAuthModal() {
    authModal.classList.remove('active');
}

authModalCloseBtn.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
});

authToggleBtn.addEventListener('click', () => {
    openAuthModal(state.authMode === 'login' ? 'signup' : 'login');
});

async function handleNuvioAuth(e) {
    e.preventDefault();
    authErrorMsg.style.display = 'none';
    authSuccessMsg.style.display = 'none';

    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
    }

    authSubmitBtn.disabled = true;
    authSubmitText.textContent = state.authMode === 'login' ? 'Logging in...' : 'Creating account...';

    try {
        const endpoint = state.authMode === 'login' 
            ? `${NUVIO_API_URL}/auth/v1/token?grant_type=password` 
            : `${NUVIO_API_URL}/auth/v1/signup`;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'apikey': NUVIO_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error_description || data.msg || data.message || 'Authentication failed');
        }

        if (state.authMode === 'signup') {
            authSuccessMsg.textContent = 'Account created successfully! You can now log in.';
            authSuccessMsg.style.display = 'block';
            setTimeout(() => {
                openAuthModal('login');
            }, 1500);
        } else {
            // Login successful
            state.nuvioSession = data;
            localStorage.setItem('aeeo_nuvio_session', JSON.stringify(data));

            authSuccessMsg.textContent = 'Successfully logged in!';
            authSuccessMsg.style.display = 'block';
            
            setTimeout(() => {
                closeAuthModal();
                if (state.currentView === 'profile') {
                    renderProfileView();
                } else if (state.currentView === 'home') {
                    renderHomeView();
                }
            }, 800);
        }
    } catch (err) {
        showAuthError(err.message || 'An error occurred during authentication.');
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitText.textContent = state.authMode === 'login' ? 'Log In' : 'Sign Up';
    }
}

function showAuthError(msg) {
    authErrorMsg.textContent = msg;
    authErrorMsg.style.display = 'block';
}

function handleNuvioLogout() {
    state.nuvioSession = null;
    localStorage.removeItem('aeeo_nuvio_session');
    renderProfileView();
}

authForm.addEventListener('submit', handleNuvioAuth);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (detailScreen && detailScreen.style.display !== 'none') closeDetailScreen();
        if (authModal && authModal.classList.contains('active')) closeAuthModal();
    }
});

// --- Action Button Listeners ---
heroPlayBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        openModal(state.featuredItem.id, getMediaType(state.featuredItem), state.featuredItem.imdb_id, true);
    }
});

heroWatchlistBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        toggleWatchlist(state.featuredItem);
    }
});

heroInfoBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        openModal(state.featuredItem.id, getMediaType(state.featuredItem), state.featuredItem.imdb_id, false);
    }
});

if (detailWatchlistBtn) {
    detailWatchlistBtn.addEventListener('click', () => {
        if (state.activeModalItem) {
            toggleWatchlist(state.activeModalItem);
        }
    });
}

// --- Initialize Navigation & App ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) switchView(view);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    renderHomeView();
});
