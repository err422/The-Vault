/**
 * WindowFrame.js — Individual window DOM & interaction for The Web Vault WebOS
 *
 * Creates the full chrome (titlebar, controls, content area, resize handles)
 * for a single window instance and wires up drag, resize, snap, minimize,
 * maximize, restore, and close interactions.
 *
 * Design constraints:
 *   - GPU-accelerated positioning via transform: translate3d
 *   - setPointerCapture for all drag/resize for reliability
 *   - requestAnimationFrame-batched DOM updates
 *   - pointer-events: none on iframes during drag (via body.is-dragging-window)
 *   - z-index 100–899, managed by WindowManager
 */

import SnapOverlay from './SnapOverlay.js';
import settingsManager from '../core/SettingsManager.js';

/* ------------------------------------------------------------------ */
/*  Style injection (once per document)                                */
/* ------------------------------------------------------------------ */
function injectStyles() {
  if (document.getElementById('vault-window-frame-styles')) return;

  const style = document.createElement('style');
  style.id = 'vault-window-frame-styles';
  style.textContent = /* css */ `
    /* ---- Drag safety ---- */
    body.is-dragging-window iframe,
    body.is-dragging-window webview {
      pointer-events: none !important;
    }
    body.is-dragging-window {
      cursor: grabbing !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }

    /* ---- Window root ---- */
    .vault-window {
      position: absolute;
      display: flex;
      flex-direction: column;
      border-radius: 10px;
      overflow: hidden;
      box-shadow:
        0  4px  24px rgba(0, 0, 0, 0.55),
        0  1px   3px rgba(0, 0, 0, 0.35),
        0  0   0  1px rgba(143, 104, 255, 0.12);
      background: var(--vault-window-bg, #1a0033);
      border: 1px solid rgba(255, 255, 255, 0.08);
      will-change: transform;
      contain: layout style;
      /* initial off-screen so first paint is clean */
      top: 0;
      left: 0;
    }

    .vault-window.focused {
      box-shadow:
        0  8px  40px rgba(0, 0, 0, 0.7),
        0  2px   6px rgba(0, 0, 0, 0.45),
        0  0   0  1px rgba(143, 104, 255, 0.25);
    }

    /* ---- Titlebar ---- */
    .window-titlebar {
      height: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      padding: 0 10px;
      background: var(--vault-titlebar-bg, linear-gradient(180deg, rgba(50, 20, 80, 0.95), rgba(30, 10, 55, 0.95)));
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      user-select: none;
      -webkit-user-select: none;
      position: relative;
      z-index: 1;
    }

    .vault-window:not(.focused) .window-titlebar {
      background: var(--vault-titlebar-bg-blur, linear-gradient(180deg, rgba(35, 15, 55, 0.92), rgba(22, 8, 40, 0.92)));
    }

    /* ---- Traffic-light controls (macOS style, left side) ---- */
    .window-controls {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      padding-right: 10px;
    }

    .window-controls button {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      border: none;
      padding: 0;
      cursor: pointer;
      position: relative;
      transition: filter 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .window-controls button:hover {
      filter: brightness(1.3);
    }

    .window-controls button:active {
      filter: brightness(0.85);
    }

    /* Glyph icons — invisible until hover on titlebar */
    .window-controls button::after {
      content: '';
      display: block;
      opacity: 0;
      transition: opacity 0.12s ease;
    }

    .window-titlebar:hover .window-controls button::after {
      opacity: 1;
    }

    /* Close (red) */
    .btn-close {
      background: #ff5f57;
    }
    .btn-close::after {
      width: 7px; height: 7px;
      /* × via css: two rotated bars */
      background: linear-gradient(45deg, transparent 42%, #4a0002 42%, #4a0002 58%, transparent 58%),
                  linear-gradient(-45deg, transparent 42%, #4a0002 42%, #4a0002 58%, transparent 58%);
    }

    /* Minimize (yellow) */
    .btn-minimize {
      background: #febc2e;
    }
    .btn-minimize::after {
      width: 7px; height: 1.5px;
      background: #9a6a00;
      border-radius: 1px;
    }

    /* Maximize (green) */
    .btn-maximize {
      background: #28c840;
    }
    .btn-maximize::after {
      width: 6px; height: 6px;
      border: 1.3px solid #0a5e13;
      border-radius: 1px;
      background: transparent;
    }

    /* Unfocused: gray out */
    .vault-window:not(.focused) .window-controls button {
      background: rgba(255, 255, 255, 0.15);
    }
    .vault-window:not(.focused) .window-controls button::after {
      opacity: 0 !important;
    }

    /* ---- Title text ---- */
    .window-title {
      flex: 1;
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .vault-window:not(.focused) .window-title {
      color: rgba(255, 255, 255, 0.45);
    }

    .window-title-icon {
      width: 14px;
      height: 14px;
      margin-right: 6px;
      vertical-align: middle;
      display: inline-block;
    }

    /* ---- Drag region (fills remaining space) ---- */
    .window-drag-region {
      position: absolute;
      inset: 0;
      z-index: 0;          /* behind controls + title */
      /* cursor set to default; changes to grab on hover implicitly via CSS */
      cursor: default;
    }

    /* ---- Content area ---- */
    .window-content {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: var(--vault-window-content-bg, #0d001a);
    }

    /* ---- Resize handles ---- */
    .vault-resize-handle {
      position: absolute;
      z-index: 2;
      /* invisible but clickable */
      background: transparent;
    }

    .vault-resize-handle.handle-n {
      top: -3px; left: 12px; right: 12px; height: 6px;
      cursor: n-resize;
    }
    .vault-resize-handle.handle-s {
      bottom: -3px; left: 12px; right: 12px; height: 6px;
      cursor: s-resize;
    }
    .vault-resize-handle.handle-e {
      right: -3px; top: 12px; bottom: 12px; width: 6px;
      cursor: e-resize;
    }
    .vault-resize-handle.handle-w {
      left: -3px; top: 12px; bottom: 12px; width: 6px;
      cursor: w-resize;
    }
    .vault-resize-handle.handle-nw {
      top: -3px; left: -3px; width: 12px; height: 12px;
      cursor: nw-resize;
    }
    .vault-resize-handle.handle-ne {
      top: -3px; right: -3px; width: 12px; height: 12px;
      cursor: ne-resize;
    }
    .vault-resize-handle.handle-sw {
      bottom: -3px; left: -3px; width: 12px; height: 12px;
      cursor: sw-resize;
    }
    .vault-resize-handle.handle-se {
      bottom: -3px; right: -3px; width: 12px; height: 12px;
      cursor: se-resize;
    }

    /* ---- State transitions ---- */
    .vault-window.animating {
      transition: transform 0.25s cubic-bezier(.4, 0, .2, 1),
                  width     0.25s cubic-bezier(.4, 0, .2, 1),
                  height    0.25s cubic-bezier(.4, 0, .2, 1),
                  opacity   0.2s  ease,
                  border-radius 0.25s ease;
    }

    .vault-window.state-maximized {
      border-radius: 0;
    }

    .vault-window.state-minimized {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Shared snap overlay singleton                                       */
/* ------------------------------------------------------------------ */
let sharedSnapOverlay = null;
function getSnapOverlay() {
  if (!sharedSnapOverlay) sharedSnapOverlay = new SnapOverlay();
  return sharedSnapOverlay;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const SNAP_EDGE_PX = 12;
const TITLEBAR_HEIGHT = 36;
const RESIZE_HANDLES = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

// Replace this placeholder with the approved Vault support-page URL when ready.
const SUPPORT_PAGE_URL = 'REPLACE_WITH_SUPPORT_LINK';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns the usable work area (excluding taskbar, etc.).
 * The taskbar height is read from the CSS custom property if available.
 */
function getWorkArea(ignoreDock = false) {
  const topBar = document.querySelector(
    '.vault-menubar, #vault-top-bar, #top-menu-bar, .vault-top-menu, .top-menu-bar',
  );
  const topOffset = topBar && topBar.getClientRects().length
    ? topBar.getBoundingClientRect().height
    : 0;
  const root = document.documentElement;
  const taskbarValue = getComputedStyle(root).getPropertyValue('--vault-taskbar-height').trim();
  const taskbarH = Number.parseFloat(taskbarValue) || 48;
  const reserveDock = !ignoreDock && !document.body.classList.contains('os-window-maximized');

  return {
    x: 0,
    y: topOffset,
    width: window.innerWidth,
    height: Math.max(0, window.innerHeight - topOffset - (reserveDock ? taskbarH : 0)),
  };
}

/**
 * Detect which snap zone (if any) a pointer position is near.
 * @param {number} px  pointer clientX
 * @param {number} py  pointer clientY
 * @returns {string|null}
 */
function detectSnapZone(px, py) {
  const nearLeft  = px < SNAP_EDGE_PX;
  const nearRight = px > window.innerWidth - SNAP_EDGE_PX;
  const nearTop   = py < SNAP_EDGE_PX;
  const nearBottom = py > getWorkArea().height - SNAP_EDGE_PX;

  if (nearTop && nearLeft)   return 'top-left';
  if (nearTop && nearRight)  return 'top-right';
  if (nearBottom && nearLeft)  return 'bottom-left';
  if (nearBottom && nearRight) return 'bottom-right';
  if (nearTop)   return 'full';
  if (nearLeft)  return 'left';
  if (nearRight) return 'right';
  return null;
}

/**
 * Get the actual pixel bounds for a snap zone, suitable for setting window size.
 * @param {string} zone
 * @returns {{ x:number, y:number, width:number, height:number }}
 */
function getSnapBounds(zone) {
  const wa = getWorkArea();
  const halfW = Math.round(wa.width / 2);
  const halfH = Math.round(wa.height / 2);

  switch (zone) {
    case 'full':         return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
    case 'left':         return { x: wa.x, y: wa.y, width: halfW,    height: wa.height };
    case 'right':        return { x: wa.x + halfW, y: wa.y, width: wa.width - halfW, height: wa.height };
    case 'top-left':     return { x: wa.x, y: wa.y, width: halfW, height: halfH };
    case 'top-right':    return { x: wa.x + halfW, y: wa.y, width: wa.width - halfW, height: halfH };
    case 'bottom-left':  return { x: wa.x, y: wa.y + halfH, width: halfW, height: wa.height - halfH };
    case 'bottom-right': return { x: wa.x + halfW, y: wa.y + halfH, width: wa.width - halfW, height: wa.height - halfH };
    default: return null;
  }
}

/* ================================================================== */
/*  WindowFrame                                                         */
/* ================================================================== */

export default class WindowFrame {
  /* ---- Instance fields ---- */
  /** @type {string} */
  #instanceId;
  /** @type {HTMLDivElement} */
  #el;
  /** @type {HTMLDivElement} */
  #contentEl;
  /** @type {HTMLSpanElement} */
  #titleEl;

  /** Current pixel bounds {x, y, width, height} */
  #bounds = { x: 100, y: 100, width: 800, height: 500 };
  /** Saved bounds before maximize/snap */
  #restoreBounds = null;
  /** 'normal' | 'maximized' | 'minimized' | 'snapped' */
  #state = 'normal';
  /** Minimum size */
  #minSize = { width: 320, height: 200 };

  /** Options passed from WindowManager */
  #options;

  /** Drag state */
  #drag = { active: false, offsetX: 0, offsetY: 0, rafId: 0 };
  /** Resize state */
  #resize = { active: false, handle: '', startBounds: null, startX: 0, startY: 0, rafId: 0 };

  /** Bound event handlers for cleanup */
  #handlers = {};

  /** Store subscription unsub function */
  #unsubStore = null;
  #iframeCovers = new Map();
  #iframeCoverObserver = null;
  #iframeCoverResizeObserver = null;
  #iframeCoverSettingsUnsubscribe = null;
  #syncFullscreenIframeCovers = null;

  /**
   * @param {string} instanceId - unique window instance id from WindowManager
   * @param {object} options
   * @param {string}  options.title
   * @param {string} [options.icon]         - URL or emoji for title icon
   * @param {number} [options.x]
   * @param {number} [options.y]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {number} [options.minWidth]
   * @param {number} [options.minHeight]
   * @param {boolean}[options.resizable=true]
   * @param {Function}[options.onClose]     - callback when close button is clicked
   * @param {Function}[options.onMinimize]
   * @param {Function}[options.onFocus]
   */
  constructor(instanceId, options = {}) {
    injectStyles();

    this.#instanceId = instanceId;
    this.#options = options;

    // Initial bounds
    if (options.x != null) this.#bounds.x = options.x;
    if (options.y != null) this.#bounds.y = options.y;
    if (options.width != null) this.#bounds.width = options.width;
    if (options.height != null) this.#bounds.height = options.height;
    if (options.minWidth != null) this.#minSize.width = options.minWidth;
    if (options.minHeight != null) this.#minSize.height = options.minHeight;

    this.#buildDOM();
    this.#attachListeners();
    this.#applyBounds();
    this.#setupFullscreenIframeCovers();

    // Try subscribing to the store if available
    this.#trySubscribeStore();
  }

  /* ================================================================ */
  /*  DOM Construction                                                 */
  /* ================================================================ */

  #buildDOM() {
    const el = document.createElement('div');
    el.className = 'vault-window focused';
    el.dataset.instanceId = this.#instanceId;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', this.#options.title || 'Window');

    /* -- Titlebar -- */
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';

    // Drag region (full titlebar, behind everything)
    const dragRegion = document.createElement('div');
    dragRegion.className = 'window-drag-region';
    titlebar.appendChild(dragRegion);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'window-controls';
    controls.style.position = 'relative';
    controls.style.zIndex = '1';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn-close';
    btnClose.setAttribute('aria-label', 'Close');
    btnClose.tabIndex = -1;

    const btnMinimize = document.createElement('button');
    btnMinimize.className = 'btn-minimize';
    btnMinimize.setAttribute('aria-label', 'Minimize');
    btnMinimize.tabIndex = -1;

    const btnMaximize = document.createElement('button');
    btnMaximize.className = 'btn-maximize';
    btnMaximize.setAttribute('aria-label', 'Maximize');
    btnMaximize.tabIndex = -1;

    controls.append(btnClose, btnMinimize, btnMaximize);

    // Title
    const titleSpan = document.createElement('span');
    titleSpan.className = 'window-title';
    titleSpan.style.position = 'relative';
    titleSpan.style.zIndex = '1';

    if (this.#options.icon) {
      if (this.#options.icon.startsWith('http') || this.#options.icon.startsWith('/') || this.#options.icon.startsWith('.')) {
        const img = document.createElement('img');
        img.className = 'window-title-icon';
        img.src = this.#options.icon;
        img.alt = '';
        img.draggable = false;
        titleSpan.appendChild(img);
      } else {
        // treat as emoji
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'window-title-icon';
        emojiSpan.textContent = this.#options.icon;
        emojiSpan.style.fontSize = '14px';
        titleSpan.appendChild(emojiSpan);
      }
    }
    const titleText = document.createTextNode(this.#options.title || '');
    titleSpan.appendChild(titleText);
    this.#titleEl = titleSpan;

    // Spacer on right to balance the controls on left (keeps title centered)
    const spacer = document.createElement('div');
    spacer.style.width = '62px'; // approximate width of controls
    spacer.style.flexShrink = '0';

    titlebar.append(controls, titleSpan, spacer);

    /* -- Content -- */
    const content = document.createElement('div');
    content.className = 'window-content';
    content.dataset.windowContent = this.#instanceId;
    this.#contentEl = content;

    /* -- Resize handles -- */
    const handles = [];
    const resizable = this.#options.resizable !== false;
    if (resizable) {
      for (const dir of RESIZE_HANDLES) {
        const h = document.createElement('div');
        h.className = `vault-resize-handle handle-${dir}`;
        h.dataset.handle = dir;
        handles.push(h);
      }
    }

    /* -- Assemble -- */
    el.append(titlebar, content, ...handles);
    this.#el = el;

    // Store references
    this._btnClose = btnClose;
    this._btnMinimize = btnMinimize;
    this._btnMaximize = btnMaximize;
    this._titlebar = titlebar;
    this._dragRegion = dragRegion;
  }

  /* ================================================================ */
  /*  Event listeners                                                  */
  /* ================================================================ */

  #attachListeners() {
    // ---- Focus on click anywhere in the window ----
    this.#handlers.onPointerDownWindow = (e) => {
      if (this.#options.onFocus) this.#options.onFocus(this.#instanceId);
    };
    this.#el.addEventListener('pointerdown', this.#handlers.onPointerDownWindow);

    // ---- Close ----
    this.#handlers.onClose = (e) => {
      e.stopPropagation();

      // Open the support page directly from the user's click so browsers don't
      // treat it as a popup. The placeholder intentionally does nothing until
      // a real HTTPS support URL is configured.
      if (SUPPORT_PAGE_URL.startsWith('https://') && !SUPPORT_PAGE_URL.includes('REPLACE_WITH_SUPPORT_LINK')) {
        window.open(SUPPORT_PAGE_URL, '_blank', 'noopener,noreferrer');
      }

      if (this.#options.onClose) this.#options.onClose(this.#instanceId);
    };
    this._btnClose.addEventListener('click', this.#handlers.onClose);

    // ---- Minimize ----
    this.#handlers.onMinimize = (e) => {
      e.stopPropagation();
      this.minimize();
      if (this.#options.onMinimize) this.#options.onMinimize(this.#instanceId);
    };
    this._btnMinimize.addEventListener('click', this.#handlers.onMinimize);

    // ---- Maximize toggle ----
    this.#handlers.onMaxToggle = (e) => {
      e.stopPropagation();
      this.#toggleMaximize();
    };
    this._btnMaximize.addEventListener('click', this.#handlers.onMaxToggle);

    // ---- Double-click titlebar → toggle maximize ----
    this.#handlers.onDblClick = (e) => {
      // Don't toggle if double-clicking a button
      if (e.target.closest('.window-controls')) return;
      this.#toggleMaximize();
    };
    this._titlebar.addEventListener('dblclick', this.#handlers.onDblClick);

    // ---- Drag on titlebar ----
    this.#handlers.onDragStart = (e) => this.#onDragStart(e);
    this.#handlers.onDragMove = (e) => this.#onDragMove(e);
    this.#handlers.onDragEnd = (e) => this.#onDragEnd(e);
    this._dragRegion.addEventListener('pointerdown', this.#handlers.onDragStart);

    // ---- Resize handles ----
    if (this.#options.resizable !== false) {
      this.#handlers.onResizeStart = (e) => this.#onResizeStart(e);
      this.#handlers.onResizeMove = (e) => this.#onResizeMove(e);
      this.#handlers.onResizeEnd = (e) => this.#onResizeEnd(e);
      this.#el.querySelectorAll('.vault-resize-handle').forEach((h) => {
        h.addEventListener('pointerdown', this.#handlers.onResizeStart);
      });
    }
  }


  /**
   * Cover embedded iframes while click-to-fullscreen is enabled and the
   * document is not fullscreen. Iframe clicks do not bubble to the parent.
   */
  #setupFullscreenIframeCovers() {
    const isFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    const syncCovers = () => {
      const shouldCover = Boolean(settingsManager.get('autoFullscreenOnClick')) && !isFullscreen();
      const frames = [...this.#contentEl.querySelectorAll('iframe')];

      for (const [frame, cover] of this.#iframeCovers) {
        if (!frame.isConnected || !this.#contentEl.contains(frame) || !shouldCover) {
          cover.remove();
          this.#iframeCovers.delete(frame);
          try { this.#iframeCoverResizeObserver?.unobserve(frame); } catch {}
        }
      }
      if (!shouldCover) return;

      const contentRect = this.#contentEl.getBoundingClientRect();
      for (const frame of frames) {
        if (this.#iframeCovers.has(frame)) continue;
        const cover = document.createElement('button');
        cover.type = 'button';
        cover.className = 'vault-iframe-fullscreen-cover';
        cover.setAttribute('aria-label', 'Click to enter fullscreen');
        cover.title = 'Click to enter fullscreen';
        cover.style.cssText = 'position:absolute;z-index:9999;padding:0;margin:0;border:0;background:transparent;cursor:pointer;touch-action:manipulation;';
        cover.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          // Remove cover immediately on first click so user can interact
          cover.remove();
          this.#iframeCovers.delete(frame);
          try { this.#iframeCoverResizeObserver?.unobserve(frame); } catch {}

          if (isFullscreen()) return;
          const root = document.documentElement;
          const request = root.requestFullscreen || root.webkitRequestFullscreen;
          if (request) {
            try {
              const result = request.call(root);
              if (result && typeof result.catch === 'function') {
                result.catch((error) => console.debug('[WebOS] Fullscreen request from iframe cover was blocked:', error));
              }
            } catch (error) {
              console.debug('[WebOS] Fullscreen request from iframe cover was blocked:', error);
            }
          }
        });
        this.#contentEl.appendChild(cover);
        this.#iframeCovers.set(frame, cover);
        try { this.#iframeCoverResizeObserver?.observe(frame); } catch {}
      }

      for (const [frame, cover] of this.#iframeCovers) {
        const frameRect = frame.getBoundingClientRect();
        cover.style.left = `${frameRect.left - contentRect.left + this.#contentEl.scrollLeft}px`;
        cover.style.top = `${frameRect.top - contentRect.top + this.#contentEl.scrollTop}px`;
        cover.style.width = `${Math.max(0, frameRect.width)}px`;
        cover.style.height = `${Math.max(0, frameRect.height)}px`;
      }
    };

    this.#syncFullscreenIframeCovers = syncCovers;
    this.#iframeCoverObserver = new MutationObserver(syncCovers);
    this.#iframeCoverObserver.observe(this.#contentEl, { childList: true, subtree: true });
    if (window.ResizeObserver) {
      this.#iframeCoverResizeObserver = new ResizeObserver(syncCovers);
      this.#iframeCoverResizeObserver.observe(this.#contentEl);
    }
    this.#handlers.onFullscreenCoverChange = syncCovers;
    document.addEventListener('fullscreenchange', syncCovers);
    document.addEventListener('webkitfullscreenchange', syncCovers);
    window.addEventListener('resize', syncCovers);

    // SettingsManager emits this event when the user toggles auto-fullscreen.
    import('../core/Store.js').then(({ default: store }) => {
      this.#iframeCoverSettingsUnsubscribe = store.on('settings:changed', syncCovers);
    }).catch(() => {});
    syncCovers();
  }

  /* ================================================================ */
  /*  Drag system                                                      */
  /* ================================================================ */

  #onDragStart(e) {
    if (e.button !== 0) return; // left button only

    e.preventDefault();
    e.stopPropagation();

    // If maximized or snapped, restore to normal before dragging
    if (this.#state === 'maximized' || this.#state === 'snapped') {
      this.#restoreForDrag(e.clientX, e.clientY);
    }

    document.body.classList.add('is-dragging-window');
    this._dragRegion.setPointerCapture(e.pointerId);

    this.#drag.active = true;
    this.#drag.offsetX = e.clientX - this.#bounds.x;
    this.#drag.offsetY = e.clientY - this.#bounds.y;

    // Bind move/up on the drag region (pointer is captured)
    this._dragRegion.addEventListener('pointermove', this.#handlers.onDragMove);
    this._dragRegion.addEventListener('pointerup', this.#handlers.onDragEnd);
    this._dragRegion.addEventListener('pointercancel', this.#handlers.onDragEnd);
  }

  #onDragMove(e) {
    if (!this.#drag.active) return;

    const newX = e.clientX - this.#drag.offsetX;
    const newY = e.clientY - this.#drag.offsetY;

    // RAF-batched position update
    if (this.#drag.rafId) cancelAnimationFrame(this.#drag.rafId);
    this.#drag.rafId = requestAnimationFrame(() => {
      this.#bounds.x = newX;
      this.#bounds.y = newY;
      this.#el.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    });

    // Snap zone detection
    const zone = detectSnapZone(e.clientX, e.clientY);
    const overlay = getSnapOverlay();
    if (zone) {
      overlay.show(zone);
    } else {
      overlay.hide();
    }
  }

  #onDragEnd(e) {
    if (!this.#drag.active) return;
    this.#drag.active = false;

    document.body.classList.remove('is-dragging-window');
    this._dragRegion.releasePointerCapture(e.pointerId);
    this._dragRegion.removeEventListener('pointermove', this.#handlers.onDragMove);
    this._dragRegion.removeEventListener('pointerup', this.#handlers.onDragEnd);
    this._dragRegion.removeEventListener('pointercancel', this.#handlers.onDragEnd);

    if (this.#drag.rafId) cancelAnimationFrame(this.#drag.rafId);

    const overlay = getSnapOverlay();
    const zone = overlay.currentZone;
    overlay.hide();

    if (zone) {
      // Snap the window
      this.#restoreBounds = { ...this.#bounds };
      const snapBounds = getSnapBounds(zone);
      if (snapBounds) {
        this.#bounds = snapBounds;
        this.#state = zone === 'full' ? 'maximized' : 'snapped';
        this.#el.classList.toggle('state-maximized', zone === 'full');
        this.#animateToBounds();
      }
    } else {
      // Commit final position
      this.#commitToStore();
    }
  }

  /**
   * When the user starts dragging a maximized/snapped window,
   * restore it to its previous size, centering proportionally under the cursor.
   */
  #restoreForDrag(pointerX, pointerY) {
    const prevBounds = this.#restoreBounds || {
      x: 100, y: 100,
      width: this.#minSize.width + 200,
      height: this.#minSize.height + 100,
    };

    // Position so cursor is proportionally at the same horizontal % within the restored window
    const ratio = (pointerX - this.#bounds.x) / this.#bounds.width;
    const newX = pointerX - prevBounds.width * ratio;
    const newY = pointerY - TITLEBAR_HEIGHT / 2;

    this.#bounds = {
      x: newX,
      y: Math.max(0, newY),
      width: prevBounds.width,
      height: prevBounds.height,
    };
    this.#state = 'normal';
    this.#el.classList.remove('state-maximized');
    this.#applyBounds();

    // Update drag offset for the new position
    this.#drag.offsetX = pointerX - this.#bounds.x;
    this.#drag.offsetY = pointerY - this.#bounds.y;
  }

  /* ================================================================ */
  /*  Resize system                                                    */
  /* ================================================================ */

  #onResizeStart(e) {
    if (e.button !== 0) return;
    if (this.#state === 'maximized') return; // Can't resize maximized

    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget.dataset.handle;
    document.body.classList.add('is-dragging-window');
    e.currentTarget.setPointerCapture(e.pointerId);

    this.#resize.active = true;
    this.#resize.handle = handle;
    this.#resize.startBounds = { ...this.#bounds };
    this.#resize.startX = e.clientX;
    this.#resize.startY = e.clientY;
    this.#resize._target = e.currentTarget;

    e.currentTarget.addEventListener('pointermove', this.#handlers.onResizeMove);
    e.currentTarget.addEventListener('pointerup', this.#handlers.onResizeEnd);
    e.currentTarget.addEventListener('pointercancel', this.#handlers.onResizeEnd);
  }

  #onResizeMove(e) {
    if (!this.#resize.active) return;

    const dx = e.clientX - this.#resize.startX;
    const dy = e.clientY - this.#resize.startY;
    const handle = this.#resize.handle;
    const sb = this.#resize.startBounds;
    const min = this.#minSize;

    let { x, y, width, height } = { ...sb };

    // Horizontal
    if (handle.includes('e')) {
      width = Math.max(min.width, sb.width + dx);
    }
    if (handle.includes('w')) {
      const newW = Math.max(min.width, sb.width - dx);
      x = sb.x + sb.width - newW;     // anchor right edge
      width = newW;
    }

    // Vertical
    if (handle.includes('s')) {
      height = Math.max(min.height, sb.height + dy);
    }
    if (handle.includes('n')) {
      const newH = Math.max(min.height, sb.height - dy);
      y = sb.y + sb.height - newH;    // anchor bottom edge
      height = newH;
    }

    if (this.#resize.rafId) cancelAnimationFrame(this.#resize.rafId);
    this.#resize.rafId = requestAnimationFrame(() => {
      this.#bounds = { x, y, width, height };
      this.#el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      this.#el.style.width = `${width}px`;
      this.#el.style.height = `${height}px`;
    });
  }

  #onResizeEnd(e) {
    if (!this.#resize.active) return;
    this.#resize.active = false;

    document.body.classList.remove('is-dragging-window');
    const target = this.#resize._target;
    if (target) {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', this.#handlers.onResizeMove);
      target.removeEventListener('pointerup', this.#handlers.onResizeEnd);
      target.removeEventListener('pointercancel', this.#handlers.onResizeEnd);
    }

    if (this.#resize.rafId) cancelAnimationFrame(this.#resize.rafId);

    // If it was snapped, it's now normal
    if (this.#state === 'snapped') {
      this.#state = 'normal';
    }

    this.#commitToStore();
  }

  /* ================================================================ */
  /*  Window state transitions                                         */
  /* ================================================================ */

  maximize() {
    if (this.#state === 'maximized') return;
    this.#restoreBounds = { ...this.#bounds };
    // Maximized windows use the full viewport below the visible top menu bar.
    document.body.classList.add('os-window-maximized');
    const wa = getWorkArea(true);
    this.#bounds = { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
    this.#state = 'maximized';
    this.#el.classList.add('state-maximized');
    this.#animateToBounds();
    this.#commitToStore();
  }

  minimize() {
    if (this.#state === 'minimized') return;
    if (this.#state === 'normal' || this.#state === 'snapped') {
      this.#restoreBounds = { ...this.#bounds };
    }
    const wasMaximized = this.#state === 'maximized';
    this.#state = 'minimized';
    this.#el.classList.add('state-minimized');
    if (wasMaximized) {
      document.body.classList.remove('os-window-maximized');
    }

    // Animate out: scale down and fade
    this.#el.classList.add('animating');
    this.#el.style.transform = `translate3d(${this.#bounds.x}px, ${this.#bounds.y}px, 0) scale(0.5)`;
    this.#el.style.opacity = '0';

    const onEnd = () => {
      this.#el.removeEventListener('transitionend', onEnd);
      this.#el.classList.remove('animating');
      // A quick dock restore may happen before the minimize transition ends.
      // Never let the stale transition hide a window that has already restored.
      if (this.#state === 'minimized') {
        this.#el.style.display = 'none';
        this.#el.style.pointerEvents = 'none';
      }
    };
    this.#el.addEventListener('transitionend', onEnd, { once: true });

    // Safety timeout in case transitionend doesn't fire
    setTimeout(() => {
      if (this.#state === 'minimized') {
        this.#el.classList.remove('animating');
        this.#el.style.display = 'none';
      }
    }, 350);

    this.#commitToStore();
  }

  restore() {
    const wasMinimized = this.#state === 'minimized';
    this.#state = 'normal';
    document.body.classList.remove('os-window-maximized');
    this.#el.classList.remove('state-maximized', 'state-minimized', 'minimized', 'vault-window--minimized');
    // Minimize uses inline styles for performance; always clear them on restore.
    this.#el.style.display = '';
    this.#el.style.visibility = 'visible';
    this.#el.style.opacity = '1';
    this.#el.style.pointerEvents = 'auto';

    if (this.#restoreBounds) {
      this.#bounds = { ...this.#restoreBounds };
      this.#restoreBounds = null;
    }

    if (wasMinimized) {
      // Animate in from scaled down
      this.#el.style.transform = `translate3d(${this.#bounds.x}px, ${this.#bounds.y}px, 0) scale(0.5)`;
      // Force reflow
      void this.#el.offsetHeight;
    }

    this.#animateToBounds();
    this.#commitToStore();
  }

  #toggleMaximize() {
    if (this.#state === 'maximized') {
      this.restore();
    } else {
      this.maximize();
    }
  }

  /* ================================================================ */
  /*  Bounds & rendering                                               */
  /* ================================================================ */

  /** Immediately set position & size (no animation) */
  #applyBounds() {
    const { x, y, width, height } = this.#bounds;
    this.#el.style.width = `${width}px`;
    this.#el.style.height = `${height}px`;
    this.#el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  /** Animate to current bounds with CSS transition */
  #animateToBounds() {
    this.#el.classList.add('animating');
    this.#applyBounds();

    const cleanup = () => {
      this.#el.removeEventListener('transitionend', cleanup);
      this.#el.classList.remove('animating');
    };
    this.#el.addEventListener('transitionend', cleanup, { once: true });

    // Safety timeout
    setTimeout(() => {
      this.#el.classList.remove('animating');
    }, 350);
  }

  /* ================================================================ */
  /*  Store integration                                                */
  /* ================================================================ */

  /**
   * Try to subscribe to the Store for this window's state.
   * Fails gracefully if Store/WindowManager are not yet loaded.
   */
  #trySubscribeStore() {
    try {
      // Dynamic late-binding: other agents are building these modules.
      // We try to import but handle failure gracefully.
      import('../core/Store.js').then((mod) => {
        const Store = mod.default || mod;
        if (Store && typeof Store.subscribe === 'function') {
          this.#unsubStore = Store.subscribe(
            (state) => state.windows?.[this.#instanceId],
            (windowState) => {
              if (!windowState) return;
              // External updates (e.g., another module changed z-index)
              if (windowState.zIndex != null) {
                this.#el.style.zIndex = windowState.zIndex;
              }
              if (windowState.focused != null) {
                this.#el.classList.toggle('focused', windowState.focused);
              }
            },
          );
        }
      }).catch(() => {
        // Store not yet available — that's fine, we work standalone too.
      });
    } catch {
      // Ignore — store may not exist yet.
    }
  }

  /** Push current bounds to the WindowManager store */
  #commitToStore() {
    try {
      import('../core/WindowManager.js').then((mod) => {
        const WindowManager = mod.default || mod;
        if (WindowManager && typeof WindowManager.updateWindow === 'function') {
          WindowManager.updateWindow(this.#instanceId, {
            bounds: { ...this.#bounds },
            state: this.#state,
          });
        }
      }).catch(() => {});
    } catch {
      // WindowManager not available — operating standalone.
    }
  }

  /* ================================================================ */
  /*  Public API                                                       */
  /* ================================================================ */

  /** @returns {HTMLDivElement} the root window element */
  get element() {
    return this.#el;
  }

  /** @returns {HTMLDivElement} where the app should mount its content */
  get contentElement() {
    return this.#contentEl;
  }

  /** @returns {string} */
  get instanceId() {
    return this.#instanceId;
  }

  /** @returns {{ x:number, y:number, width:number, height:number }} */
  get bounds() {
    return { ...this.#bounds };
  }

  /** @returns {'normal'|'maximized'|'minimized'|'snapped'} */
  get state() {
    return this.#state;
  }

  /**
   * Update the window's title text.
   * @param {string} title
   */
  updateTitle(title) {
    // Find the text node (last child is the text)
    const nodes = this.#titleEl.childNodes;
    const textNode = nodes[nodes.length - 1];
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textNode.textContent = title;
    }
    this.#el.setAttribute('aria-label', title);
  }

  /**
   * Update bounds from an external source (e.g. store sync).
   * @param {{ x?:number, y?:number, width?:number, height?:number }} bounds
   * @param {boolean} [animate=false]
   */
  updateBounds(bounds, animate = false) {
    if (bounds.x != null) this.#bounds.x = bounds.x;
    if (bounds.y != null) this.#bounds.y = bounds.y;
    if (bounds.width != null) this.#bounds.width = bounds.width;
    if (bounds.height != null) this.#bounds.height = bounds.height;

    if (animate) {
      this.#animateToBounds();
    } else {
      this.#applyBounds();
    }
  }

  /**
   * Update the window state from an external source.
   * @param {'normal'|'maximized'|'minimized'|'snapped'} state
   */
  updateState(state) {
    if (state === this.#state) return;

    switch (state) {
      case 'maximized': this.maximize(); break;
      case 'minimized': this.minimize(); break;
      case 'normal':    this.restore(); break;
      case 'snapped':   /* snapped handled via updateBounds */ break;
    }
  }

  /**
   * Set the focused visual state.
   * @param {boolean} focused
   */
  setFocused(focused) {
    this.#el.classList.toggle('focused', focused);
  }

  /**
   * Set z-index directly.
   * @param {number} z
   */
  setZIndex(z) {
    this.#el.style.zIndex = z;
  }

  /**
   * Clean up everything — remove DOM, listeners, store subscriptions.
   */
  destroy() {
    // Cancel any pending RAFs
    if (this.#drag.rafId) cancelAnimationFrame(this.#drag.rafId);
    if (this.#resize.rafId) cancelAnimationFrame(this.#resize.rafId);

    // Remove all event listeners
    this.#el.removeEventListener('pointerdown', this.#handlers.onPointerDownWindow);
    this._btnClose.removeEventListener('click', this.#handlers.onClose);
    this._btnMinimize.removeEventListener('click', this.#handlers.onMinimize);
    this._btnMaximize.removeEventListener('click', this.#handlers.onMaxToggle);
    this._titlebar.removeEventListener('dblclick', this.#handlers.onDblClick);
    this._dragRegion.removeEventListener('pointerdown', this.#handlers.onDragStart);

    // Clean up any lingering drag/resize state
    document.body.classList.remove('is-dragging-window');
    if (this.#state === 'maximized') {
      document.body.classList.remove('os-window-maximized');
    }

    // Clean up iframe fullscreen covers and observers
    this.#iframeCoverObserver?.disconnect();
    this.#iframeCoverResizeObserver?.disconnect();
    document.removeEventListener('fullscreenchange', this.#handlers.onFullscreenCoverChange);
    document.removeEventListener('webkitfullscreenchange', this.#handlers.onFullscreenCoverChange);
    window.removeEventListener('resize', this.#handlers.onFullscreenCoverChange);
    this.#iframeCoverSettingsUnsubscribe?.();
    for (const cover of this.#iframeCovers.values()) cover.remove();
    this.#iframeCovers.clear();

    // Unsubscribe from store
    if (this.#unsubStore) {
      this.#unsubStore();
      this.#unsubStore = null;
    }

    // Remove from DOM
    this.#el.remove();

    // Null out references
    this.#el = null;
    this.#contentEl = null;
    this.#titleEl = null;
    this._btnClose = null;
    this._btnMinimize = null;
    this._btnMaximize = null;
    this._titlebar = null;
    this._dragRegion = null;
  }
}
