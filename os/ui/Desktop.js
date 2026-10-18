// os/ui/Desktop.js — Main desktop surface
// Full-viewport container with wallpaper layer, icon grid, and
// right-click context menu integration.

import Store from '../core/Store.js';
import AppRegistry from '../core/AppRegistry.js';
import virtualFS from '../core/VirtualFS.js';
import { showContextMenu } from './ContextMenu.js';

// ── Default desktop icons ──────────────────────────────────────────
const DEFAULT_ICONS = [
  { appId: 'file-explorer', label: 'File Explorer', icon: '📁' },
  { appId: 'browser',       label: 'Browser',       icon: '🌐' },
  { appId: 'terminal',      label: 'Terminal',       icon: '💻' },
  { appId: 'notes',         label: 'Notes',          icon: '📝' },
  { appId: 'settings',      label: 'Settings',       icon: '⚙️' },
  { appId: 'vault-hub',     label: 'Vault Hub',      icon: '🏠' },
];

const CELL = 88;   // grid cell size px (icon 72 + padding)
const ICON_SIZE = 72;

let _root = null;
let _iconGrid = null;
let _selectedIcon = null;

// ── Styles ─────────────────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('vault-desktop-styles')) return;
  const s = document.createElement('style');
  s.id = 'vault-desktop-styles';
  s.textContent = `
    .vault-desktop {
      position: fixed;
      inset: 32px 0 0 0;          /* below TopMenuBar */
      overflow: hidden;
      z-index: 0;
      /* Default vault gradient wallpaper */
      background: var(--vault-wallpaper, linear-gradient(to top, #1a0033, #0d001a, #000000));
      background-size: cover;
      background-position: center;
    }
    .vault-desktop-icons {
      position: absolute;
      inset: 12px 12px 72px 12px;  /* margin from edges; bottom for dock */
      display: grid;
      grid-template-columns: repeat(auto-fill, ${CELL}px);
      grid-auto-rows: ${CELL + 24}px;
      gap: 4px;
      align-content: start;
      padding: 8px;
    }
    .vault-desktop-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: ${CELL}px;
      height: ${CELL + 20}px;
      border-radius: 10px;
      border: 2px solid transparent;
      cursor: default;
      user-select: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .vault-desktop-icon:hover {
      background: rgba(143, 104, 255, 0.1);
    }
    .vault-desktop-icon.selected {
      background: rgba(143, 104, 255, 0.18);
      border-color: rgba(143, 104, 255, 0.5);
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
      background: rgba(255,255,255,0.04);
      text-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .vault-desktop-icon__label {
      font-size: 11px;
      color: #e8e0f0;
      text-align: center;
      max-width: ${CELL - 8}px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
    }
  `;
  document.head.appendChild(s);
}

// ── Icon creation ──────────────────────────────────────────────────
function _createIcon(def) {
  const el = document.createElement('div');
  el.className = 'vault-desktop-icon';
  el.dataset.appId = def.appId;

  const glyph = document.createElement('div');
  glyph.className = 'vault-desktop-icon__glyph';
  glyph.textContent = def.icon;

  const label = document.createElement('div');
  label.className = 'vault-desktop-icon__label';
  label.textContent = def.label;

  el.appendChild(glyph);
  el.appendChild(label);

  // Single click — select
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    _selectIcon(el);
  });

  // Double click — launch
  el.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    AppRegistry.launch(def.appId);
  });

  return el;
}

function _selectIcon(el) {
  if (_selectedIcon) _selectedIcon.classList.remove('selected');
  _selectedIcon = el;
  el.classList.add('selected');
}

function _deselectAll() {
  if (_selectedIcon) {
    _selectedIcon.classList.remove('selected');
    _selectedIcon = null;
  }
}

// ── Desktop context menu ───────────────────────────────────────────
function _onContextMenu(e) {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, [
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
          await virtualFS.writeFile(`/Desktop/${name}`, '# Note\n\n', 'text/markdown');
          _renderIcons();
        }
      }
    },
    { type: 'separator' },
    { label: 'Change Wallpaper',  icon: '🖼️', action: () => AppRegistry.launch('settings') },
    { label: 'Display Settings',  icon: '🖥️', action: () => AppRegistry.launch('settings') },
    { type: 'separator' },
    { label: 'Refresh',           icon: '🔄', action: () => _renderIcons() },
    { label: 'About This WebOS',  icon: 'ℹ️', action: () => AppRegistry.launch('about') },
  ]);
}

// ── Render ──────────────────────────────────────────────────────────
function _renderIcons() {
  if (!_iconGrid) return;
  _iconGrid.textContent = ''; // clear
  for (const def of DEFAULT_ICONS) {
    _iconGrid.appendChild(_createIcon(def));
  }
}

// ── Public init ─────────────────────────────────────────────────────
export function init(mountTarget) {
  _injectStyles();

  const mount = mountTarget || document.getElementById('vault-desktop');
  if (!mount) {
    console.warn('[Desktop] mount target not found');
    return;
  }

  _root = document.createElement('div');
  _root.className = 'vault-desktop';

  _iconGrid = document.createElement('div');
  _iconGrid.className = 'vault-desktop-icons';
  _root.appendChild(_iconGrid);

  _renderIcons();

  // Click on blank space — deselect
  _root.addEventListener('pointerdown', () => _deselectAll());

  // Right-click
  _root.addEventListener('contextmenu', _onContextMenu);

  mount.appendChild(_root);

  // Listen for wallpaper changes
  Store.on('wallpaper:changed', (url) => {
    if (url) {
      _root.style.setProperty('--vault-wallpaper', `url(${url})`);
    } else {
      _root.style.removeProperty('--vault-wallpaper');
    }
  });

  // Listen for theme changes
  Store.on('theme:changed', () => {
    // Placeholder for future theme integration
  });
}

export function getElement() { return _root; }

const Desktop = { init, getElement };
export default Desktop;
