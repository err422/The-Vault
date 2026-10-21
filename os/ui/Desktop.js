// os/ui/Desktop.js — Main desktop surface
// Draggable, grid-snapped desktop shortcuts with per-browser localStorage persistence.
// Desktop layout is intentionally local-only; this module does not write to Firebase.

import Store from '../core/Store.js';
import AppRegistry from '../core/AppRegistry.js';
import virtualFS from '../core/VirtualFS.js';
import { showContextMenu } from './ContextMenu.js';

// ── Default desktop icons ──────────────────────────────────────────
const DEFAULT_ICONS = [
  { appId: 'file-explorer', label: 'File Explorer', icon: '📁' },
  { appId: 'browser',       label: 'Browser',       icon: '🌐' },
  { appId: 'games',         label: 'Games',         icon: '🎮' },
  { appId: 'terminal',      label: 'Terminal',      icon: '💻' },
  { appId: 'notes',         label: 'Notes',         icon: '📝' },
  { appId: 'settings',      label: 'Settings',      icon: '⚙️' },
  { appId: 'vault-hub',     label: 'Vault Hub',     icon: '🏠' },
  { appId: 'lounge',        label: 'VaultNet',      icon: '💬' },
];

// Website shortcuts are stored locally per browser profile; Firebase is untouched.
const SHORTCUT_STORAGE_KEY = 'vaultos_custom_shortcuts';
function _loadCustomShortcuts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHORTCUT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item && typeof item.id === 'string' &&
      typeof item.label === 'string' && item.label.trim() &&
      typeof item.url === 'string' && /^https?:\/\//i.test(item.url) &&
      item.appId === 'browser'
    );
  } catch (err) {
    console.warn('[Desktop] Failed to read website shortcuts:', err);
    return [];
  }
}
let customShortcuts = _loadCustomShortcuts();

function _saveCustomShortcuts() {
  try {
    localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(customShortcuts));
    window.dispatchEvent(new CustomEvent('vaultos:shortcuts-changed'));
    return true;
  } catch (err) {
    console.warn('[Desktop] Failed to save website shortcuts:', err);
    return false;
  }
}

function _addCustomShortcut(label, url) {
  const cleanLabel = label.trim().slice(0, 60);
  let parsed;
  try { parsed = new URL(url); } catch { parsed = null; }
  if (!cleanLabel || !parsed || !['http:', 'https:'].includes(parsed.protocol)) {
    return 'Enter a name and a valid HTTP or HTTPS website URL.';
  }
  const normalizedUrl = parsed.href;
  if (customShortcuts.some((item) => item.url === normalizedUrl && item.label.toLowerCase() === cleanLabel.toLowerCase())) {
    return 'That shortcut already exists on your desktop.';
  }
  const shortcut = {
    id: 'shortcut-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)),
    appId: 'browser',
    label: cleanLabel,
    icon: '🔗',
    url: normalizedUrl,
  };
  customShortcuts.push(shortcut);
  if (!_saveCustomShortcuts()) {
    customShortcuts.pop();
    return 'Could not save the shortcut. Browser storage may be unavailable or full.';
  }
  _iconPositions[_iconKey(shortcut)] = _findNearestFreeCell(0, 0);
  _renderIcons();
  _saveLayout();
  return '';
}

function _removeCustomShortcut(id) {
  const index = customShortcuts.findIndex((item) => item.id === id);
  if (index < 0) return;
  const removed = customShortcuts.splice(index, 1)[0];
  try {
    if (!_saveCustomShortcuts()) {
      customShortcuts.splice(index, 0, removed);
      return;
    }
  } catch {
    customShortcuts.splice(index, 0, removed);
    return;
  }
  delete _iconPositions[_iconKey(removed)];
  _renderIcons();
  _saveLayout();
}

function _iconKey(def) {
  return def.id || def.appId;
}

const LAYOUT_STORAGE_KEY = 'vaultos_desktop_layout_v1';
const CELL_W = 92;
const CELL_H = 108;
const ICON_W = 88;
const ICON_H = 104;
const ICON_SIZE = 72;
const GRID_PAD_X = 8;
const GRID_PAD_Y = 8;
const DRAG_THRESHOLD = 5;

let _root = null;
let _iconGrid = null;
let _selectedIcon = null;
let _iconPositions = Object.create(null);
let _resizeObserver = null;
let _resizeHandler = null;

// ── Styles ─────────────────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('vault-desktop-styles')) return;
  const s = document.createElement('style');
  s.id = 'vault-desktop-styles';
  s.textContent = `
    .vault-desktop {
      position: fixed;
      inset: 32px 0 0 0;
      overflow: hidden;
      z-index: 0;
      background: var(--vault-wallpaper, linear-gradient(to top, #1a0033, #0d001a, #000000));
      background-size: cover;
      background-position: center;
    }
    .vault-desktop-icons {
      position: absolute;
      inset: 0 0 72px 0;
      overflow: hidden;
    }
    .vault-desktop-icon {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: ${ICON_W}px;
      height: ${ICON_H}px;
      box-sizing: border-box;
      border-radius: 10px;
      border: 2px solid transparent;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: left 0.16s cubic-bezier(0.2, 1, 0.3, 1),
                  top 0.16s cubic-bezier(0.2, 1, 0.3, 1),
                  background 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .vault-desktop-icon:hover { background: rgba(143, 104, 255, 0.1); }
    .vault-desktop-icon.selected {
      background: rgba(143, 104, 255, 0.18);
      border-color: rgba(143, 104, 255, 0.5);
    }
    .vault-desktop-icon.dragging {
      cursor: grabbing;
      z-index: 50;
      opacity: 0.94;
      transform: scale(1.04);
      background: rgba(143, 104, 255, 0.24);
      border-color: rgba(168, 85, 247, 0.7);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    }
    .vault-desktop-icon__glyph {
      font-size: 42px;
      line-height: 1;
      width: ${ICON_SIZE}px;
      height: ${ICON_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
    .vault-desktop-icon__label {
      font-size: 11px;
      color: #e8e0f0;
      text-align: center;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

// ── Layout persistence and grid helpers ────────────────────────────
function _getMaxCols() {
  const width = _iconGrid?.clientWidth || window.innerWidth;
  return Math.max(1, Math.floor(Math.max(0, width - GRID_PAD_X * 2 - ICON_W) / CELL_W) + 1);
}

function _getMaxRows() {
  const height = _iconGrid?.clientHeight || Math.max(1, window.innerHeight - 104);
  return Math.max(1, Math.floor(Math.max(0, height - GRID_PAD_Y * 2 - ICON_H) / CELL_H) + 1);
}

function _clampCell(col, row) {
  return {
    col: Math.max(0, Math.min(_getMaxCols() - 1, Math.round(col))),
    row: Math.max(0, Math.min(_getMaxRows() - 1, Math.round(row))),
  };
}

function _isCellOccupied(col, row, ignoreAppId = null) {
  return Object.entries(_iconPositions).some(
    ([id, pos]) => id !== ignoreAppId && pos.col === col && pos.row === row
  );
}

function _findNearestFreeCell(targetCol, targetRow, ignoreAppId = null) {
  const target = _clampCell(targetCol, targetRow);
  if (!_isCellOccupied(target.col, target.row, ignoreAppId)) return target;

  const maxCols = _getMaxCols();
  const maxRows = _getMaxRows();
  const maxRadius = Math.max(maxCols, maxRows);

  for (let radius = 1; radius <= maxRadius; radius++) {
    const candidates = [];
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const col = target.col + dc;
        const row = target.row + dr;
        if (col < 0 || col >= maxCols || row < 0 || row >= maxRows) continue;
        candidates.push({ col, row, distance: (col - target.col) ** 2 + (row - target.row) ** 2 });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col);
    const free = candidates.find(({ col, row }) => !_isCellOccupied(col, row, ignoreAppId));
    if (free) return { col: free.col, row: free.row };
  }

  // Extremely small viewports may not have enough visible cells for every shortcut.
  // Keep the position bounded; normal desktop sizes always have enough cells.
  return target;
}

function _gridToPixels(col, row) {
  return { x: GRID_PAD_X + col * CELL_W, y: GRID_PAD_Y + row * CELL_H };
}

function _saveLayout() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(_iconPositions));
  } catch (err) {
    console.warn('[Desktop] Failed to save icon layout to localStorage:', err);
  }
}

function _loadLayout() {
  let saved = {};
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
    }
  } catch (err) {
    console.warn('[Desktop] Failed to read icon layout from localStorage:', err);
  }

  _iconPositions = Object.create(null);
  const maxRows = _getMaxRows();

  [...DEFAULT_ICONS, ...customShortcuts].forEach((def, index) => {
    const key = _iconKey(def);
    const existing = saved[key];
    if (
      existing &&
      Number.isFinite(existing.col) &&
      Number.isFinite(existing.row) &&
      existing.col >= 0 &&
      existing.row >= 0
    ) {
      const cell = _clampCell(existing.col, existing.row);
      if (!_isCellOccupied(cell.col, cell.row)) {
        _iconPositions[key] = cell;
        return;
      }
    }

    // Keep the existing top-to-bottom, left-to-right default ordering.
    const defaultCol = Math.floor(index / maxRows);
    const defaultRow = index % maxRows;
    _iconPositions[key] = _findNearestFreeCell(defaultCol, defaultRow);
  });
}

function _reflowLayout() {
  if (!_iconGrid) return;
  const previous = _iconPositions;
  _iconPositions = Object.create(null);

  // Preserve each icon's position where possible; clamp and resolve collisions
  // after the available viewport changes.
  for (const def of [...DEFAULT_ICONS, ...customShortcuts]) {
    const key = _iconKey(def);
    const pos = previous[key] || { col: 0, row: 0 };
    const cell = _findNearestFreeCell(pos.col, pos.row);
    _iconPositions[key] = cell;
  }

  _renderIcons();
  _saveLayout();
}

function _resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch (err) {
    console.warn('[Desktop] Failed to clear saved icon layout:', err);
  }
  _loadLayout();
  _renderIcons();
}

// ── Icon creation and drag logic ───────────────────────────────────
function _createIcon(def) {
  const el = document.createElement('div');
  el.className = 'vault-desktop-icon';
  el.dataset.appId = def.appId;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', def.label);
  el.tabIndex = 0;

  const key = _iconKey(def);
  const pos = _iconPositions[key] || { col: 0, row: 0 };
  const pixel = _gridToPixels(pos.col, pos.row);
  el.style.left = `${pixel.x}px`;
  el.style.top = `${pixel.y}px`;

  const glyph = document.createElement('div');
  glyph.className = 'vault-desktop-icon__glyph';
  glyph.textContent = def.icon;

  const label = document.createElement('div');
  label.className = 'vault-desktop-icon__label';
  label.textContent = def.label;
  el.append(glyph, label);

  let pointerActive = false;
  let hasMoved = false;
  let pointerId = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let startIconX = pixel.x;
  let startIconY = pixel.y;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    _selectIcon(el);

    pointerActive = true;
    hasMoved = false;
    pointerId = e.pointerId;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startIconX = parseFloat(el.style.left) || 0;
    startIconY = parseFloat(el.style.top) || 0;

    try { el.setPointerCapture(e.pointerId); } catch {}
  });

  el.addEventListener('pointermove', (e) => {
    if (!pointerActive || e.pointerId !== pointerId) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    if (!hasMoved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      hasMoved = true;
      el.classList.add('dragging');
    }
    if (!hasMoved) return;

    const maxX = Math.max(0, (_iconGrid?.clientWidth || window.innerWidth) - ICON_W);
    const maxY = Math.max(0, (_iconGrid?.clientHeight || window.innerHeight - 104) - ICON_H);
    el.style.left = `${Math.max(0, Math.min(maxX, startIconX + dx))}px`;
    el.style.top = `${Math.max(0, Math.min(maxY, startIconY + dy))}px`;
  });

  const finishPointer = (e, cancelled = false) => {
    if (!pointerActive || e.pointerId !== pointerId) return;
    pointerActive = false;
    const activePointerId = pointerId;
    pointerId = null;
    try {
      if (el.hasPointerCapture(activePointerId)) el.releasePointerCapture(activePointerId);
    } catch {}

    el.classList.remove('dragging');
    if (!hasMoved || cancelled) {
      // A cancelled pointer interaction restores the last committed position.
      const committed = _gridToPixels(
        _iconPositions[key]?.col ?? pos.col,
        _iconPositions[key]?.row ?? pos.row
      );
      el.style.left = `${committed.x}px`;
      el.style.top = `${committed.y}px`;
      return;
    }

    const currentX = parseFloat(el.style.left) || 0;
    const currentY = parseFloat(el.style.top) || 0;
    const rawCol = Math.round((currentX - GRID_PAD_X) / CELL_W);
    const rawRow = Math.round((currentY - GRID_PAD_Y) / CELL_H);
    const snapped = _findNearestFreeCell(rawCol, rawRow, key);
    _iconPositions[key] = snapped;

    const finalPixel = _gridToPixels(snapped.col, snapped.row);
    el.style.left = `${finalPixel.x}px`;
    el.style.top = `${finalPixel.y}px`;
    _saveLayout();
  };

  el.addEventListener('pointerup', (e) => finishPointer(e, false));
  el.addEventListener('pointercancel', (e) => finishPointer(e, true));

  el.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (hasMoved) return;
    if (def.url) AppRegistry.launch(def.appId, { url: def.url, title: def.label });
    else AppRegistry.launch(def.appId);
  });

  // Custom shortcuts can be removed from their own right-click menu.
  if (def.id && def.url) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'Open Website',
          icon: '🌐',
          action: () => AppRegistry.launch(def.appId, { url: def.url, title: def.label })
        },
        { type: 'separator' },
        {
          label: 'Remove Shortcut',
          icon: '🗑️',
          action: () => _removeCustomShortcut(def.id)
        }
      ]);
    });
  }

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (def.url) AppRegistry.launch(def.appId, { url: def.url, title: def.label });
      else AppRegistry.launch(def.appId);
    }
  });

  return el;
}

function _selectIcon(el) {
  if (_selectedIcon && _selectedIcon !== el) _selectedIcon.classList.remove('selected');
  _selectedIcon = el;
  el.classList.add('selected');
}

function _deselectAll() {
  if (_selectedIcon) {
    _selectedIcon.classList.remove('selected');
    _selectedIcon = null;
  }
}

// ── In-WebOS shortcut dialog (no native prompt/alert dialogs) ───────
function _showShortcutDialog(initial = {}) {
  if (!_root) return;
  _root.querySelector('.vault-shortcut-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'vault-shortcut-modal';
  overlay.style.cssText = 'position:absolute;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,3,12,.72);backdrop-filter:blur(8px);';
  const panel = document.createElement('form');
  panel.style.cssText = 'width:min(420px,100%);padding:22px;border:1px solid rgba(168,85,247,.45);border-radius:16px;background:#171124;color:#f5f3ff;box-shadow:0 24px 70px #0009;font:13px -apple-system,BlinkMacSystemFont,sans-serif;';
  panel.innerHTML = '<h2 style="margin:0 0 6px;font-size:18px">Pin website to desktop</h2><p style="margin:0 0 18px;color:#b8a9d8">Save a website as a desktop shortcut. Everything stays inside WebOS.</p><label style="display:block;margin:10px 0 5px">Shortcut name</label><input name="label" maxlength="60" required placeholder="Website name" style="box-sizing:border-box;width:100%;padding:10px;border-radius:8px;border:1px solid #594477;background:#0d0916;color:#fff"><label style="display:block;margin:12px 0 5px">Website URL</label><input name="url" type="url" required placeholder="https://example.com" style="box-sizing:border-box;width:100%;padding:10px;border-radius:8px;border:1px solid #594477;background:#0d0916;color:#fff"><p data-error style="min-height:16px;color:#fca5a5;margin:8px 0"></p><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" data-cancel style="padding:9px 13px;border:1px solid #594477;border-radius:8px;background:transparent;color:#ddd">Cancel</button><button type="submit" style="padding:9px 13px;border:0;border-radius:8px;background:#7c3aed;color:white;font-weight:600">Pin to desktop</button></div>';
  overlay.appendChild(panel);
  _root.appendChild(overlay);
  panel.elements.label.value = initial.label || '';
  panel.elements.url.value = initial.url || '';
  panel.querySelector('[data-cancel]').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('pointerdown', (event) => { if (event.target === overlay) overlay.remove(); });
  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    let url = panel.elements.url.value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const error = _addCustomShortcut(panel.elements.label.value, url);
    if (error) { panel.querySelector('[data-error]').textContent = error; return; }
    overlay.remove();
  });
  panel.elements.label.focus();
}

// ── Desktop context menu ───────────────────────────────────────────
function _onContextMenu(e) {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, [
    {
      label: 'Add Website Shortcut',
      icon: '🔗',
      action: () => _showShortcutDialog()

    },
    { type: 'separator' },
    {
      label: 'New Folder',
      icon: '📁',
      action: async () => {
        const name = prompt('Folder name:', 'New Folder');
        if (name) {
          await virtualFS.mkdir(`/Desktop/${name}`);
          _renderIcons();
        }
      }
    },
    {
      label: 'New Text File',
      icon: '📄',
      action: async () => {
        const name = prompt('File name:', 'Untitled.md');
        if (name) {
          await virtualFS.writeFile(`/Desktop/${name}`, '# Note\\n\\n', 'text/markdown');
          _renderIcons();
        }
      }
    },
    { type: 'separator' },
    { label: 'Reset Icon Layout', icon: '📐', action: _resetLayout },
    { label: 'Change Wallpaper', icon: '🖼️', action: () => AppRegistry.launch('settings') },
    { label: 'Display Settings', icon: '🖥️', action: () => AppRegistry.launch('settings') },
    { type: 'separator' },
    { label: 'Refresh', icon: '🔄', action: _renderIcons },
    { label: 'About This WebOS', icon: 'ℹ️', action: () => AppRegistry.launch('about') },
  ]);
}

// ── Render ──────────────────────────────────────────────────────────
function _renderIcons() {
  if (!_iconGrid) return;
  _iconGrid.textContent = '';
  for (const def of [...DEFAULT_ICONS, ...customShortcuts]) _iconGrid.appendChild(_createIcon(def));
  _selectedIcon = null;
}

// ── Public init ─────────────────────────────────────────────────────
export function init(mountTarget) {
  // Avoid duplicate desktop roots if init is called more than once.
  if (_root?.isConnected) return _root;

  _injectStyles();
  const mount = mountTarget || document.getElementById('vault-desktop');
  if (!mount) {
    console.warn('[Desktop] mount target not found');
    return null;
  }

  _root = document.createElement('div');
  _root.className = 'vault-desktop';
  _iconGrid = document.createElement('div');
  _iconGrid.className = 'vault-desktop-icons';
  _root.appendChild(_iconGrid);
  mount.appendChild(_root);

  // Load only after mounting so grid dimensions are available.
  _loadLayout();
  _renderIcons();

  _root.addEventListener('pointerdown', (e) => {
    if (e.target === _root || e.target === _iconGrid) _deselectAll();
  });
  _root.addEventListener('contextmenu', _onContextMenu);
  window.addEventListener('vaultos:shortcuts-changed', () => {
    customShortcuts = _loadCustomShortcuts();
    _loadLayout();
    _renderIcons();
  });

  if (typeof ResizeObserver !== 'undefined') {
    _resizeObserver = new ResizeObserver(() => _reflowLayout());
    _resizeObserver.observe(_iconGrid);
  } else {
    _resizeHandler = () => _reflowLayout();
    window.addEventListener('resize', _resizeHandler);
  }

  Store.on('wallpaper:changed', (url) => {
    if (!_root) return;
    if (url) _root.style.setProperty('--vault-wallpaper', `url(${url})`);
    else _root.style.removeProperty('--vault-wallpaper');
  });

  Store.on('theme:changed', () => {
    // Placeholder for future theme integration.
  });

  return _root;
}

export function getElement() { return _root; }

const Desktop = { init, getElement };
export default Desktop;
