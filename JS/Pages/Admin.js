(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const state = { games: [], websites: [], users: [], profile: null, allowed: false, loading: false };
  const views = ['dashboard', 'games', 'users', 'diagnostics', 'storage', 'activity'];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function showMessage(message) {
    const el = $('#admin-message');
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function denyAccess(message) {
    state.allowed = false;
    const loading = $('#admin-loading');
    if (loading) {
      loading.innerHTML = '<div class="loading-orb"></div><h1>Admin access required</h1><p>' +
        escapeHtml(message || 'This account does not have administrator access.') +
        '</p><p style="margin-top:18px"><a href="index.html" style="color:#c4a3ff">Return to The Web Vault</a></p>';
    }
    $('#admin-root').hidden = true;
    $('#admin-nav-current')?.remove();
    console.warn('Admin page access denied:', message);
  }

  function showView(name) {
    if (!state.allowed || !views.includes(name)) return;
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'view-' + name));
    document.querySelectorAll('.side-link').forEach((button) => button.classList.toggle('selected', button.dataset.view === name));
    $('#crumb').textContent = ({ dashboard: 'Dashboard', games: 'Games', users: 'Users', diagnostics: 'Diagnostics', storage: 'Storage', activity: 'Activity log' })[name];
    if (name === 'games') renderGames();
    if (name === 'users') renderUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadCatalog(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(path + ' does not contain a JSON array');
    return data;
  }

  async function loadLiveData() {
    if (!state.allowed || state.loading) return;
    state.loading = true;
    try {
      const [games, websites, usersSnapshot] = await Promise.all([
        loadCatalog('Data/games.json'),
        loadCatalog('Data/Websites.json'),
        database.ref('users').once('value')
      ]);
      state.games = games;
      state.websites = websites;
      const rawUsers = usersSnapshot.val() || {};
      state.users = Object.entries(rawUsers).map(([uid, data]) => ({
        uid,
        username: data?.username || '(username missing)',
        admin: data?.admin === true,
        createdAt: data?.createdAt || null,
        profileExists: !!data && typeof data === 'object'
      })).sort((a, b) => a.username.localeCompare(b.username));

      $('#stat-games').textContent = games.length.toLocaleString();
      $('#stat-users').textContent = state.users.length.toLocaleString();
      $('#stat-admins').textContent = state.users.filter((user) => user.admin).length.toLocaleString();
      $('#stat-db').textContent = 'Connected';
      $('#stat-db-detail').textContent = 'User profiles loaded successfully';
      $('#game-side-count').textContent = games.length;
      $('#user-side-count').textContent = state.users.length;
      $('#storage-games').textContent = games.length.toLocaleString();
      $('#storage-websites').textContent = websites.length.toLocaleString();
      $('#storage-users').textContent = state.users.length.toLocaleString();
      $('#health-auth').textContent = auth.currentUser ? 'Signed in' : 'Signed out';
      $('#health-auth-bar').style.width = auth.currentUser ? '100%' : '0%';
      $('#health-rtdb').textContent = 'Connected';
      $('#health-rtdb-bar').style.width = '100%';
      $('#health-catalog').textContent = 'Loaded';
      $('#health-catalog-bar').style.width = '100%';
      $('#health-pill').textContent = 'Healthy';
      $('#health-note').textContent = 'Live profile and catalog reads completed.';
      $('#connection-status').textContent = 'Live data connected';
      renderGames();
      renderUsers();
      showMessage('');
    } catch (error) {
      console.error('Admin dashboard data load failed:', error);
      $('#stat-db').textContent = 'Error';
      $('#stat-db-detail').textContent = error.message || 'Could not read Firebase data';
      $('#health-pill').textContent = 'Needs attention';
      $('#health-note').textContent = 'One or more live data requests failed. Check the browser console and Firebase Database Rules.';
      showMessage('Some live data could not be loaded. Check that Firebase Database Rules allow authorized admins to read these paths.');
    } finally {
      state.loading = false;
    }
  }

  function renderGames() {
    const query = ($('#gameSearch')?.value || '').trim().toLowerCase();
    const games = state.games.filter((game) => [game.title, game.category, game.description].join(' ').toLowerCase().includes(query));
    $('#game-count').textContent = games.length + ' of ' + state.games.length + ' entries';
    $('#gamesBody').innerHTML = games.map((game) => '<tr><td><div class="game-name"><span class="game-badge">' +
      escapeHtml((game.icon || game.title || '?').slice(0, 2)) + '</span><strong>' + escapeHtml(game.title || 'Untitled') +
      '</strong></div></td><td class="muted-cell">' + escapeHtml(game.category || 'Uncategorized') +
      '</td><td><a class="table-link" href="' + escapeHtml(game.url || '#') +
      '" target="_blank" rel="noopener noreferrer">Open ↗</a></td></tr>').join('') ||
      '<tr><td colspan="3" class="muted-cell">No games match that search.</td></tr>';
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function renderUsers() {
    const query = ($('#userSearch')?.value || '').trim().toLowerCase();
    const users = state.users.filter((user) => user.username.toLowerCase().includes(query));
    $('#users-count').textContent = users.length + ' of ' + state.users.length + ' profiles';
    $('#usersBody').innerHTML = users.map((user) => '<tr><td><div class="game-name"><span class="game-badge">' +
      escapeHtml(user.username.slice(0, 1).toUpperCase()) + '</span><strong>' + escapeHtml(user.username) +
      '</strong></div></td><td><span class="table-status ' + (user.admin ? 'admin' : 'member') + '">' +
      (user.admin ? 'Admin' : 'Member') + '</span></td><td><span class="table-status ' +
      (user.profileExists ? '' : 'member') + '">' + (user.profileExists ? 'Profile loaded' : 'Missing profile') +
      '</span></td><td class="muted-cell">' + formatDate(user.createdAt) + '</td></tr>').join('') ||
      '<tr><td colspan="4" class="muted-cell">No users match that search.</td></tr>';
  }

  async function runDiagnostics() {
    const lines = ['The Web Vault — live diagnostics', 'Timestamp: ' + new Date().toLocaleString(), ''];
    lines.push((auth.currentUser ? '[PASS]' : '[FAIL]') + ' Firebase Authentication session');
    try {
      const snapshot = await database.ref('users/' + auth.currentUser.uid + '/admin').once('value');
      lines.push(snapshot.val() === true ? '[PASS] Admin flag is true' : '[FAIL] Admin flag is not true');
    } catch (error) {
      lines.push('[FAIL] Could not read current profile role: ' + error.message);
    }
    try {
      const games = await loadCatalog('Data/games.json');
      lines.push('[PASS] Game catalog JSON (' + games.length + ' entries)');
    } catch (error) {
      lines.push('[FAIL] Game catalog: ' + error.message);
    }
    try {
      const websites = await loadCatalog('Data/Websites.json');
      lines.push('[PASS] Website catalog JSON (' + websites.length + ' entries)');
    } catch (error) {
      lines.push('[FAIL] Website catalog: ' + error.message);
    }
    lines.push('', 'Note: These checks confirm browser reads only. They do not validate Firebase security rules.');
    $('#checkOutput').textContent = lines.join('\n');
  }

  function bindUI() {
    document.querySelectorAll('.side-link').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
    document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); }
    }));
    $('#gameSearch').addEventListener('input', renderGames);
    $('#userSearch').addEventListener('input', renderUsers);
    $('#refreshBtn').addEventListener('click', async () => {
      $('#refreshBtn').disabled = true;
      $('#refreshBtn').textContent = 'Refreshing…';
      await loadLiveData();
      $('#refreshBtn').disabled = false;
      $('#refreshBtn').textContent = '↻ Refresh data';
    });
    $('#runChecks').addEventListener('click', runDiagnostics);
  }

  function grantAccess() {
    state.allowed = true;
    state.profile = auth.currentUser;
    const username = window.AuthCore?.currentUsername || 'Admin';
    $('#admin-username').textContent = '@' + username;
    $('#profile-name').textContent = '@' + username;
    $('#profile-initial').textContent = username.slice(0, 1).toUpperCase();
    $('#admin-loading').hidden = true;
    $('#admin-root').hidden = false;
    bindUI();
    loadLiveData();
  }

  function checkAccess() {
    const core = window.AuthCore;
    if (!core || !core.profileReady) return;
    if (!core.currentUser) {
      denyAccess('Sign in with an administrator account to continue.');
      return;
    }
    if (core.currentAdmin !== true) {
      denyAccess('Your signed-in account does not have the admin flag.');
      return;
    }
    grantAccess();
  }

  window.addEventListener('authProfileReady', checkAccess);
  window.addEventListener('pageLoaded', () => {
    if (location.pathname.toLowerCase().endsWith('/admin.html') || location.pathname.toLowerCase().endsWith('admin.html')) checkAccess();
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (window.AuthCore?.profileReady) checkAccess();
    else setTimeout(() => {
      if (!window.AuthCore?.profileReady) denyAccess('Could not verify your account. Please return to the site and sign in again.');
      else checkAccess();
    }, 10000);
  });
})();