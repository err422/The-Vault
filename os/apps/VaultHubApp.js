/**
 * @fileoverview Vault Hub Application for The Web Vault WebOS.
 *
 * Encapsulates the entire existing Web Vault catalog:
 * - 38+ games from Data/games.json
 * - 35+ websites & proxies from Data/Websites.json
 * - Category filter pills (All, FPS, Simulation, Puzzle, Idle, RPG, Proxy, Education)
 * - Live search filter
 * - Direct launcher into standalone WebOS BrowserApp windows
 * - Favorites toggle
 *
 * @module os/apps/VaultHubApp
 */

export const AppManifest = {
  id: 'vault-hub',
  name: 'Vault Hub',
  icon: '🏠',
  category: 'Entertainment',
  version: '2.0.0',
  singleton: true,
  defaultSize: { width: 920, height: 620 },
  minSize: { width: 480, height: 380 },
  menus: [
    {
      label: 'Hub',
      items: [
        { label: 'Refresh Catalog', action: 'hub:refresh', shortcut: '⌘R' },
        { label: 'Close Hub', action: 'hub:close' }
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'All Items', action: 'view:all' },
        { label: 'Games Only', action: 'view:games' },
        { label: 'Websites Only', action: 'view:websites' }
      ]
    }
  ],

  async mount(containerEl, context) {
    let items = [];
    let currentTab = 'all'; // 'all' | 'games' | 'websites'
    let currentCategory = 'all';
    let searchQuery = '';

    // Load data from JSON catalogs
    try {
      const [gamesRes, sitesRes] = await Promise.all([
        fetch('Data/games.json').then(r => r.json()).catch(() => []),
        fetch('Data/Websites.json').then(r => r.json()).catch(() => [])
      ]);

      const games = gamesRes.map(g => ({ ...g, itemType: 'game', icon: g.icon || '🎮' }));
      const sites = sitesRes.map(s => ({ ...s, itemType: 'website', icon: s.icon || '🌐' }));
      items = [...games, ...sites];
    } catch (err) {
      console.warn('[VaultHubApp] Failed to load catalog JSON:', err);
    }

    containerEl.innerHTML = `
      <div class="vault-hub-container" style="display:flex; flex-direction:column; height:100%; background:var(--vault-bg-deep, #07050c); color:#f5f3ff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Top Toolbar -->
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(168,85,247,0.15);">
          <!-- Type Tabs -->
          <div style="display:flex; gap:6px; background:rgba(255,255,255,0.06); padding:3px; border-radius:10px;">
            <button class="hub-tab-btn active" data-tab="all" style="padding:6px 14px; border:none; border-radius:8px; background:#8b5cf6; color:#fff; font-size:12px; font-weight:600; cursor:pointer;">All (${items.length})</button>
            <button class="hub-tab-btn" data-tab="games" style="padding:6px 14px; border:none; border-radius:8px; background:transparent; color:#c4b5fd; font-size:12px; font-weight:600; cursor:pointer;">Games</button>
            <button class="hub-tab-btn" data-tab="websites" style="padding:6px 14px; border:none; border-radius:8px; background:transparent; color:#c4b5fd; font-size:12px; font-weight:600; cursor:pointer;">Websites & Proxies</button>
          </div>

          <!-- Search Input -->
          <div style="position:relative; flex:1; max-width:280px; min-width:180px;">
            <input type="text" id="hub-search-input" placeholder="Search games, tools, proxies..." style="width:100%; padding:8px 12px 8px 32px; border-radius:10px; border:1px solid rgba(168,85,247,0.25); background:rgba(15,11,26,0.8); color:#fff; font-size:12.5px; outline:none;">
            <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); opacity:0.5; font-size:13px;">🔍</span>
          </div>
        </div>

        <!-- Category Pills -->
        <div id="hub-categories" style="display:flex; gap:6px; overflow-x:auto; padding:10px 18px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);">
          <button class="cat-pill active" data-cat="all" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(139,92,246,0.4); background:rgba(139,92,246,0.25); color:#fff; font-size:11.5px; cursor:pointer; white-space:nowrap;">All Categories</button>
          <button class="cat-pill" data-cat="fps" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">FPS</button>
          <button class="cat-pill" data-cat="simulation" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">Simulation</button>
          <button class="cat-pill" data-cat="idle" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">Idle</button>
          <button class="cat-pill" data-cat="puzzle" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">Puzzle</button>
          <button class="cat-pill" data-cat="proxy" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">Proxy</button>
          <button class="cat-pill" data-cat="education" style="padding:4px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#c4b5fd; font-size:11.5px; cursor:pointer; white-space:nowrap;">Education</button>
        </div>

        <!-- Card Grid -->
        <div id="hub-grid" style="flex:1; overflow-y:auto; padding:18px; display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px;">
        </div>
      </div>
    `;

    const grid = containerEl.querySelector('#hub-grid');
    const searchInput = containerEl.querySelector('#hub-search-input');

    const renderGrid = () => {
      grid.innerHTML = '';
      const filtered = items.filter(item => {
        if (currentTab === 'games' && item.itemType !== 'game') return false;
        if (currentTab === 'websites' && item.itemType !== 'website') return false;

        if (currentCategory !== 'all') {
          const cat = (item.category || '').toLowerCase();
          if (cat !== currentCategory) return false;
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchDesc = (item.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#7c6f9f;">
            <div style="font-size:36px; margin-bottom:8px;">🔍</div>
            <div style="font-size:15px; font-weight:600; color:#c4b5fd;">No matching titles found</div>
            <div style="font-size:12px; margin-top:4px;">Try refining your search keyword or switching categories.</div>
          </div>
        `;
        return;
      }

      for (const item of filtered) {
        const card = document.createElement('div');
        card.style.cssText = `
          display:flex; flex-direction:column; justify-content:space-between;
          background:rgba(26,18,44,0.65); border:1px solid rgba(168,85,247,0.18);
          border-radius:12px; padding:16px; cursor:pointer;
          transition:transform 0.18s, border-color 0.18s, box-shadow 0.18s;
        `;
        card.onmouseenter = () => {
          card.style.transform = 'translateY(-3px)';
          card.style.borderColor = 'rgba(139,92,246,0.6)';
          card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(139,92,246,0.2)';
        };
        card.onmouseleave = () => {
          card.style.transform = 'translateY(0)';
          card.style.borderColor = 'rgba(168,85,247,0.18)';
          card.style.boxShadow = 'none';
        };

        const ratingStars = item.rating || '★★★★☆';
        const catLabel = item.category || (item.itemType === 'game' ? 'Game' : 'Website');

        card.innerHTML = `
          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:32px;">${item.icon || '🎮'}</span>
              <span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(139,92,246,0.2); color:#c4b5fd; text-transform:uppercase; font-weight:600;">${catLabel}</span>
            </div>
            <h4 style="margin:0 0 6px 0; font-size:15px; font-weight:600; color:#fff;">${item.title}</h4>
            <p style="margin:0; font-size:12px; color:#a79bc8; line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${item.description || 'No description available.'}</p>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:14px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
            <span style="color:#fbbf24; font-size:12px;">${ratingStars}</span>
            <button class="hub-play-btn" style="padding:6px 14px; border:none; border-radius:8px; background:#8b5cf6; color:#fff; font-size:11.5px; font-weight:600; cursor:pointer;">Launch ↗</button>
          </div>
        `;

        card.addEventListener('click', () => {
          // Launch into WebOS BrowserApp with target url
          import('../core/AppRegistry.js').then(m => {
            (m.default || m).launch('browser', { url: item.url, title: item.title });
          });
        });

        grid.appendChild(card);
      }
    };

    // Tab buttons
    containerEl.querySelectorAll('.hub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.hub-tab-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = '#c4b5fd';
        });
        btn.style.background = '#8b5cf6';
        btn.style.color = '#fff';
        currentTab = btn.dataset.tab;
        renderGrid();
      });
    });

    // Category pills
    containerEl.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.cat-pill').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.04)';
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.color = '#c4b5fd';
        });
        btn.style.background = 'rgba(139,92,246,0.25)';
        btn.style.borderColor = 'rgba(139,92,246,0.4)';
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
