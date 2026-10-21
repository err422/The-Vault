// os/ui/ContextMenu.js — Reusable right-click context menu
// Renders a floating menu at cursor position with items, separators,
// and nested submenus. Only one menu is visible at a time.

const MENU_CLASS = 'vault-ctx-menu';
const SUB_CLASS  = 'vault-ctx-sub';

let _activeMenu = null;

/**
 * Inject styles once.
 */
function _injectStyles() {
  if (document.getElementById('vault-ctx-styles')) return;
  const style = document.createElement('style');
  style.id = 'vault-ctx-styles';
  style.textContent = `
    .${MENU_CLASS} {
      position: fixed;
      z-index: 9000;
      min-width: 180px;
      max-width: 280px;
      padding: 4px 0;
      margin: 0;
      list-style: none;
      background: rgba(18, 0, 36, 0.92);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.05) inset;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e8e0f0;
      user-select: none;
      animation: vault-ctx-in 0.12s ease-out;
    }
    @keyframes vault-ctx-in {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    .${MENU_CLASS} li {
      position: relative;
    }
    .${MENU_CLASS} .vault-ctx-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      cursor: default;
      border-radius: 6px;
      margin: 1px 4px;
      transition: background 0.1s;
    }
    .${MENU_CLASS} .vault-ctx-item:hover {
      background: rgba(143, 104, 255, 0.25);
    }
    .${MENU_CLASS} .vault-ctx-item[data-disabled="true"] {
      opacity: 0.38;
      pointer-events: none;
    }
    .${MENU_CLASS} .vault-ctx-icon {
      width: 18px;
      text-align: center;
      flex-shrink: 0;
      font-size: 14px;
    }
    .${MENU_CLASS} .vault-ctx-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .${MENU_CLASS} .vault-ctx-shortcut {
      margin-left: 18px;
      font-size: 11px;
      opacity: 0.5;
      flex-shrink: 0;
    }
    .${MENU_CLASS} .vault-ctx-arrow {
      margin-left: 8px;
      font-size: 10px;
      opacity: 0.6;
      flex-shrink: 0;
    }
    .${MENU_CLASS} .vault-ctx-sep {
      height: 1px;
      margin: 4px 10px;
      background: rgba(255, 255, 255, 0.1);
    }
    /* Submenu positioning */
    .${MENU_CLASS} .${SUB_CLASS} {
      display: none;
      position: absolute;
      left: 100%;
      top: -4px;
    }
    .${MENU_CLASS} li:hover > .${SUB_CLASS} {
      display: block;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Build a <ul> menu element from an items array.
 * @param {Array} items
 * @returns {HTMLUListElement}
 */
function _buildMenu(items) {
  const ul = document.createElement('ul');
  ul.className = MENU_CLASS;

  for (const item of items) {
    const li = document.createElement('li');

    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'vault-ctx-sep';
      li.appendChild(sep);
      ul.appendChild(li);
      continue;
    }

    const row = document.createElement('div');
    row.className = 'vault-ctx-item';
    if (item.disabled) row.dataset.disabled = 'true';

    // Icon
    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = 'vault-ctx-icon';
      ico.textContent = item.icon;
      row.appendChild(ico);
    }

    // Label
    const lbl = document.createElement('span');
    lbl.className = 'vault-ctx-label';
    lbl.textContent = item.label || '';
    row.appendChild(lbl);

    // Shortcut
    if (item.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'vault-ctx-shortcut';
      sc.textContent = item.shortcut;
      row.appendChild(sc);
    }

    // Submenu arrow
    if (item.submenu) {
      const arrow = document.createElement('span');
      arrow.className = 'vault-ctx-arrow';
      arrow.textContent = '▸';
      row.appendChild(arrow);
    }

    // Click action
    if (item.action && !item.disabled && !item.submenu) {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        item.action();
      });
    }

    li.appendChild(row);

    // Submenu
    if (item.submenu) {
      const sub = _buildMenu(item.submenu);
      sub.classList.add(SUB_CLASS);
      li.appendChild(sub);
    }

    ul.appendChild(li);
  }

  return ul;
}

/**
 * Show a context menu at (x, y) with the given items.
 * @param {number} x
 * @param {number} y
 * @param {Array} items
 */
export function showContextMenu(x, y, items) {
  _injectStyles();
  hideContextMenu();

  const menu = _buildMenu(items);
  document.body.appendChild(menu);
  _activeMenu = menu;

  // Measure and clamp to viewport
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x;
  let top  = y;
  if (left + rect.width > vw) left = vw - rect.width - 4;
  if (top + rect.height > vh) top = vh - rect.height - 4;
  if (left < 0) left = 4;
  if (top < 0) top = 4;

  menu.style.left = left + 'px';
  menu.style.top  = top + 'px';

  // Close on outside click or Escape
  const _onClose = (e) => {
    if (e.type === 'keydown' && e.key !== 'Escape') return;

    // Pointer events inside the menu must not remove the clicked item before
    // its click handler fires. Only outside clicks should dismiss the menu.
    if (e.type === 'pointerdown' && _activeMenu?.contains(e.target)) return;

    hideContextMenu();
    document.removeEventListener('pointerdown', _onClose, true);
    document.removeEventListener('keydown', _onClose, true);
  };
  // Defer so current click doesn't immediately close
  requestAnimationFrame(() => {
    document.addEventListener('pointerdown', _onClose, true);
    document.addEventListener('keydown', _onClose, true);
  });
}

/**
 * Hide any currently visible context menu.
 */
export function hideContextMenu() {
  if (_activeMenu) {
    _activeMenu.remove();
    _activeMenu = null;
  }
}

export default { showContextMenu, hideContextMenu };
