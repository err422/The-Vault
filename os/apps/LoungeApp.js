/**
 * VaultNet Lounge — first UI for the multiplayer service.
 * Cloud chat/presence require Firebase authentication and matching rules.
 */
import multiplayerService from '../services/MultiplayerService.js';
import store from '../core/Store.js';

export const AppManifest = {
  id: 'lounge',
  name: 'VaultNet Lounge',
  icon: '🌐',
  category: 'Social',
  version: '0.1.0',
  singleton: true,
  defaultSize: { width: 760, height: 560 },
  minSize: { width: 480, height: 360 },

  mount(containerEl) {
    multiplayerService.init();
    containerEl.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;background:linear-gradient(145deg,#10051d,#08050f);color:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;">
        <header style="padding:18px 20px;border-bottom:1px solid rgba(168,85,247,.2);display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div><div style="font-size:19px;font-weight:750;">VaultNet</div><div style="font-size:12px;color:#a78bfa;margin-top:3px;">The Web Vault social lounge</div></div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <form id="vn-name-form" style="display:flex;gap:5px;align-items:center;">
              <input id="vn-name-input" maxlength="20" aria-label="Display name" placeholder="Display name" style="width:112px;min-width:0;background:#ffffff0a;border:1px solid #ffffff1b;border-radius:9px;padding:7px 9px;color:#fff;font-size:11px;">
              <button type="submit" style="border:1px solid #8b5cf655;border-radius:9px;background:#8b5cf622;color:#ddd6fe;padding:7px 9px;font-size:11px;cursor:pointer;">Set name</button>
            </form>
            <div id="vn-count" style="font-size:12px;color:#c4b5fd;background:#8b5cf622;border:1px solid #8b5cf644;padding:7px 10px;border-radius:999px;">Checking presence…</div>
          </div>
        </header>
        <div style="display:grid;grid-template-columns:minmax(150px, .8fr) minmax(0, 1.6fr);gap:0;flex:1;min-height:0;">
          <aside style="padding:16px;border-right:1px solid rgba(168,85,247,.16);overflow:auto;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8b7aa8;font-weight:700;margin-bottom:10px;">Online</div>
            <div id="vn-peers" style="display:flex;flex-direction:column;gap:8px;"></div>
            <div style="font-size:11px;line-height:1.5;color:#78698f;margin-top:16px;">Presence is shared with signed-in users when cloud rules allow it. Guest mode only sees other tabs on this browser.</div>
          </aside>
          <section style="display:flex;flex-direction:column;min-width:0;min-height:0;">
            <div style="padding:14px 16px;border-bottom:1px solid rgba(168,85,247,.14);font-size:13px;font-weight:650;">Lobby chat</div>
            <div id="vn-chat" aria-live="polite" style="flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;"></div>
            <form id="vn-form" style="display:flex;gap:8px;padding:12px;border-top:1px solid rgba(168,85,247,.16);">
              <input id="vn-input" maxlength="280" autocomplete="off" placeholder="Say something…" style="min-width:0;flex:1;background:#ffffff0a;border:1px solid #ffffff1b;border-radius:10px;padding:10px 12px;color:#fff;outline:none;">
              <button type="submit" style="border:0;border-radius:10px;background:linear-gradient(135deg,#9333ea,#6d28d9);color:#fff;font-weight:700;padding:0 16px;cursor:pointer;">Send</button>
            </form>
          </section>
        </div>
        <footer style="padding:9px 14px;color:#7f7199;font-size:11px;border-top:1px solid rgba(168,85,247,.12);">Early access · Multiplayer games and direct pings are still in development.</footer>
      </div>`;

    const peersEl = containerEl.querySelector('#vn-peers');
    const chatEl = containerEl.querySelector('#vn-chat');
    const countEl = containerEl.querySelector('#vn-count');
    const form = containerEl.querySelector('#vn-form');
    const input = containerEl.querySelector('#vn-input');
    const nameForm = containerEl.querySelector('#vn-name-form');
    const nameInput = containerEl.querySelector('#vn-name-input');
    nameInput.value = (multiplayerService.getPeers().find(peer => peer.isSelf)?.username) || 'Vault Guest';
    nameForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = multiplayerService.setUsername(nameInput.value);
      nameInput.value = name;
      render();
    });
    let lastRenderedIds = '';

    const addText = (parent, text, style = {}) => {
      const el = document.createElement('div');
      el.textContent = String(text || '');
      Object.assign(el.style, style);
      parent.appendChild(el);
      return el;
    };

    const render = () => {
      const peers = multiplayerService.getPeers();
      countEl.textContent = peers.length + ' here';
      peersEl.textContent = '';
      peers.forEach(peer => {
        const card = document.createElement('div');
        card.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;background:#ffffff08;';
        const dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0;';
        const info = document.createElement('div');
        info.style.cssText = 'min-width:0;';
        addText(info, (peer.isSelf ? 'You · ' : '') + peer.username, { fontSize:'12px', fontWeight:'650', overflowWrap:'anywhere' });
        addText(info, peer.activity?.gameTitle || peer.activity?.app || 'Desktop', { fontSize:'10px', color:'#9b8bb9', marginTop:'2px' });
        card.append(dot, info);
        peersEl.appendChild(card);
      });

      const messages = multiplayerService.getMessages();
      const ids = messages.map(m => m.id).join('|');
      if (ids !== lastRenderedIds) {
        lastRenderedIds = ids;
        chatEl.textContent = '';
        if (!messages.length) {
          addText(chatEl, 'Welcome to the lounge. Chat from another signed-in tab or account will appear here.', { color:'#8e80a8', fontSize:'12px', lineHeight:'1.6' });
        }
        messages.forEach(message => {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'padding:9px 11px;border-radius:10px;background:#ffffff08;border:1px solid #ffffff0b;';
          const head = document.createElement('div');
          head.style.cssText = 'display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;';
          addText(head, message.username, { color:'#c4b5fd', fontSize:'11px', fontWeight:'700' });
          addText(head, new Date(message.timestamp).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}), { color:'#706384', fontSize:'10px', flexShrink:'0' });
          addText(wrap, message.text, { fontSize:'12px', lineHeight:'1.5', whiteSpace:'pre-wrap', overflowWrap:'anywhere' });
          wrap.prepend(head);
          chatEl.appendChild(wrap);
        });
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    };

    const unsubscribe = multiplayerService.subscribe(render);
    const onUserChanged = () => render();
    store.on('user:changed', onUserChanged);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      input.value = '';
      await multiplayerService.sendChat(value);
      render();
    });
    render();

    // AppRegistry calls unmount when the window closes.
    this._unmount = () => {
      unsubscribe();
      multiplayerService.destroy();
    };
  },

  unmount() {
    if (typeof this._unmount === 'function') this._unmount();
    this._unmount = null;
  }
};

export default AppManifest;
