/**
 * @fileoverview About Application for The Web Vault WebOS.
 *
 * macOS-inspired system card displaying:
 * - The Web Vault branding & logo
 * - OS version (2.0.0 WebOS)
 * - User profile status
 * - Client browser & rendering engine
 * - Quick action links to Settings and System Monitor
 *
 * @module os/apps/AboutApp
 */

import store from '../core/Store.js';
import appRegistry from '../core/AppRegistry.js';

export const AppManifest = {
  id: 'about',
  name: 'About This WebOS',
  icon: 'ℹ️',
  category: 'System',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 500, height: 420 },
  minSize: { width: 360, height: 320 },

  mount(containerEl, context) {
    const session = store.getState('session');
    const user = session?.displayName || 'Guest User';
    const browserUA = navigator.userAgent;
    let browserName = 'Modern Web Browser';
    if (browserUA.includes('Chrome')) browserName = 'Google Chrome / Chromium';
    else if (browserUA.includes('Safari') && !browserUA.includes('Chrome')) browserName = 'Apple Safari';
    else if (browserUA.includes('Firefox')) browserName = 'Mozilla Firefox';

    containerEl.innerHTML = `
      <div class="about-root" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:radial-gradient(ellipse at 50% 30%, #1e1038, #07050c); color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:24px; text-align:center; user-select:none;">
        <!-- Logo -->
        <div style="width:72px; height:72px; border-radius:20px; background:linear-gradient(135deg, #8b5cf6, #3b82f6); display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:0 12px 30px rgba(139,92,246,0.4); margin-bottom:16px;">
          🏛️
        </div>

        <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:700; color:#fff;">The Web Vault</h2>
        <div style="font-size:12.5px; color:#c4b5fd; margin-bottom:18px;">WebOS Edition — Version 2.0.0 (Release)</div>

        <!-- Specs Box -->
        <div style="width:100%; max-width:380px; background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.2); border-radius:12px; padding:12px 18px; display:flex; flex-direction:column; gap:8px; text-align:left; font-size:12px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#7c6f9f;">Host:</span>
            <span style="color:#e8e0f0; font-weight:500;">thewebvault.org</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#7c6f9f;">User:</span>
            <span style="color:#10b981; font-weight:500;">@${user}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#7c6f9f;">Runtime:</span>
            <span style="color:#e8e0f0;">ES6 Modules / IndexedDB VFS</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#7c6f9f;">Renderer:</span>
            <span style="color:#e8e0f0;">${browserName}</span>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button id="about-open-settings" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(168,85,247,0.3); background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:12px; font-weight:500; cursor:pointer;">
            Settings...
          </button>
          <button id="about-open-sysmon" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(168,85,247,0.3); background:rgba(139,92,246,0.15); color:#c4b5fd; font-size:12px; font-weight:500; cursor:pointer;">
            System Monitor...
          </button>
        </div>

        <div style="margin-top:20px; font-size:10.5px; color:#5b5175;">
          © 2026 The Web Vault. All original games and proxy assets preserved.
        </div>
      </div>
    `;

    containerEl.querySelector('#about-open-settings').addEventListener('click', () => {
      appRegistry.launch('settings');
    });

    containerEl.querySelector('#about-open-sysmon').addEventListener('click', () => {
      appRegistry.launch('system-monitor');
    });
  }
};

export default AppManifest;
