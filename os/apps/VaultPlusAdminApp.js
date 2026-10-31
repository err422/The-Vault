/**
 * @fileoverview Admin-only Vault+ membership manager.
 *
 * Memberships are manually verified and granted by an authenticated admin.
 * Records are stored at users/{uid}/membership.
 *
 * @module os/apps/VaultPlusAdminApp
 */

export const AppManifest = {
  id: 'vault-plus-admin',
  name: 'Vault+ Admin',
  icon: '👑',
  category: 'System',
  version: '1.0.0',
  singleton: true,
  adminOnly: true,
  defaultSize: { width: 680, height: 520 },
  minSize: { width: 420, height: 360 },

  mount(containerEl, context) {
    const hasAdminAccess = () =>
      !!(window.AuthCore?.profileReady &&
         window.AuthCore?.currentUser &&
         window.AuthCore?.currentAdmin === true);

    if (!hasAdminAccess()) {
      containerEl.innerHTML = `
        <div style="height:100%;display:grid;place-items:center;background:#0d0818;color:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;box-sizing:border-box;text-align:center;">
          <div>
            <div style="font-size:38px;margin-bottom:12px;">🔒</div>
            <h2 style="margin:0 0 8px;color:#fff;">Admin access required</h2>
            <p style="margin:0;color:#a99bc4;font-size:13px;">Sign in with an administrator account to use this app.</p>
          </div>
        </div>
      `;
      return;
    }

    containerEl.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;background:#0d0818;color:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;">
        <header style="padding:20px 22px 16px;background:radial-gradient(ellipse at 10% 0%,rgba(139,92,246,.28),transparent 65%),#151024;border-bottom:1px solid rgba(168,85,247,.2);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:rgba(139,92,246,.18);font-size:23px;">👑</div>
            <div style="min-width:0;">
              <div style="font-size:18px;font-weight:800;color:#fff;">Vault+ Admin</div>
              <div style="font-size:11px;color:#b9a9d5;margin-top:3px;">Manually manage ad-free memberships</div>
            </div>
            <span style="margin-left:auto;padding:5px 9px;border-radius:20px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.28);color:#6ee7b7;font-size:10px;font-weight:700;white-space:nowrap;">ADMIN</span>
          </div>
        </header>

        <main style="flex:1;overflow-y:auto;padding:22px;">
          <section style="padding:16px;border:1px solid rgba(168,85,247,.22);border-radius:14px;background:rgba(255,255,255,.025);">
            <div style="font-size:13px;font-weight:700;color:#eee7ff;margin-bottom:6px;">Find a Vault account</div>
            <div style="font-size:11px;color:#a99bc4;line-height:1.5;margin-bottom:14px;">Enter the exact username the customer provided with their Buy Me a Coffee payment. Verify the payment before activating Vault+.</div>
            <form id="vpa-search-form" style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="vpa-username" name="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="16" placeholder="Vault username" required style="flex:1 1 220px;min-width:0;box-sizing:border-box;height:40px;padding:0 12px;border:1px solid rgba(168,85,247,.32);border-radius:9px;background:#090611;color:#fff;font-size:13px;outline:none;">
              <button id="vpa-search" type="submit" style="height:40px;padding:0 17px;border:0;border-radius:9px;background:linear-gradient(110deg,#7c3aed,#9333ea);color:#fff;font-weight:700;font-size:12px;cursor:pointer;">Search account</button>
            </form>
            <div id="vpa-message" role="status" aria-live="polite" style="min-height:16px;margin-top:10px;color:#a99bc4;font-size:11px;"></div>
          </section>

          <section id="vpa-member-card" hidden style="margin-top:16px;padding:17px;border:1px solid rgba(168,85,247,.25);border-radius:14px;background:rgba(255,255,255,.025);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
              <div>
                <div style="font-size:10px;color:#9b8bb8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Vault account</div>
                <div id="vpa-member-name" style="font-size:17px;font-weight:800;color:#fff;margin-top:4px;"></div>
              </div>
              <span id="vpa-status" style="padding:5px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;"></span>
            </div>
            <div style="height:1px;background:rgba(255,255,255,.07);margin:15px 0;"></div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              <div>
                <div style="font-size:10px;color:#9586ae;">Membership</div>
                <div id="vpa-plan" style="font-size:12px;color:#eee7ff;margin-top:4px;">Vault+</div>
              </div>
              <div>
                <div style="font-size:10px;color:#9586ae;">Activated</div>
                <div id="vpa-granted" style="font-size:12px;color:#eee7ff;margin-top:4px;">Not activated</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;">
              <button id="vpa-activate" type="button" style="flex:1 1 150px;height:38px;border:0;border-radius:9px;background:linear-gradient(110deg,#6d28d9,#9333ea);color:#fff;font-weight:700;font-size:12px;cursor:pointer;">Activate Vault+</button>
              <button id="vpa-deactivate" type="button" style="flex:1 1 150px;height:38px;border:1px solid rgba(248,113,113,.35);border-radius:9px;background:rgba(127,29,29,.15);color:#fca5a5;font-weight:700;font-size:12px;cursor:pointer;">Deactivate</button>
            </div>
          </section>

          <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);color:#d6b879;font-size:10.5px;line-height:1.5;">
            <strong style="color:#fcd34d;">Manual payment verification</strong><br>
            This app does not process payments or verify Buy Me a Coffee transactions. Check your payment dashboard first, then activate the matching Vault username. Memberships remain active until you manually deactivate them.
          </div>
        </main>
      </div>
    `;

    const $ = (selector) => containerEl.querySelector(selector);
    const form = $('#vpa-search-form');
    const usernameInput = $('#vpa-username');
    const searchButton = $('#vpa-search');
    const message = $('#vpa-message');
    const memberCard = $('#vpa-member-card');
    const activateButton = $('#vpa-activate');
    const deactivateButton = $('#vpa-deactivate');
    let selectedMember = null;
    let busy = false;

    const setMessage = (text, type = 'info') => {
      message.textContent = text;
      message.style.color = type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : '#a99bc4';
    };

    const setBusy = (value) => {
      busy = value;
      searchButton.disabled = value;
      activateButton.disabled = value || !selectedMember || selectedMember.membership?.active === true;
      deactivateButton.disabled = value || !selectedMember || selectedMember.membership?.active !== true;
      searchButton.style.opacity = value ? '.6' : '1';
      activateButton.style.opacity = activateButton.disabled ? '.5' : '1';
      deactivateButton.style.opacity = deactivateButton.disabled ? '.5' : '1';
      searchButton.style.cursor = value ? 'wait' : 'pointer';
      activateButton.style.cursor = activateButton.disabled ? 'not-allowed' : 'pointer';
      deactivateButton.style.cursor = deactivateButton.disabled ? 'not-allowed' : 'pointer';
    };

    const renderMember = () => {
      if (!selectedMember) {
        memberCard.hidden = true;
        setBusy(false);
        return;
      }

      const membership = selectedMember.membership || {};
      const active = membership.active === true;
      $('#vpa-member-name').textContent = '@' + selectedMember.username;
      $('#vpa-status').textContent = active ? 'ACTIVE' : 'INACTIVE';
      $('#vpa-status').style.color = active ? '#6ee7b7' : '#fbbf24';
      $('#vpa-status').style.background = active ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.1)';
      $('#vpa-status').style.border = active ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(245,158,11,.2)';
      $('#vpa-plan').textContent = membership.plan === 'vault_plus' ? 'Vault+' : 'No active plan';
      $('#vpa-granted').textContent = membership.grantedAt ? new Date(membership.grantedAt).toLocaleDateString() : 'Not activated';
      memberCard.hidden = false;
      setBusy(false);
    };

    const searchMember = async (event) => {
      event?.preventDefault();
      if (busy) return;
      if (!hasAdminAccess()) {
        setMessage('Admin access is no longer available. Sign in again.', 'error');
        context.close();
        return;
      }

      const username = usernameInput.value.trim();
      const validationError = window.AuthCore.validateUsername(username);
      if (validationError) {
        selectedMember = null;
        renderMember();
        setMessage(validationError, 'error');
        return;
      }

      setBusy(true);
      selectedMember = null;
      memberCard.hidden = true;
      setMessage('Searching for @' + username + '…');

      try {
        const uidSnapshot = await window.database.ref('usernames/' + username).once('value');
        const uid = uidSnapshot.val();
        if (typeof uid !== 'string' || !uid) {
          setMessage('No account was found with that exact username.', 'error');
          setBusy(false);
          return;
        }

        const userSnapshot = await window.database.ref('users/' + uid).once('value');
        const userData = userSnapshot.val();
        if (!userData || userData.username !== username) {
          setMessage('The username mapping did not match the account profile. No changes were made.', 'error');
          setBusy(false);
          return;
        }

        selectedMember = {
          uid,
          username: userData.username,
          membership: userData.membership && typeof userData.membership === 'object' ? userData.membership : {}
        };
        setMessage('Account found. Confirm the payment before granting access.', 'success');
        renderMember();
      } catch (error) {
        console.error('[VaultPlusAdmin] Account lookup failed:', error);
        setMessage('Could not look up that account. Check Firebase permissions and try again.', 'error');
        setBusy(false);
      }
    };

    const updateMembership = async (active) => {
      if (busy || !selectedMember) return;
      if (!hasAdminAccess()) {
        setMessage('Admin access is no longer available. Sign in again.', 'error');
        context.close();
        return;
      }

      if (active && selectedMember.membership?.active === true) return;
      if (!active && selectedMember.membership?.active !== true) return;

      const verb = active ? 'activate Vault+ for' : 'deactivate Vault+ for';
      if (!window.confirm('Are you sure you want to ' + verb + ' @' + selectedMember.username + '?')) return;

      setBusy(true);
      setMessage(active ? 'Activating membership…' : 'Deactivating membership…');

      try {
        const now = Date.now();
        const previous = selectedMember.membership || {};
        const membership = {
          plan: 'vault_plus',
          active,
          grantedAt: active ? (previous.grantedAt || now) : (previous.grantedAt || null),
          expiresAt: previous.expiresAt ?? null,
          updatedAt: now,
          updatedBy: window.AuthCore.currentUser.uid,
          updatedByUsername: window.AuthCore.currentUsername || null
        };

        await window.database.ref('users/' + selectedMember.uid + '/membership').set(membership);
        selectedMember.membership = membership;
        setMessage(active ? 'Vault+ activated for @' + selectedMember.username + '.' : 'Vault+ deactivated for @' + selectedMember.username + '.', 'success');
        renderMember();
      } catch (error) {
        console.error('[VaultPlusAdmin] Membership update failed:', error);
        setMessage('Could not update membership. Firebase may be denying this write; check your database rules.', 'error');
        setBusy(false);
      }
    };

    form.addEventListener('submit', searchMember);
    activateButton.addEventListener('click', () => updateMembership(true));
    deactivateButton.addEventListener('click', () => updateMembership(false));

    const unsubscribeAuth = context.store.on('user:changed', () => {
      if (!hasAdminAccess()) context.close();
    });
    containerEl._vaultPlusAdminCleanup = unsubscribeAuth;

    setBusy(false);
  },

  unmount(containerEl) {
    containerEl?._vaultPlusAdminCleanup?.();
    if (containerEl) delete containerEl._vaultPlusAdminCleanup;
  }
};

export default AppManifest;
