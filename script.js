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
        release_date: '2023',
        mediaType: 'tv',
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
            initialCW = parsed;
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

// Detail Modal Elements
const detailModal = document.getElementById('detail-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalBackdropWrap = document.getElementById('modal-backdrop-wrap');
const modalVideoWrap = document.getElementById('modal-video-wrap');
const modalTrailerIframe = document.getElementById('modal-trailer-iframe');
const modalPlayTrailerBtn = document.getElementById('modal-play-trailer-btn');
const modalTitle = document.getElementById('modal-title');
const modalRating = document.getElementById('modal-rating');
const modalYear = document.getElementById('modal-year');
const modalRuntime = document.getElementById('modal-runtime');
const modalGenres = document.getElementById('modal-genres');
const modalOverview = document.getElementById('modal-overview');
const modalCast = document.getElementById('modal-cast');
const modalWatchlistBtn = document.getElementById('modal-watchlist-btn');
const modalStreamsContainer = document.getElementById('modal-streams-container');
const modalStreamsList = document.getElementById('modal-streams-list');

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

function getMediaType(item) {
    if (item.media_type) return item.media_type;
    return item.first_air_date || item.type === 'series' ? 'tv' : 'movie';
}

function getRating(item) {
    return item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A';
}

// --- Watch Progress & Continue Watching Logic (Synced with Nuvio Cloud) ---
function recordWatchProgress(item, progressPercent = 45) {
    const type = getMediaType(item);
    const index = state.continueWatching.findIndex(i => i.id === item.id && i.mediaType === type);
    
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
        mediaType: type,
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
            
            let mediaType = item.content_type || item.media_type || 'movie';
            if (mediaType === 'series') mediaType = 'tv';

            let progress = item.progress;
            if (!progress && item.duration && item.position) {
                progress = Math.round((item.position / item.duration) * 100);
            }
            if (!progress) progress = 50;

            let meta = item.meta || item.item_data;
            if (!meta && rawId) {
                if (rawId.startsWith('tt')) {
                    const findData = await fetchTMDB(`/find/${rawId}`, { external_source: 'imdb_id' });
                    const resList = (mediaType === 'tv' ? findData?.tv_results : findData?.movie_results) || findData?.movie_results;
                    if (resList && resList.length > 0) meta = resList[0];
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
                mediaType: mediaType,
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
            ? '<i class="fi fi-tr-check"></i> Added'
            : '<i class="fi fi-tr-plus"></i> Watchlist';
    }

    if (state.activeModalItem) {
        const isAdded = isInWatchlist(state.activeModalItem.id, getMediaType(state.activeModalItem));
        modalWatchlistBtn.innerHTML = isAdded
            ? '<i class="fi fi-tr-check"></i> In Watchlist'
            : '<i class="fi fi-tr-plus"></i> Add to Watchlist';
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
                <span>${badgeText || mediaType.toUpperCase()}</span>
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

// --- Search Functionality ---
let searchDebounceTimeout = null;

async function performSearch(query) {
    if (!query.trim()) {
        if (state.currentView === 'search') renderSearchView();
        return;
    }

    heroBanner.style.display = 'none';
    sectionsContainer.innerHTML = '<div style="text-align:center; padding: 2rem;"><p>Searching...</p></div>';

    const data = await fetchTMDB('/search/multi', { query: encodeURIComponent(query) });

    if (!data || !data.results || data.results.length === 0) {
        sectionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fi fi-tr-search"></i>
                <h3>No results found for "${query}"</h3>
                <p>Try checking your spelling or searching for another title.</p>
            </div>
        `;
        return;
    }

    sectionsContainer.innerHTML = `
        <div class="media-section-header">
            <h2 class="media-section-title">Search Results for "${query}"</h2>
        </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'media-grid';

    data.results.forEach(item => {
        if ((item.media_type === 'movie' || item.media_type === 'tv') && (item.poster_path || item.backdrop_path)) {
            grid.appendChild(createMediaCard(item));
        }
    });

    sectionsContainer.appendChild(grid);
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

// --- Movie Detail Modal & Streaming Playback Logic ---
async function openModal(id, type = 'movie', directImdbId = null) {
    let imdbId = directImdbId;
    let data = null;

    if (String(id).startsWith('tt')) {
        imdbId = id;
    }

    // Fetch TMDB details
    if (!String(id).startsWith('tt')) {
        data = await fetchTMDB(`/${type}/${id}`, { append_to_response: 'videos,credits,external_ids' });
        if (data && data.external_ids && data.external_ids.imdb_id) {
            imdbId = data.external_ids.imdb_id;
        }
    } else {
        // Find by IMDb ID
        const findData = await fetchTMDB(`/find/${id}`, { external_source: 'imdb_id' });
        if (findData) {
            const results = (type === 'tv' ? findData.tv_results : findData.movie_results) || findData.movie_results;
            if (results && results.length > 0) {
                data = await fetchTMDB(`/${type}/${results[0].id}`, { append_to_response: 'videos,credits,external_ids' });
            }
        }
    }

    if (!data) {
        data = { id, title: 'Streaming Title', overview: 'High-definition media playback' };
    }

    data.media_type = type;
    data.imdb_id = imdbId;
    state.activeModalItem = data;

    const title = getTitle(data);
    const year = getYear(data);
    const rating = getRating(data);
    const runtime = data.runtime ? `${data.runtime} min` : (data.number_of_seasons ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}` : '');
    const backdropUrl = data.backdrop_path ? `${IMG_BACKDROP}${data.backdrop_path}` : (data.poster_path ? `${IMG_POSTER}${data.poster_path}` : '');

    modalTitle.textContent = title;
    modalRating.innerHTML = `<i class="fi fi-tr-star"></i> ${rating}`;
    modalYear.textContent = year;
    modalRuntime.textContent = runtime;
    modalOverview.textContent = data.overview || 'No synopsis available.';

    // Genres
    modalGenres.innerHTML = (data.genres || [])
        .map(g => `<span class="genre-tag">${g.name}</span>`)
        .join('');

    // Cast
    const topCast = (data.credits && data.credits.cast ? data.credits.cast.slice(0, 5) : [])
        .map(c => c.name)
        .join(', ');
    modalCast.innerHTML = topCast ? `<strong>Cast:</strong> ${topCast}` : '';

    // Backdrop & Video
    modalBackdrop.src = backdropUrl;
    modalBackdropWrap.style.display = 'block';
    modalVideoWrap.style.display = 'none';
    modalTrailerIframe.src = '';

    const trailer = data.videos && data.videos.results
        ? data.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
        : null;

    if (trailer) {
        modalPlayTrailerBtn.style.display = 'flex';
        modalPlayTrailerBtn.onclick = () => {
            modalBackdropWrap.style.display = 'none';
            modalVideoWrap.style.display = 'block';
            modalTrailerIframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
            // Record watching progress
            recordWatchProgress(data, 25);
        };
    } else {
        modalPlayTrailerBtn.style.display = 'none';
    }

    // Load Streaming Sources from Active Addons
    modalStreamsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Resolving streams from streaming addons...</p>';
    if (imdbId) {
        fetchStreamsForMedia(imdbId, type).then(streams => {
            if (streams && streams.length > 0) {
                modalStreamsList.innerHTML = streams.slice(0, 10).map(s => {
                    const quality = s.name.replace('\n', ' • ');
                    const details = s.title.split('\n')[0];
                    return `
                        <div class="stream-item" onclick="handleSelectStream('${encodeURIComponent(details)}')">
                            <div class="stream-meta">
                                <span class="stream-name">${details}</span>
                                <span class="stream-details">${s.title.replace(/\n/g, ' ')}</span>
                            </div>
                            <span class="stream-badge">${quality}</span>
                        </div>
                    `;
                }).join('');
            } else {
                modalStreamsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No direct torrent/debrid streams found for this title.</p>';
            }
        });
    } else {
        modalStreamsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Trailer available above.</p>';
    }

    updateWatchlistButtons();
    detailModal.classList.add('active');
}

// Global handler when user clicks a stream
window.handleSelectStream = function(streamTitle) {
    if (state.activeModalItem) {
        recordWatchProgress(state.activeModalItem, 35);
        alert(`Starting stream: ${decodeURIComponent(streamTitle)}\nAdded to Continue Watching.`);
    }
};

function closeModal() {
    detailModal.classList.remove('active');
    modalTrailerIframe.src = '';
    state.activeModalItem = null;
}

modalCloseBtn.addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
});

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
        if (detailModal.classList.contains('active')) closeModal();
        if (authModal.classList.contains('active')) closeAuthModal();
    }
});

// --- Action Button Listeners ---
heroPlayBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        openModal(state.featuredItem.id, getMediaType(state.featuredItem), state.featuredItem.imdb_id);
        setTimeout(() => {
            if (modalPlayTrailerBtn.style.display !== 'none') {
                modalPlayTrailerBtn.click();
            }
        }, 400);
    }
});

heroWatchlistBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        toggleWatchlist(state.featuredItem);
    }
});

heroInfoBtn.addEventListener('click', () => {
    if (state.featuredItem) {
        openModal(state.featuredItem.id, getMediaType(state.featuredItem), state.featuredItem.imdb_id);
    }
});

modalWatchlistBtn.addEventListener('click', () => {
    if (state.activeModalItem) {
        toggleWatchlist(state.activeModalItem);
    }
});

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
