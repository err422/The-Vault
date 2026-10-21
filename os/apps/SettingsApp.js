/**
 * @fileoverview Settings Control Center Application for The Web Vault WebOS.
 *
 * Implements sidebar-navigated settings:
 * - Personalization (Dark/Light theme, Wallpapers, Accent Colors)
 * - Desktop & Dock (Icon size, Snap-to-grid, Dock auto-hide)
 * - System & Motion (Reduced motion, Window snapping, Storage estimate)
 * - Account & Factory Reset
 *
 * @module os/apps/SettingsApp
 */

import settingsManager, { WALLPAPERS, ACCENTS } from '../core/SettingsManager.js';
import store from '../core/Store.js';
import firebaseSync from '../services/FirebaseSync.js';
import OnboardingTour from '../ui/OnboardingTour.js';

export const AppManifest = {
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  category: 'System',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 760, height: 540 },
  minSize: { width: 440, height: 340 },
  menus: [
    {
      label: 'Settings',
      items: [
        { label: 'Reset to Defaults', action: 'settings:reset' },
        { label: 'Close', action: 'settings:close' }
      ]
    }
  ],

  async mount(containerEl, context) {
    let activeSection = 'personalization';

    containerEl.innerHTML = `
      <div class="settings-root" style="display:flex; height:100%; background:#100b1a; color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden;">
        <!-- Sidebar Navigation -->
        <div style="width:200px; background:rgba(18,12,32,0.95); border-right:1px solid rgba(168,85,247,0.18); padding:16px 10px; display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
          <div style="font-size:15px; font-weight:700; color:#fff; padding:4px 10px 12px 10px;">Settings</div>

          <div class="set-nav-btn active" data-sec="personalization" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; background:rgba(139,92,246,0.25); color:#fff;">
            <span>🎨</span>
            <span>Personalization</span>
          </div>

          <div class="set-nav-btn" data-sec="desktop" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#c4b5fd;">
            <span>🖥️</span>
            <span>Desktop & Dock</span>
          </div>

          <div class="set-nav-btn" data-sec="system" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#c4b5fd;">
            <span>⚡</span>
            <span>System & Motion</span>
          </div>

          <div class="set-nav-btn" data-sec="account" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#c4b5fd;">
            <span>👤</span>
            <span>Account & Reset</span>
          </div>
        </div>

        <!-- Content Area -->
        <div id="settings-content" style="flex:1; overflow-y:auto; padding:24px 30px; background:#0b0713;">
        </div>
      </div>
    `;

    const contentEl = containerEl.querySelector('#settings-content');

    const renderSection = async () => {
      const s = settingsManager.getAll();

      if (activeSection === 'personalization') {
        contentEl.innerHTML = `
          <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#fff;">Personalization</h3>

          <!-- Theme -->
          <div style="margin-bottom:24px;">
            <label style="font-size:13px; font-weight:600; color:#c4b5fd; display:block; margin-bottom:8px;">Color Theme</label>
            <div style="display:flex; gap:12px;">
              <div class="theme-card ${s.theme === 'dark' ? 'active' : ''}" data-val="dark" style="flex:1; padding:16px; border-radius:12px; border:2px solid ${s.theme === 'dark' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}; background:#07050c; cursor:pointer; text-align:center;">
                <span style="font-size:24px;">🌙</span>
                <div style="font-size:13px; font-weight:600; margin-top:6px;">Dark Obsidian</div>
                <div style="font-size:11px; color:#7c6f9f;">Deep purple & black surfaces</div>
              </div>

              <div class="theme-card ${s.theme === 'light' ? 'active' : ''}" data-val="light" style="flex:1; padding:16px; border-radius:12px; border:2px solid ${s.theme === 'light' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}; background:#f5f3ff; color:#1e1b4b; cursor:pointer; text-align:center;">
                <span style="font-size:24px;">☀️</span>
                <div style="font-size:13px; font-weight:600; margin-top:6px;">Light Alabaster</div>
                <div style="font-size:11px; color:#6b7280;">Lavender alabaster with purple accents</div>
              </div>
            </div>
          </div>

          <!-- Accent Color -->
          <div style="margin-bottom:24px;">
            <label style="font-size:13px; font-weight:600; color:#c4b5fd; display:block; margin-bottom:8px;">Accent Color</label>
            <div style="display:flex; gap:10px;">
              ${ACCENTS.map(acc => `
                <div class="accent-pill ${s.accent === acc.id ? 'active' : ''}" data-id="${acc.id}" style="display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid ${s.accent === acc.id ? acc.primary : 'rgba(255,255,255,0.1)'}; background:${s.accent === acc.id ? acc.primary + '33' : 'rgba(255,255,255,0.04)'}; cursor:pointer;">
                  <span style="width:12px; height:12px; border-radius:50%; background:${acc.primary}; display:inline-block;"></span>
                  <span style="font-size:12px; font-weight:500;">${acc.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Wallpaper Grid -->
          <div style="margin-bottom:24px;">
            <label style="font-size:13px; font-weight:600; color:#c4b5fd; display:block; margin-bottom:8px;">Desktop Wallpaper</label>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
              ${WALLPAPERS.map(wp => `
                <div class="wp-card ${s.wallpaper === wp.id && !s.customWallpaperUrl ? 'active' : ''}" data-id="${wp.id}" style="height:90px; border-radius:10px; border:2px solid ${s.wallpaper === wp.id && !s.customWallpaperUrl ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}; background:${wp.value}; cursor:pointer; display:flex; align-items:flex-end; padding:8px; box-shadow:0 4px 12px rgba(0,0,0,0.4);">
                  <span style="font-size:10.5px; font-weight:600; color:#fff; text-shadow:0 1px 4px #000; background:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px;">${wp.name}</span>
                </div>
              `).join('')}
            </div>

            <!-- Custom URL -->
            <div style="margin-top:12px; display:flex; gap:8px;">
              <input type="text" id="custom-wp-input" placeholder="Or enter custom image URL..." value="${s.customWallpaperUrl || ''}" style="flex:1; padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff; font-size:12px; outline:none;">
              <button id="custom-wp-apply-btn" style="padding:8px 16px; border-radius:8px; border:none; background:#8b5cf6; color:#fff; font-size:12px; font-weight:600; cursor:pointer;">Apply</button>
            </div>
          </div>
        `;

        // Bind theme
        contentEl.querySelectorAll('.theme-card').forEach(c => {
          c.addEventListener('click', () => {
            settingsManager.set('theme', c.dataset.val);
            renderSection();
          });
        });

        // Bind accents
        contentEl.querySelectorAll('.accent-pill').forEach(c => {
          c.addEventListener('click', () => {
            settingsManager.set('accent', c.dataset.id);
            renderSection();
          });
        });

        // Bind wallpapers
        contentEl.querySelectorAll('.wp-card').forEach(c => {
          c.addEventListener('click', () => {
            settingsManager.set('wallpaper', c.dataset.id);
            settingsManager.set('customWallpaperUrl', '');
            renderSection();
          });
        });

        contentEl.querySelector('#custom-wp-apply-btn').addEventListener('click', () => {
          const url = contentEl.querySelector('#custom-wp-input').value.trim();
          settingsManager.set('customWallpaperUrl', url);
          renderSection();
        });
      } else if (activeSection === 'desktop') {
        contentEl.innerHTML = `
          <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#fff;">Desktop & Dock</h3>

          <!-- Icon Size -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin-bottom:16px;">
            <label style="font-size:13px; font-weight:600; color:#c4b5fd; display:block; margin-bottom:8px;">Desktop Icon Size</label>
            <div style="display:flex; gap:10px;">
              ${['small', 'medium', 'large'].map(sz => `
                <button class="sz-btn ${s.desktopIconSize === sz ? 'active' : ''}" data-val="${sz}" style="padding:6px 16px; border-radius:8px; border:1px solid ${s.desktopIconSize === sz ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}; background:${s.desktopIconSize === sz ? 'rgba(139,92,246,0.3)' : 'transparent'}; color:#fff; font-size:12px; cursor:pointer; text-transform:capitalize;">${sz}</button>
              `).join('')}
            </div>
          </div>

          <!-- Snap to Grid -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div>
              <div style="font-size:13px; font-weight:600; color:#fff;">Snap Icons to Grid</div>
              <div style="font-size:11.5px; color:#7c6f9f;">Align desktop icons along a neat mathematical grid</div>
            </div>
            <input type="checkbox" id="chk-grid" ${s.snapToGrid ? 'checked' : ''} style="width:18px; height:18px; accent-color:#8b5cf6; cursor:pointer;">
          </div>

          <!-- Dock Auto-Hide -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px;">
            <div>
              <div style="font-size:13px; font-weight:600; color:#fff;">Dock Auto-Hide</div>
              <div style="font-size:11.5px; color:#7c6f9f;">Automatically reveal dock only when mouse hovers screen bottom</div>
            </div>
            <input type="checkbox" id="chk-dock" ${s.dockAutoHide ? 'checked' : ''} style="width:18px; height:18px; accent-color:#8b5cf6; cursor:pointer;">
          </div>
        `;

        contentEl.querySelectorAll('.sz-btn').forEach(b => {
          b.addEventListener('click', () => {
            settingsManager.set('desktopIconSize', b.dataset.val);
            renderSection();
          });
        });

        contentEl.querySelector('#chk-grid').addEventListener('change', (e) => {
          settingsManager.set('snapToGrid', e.target.checked);
        });

        contentEl.querySelector('#chk-dock').addEventListener('change', (e) => {
          settingsManager.set('dockAutoHide', e.target.checked);
        });
      } else if (activeSection === 'system') {
        let quotaEstimate = 'Estimating...';
        if (navigator.storage && navigator.storage.estimate) {
          try {
            const est = await navigator.storage.estimate();
            const usedMB = (est.usage / (1024 * 1024)).toFixed(1);
            const totalMB = (est.quota / (1024 * 1024)).toFixed(0);
            quotaEstimate = `${usedMB} MB used of ${totalMB} MB quota`;
          } catch {}
        }

        contentEl.innerHTML = `
          <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#fff;">System & Motion</h3>

          <!-- Reduced Motion -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div>
              <div style="font-size:13px; font-weight:600; color:#fff;">Reduced Motion Mode</div>
              <div style="font-size:11.5px; color:#7c6f9f;">Disable window animations and zoom scaling for high performance</div>
            </div>
            <input type="checkbox" id="chk-motion" ${s.reducedMotion ? 'checked' : ''} style="width:18px; height:18px; accent-color:#8b5cf6; cursor:pointer;">
          </div>

          <!-- Window Snap -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div>
              <div style="font-size:13px; font-weight:600; color:#fff;">Windows 11 Snap Engine</div>
              <div style="font-size:11.5px; color:#7c6f9f;">Display visual snap guides when dragging windows near edges & corners</div>
            </div>
            <input type="checkbox" id="chk-snap" ${s.windowSnapping ? 'checked' : ''} style="width:18px; height:18px; accent-color:#8b5cf6; cursor:pointer;">
          </div>

          <!-- Storage -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:600; color:#fff;">Virtual Storage Usage</div>
            <div style="font-size:12px; color:#c4b5fd; margin-top:4px;">${quotaEstimate}</div>
          </div>

          <!-- Onboarding Tour -->
          <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(168,85,247,0.22); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:600; color:#fff;">Navigation Tour</div>
            <div style="font-size:11.5px; color:#a79bc8; margin:4px 0 12px;">Replay the quick guide to the launcher, dock, windows, browser, and core apps.</div>
            <button id="set-replay-tour-btn" type="button" style="padding:8px 14px; border-radius:8px; border:1px solid rgba(216,180,254,0.3); background:linear-gradient(135deg,#9333ea,#7e22ce); color:#fff; font-size:12px; font-weight:600; cursor:pointer;">Replay Navigation Tour</button>
          </div>
        `;

        contentEl.querySelector('#chk-motion').addEventListener('change', (e) => {
          settingsManager.set('reducedMotion', e.target.checked);
        });

        contentEl.querySelector('#chk-snap').addEventListener('change', (e) => {
          settingsManager.set('windowSnapping', e.target.checked);
        });

        contentEl.querySelector('#set-replay-tour-btn').addEventListener('click', () => {
          OnboardingTour.init(true);
        });
      } else if (activeSection === 'account') {
        const session = store.getState('session');
        const isLoggedIn = session?.isLoggedIn;

        contentEl.innerHTML = `
          <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#fff;">Account & Reset</h3>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:18px; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:48px; height:48px; border-radius:50%; background:#8b5cf6; display:flex; align-items:center; justify-content:center; font-size:22px;">👤</div>
              <div>
                <div style="font-size:15px; font-weight:600; color:#fff;">${session?.displayName || 'Guest User'}</div>
                <div style="font-size:12px; color:#7c6f9f;">${isLoggedIn ? (session?.email || 'Logged In') : 'Local Guest Session'}</div>
              </div>
            </div>

            <div style="margin-top:16px;">
              ${isLoggedIn ? `
                <button id="set-signout-btn" style="padding:8px 16px; border-radius:8px; border:1px solid rgba(239,68,68,0.5); background:rgba(239,68,68,0.15); color:#fca5a5; font-size:12px; font-weight:600; cursor:pointer;">Sign Out</button>
              ` : `
                <button id="set-signin-btn" style="padding:8px 16px; border-radius:8px; border:none; background:#8b5cf6; color:#fff; font-size:12px; font-weight:600; cursor:pointer;">Sign In to Sync</button>
              `}
            </div>
          </div>

          <!-- Danger Zone: Reset -->
          <div style="border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); border-radius:12px; padding:18px;">
            <div style="font-size:14px; font-weight:600; color:#f87171;">Factory Reset WebOS</div>
            <div style="font-size:12px; color:#c4b5fd; margin:4px 0 12px 0;">Clears all virtual files, local desktop settings, and reloads default WebOS configuration.</div>
            <button id="set-reset-btn" style="padding:8px 16px; border-radius:8px; border:1px solid #ef4444; background:#ef4444; color:#fff; font-size:12px; font-weight:600; cursor:pointer;">Reset WebOS to Defaults</button>
          </div>
        `;

        const signinBtn = contentEl.querySelector('#set-signin-btn');
        if (signinBtn) {
          signinBtn.addEventListener('click', () => {
            if (window.authSystem?.showModal) window.authSystem.showModal();
          });
        }

        const signoutBtn = contentEl.querySelector('#set-signout-btn');
        if (signoutBtn) {
          signoutBtn.addEventListener('click', async () => {
            await firebaseSync.signOut();
            renderSection();
          });
        }

        contentEl.querySelector('#set-reset-btn').addEventListener('click', () => {
          if (confirm('Are you sure you want to completely reset The Web Vault WebOS? All files in VirtualFS will be erased.')) {
            settingsManager.factoryReset();
          }
        });
      }
    };

    // Sidebar navigation tabs
    containerEl.querySelectorAll('.set-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.set-nav-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = '#c4b5fd';
        });
        btn.style.background = 'rgba(139,92,246,0.25)';
        btn.style.color = '#fff';
        activeSection = btn.dataset.sec;
        renderSection();
      });
    });

    renderSection();
  }
};

export default AppManifest;
