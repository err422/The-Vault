// os/ui/TaskbarDock.js — Bottom dock / taskbar
// Hybrid Windows 11 / macOS dock with pinned + running app icons,
// hover animation, running indicators, and right-click menus.

import Store from '../core/Store.js';
import AppRegistry from '../core/AppRegistry.js';
import WindowManager from '../core/WindowManager.js';
import { showContextMenu } from './ContextMenu.js';

const PINNED_IDS = ['file-explorer', 'browser', 'games', 'terminal', 'notes', 'settings', 'vault-hub'];

let _dock = null;
let _pinnedContainer = null;
let _runningContainer = null;
let _unsubs = [];

// ── Styles ─────────────────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('vault-dock-styles')) return;
  const s = document.createElement('style');
  s.id = 'vault-dock-styles';
  s.textContent = `
    .vault-dock {
      position: fixed;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 940;
      display: flex;
      align-items: center;
      gap: 0;
      height: 60px;
      padding: 0 10px;
      background: rgba(13, 0, 26, 0.72);
      backdrop-filter: blur(22px) saturate(1.5);
      -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      user-select: none;
    }
    .vault-dock__section {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 4px;
    }
    .vault-dock__sep {
      width: 1px;
      height: 32px;
      background: rgba(255,255,255,0.12);
      margin: 0 4px;
      flex-shrink: 0;
    }
    .vault-dock__icon {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), background 0.15s;
    }
    .vault-dock__icon:hover {
      transform: scale(1.15) translateY(-4px);
      background: rgba(143, 104, 255, 0.15);
    }
    .vault-dock__icon:active {
      transform: scale(1.05);
    }
    /* Tooltip */
    .vault-dock__icon::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) scale(0.9);
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(18, 0, 36, 0.92);
      border: 1px solid rgba(255,255,255,0.1);
      color: #e8e0f0;
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s, transform 0.15s;
    }
    .vault-dock__icon:hover::after {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    /* Running indicator dot */
    .vault-dock__dot {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--vault-accent-primary, #8f68ff);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .vault-dock__icon.running .vault-dock__dot {
      opacity: 1;
    }
  `;
  document.head.appendChild(s);
}

// ── Build icon element ─────────────────────────────────────────────
function _createDockIcon(appId, isPinned) {
  const app = AppRegistry.getApp(appId);
  const el = document.createElement('div');
  el.className = 'vault-dock__icon';
  el.dataset.appId = appId;
  el.dataset.tooltip = app?.name || appId;
  el.textContent = app?.icon || '❓';

  // Running indicator dot
  const dot = document.createElement('div');
  dot.className = 'vault-dock__dot';
  el.appendChild(dot);

  // Update running state
  _refreshRunningState(el, appId);

  // Click → focus or launch
  el.addEventListener('click', () => {
    const wins = WindowManager.getWindowsByApp(appId);
    if (wins.length > 0) {
      WindowManager.focusWindow(wins[0].id);
    } else {
      AppRegistry.launch(appId);
    }
  });

  // Right-click
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [];
    if (!isPinned) {
      items.push({ label: 'Pin to Dock', icon: '📌', action: () => _pinApp(appId) });
    } else {
      items.push({ label: 'Unpin from Dock', icon: '📌', action: () => _unpinApp(appId) });
    }
    const wins = WindowManager.getWindowsByApp(appId);
    if (wins.length) {
      items.push({ type: 'separator' });
      items.push({ label: 'Close All Windows', icon: '✕', action: () => {
        for (const w of wins) WindowManager.closeWindow(w.id);
      }});
    }
    showContextMenu(e.clientX, e.clientY, items);
  });

  return el;
}

function _refreshRunningState(el, appId) {
  const wins = WindowManager.getWindowsByApp(appId);
  el.classList.toggle('running', wins.length > 0);
}

// ── Pin / Unpin (runtime only — no persistence yet) ────────────────
const _pinned = new Set(PINNED_IDS);

function _pinApp(appId) {
  _pinned.add(appId);
  _render();
}

function _unpinApp(appId) {
  _pinned.delete(appId);
  _render();
}

// ── Render ──────────────────────────────────────────────────────────
function _render() {
  if (!_pinnedContainer || !_runningContainer) return;
  _pinnedContainer.textContent = '';
  _runningContainer.textContent = '';

  // Pinned icons
  for (const id of _pinned) {
    _pinnedContainer.appendChild(_createDockIcon(id, true));
  }

  // Running but not pinned
  const allWins = WindowManager.getWindows();
  const runningIds = new Set(allWins.map(w => w.appId));
  for (const id of runningIds) {
    if (!_pinned.has(id)) {
      _runningContainer.appendChild(_createDockIcon(id, false));
    }
  }

  // Show/hide separator
  const sep = _dock?.querySelector('.vault-dock__sep');
  if (sep) sep.style.display = _runningContainer.children.length ? '' : 'none';
}

// ── Public init ─────────────────────────────────────────────────────
export function init() {
  _injectStyles();

  _dock = document.createElement('div');
  _dock.className = 'vault-dock';

  _pinnedContainer = document.createElement('div');
  _pinnedContainer.className = 'vault-dock__section';

  const sep = document.createElement('div');
  sep.className = 'vault-dock__sep';

  _runningContainer = document.createElement('div');
  _runningContainer.className = 'vault-dock__section';

  _dock.appendChild(_pinnedContainer);
  _dock.appendChild(sep);
  _dock.appendChild(_runningContainer);

  document.body.appendChild(_dock);

  _render();

  // Re-render on window events
  const refresh = () => _render();
  _unsubs.push(Store.on('window:created', refresh));
  _unsubs.push(Store.on('window:closed', refresh));
  _unsubs.push(Store.on('window:focused', refresh));
}

export function destroy() {
  for (const u of _unsubs) u();
  _unsubs = [];
  if (_dock) _dock.remove();
}

export function getElement() { return _dock; }

const TaskbarDock = { init, destroy, getElement };
export default TaskbarDock;
