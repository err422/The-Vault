/**
 * @fileoverview Native What's New window for The Web Vault WebOS.
 * Keeps release notes inside the OS window manager instead of a legacy modal.
 *
 * @module os/apps/AboutApp
 */

import appRegistry from '../core/AppRegistry.js';

export const AppManifest = {
  id: 'about',
  name: "What's New",
  icon: '✨',
  category: 'System',
  version: '2.1.0',
  singleton: true,
  defaultSize: { width: 500, height: 430 },
  minSize: { width: 340, height: 300 },

  mount(containerEl, context) {
    const entries = [
      { label: "NEW", text: "WebOS now opens What's New after an update." },
      { label: 'IMPROVED', text: 'Vault Browser has a cleaner tab bar and navigation controls.' },
      { label: 'FIX', text: 'Games search now has its own results section, and games are meant to open at their URL in Vault Browser.' },
      { label: 'NEW', text: 'You can rerun the setup wizard from Settings.' },
      { label: 'NEW', text: 'VaultNet adds the Lounge, presence, chat, and multiplayer features.' },
      { label: 'NEW', text: 'The school bell app is available as its own WebOS app.' },
      { label: 'IMPROVED', text: 'Fullscreen-on-click can be toggled in Settings, including an iframe cover when fullscreen is off.' },
      { label: "IMPROVED", text: "The What's New window now uses the native WebOS window style." }
    ];
    const badgeColors = {
      NEW: 'background:#153d2a;color:#4ade80;border-color:#4ade8060',
      FIX: 'background:#3d1a1a;color:#f87171;border-color:#f8717160',
      IMPROVED: 'background:#172d43;color:#60a5fa;border-color:#60a5fa60',
      REMOVED: 'background:#352313;color:#fb923c;border-color:#fb923c60',
      NOTICE: 'background:#343014;color:#fff176;border-color:#fff17660'
    };

    containerEl.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(145deg,#100b1a,#090611);color:#e8e0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <header style="padding:18px 20px 14px;border-bottom:1px solid rgba(168,85,247,.18);background:radial-gradient(ellipse at top left,rgba(139,92,246,.18),transparent 70%);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:23px;">✨</div>
            <div>
              <h2 style="margin:0;color:#fff;font-size:19px;letter-spacing:-.02em;">What's New</h2>
              <span style="display:block;margin-top:4px;font-size:11px;color:#9c8bb9;">WebOS update · October 2026</span>
            </div>
          </div>
        </header>
        <main style="flex:1;overflow:auto;padding:14px 20px;">
          <ul id="whats-new-entry-list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;"></ul>
        </main>
        <footer style="padding:12px 20px;border-top:1px solid rgba(168,85,247,.14);display:flex;justify-content:flex-end;">
          <button id="whats-new-got-it" type="button" style="padding:8px 18px;background:rgba(139,92,246,.16);color:#eee7ff;border:1px solid rgba(168,85,247,.35);border-radius:8px;font-size:12px;font-weight:650;cursor:pointer;">Got it</button>
        </footer>
      </div>
    `;

    const list = containerEl.querySelector('#whats-new-entry-list');
    for (const entry of entries) {
      const item = document.createElement('li');
      item.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;color:#d5cde2;';
      const badge = document.createElement('span');
      badge.textContent = entry.label;
      badge.style.cssText = 'display:inline-block;flex-shrink:0;margin-top:1px;padding:2px 7px;border:1px solid;border-radius:4px;font-size:9px;font-weight:750;letter-spacing:.06em;';
      badge.style.cssText += badgeColors[entry.label] || 'background:#2a2a2a;color:#aaa;border-color:#444';
      const text = document.createElement('span');
      text.textContent = entry.text;
      item.append(badge, text);
      list.appendChild(item);
    }

    containerEl.querySelector('#whats-new-got-it')?.addEventListener('click', () => {
      context?.close?.();
    });
  }
};

export default AppManifest;
