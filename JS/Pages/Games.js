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
            
            openGameIframe(gameUrl, gameTitle);
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

// Multi-Tab Browser System
let browserTabs = [];
let activeTabId = null;
let tabCounter = 0;
let isSelectingNewTab = false;

function openGameIframe(url, title) {
    console.log('Opening:', url, title);
    if (window.starManager) {
       window.starManager.remove();
       console.log('Unloading Stars');
   }
    
    let overlay = document.getElementById('game-iframe-overlay');
    
    if (!overlay) {
        createBrowserWindow();
        overlay = document.getElementById('game-iframe-overlay');
    }
    
    isSelectingNewTab = false;
    createNewTab(url, title);
}

function createBrowserWindow() {
    const overlay = document.createElement('div');
    overlay.id = 'game-iframe-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(10, 10, 10, 0.95);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(8px);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const browserWindow = document.createElement('div');
    browserWindow.id = 'browser-window';
    browserWindow.style.cssText = `
        width: 90%;
        height: 90%;
        max-width: 1200px;
        max-height: 800px;
        background: rgba(42, 42, 42, 0.95);
        border-radius: 12px;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform: scale(0.8);
        transition: transform 0.3s ease;
        position: relative;
    `;
    
    // Tab Bar
    const tabBar = document.createElement('div');
    tabBar.id = 'tab-bar';
    tabBar.style.cssText = `
        background: rgba(55, 55, 55, 0.9);
        display: flex;
        align-items: flex-end;
        height: 36px;
        padding: 0 8px;
        overflow-x: auto;
        overflow-y: hidden;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 10;
        position: relative;
    `;
    
    const newTabBtn = document.createElement('button');
    newTabBtn.id = 'new-tab-btn';
    newTabBtn.innerHTML = '+';
    newTabBtn.title = 'New Tab';
    newTabBtn.style.cssText = `
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 20px;
        cursor: pointer;
        padding: 4px 12px;
        margin-left: 8px;
        transition: all 0.2s ease;
        border-radius: 8px 8px 0 0;
        flex-shrink: 0;
    `;
    
    newTabBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.1)';
        this.style.color = '#fff';
    });
    
    newTabBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
        this.style.color = 'rgba(255,255,255,0.7)';
    });
    
    newTabBtn.addEventListener('click', handleNewTabClick);
    
    tabBar.appendChild(newTabBtn);
    
    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'toolbar';
    toolbar.style.cssText = `
        background: rgba(42, 42, 42, 0.95);
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 44px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 10;
        position: relative;
    `;
    
    toolbar.appendChild(createNavButtons());
    toolbar.appendChild(createAddressBar());
    
    // Add widgets to toolbar after a short delay
    setTimeout(() => {
        addBellScheduleIconToToolbar();
        addFavoritesIconToToolbar();
    }, 100);
    
    // Iframe Container
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'iframe-container';
    iframeContainer.style.cssText = `
        flex: 1;
        background: rgba(25, 25, 25, 0.95);
        position: relative;
        overflow: hidden;
        z-index: 1;
    `;
    
    browserWindow.appendChild(tabBar);
    browserWindow.appendChild(toolbar);
    browserWindow.appendChild(iframeContainer);
    
    // Window controls
    const windowControls = document.createElement('div');
    windowControls.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 8px;
        z-index: 1000;
    `;
    
    const minimizeBtn = createControlButton('−', 'Minimize');
    const fsIframeBtn = createControlButton('⛶', 'Fullscreen (content only)');
    const maximizeBtn = createControlButton('□', 'Maximize (with toolbar)');
    const closeBrowserBtn = createControlButton('×', 'Close');
    
    fsIframeBtn.addEventListener('click', function() {
        const iframe = document.getElementById(`iframe-${activeTabId}`);
        if (iframe) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                iframe.requestFullscreen();
            }
        }
    });
    
    maximizeBtn.addEventListener('click', function() {
        const browserWindow = document.getElementById('browser-window');
        if (browserWindow) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                browserWindow.requestFullscreen();
            }
        }
    });
    
    closeBrowserBtn.addEventListener('click', closeBrowser);
    closeBrowserBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(239, 68, 68, 0.8)';
        this.style.color = '#fff';
    });
    
    windowControls.appendChild(minimizeBtn);
    windowControls.appendChild(fsIframeBtn);
    windowControls.appendChild(maximizeBtn);
    windowControls.appendChild(closeBrowserBtn);
    
    browserWindow.appendChild(windowControls);
    overlay.appendChild(browserWindow);
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeBrowser();
        }
    });
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        overlay.style.opacity = '1';
        browserWindow.style.transform = 'scale(1)';
    }, 10);
}

function createControlButton(text, title) {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.title = title;
    btn.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${text === '×' ? '22px' : text === '⛶' ? '14px' : '18px'};
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
    `;
    
    btn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.2)';
        this.style.color = '#fff';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.1)';
        this.style.color = 'rgba(255,255,255,0.8)';
    });
    
    return btn;
}

function handleNewTabClick() {
    isSelectingNewTab = true;
    activeTabId = null;
    
    const allTabs = document.querySelectorAll('.browser-tab');
    allTabs.forEach(tab => {
        tab.style.background = 'rgba(50, 50, 50, 0.7)';
        tab.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) {
        newTabBtn.style.background = 'rgba(25, 25, 25, 0.95)';
        newTabBtn.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        newTabBtn.style.borderLeft = '1px solid rgba(255, 255, 255, 0.2)';
        newTabBtn.style.borderRight = '1px solid rgba(255, 255, 255, 0.2)';
    }
    
    const urlText = document.getElementById('url-text');
    if (urlText) {
        urlText.textContent = 'Select a game or website...';
    }
    
    const allIframes = document.querySelectorAll('#iframe-container iframe');
    allIframes.forEach(iframe => {
        iframe.style.display = 'none';
    });
    
    showSelectionScreen();
}

function showSelectionScreen() {
    let selectionScreen = document.getElementById('selection-screen');
    
    if (selectionScreen) {
        selectionScreen.style.display = 'block';
        return;
    }
    
    selectionScreen = document.createElement('div');
    selectionScreen.id = 'selection-screen';
    selectionScreen.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(25, 25, 25, 0.98);
        overflow-y: auto;
        z-index: 100;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `text-align: center; padding: 30px 20px 20px;`;
    header.innerHTML = `
        <h2 style="font-size: 24px; color: #fff; margin-bottom: 8px; font-weight: 600;">Open New Tab</h2>
        <p style="color: #888; font-size: 14px;">Select a game or website to open</p>
    `;
    
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
        padding: 20px 30px 30px;
    `;
    
    const items = [];
    
    if (Array.isArray(allGames)) {
        allGames.forEach(game => {
            items.push({
                title: game.title,
                icon: game.icon || '🎮',
                category: game.category || 'Game',
                url: game.url || './error.html'
            });
        });
    }
    
    if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) {
        allWebsites.forEach(site => {
            items.push({
                title: site.title,
                icon: site.icon || '🌐',
                category: site.category || 'Website',
                url: site.url || './error.html'
            });
        });
    }
    
    if (items.length === 0) {
        grid.innerHTML = '<div style="color: #888; text-align: center; padding: 40px; grid-column: 1 / -1;">No games or websites available.</div>';
    } else {
        items.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(40, 40, 40, 0.8);
                border: 1px solid rgba(60, 60, 60, 0.5);
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px)';
                this.style.borderColor = 'rgba(100, 100, 100, 0.8)';
                this.style.background = 'rgba(50, 50, 50, 0.9)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.borderColor = 'rgba(60, 60, 60, 0.5)';
                this.style.background = 'rgba(40, 40, 40, 0.8)';
            });
            
            card.addEventListener('click', function() {
                hideSelectionScreen();
                createNewTab(item.url, item.title);
            });
            
            card.innerHTML = `
                <div style="width: 50px; height: 50px; background: rgba(60,60,60,0.8);
                            border-radius: 10px; display: flex; align-items: center;
                            justify-content: center; font-size: 24px; margin-bottom: 12px;">
                    ${item.icon}
                </div>
                <h3 style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 6px;">
                    ${item.title}
                </h3>
                <span style="font-size: 12px; color: #888; background: rgba(60,60,60,0.5);
                             padding: 3px 10px; border-radius: 12px;">
                    ${item.category.toUpperCase()}
                </span>
            `;
            
            grid.appendChild(card);
        });
    }
    
    selectionScreen.appendChild(header);
    selectionScreen.appendChild(grid);
    
    const container = document.getElementById('iframe-container');
    if (container) {
        container.appendChild(selectionScreen);
    }
}

function hideSelectionScreen() {
    const selectionScreen = document.getElementById('selection-screen');
    if (selectionScreen) {
        selectionScreen.style.display = 'none';
    }
    
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) {
        newTabBtn.style.background = 'none';
        newTabBtn.style.border = 'none';
    }
}

function createNewTab(url, title) {
    isSelectingNewTab = false;
    hideSelectionScreen();
    
    tabCounter++;
    const tabId = `tab-${tabCounter}`;
    
    browserTabs.push({ id: tabId, url, title });
    
    const tab = document.createElement('div');
    tab.className = 'browser-tab';
    tab.dataset.tabId = tabId;
    tab.style.cssText = `
        background: rgba(25, 25, 25, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom: none;
        border-radius: 10px 10px 0 0;
        padding: 6px 12px;
        min-width: 120px;
        max-width: 200px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: -1px;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
    `;
    
    let icon = '🌐';
    if (Array.isArray(allGames)) {
        const game = allGames.find(g => g.title === title);
        if (game && game.icon) icon = game.icon;
    }
    if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) {
        const website = allWebsites.find(w => w.title === title);
        if (website && website.icon) icon = website.icon;
    }
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 14px; flex-shrink: 0;';
    iconSpan.textContent = icon;
    
    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = `
        flex: 1;
        font-size: 12px;
        color: rgba(255,255,255,0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    titleSpan.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        transition: all 0.2s;
        flex-shrink: 0;
        margin-left: auto;
    `;
    
    closeBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.1)';
        this.style.color = '#ff6b6b';
    });
    
    closeBtn.addEventListener('mouseleave', function() {
        this.style.background = 'none';
        this.style.color = 'rgba(255,255,255,0.6)';
    });
    
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeTab(tabId);
    });
    
    tab.appendChild(iconSpan);
    tab.appendChild(titleSpan);
    tab.appendChild(closeBtn);
    
    tab.addEventListener('click', function() {
        switchToTab(tabId);
    });
    
    const tabBar = document.getElementById('tab-bar');
    const newTabBtn = document.getElementById('new-tab-btn');
    
    if (tabBar && newTabBtn) {
        tabBar.insertBefore(tab, newTabBtn);
    }
    
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${tabId}`;
    iframe.src = url;
    iframe.title = title;
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background: #000;
        border-radius: 0 0 12px 12px;
        display: none;
        position: absolute;
        top: 0;
        left: 0;
    `;
    
    const container = document.getElementById('iframe-container');
    if (container) {
        container.appendChild(iframe);
    }
    
    switchToTab(tabId);
}

function switchToTab(tabId) {
    activeTabId = tabId;
    isSelectingNewTab = false;
    hideSelectionScreen();
    
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) {
        newTabBtn.style.background = 'none';
        newTabBtn.style.border = 'none';
    }
    
    const allTabs = document.querySelectorAll('.browser-tab');
    allTabs.forEach(tab => {
        if (tab.dataset.tabId === tabId) {
            tab.style.background = 'rgba(25, 25, 25, 0.95)';
            tab.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        } else {
            tab.style.background = 'rgba(50, 50, 50, 0.7)';
            tab.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    });
    
    const allIframes = document.querySelectorAll('#iframe-container iframe');
    allIframes.forEach(iframe => {
        if (iframe.id === `iframe-${tabId}`) {
            iframe.style.display = 'block';
        } else {
            iframe.style.display = 'none';
        }
    });
    
    const tabData = browserTabs.find(t => t.id === tabId);
    const urlText = document.getElementById('url-text');
    if (tabData && urlText) {
        urlText.textContent = tabData.url;
    }
}

function closeTab(tabId) {
    browserTabs = browserTabs.filter(t => t.id !== tabId);
    
    const tab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tab) tab.remove();
    
    const iframe = document.getElementById(`iframe-${tabId}`);
    if (iframe) iframe.remove();
    
    if (activeTabId === tabId) {
        if (browserTabs.length > 0) {
            switchToTab(browserTabs[browserTabs.length - 1].id);
        } else {
            closeBrowser();
        }
    }
}

function closeBrowser() {
    const overlay = document.getElementById('game-iframe-overlay');
    const browserWindow = document.getElementById('browser-window');
    
    if (browserWindow) browserWindow.style.transform = 'scale(0.8)';
    if (overlay) overlay.style.opacity = '0';
    
    setTimeout(() => {
        if (overlay) overlay.remove();
        document.body.style.overflow = 'auto';
        browserTabs = [];
        activeTabId = null;
        tabCounter = 0;
        isSelectingNewTab = false;
    }, 300);
    
    if (window.starManager) {
       window.starManager.init();
       console.log('Rendering Stars');
   }
   
}

function createNavButtons() {
    const nav = document.createElement('div');
    nav.style.cssText = 'display: flex; gap: 4px;';
    
    const icons = ['←', '→', '↻'];
    icons.forEach((icon, i) => {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: rgba(255,255,255,0.8);
            transition: all 0.2s;
        `;
        
        btn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.1)';
            this.style.color = '#fff';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.background = 'none';
            this.style.color = 'rgba(255,255,255,0.8)';
        });
        
        if (i === 2) {
            btn.addEventListener('click', function() {
                const iframe = document.getElementById(`iframe-${activeTabId}`);
                if (iframe) {
                    this.style.transform = 'rotate(360deg)';
                    iframe.src = iframe.src;
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 600);
                }
            });
        }
        
        nav.appendChild(btn);
    });
    
    return nav;
}

function createAddressBar() {
    const bar = document.createElement('div');
    bar.style.cssText = `
        flex: 1;
        background: rgba(55,55,55,0.8);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 24px;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    const lockIcon = document.createElement('span');
    lockIcon.style.cssText = 'font-size: 12px; opacity: 0.7;';
    lockIcon.textContent = '🔒';
    
    const urlText = document.createElement('span');
    urlText.id = 'url-text';
    urlText.style.cssText = `
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        color: rgba(255,255,255,0.9);
    `;
    urlText.textContent = '';
    
    bar.appendChild(lockIcon);
    bar.appendChild(urlText);
    
    return bar;
}

function loadFavorites() {
    try {
        const saved = localStorage.getItem('vaultFavorites');
        favorites = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('vaultFavorites', JSON.stringify(favorites));
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
                openGameIframe(favorite.url, favorite.title);
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