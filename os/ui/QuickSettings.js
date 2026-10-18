/**
 * @fileoverview Quick Settings Control Center popover for The Web Vault WebOS.
 *
 * Provides instant access to Theme toggle, Wallpaper cycler, Reduced Motion,
 * Fullscreen toggle, Sound/Volume mock, and Network Status.
 *
 * @module os/ui/QuickSettings
 */

import store from '../core/Store.js';
import settingsManager, { WALLPAPERS, ACCENTS } from '../core/SettingsManager.js';

let _popover = null;
let _open = false;

class QuickSettings {
  constructor() {
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._injectStyles();
    this._buildDOM();

    store.on('quicksettings:toggle', () => this.toggle());

    // Close on outside click
    document.addEventListener('pointerdown', (e) => {
      if (_open && !_popover.contains(e.target) && !e.target.closest('.vault-topbar__control-center-trigger')) {
        this.close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _open) {
        this.close();
      }
    });
  }

  _injectStyles() {
    if (document.getElementById('vault-quicksettings-styles')) return;
    const s = document.createElement('style');
    s.id = 'vault-quicksettings-styles';
    s.textContent = `
      .vault-quick-settings {
        position: fixed;
        top: 36px;
        right: 12px;
        width: 320px;
        background: rgba(18, 12, 34, 0.94);
        backdrop-filter: blur(24px) saturate(1.6);
        -webkit-backdrop-filter: blur(24px) saturate(1.6);
        border: 1px solid rgba(168, 85, 247, 0.25);
        border-radius: 16px;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.75), 0 0 20px rgba(139, 92, 246, 0.25);
        z-index: 9970;
        padding: 16px;
        color: #f5f3ff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: none;
        flex-direction: column;
        gap: 14px;
        user-select: none;
        animation: qs-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .vault-quick-settings.open {
        display: flex;
      }
      @keyframes qs-in {
        from { opacity: 0; transform: translateY(-8px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .vault-qs-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .vault-qs-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        color: #e8e0f0;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .vault-qs-btn:hover {
        background: rgba(139, 92, 246, 0.18);
        border-color: rgba(168, 85, 247, 0.4);
      }
      .vault-qs-btn.active {
        background: rgba(139, 92, 246, 0.35);
        border-color: #8b5cf6;
        color: #fff;
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
      }
      .vault-qs-btn__icon {
        font-size: 20px;
      }
      .vault-qs-btn__label {
        font-size: 11px;
        font-weight: 500;
      }
      .vault-qs-slider-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: rgba(255, 255, 255, 0.03);
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .vault-qs-slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #c4b5fd;
      }
      .vault-qs-slider {
        width: 100%;
        accent-color: #8b5cf6;
        cursor: pointer;
      }
      .vault-qs-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 11px;
        color: #7c6f9f;
      }
    `;
    document.head.appendChild(s);
  }

  _buildDOM() {
    _popover = document.createElement('div');
    _popover.className = 'vault-quick-settings';

    this._updateContent();
    document.body.appendChild(_popover);
  }

  _updateContent() {
    const isDark = (settingsManager.get('theme') || 'dark') === 'dark';
    const isReduced = !!settingsManager.get('reducedMotion');
    const isSnapping = !!settingsManager.get('windowSnapping');
    const isOnline = navigator.onLine;

    _popover.innerHTML = `
      <div class="vault-qs-grid">
        <button class="vault-qs-btn ${isDark ? 'active' : ''}" id="qs-theme-btn">
          <span class="vault-qs-btn__icon">${isDark ? '🌙' : '☀️'}</span>
          <span class="vault-qs-btn__label">${isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        <button class="vault-qs-btn" id="qs-wallpaper-btn">
          <span class="vault-qs-btn__icon">🖼️</span>
          <span class="vault-qs-btn__label">Cycle Wallpaper</span>
        </button>

        <button class="vault-qs-btn ${isReduced ? 'active' : ''}" id="qs-motion-btn">
          <span class="vault-qs-btn__icon">⚡</span>
          <span class="vault-qs-btn__label">${isReduced ? 'Motion: Off' : 'Motion: On'}</span>
        </button>

        <button class="vault-qs-btn" id="qs-fs-btn">
          <span class="vault-qs-btn__icon">⛶</span>
          <span class="vault-qs-btn__label">Fullscreen</span>
        </button>
      </div>

      <div class="vault-qs-slider-group">
        <div class="vault-qs-slider-header">
          <span>Display Brightness</span>
          <span id="qs-brightness-val">100%</span>
        </div>
        <input type="range" class="vault-qs-slider" id="qs-brightness-range" min="30" max="100" value="100">
      </div>

      <div class="vault-qs-footer">
        <span>Network: <strong style="color:${isOnline ? '#10b981' : '#ef4444'}">${isOnline ? 'Online' : 'Offline'}</strong></span>
        <span style="cursor:pointer;" id="qs-open-settings">Open Settings ↗</span>
      </div>
    `;

    // Bind buttons
    _popover.querySelector('#qs-theme-btn').addEventListener('click', () => {
      const next = isDark ? 'light' : 'dark';
      settingsManager.set('theme', next);
      this._updateContent();
    });

    _popover.querySelector('#qs-wallpaper-btn').addEventListener('click', () => {
      const curr = settingsManager.get('wallpaper') || 'vault-default';
      const idx = WALLPAPERS.findIndex(w => w.id === curr);
      const nextIdx = (idx + 1) % WALLPAPERS.length;
      settingsManager.set('wallpaper', WALLPAPERS[nextIdx].id);
      settingsManager.set('customWallpaperUrl', '');
    });

    _popover.querySelector('#qs-motion-btn').addEventListener('click', () => {
      settingsManager.set('reducedMotion', !isReduced);
      this._updateContent();
    });

    _popover.querySelector('#qs-fs-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      this.close();
    });

    const bRange = _popover.querySelector('#qs-brightness-range');
    const bVal = _popover.querySelector('#qs-brightness-val');
    bRange.addEventListener('input', (e) => {
      const val = e.target.value;
      bVal.textContent = val + '%';
      document.documentElement.style.filter = `brightness(${val}%)`;
    });

    _popover.querySelector('#qs-open-settings').addEventListener('click', () => {
      import('../core/AppRegistry.js').then(m => (m.default || m).launch('settings'));
      this.close();
    });
  }

  toggle() {
    this.init();
    if (_open) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.init();
    this._updateContent();
    _open = true;
    _popover.classList.add('open');
  }

  close() {
    _open = false;
    if (_popover) _popover.classList.remove('open');
  }
}

const quickSettings = new QuickSettings();
export default quickSettings;
