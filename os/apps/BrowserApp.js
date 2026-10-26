/**
 * @fileoverview Multi-tab Web Browser with Scramjet Proxy for The Web Vault WebOS.
 *
 * Each tab supports two channels:
 * - Proxy Mode (default): Interception routing via https://proxy.thewebvault.org/embed.html
 *   and bidirectional postMessage communication. Avoids iframe headers (CSP, X-Frame-Options).
 * - Direct Mode: Loads the target URL straight into the tab iframe with fallback detection.
 *
 * @module os/apps/BrowserApp
 */

import { showBrowserGuide } from '../ui/BrowserGuide.js';
import AppRegistry from '../core/AppRegistry.js';

export const AppManifest = {
  id: 'browser',
  name: 'Vault Browser',
  icon: '🌐',
  category: 'Utility',
  version: '3.3.0',
  singleton: false,
  defaultSize: { width: 960, height: 640 },
  minSize: { width: 440, height: 320 },
  menus: [
    {
      label: 'Tab',
      items: [
        { label: 'New Tab', action: 'browser:new-tab', shortcut: 'Alt+T' },
        { label: 'Close Tab', action: 'browser:close-tab', shortcut: 'Alt+W' },
        { label: 'Reopen Closed Tab', action: 'browser:reopen-tab', shortcut: 'Alt+Shift+T' },
        { label: 'Next Tab', action: 'browser:next-tab', shortcut: 'Alt+Shift+Right' },
        { label: 'Previous Tab', action: 'browser:previous-tab', shortcut: 'Alt+Shift+Left' },
        { label: 'Keyboard Shortcuts', action: 'browser:shortcuts', shortcut: 'Alt+/' }
      ]
    },
    {
      label: 'Navigation',
      items: [
        { label: 'Focus Address Bar', action: 'browser:focus-address', shortcut: 'Alt+L' },
        { label: 'Back', action: 'browser:back', shortcut: 'Alt+Left' },
        { label: 'Forward', action: 'browser:forward', shortcut: 'Alt+Right' },
        { label: 'Reload', action: 'browser:reload', shortcut: 'Alt+R' },
        { label: 'Go Home', action: 'browser:home', shortcut: 'Alt+H' },
        { label: 'Toggle Fullscreen', action: 'browser:fullscreen', shortcut: 'Alt+Enter' },
        { label: 'Toggle Proxy Mode', action: 'browser:toggle-mode' }
      ]
    }
  ],

  mount(containerEl, context) {
    // ---- Proxy configuration -------------------------------------------------
    const PROXY_ORIGIN = 'https://proxy.thewebvault.org';
    const EMBED_URL = `${PROXY_ORIGIN}/embed.html`;
    const SEARCH_URL = 'https://duckduckgo.com/?q=';
    const FRAME_ALLOW =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share';

    const initialUrl = context?.launchOptions?.url || 'about:home';
    const initialTitle = context?.launchOptions?.title || 'Home';

    // Tabs state: { id, title, url, history, histIdx, frameEl, frameMode, useProxy, ready, queued, timer }
    let tabs = [
      {
        id: 1,
        title: initialTitle,
        url: initialUrl,
        history: [initialUrl],
        histIdx: 0,
        frameEl: null,
        frameMode: null,
        useProxy: true,
        ready: false,
        queued: null,
        timer: null
      }
    ];
    let activeTabId = 1;
    let nextTabId = 2;

    const BOOKMARKS = [
      { name: 'Vault Hub', url: 'vault:hub', icon: '🏠', desc: 'Browse all games & tools' },
      { name: 'Games', url: 'vault:games', icon: '🎮', desc: 'Vault game collection' },
      { name: 'Google', url: 'https://www.google.com/', icon: '🔍', desc: 'Search engine' },
      { name: 'DuckDuckGo', url: 'https://duckduckgo.com/', icon: '🦆', desc: 'Private search' },
      { name: 'YouTube', url: 'https://www.youtube.com/', icon: '📺', desc: 'Video platform' },
      { name: 'Wikipedia', url: 'https://en.wikipedia.org/', icon: '📖', desc: 'Free encyclopedia' },
      { name: 'Reddit', url: 'https://www.reddit.com/', icon: '💬', desc: 'Community discussions' },
      { name: 'GitHub', url: 'https://github.com/', icon: '🐱', desc: 'Code repository' },
      { name: 'Endis Proxy', url: 'https://endis.rest/', icon: '🔒', desc: 'Alternative proxy' }
    ];

    containerEl.innerHTML = `
      <div class="browser-app-root" style="display:flex; flex-direction:column; height:100%; background:#100b1a; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position:relative; overflow:hidden;">
        <!-- Tab Strip & Window Controls -->
        <div class="browser-tabs-bar os-window-titlebar" style="display:flex; align-items:flex-end; gap:8px; height:42px; min-height:42px; padding:0 8px 0 12px; background:rgba(12,8,20,0.96); border-bottom:1px solid rgba(255,255,255,0.08); overflow:hidden; cursor:grab; box-sizing:border-box;">
          <div id="browser-mac-controls" style="height:100%; display:flex; align-items:center; gap:8px; padding-right:6px; flex:0 0 auto;">
            <button id="browser-mac-close" aria-label="Close window" title="Close" style="width:12px;height:12px;min-width:12px;padding:0;border:0;border-radius:50%;background:#ff5f57;cursor:pointer;"></button>
            <button id="browser-mac-min" aria-label="Minimize window" title="Minimize" style="width:12px;height:12px;min-width:12px;padding:0;border:0;border-radius:50%;background:#febc2e;cursor:pointer;"></button>
            <button id="browser-mac-max" aria-label="Maximize window" title="Maximize" style="width:12px;height:12px;min-width:12px;padding:0;border:0;border-radius:50%;background:#28c840;cursor:pointer;"></button>
          </div>
          <div id="tab-headers-container" style="display:flex; align-items:flex-end; gap:4px; flex:0 1 auto; min-width:0; max-width:calc(100% - 120px); overflow-x:auto; scrollbar-width:none; height:100%;"></div>
          <button id="browser-add-tab-btn" title="New tab (Alt+T)" style="width:26px; height:26px; margin-bottom:4px; flex:0 0 auto; border:none; border-radius:6px; background:rgba(255,255,255,0.06); color:#c4b5fd; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s;">+</button>
        </div>

        <!-- Navigation Bar -->
        <div class="browser-navigation-bar" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 12px; background:rgba(22,14,36,0.96); border-bottom:1px solid rgba(168,85,247,0.18); box-sizing:border-box; position:relative; z-index:10;">
          <div style="display:flex; gap:4px; flex:0 0 auto;">
            <button id="browser-back-btn" title="Back" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">←</button>
            <button id="browser-fwd-btn" title="Forward" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">→</button>
            <button id="browser-reload-btn" title="Reload (Alt+R)" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">↻</button>
            <button id="browser-home-btn" title="Home" style="width:28px; height:28px; border:none; border-radius:6px; background:rgba(255,255,255,0.05); color:#c4b5fd; cursor:pointer;">🏠</button>
          </div>

          <!-- URL / Search Omnibox -->
          <div style="position:relative; flex:1 1 240px; min-width:0;">
            <input type="text" id="browser-url-input" style="box-sizing:border-box; display:block; width:100%; min-width:0; height:32px; padding:0 30px 0 32px; border-radius:16px; border:1px solid rgba(168,85,247,0.3); background:rgba(12,8,20,0.85); color:#f5f3ff; font-size:12.5px; outline:none; transition:border-color .15s, box-shadow .15s;" placeholder="Enter address or search with DuckDuckGo...">
            <span id="browser-ssl-icon" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:12px; opacity:0.75;" title="Security mode">🔒</span>
            <button id="browser-url-clear" title="Clear address" style="display:none; position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#a79bc8; cursor:pointer; font-size:14px; padding:0 4px;">×</button>
          </div>

          <!-- Mode Toggle Switch (Proxy vs Direct) -->
          <button id="browser-mode-btn" type="button" role="switch" aria-checked="true" title="Scramjet Proxy is ON. Avoids iframe blocking. Click to switch to Direct." style="height:32px; min-width:122px; flex:0 0 auto; padding:0 10px; border-radius:999px; border:1px solid rgba(168,85,247,.55); background:rgba(139,92,246,.2); color:#e9d5ff; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; display:flex; align-items:center; justify-content:space-between; gap:8px; transition:all .18s ease;">
            <span class="browser-mode-label">Proxy</span>
            <span class="browser-switch-track" aria-hidden="true" style="position:relative; width:34px; height:18px; border-radius:999px; background:#8b5cf6; flex:0 0 auto; transition:background .18s ease;">
              <span class="browser-switch-thumb" style="position:absolute; top:2px; left:18px; width:14px; height:14px; border-radius:50%; background:#fff; box-shadow:0 1px 3px #0006; transition:left .18s ease;"></span>
            </span>
            <span class="browser-mode-state">ON</span>
          </button>

          <!-- Utilities -->
          <button id="browser-popout-btn" title="Open current URL in an external browser tab" style="height:30px; padding:0 10px; border-radius:8px; border:1px solid rgba(168,85,247,.3); background:rgba(168,85,247,.1); color:#d8b4fe; font-size:12px; cursor:pointer; white-space:nowrap;">↗ Pop Out</button>
          <button id="browser-pin-btn" title="Pin this website to your WebOS desktop" style="height:30px; padding:0 10px; border-radius:8px; border:1px solid rgba(168,85,247,.3); background:rgba(168,85,247,.1); color:#d8b4fe; font-size:12px; cursor:pointer; white-space:nowrap;">📌 Pin</button>
          <button id="browser-help-btn" title="Browser & Scramjet proxy guide" style="height:30px; padding:0 10px; border-radius:8px; border:1px solid rgba(168,85,247,.3); background:rgba(168,85,247,.1); color:#d8b4fe; font-size:12px; cursor:pointer; white-space:nowrap;">? Help</button>
        </div>

        <!-- Bookmarks Bar -->
        <div style="display:flex; gap:6px; padding:4px 12px; background:rgba(12,8,20,0.55); border-bottom:1px solid rgba(255,255,255,0.05); overflow-x:auto;">
          ${BOOKMARKS.map(bm => `
            <button class="browser-bm-btn" data-url="${bm.url}" style="display:flex; align-items:center; gap:5px; padding:3px 10px; border-radius:6px; border:none; background:transparent; color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap; transition:background .12s;">
              <span>${bm.icon}</span>
              <span>${bm.name}</span>
            </button>
          `).join('')}
        </div>

        <!-- Progress Loading Indicator -->
        <div id="browser-loading-bar" style="position:absolute; top:86px; left:0; width:0%; height:2.5px; background:linear-gradient(90deg, #8b5cf6, #d946ef, #38bdf8); z-index:15; transition:width 0.25s ease, opacity 0.3s ease; opacity:0; pointer-events:none;"></div>

        <!-- Direct Mode Fallback Banner -->
        <div id="browser-direct-banner" style="display:none; align-items:center; justify-content:space-between; gap:10px; padding:6px 14px; background:rgba(217,119,6,0.92); color:#fff; font-size:12px; z-index:14; position:relative; border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>⚡ Direct Mode: If this website appears blank or restricts embedding, <button id="direct-enable-proxy" style="margin-left:6px; padding:3px 8px; border-radius:4px; border:none; background:#fff; color:#78350f; font-weight:700; cursor:pointer;">Switch to Proxy</button> or <button id="direct-popout" style="margin-left:4px; padding:3px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.5); background:transparent; color:#fff; cursor:pointer;">Open in New Tab ↗</button></span>
          <button id="direct-dismiss" style="background:none; border:none; color:#fff; font-size:16px; cursor:pointer; padding:0 4px;">×</button>
        </div>

        <!-- Proxy Status / Error Banner -->
        <div id="browser-proxy-banner" style="display:none; align-items:center; justify-content:space-between; gap:10px; padding:6px 14px; background:rgba(220,38,38,0.92); color:#fff; font-size:12px; z-index:14; position:relative; border-bottom:1px solid rgba(255,255,255,0.15);">
          <span id="proxy-banner-text">⚠️ Scramjet proxy is connecting...</span>
          <div style="display:flex; gap:6px;">
            <button id="proxy-btn-direct" style="padding:3px 8px; border-radius:4px; border:none; background:#fff; color:#991b1b; font-weight:700; cursor:pointer;">Try Direct Mode</button>
            <button id="proxy-btn-popout" style="padding:3px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.5); background:transparent; color:#fff; cursor:pointer;">Pop Out ↗</button>
            <button id="proxy-btn-retry" style="padding:3px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.5); background:transparent; color:#fff; cursor:pointer;">Retry</button>
            <button id="proxy-btn-dismiss" style="background:none; border:none; color:#fff; font-size:16px; cursor:pointer; padding:0 4px;">×</button>
          </div>
        </div>

        <!-- Browser View Area: Home screen + per-tab iframes -->
        <div id="browser-viewport" style="flex:1; position:relative; overflow:hidden; background:#07050c;">
          <!-- Home Screen -->
          <div id="browser-home" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:clamp(20px, 4vw, 40px); background:radial-gradient(ellipse at 50% 25%, rgba(139,92,246,0.22), transparent 55%), linear-gradient(155deg, #120924 0%, #080410 60%, #05020a 100%); overflow-y:auto; box-sizing:border-box;">
            <div style="width:min(100%, 720px); margin:auto; display:flex; flex-direction:column; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:#c4b5fd; font-size:11px; font-weight:800; letter-spacing:.2em; text-transform:uppercase;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></span>
                THE WEB VAULT · SCRAMJET PROXY BROWSER
              </div>
              <div style="font-size:44px; line-height:1; margin-bottom:12px; filter:drop-shadow(0 6px 20px rgba(139,92,246,0.3));">🌐</div>
              <h2 style="margin:0 0 8px 0; font-size:clamp(24px, 4vw, 32px); font-weight:800; color:#fff; letter-spacing:-.03em;">Browse without limits.</h2>
              <p style="margin:0 0 22px 0; color:#c4b5fd; font-size:13px; max-width:460px; line-height:1.5;">Search the web or launch any favorite. Bypasses iframe restrictions and security headers using the dedicated Scramjet proxy.</p>

              <!-- Central Search Form -->
              <form id="home-search-form" style="width:100%; max-width:540px; margin-bottom:28px; display:flex; gap:8px;">
                <div style="position:relative; flex:1;">
                  <input type="text" id="home-search-input" placeholder="Search freely with DuckDuckGo or enter URL..." style="width:100%; height:44px; padding:0 16px 0 40px; border-radius:12px; border:1px solid rgba(168,85,247,0.35); background:rgba(18,12,28,0.9); color:#fff; font-size:13.5px; outline:none; box-sizing:border-box; box-shadow:0 6px 20px rgba(0,0,0,0.35);">
                  <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:15px; opacity:0.6;">🔍</span>
                </div>
                <button type="submit" style="height:44px; padding:0 20px; border:none; border-radius:12px; background:linear-gradient(135deg, #8b5cf6, #a855f7); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 16px rgba(139,92,246,0.35); white-space:nowrap;">Go</button>
              </form>

              <!-- Bookmarks Grid -->
              <div style="width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:12px; font-weight:700; color:#eee7ff; letter-spacing:0.04em;">QUICK ACCESS</span>
                <span style="font-size:11px; color:#8b7aa8;">POPULAR DESTINATIONS</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; width:100%;">
                ${BOOKMARKS.map(bm => `
                  <div class="home-bm-card" data-url="${bm.url}" style="display:flex; flex-direction:column; align-items:flex-start; gap:8px; padding:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(168,85,247,0.18); border-radius:12px; cursor:pointer; text-align:left; transition:transform .15s, border-color .15s, background .15s;">
                    <span style="font-size:24px;">${bm.icon}</span>
                    <span style="font-size:12.5px; font-weight:600; color:#f5f3ff;">${bm.name}</span>
                    <span style="font-size:10.5px; color:#a79bc8; line-height:1.2;">${bm.desc}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Proxy Status Bar -->
              <div style="margin-top:24px; padding:8px 16px; border-radius:20px; background:rgba(139,92,246,0.1); border:1px solid rgba(168,85,247,0.25); display:flex; align-items:center; gap:8px; font-size:11.5px; color:#d8b4fe;">
                <span style="width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                <span>Active Service: <strong>proxy.thewebvault.org</strong> (Scramjet + BareMux Wisp)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook WindowFrame's actual drag region and traffic lights
    window.setTimeout(() => {
      const osWindow = containerEl.closest('.vault-window');
      if (!osWindow || !containerEl.isConnected) return;

      const nativeTitlebar = osWindow.querySelector('.window-titlebar');
      if (!nativeTitlebar) return;

      const nativeClose = nativeTitlebar.querySelector('.btn-close');
      const nativeMin = nativeTitlebar.querySelector('.btn-minimize');
      const nativeMax = nativeTitlebar.querySelector('.btn-maximize');
      const nativeDragRegion = nativeTitlebar.querySelector('.window-drag-region');
      const browserTitlebar = containerEl.querySelector('.browser-tabs-bar');

      if (nativeClose && nativeMin && nativeMax && nativeDragRegion && browserTitlebar) {
        browserTitlebar.style.position = 'relative';
        nativeDragRegion.style.position = 'absolute';
        nativeDragRegion.style.inset = '0';
        nativeDragRegion.style.zIndex = '0';
        browserTitlebar.prepend(nativeDragRegion);

        [
          containerEl.querySelector('#browser-mac-controls'),
          containerEl.querySelector('#tab-headers-container'),
          containerEl.querySelector('#browser-add-tab-btn')
        ].forEach(el => {
          if (!el) return;
          el.style.position = 'relative';
          el.style.zIndex = '1';
        });

        nativeTitlebar.style.display = 'none';

        browserTitlebar.addEventListener('dblclick', (event) => {
          if (event.target.closest('button, #tab-headers-container')) return;
          nativeMax.click();
        });
      }

      [
        [containerEl.querySelector('#browser-mac-close'), nativeClose],
        [containerEl.querySelector('#browser-mac-min'), nativeMin],
        [containerEl.querySelector('#browser-mac-max'), nativeMax]
      ].forEach(([custom, native]) => {
        if (!custom || !native) return;
        custom.addEventListener('pointerdown', (e) => e.stopPropagation());
        custom.addEventListener('mousedown', (e) => e.stopPropagation());
        custom.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          native.click();
        });
      });
    }, 0);

    const tabHeadersContainer = containerEl.querySelector('#tab-headers-container');
    const urlInput = containerEl.querySelector('#browser-url-input');
    const urlClear = containerEl.querySelector('#browser-url-clear');
    const sslIcon = containerEl.querySelector('#browser-ssl-icon');
    const viewport = containerEl.querySelector('#browser-viewport');
    const homeEl = containerEl.querySelector('#browser-home');
    const backBtn = containerEl.querySelector('#browser-back-btn');
    const fwdBtn = containerEl.querySelector('#browser-fwd-btn');
    const reloadBtn = containerEl.querySelector('#browser-reload-btn');
    const homeBtn = containerEl.querySelector('#browser-home-btn');
    const modeBtn = containerEl.querySelector('#browser-mode-btn');
    const popoutBtn = containerEl.querySelector('#browser-popout-btn');
    const pinBtn = containerEl.querySelector('#browser-pin-btn');
    const helpBtn = containerEl.querySelector('#browser-help-btn');
    const addTabBtn = containerEl.querySelector('#browser-add-tab-btn');
    const loadingBar = containerEl.querySelector('#browser-loading-bar');
    const directBanner = containerEl.querySelector('#browser-direct-banner');
    const proxyBanner = containerEl.querySelector('#browser-proxy-banner');
    const proxyBannerText = containerEl.querySelector('#proxy-banner-text');

    const getActiveTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];
    const isHomeUrl = (url) => url === 'about:home' || url === 'vault:hub' || url === 'vault:games';
    const hostOf = (url) => {
      try { return new URL(url).hostname || url; } catch { return url; }
    };

    // Share active page label with VaultNet presence
    const publishBrowserActivity = (tab = getActiveTab()) => {
      if (!tab) return;
      let pageLabel = '';
      if (!isHomeUrl(tab.url)) {
        pageLabel = String(tab.title || hostOf(tab.url) || 'Website').trim().slice(0, 80);
      }
      window.dispatchEvent(new CustomEvent('vaultnet:browser-activity', {
        detail: { title: pageLabel || null, url: null }
      }));
    };

    // ---- Loading Progress Bar ------------------------------------------------
    let progressTimer = null;
    const startLoading = () => {
      if (loadingBar) {
        loadingBar.style.opacity = '1';
        loadingBar.style.width = '30%';
        clearTimeout(progressTimer);
        progressTimer = setTimeout(() => {
          if (loadingBar) loadingBar.style.width = '75%';
        }, 300);
      }
    };

    const finishLoading = () => {
      clearTimeout(progressTimer);
      if (loadingBar) {
        loadingBar.style.width = '100%';
        setTimeout(() => {
          if (loadingBar) {
            loadingBar.style.opacity = '0';
            setTimeout(() => {
              if (loadingBar) loadingBar.style.width = '0%';
            }, 300);
          }
        }, 200);
      }
    };

    // ---- Iframe Management ---------------------------------------------------
    const ensureFrameElement = (tab) => {
      if (!tab.frameEl) {
        const el = document.createElement('iframe');
        el.allow = FRAME_ALLOW;
        el.allowFullscreen = true;
        el.style.cssText =
          'position:absolute; inset:0; width:100%; height:100%; border:none; background:#07050c; display:none;';

        el.addEventListener('load', () => {
          if (!tab.useProxy) finishLoading();
        });

        viewport.appendChild(el);
        tab.frameEl = el;
      }
    };

    const sendToFrame = (tab, message) => {
      try {
        tab.frameEl?.contentWindow?.postMessage(message, PROXY_ORIGIN);
      } catch (err) {
        console.warn('[BrowserApp] postMessage failed:', err);
      }
    };

    /**
     * Load a target URL in a tab's iframe according to its mode.
     */
    const loadInTab = (tab, url) => {
      ensureFrameElement(tab);
      startLoading();

      if (tab.timer) {
        clearTimeout(tab.timer);
        tab.timer = null;
      }

      if (tab.useProxy) {
        directBanner.style.display = 'none';
        proxyBanner.style.display = 'none';

        // Set an 8-second readiness timeout in case proxy initialization hangs
        tab.timer = setTimeout(() => {
          if (!tab.ready && tab.useProxy && tab === getActiveTab()) {
            proxyBannerText.textContent = '⚠️ Proxy connection is taking longer than usual. You can retry or switch to Direct mode.';
            proxyBanner.style.display = 'flex';
            finishLoading();
          }
        }, 8500);

        if (tab.frameMode !== 'proxy') {
          tab.frameMode = 'proxy';
          tab.ready = false;
          tab.queued = url;
          tab.frameEl.src = EMBED_URL;
        } else if (tab.ready) {
          sendToFrame(tab, { type: 'go', url });
        } else {
          tab.queued = url;
        }
      } else {
        // Direct Mode: load directly into the iframe
        proxyBanner.style.display = 'none';
        directBanner.style.display = 'flex';

        tab.frameMode = 'direct';
        tab.ready = false;
        tab.queued = null;
        tab.frameEl.src = url;
      }
    };

    // ---- PostMessage Listener (Scramjet Embed Communication) -----------------
    const onMessage = (e) => {
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
        if (tab.timer) {
          clearTimeout(tab.timer);
          tab.timer = null;
        }
        tab.ready = true;
        proxyBanner.style.display = 'none';
        finishLoading();

        if (tab.queued) {
          sendToFrame(tab, { type: 'go', url: tab.queued });
          tab.queued = null;
        }
      } else if (data.type === 'urlchange' && typeof data.url === 'string') {
        if (data.url !== tab.url) {
          tab.url = data.url;
          tab.history = tab.history.slice(0, tab.histIdx + 1);
          tab.history.push(data.url);
          tab.histIdx = tab.history.length - 1;
        }
        tab.title = typeof data.title === 'string' && data.title.trim()
          ? data.title.trim().slice(0, 120)
          : hostOf(data.url);

        finishLoading();
        renderTabs();
        if (tab.id === activeTabId) {
          renderViewport();
          publishBrowserActivity(tab);
        }
      } else if (data.type === 'error') {
        finishLoading();
        if (tab === getActiveTab()) {
          proxyBannerText.textContent = `⚠️ Scramjet proxy error: ${data.message || 'Failed to route request'}`;
          proxyBanner.style.display = 'flex';
        }
      }
    };

    window.addEventListener('message', onMessage);

    // ---- UI Rendering --------------------------------------------------------
    const renderModeToggle = (active) => {
      const label = modeBtn.querySelector('.browser-mode-label');
      const state = modeBtn.querySelector('.browser-mode-state');
      const track = modeBtn.querySelector('.browser-switch-track');
      const thumb = modeBtn.querySelector('.browser-switch-thumb');
      modeBtn.setAttribute('aria-checked', String(active.useProxy));

      if (active.useProxy) {
        label.textContent = 'Proxy';
        state.textContent = 'ON';
        modeBtn.style.background = 'rgba(139, 92, 246, 0.22)';
        modeBtn.style.borderColor = 'rgba(168, 85, 247, 0.55)';
        modeBtn.style.color = '#e9d5ff';
        track.style.background = '#8b5cf6';
        thumb.style.left = '18px';
        modeBtn.title = 'Scramjet Proxy is ON. Avoids iframe blocking. Click to switch to Direct mode.';
        sslIcon.textContent = '🛡️';
        sslIcon.title = 'Protected by Scramjet Proxy';
      } else {
        label.textContent = 'Direct';
        state.textContent = 'OFF';
        modeBtn.style.background = 'rgba(245, 158, 11, 0.15)';
        modeBtn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        modeBtn.style.color = '#fde68a';
        track.style.background = 'rgba(148, 163, 184, 0.45)';
        thumb.style.left = '2px';
        modeBtn.title = 'Proxy is OFF (Direct iframe mode). Click to turn Scramjet Proxy on.';
        sslIcon.textContent = '⚡';
        sslIcon.title = 'Direct iframe mode';
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
          border:1px solid ${isActive ? 'rgba(168,85,247,0.45)' : 'transparent'};
          border-bottom:none;
          background:${isActive ? '#1c132b' : 'rgba(255,255,255,0.03)'};
          color:${isActive ? '#fff' : '#a79bc8'};
          transition:background .12s, border-color .12s;
        `;

        const icon = document.createElement('span');
        icon.style.fontSize = '12px';
        icon.textContent = isHomeUrl(tab.url) ? '🏠' : (tab.useProxy ? '🛡️' : '⚡');

        const label = document.createElement('span');
        label.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        label.textContent = tab.title || 'New Tab';

        const close = document.createElement('button');
        close.className = 'tab-close';
        close.style.cssText = 'background:none; border:none; color:inherit; font-size:14px; cursor:pointer; padding:0 2px; opacity:0.6;';
        close.textContent = '×';
        close.onmouseenter = () => { close.style.opacity = '1'; };
        close.onmouseleave = () => { close.style.opacity = '0.6'; };

        el.append(icon, label, close);
        el.addEventListener('click', (e) => {
          if (e.target === close) {
            e.stopPropagation();
            closeTabWithRestore(tab.id);
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
      urlClear.style.display = urlInput.value ? 'block' : 'none';

      backBtn.disabled = active.histIdx <= 0;
      backBtn.style.opacity = backBtn.disabled ? '0.3' : '1';
      fwdBtn.disabled = active.histIdx >= active.history.length - 1;
      fwdBtn.style.opacity = fwdBtn.disabled ? '0.3' : '1';

      renderModeToggle(active);

      homeEl.style.display = home ? 'flex' : 'none';
      if (!home && !active.useProxy) {
        directBanner.style.display = 'flex';
      } else {
        directBanner.style.display = 'none';
      }

      for (const tab of tabs) {
        if (tab.frameEl) {
          tab.frameEl.style.display = (tab === active && !home) ? 'block' : 'none';
        }
      }
    };

    // ---- Navigation Handlers -------------------------------------------------
    const normalizeInput = (input) => {
      const url = input.trim();
      if (!url) return null;
      if (url.startsWith('about:') || url.startsWith('vault:')) return url;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.includes('.') && !/\s/.test(url)) return 'https://' + url;
      return SEARCH_URL + encodeURIComponent(url);
    };

    const navigate = (input) => {
      const raw = input.trim();
      if (!raw) return;

      // Handle internal app shortcuts
      if (raw === 'vault:hub') {
        AppRegistry.launch('vault-hub');
        return;
      }
      if (raw === 'vault:games') {
        AppRegistry.launch('games');
        return;
      }

      const url = normalizeInput(raw);
      if (!url) return;

      const active = getActiveTab();
      active.url = url;
      active.title = isHomeUrl(url) ? 'Home' : hostOf(url);
      active.history = active.history.slice(0, active.histIdx + 1);
      active.history.push(url);
      active.histIdx = active.history.length - 1;

      if (!isHomeUrl(url)) {
        loadInTab(active, url);
      } else {
        finishLoading();
      }

      renderTabs();
      renderViewport();
      publishBrowserActivity(active);
    };

    const switchTab = (id) => {
      activeTabId = id;
      renderTabs();
      renderViewport();
      publishBrowserActivity(getActiveTab());
    };

    const closeTab = (id) => {
      const tab = tabs.find(t => t.id === id);
      if (!tab) return;

      if (tab.timer) clearTimeout(tab.timer);
      tab.frameEl?.remove();

      if (tabs.length === 1) {
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
      const defaultProxyState = getActiveTab()?.useProxy ?? true;
      tabs.push({
        id: newId,
        title,
        url,
        history: [url],
        histIdx: 0,
        frameEl: null,
        frameMode: null,
        useProxy: defaultProxyState,
        ready: false,
        queued: null,
        timer: null
      });
      switchTab(newId);
      if (!isHomeUrl(url)) loadInTab(getActiveTab(), url);
    };

    // Omnibox submit & clear
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(urlInput.value);
    });
    urlInput.addEventListener('input', () => {
      urlClear.style.display = urlInput.value ? 'block' : 'none';
    });
    urlClear.addEventListener('click', () => {
      urlInput.value = '';
      urlClear.style.display = 'none';
      urlInput.focus();
    });

    // Navigation buttons
    backBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.histIdx > 0) {
        active.histIdx--;
        active.url = active.history[active.histIdx];
        active.title = isHomeUrl(active.url) ? 'Home' : hostOf(active.url);
        if (!isHomeUrl(active.url)) loadInTab(active, active.url);
        renderTabs();
        renderViewport();
      }
    });

    fwdBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.histIdx < active.history.length - 1) {
        active.histIdx++;
        active.url = active.history[active.histIdx];
        active.title = isHomeUrl(active.url) ? 'Home' : hostOf(active.url);
        if (!isHomeUrl(active.url)) loadInTab(active, active.url);
        renderTabs();
        renderViewport();
      }
    });

    reloadBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (!isHomeUrl(active.url)) {
        if (active.useProxy && active.ready) {
          startLoading();
          sendToFrame(active, { type: 'go', url: active.url });
        } else {
          loadInTab(active, active.url);
        }
      }
    });

    homeBtn.addEventListener('click', () => {
      navigate('about:home');
    });

    // Toggle Proxy vs Direct mode
    modeBtn.addEventListener('click', () => {
      const active = getActiveTab();
      active.useProxy = !active.useProxy;
      if (!isHomeUrl(active.url)) {
        loadInTab(active, active.url);
      }
      renderTabs();
      renderViewport();
    });

    // Pop out to native browser tab
    popoutBtn.addEventListener('click', () => {
      const active = getActiveTab();
      if (active.url && !isHomeUrl(active.url)) {
        window.open(active.url, '_blank', 'noopener,noreferrer');
      } else {
        showBrowserNotice('Navigate to a website first, then pop it out.');
      }
    });

    // Pin current website shortcut to desktop
    pinBtn.addEventListener('click', () => {
      const active = getActiveTab();
      let parsed;
      try { parsed = new URL(active.url); } catch { parsed = null; }
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
        showBrowserNotice('Open a website first, then pin it to your desktop.');
        return;
      }
      let shortcuts = [];
      try {
        const saved = JSON.parse(localStorage.getItem('vaultos_custom_shortcuts') || '[]');
        if (Array.isArray(saved)) shortcuts = saved;
      } catch {}

      const title = (active.title && active.title !== 'Home' ? active.title : parsed.hostname).trim().slice(0, 60);
      if (shortcuts.some(item => item && item.url === parsed.href && String(item.label).toLowerCase() === title.toLowerCase())) {
        showBrowserNotice('This website is already pinned to your desktop.');
        return;
      }

      const id = 'shortcut-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
      shortcuts.push({ id, appId: 'browser', label: title, icon: '🔗', url: parsed.href });

      try {
        localStorage.setItem('vaultos_custom_shortcuts', JSON.stringify(shortcuts));
        window.dispatchEvent(new CustomEvent('vaultos:shortcuts-changed'));
        showBrowserNotice('Pinned "' + title + '" to your desktop.');
      } catch {
        showBrowserNotice('Could not save the shortcut. Browser storage may be unavailable.');
      }
    });

    function showBrowserNotice(message) {
      containerEl.querySelector('.browser-inline-notice')?.remove();
      const notice = document.createElement('div');
      notice.className = 'browser-inline-notice';
      notice.textContent = message;
      notice.style.cssText = 'position:absolute; z-index:50; top:52px; left:50%; transform:translateX(-50%); max-width:90%; padding:10px 18px; border:1px solid rgba(168,85,247,.6); border-radius:10px; background:#1e1030; color:#f5f3ff; box-shadow:0 10px 30px rgba(0,0,0,0.6); font-size:12.5px; text-align:center;';
      containerEl.querySelector('.browser-app-root').appendChild(notice);
      window.setTimeout(() => notice.remove(), 2600);
    }

    helpBtn.addEventListener('click', () => showBrowserGuide());
    addTabBtn.addEventListener('click', () => addTab());

    // Banner buttons
    containerEl.querySelector('#direct-enable-proxy').addEventListener('click', () => {
      const active = getActiveTab();
      active.useProxy = true;
      loadInTab(active, active.url);
      renderTabs();
      renderViewport();
    });
    containerEl.querySelector('#direct-popout').addEventListener('click', () => {
      const active = getActiveTab();
      if (active.url && !isHomeUrl(active.url)) window.open(active.url, '_blank', 'noopener,noreferrer');
    });
    containerEl.querySelector('#direct-dismiss').addEventListener('click', () => {
      directBanner.style.display = 'none';
    });

    containerEl.querySelector('#proxy-btn-direct').addEventListener('click', () => {
      const active = getActiveTab();
      active.useProxy = false;
      loadInTab(active, active.url);
      renderTabs();
      renderViewport();
    });
    containerEl.querySelector('#proxy-btn-popout').addEventListener('click', () => {
      const active = getActiveTab();
      if (active.url && !isHomeUrl(active.url)) window.open(active.url, '_blank', 'noopener,noreferrer');
    });
    containerEl.querySelector('#proxy-btn-retry').addEventListener('click', () => {
      const active = getActiveTab();
      loadInTab(active, active.url);
    });
    containerEl.querySelector('#proxy-btn-dismiss').addEventListener('click', () => {
      proxyBanner.style.display = 'none';
    });

    // Bookmarks and Home screen forms
    containerEl.querySelectorAll('.browser-bm-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.url));
    });
    homeEl.querySelectorAll('.home-bm-card').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.url));
    });

    const homeSearchForm = containerEl.querySelector('#home-search-form');
    const homeSearchInput = containerEl.querySelector('#home-search-input');
    if (homeSearchForm && homeSearchInput) {
      homeSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        navigate(homeSearchInput.value);
      });
    }

    // ---- Vault Browser keyboard shortcuts ------------------------------------
    // Use Alt/Option rather than Command. Ignore editable controls except for
    // the dedicated address-bar shortcut, and never steal browser/system chords.
    const closedTabs = [];
    const shortcutOverlayId = 'vault-browser-shortcuts-overlay';
    const isEditableTarget = (target) => {
      if (!target) return false;
      const tag = String(target.tagName || '').toLowerCase();
      return target.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
    };
    const showShortcutReference = () => {
      let overlay = containerEl.querySelector('#' + shortcutOverlayId);
      if (overlay) { overlay.remove(); return; }
      overlay = document.createElement('div');
      overlay.id = shortcutOverlayId;
      overlay.style.cssText = 'position:absolute;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,2,10,.78);backdrop-filter:blur(8px);';
      const panel = document.createElement('div');
      panel.style.cssText = 'width:min(440px,100%);max-height:90%;overflow:auto;background:#171023;border:1px solid rgba(168,85,247,.45);border-radius:14px;padding:20px;color:#f5f3ff;box-shadow:0 20px 70px #0009;';
      panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><strong style="font-size:18px">Vault Browser Shortcuts</strong><button type="button" aria-label="Close shortcuts" style="border:0;background:#ffffff12;color:#fff;border-radius:7px;padding:5px 9px;cursor:pointer">✕</button></div><div style="display:grid;grid-template-columns:1fr auto;gap:10px 16px;font-size:13px;align-items:center"><span>New tab</span><kbd>Alt + T</kbd><span>Close tab</span><kbd>Alt + W</kbd><span>Reopen closed tab</span><kbd>Alt + Shift + T</kbd><span>Next / previous tab</span><kbd>Alt + Shift + → / ←</kbd><span>Switch to tab 1–8</span><kbd>Alt + 1–8</kbd><span>Focus address bar</span><kbd>Alt + L</kbd><span>Back / forward</span><kbd>Alt + ← / →</kbd><span>Reload</span><kbd>Alt + R</kbd><span>Home</span><kbd>Alt + H</kbd><span>Fullscreen</span><kbd>Alt + Enter</kbd><span>Show this reference</span><kbd>Alt + /</kbd></div><p style="font-size:11px;color:#b8a9d6;line-height:1.5;margin:16px 0 0">Shortcuts may not reach the browser while a website or game inside an iframe has keyboard focus. Some system-reserved shortcuts cannot be intercepted.</p>';
      panel.querySelectorAll('kbd').forEach(k => { k.style.cssText = 'font:11px ui-monospace,monospace;background:#ffffff12;border:1px solid #ffffff20;border-radius:5px;padding:4px 7px;text-align:center;white-space:nowrap'; });
      panel.querySelector('button').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.appendChild(panel);
      containerEl.appendChild(overlay);
      panel.querySelector('button').focus();
    };
    const performBack = () => backBtn.click();
    const performForward = () => fwdBtn.click();
    const browserKeydown = (e) => {
      // Only handle events belonging to this browser window, not another app.
      const activeElement = document.activeElement;
      const browserWindow = containerEl.closest('.vault-window');
      if (!containerEl.isConnected || !browserWindow || !browserWindow.classList.contains('focused')) return;
      // The launcher can leave its hidden search input focused after dismissal.
      // Only suppress shortcuts for editable controls that belong to this browser window.
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      // On macOS, Option+letter often changes e.key to a symbol (e.g. Option+T = †).
      // Use the physical key code so shortcuts still match the intended letter.
      const codeKeys = {
        KeyT: 't', KeyW: 'w', KeyL: 'l', KeyR: 'r', KeyH: 'h',
        Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
        Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
        ArrowLeft: 'arrowleft', ArrowRight: 'arrowright', Enter: 'enter',
        Slash: '/'
      };
      const key = codeKeys[e.code] || e.key.toLowerCase();
      const editable = isEditableTarget(e.target);
      if (editable && containerEl.contains(e.target) && !(key === 'l' && !e.shiftKey)) return;
      if (document.querySelector('.vault-launcher-overlay.open')) return;
      let handled = true;
      if (key === 't' && !e.shiftKey) addTab();
      else if (key === 'w' && !e.shiftKey) closeTab(activeTabId);
      else if (key === 't' && e.shiftKey) {
        const previous = closedTabs.pop();
        if (previous) { addTab(previous.url, previous.title || 'Reopened Tab'); getActiveTab().useProxy = previous.useProxy; renderTabs(); renderViewport(); if (!isHomeUrl(previous.url)) loadInTab(getActiveTab(), previous.url); }
      } else if (key === 'l' && !e.shiftKey) { urlInput.focus(); urlInput.select(); }
      else if (key === 'r' && !e.shiftKey) reloadBtn.click();
      else if (key === 'h' && !e.shiftKey) homeBtn.click();
      else if (key === 'enter' && !e.shiftKey) {
        const target = containerEl.closest('.vault-window') || containerEl;
        if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
        else target.requestFullscreen?.().catch?.(() => {});
      } else if (key === '/') showShortcutReference();
      else if (key === 'arrowleft' && e.shiftKey) {
        const idx = tabs.findIndex(t => t.id === activeTabId);
        switchTab(tabs[(idx - 1 + tabs.length) % tabs.length].id);
      } else if (key === 'arrowright' && e.shiftKey) {
        const idx = tabs.findIndex(t => t.id === activeTabId);
        switchTab(tabs[(idx + 1) % tabs.length].id);
      } else if (/^[1-8]$/.test(key) && !e.shiftKey) {
        const tab = tabs[Number(key) - 1];
        if (tab) switchTab(tab.id);
      } else if (key === '9' && !e.shiftKey) switchTab(tabs[tabs.length - 1].id);
      else if (key === 'arrowleft' && !e.shiftKey) performBack();
      else if (key === 'arrowright' && !e.shiftKey) performForward();
      else handled = false;
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('keydown', browserKeydown, true);
    containerEl.__vaultBrowserKeydown = browserKeydown;

    // Keep a minimal snapshot so Alt+Shift+T can reopen the most recently closed tab.
    const originalCloseTab = closeTab;
    // Record closed-tab information through the existing tab-close buttons and shortcut.
    // The active tab is snapshotted immediately before closing via this wrapper.
    const closeTabWithRestore = (id) => {
      const tab = tabs.find(t => t.id === id);
      if (tab) closedTabs.push({ url: tab.url, title: tab.title, useProxy: tab.useProxy });
      originalCloseTab(id);
    };

    // Initial render and boot
    renderTabs();
    renderViewport();
    publishBrowserActivity(getActiveTab());
    if (!isHomeUrl(initialUrl)) loadInTab(getActiveTab(), initialUrl);
    renderViewport();

    // Show onboarding guide once on first launch
    let hasSeenBrowserGuide = false;
    try {
      hasSeenBrowserGuide = localStorage.getItem('vault_browser_guide_seen_v2') === 'true';
    } catch {}
    if (!hasSeenBrowserGuide) {
      window.setTimeout(() => {
        if (containerEl.isConnected) showBrowserGuide();
      }, 350);
    }
  },

  unmount(containerEl) {
    if (containerEl.__vaultBrowserKeydown) {
      document.removeEventListener('keydown', containerEl.__vaultBrowserKeydown, true);
      delete containerEl.__vaultBrowserKeydown;
    }
    // Iframes and listeners cleanup
    const frames = containerEl.querySelectorAll('iframe');
    frames.forEach(f => f.remove());
  }
};

export default AppManifest;
