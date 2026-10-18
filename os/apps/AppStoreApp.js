/**
 * @fileoverview App Store / Catalog Application for The Web Vault WebOS.
 *
 * Showcases installed system apps and modular Web Vault utilities:
 * - Pin / Unpin apps from Desktop and Taskbar Dock
 * - Launch apps with 1 click
 * - Inspect app version, category, and metadata
 *
 * @module os/apps/AppStoreApp
 */

import appRegistry from '../core/AppRegistry.js';
import store from '../core/Store.js';
import virtualFS from '../core/VirtualFS.js';

export const AppManifest = {
  id: 'app-store',
  name: 'App Store',
  icon: '🛍️',
  category: 'System',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 820, height: 540 },
  minSize: { width: 480, height: 340 },
  menus: [
    {
      label: 'Store',
      items: [
        { label: 'Refresh Apps', action: 'store:refresh', shortcut: '⌘R' }
      ]
    }
  ],

  async mount(containerEl, context) {
    const apps = appRegistry.getAllApps();

    containerEl.innerHTML = `
      <div class="appstore-root" style="display:flex; flex-direction:column; height:100%; background:#100b1a; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden;">
        <!-- Header -->
        <div style="padding:20px 24px; border-bottom:1px solid rgba(168,85,247,0.18); background:radial-gradient(ellipse at 50% -20%, #2e0854, transparent 70%);">
          <h2 style="margin:0 0 6px 0; font-size:22px; font-weight:700; color:#fff;">App Store & Catalog</h2>
          <p style="margin:0; font-size:12.5px; color:#c4b5fd;">Manage installed WebOS system applications and pin utilities to your Desktop and Dock.</p>
        </div>

        <!-- App Grid -->
        <div style="flex:1; overflow-y:auto; padding:24px; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; align-content:start;">
          ${apps.map(app => {
            const isRunning = appRegistry.getRunningInstances(app.id).length > 0;
            return `
              <div class="store-app-card" data-id="${app.id}" style="display:flex; flex-direction:column; justify-content:space-between; padding:18px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.18); transition:transform 0.15s, border-color 0.15s;">
                <div style="display:flex; align-items:flex-start; gap:14px;">
                  <div style="width:48px; height:48px; border-radius:12px; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.3); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">
                    ${app.icon || '📁'}
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <h4 style="margin:0; font-size:15px; font-weight:600; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${app.name}</h4>
                      <span style="font-size:10.5px; color:#7c6f9f;">v${app.version || '1.0'}</span>
                    </div>
                    <span style="display:inline-block; margin-top:4px; font-size:10.5px; padding:2px 8px; border-radius:10px; background:rgba(255,255,255,0.06); color:#c4b5fd; text-transform:uppercase; font-weight:600;">${app.category || 'Utility'}</span>
                  </div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                  <button class="pin-desktop-btn" data-id="${app.id}" style="padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#c4b5fd; font-size:11.5px; cursor:pointer;">
                    📌 Pin to Desktop
                  </button>

                  <button class="launch-app-btn" data-id="${app.id}" style="padding:6px 14px; border-radius:8px; border:none; background:#8b5cf6; color:#fff; font-size:11.5px; font-weight:600; cursor:pointer;">
                    ${isRunning ? 'Focus' : 'Launch ↗'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Handle Launch
    containerEl.querySelectorAll('.launch-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        appRegistry.launch(btn.dataset.id);
      });
    });

    // Handle Pin to Desktop
    containerEl.querySelectorAll('.pin-desktop-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const appId = btn.dataset.id;
        const app = appRegistry.getApp(appId);
        if (!app) return;

        const path = `/Desktop/${app.name}.lnk`;
        const shortcut = { path, target: appId, icon: app.icon };
        await virtualFS.writeFile(path, JSON.stringify(shortcut), 'application/x-vault-shortcut');

        btn.textContent = '✅ Pinned!';
        setTimeout(() => { btn.textContent = '📌 Pin to Desktop'; }, 1500);
      });
    });
  }
};

export default AppManifest;
