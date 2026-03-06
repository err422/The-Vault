const savedTheme = localStorage.getItem('vaultTheme') || 'default';
document.body.classList.add(`theme-${savedTheme}`);


// Global playtime variables
let playtimeTracker = {
    currentGame: null,
    startTime: null,
    intervalId: null,
    totalSeconds: 0
};

// Start tracking playtime when game/website opens
function startPlaytimeTracking(title) {
    if (!auth.currentUser) {
        console.log('Not tracking playtime - user not logged in');
        return;
    }

    stopPlaytimeTracking();

    playtimeTracker.currentGame = title;
    playtimeTracker.startTime = Date.now();
    playtimeTracker.totalSeconds = 0;

    console.log('Started tracking playtime for:', title);

    playtimeTracker.intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - playtimeTracker.startTime) / 1000);
        playtimeTracker.totalSeconds = elapsed;
        savePlaytimeToFirebase();
    }, 30000);
}

// Stop tracking playtime
function stopPlaytimeTracking() {
    if (!playtimeTracker.currentGame) return;

    if (playtimeTracker.intervalId) {
        clearInterval(playtimeTracker.intervalId);
        playtimeTracker.intervalId = null;
    }

    if (playtimeTracker.startTime) {
        const elapsed = Math.floor((Date.now() - playtimeTracker.startTime) / 1000);
        playtimeTracker.totalSeconds = elapsed;
        savePlaytimeToFirebase();
    }

    console.log('Stopped tracking playtime for:', playtimeTracker.currentGame,
                '- Total:', formatPlaytime(playtimeTracker.totalSeconds));

    playtimeTracker.currentGame = null;
    playtimeTracker.startTime = null;
    playtimeTracker.totalSeconds = 0;
}

// Save playtime to Firebase
function savePlaytimeToFirebase() {
    const user = auth.currentUser;
    if (!user || !playtimeTracker.currentGame || playtimeTracker.totalSeconds < 5) return;

    const gameTitle = playtimeTracker.currentGame;
    const secondsToAdd = playtimeTracker.totalSeconds;
    const today = new Date().toISOString().split('T')[0];

    const dailyRef = database.ref(`users/${user.uid}/playtime/daily/${today}/${encodeGameTitle(gameTitle)}`);
    dailyRef.transaction((currentSeconds) => {
        return (currentSeconds || 0) + secondsToAdd;
    })
    .then((result) => {
        if (result.committed) {
            console.log('Daily playtime saved:', gameTitle, '+' + secondsToAdd + 's');
        }
    })
    .catch((error) => {
        console.error('Error saving daily playtime:', error);
    });

    const totalRef = database.ref(`users/${user.uid}/playtime/total/${encodeGameTitle(gameTitle)}`);
    totalRef.transaction((currentSeconds) => {
        return (currentSeconds || 0) + secondsToAdd;
    })
    .then(() => {
        console.log('Total playtime updated');
    })
    .catch((error) => {
        console.error('Error updating total:', error);
    });

    playtimeTracker.startTime = Date.now();
    playtimeTracker.totalSeconds = 0;
}

// Helper: Encode game title for Firebase key
function encodeGameTitle(title) {
    return title.replace(/[.#$[\]]/g, '_');
}

// Helper: Format seconds into readable time
function formatPlaytime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}


// Global variables.
// allGames and allWebsites are kept separate because browser.js references them by name
// in showSelectionScreen() and createNewTab(). allItems is the merged array used by
// this page for rendering and filtering.
let allGames = [];
let allWebsites = [];
let allItems = [];

// Load items from both games.json and websites.json
async function loadItems() {
    try {
        const [gamesResponse, websitesResponse] = await Promise.all([
            fetch('Data/games.json'),
            fetch('Data/Websites.json')
        ]);

        allGames = await gamesResponse.json();
        allWebsites = await websitesResponse.json();

        // Normalize website categories to lowercase to match games.json style
        // for consistent filtering. allWebsites itself stays unchanged so
        // browser.js can use it as-is.
        const normalizedWebsites = allWebsites.map(site => ({
            ...site,
            category: site.category.toLowerCase()
        }));

        allItems = [...allGames, ...normalizedWebsites];
        renderItems(allItems);

        setupFiltering();
    } catch (error) {
        console.error('Error loading items:', error);
        document.getElementById('gamesGrid').innerHTML =
            '<p>Error loading games and websites. Please try again later.</p>';
    }
}

// Create HTML for a single card (works for both games and websites)
function createGameCard(item) {
    return `
        <div class="game-card" data-category="${item.category}">
            <div class="game-icon">${item.icon}</div>
                <h3 class="game-title">${item.title}</h3>
                <p class="game-description">${item.description}</p>
            <div class="game-meta">
                <span class="game-category">${item.category.toUpperCase()}</span>
                <span class="game-rating">${item.rating}</span>
            </div>
        </div>
    `;
}

// Render a list of items into the grid
function renderItems(items) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = items.map(item => createGameCard(item)).join('');
    setupGameCardClickHandlers();
}

// Game card click handler that opens iframe
function setupGameCardClickHandlers() {
    const gameCards = document.querySelectorAll('.game-card');

    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            const itemTitle = this.querySelector('.game-title').textContent;
            const itemData = allItems.find(i => i.title === itemTitle);
            const itemUrl = itemData?.url || './error.html';

            openIframe(itemUrl, itemTitle);
        });

        card.style.cursor = 'pointer';
    });
}

// Filter items by category and search term
function filterItems(category, searchTerm = '') {
    const filtered = allItems.filter(item => {
        const matchesCategory = category === 'all' || item.category === category;
        const matchesSearch = searchTerm === '' ||
                              item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    renderItems(filtered);
}

// Setup filtering functionality
function setupFiltering() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category || btn.textContent.toLowerCase();
            const searchTerm = searchInput ? searchInput.value : '';
            filterItems(category, searchTerm);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeBtn = document.querySelector('.filter-btn.active');
            const activeCategory = activeBtn
                ? (activeBtn.dataset.category || activeBtn.textContent.toLowerCase())
                : 'all';
            filterItems(activeCategory, e.target.value);
        });
    }
}

function loadFavorites() {
    try {
        const saved = localStorage.getItem('vaultFavorites');
        favorites = saved ? JSON.parse(saved) : [];

        updateFavoritesBadge();

        setTimeout(() => {
            syncFavoritesFromCloud();
        }, 1000);
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = [];
    }
}

function syncFavoritesFromCloud() {
    const user = auth.currentUser;
    if (!user) return;

    database.ref('users/' + user.uid + '/favorites').once('value')
        .then((snapshot) => {
            const cloudFavorites = snapshot.val();
            if (cloudFavorites && cloudFavorites.length > 0) {
                favorites = cloudFavorites;
                localStorage.setItem('vaultFavorites', JSON.stringify(favorites));

                updateFavoritesBadge();
                if (typeof updateCardStars === 'function') {
                    updateCardStars();
                } else if (typeof updateGameCardStars === 'function') {
                    updateGameCardStars();
                }

                console.log('Favorites synced from cloud:', favorites.length);
            }
        })
        .catch((error) => {
            console.error('Error syncing from cloud:', error);
        });
}

let syncTimeout = null;

function saveFavorites() {
    try {
        localStorage.setItem('vaultFavorites', JSON.stringify(favorites));

        const user = auth.currentUser;
        if (user) {
            if (syncTimeout) clearTimeout(syncTimeout);

            syncTimeout = setTimeout(() => {
                database.ref('users/' + user.uid + '/favorites').set(favorites)
                    .then(() => console.log('Favorites synced to cloud'))
                    .catch((error) => console.error('Sync error:', error));
            }, 1000);
        }
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function addToFavorites(item) {
    const exists = favorites.some(fav => fav.title === item.title);
    if (exists) return false;

    favorites.push(item);
    saveFavorites();
    return true;
}

function removeFromFavorites(title) {
    favorites = favorites.filter(fav => fav.title !== title);
    saveFavorites();
}

function isFavorited(title) {
    return favorites.some(fav => fav.title === title);
}

function updateFavoritesBadge() {
    const badge = document.getElementById('favorites-count-badge');
    if (badge) {
        badge.textContent = favorites.length;
        badge.style.display = favorites.length === 0 ? 'none' : 'flex';
    }
}

function addBellScheduleIconToToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) {
        console.log('Toolbar not found for bell schedule');
        return;
    }

    const existing = document.getElementById('bell-schedule-toolbar-btn');
    if (existing) existing.remove();

    const bellButton = document.createElement('button');
    bellButton.id = 'bell-schedule-toolbar-btn';
    bellButton.innerHTML = '🔔';
    bellButton.title = 'Bell Schedule';
    bellButton.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        margin-left: 8px;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        position: relative;
    `;

    bellButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.5)';
    });

    bellButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
    });

    bellButton.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleBellSchedulePopup();
    });

    toolbar.appendChild(bellButton);

    console.log('Bell schedule icon added to toolbar');
}

function addFavoritesIconToToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) {
        console.log('Toolbar not found for favorites');
        return;
    }

    const existing = document.getElementById('favorites-toolbar-btn');
    if (existing) existing.remove();

    const favButton = document.createElement('button');
    favButton.id = 'favorites-toolbar-btn';
    favButton.innerHTML = '⭐';
    favButton.title = 'Favorites';
    favButton.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border: none;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        margin-left: 8px;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        position: relative;
    `;

    const badge = document.createElement('span');
    badge.id = 'favorites-count-badge';
    badge.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: 700;
        border-radius: 10px;
        min-width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    badge.textContent = favorites.length;
    if (favorites.length === 0) badge.style.display = 'none';

    favButton.appendChild(badge);

    favButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.5)';
    });

    favButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.3)';
    });

    favButton.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFavoritesPopup();
    });

    toolbar.appendChild(favButton);

    console.log('Favorites icon added to toolbar');
}

function toggleFavoritesPopup() {
    let popup = document.getElementById('favorites-popup');

    if (popup) {
        popup.remove();
        return;
    }

    const browserWindow = document.getElementById('browser-window');
    if (!browserWindow) {
        console.error('Browser window not found');
        return;
    }

    popup = document.createElement('div');
    popup.id = 'favorites-popup';
    popup.style.cssText = `
        position: absolute;
        top: 100px;
        right: 20px;
        width: 360px;
        max-height: 500px;
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        border-radius: 16px;
        overflow: hidden;
        z-index: 99999;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        animation: slideIn 0.3s ease;
        pointer-events: all;
        display: flex;
        flex-direction: column;
    `;

    popup.innerHTML = `
        <div style="padding: 20px 24px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); position: relative;">
            <button id="close-favorites-popup" style="position: absolute; top: 16px; right: 16px;
                    background: rgba(0,0,0,0.2); border: none; color: white;
                    font-size: 20px; cursor: pointer; padding: 4px 8px; width: 28px; height: 28px;
                    border-radius: 6px; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s ease;">×</button>

            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-align: center;">
                ⭐ Favorites
            </h2>
        </div>

        <div id="favorites-content" style="flex: 1; overflow-y: auto; padding: 16px 20px;"></div>

        <div style="padding: 12px 20px; background: rgba(255,255,255,0.05); text-align: center;
                    color: #888; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            Click the ★ on any card to add to favorites
        </div>
    `;

    browserWindow.appendChild(popup);

    const closeBtn = document.getElementById('close-favorites-popup');
    closeBtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(0,0,0,0.4)'; });
    closeBtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(0,0,0,0.2)'; });
    closeBtn.addEventListener('click', () => { popup.remove(); });

    setTimeout(() => {
        document.addEventListener('click', function closeOutside(e) {
            const favBtn = document.getElementById('favorites-toolbar-btn');
            if (!popup.contains(e.target) && e.target !== favBtn && !favBtn.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closeOutside);
            }
        });
    }, 100);

    renderFavorites();
}

function renderFavorites() {
    const content = document.getElementById('favorites-content');
    if (!content) return;

    if (favorites.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #888;">
                <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;">⭐</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #aaa;">
                    No favorites yet
                </div>
                <div style="font-size: 14px;">
                    Star your favorite games and sites to see them here!
                </div>
            </div>
        `;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    favorites.forEach(item => {
        html += `
            <div class="favorite-item" data-title="${item.title}" style="
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 12px;">

                <div style="font-size: 32px; width: 48px; height: 48px;
                            background: rgba(255,255,255,0.1); border-radius: 10px;
                            display: flex; align-items: center; justify-content: center;
                            flex-shrink: 0;">
                    ${item.icon || '🎮'}
                </div>

                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 16px; font-weight: 600; color: white;
                                margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;
                                white-space: nowrap;">
                        ${item.title}
                    </div>
                    <div style="font-size: 12px; color: #888; text-transform: uppercase;">
                        ${item.category || 'Game'}
                    </div>
                </div>

                <button class="remove-favorite" data-title="${item.title}"
                        style="background: rgba(239, 68, 68, 0.2); border: none;
                               color: #ef4444; width: 32px; height: 32px; border-radius: 50%;
                               cursor: pointer; display: flex; align-items: center;
                               justify-content: center; font-size: 18px; transition: all 0.2s;
                               flex-shrink: 0;">
                    ×
                </button>
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;

    const favoriteItems = content.querySelectorAll('.favorite-item');
    favoriteItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.12)';
            this.style.borderColor = 'rgba(255,255,255,0.2)';
            this.style.transform = 'translateY(-2px)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.08)';
            this.style.borderColor = 'rgba(255,255,255,0.1)';
            this.style.transform = 'translateY(0)';
        });

        item.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-favorite')) return;

            const title = this.dataset.title;
            let favorite = favorites.find(fav => fav.title === title);

            if (favorite && !favorite.url) {
                const found = allItems.find(i => i.title === title);
                if (found) favorite.url = found.url;
            }

            if (favorite && favorite.url) {
                document.getElementById('favorites-popup')?.remove();
                openIframe(favorite.url, favorite.title);
            } else {
                console.error('No usable URL for favorite:', favorite);
            }
        });
    });

    const removeButtons = content.querySelectorAll('.remove-favorite');
    removeButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(239, 68, 68, 0.3)';
            this.style.transform = 'scale(1.1)';
        });

        btn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(239, 68, 68, 0.2)';
            this.style.transform = 'scale(1)';
        });

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const title = this.dataset.title;
            removeFromFavorites(title);
            updateFavoritesBadge();
            renderFavorites();
            updateGameCardStars();
        });
    });
}

function addStarsToCards() {
    const cards = document.querySelectorAll('.game-card');

    cards.forEach(card => {
        if (card.querySelector('.favorite-star')) return;

        const title = card.querySelector('.game-title')?.textContent;
        if (!title) return;

        const isFav = isFavorited(title);

        const star = document.createElement('button');
        star.className = 'favorite-star';
        star.innerHTML = isFav ? '⭐' : '☆';
        star.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        star.style.cssText = `
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0,0,0,0.6);
            border: none;
            color: ${isFav ? '#fbbf24' : '#fff'};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
            backdrop-filter: blur(4px);
        `;

        star.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(0,0,0,0.8)';
            this.style.transform = 'scale(1.15) rotate(15deg)';
        });

        star.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(0,0,0,0.6)';
            this.style.transform = 'scale(1) rotate(0deg)';
        });

        star.addEventListener('click', function(e) {
            e.stopPropagation();

            const icon = card.querySelector('.game-icon')?.textContent;
            const category = card.querySelector('.game-category')?.textContent;
            const description = card.querySelector('.game-description')?.textContent;

            const itemData = allItems.find(i => i.title === title);
            const url = itemData?.url || '';

            const item = {
                title: title,
                icon: icon || '🎮',
                category: category || 'Game',
                description: description || '',
                url: url
            };

            if (isFavorited(title)) {
                removeFromFavorites(title);
                this.innerHTML = '☆';
                this.style.color = '#fff';
                this.title = 'Add to favorites';
            } else {
                addToFavorites(item);
                this.innerHTML = '⭐';
                this.style.color = '#fbbf24';
                this.title = 'Remove from favorites';
            }

            updateFavoritesBadge();
        });

        card.style.position = 'relative';
        card.appendChild(star);
    });
}

function updateGameCardStars() {
    const stars = document.querySelectorAll('.favorite-star');

    stars.forEach(star => {
        const card = star.closest('.game-card');
        const title = card?.querySelector('.game-title')?.textContent;

        if (title) {
            const isFav = isFavorited(title);
            star.innerHTML = isFav ? '⭐' : '☆';
            star.style.color = isFav ? '#fbbf24' : '#fff';
            star.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        }
    });
}

// Initialize favorites
loadFavorites();

// Observer to add stars when cards are rendered
const cardObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
            addStarsToCards();
        }
    });
});

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    loadItems();

    addStarsToCards();

    const gamesGrid = document.getElementById('gamesGrid');
    if (gamesGrid) {
        cardObserver.observe(gamesGrid, { childList: true, subtree: true });
    }
});

// Save playtime when user leaves or closes tab
window.addEventListener('beforeunload', function() {
    stopPlaytimeTracking();
});

// Track when user switches away from tab
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (playtimeTracker.intervalId) {
            clearInterval(playtimeTracker.intervalId);
            playtimeTracker.intervalId = null;
        }
        savePlaytimeToFirebase();
    } else {
        if (playtimeTracker.currentGame && !playtimeTracker.intervalId) {
            playtimeTracker.startTime = Date.now();
            playtimeTracker.intervalId = setInterval(() => {
                const elapsed = Math.floor((Date.now() - playtimeTracker.startTime) / 1000);
                playtimeTracker.totalSeconds = elapsed;
                savePlaytimeToFirebase();
            }, 30000);
        }
    }
});


// ===== TESTING - View playtime in console =====
function viewPlaytime(range = 'week') {
    const user = auth.currentUser;
    if (!user) {
        console.log('❌ Not logged in');
        return;
    }

    let path = 'total';

    if (range === 'today') {
        const today = new Date().toISOString().split('T')[0];
        path = `daily/${today}`;
    } else if (range === 'week') {
        path = 'daily';
    } else if (range === 'month') {
        path = 'weekly';
    } else if (range === 'year') {
        path = 'monthly';
    } else if (range === 'all') {
        path = 'total';
    }

    database.ref(`users/${user.uid}/playtime/${path}`).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                console.log(`📊 No playtime data for: ${range}`);
                return;
            }

            console.log(`\n=== PLAYTIME (${range.toUpperCase()}) ===`);

            if (path !== 'total') {
                let aggregated = {};

                for (const period in data) {
                    for (const game in data[period]) {
                        aggregated[game] = (aggregated[game] || 0) + data[period][game];
                    }
                }

                const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]);
                sorted.forEach(([game, seconds]) => {
                    console.log(`${game}: ${formatPlaytime(seconds)}`);
                });

                const totalSeconds = Object.values(aggregated).reduce((a, b) => a + b, 0);
                console.log(`\n⏱️  Total: ${formatPlaytime(totalSeconds)}`);
            } else {
                const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
                sorted.forEach(([game, seconds]) => {
                    console.log(`${game}: ${formatPlaytime(seconds)}`);
                });

                const totalSeconds = Object.values(data).reduce((a, b) => a + b, 0);
                console.log(`\n⏱️  Total: ${formatPlaytime(totalSeconds)}`);
            }

            console.log('\n💡 Try: viewPlaytime("today"), viewPlaytime("week"), viewPlaytime("month"), viewPlaytime("all")');
        })
        .catch((error) => {
            console.error('Error loading playtime:', error);
        });
}