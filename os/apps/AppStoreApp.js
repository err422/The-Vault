/**
 * @fileoverview App Store / Catalog Application for The Web Vault WebOS.
 *
 * Full-featured WebOS App Catalog:
 * - Filter apps by Category (All, System, Utility, Entertainment, Social)
 * - Live search filter
 * - Pin / Unpin apps from Dock (persisted to localStorage)
 * - Pin / Unpin apps from Desktop (persisted to localStorage)
 * - Launch or Focus active app instances
 * - View version metadata, capabilities, and system specifications
 *
 * @module os/apps/AppStoreApp
 */

import appRegistry from '../core/AppRegistry.js';
import store from '../core/Store.js';
import TaskbarDock from '../ui/TaskbarDock.js';

const APP_DESCRIPTIONS = {
  'browser': 'Multi-tab web browser powered by the dedicated Scramjet proxy to bypass header restrictions and frame blocking.',
  'vault-hub': 'The full legacy Web Vault catalog featuring 38+ games and 35+ unblocking websites & proxies in one hub.',
  'games': 'Curated game station powered by Zen GS with arcade titles and fullscreen launcher support.',
  'file-explorer': 'Hierarchical file manager backed by VirtualFS. Supports folder navigation, file uploads, text editing, and shortcuts.',
  'terminal': 'UNIX-style virtual shell with command history, tab completion, VirtualFS toolchain, and system utilities.',
  'settings': 'System customization control center for wallpapers, electric accent colors, themes, snapping, and motion.',
  'notes': 'Split-pane Markdown notes editor with word counters, live search, and automatic debounced VirtualFS autosave.',
  'calculator': 'Precedence-aware arithmetic evaluator supporting scientific functions, parenthesized expressions, and keyboard controls.',
  'system-monitor': 'Real-time browser telemetry displaying active processes, DOM element counts, heap memory, and uptime.',
  'app-store': 'System package manager and utility catalog for launching, pinning, and managing all WebOS applications.',
  'about': 'WebOS architecture summary, version credits, system specifications, and developer documentation.',
  'lounge': 'VaultNet multiplayer social lounge with real-time presence indicators, customizable profiles, and global chat.',
  'bell': 'ETHS bell schedule tracker featuring period countdowns, daily schedules, and custom day overrides.'
};

export const AppManifest = {
  id: 'app-store',
  name: 'App Store',
  icon: '🛍️',
  category: 'System',
  version: '2.5.0',
  singleton: true,
  defaultSize: { width: 880, height: 600 },
  minSize: { width: 480, height: 360 },
  menus: [
    {
      label: 'Store',
      items: [
        { label: 'Refresh Apps', action: 'store:refresh', shortcut: '⌘R' }
      ]
    }
  ],

  async mount(containerEl, context) {
    let currentCategory = 'all';
    let searchQuery = '';

    containerEl.innerHTML = `
      <div class="appstore-root" style="display:flex; flex-direction:column; height:100%; background:#0d0818; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden;">
        <!-- Header Banner -->
        <div style="padding:20px 24px 16px; border-bottom:1px solid rgba(168,85,247,0.18); background:radial-gradient(ellipse at 50% -30%, rgba(139,92,246,0.35), transparent 75%), linear-gradient(180deg, rgba(26,14,46,0.9), rgba(13,8,24,0.9)); flex-shrink:0;">
          <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span style="font-size:24px;">🛍️</span>
                <h2 style="margin:0; font-size:22px; font-weight:800; color:#fff; letter-spacing:-.02em;">Vault App Store</h2>
              </div>
              <p style="margin:0; font-size:12.5px; color:#c4b5fd;">Browse, launch, and pin built-in WebOS applications and Web Vault utilities.</p>
            </div>

            <!-- Search Bar -->
            <div style="position:relative; width:240px; max-width:100%;">
              <input type="text" id="store-search-input" placeholder="Search apps & tools..." style="width:100%; height:34px; padding:0 12px 0 32px; border-radius:17px; border:1px solid rgba(168,85,247,0.3); background:rgba(0,0,0,0.4); color:#fff; font-size:12px; outline:none; box-sizing:border-box;">
              <span style="position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; opacity:0.5;">🔍</span>
            </div>
          </div>

          <!-- Category Pills -->
          <div id="store-category-bar" style="display:flex; gap:6px; margin-top:16px; overflow-x:auto;">
            <button class="store-cat-pill active" data-cat="all" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(139,92,246,0.5); background:rgba(139,92,246,0.25); color:#fff; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">All Apps</button>
            <button class="store-cat-pill" data-cat="System" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">System</button>
            <button class="store-cat-pill" data-cat="Utility" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">Utilities</button>
            <button class="store-cat-pill" data-cat="Entertainment" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">Entertainment</button>
            <button class="store-cat-pill" data-cat="Productivity" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">Productivity</button>
            <button class="store-cat-pill" data-cat="Social" style="padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;">Social</button>
          </div>
        </div>

        <!-- App Grid -->
        <div id="store-grid" style="flex:1; overflow-y:auto; padding:20px 24px; display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:16px; align-content:start;">
        </div>
      </div>
    `;

    const grid = containerEl.querySelector('#store-grid');
    const searchInput = containerEl.querySelector('#store-search-input');

    const renderGrid = () => {
      grid.innerHTML = '';
      const allApps = appRegistry.getAllApps();

      const filtered = allApps.filter(app => {
        if (currentCategory !== 'all' && (app.category || '').toLowerCase() !== currentCategory.toLowerCase()) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = (app.name || '').toLowerCase().includes(q);
          const matchCat = (app.category || '').toLowerCase().includes(q);
          const desc = (APP_DESCRIPTIONS[app.id] || '').toLowerCase();
          if (!matchName && !matchCat && !desc.includes(q)) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#7c6f9f;">
            <div style="font-size:36px; margin-bottom:8px;">🔍</div>
            <div style="font-size:15px; font-weight:600; color:#c4b5fd;">No matching applications found</div>
            <div style="font-size:12px; margin-top:4px;">Try searching for another term or selecting All Apps.</div>
          </div>
        `;
        return;
      }

      for (const app of filtered) {
        const isRunning = appRegistry.getRunningInstances(app.id).length > 0;
        const isDockPinned = TaskbarDock.isPinned(app.id);
        const desc = APP_DESCRIPTIONS[app.id] || 'Built-in WebOS native application.';

        const card = document.createElement('div');
        card.style.cssText = `
          display:flex; flex-direction:column; justify-content:space-between;
          padding:18px; border-radius:14px; background:rgba(255,255,255,0.03);
          border:1px solid rgba(168,85,247,0.18); transition:transform 0.15s, border-color 0.15s;
        `;
        card.onmouseenter = () => {
          card.style.transform = 'translateY(-2px)';
          card.style.borderColor = 'rgba(139,92,246,0.5)';
        };
        card.onmouseleave = () => {
          card.style.transform = 'translateY(0)';
          card.style.borderColor = 'rgba(168,85,247,0.18)';
        };

        card.innerHTML = `
          <div>
            <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:12px;">
              <div style="width:48px; height:48px; border-radius:12px; background:rgba(139,92,246,0.16); border:1px solid rgba(168,85,247,0.28); display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0;">
                ${app.icon || '📦'}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h4 style="margin:0; font-size:15px; font-weight:700; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${app.name}</h4>
                  <span style="font-size:10.5px; color:#8b7aa8; font-family:monospace;">v${app.version || '1.0'}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                  <span style="font-size:10px; padding:2px 8px; border-radius:8px; background:rgba(139,92,246,0.15); color:#d8b4fe; text-transform:uppercase; font-weight:700;">${app.category || 'Utility'}</span>
                  ${isRunning ? '<span style="font-size:10px; padding:2px 8px; border-radius:8px; background:rgba(16,185,129,0.2); color:#6ee7b7; font-weight:700;">Running</span>' : ''}
                </div>
              </div>
            </div>
            <p style="margin:0; font-size:12px; color:#b8a9d6; line-height:1.45;">${desc}</p>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex; gap:6px;">
              <button class="store-dock-pin-btn" data-id="${app.id}" style="padding:6px 10px; border-radius:8px; border:1px solid ${isDockPinned ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}; background:${isDockPinned ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)'}; color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">
                ${isDockPinned ? '✓ In Dock' : '📌 Dock'}
              </button>
            </div>

            <button class="store-launch-btn" data-id="${app.id}" style="padding:6px 14px; border-radius:8px; border:none; background:linear-gradient(135deg, #8b5cf6, #7c3aed); color:#fff; font-size:11.5px; font-weight:700; cursor:pointer; white-space:nowrap;">
              ${isRunning ? 'Focus' : 'Launch ↗'}
            </button>
          </div>
        `;

        // Launch / Focus handler
        card.querySelector('.store-launch-btn').addEventListener('click', () => {
          appRegistry.launch(app.id);
          renderGrid();
        });

        // Dock pin handler
        card.querySelector('.store-dock-pin-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (TaskbarDock.isPinned(app.id)) {
            TaskbarDock.unpinApp(app.id);
          } else {
            TaskbarDock.pinApp(app.id);
          }
          renderGrid();
        });

        grid.appendChild(card);
      }
    };

    // Category pills
    containerEl.querySelectorAll('.store-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.store-cat-pill').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.04)';
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.color = '#c4b5fd';
        });
        btn.style.background = 'rgba(139,92,246,0.25)';
        btn.style.borderColor = 'rgba(139,92,246,0.5)';
        btn.style.color = '#fff';
        currentCategory = btn.dataset.cat;
        renderGrid();
      });
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderGrid();
    });

    renderGrid();
  }
};

export default AppManifest;
