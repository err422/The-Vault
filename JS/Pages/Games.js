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
    // Don't track if not logged in
    if (!auth.currentUser) {
        console.log('Not tracking playtime - user not logged in');
        return;
    }

    // Stop any existing tracking
    stopPlaytimeTracking();

    playtimeTracker.currentGame = title;
    playtimeTracker.startTime = Date.now();
    playtimeTracker.totalSeconds = 0;

    console.log('Started tracking playtime for:', title);

    // Update playtime every 30 seconds
    playtimeTracker.intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - playtimeTracker.startTime) / 1000);
        playtimeTracker.totalSeconds = elapsed;
        
        // Save to Firebase every 30 seconds (in case of crash/close)
        savePlaytimeToFirebase();
    }, 30000); // 30 seconds
}

// Stop tracking playtime
function stopPlaytimeTracking() {
    if (!playtimeTracker.currentGame) return;

    // Clear interval
    if (playtimeTracker.intervalId) {
        clearInterval(playtimeTracker.intervalId);
        playtimeTracker.intervalId = null;
    }

    // Calculate final playtime
    if (playtimeTracker.startTime) {
        const elapsed = Math.floor((Date.now() - playtimeTracker.startTime) / 1000);
        playtimeTracker.totalSeconds = elapsed;
        
        // Save final playtime to Firebase
        savePlaytimeToFirebase();
    }

    console.log('Stopped tracking playtime for:', playtimeTracker.currentGame, 
                '- Total:', formatPlaytime(playtimeTracker.totalSeconds));

    // Reset tracker
    playtimeTracker.currentGame = null;
    playtimeTracker.startTime = null;
    playtimeTracker.totalSeconds = 0;
}

// Save playtime to Firebase
function savePlaytimeToFirebase() {
    const user = auth.currentUser;
    if (!user || !playtimeTracker.currentGame || playtimeTracker.totalSeconds < 5) {
        return;
    }

    const gameTitle = playtimeTracker.currentGame;
    const secondsToAdd = playtimeTracker.totalSeconds;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Save to daily playtime
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
    
    // Also update lifetime total
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

    // Reset counter
    playtimeTracker.startTime = Date.now();
    playtimeTracker.totalSeconds = 0;
}

// Helper: Encode game title for Firebase key (remove invalid characters)
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


// Global variables
let allGames = [];

// Load games from JSON file
async function loadGames() {
    try {
        const response = await fetch('Data/games.json');
        const games = await response.json();
        allGames = games;
        renderGames(games);
        
        // Setup filtering after games are loaded
        setupFiltering();
    } catch (error) {
        console.error('Error loading games:', error);
        document.getElementById('gamesGrid').innerHTML = 
            '<p>Error loading games. Please try again later.</p>';
    }
}

// Function to create HTML for a single game
function createGameCard(game) {
    return `
        <div class="game-card" data-category="${game.category}"> 
            <div class="game-icon">${game.icon}</div>
                <h3 class="game-title">${game.title}</h3>
                <p class="game-description">${game.description}</p>
            <div class="game-meta">
                <span class="game-category">${game.category.toUpperCase()}</span> 
                <span class="game-rating">${game.rating}</span> 
            </div>
        </div>
    `;
}

// Function to render games
function renderGames(games) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = games.map(game => createGameCard(game)).join('');
    
    // Re-setup click handlers after rendering
    setupGameCardClickHandlers();
    
}

// Game card click handler that opens iframe
function setupGameCardClickHandlers() {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            const gameTitle = this.querySelector('.game-title').textContent;
            const gameData = allGames.find(g => g.title === gameTitle);
            const gameUrl = gameData?.url || './error.html';
            
            openIframe(gameUrl, gameTitle);
        });
        
        card.style.cursor = 'pointer';
    });
}

// Function to filter games by category and search term
function filterGames(category, searchTerm = '') {
    const filteredGames = allGames.filter(game => {
        const matchesCategory = category === 'all' || game.category === category;
        const matchesSearch = searchTerm === '' || 
                            game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            game.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesCategory && matchesSearch;
    });
    
    renderGames(filteredGames);
}

// Setup filtering functionality
function setupFiltering() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    // Filter button handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active filter button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category || btn.textContent.toLowerCase();
            const searchTerm = searchInput ? searchInput.value : '';
            filterGames(category, searchTerm);
        });
    });

    // Search functionality (only if search input exists)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeBtn = document.querySelector('.filter-btn.active');
            const activeCategory = activeBtn ? (activeBtn.dataset.category || activeBtn.textContent.toLowerCase()) : 'all';
            filterGames(activeCategory, e.target.value);
        });
    }
}

function loadFavorites() {
    try {
        // First load from localStorage (instant, no waiting)
        const saved = localStorage.getItem('vaultFavorites');
        favorites = saved ? JSON.parse(saved) : [];
        
        // Update UI immediately with localStorage data
        updateFavoritesBadge();
        
        // Then sync with cloud in the background (non-blocking)
        setTimeout(() => {
            syncFavoritesFromCloud();
        }, 1000); // Wait 1 second before checking cloud
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = [];
    }
}

// New function: Load from cloud without blocking
function syncFavoritesFromCloud() {
    const user = auth.currentUser;
    if (!user) return;
    
    database.ref('users/' + user.uid + '/favorites').once('value')
        .then((snapshot) => {
            const cloudFavorites = snapshot.val();
            if (cloudFavorites && cloudFavorites.length > 0) {
                favorites = cloudFavorites;
                localStorage.setItem('vaultFavorites', JSON.stringify(favorites));
                
                // Update UI after cloud sync
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
        // Save to localStorage immediately (fast)
        localStorage.setItem('vaultFavorites', JSON.stringify(favorites));
        
        // Debounce Firebase sync (wait 1 second after last change)
        const user = auth.currentUser;
        if (user) {
            if (syncTimeout) clearTimeout(syncTimeout);
            
            syncTimeout = setTimeout(() => {
                database.ref('users/' + user.uid + '/favorites').set(favorites)
                    .then(() => console.log('Favorites synced to cloud'))
                    .catch((error) => console.error('Sync error:', error));
            }, 1000); // Only sync after user stops clicking for 1 second
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
    
    // Remove existing button if present
    const existing = document.getElementById('bell-schedule-toolbar-btn');
    if (existing) existing.remove();
    
    // Create bell schedule button
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
    
    // Remove existing button if present
    const existing = document.getElementById('favorites-toolbar-btn');
    if (existing) existing.remove();
    
    // Create favorites button
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
    
    // Add count badge
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
    
    // Create popup
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
            Click the ★ on any game card to add to favorites
        </div>
    `;
    
    browserWindow.appendChild(popup);
    
    const closeBtn = document.getElementById('close-favorites-popup');
    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(0,0,0,0.4)';
    });
    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(0,0,0,0.2)';
    });
    closeBtn.addEventListener('click', () => {
        popup.remove();
    });
    
    // Close when clicking outside
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
    
    // Add hover effects and click handlers
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
                const found =
                    (Array.isArray(allGames) && allGames.find(g => g.title === title)) ||
                    (Array.isArray(allWebsites) && allWebsites.find(w => w.title === title));
                
                if (found) {
                    favorite.url = found.url;
                }
            }
            
            if (favorite && favorite.url) {
                document.getElementById('favorites-popup')?.remove();
                openIframe(favorite.url, favorite.title);
            } else {
                console.error("No usable URL for favorite:", favorite);
            }
        });
    });
    
    // Remove buttons
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
    const cards = document.querySelectorAll('.game-card, .website-card');
    
    cards.forEach(card => {
        if (card.querySelector('.favorite-star')) return;
        
        const title = card.querySelector('.game-title, .website-title')?.textContent;
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
            
            const icon = card.querySelector('.game-icon, .website-favicon')?.textContent;
            const category = card.querySelector('.game-category, .website-category')?.textContent;
            const description = card.querySelector('.game-description, .website-description')?.textContent;
            
            let itemData = null;
            let url = '';
            
            if (Array.isArray(allGames)) {
                itemData = allGames.find(g => g.title === title);
                if (itemData) url = itemData.url || '';
            }
            
            if (!itemData && typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) {
                itemData = allWebsites.find(w => w.title === title);
                if (itemData) url = itemData.url || '';
            }
            
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
        const card = star.closest('.game-card, .website-card');
        const title = card?.querySelector('.game-title, .website-title')?.textContent;
        
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
    loadGames();
    
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

// Track when user switches away from tab (stop counting)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // User switched away - pause tracking
        if (playtimeTracker.intervalId) {
            clearInterval(playtimeTracker.intervalId);
            playtimeTracker.intervalId = null;
        }
        savePlaytimeToFirebase();
    } else {
        // User came back - resume tracking
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
// Add this function to test and view playtime data

function viewPlaytime(range = 'week') {
    const user = auth.currentUser;
    if (!user) {
        console.log('❌ Not logged in');
        return;
    }
    
    let path = 'total'; // default
    
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
            
            // If viewing a time range (daily/weekly/monthly)
            if (path !== 'total') {
                let allGames = {};
                
                // Aggregate all games across all dates/weeks/months
                for (const period in data) {
                    for (const game in data[period]) {
                        allGames[game] = (allGames[game] || 0) + data[period][game];
                    }
                }
                
                // Sort and display
                const sorted = Object.entries(allGames).sort((a, b) => b[1] - a[1]);
                sorted.forEach(([game, seconds]) => {
                    console.log(`${game}: ${formatPlaytime(seconds)}`);
                });
                
                const totalSeconds = Object.values(allGames).reduce((a, b) => a + b, 0);
                console.log(`\n⏱️  Total: ${formatPlaytime(totalSeconds)}`);
            } else {
                // Viewing lifetime totals
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