
/**
 * @fileoverview Zen GS Games Wall for The Web Vault WebOS.
 * @module os/apps/GamesApp
 */

import AppRegistry from '../core/AppRegistry.js';

const mountedCleanup = new WeakMap();

const ZEN_GS_PAYLOAD = `3a5de05d5072837d55bd1a48708b601bc6767f40d72300e3524126a22f5de05d5072837d55bd5b1a7d8c7d49bd455274ca6106b7111f6fd72200fc0f5b28867755f2475b3d833906a71a402dd7414fe75a5d61c47449fa5e706e8b6078fa57562e9a7349e6567a689e3a53bb404664996649bd5a1f34c33e0aa31a1a3d98774fe0415d26996f17c50e6824dc2608a4050235d3245ea6050431dc200ca6050035df250fa30b0535d8770da60550308c250ea3070530dd200df3055631de205ea3560533dd2619b9110532d92308a3050730d82458a2010032dc700ca4040730de240ea2030163dc210df6055531df240fa3050434dc740df00407348f245ea3060432c83e19a3070034dc760dad000b308b245da2000432dc7008ad000231d9205ea3000565dc740ca0050730dc2509a3550563dd2609f0055630df250fb76e1d6b8b6213dd1a1f45d74919a30b0432dd260ca50400358b205da7550535dc260df00156308b2508a3070533dc710dac040531d8205ea3560533dd2609f3050430d2205da2000435dc250df00506318b205da3060532dc250da0015730d9240da3040736dc760da4050a308f205da3070163dd260cad040724c6300dad040731de250ba2000067d87409f3050030de245ea7560435dd260da4040730d32408a3020565dc710cac015630d3245da7550531dc2a09f3040031d9240ca3560533dd7309f3050630de240ca3060162dc210da30504348c245fa302053fdc7709f30507348f250fa20b0432c84f15f852432ea23b17d6780e5dd32217a70b1f37d82417a0021f37dc2b17a30b1f37da2517a40b1f34da2a66b9770e4b8b6653bb555f69856013d1524763c47c54e21b1a29d2240ff0061a2aa24006d852476ec47457fa5c412eae734ff01d5d699d3a12ba000563df3b17c5630e2e8c6755f6475a69843a5fbc484567983243a8010230dc2308a3010537c66317e6400e2490754bb718573d8c7d49bd420e36d16307e6401d6a8f7c5ce15b0877c13912ee4b6d3b996115f65b5274a97d5ff072472e9b3b00ed0e1b7ec13a43a90f022fc13a43a90f072fc13a43a90f042fc13a43a90f0b2fc13a43a90f0132c33b05ab0d033d97605ee1464168ca3041b7181b7ed42c05a51a1d7285414fe75a5d61c2210dbc084e2fc25612b97f0e24c53010c5631824c57e15ff40112aa73e52a8031f68d72217fe0e032a9e3e58b9545c3bda2952f31b6043a65412ee455274ca7f4fa8575c659f7f5efb471d6598775ae156766a8f7f5efb471b248e7b4db71a086b9e3c52f10e1161c83976f4475b28987355f15c5e2ec33c4ffa604774837c5cbd00052fc46157fc50562ed83e03bc085a60c2411db3601d768b605efb477d698e7712c61d4367987755e17d5c628f3c52fb4056749e505ef35c4163c27f4fb9601d688f6a4fc65a516a837c5cbc08566a99771bbd575c659f7f5efb471d64857642e94f5769896756f05d47288e7d58e05e56689e5757f05e56689e3b15f4434363847678fd5a5f62c27f4fbc087e3bc83119be5e4728837600e8565f758f6976a811107c8d3000e8445a688e7d4cbb6c6c7c8d6006f3465d659e7b54fb1b1a7d812f0aae471520897e5ef441676f877754e0471b72c36f00f3465d659e7b54fb13542ec36952f31b472f897e5ef441676f877754e0471b72c32952f31b587a967c10be0d0e56c47e5efb54476ec02112e7564773987c00fc551b6fd42f6bbb5f56688d6653bc5a0e36d1645ae713513bc87a4fe143403cc53d19be63686fc13966ae501520893c4bf44156689e5c54f1561520893c4bf44156689e5c54f1561d748f7f54e356706e837e5fbd501a3d9c7349b5400e6285714ef8565d72c47149f0524763af7e5ef8565d72c23048f6415a769e3012ae401d75987106f7187f3d993c5ae64a5d65d72300e61d40639e534fe1415a649f665ebd1157679e7316f7111f64c32948bb405672ab664fe75a51739e7713b75752728b3f56b71f7e2fd16115e65647479e6649fc5146728f3a19f1524767c7624bb71f6356c3294fe74a486f8c3a68b31560288b664fe75a51739e7748bc555c74c2645ae7136c67d72200ca520f55c4734fe1415a649f665ee61d5f6384754ffd086c67c13912ee455274ca4d55a8601d679e6649fc5146728f6160ca526e28847356f0085a60c24d55bb405f6f897713a51f062fd72f06b75752728b3f19b3156c68cb2f06b75752728b3f59b7151559843306a81157679e7316f8111520b57c1aa80e11628b665ab8434324c36115e65647479e6649fc5146728f3a64fb1f60288b664fe75a51739e7748ce6c525bc4645af946562fd16f46f6524765823a64bc484e75c47d55f0414169982f5de05d5072837d55bd1a4861c23b46ae500e75d17654f6465e63846615fd565262c4734be5565d62a97a52f9571b75c3294fa8405672be7b56f05c4672c2744efb50476f857c13bc48587a967513bc4e1f308f2112e8554668896652fa5d1342a93a53bc484774936953a81b1124c17a12bb415676867358f01b1c5db42216ac521e60b73d5cfc1f1124c3295dfa411b708b601be60e1124c66306a51f513d9b2e53bb5f56688d6653ae42183bd83b40f70e436798615edc5d472e823c48e0514072983a4ab9011a2adb2412cb70785dc26314a71a1645a13c57f05d5472824f00e6180e559e6052fb541d60987d56d65b5274a97d5ff01b512fd16f49f0474674843248bb40436a836613b71f112fc47452f9475674c25054fa5f5667843b00e8505272897a13ca1a48748f664ee75d13689f7e57ae4e4e609f7c58e15a5c68ca5e78bd50512f91645ae713593bda2913f3465d659e7b54fb135d7ec23b40fc551b6cd42f78bb5f56688d6653e94f1271837c5ffa441d608f6658fd1a4865883a55e05f5f2fd1605ee1464168d16f5df047506ec25160ff18185bc13004e30e112da24017ee505265827701b75d5c2b996654e756117bc33c4ffd565d2e8c6755f6475a69843a49bc4841639e6749fb134128857904e71d4763926613bc096374857f52e6561d748f785ef6471b2fd16f12bb475b63843a5de05d5072837d55bd4b1a7d9c7349b5560e42a93a43bc085620cc7715f9565d619e7a04f6511b63c32855ed1b1a3d973b60b7505272897a19c81b5d7ec32946bc1b1a3d97744efb50476f857c1bd27c1b43c36952f31b5469c3605ee1464168d17554a80208708b601bf80e685bd1744efb50476f857c1bd41b522f917b5dbd521a60856013e3524126902f0bae490f67c47e5efb54476ed16810be1a5a60c27f15fc5d5763925d5dbd52687cb73b07a51a5e289a6748fd1b525d904f12ae4e722eaf3b00e1414a7dab3a71c67c7d289a7349e6561b6a85715af960476998735cf01d54639e5b4ff05e1b24b5685ce5111a7a963060c8111a2f97715ae1505b2eb53b40e8721b56c3296ba85e0861c23b00e8405672be7b56f05c4672c2744efb50476f857c13bc487449c27c4ef95f1a7bc6230ea5031a3d9e6042ee7f702e8c6755f6475a69843a7ebc487449c25712e81a4e658b6658fd1b6c2f915574bd5d466a863b46e81a1b2fd1`;

export const AppManifest = {
  id: 'games',
  name: 'Games',
  icon: '🎮',
  category: 'Entertainment',
  version: '2.1.0',
  singleton: true,
  defaultSize: { width: 980, height: 640 },
  minSize: { width: 520, height: 380 },

  mount(containerEl) {
    mountedCleanup.get(containerEl)?.();

    if (!document.getElementById('vault-zengs-styles')) {
      const style = document.createElement('style');
      style.id = 'vault-zengs-styles';
      style.textContent = `
        .zg-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
          gap:16px;
          padding:20px;
        }
        .zg-card {
          background:rgba(26,18,44,.78);
          border:1px solid rgba(168,85,247,.22);
          border-radius:14px;
          overflow:hidden;
          cursor:pointer;
          transition:transform .18s,border-color .18s,box-shadow .18s;
          display:flex;
          flex-direction:column;
        }
        .zg-card:hover {
          transform:translateY(-4px) scale(1.02);
          border-color:#a855f7;
          box-shadow:0 12px 28px rgba(147,51,234,.3);
        }
        .zg-cover {
          width:100%;
          aspect-ratio:1;
          object-fit:cover;
          background:#0d0814;
          display:block;
        }
        .zg-title {
          padding:10px 12px;
          font-size:12.5px;
          font-weight:600;
          color:#f3f0f9;
          text-align:center;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
      `;
      document.head.appendChild(style);
    }

    containerEl.replaceChildren();
    containerEl.style.cssText =
      'height:100%;min-height:0;overflow:hidden;background:#07040d;color:#f3f0f9;';

    containerEl.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#07040d;color:#f3f0f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;background:rgba(22,13,38,.92);border-bottom:1px solid rgba(168,85,247,.18)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">🎮</span>
            <strong>Vault Games</strong>
          </div>
          <input id="zg-search-input" type="search" placeholder="Search games..." aria-label="Search games" style="width:min(240px,45%);height:30px;padding:0 12px;border-radius:15px;border:1px solid rgba(168,85,247,.3);background:rgba(15,11,26,.9);color:#fff;font-size:12px">
        </div>

        <div id="zg-scroll-area" style="flex:1;min-height:0;overflow-y:auto">
          <div id="zg"></div>
        </div>

        <div id="zg-player-modal" style="display:none;position:absolute;inset:0;background:#07040d;z-index:50;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:rgba(26,18,44,.98);border-bottom:1px solid rgba(168,85,247,.25);flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:10px">
              <button id="zg-back-wall">← Back to Games</button>
              <strong id="zg-active-title">Now Playing</strong>
            </div>
            <div style="display:flex;gap:8px">
              <button id="zg-open-browser">🌐 Open in Vault Browser</button>
              <button id="zg-fullscreen-btn">⛶ Fullscreen</button>
            </div>
          </div>
          <div id="zg-viewer" style="flex:1;min-height:0;width:100%;position:relative;background:#000"></div>
        </div>
      </div>`;

    const $ = selector => containerEl.querySelector(selector);
    const playerModal = $('#zg-player-modal');
    const viewerEl = $('#zg-viewer');
    const activeTitleEl = $('#zg-active-title');
    const searchInput = $('#zg-search-input');

    let currentGameDetail = null;
    let disposed = false;

    const onSelectGame = event => {
      if (disposed || !containerEl.isConnected) return;

      const detail = event.detail || {};
      currentGameDetail = detail;
      activeTitleEl.textContent =
        detail.title || window.ZenGS?.decodeTitle?.(detail.item) || 'Game';

      playerModal.style.display = 'flex';
      viewerEl.replaceChildren();

      if (window.ZenGS?.play && detail.item) {
        const iframe = window.ZenGS.play(detail.item, viewerEl);
        if (iframe) {
          iframe.style.cssText =
            'width:100%;height:100%;border:0;display:block';
        }
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
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      } catch (error) {
        console.warn('[GamesApp] Fullscreen request failed:', error);
      }
    });

    $('#zg-open-browser').addEventListener('click', () => {
      if (!currentGameDetail) return;

      const url =
        window.ZenGS?.playUrl?.(currentGameDetail.item) ||
        currentGameDetail.url;

      if (url) {
        AppRegistry.launch('browser', {
          url,
          title: currentGameDetail.title || 'Game'
        });
      }
    });

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();

      containerEl.querySelectorAll('.zg-card').forEach(card => {
        card.style.display =
          card.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });

    // Inject the tested Zen GS payload into the Games app.
    // Keep the original XOR key and currentScript argument intact.
    const zenLoader = document.createElement('script');
    zenLoader.dataset.viewer = 'off';
    zenLoader.textContent =
      '(function(h,k,S){for(var s="",i=0,j=0;i<h.length;i+=2,j++)s+=String.fromCharCode(parseInt(h.substr(i,2),16)^k[j%k.length]);new Function("S",s)(S)})("' +
      ZEN_GS_PAYLOAD +
      '",[18,59,149,51,51,6,234],document.currentScript)';

    $('#zg').appendChild(zenLoader);

    mountedCleanup.set(containerEl, () => {
      disposed = true;
      window.removeEventListener('zengs:select', onSelectGame);
      viewerEl.replaceChildren();
      zenLoader.remove();
      containerEl.replaceChildren();
      containerEl.style.cssText = '';
    });
  },

  unmount(containerEl) {
    mountedCleanup.get(containerEl)?.();
    mountedCleanup.delete(containerEl);
  }
};

export default AppManifest;
