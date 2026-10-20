/**
 * @fileoverview Multi-tab Web Browser for The Web Vault WebOS.
 *
 * Each tab can toggle between two channels:
 * - Proxy Mode (default): Loads https://proxy.thewebvault.org/embed.html and communicates via postMessage.
 * - Direct Mode: Loads the target URL directly into the tab's iframe.
 *
 * @module os/apps/BrowserApp
 */

export const AppManifest = {
  id: 'browser',
  name: 'Vault Browser',
  icon: '🌐',
  category: 'Utility',
  version: '3.1.0',
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
    const SEARCH_URL = 'https://duckduckgo.com/?q=';
    const FRAME_ALLOW =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';

    const initialUrl = context?.launchOptions?.url || 'about:home';
    const initialTitle = context?.launchOptions?.title || 'Home';

    // Each tab: { id, title, url, history, histIdx, frameEl, frameMode, useProxy, ready, queued }
    let tabs = [
      {
        id: 1, title: initialTitle, url: initialUrl,
        history: [initialUrl], histIdx: 0,
        frameEl: null, frameMode: null, useProxy: true, ready: false, queued: null
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

          <!-- Channel Toggle Button (Proxy vs Direct) -->
          <button id="browser-mode-btn" title="Toggle between Vault Proxy and Direct iframe loading" style="height:30px; padding:0 12px; border-radius:8px; font-size:11.5px; font-weight:500; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:6px; transition:all 0.15s ease;"></button>
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

        <!-- Browser View Area: home screen + one iframe per tab -->
        <div id="browser-viewport" style="flex:1; position:relative; overflow:hidden; background:#07050c;">
          <div id="browser-home" style="position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px; background:radial-gradient(ellipse at 50% 40%, #1a0b33, #07050c); overflow:auto;">
            <div style="font-size:48px; margin-bottom:12px;">🌐</div>
            <h2 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#fff;">Vault Browser</h2>
            <p id="browser-home-desc" style="margin:0 0 24px 0; color:#c4b5fd; font-size:13px; max-width:420px;">Type an address or a search above. Use the toggle in the toolbar to switch between Proxy and Direct modes.</p>
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
    const modeBtn = containerEl.querySelector('#browser-mode-btn');
    const addTabBtn = containerEl.querySelector('#browser-add-tab-btn');

    const getActiveTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];
    const isHomeUrl = (url) => url === 'about:home' || url === 'vault:hub';
    const hostOf = (url) => {
      try { return new URL(url).hostname || url; } catch { return url; }
    };

    // ---- Iframes (Proxy & Direct) --------------------------------------------

    const ensureFrameElement = (tab) => {
      if (!tab.frameEl) {
        const el = document.createElement('iframe');
        el.allow = FRAME_ALLOW;
        el.allowFullscreen = true;
        el.style.cssText =
          'position:absolute; inset:0; width:100%; height:100%; border:none; background:#07050c; display:none;';
        viewport.appendChild(el);
        tab.frameEl = el;
      }
    };

    const sendToFrame = (tab, message) => {
      tab.frameEl?.contentWindow?.postMessage(message, PROXY_ORIGIN);
    };

    /** Load a URL in a tab's frame according to its current mode (Proxy vs Direct). */
    const loadInTab = (tab, url) => {
      ensureFrameElement(tab);

      if (tab.useProxy) {
        // Switch iframe to Scramjet embed if it wasn't already in proxy mode
        if (tab.frameMode !== 'proxy') {
          tab.frameMode = 'proxy';
          tab.ready = false;
          tab.queued = url;
          tab.frameEl.src = EMBED_URL;
          return;
        }

        if (tab.ready) {
          sendToFrame(tab, { type: 'go', url });
        } else {
          tab.queued = url;
        }
      } else {
        // Direct mode: bypass proxy and load URL straight into the iframe
        tab.frameMode = 'direct';
        tab.ready = false;
        tab.queued = null;
        tab.frameEl.src = url;
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
      if (!tab || !tab.useProxy) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'ready') {
        tab.ready = true;
        if (tab.queued) {
          sendToFrame(tab, { type: 'go', url: tab.queued });
          tab.queued = null;
        }
      } else if (data.type === 'urlchange' && typeof data.url === 'string') {
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

    const renderModeToggle = (active) => {
      if (active.useProxy) {
        modeBtn.innerHTML = '<span>🛡️</span><span>Proxy</span>';
        modeBtn.style.background = 'rgba(139, 92, 246, 0.2)';
        modeBtn.style.border = '1px solid rgba(168, 85, 247, 0.45)';
        modeBtn.style.color = '#d8b4fe';
        modeBtn.title = 'Channel: Vault Proxy (Click to switch to Direct iframe)';
      } else {
        modeBtn.innerHTML = '<span>⚡</span><span>Direct</span>';
        modeBtn.style.background = 'rgba(245, 158, 11, 0.15)';
        modeBtn.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        modeBtn.style.color = '#fcd34d';
        modeBtn.title = 'Channel: Direct Iframe (Click to switch to Vault Proxy)';
      }
    };

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
        icon.textContent = tab.useProxy ? '🌐' : '⚡';

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

      renderModeToggle(active);

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
        tab.frameMode = null;
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
      // Inherit the current tab's channel preference when opening a new tab
      const defaultProxyState = getActiveTab()?.useProxy ?? true;
      tabs.push({
        id: newId, title, url, history: [url], histIdx: 0,
        frameEl: null, frameMode: null, useProxy: defaultProxyState, ready: false, queued: null
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

    // Toggle between Proxy and Direct channels
    modeBtn.addEventListener('click', () => {
      const active = getActiveTab();
      active.useProxy = !active.useProxy;
      if (!isHomeUrl(active.url)) {
        loadInTab(active, active.url);
      }
      renderTabs();
      renderViewport();
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
