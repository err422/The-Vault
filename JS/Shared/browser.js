// browser.js - Multi-tab browser system for games and websites
// CodeHS-compatible version (no ES6 modules)

// Browser state
let browserTabs = [];
let activeTabId = null;
let tabCounter = 0;
let isSelectingNewTab = false;

function openIframe(url, title) {
    console.log('Opening:', url, title);
    if (window.starManager) { window.starManager.remove(); console.log('Unloading Stars'); }
    let overlay = document.getElementById('game-iframe-overlay');
    if (!overlay) { createBrowserWindow(); overlay = document.getElementById('game-iframe-overlay'); }
    isSelectingNewTab = false;
    createNewTab(url, title);
}

function createBrowserWindow() {
    const overlay = document.createElement('div');
    overlay.id = 'game-iframe-overlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(10,10,10,0.95);z-index:9999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(8px);opacity:0;transition:opacity 0.3s ease;`;
    const browserWindow = document.createElement('div');
    browserWindow.id = 'browser-window';
    browserWindow.style.cssText = `width:90%;height:90%;max-width:1200px;max-height:800px;background:rgba(42,42,42,0.95);border-radius:12px;box-shadow:0 25px 80px rgba(0,0,0,0.8);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,0.1);transform:scale(0.8);transition:transform 0.3s ease;position:relative;`;
    const tabBar = document.createElement('div');
    tabBar.id = 'tab-bar';
    tabBar.style.cssText = `background:rgba(55,55,55,0.9);display:flex;align-items:flex-end;height:36px;padding:0 8px;overflow-x:auto;overflow-y:hidden;border-bottom:1px solid rgba(255,255,255,0.1);z-index:10;position:relative;`;
    const newTabBtn = document.createElement('button');
    newTabBtn.id = 'new-tab-btn';
    newTabBtn.innerHTML = '+';
    newTabBtn.title = 'New Tab';
    newTabBtn.style.cssText = `background:none;border:none;color:rgba(255,255,255,0.7);font-size:20px;cursor:pointer;padding:4px 12px;margin-left:8px;transition:all 0.2s ease;border-radius:8px 8px 0 0;flex-shrink:0;`;
    newTabBtn.addEventListener('mouseenter', function() { this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff'; });
    newTabBtn.addEventListener('mouseleave', function() { this.style.background='none'; this.style.color='rgba(255,255,255,0.7)'; });
    newTabBtn.addEventListener('click', handleNewTabClick);
    tabBar.appendChild(newTabBtn);
    const toolbar = document.createElement('div');
    toolbar.id = 'toolbar';
    toolbar.style.cssText = `background:rgba(42,42,42,0.95);padding:8px 16px;display:flex;align-items:center;gap:8px;height:44px;border-bottom:1px solid rgba(255,255,255,0.1);z-index:10;position:relative;`;
    toolbar.appendChild(createNavButtons());
    toolbar.appendChild(createAddressBar());
    setTimeout(() => {
        if (typeof addBellScheduleIconToToolbar === 'function') addBellScheduleIconToToolbar();
        else if (typeof addBellIconToToolbar === 'function') addBellIconToToolbar();
        if (typeof addFavoritesIconToToolbar === 'function') addFavoritesIconToToolbar();
    }, 100);
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'iframe-container';
    iframeContainer.style.cssText = `flex:1;background:rgba(25,25,25,0.95);position:relative;overflow:hidden;z-index:1;`;
    browserWindow.appendChild(tabBar);
    browserWindow.appendChild(toolbar);
    browserWindow.appendChild(iframeContainer);
    const windowControls = document.createElement('div');
    windowControls.style.cssText = `position:absolute;top:8px;right:8px;display:flex;gap:8px;z-index:1000;`;
    const minimizeBtn = createControlButton('−', 'Minimize');
    const fsIframeBtn = createControlButton('⛶', 'Fullscreen (content only)');
    const maximizeBtn = createControlButton('□', 'Maximize (with toolbar)');
    const closeBrowserBtn = createControlButton('×', 'Close');
    fsIframeBtn.addEventListener('click', function() {
        const iframe = document.getElementById(`iframe-${activeTabId}`);
        if (iframe) { document.fullscreenElement ? document.exitFullscreen() : iframe.requestFullscreen(); }
    });
    maximizeBtn.addEventListener('click', function() {
        const bw = document.getElementById('browser-window');
        if (bw) { document.fullscreenElement ? document.exitFullscreen() : bw.requestFullscreen(); }
    });
    closeBrowserBtn.addEventListener('click', closeBrowser);
    closeBrowserBtn.addEventListener('mouseenter', function() { this.style.background='rgba(239,68,68,0.8)'; this.style.color='#fff'; });
    windowControls.appendChild(minimizeBtn);
    windowControls.appendChild(fsIframeBtn);
    windowControls.appendChild(maximizeBtn);
    windowControls.appendChild(closeBrowserBtn);
    browserWindow.appendChild(windowControls);
    overlay.appendChild(browserWindow);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeBrowser(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    setTimeout(() => { overlay.style.opacity='1'; browserWindow.style.transform='scale(1)'; }, 10);
}

function createControlButton(text, title) {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.title = title;
    btn.style.cssText = `width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:${text==='×'?'22px':text==='⛶'?'14px':'18px'};color:rgba(255,255,255,0.8);transition:all 0.2s ease;`;
    btn.addEventListener('mouseenter', function() { this.style.background='rgba(255,255,255,0.2)'; this.style.color='#fff'; });
    btn.addEventListener('mouseleave', function() { this.style.background='rgba(255,255,255,0.1)'; this.style.color='rgba(255,255,255,0.8)'; });
    return btn;
}

function handleNewTabClick() {
    isSelectingNewTab = true;
    activeTabId = null;
    document.querySelectorAll('.browser-tab').forEach(tab => { tab.style.background='rgba(50,50,50,0.7)'; tab.style.borderColor='rgba(255,255,255,0.1)'; });
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) { newTabBtn.style.background='rgba(25,25,25,0.95)'; newTabBtn.style.borderTop='1px solid rgba(255,255,255,0.2)'; newTabBtn.style.borderLeft='1px solid rgba(255,255,255,0.2)'; newTabBtn.style.borderRight='1px solid rgba(255,255,255,0.2)'; }
    const urlText = document.getElementById('url-text');
    if (urlText) urlText.textContent = 'Select a game or website...';
    document.querySelectorAll('#iframe-container iframe').forEach(iframe => { iframe.style.display='none'; });
    showSelectionScreen();
}

function showSelectionScreen() {
    let sel = document.getElementById('selection-screen');
    if (sel) { sel.style.display='block'; return; }
    sel = document.createElement('div');
    sel.id = 'selection-screen';
    sel.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(25,25,25,0.98);overflow-y:auto;z-index:100;`;
    const header = document.createElement('div');
    header.style.cssText = `text-align:center;padding:30px 20px 20px;`;
    header.innerHTML = `<h2 style="font-size:24px;color:#fff;margin-bottom:8px;font-weight:600;">Open New Tab</h2><p style="color:#888;font-size:14px;">Select a game or website to open</p>`;
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;padding:20px 30px 30px;`;
    const items = [];
    if (typeof allGames !== 'undefined' && Array.isArray(allGames)) allGames.forEach(g => items.push({title:g.title,icon:g.icon||'🎮',category:g.category||'Game',url:g.url||'./error.html'}));
    if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) allWebsites.forEach(s => items.push({title:s.title,icon:s.icon||'🌐',category:s.category||'Website',url:s.url||'./error.html'}));
    if (items.length === 0) {
        grid.innerHTML = '<div style="color:#888;text-align:center;padding:40px;grid-column:1/-1;">No games or websites available.</div>';
    } else {
        items.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = `background:rgba(40,40,40,0.8);border:1px solid rgba(60,60,60,0.5);border-radius:12px;padding:20px;cursor:pointer;transition:all 0.3s ease;`;
            card.addEventListener('mouseenter', function() { this.style.transform='translateY(-4px)'; this.style.borderColor='rgba(100,100,100,0.8)'; this.style.background='rgba(50,50,50,0.9)'; });
            card.addEventListener('mouseleave', function() { this.style.transform='translateY(0)'; this.style.borderColor='rgba(60,60,60,0.5)'; this.style.background='rgba(40,40,40,0.8)'; });
            card.addEventListener('click', function() { hideSelectionScreen(); createNewTab(item.url, item.title); });
            card.innerHTML = `<div style="width:50px;height:50px;background:rgba(60,60,60,0.8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">${item.icon}</div><h3 style="font-size:16px;font-weight:600;color:#fff;margin-bottom:6px;">${item.title}</h3><span style="font-size:12px;color:#888;background:rgba(60,60,60,0.5);padding:3px 10px;border-radius:12px;">${item.category.toUpperCase()}</span>`;
            grid.appendChild(card);
        });
    }
    sel.appendChild(header);
    sel.appendChild(grid);
    const container = document.getElementById('iframe-container');
    if (container) container.appendChild(sel);
}

function hideSelectionScreen() {
    const sel = document.getElementById('selection-screen');
    if (sel) sel.style.display = 'none';
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) { newTabBtn.style.background='none'; newTabBtn.style.border='none'; }
}

function createNewTab(url, title) {
    isSelectingNewTab = false;
    hideSelectionScreen();
    tabCounter++;
    const tabId = `tab-${tabCounter}`;
    browserTabs.push({id:tabId, url, title});
    const tab = document.createElement('div');
    tab.className = 'browser-tab';
    tab.dataset.tabId = tabId;
    tab.style.cssText = `background:rgba(25,25,25,0.95);border:1px solid rgba(255,255,255,0.2);border-bottom:none;border-radius:10px 10px 0 0;padding:6px 12px;min-width:120px;max-width:200px;display:flex;align-items:center;gap:8px;margin-bottom:-1px;cursor:pointer;transition:all 0.2s ease;flex-shrink:0;`;
    let icon = '🌐';
    if (typeof allGames !== 'undefined' && Array.isArray(allGames)) { const g = allGames.find(g => g.title===title); if (g && g.icon) icon = g.icon; }
    if (typeof allWebsites !== 'undefined' && Array.isArray(allWebsites)) { const w = allWebsites.find(w => w.title===title); if (w && w.icon) icon = w.icon; }
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size:14px;flex-shrink:0;';
    iconSpan.textContent = icon;
    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = `flex:1;font-size:12px;color:rgba(255,255,255,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    titleSpan.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `background:none;border:none;width:18px;height:18px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(255,255,255,0.6);transition:all 0.2s;flex-shrink:0;margin-left:auto;`;
    closeBtn.addEventListener('mouseenter', function() { this.style.background='rgba(255,255,255,0.1)'; this.style.color='#ff6b6b'; });
    closeBtn.addEventListener('mouseleave', function() { this.style.background='none'; this.style.color='rgba(255,255,255,0.6)'; });
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeTab(tabId); });
    tab.appendChild(iconSpan);
    tab.appendChild(titleSpan);
    tab.appendChild(closeBtn);
    tab.addEventListener('click', function() { switchToTab(tabId); });
    const tabBar = document.getElementById('tab-bar');
    const newTabBtn = document.getElementById('new-tab-btn');
    if (tabBar && newTabBtn) tabBar.insertBefore(tab, newTabBtn);
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${tabId}`;
    iframe.src = url;
    iframe.title = title;
    iframe.style.cssText = `width:100%;height:100%;border:none;background:#000;border-radius:0 0 12px 12px;display:none;position:absolute;top:0;left:0;`;
    const container = document.getElementById('iframe-container');
    if (container) container.appendChild(iframe);
    switchToTab(tabId);
    if (typeof startPlaytimeTracking === 'function') startPlaytimeTracking(title);
}

function switchToTab(tabId) {
    activeTabId = tabId;
    isSelectingNewTab = false;
    hideSelectionScreen();
    const newTabBtn = document.getElementById('new-tab-btn');
    if (newTabBtn) { newTabBtn.style.background='none'; newTabBtn.style.border='none'; }
    document.querySelectorAll('.browser-tab').forEach(tab => {
        tab.style.background = tab.dataset.tabId===tabId ? 'rgba(25,25,25,0.95)' : 'rgba(50,50,50,0.7)';
        tab.style.borderColor = tab.dataset.tabId===tabId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
    });
    document.querySelectorAll('#iframe-container iframe').forEach(iframe => {
        iframe.style.display = iframe.id===`iframe-${tabId}` ? 'block' : 'none';
    });
    const tabData = browserTabs.find(t => t.id===tabId);
    const urlText = document.getElementById('url-text');
    if (tabData && urlText) urlText.textContent = tabData.url;
    if (tabData && typeof startPlaytimeTracking === 'function') startPlaytimeTracking(tabData.title);
}

function closeTab(tabId) {
    const tabData = browserTabs.find(t => t.id===tabId);
    if (tabData && tabData.id===`tab-${tabCounter}` && typeof stopPlaytimeTracking==='function') stopPlaytimeTracking();
    browserTabs = browserTabs.filter(t => t.id!==tabId);
    const tab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tab) tab.remove();
    const iframe = document.getElementById(`iframe-${tabId}`);
    if (iframe) iframe.remove();
    if (activeTabId===tabId) { browserTabs.length > 0 ? switchToTab(browserTabs[browserTabs.length-1].id) : closeBrowser(); }
}

function closeBrowser() {
    const overlay = document.getElementById('game-iframe-overlay');
    const bw = document.getElementById('browser-window');
    if (bw) bw.style.transform = 'scale(0.8)';
    if (overlay) overlay.style.opacity = '0';
    setTimeout(() => {
        if (overlay) overlay.remove();
        document.body.style.overflow = 'auto';
        browserTabs = []; activeTabId = null; tabCounter = 0; isSelectingNewTab = false;
    }, 300);
    if (window.starManager) { window.starManager.init(); console.log('Rendering Stars'); }
}

function createNavButtons() {
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;gap:4px;';
    ['←','→','↻'].forEach((icon, i) => {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.style.cssText = `width:32px;height:32px;border-radius:50%;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:rgba(255,255,255,0.8);transition:all 0.2s;`;
        btn.addEventListener('mouseenter', function() { this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff'; });
        btn.addEventListener('mouseleave', function() { this.style.background='none'; this.style.color='rgba(255,255,255,0.8)'; });
        if (i===2) btn.addEventListener('click', function() {
            const iframe = document.getElementById(`iframe-${activeTabId}`);
            if (iframe) { this.style.transform='rotate(360deg)'; iframe.src=iframe.src; setTimeout(()=>{ this.style.transform=''; }, 600); }
        });
        nav.appendChild(btn);
    });
    return nav;
}

function createAddressBar() {
    const bar = document.createElement('div');
    bar.style.cssText = `flex:1;background:rgba(55,55,55,0.8);border:1px solid rgba(255,255,255,0.2);border-radius:24px;padding:8px 16px;display:flex;align-items:center;gap:8px;`;
    const lockIcon = document.createElement('span');
    lockIcon.style.cssText = 'font-size:12px;opacity:0.7;';
    lockIcon.textContent = '🔒';
    const urlText = document.createElement('span');
    urlText.id = 'url-text';
    urlText.style.cssText = `flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;color:rgba(255,255,255,0.9);`;
    urlText.textContent = '';
    bar.appendChild(lockIcon);
    bar.appendChild(urlText);
    return bar;
}