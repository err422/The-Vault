// browser.js - Multi-tab browser system for games and websites
// CodeHS-compatible version (no ES6 modules)

(function () {
    // State management
    let browserTabs = [];
    let activeTabId = null;
    let tabCounter = 0;
    let isSelectingNewTab = false;

    // Helper: Apply hover effects cleanly
    function addHoverEffect(element, defaultStyles, hoverStyles) {
        element.addEventListener('mouseenter', function () {
            Object.assign(this.style, hoverStyles);
        });
        element.addEventListener('mouseleave', function () {
            Object.assign(this.style, defaultStyles);
        });
    }

    // Public API
    window.openIframe = function (url, title) {
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
    };

    window.toggleFullscreen = function () {
        const bw = document.getElementById('browser-window');
        if (!bw) return;
        document.fullscreenElement ? document.exitFullscreen() : bw.requestFullscreen();
    };

    function createBrowserWindow() {
        const overlay = document.createElement('div');
        overlay.id = 'game-iframe-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        const browserWindow = document.createElement('div');
        browserWindow.id = 'browser-window';
        Object.assign(browserWindow.style, {
            width: '100%',
            height: '100%',
            background: 'rgba(42, 42, 42, 0.95)',
            borderRadius: '12px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transform: 'scale(0.8)',
            transition: 'transform 0.3s ease',
            position: 'relative'
        });

        const tabBar = document.createElement('div');
        tabBar.id = 'tab-bar';
        Object.assign(tabBar.style, {
            background: 'rgba(55, 55, 55, 0.9)',
            display: 'flex',
            alignItems: 'flex-end',
            height: '36px',
            padding: '0 8px',
            overflowX: 'auto',
            overflowY: 'hidden',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: '10',
            position: 'relative'
        });

        const newTabBtn = document.createElement('button');
        newTabBtn.id = 'new-tab-btn';
        newTabBtn.innerHTML = '+';
        newTabBtn.title = 'New Tab';
        Object.assign(newTabBtn.style, {
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 12px',
            marginLeft: '8px',
            transition: 'all 0.2s ease',
            borderRadius: '8px 8px 0 0',
            flexShrink: '0'
        });
        
        addHoverEffect(
            newTabBtn, 
            { background: 'none', color: 'rgba(255, 255, 255, 0.7)' }, 
            { background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }
        );
        newTabBtn.addEventListener('click', handleNewTabClick);
        tabBar.appendChild(newTabBtn);

        const toolbar = document.createElement('div');
        toolbar.id = 'toolbar';
        Object.assign(toolbar.style, {
            background: 'rgba(42, 42, 42, 0.95)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '44px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: '10',
            position: 'relative'
        });
        toolbar.append(createNavButtons(), createAddressBar());

        setTimeout(() => {
            if (typeof addBellScheduleIconToToolbar === 'function') addBellScheduleIconToToolbar();
            else if (typeof addBellIconToToolbar === 'function') addBellIconToToolbar();
            if (typeof addFavoritesIconToToolbar === 'function') addFavoritesIconToToolbar();
        }, 100);

        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'iframe-container';
        Object.assign(iframeContainer.style, {
            flex: '1',
            background: 'rgba(25, 25, 25, 0.95)',
            position: 'relative',
            overflow: 'hidden',
            zIndex: '1'
        });

        browserWindow.append(tabBar, toolbar, iframeContainer);

        const windowControls = document.createElement('div');
        Object.assign(windowControls.style, {
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '8px',
            zIndex: '1000'
        });

        const minimizeBtn = createControlButton('−', 'Minimize');
        const fsIframeBtn = createControlButton('⛶', 'Fullscreen (content only)');
        const maximizeBtn = createControlButton('□', 'Fullscreen — Alt+`');
        const closeBrowserBtn = createControlButton('×', 'Close');

        fsIframeBtn.addEventListener('click', function () {
            const iframe = document.getElementById(`iframe-${activeTabId}`);
            if (iframe) {
                document.fullscreenElement ? document.exitFullscreen() : iframe.requestFullscreen();
            }
        });

        maximizeBtn.addEventListener('click', toggleFullscreen);
        closeBrowserBtn.addEventListener('click', closeBrowser);
        addHoverEffect(
            closeBrowserBtn, 
            { background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)' }, 
            { background: 'rgba(239, 68, 68, 0.8)', color: '#fff' }
        );

        windowControls.append(minimizeBtn, fsIframeBtn, maximizeBtn, closeBrowserBtn);
        browserWindow.appendChild(windowControls);

        overlay.appendChild(browserWindow);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeBrowser();
        });

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            overlay.style.opacity = '1';
            browserWindow.style.transform = 'scale(1)';
        }, 10);

        // Keyboard Shortcut Handling (Alt+`)
        document._browserKeyHandler = function (e) {
            if (e.altKey && e.key === '`') {
                e.preventDefault();
                toggleFullscreen();
            }
        };
        document.addEventListener('keydown', document._browserKeyHandler);

        window._browserMessageHandler = function (e) {
            if (e.data && e.data.type === 'toggleFullscreen') toggleFullscreen();
        };
        window.addEventListener('message', document._browserMessageHandler);
    }

    function createControlButton(text, title) {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.title = title;
        Object.assign(btn.style, {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: text === '×' ? '22px' : text === '⛶' ? '14px' : '18px',
            color: 'rgba(255, 255, 255, 0.8)',
            transition: 'all 0.2s ease'
        });

        addHoverEffect(
            btn, 
            { background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.8)' }, 
            { background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }
        );
        return btn;
    }

    function handleNewTabClick() {
        isSelectingNewTab = true;
        activeTabId = null;

        document.querySelectorAll('.browser-tab').forEach(tab => {
            tab.style.background = 'rgba(50, 50, 50, 0.7)';
            tab.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });

        const newTabBtn = document.getElementById('new-tab-btn');
        if (newTabBtn) {
            Object.assign(newTabBtn.style, {
                background: 'rgba(25, 25, 25, 0.95)',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                borderRight: '1px solid rgba(255, 255, 255, 0.2)'
            });
        }

        const urlText = document.getElementById('url-text');
        if (urlText) urlText.textContent = 'Select a game or website...';

        document.querySelectorAll('#iframe-container iframe').forEach(iframe => {
            iframe.style.display = 'none';
        });

        showSelectionScreen();
    }

    function showSelectionScreen() {
        let sel = document.getElementById('selection-screen');
        if (sel) {
            sel.style.display = 'block';
            return;
        }

        sel = document.createElement('div');
        sel.id = 'selection-screen';
        Object.assign(sel.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(25, 25, 25, 0.98)',
            overflowY: 'auto',
            zIndex: '100'
        });

        const header = document.createElement('div');
        header.style.cssText = 'text-align:center; padding:30px 20px 20px;';
        header.innerHTML = `
            <h2 style="font-size:24px; color:#fff; margin-bottom:8px; font-weight:600;">Open New Tab</h2>
            <p style="color:#888; font-size:14px;">Select a game or website to open</p>
        `;

        const grid = document.createElement('div');
        Object.assign(grid.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            padding: '20px 30px 30px'
        });

        const items = [];
        if (typeof allGames !== 'undefined' && Array.isArray(allGames)) {
            allGames.forEach(g => items.push({ title: g.title, icon: g.icon || '🎮', category: g.category || 'Game', url: g.url || './error.html' }));
        }
        if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) {
            allWebsites.forEach(s => items.push({ title: s.title, icon: s.icon || '🌐', category: s.category || 'Website', url: s.url || './error.html' }));
        }

        if (items.length === 0) {
            grid.innerHTML = '<div style="color:#888; text-align:center; padding:40px; grid-column:1/-1;">No games or websites available.</div>';
        } else {
            items.forEach(item => {
                const card = document.createElement('div');
                Object.assign(card.style, {
                    background: 'rgba(40, 40, 40, 0.8)',
                    border: '1px solid rgba(60, 60, 60, 0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                });

                addHoverEffect(
                    card, 
                    { transform: 'translateY(0)', borderColor: 'rgba(60, 60, 60, 0.5)', background: 'rgba(40, 40, 40, 0.8)' },
                    { transform: 'translateY(-4px)', borderColor: 'rgba(100, 100, 100, 0.8)', background: 'rgba(50, 50, 50, 0.9)' }
                );

                card.addEventListener('click', function () {
                    hideSelectionScreen();
                    createNewTab(item.url, item.title);
                });

                card.innerHTML = `
                    <div style="width:50px; height:50px; background:rgba(60, 60, 60, 0.8); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:12px;">${item.icon}</div>
                    <h3 style="font-size:16px; font-weight:600; color:#fff; margin-bottom:6px;">${item.title}</h3>
                    <span style="font-size:12px; color:#888; background:rgba(60, 60, 60, 0.5); padding:3px 10px; border-radius:12px;">${item.category.toUpperCase()}</span>
                `;
                grid.appendChild(card);
            });
        }

        sel.append(header, grid);
        const container = document.getElementById('iframe-container');
        if (container) container.appendChild(sel);
    }

    function hideSelectionScreen() {
        const sel = document.getElementById('selection-screen');
        if (sel) sel.style.display = 'none';

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
        browserTabs.push({ id: tabId, url: url, title: title });

        const tab = document.createElement('div');
        tab.className = 'browser-tab';
        tab.dataset.tabId = tabId;
        Object.assign(tab.style, {
            background: 'rgba(25, 25, 25, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderBottom: 'none',
            borderRadius: '10px 10px 0 0',
            padding: '6px 12px',
            minWidth: '120px',
            maxWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-1px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: '0'
        });

        let icon = '🌐';
        if (typeof allGames !== 'undefined' && Array.isArray(allGames)) {
            const g = allGames.find(item => item.title === title);
            if (g && g.icon) icon = g.icon;
        }
        if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) {
            const w = allWebsites.find(item => item.title === title);
            if (w && w.icon) icon = w.icon;
        }

        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'font-size:14px; flex-shrink:0;';
        iconSpan.textContent = icon;

        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'flex:1; font-size:12px; color:rgba(255, 255, 255, 0.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        titleSpan.textContent = title;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            transition: 'all 0.2s',
            flexShrink: '0',
            marginLeft: 'auto'
        });

        addHoverEffect(
            closeBtn, 
            { background: 'none', color: 'rgba(255, 255, 255, 0.6)' }, 
            { background: 'rgba(255, 255, 255, 0.1)', color: '#ff6b6b' }
        );

        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeTab(tabId);
        });

        tab.append(iconSpan, titleSpan, closeBtn);
        tab.addEventListener('click', function () {
            switchToTab(tabId);
        });

        const tabBar = document.getElementById('tab-bar');
        const newTabBtn = document.getElementById('new-tab-btn');
        if (tabBar && newTabBtn) tabBar.insertBefore(tab, newTabBtn);

        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${tabId}`;
        iframe.src = url;
        iframe.title = title;
        iframe.allow = 'fullscreen';
        iframe.allowFullscreen = true;
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#000',
            borderRadius: '0 0 12px 12px',
            display: 'none',
            position: 'absolute',
            top: '0',
            left: '0'
        });

        const container = document.getElementById('iframe-container');
        if (container) container.appendChild(iframe);

        switchToTab(tabId);

        if (typeof startPlaytimeTracking === 'function') {
            startPlaytimeTracking(title);
        }
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

        document.querySelectorAll('.browser-tab').forEach(tab => {
            const isActive = tab.dataset.tabId === tabId;
            tab.style.background = isActive ? 'rgba(25, 25, 25, 0.95)' : 'rgba(50, 50, 50, 0.7)';
            tab.style.borderColor = isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
        });

        document.querySelectorAll('#iframe-container iframe').forEach(iframe => {
            iframe.style.display = iframe.id === `iframe-${tabId}` ? 'block' : 'none';
        });

        const tabData = browserTabs.find(t => t.id === tabId);
        const urlText = document.getElementById('url-text');

        if (tabData && urlText) urlText.textContent = tabData.url;
        if (tabData && typeof startPlaytimeTracking === 'function') {
            startPlaytimeTracking(tabData.title);
        }
    }

    function closeTab(tabId) {
        const tabData = browserTabs.find(t => t.id === tabId);
        if (tabData && tabData.id === `tab-${tabCounter}` && typeof stopPlaytimeTracking === 'function') {
            stopPlaytimeTracking();
        }

        browserTabs = browserTabs.filter(t => t.id !== tabId);

        const tab = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tab) tab.remove();

        const iframe = document.getElementById(`iframe-${tabId}`);
        if (iframe) iframe.remove();

        if (activeTabId === tabId) {
            browserTabs.length > 0 ? switchToTab(browserTabs[browserTabs.length - 1].id) : closeBrowser();
        }
    }

    function closeBrowser() {
        if (document._browserKeyHandler) {
            document.removeEventListener('keydown', document._browserKeyHandler);
            delete document._browserKeyHandler;
        }
        if (window._browserMessageHandler) {
            window.removeEventListener('message', window._browserMessageHandler);
            delete window._browserMessageHandler;
        }

        const overlay = document.getElementById('game-iframe-overlay');
        const bw = document.getElementById('browser-window');

        if (bw) bw.style.transform = 'scale(0.8)';
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
        nav.style.cssText = 'display:flex; gap:4px;';

        ['←', '→', '↻'].forEach((icon, i) => {
            const btn = document.createElement('button');
            btn.innerHTML = icon;
            Object.assign(btn.style, {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.2s'
            });

            addHoverEffect(
                btn, 
                { background: 'none', color: 'rgba(255, 255, 255, 0.8)' }, 
                { background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }
            );

            if (i === 2) { // Reload action
                btn.addEventListener('click', function () {
                    const iframe = document.getElementById(`iframe-${activeTabId}`);
                    if (iframe) {
                        this.style.transform = 'rotate(360deg)';
                        iframe.src = iframe.src;
                        setTimeout(() => { this.style.transform = ''; }, 600);
                    }
                });
            }
            nav.appendChild(btn);
        });

        return nav;
    }

    function createAddressBar() {
        const bar = document.createElement('div');
        Object.assign(bar.style, {
            flex: '1',
            background: 'rgba(55, 55, 55, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '24px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });

        const lockIcon = document.createElement('span');
        lockIcon.style.cssText = 'font-size:12px; opacity:0.7;';
        lockIcon.textContent = '🔒';

        const urlText = document.createElement('span');
        urlText.id = 'url-text';
        urlText.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; color:rgba(255, 255, 255, 0.9);';
        urlText.textContent = '';

        bar.append(lockIcon, urlText);
        return bar;
    }
})();