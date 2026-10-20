// os/ui/StartLauncher.js — App launcher overlay
// Slide-up panel triggered from TopMenuBar logo or Meta key.
// Search, pinned apps grid, all-apps list, power/session area.

import Store from '../core/Store.js';
import AppRegistry from '../core/AppRegistry.js';

let _overlay = null;
let _panel = null;
let _searchInput = null;
let _pinnedGrid = null;
let _allAppsList = null;
let _open = false;
let _unsubs = [];

const PINNED_IDS = ['file-explorer', 'browser', 'terminal', 'notes', 'settings', 'vault-hub'];

// ── Styles ─────────────────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('vault-launcher-styles')) return;
  const s = document.createElement('style');
  s.id = 'vault-launcher-styles';
  s.textContent = `
    .vault-launcher-overlay {
      position: fixed;
      inset: 0;
      z-index: 960;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .vault-launcher-overlay.open {
      display: flex;
    }
    .vault-launcher {
      width: 500px;
      max-width: 94vw;
      max-height: 600px;
      display: flex;
      flex-direction: column;
      background: rgba(18, 0, 36, 0.92);
      backdrop-filter: blur(24px) saturate(1.6);
      -webkit-backdrop-filter: blur(24px) saturate(1.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
      overflow: hidden;
      transform: translateY(24px);
      opacity: 0;
      transition: transform 0.25s cubic-bezier(.22,1,.36,1), opacity 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e8e0f0;
    }
    .vault-launcher-overlay.open .vault-launcher {
      transform: translateY(0);
      opacity: 1;
    }

    /* Search */
    .vault-launcher__search {
      padding: 16px 18px 10px;
    }
    .vault-launcher__search input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: #e8e0f0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    .vault-launcher__search input::placeholder { color: rgba(255,255,255,0.4); }
    .vault-launcher__search input:focus {
      border-color: rgba(143, 104, 255, 0.5);
    }

    /* Sections */
    .vault-launcher__section {
      padding: 4px 18px 8px;
    }
    .vault-launcher__heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.5;
      margin-bottom: 8px;
    }

    /* Pinned grid */
    .vault-launcher__pinned {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .vault-launcher__app {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 4px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .vault-launcher__app:hover {
      background: rgba(143, 104, 255, 0.18);
    }
    .vault-launcher__app-icon {
      font-size: 30px;
      line-height: 1;
    }
    .vault-launcher__app-name {
      font-size: 11px;
      text-align: center;
      max-width: 72px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vault-launcher__app-badge {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(143,104,255,0.18);
      color: rgba(255,255,255,0.6);
    }

    /* All apps list */
    .vault-launcher__all {
      flex: 1;
      overflow-y: auto;
      padding: 0 18px 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(143,104,255,0.3) transparent;
    }
    .vault-launcher__all-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .vault-launcher__all-item:hover {
      background: rgba(143, 104, 255, 0.15);
    }
    .vault-launcher__all-icon { font-size: 22px; }
    .vault-launcher__all-info { flex: 1; display: flex; align-items: center; gap: 8px; }
    .vault-launcher__all-name { font-size: 13px; }

    /* Footer / session */
    .vault-launcher__footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 10px 18px 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .vault-launcher__footer-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      background: rgba(255,255,255,0.06);
      color: #c0b4d8;
      transition: background 0.12s;
    }
    .vault-launcher__footer-btn:hover {
      background: rgba(143,104,255,0.22);
      color: #e8e0f0;
    }
  `;
  document.head.appendChild(s);
}

// ── Helpers ────────────────────────────────────────────────────────
function _createAppTile(app) {
  const el = document.createElement('div');
  el.className = 'vault-launcher__app';

  const ico = document.createElement('span');
  ico.className = 'vault-launcher__app-icon';
  ico.textContent = app.icon || '❓';

  const name = document.createElement('span');
  name.className = 'vault-launcher__app-name';
  name.textContent = app.name;

  el.appendChild(ico);
  el.appendChild(name);

  el.addEventListener('click', () => {
    AppRegistry.launch(app.id);
    close();
  });
  return el;
}

function _createAppRow(app) {
  const el = document.createElement('div');
  el.className = 'vault-launcher__all-item';

  const ico = document.createElement('span');
  ico.className = 'vault-launcher__all-icon';
  ico.textContent = app.icon || '❓';

  const info = document.createElement('div');
  info.className = 'vault-launcher__all-info';

  const name = document.createElement('span');
  name.className = 'vault-launcher__all-name';
  name.textContent = app.name;

  const badge = document.createElement('span');
  badge.className = 'vault-launcher__app-badge';
  badge.textContent = app.category || '';

  info.appendChild(name);
  info.appendChild(badge);

  el.appendChild(ico);
  el.appendChild(info);

  el.addEventListener('click', () => {
    AppRegistry.launch(app.id);
    close();
  });
  return el;
}

function _renderApps(filter = '') {
  if (!_pinnedGrid || !_allAppsList) return;
  const all = AppRegistry.getAllApps();
  const q = filter.toLowerCase();
  const filtered = q ? all.filter(a => a.name.toLowerCase().includes(q)) : all;

  // Pinned
  _pinnedGrid.textContent = '';
  if (!q) {
    for (const id of PINNED_IDS) {
      const app = AppRegistry.getApp(id);
      if (app) _pinnedGrid.appendChild(_createAppTile(app));
    }
  }

  // All apps (alphabetical)
  _allAppsList.textContent = '';
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  for (const app of sorted) {
    _allAppsList.appendChild(_createAppRow(app));
  }
}

// ── Open / Close ───────────────────────────────────────────────────
function open() {
  if (_open) return;
  _open = true;
  _overlay.classList.add('open');
  _renderApps();
  requestAnimationFrame(() => _searchInput?.focus());
}

function close() {
  if (!_open) return;
  _open = false;
  _overlay.classList.remove('open');
  if (_searchInput) _searchInput.value = '';
}

function toggle() {
  _open ? close() : open();
}

// ── Public init ─────────────────────────────────────────────────────
export function init() {
  _injectStyles();

  // Overlay
  _overlay = document.createElement('div');
  _overlay.className = 'vault-launcher-overlay';
  _overlay.addEventListener('pointerdown', (e) => {
    if (e.target === _overlay) close();
  });

  // Panel
  _panel = document.createElement('div');
  _panel.className = 'vault-launcher';
  _panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'vault-launcher__search';
  _searchInput = document.createElement('input');
  _searchInput.type = 'text';
  _searchInput.placeholder = 'Search apps…';
  _searchInput.addEventListener('input', () => _renderApps(_searchInput.value));
  searchWrap.appendChild(_searchInput);

  // Pinned section
  const pinnedSection = document.createElement('div');
  pinnedSection.className = 'vault-launcher__section';
  const pinnedHeading = document.createElement('div');
  pinnedHeading.className = 'vault-launcher__heading';
  pinnedHeading.textContent = 'Pinned';
  _pinnedGrid = document.createElement('div');
  _pinnedGrid.className = 'vault-launcher__pinned';
  pinnedSection.appendChild(pinnedHeading);
  pinnedSection.appendChild(_pinnedGrid);

  // All apps section
  const allSection = document.createElement('div');
  allSection.className = 'vault-launcher__section';
  const allHeading = document.createElement('div');
  allHeading.className = 'vault-launcher__heading';
  allHeading.textContent = 'All Apps';
  allSection.appendChild(allHeading);

  _allAppsList = document.createElement('div');
  _allAppsList.className = 'vault-launcher__all';

  // Footer
  const footer = document.createElement('div');
  footer.className = 'vault-launcher__footer';

  const btnSignIn = document.createElement('button');
  btnSignIn.className = 'vault-launcher__footer-btn';
  btnSignIn.textContent = window.AuthCore?.currentUser ? 'Sign Out' : 'Sign In / Out';
  btnSignIn.addEventListener('click', () => {
    if (window.AuthUI) window.AuthUI.showModal();
    close();
  });

  const btnAbout = document.createElement('button');
  btnAbout.className = 'vault-launcher__footer-btn';
  btnAbout.textContent = 'About';
  btnAbout.addEventListener('click', () => {
    AppRegistry.launch('about');
    close();
  });

  const btnSettings = document.createElement('button');
  btnSettings.className = 'vault-launcher__footer-btn';
  btnSettings.textContent = 'Settings';
  btnSettings.addEventListener('click', () => {
    AppRegistry.launch('settings');
    close();
  });

  const btnClassic = document.createElement('button');
  btnClassic.className = 'vault-launcher__footer-btn';
  btnClassic.textContent = 'Classic Vault';
  btnClassic.title = 'Switch to Classic Web Vault view';
  btnClassic.addEventListener('click', () => {
    localStorage.setItem('vault_view_mode', 'classic');
    window.location.href = 'index.html?mode=classic';
  });

  footer.appendChild(btnSignIn);
  footer.appendChild(btnAbout);
  footer.appendChild(btnSettings);
  footer.appendChild(btnClassic);

  // Assemble
  _panel.appendChild(searchWrap);
  _panel.appendChild(pinnedSection);
  _panel.appendChild(allSection);
  _panel.appendChild(_allAppsList);
  _panel.appendChild(footer);

  _overlay.appendChild(_panel);
  document.body.appendChild(_overlay);

  // Global keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _open) { close(); e.preventDefault(); }
    if (e.key === 'Alt' || e.key === 'OS') toggle();
  });

  // Store toggle event (from TopMenuBar logo click)
  _unsubs.push(Store.on('launcher:toggle', toggle));
}

export function destroy() {
  for (const u of _unsubs) u();
  _unsubs = [];
  if (_overlay) _overlay.remove();
}

export function isOpen() { return _open; }

const StartLauncher = { init, destroy, isOpen, open, close, toggle };
export default StartLauncher;
