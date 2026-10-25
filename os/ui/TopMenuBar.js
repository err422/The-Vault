// os/ui/TopMenuBar.js — macOS-style top menu bar
// Fixed 32px bar with app menus (left) and system status tray (right).

import Store from '../core/Store.js';
import WindowManager from '../core/WindowManager.js';
import AppRegistry from '../core/AppRegistry.js';
import { showContextMenu } from './ContextMenu.js';

let _bar = null;
let _menuArea = null;
let _clockEl = null;
let _userEl = null;
let _clockInterval = null;
let _unsubs = [];

// ── Styles ─────────────────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('vault-topmenu-styles')) return;
  const s = document.createElement('style');
  s.id = 'vault-topmenu-styles';
  s.textContent = `
    .vault-topbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 32px;
      z-index: 950;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      background: rgba(13, 0, 26, 0.78);
      backdrop-filter: blur(22px) saturate(1.5);
      -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e8e0f0;
      user-select: none;
    }
    .vault-topbar__left {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 100%;
    }
    .vault-topbar__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 18px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .vault-topbar__logo:hover {
      background: rgba(143, 104, 255, 0.2);
    }
    .vault-topbar__menu-item {
      padding: 3px 10px;
      border-radius: 5px;
      cursor: default;
      font-weight: 500;
      transition: background 0.12s;
    }
    .vault-topbar__menu-item:hover {
      background: rgba(143, 104, 255, 0.22);
    }
    .vault-topbar__right {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 100%;
      padding-right: 4px;
    }
    .vault-topbar__clock {
      font-variant-numeric: tabular-nums;
      opacity: 0.85;
      font-size: 12.5px;
    }
    .vault-topbar__user {
      font-size: 12.5px;
      opacity: 0.75;
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vault-topbar__bell {
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      transition: opacity 0.15s;
    }
    .vault-topbar__bell:hover { opacity: 1; }
  `;
  document.head.appendChild(s);
}

// ── Clock ──────────────────────────────────────────────────────────
function _updateClock() {
  if (!_clockEl) return;
  const now = new Date();
  const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
  const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  _clockEl.textContent = `${day}  ${now.toLocaleTimeString('en-US', opts)}`;
}

// ── User label ─────────────────────────────────────────────────────
function _updateUser() {
  if (!_userEl) return;
  const ac = window.AuthCore;
  if (ac && ac.currentUser && ac.currentUsername) {
    _userEl.textContent = '@' + ac.currentUsername;
  } else {
    _userEl.textContent = 'Guest';
  }
}

// ── App menus (from focused window's manifest) ─────────────────────
function _updateMenus(data) {
  if (!_menuArea) return;
  // Clear existing menu items (keep logo)
  while (_menuArea.children.length > 1) {
    _menuArea.removeChild(_menuArea.lastChild);
  }

  const win = data?.instanceId ? WindowManager.getWindow(data.instanceId) : data;
  if (!win?.appId) return;
  const app = AppRegistry.getApp(win.appId);
  if (!app?.menus) return;

  for (const menu of app.menus) {
    const btn = document.createElement('div');
    btn.className = 'vault-topbar__menu-item';
    btn.textContent = menu.label || '';
    btn.addEventListener('click', (e) => {
      if (menu.items) {
        const r = btn.getBoundingClientRect();
        showContextMenu(r.left, r.bottom, menu.items);
      }
    });
    _menuArea.appendChild(btn);
  }
}

// ── Public init ─────────────────────────────────────────────────────
export function init() {
  _injectStyles();

  _bar = document.createElement('div');
  _bar.className = 'vault-topbar';

  // Left: logo + app menus
  _menuArea = document.createElement('div');
  _menuArea.className = 'vault-topbar__left';

  const logo = document.createElement('div');
  logo.className = 'vault-topbar__logo';
  logo.textContent = '🔮';
  logo.title = 'The Web Vault';
  logo.addEventListener('click', () => {
    Store.emit('launcher:toggle');
  });
  _menuArea.appendChild(logo);

  // Right: status tray
  const right = document.createElement('div');
  right.className = 'vault-topbar__right';

  const bell = document.createElement('span');
  bell.className = 'vault-topbar__bell';
  bell.textContent = '🔔';
  bell.title = 'Notifications';
  bell.style.cursor = 'pointer';
  bell.addEventListener('click', () => {
    Store.emit('notifications:toggle');
  });

  const controlCenter = document.createElement('span');
  controlCenter.className = 'vault-topbar__bell vault-topbar__control-center-trigger';
  controlCenter.textContent = '🎛️';
  controlCenter.title = 'Control Center';
  controlCenter.style.cursor = 'pointer';
  controlCenter.addEventListener('click', () => {
    Store.emit('quicksettings:toggle');
  });

  _userEl = document.createElement('span');
  _userEl.className = 'vault-topbar__user';
  _userEl.style.cursor = 'pointer';
  _userEl.addEventListener('click', () => {
    if (window.authSystem?.showModal) window.authSystem.showModal();
    else AppRegistry.launch('settings');
  });

  _clockEl = document.createElement('span');
  _clockEl.className = 'vault-topbar__clock';

  right.appendChild(bell);
  right.appendChild(controlCenter);
  right.appendChild(_userEl);
  right.appendChild(_clockEl);

  _bar.appendChild(_menuArea);
  _bar.appendChild(right);
  document.body.appendChild(_bar);

  // Clock
  _updateClock();
  _clockInterval = setInterval(_updateClock, 30_000); // every 30s

  // User
  _updateUser();
  window.addEventListener('authProfileReady', _updateUser);

  // Menus from focused window
  _unsubs.push(Store.on('window:focused', _updateMenus));
  _unsubs.push(Store.on('window:closed', () => {
    _updateMenus(WindowManager.getFocusedWindow());
  }));
}

export function destroy() {
  clearInterval(_clockInterval);
  for (const u of _unsubs) u();
  _unsubs = [];
  window.removeEventListener('authProfileReady', _updateUser);
  if (_bar) _bar.remove();
}

export function getElement() { return _bar; }

const TopMenuBar = { init, destroy, getElement };
export default TopMenuBar;
