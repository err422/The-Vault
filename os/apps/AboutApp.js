/**
 * @fileoverview Native What's New window for The Web Vault WebOS.
 * Keeps release notes inside the OS window manager instead of a legacy modal.
 *
 * @module os/apps/AboutApp
 */

import appRegistry from '../core/AppRegistry.js';

export const AppManifest = {
  // Keep the stable ID so existing launcher/menu/terminal references still work.
  id: 'about',
  name: "What's New",
  icon: '✨',
  category: 'System',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 500, height: 430 },
  minSize: { width: 340, height: 300 },

  mount(containerEl) {
    containerEl.innerHTML = `
      <div class="whats-new-root" style="height:100%;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(145deg,#100b1a 0%,#090611 100%);color:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <header style="padding:16px 18px 14px;background:radial-gradient(ellipse at 10% 0%,rgba(139,92,246,.24),transparent 65%);border-bottom:1px solid rgba(168,85,247,.16);">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:38px;height:38px;flex:0 0 38px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#8b5cf6,#4c1d95);box-shadow:0 8px 24px rgba(139,92,246,.25);">✨</div>
            <div style="min-width:0;">
              <div style="font-size:19px;font-weight:750;letter-spacing:-.03em;color:#fff;">What's New</div>
              <div style="font-size:11px;color:#b9a7df;margin-top:4px;">The latest from The Vault WebOS</div>
            </div>
            <span style="margin-left:auto;align-self:flex-start;padding:4px 7px;border:1px solid rgba(196,181,253,.2);border-radius:999px;background:rgba(139,92,246,.12);color:#d8b4fe;font-size:10px;white-space:nowrap;">WebOS 2.0</span>
          </div>
          <p style="font-size:12px;line-height:1.5;color:#c4b5fd;margin:10px 0 0;">A quick look at what's changed, what works better, and what's new in your desktop.</p>
        </header>

        <main style="flex:1;overflow:auto;padding:14px 18px 18px;display:flex;flex-direction:column;gap:10px;">
          <section style="padding:12px;border:1px solid rgba(168,85,247,.2);border-radius:13px;background:rgba(139,92,246,.08);">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px;">
              <span style="font-size:17px;">🖥️</span><h3 style="margin:0;font-size:13px;color:#fff;">The WebOS desktop</h3>
              <span style="margin-left:auto;font-size:10px;font-weight:700;letter-spacing:.06em;color:#c4b5fd;">CORE</span>
            </div>
            <ul style="margin:0;padding-left:19px;color:#d7ccef;font-size:11.5px;line-height:1.65;">
              <li>A desktop built around draggable, resizable app windows.</li>
              <li>A macOS-inspired top bar, dock, and app launcher.</li>
              <li>Personalizable wallpapers, accent colors, and display settings.</li>
            </ul>
          </section>

          <section style="padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px;">
              <span style="font-size:17px;">🌐</span><h3 style="margin:0;font-size:14px;color:#fff;">Browser & games</h3>
            </div>
            <ul style="margin:0;padding-left:19px;color:#d7ccef;font-size:12.5px;line-height:1.85;">
              <li>Vault Browser with tabs, navigation controls, and proxy-mode options.</li>
              <li>Games open through the browser, keeping the experience in one place.</li>
              <li>App windows and fullscreen behavior designed for school laptops.</li>
            </ul>
          </section>

          <section style="padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px;">
              <span style="font-size:17px;">🛠️</span><h3 style="margin:0;font-size:14px;color:#fff;">Settings & everyday tools</h3>
            </div>
            <ul style="margin:0;padding-left:19px;color:#d7ccef;font-size:12.5px;line-height:1.85;">
              <li>Run the setup wizard again from Settings whenever you want.</li>
              <li>Replay the navigation tour to refresh yourself on the desktop.</li>
              <li>VaultNet, Lounge, and the school bell app are part of the expanding app lineup.</li>
            </ul>
          </section>

          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:1px solid rgba(168,85,247,.13);background:rgba(0,0,0,.14);">
            <span style="font-size:16px;">🔮</span>
            <div style="min-width:0;">
              <div style="font-size:11px;font-weight:650;color:#f5f3ff;">The Web Vault WebOS</div>
              <div style="font-size:10px;color:#8f80ac;margin-top:3px;">thewebvault.org · Built for the Vault community</div>
            </div>
            <button id="whats-new-about-settings" type="button" style="margin-left:auto;padding:7px 10px;border:1px solid rgba(168,85,247,.25);border-radius:8px;background:rgba(139,92,246,.12);color:#d8b4fe;font-size:10px;cursor:pointer;white-space:nowrap;">Settings</button>
          </div>
        </main>
      </div>
    `;

    containerEl.querySelector('#whats-new-about-settings')?.addEventListener('click', () => {
      appRegistry.launch('settings');
    });
  }
};

export default AppManifest;
