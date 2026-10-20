/**
 * @fileoverview Zen GS Games App for The Web Vault WebOS.
 * @module os/apps/GamesApp
 *
 * The games wall is mounted in an isolated app window. If the Zen GS loader
 * has already initialized window.ZenGS, reopening this app reuses that global.
 */
import AppRegistry from '../core/AppRegistry.js';

export const AppManifest = {
  id: 'games',
  name: 'Games',
  icon: '🎮',
  category: 'Entertainment',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 980, height: 640 },
  minSize: { width: 520, height: 380 },

  mount(containerEl) {
    if (!document.getElementById('vault-zengs-styles')) {
      const style = document.createElement('style');
      style.id = 'vault-zengs-styles';
      style.textContent = `
        .zg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:16px; padding:20px; }
        .zg-card { background:rgba(26,18,44,.78); border:1px solid rgba(168,85,247,.22); border-radius:14px; overflow:hidden; cursor:pointer; transition:transform .18s,border-color .18s,box-shadow .18s; display:flex; flex-direction:column; }
        .zg-card:hover { transform:translateY(-4px) scale(1.02); border-color:#a855f7; box-shadow:0 12px 28px rgba(147,51,234,.3); }
        .zg-cover { width:100%; aspect-ratio:1; object-fit:cover; background:#0d0814; display:block; }
        .zg-title { padding:10px 12px; font-size:12.5px; font-weight:600; color:#f3f0f9; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      `;
      document.head.appendChild(style);
    }

    containerEl.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#07040d;color:#f3f0f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;background:rgba(22,13,38,.92);border-bottom:1px solid rgba(168,85,247,.18)">
          <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🎮</span><strong>Vault Games</strong></div>
          <input id="zg-search-input" type="search" placeholder="Search games..." aria-label="Search games" style="width:min(240px,45%);height:30px;padding:0 12px;border-radius:15px;border:1px solid rgba(168,85,247,.3);background:rgba(15,11,26,.9);color:#fff;font-size:12px">
        </div>
        <div id="zg-scroll-area" style="flex:1;overflow-y:auto"><div id="zg"></div></div>
        <div id="zg-player-modal" style="display:none;position:absolute;inset:0;background:#07040d;z-index:50;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:rgba(26,18,44,.98);border-bottom:1px solid rgba(168,85,247,.25);flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:10px"><button id="zg-back-wall">← Back to Games</button><strong id="zg-active-title">Now Playing</strong></div>
            <div style="display:flex;gap:8px"><button id="zg-open-browser">🌐 Open in Vault Browser</button><button id="zg-fullscreen-btn">⛶ Fullscreen</button></div>
          </div>
          <div id="zg-viewer" style="flex:1;min-height:0;width:100%;position:relative;background:#000"></div>
        </div>
      </div>`;
    const $ = (selector) => containerEl.querySelector(selector);
    const playerModal = $('#zg-player-modal');
    const viewerEl = $('#zg-viewer');
    const activeTitleEl = $('#zg-active-title');
    const searchInput = $('#zg-search-input');
    let currentGameDetail = null;

    const onSelectGame = (event) => {
      if (!containerEl.isConnected) return;
      const detail = event.detail || {};
      currentGameDetail = detail;
      activeTitleEl.textContent = detail.title || (window.ZenGS?.decodeTitle?.(detail.item) ?? 'Game');
      playerModal.style.display = 'flex';
      viewerEl.replaceChildren();
      if (window.ZenGS?.play && detail.item) {
        const iframe = window.ZenGS.play(detail.item, viewerEl);
        if (iframe) iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
      }
    };
    window.addEventListener('zengs:select', onSelectGame);

    $('#zg-back-wall').addEventListener('click', () => {
      viewerEl.replaceChildren();
      playerModal.style.display = 'none';
      currentGameDetail = null;
    });
    $('#zg-fullscreen-btn').addEventListener('click', async () => {
      const target = viewerEl.querySelector('iframe') || viewerEl;
      try {
        if (target.requestFullscreen) await target.requestFullscreen();
      } catch (error) { console.warn('[GamesApp] Fullscreen request failed:', error); }
    });
    $('#zg-open-browser').addEventListener('click', () => {
      if (!currentGameDetail) return;
      const url = window.ZenGS?.playUrl?.(currentGameDetail.item) || currentGameDetail.url;
      if (url) AppRegistry.launch('browser', { launchOptions: { url, title: currentGameDetail.title || 'Game' } });
    });
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      const cards = containerEl.querySelectorAll('.zg-card');
      cards.forEach(card => { card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none'; });
    });

    // The app reuses the global loader when available. The loader payload is
    // intentionally kept separate from UI wiring so it can be injected once.
    if (!window.ZenGS) {
      const notice = document.createElement('div');
      notice.style.cssText = 'padding:24px;color:#c4b5fd;text-align:center';
      notice.textContent = 'Games loader has not been initialized yet. Add the Zen GS loader payload to GamesApp.js to populate the games wall.';
      $('#zg').appendChild(notice);
    }

    return () => {
      window.removeEventListener('zengs:select', onSelectGame);
      viewerEl.replaceChildren();
    };
  }
};

export default AppManifest;
