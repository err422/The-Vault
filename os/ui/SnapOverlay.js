/**
 * SnapOverlay.js — Snap preview overlay for WebOS window management
 *
 * Shows a translucent purple overlay indicating where a window will snap
 * when released. Supports full-screen maximize, left/right halves, and
 * four quarter-screen zones.
 *
 * Usage:
 *   import SnapOverlay from './SnapOverlay.js';
 *   const overlay = new SnapOverlay();
 *   overlay.show('left');   // preview left-half snap
 *   overlay.hide();         // dismiss
 */

const SNAP_ZONES = {
  full:         { top: '0',   left: '0',   width: '100%', height: '100%' },
  left:         { top: '0',   left: '0',   width: '50%',  height: '100%' },
  right:        { top: '0',   left: '50%', width: '50%',  height: '100%' },
  'top-left':   { top: '0',   left: '0',   width: '50%',  height: '50%' },
  'top-right':  { top: '0',   left: '50%', width: '50%',  height: '50%' },
  'bottom-left':    { top: '50%', left: '0',   width: '50%',  height: '50%' },
  'bottom-right':   { top: '50%', left: '50%', width: '50%',  height: '50%' },
};

/** Injects scoped styles once per document */
function injectStyles() {
  if (document.getElementById('vault-snap-overlay-styles')) return;

  const style = document.createElement('style');
  style.id = 'vault-snap-overlay-styles';
  style.textContent = /* css */ `
    .vault-snap-overlay {
      position: fixed;
      z-index: 99;                        /* just below windows (100-899) */
      pointer-events: none;
      background: var(--vault-accent-primary, #8f68ff);
      opacity: 0;
      border-radius: 12px;
      border: 2px solid rgba(143, 104, 255, 0.45);
      box-shadow: 0 0 40px rgba(143, 104, 255, 0.15),
                  inset 0 0 60px rgba(143, 104, 255, 0.08);
      backdrop-filter: blur(4px);
      transition: opacity 0.18s ease,
                  top 0.22s cubic-bezier(.4,0,.2,1),
                  left 0.22s cubic-bezier(.4,0,.2,1),
                  width 0.22s cubic-bezier(.4,0,.2,1),
                  height 0.22s cubic-bezier(.4,0,.2,1);
      /* account for taskbar */
      --vault-taskbar-height: 48px;
    }

    .vault-snap-overlay.visible {
      opacity: 0.2;
    }

    /* subtle pulsing glow while visible */
    .vault-snap-overlay.visible::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        ellipse at center,
        rgba(143, 104, 255, 0.12) 0%,
        transparent 70%
      );
      animation: vault-snap-pulse 2s ease-in-out infinite;
    }

    @keyframes vault-snap-pulse {
      0%, 100% { opacity: 0.6; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export default class SnapOverlay {
  /** @type {HTMLDivElement} */
  #el;
  /** @type {string|null} current zone name */
  #currentZone = null;

  constructor() {
    injectStyles();

    this.#el = document.createElement('div');
    this.#el.className = 'vault-snap-overlay';
    this.#el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.#el);
  }

  /* ---- Public API ---- */

  /**
   * Show the snap preview for a given zone.
   * @param {'full'|'left'|'right'|'top-left'|'top-right'|'bottom-left'|'bottom-right'} zone
   */
  show(zone) {
    const rect = SNAP_ZONES[zone];
    if (!rect) return;

    if (this.#currentZone === zone) return; // already showing this zone
    this.#currentZone = zone;

    // Margin inset so the overlay doesn't touch screen edges
    const margin = 6; // px

    Object.assign(this.#el.style, {
      top:    `calc(${rect.top}  + ${margin}px)`,
      left:   `calc(${rect.left} + ${margin}px)`,
      width:  `calc(${rect.width}  - ${margin * 2}px)`,
      height: `calc(${rect.height} - ${margin * 2}px - var(--vault-taskbar-height, 48px) * ${rect.top === '0' && rect.height === '100%' ? 1 : rect.top !== '0' ? 1 : 0})`,
    });

    // If the zone sits in the bottom half, we need to subtract taskbar from height
    // If height is 100%, always subtract taskbar
    // If height is 50% and top is 50%, subtract taskbar
    if (rect.height === '100%' || rect.top === '50%') {
      this.#el.style.height = `calc(${rect.height} - ${margin * 2}px - var(--vault-taskbar-height, 48px))`;
    }

    this.#el.classList.add('visible');
  }

  /** Hide the overlay with a smooth fade-out. */
  hide() {
    this.#currentZone = null;
    this.#el.classList.remove('visible');
  }

  /** @returns {string|null} the current snap zone or null */
  get currentZone() {
    return this.#currentZone;
  }

  /** Remove overlay from DOM entirely. */
  destroy() {
    this.#el.remove();
  }
}
