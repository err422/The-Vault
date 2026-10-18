/**
 * @fileoverview Multi-tab Web Browser for The Web Vault WebOS.
 *
 * Every tab's page area is the Scramjet proxy. Each tab owns one iframe that loads
 * https://proxy.thewebvault.org/embed.html; this app talks to it with postMessage:
 *
 *   app   -> embed : { type: 'go', url }        load a URL through the proxy
 *   embed -> app   : { type: 'ready' }          Scramjet is initialised
 *   embed -> app   : { type: 'urlchange', url } the proxied page navigated
 *
 * @module os/apps/BrowserApp
 */

export const AppManifest = {
  id: 'browser',
  name: 'Vault Browser',
  icon: '🌐',
  category: 'Utility',
  version: '3.0.0',
  singleton: false,
  defaultSize: { width: 900, height: 600 },
  minSize: { width: 440, height: 320 },
  menus: [
    {
      label: 'Tab',
      items: [
        { label: 'New Tab', action: 'browser:new-tab', shortcut: '⌘T' },
        { label: 'Close Tab', action: 'browser:close-tab', shortcut: '⌘W' }
      ]
    },
    {
      label: 'Navigation',
      items: [
        { label: 'Reload', action: 'browser:reload', shortcut: '⌘R' },
        { label: 'Go Home', action: 'browser:home' }
      ]
    }
  ],

  mount(containerEl, context) {
    // ---- Proxy configuration -------------------------------------------------
    const PROXY_ORIGIN = 'https://proxy.thewebvault.org';
    const EMBED_URL = `${PROXY_ORIGIN}/embed.html`;
    const SEARCH_URL = 'https://duckduckgo.com/?q=';    const FRAME_ALLOW =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';

    const initialUrl = context?.launchOptions?.url || 'about:home';
    const initialTitle = context?.launchOptions?.title || 'Home';

    // Each tab: { id, title, url, history, histIdx, frameEl, ready, queued }
    let tabs = [
      {
        id: 1, title: initialTitle, url: initialUrl,
        history: [initialUrl], histIdx: 0,
        frameEl: null, ready: false, queued: null
      }
    ];
    let activeTabId = 1;
    let nextTabId = 2;

    const BOOKMARKS = [
      { name: 'Vault Hub', url: 'vault:hub', icon: '🏠' },
      { name: 'Google', url: 'https://www.google.com/', icon: '🔍' },
      { name: 'DuckDuckGo', url: 'https://duckduckgo.com/', icon: '🦆' },
      { name: 'Wikipedia', url: 'https://en.wikipedia.org/', icon: '📖' }
    ];

    containerEl.innerHTML = `
      <div class="browser-app-root" style="display:flex; flex-direction:column; height:100%; background:#1a1625; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Tab Strip -->
        <div class="browser-tabs-bar" style="display:flex; align-items:flex-end; gap:4px; height:36px; padding:0 8px; background:rgba(15,11,26,0.9); border-bottom:1px solid rgba(255,255,255,0.08); overflow-x:auto;">
          <div id="tab-headers-container" style="display:flex; align-items:flex-end; gap:4px;"></div>
          <button id="browser-add-tab-btn" style="width:26px; height:26px; margin-bottom:4px; border:none; border-radius:6px; background:rgba(255,255,255,0.06); color:#c4b5fd; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
        </div>

        <!-- Navigation Bar -->
        <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(26,18,44,0.95); border-bottom:1px solid rgba(168,85,247,0.18);">
          <div style="display:flex; gap:4px;">
            <button id="browser-back-btn" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">←</button>
            <button id="browser-fwd-btn" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">→</button>
            <button id="browser-reload-btn" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">↻</button>
          </div>

          <!-- URL / Search Omnibox -->
          <div style="position:relative; flex:1;">
            <input type="text" id="browser-url-input" style="width:100%; height:32px; padding:0 12px 0 32px; border-radius:16px; border:1px solid rgba(168,85,247,0.25); background:rgba(15,11,26,0.85); color:#f5f3ff; font-size:12.5px; outline:none;" placeholder="Enter web address or search term...">
            <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:12px; opacity:0.6;">🔒</span>
          </div>

          <!-- Popout button -->
          <button id="browser-popout-btn" title="Open the real address in an external tab (leaves the proxy)" style="height:30px; padding:0 10px; border:1px solid rgba(168,85,247,0.3); border-radius:8px; background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:11px; cursor:pointer; white-space:nowrap;">Pop Out ↗</button>
        </div>

        <!-- Bookmarks Bar -->
        <div style="display:flex; gap:6px; padding:4px 12px; background:rgba(15,11,26,0.5); border-bottom:1px solid rgba(255,255,255,0.04); overflow-x:auto;">
          ${BOOKMARKS.map(bm => `
            <button class="browser-bm-btn" data-url="${bm.url}" style="display:flex; align-items:center; gap:5px; padding:3px 10px; border-radius:6px; border:none; background:transparent; color:#a79bc8; font-size:11.5px; cursor:pointer; white-space:nowrap;">
              <span>${bm.icon}</span>
              <span>${bm.name}</span>
            </button>
          `).join('')}
        </div>

        <!-- Browser View Area: home screen + one proxy iframe per tab -->
        <div id="browser-viewport" style="flex:1; position:relative; overflow:hidden; background:#07050c;">
          <div id="browser-home" style="position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px; background:radial-gradient(ellipse at 50% 40%, #1a0b33, #07050c); overflow:auto;">
            <div style="font-size:48px; margin-bottom:12px;">🌐</div>
            <h2 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#fff;">Vault Browser</h2>
            <p style="margin:0 0 24px 0; color:#c4b5fd; font-size:13px; max-width:420px;">Type an address or a search above. Every page loads through the Vault proxy.</p>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; max-width:600px; width:100%;">
              ${BOOKMARKS.map(bm => `
                <div class="home-bm-card" data-url="${bm.url}" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(168,85,247,0.18); border-radius:12px; cursor:pointer;">
                  <span style="font-size:26px;">${bm.icon}</span>
                  <span style="font-size:12px; font-weight:500; color:#e8e0f0;">${bm.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    const tabHeadersContainer = containerEl.querySelector('#tab-headers-container');
    const urlInput = containerEl.querySelector('#browser-url-input');
    const viewport = containerEl.querySelector('#browser-viewport');
    const homeEl = containerEl.querySelector('#browser-home');
    const backBtn = containerEl.querySelector('#browser-back-btn');
    const fwdBtn = containerEl.querySelector('#browser-fwd-btn');
    const reloadBtn = containerEl.querySelector('#browser-reload-btn');
    const popoutBtn = containerEl.querySelector('#browser-popout-btn');
    const addTabBtn = containerEl.querySelector('#browser-add-tab-btn');

    const getActiveTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];
    const isHomeUrl = (url) => url === 'about:home' || url === 'vault:hub';
    const hostOf = (url) => {
      try { return new URL(url).hostname || url; } catch { return url; }
    };

    // ---- Proxy frames --------------------------------------------------------

    const createFrame = (tab) => {
      const el = document.createElement('iframe');
      el.allow = FRAME_ALLOW;
      el.allowFullscreen = true;
      el.style.cssText =
        'position:absolute; inset:0; width:100%; height:100%; border:none; background:#07050c; display:none;';
      viewport.appendChild(el);
      el.src = EMBED_URL;
      tab.frameEl = el;
      tab.ready = false;
    };

    const sendToFrame = (tab, message) => {
      tab.frameEl?.contentWindow?.postMessage(message, PROXY_ORIGIN);
    };

    /** Load a URL in a tab's proxy frame, waiting for the frame to be ready if needed. */
    const loadInTab = (tab, url) => {
      if (!tab.frameEl) createFrame(tab);
      if (tab.ready) {
        sendToFrame(tab, { type: 'go', url });
      } else {
        tab.queued = url;
      }
    };

    const onMessage = (e) => {
      // Stop listening once this window has been closed.
      if (!containerEl.isConnected) {
        window.removeEventListener('message', onMessage);
        return;
      }
      if (e.origin !== PROXY_ORIGIN) return;
      const tab = tabs.find(t => t.frameEl && t.frameEl.contentWindow === e.source);
      if (!tab) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'ready') {
        tab.ready = true;
        if (tab.queued) {
          sendToFrame(tab, { type: 'go', url: tab.queued });
          tab.queued = null;
        }
      } else if (data.type === 'urlchange' && typeof data.url === 'string') {
        // Navigations we started ourselves already set tab.url; only record new ones
        // (link clicks, redirects inside the proxied page).
        if (data.url !== tab.url) {
          tab.url = data.url;
          tab.title = hostOf(data.url);
          tab.history = tab.history.slice(0, tab.histIdx + 1);
          tab.history.push(data.url);
          tab.histIdx = tab.history.length - 1;
        }
        renderTabs();
        if (tab.id === activeTabId) renderViewport();
      }
    };
    window.addEventListener('message', onMessage);

    // ---- Rendering -----------------------------------------------------------

    const renderTabs = () => {
      tabHeadersContainer.innerHTML = '';
      for (const tab of tabs) {
        const isActive = tab.id === activeTabId;
        const el = document.createElement('div');
        el.style.cssText = `
          display:flex; align-items:center; gap:8px; height:30px; padding:0 10px;
          border-radius:8px 8px 0 0; cursor:pointer; font-size:12px; max-width:180px; min-width:100px;
          border:1px solid ${isActive ? 'rgba(168,85,247,0.4)' : 'transparent'};
          border-bottom:none;
          background:${isActive ? '#1a1625' : 'rgba(255,255,255,0.03)'};
          color:${isActive ? '#fff' : '#a79bc8'};
        `;

        const icon = document.createElement('span');
        icon.style.fontSize = '13px';
        icon.textContent = '🌐';

        const label = document.createElement('span');
        label.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        label.textContent = tab.title;

        const close = document.createElement('button');
        close.className = 'tab-close';
        close.style.cssText = 'background:none; border:none; color:inherit; font-size:14px; cursor:pointer; padding:0 2px;';
        close.textContent = '×';

        el.append(icon, label, close);
        el.addEventListener('click', (e) => {
          if (e.target === close) {
            e.stopPropagation();
            closeTab(tab.id);
          } else {
            switchTab(tab.id);
          }
        });

        tabHeadersContainer.appendChild(el);
      }
    };

    const renderViewport = () => {
      const active = getActiveTab();
      const home = isHomeUrl(active.url);
      urlInput.value = home ? '' : active.url;

      backBtn.disabled = active.histIdx <= 0;
      backBtn.style.opacity = backBtn.disabled ? '0.3' : '1';
      fwdBtn.disabled = active.histIdx >= active.history.length - 1;
      fwdBtn.style.opacity = fwdBtn.disabled ? '0.3' : '1';

      homeEl.style.display = home ? 'flex' : 'none';
      for (const tab of tabs) {
        if (tab.frameEl) {
          tab.frameEl.style.display = (tab === active && !home) ? 'block' : 'none';
        }
      }
    };

    // ---- Navigation ----------------------------------------------------------

    const normalizeInput = (input) => {
      const url = input.trim();
      if (!url) return null;
      if (url.startsWith('about:') || url.startsWith('vault:')) return url;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.includes('.') && !/\s/.test(url)) return 'https://' + url;
      return SEARCH_URL + encodeURIComponent(url);
    };

    const navigate = (input) => {
      const url = normalizeInput(input);
      if (!url) return;

      const active = getActiveTab();
      active.url = url;
      active.title = isHomeUrl(url) ? 'Home' : hostOf(url);
      active.history = active.history.slice(0, active.histIdx + 1);
      active.history.push(url);
      active.histIdx = active.history.length - 1;

      if (!isHomeUrl(url)) loadInTab(active, url);
      renderTabs();
      renderViewport();
    };

    const switchTab = (id) => {
      activeTabId = id;
      renderTabs();
      renderViewport();
    };

    const closeTab = (id) => {
      const tab = tabs.find(t => t.id === id);
      if (!tab) return;

      if (tabs.length === 1) {
        // Reset the last tab to home
        tab.frameEl?.remove();
        tab.frameEl = null;
        tab.ready = false;
        tab.queued = null;
        tab.url = 'about:home';
        tab.title = 'Home';
        tab.history = ['about:home'];
        tab.histIdx = 0;
      } else {
        const idx = tabs.findIndex(t => t.id === id);
        tab.frameEl?.remove();
        tabs = tabs.filter(t => t.id !== id);
        if (activeTabId === id) {
          activeTabId = tabs[Math.max(0, idx - 1)].id;
        }
      }
      renderTabs();
      renderViewport();
    };

    const addTab = (url = 'about:home', title = 'New Tab') => {
      const newId = nextTabId++;
      tabs.push({
        id: newId, title, url, history: [url], histIdx: 0,
        frameEl: null, ready: false, queued: null
      });
      switchTab(newId);
      if (!isHomeUrl(url)) loadInTab(getActiveTab(), url);
    };

    // Omnibox submit
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(urlInput.value);
    });

    // Toolbar buttons
    backBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.histIdx > 0) {
        active.histIdx--;
        active.url = active.history[active.histIdx];
        if (!isHomeUrl(active.url)) loadInTab(active, active.url);
        active.title = isHomeUrl(active.url) ? 'Home' : hostOf(active.url);
        renderTabs();
        renderViewport();
      }
    });

    fwdBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.histIdx < active.history.length - 1) {
        active.histIdx++;
        active.url = active.history[active.histIdx];
        if (!isHomeUrl(active.url)) loadInTab(active, active.url);
        active.title = isHomeUrl(active.url) ? 'Home' : hostOf(active.url);
        renderTabs();
        renderViewport();
      }
    });

    reloadBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (!isHomeUrl(active.url)) loadInTab(active, active.url);
    });

    popoutBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.url && !isHomeUrl(active.url)) {
        window.open(active.url, '_blank', 'noopener,noreferrer');
      }
    });

    addTabBtn.addEventListener('click', () => addTab());

    // Bookmarks bar + home screen cards
    containerEl.querySelectorAll('.browser-bm-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.url));
    });
    homeEl.querySelectorAll('.home-bm-card').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.url));
    });

    // ---- Start ---------------------------------------------------------------
    renderTabs();
    renderViewport();
    if (!isHomeUrl(initialUrl)) loadInTab(getActiveTab(), initialUrl);
    renderViewport();
  }
};

export default AppManifest;