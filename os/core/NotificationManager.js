/**
 * @fileoverview Notification Manager for The Web Vault WebOS.
 *
 * Handles floating toast notifications and the slide-out Notification Center.
 *
 * @module os/core/NotificationManager
 */

import store from './Store.js';

let _container = null;
let _center = null;
let _centerOpen = false;
let _history = [];
let _idCounter = 0;

class NotificationManager {
  constructor() {
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._injectStyles();
    this._buildToastContainer();
    this._buildNotificationCenter();

    // Listen for bell click in TopMenuBar
    store.on('notifications:toggle', () => this.toggleCenter());
    store.on('notify', (data) => this.notify(data));
  }

  _injectStyles() {
    if (document.getElementById('vault-notif-styles')) return;
    const s = document.createElement('style');
    s.id = 'vault-notif-styles';
    s.textContent = `
      .vault-toast-container {
        position: fixed;
        top: 42px;
        right: 14px;
        z-index: 9990;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        max-width: 360px;
        width: 100%;
      }
      .vault-toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(22, 14, 38, 0.94);
        backdrop-filter: blur(20px) saturate(1.6);
        -webkit-backdrop-filter: blur(20px) saturate(1.6);
        border: 1px solid rgba(168, 85, 247, 0.25);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(139, 92, 246, 0.2);
        color: #f5f3ff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        animation: vault-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: transform 0.2s, opacity 0.2s;
        cursor: pointer;
      }
      .vault-toast.out {
        animation: vault-toast-out 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes vault-toast-in {
        from { opacity: 0; transform: translateX(40px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes vault-toast-out {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to { opacity: 0; transform: translateX(40px) scale(0.9); }
      }
      .vault-toast__icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .vault-toast__body {
        flex: 1;
        min-width: 0;
      }
      .vault-toast__title {
        font-weight: 600;
        color: #fff;
        margin-bottom: 2px;
      }
      .vault-toast__msg {
        color: #c4b5fd;
        font-size: 12px;
        line-height: 1.4;
        word-break: break-word;
      }
      .vault-toast__close {
        background: none;
        border: none;
        color: #7c6f9f;
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        transition: color 0.15s;
      }
      .vault-toast__close:hover { color: #fff; }

      /* Slide-out Notification Center */
      .vault-notif-center {
        position: fixed;
        top: 36px;
        right: 8px;
        width: 340px;
        max-height: calc(100vh - 110px);
        background: rgba(18, 12, 32, 0.95);
        backdrop-filter: blur(24px) saturate(1.6);
        -webkit-backdrop-filter: blur(24px) saturate(1.6);
        border: 1px solid rgba(168, 85, 247, 0.25);
        border-radius: 16px;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.25);
        z-index: 9980;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateX(360px);
        opacity: 0;
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .vault-notif-center.open {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }
      .vault-notif-center__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .vault-notif-center__title {
        font-size: 14px;
        font-weight: 600;
        color: #f5f3ff;
      }
      .vault-notif-center__clear {
        background: none;
        border: none;
        color: #a855f7;
        font-size: 12px;
        cursor: pointer;
        transition: color 0.15s;
      }
      .vault-notif-center__clear:hover { color: #c084fc; text-decoration: underline; }
      .vault-notif-center__list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .vault-notif-item {
        display: flex;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        transition: background 0.15s;
      }
      .vault-notif-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .vault-notif-empty {
        text-align: center;
        color: #7c6f9f;
        padding: 40px 20px;
        font-size: 13px;
      }
    `;
    document.head.appendChild(s);
  }

  _buildToastContainer() {
    _container = document.createElement('div');
    _container.className = 'vault-toast-container';
    document.body.appendChild(_container);
  }

  _buildNotificationCenter() {
    _center = document.createElement('div');
    _center.className = 'vault-notif-center';

    const header = document.createElement('div');
    header.className = 'vault-notif-center__header';
    header.innerHTML = `
      <span class="vault-notif-center__title">Notifications</span>
      <button class="vault-notif-center__clear">Clear All</button>
    `;

    header.querySelector('.vault-notif-center__clear').addEventListener('click', () => {
      this.clearHistory();
    });

    const list = document.createElement('div');
    list.className = 'vault-notif-center__list';

    _center.appendChild(header);
    _center.appendChild(list);
    document.body.appendChild(_center);

    // Close on click outside
    document.addEventListener('pointerdown', (e) => {
      if (_centerOpen && !_center.contains(e.target) && !e.target.closest('.vault-topbar__bell')) {
        this.closeCenter();
      }
    });

    this._renderCenterList();
  }

  _renderCenterList() {
    if (!_center) return;
    const list = _center.querySelector('.vault-notif-center__list');
    if (!list) return;

    list.innerHTML = '';
    if (_history.length === 0) {
      list.innerHTML = '<div class="vault-notif-empty">No notifications</div>';
      return;
    }

    for (const item of [..._history].reverse()) {
      const el = document.createElement('div');
      el.className = 'vault-notif-item';
      const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      el.innerHTML = `
        <span style="font-size: 18px;">${item.icon}</span>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px;">
            <strong style="color:#fff; font-size:12.5px;">${this._escape(item.title)}</strong>
            <span style="color:#7c6f9f; font-size:11px;">${timeStr}</span>
          </div>
          <div style="color:#c4b5fd; font-size:11.5px; line-height:1.3;">${this._escape(item.message)}</div>
        </div>
      `;
      list.appendChild(el);
    }
  }

  _escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  notify({ title, message, type = 'info', duration = 4000, action = null }) {
    this.init();

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    const icon = icons[type] || '🔔';

    const item = {
      id: ++_idCounter,
      title: title || 'System Notification',
      message: message || '',
      type,
      icon,
      time: Date.now()
    };

    _history.push(item);
    if (_history.length > 50) _history.shift();
    this._renderCenterList();

    // Render floating toast
    if (_container) {
      const toast = document.createElement('div');
      toast.className = 'vault-toast';

      toast.innerHTML = `
        <div class="vault-toast__icon">${icon}</div>
        <div class="vault-toast__body">
          <div class="vault-toast__title">${this._escape(item.title)}</div>
          <div class="vault-toast__msg">${this._escape(item.message)}</div>
        </div>
        <button class="vault-toast__close" aria-label="Close">×</button>
      `;

      let timer = null;
      const dismiss = () => {
        if (timer) clearTimeout(timer);
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 220);
      };

      toast.querySelector('.vault-toast__close').addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });

      toast.addEventListener('click', () => {
        if (typeof action === 'function') action();
        dismiss();
      });

      _container.appendChild(toast);

      if (duration > 0) {
        timer = setTimeout(dismiss, duration);
      }
    }

    return item.id;
  }

  toggleCenter() {
    this.init();
    if (_centerOpen) {
      this.closeCenter();
    } else {
      this.openCenter();
    }
  }

  openCenter() {
    this.init();
    _centerOpen = true;
    _center.classList.add('open');
  }

  closeCenter() {
    _centerOpen = false;
    if (_center) _center.classList.remove('open');
  }

  clearHistory() {
    _history = [];
    this._renderCenterList();
  }

  getHistory() {
    return [..._history];
  }
}

const notificationManager = new NotificationManager();
export default notificationManager;
