/**
 * VaultNet multiplayer service.
 * Uses the site's existing Firebase instance; never initializes Firebase.
 * BroadcastChannel is a same-browser testing fallback, not internet multiplayer.
 */
import store from '../core/Store.js';
import notificationManager from '../core/NotificationManager.js';

const HEARTBEAT_MS = 15000;
const STALE_MS = 45000;
const MAX_CHAT = 280;

class MultiplayerService {
  constructor() {
    this.started = false;
    this.clientId = this._id();
    this.peers = new Map();
    this.messages = [];
    this.notifiedMessageIds = new Set();
    this.audioContext = null;
    this.audioUnlocked = false;
    this.listeners = new Set();
    this.cleanups = [];
    this.db = null;
    this.channel = null;
    this.presenceRef = null;
    this.uid = null;
    this.username = 'Vault Guest';
    this.activity = { app: 'Desktop', gameTitle: null, gameUrl: null };
  }

  init() {
    if (this.started) return;
    this.started = true;
    this.db = window.database && typeof window.database.ref === 'function' ? window.database : null;
    this._syncSession();
    this.cleanups.push(store.on('user:changed', () => this._syncSession()));
    const refreshActivity = () => this._syncActivityFromWindows();
    this.cleanups.push(store.on('window:created', refreshActivity));
    this.cleanups.push(store.on('window:focused', refreshActivity));
    this.cleanups.push(store.on('window:closed', refreshActivity));
    this.cleanups.push(store.on('window:stateChanged', refreshActivity));
    this._onGameSelected = event => {
      const title = String(event.detail?.title || 'Game').slice(0, 80);
      const url = event.detail?.url || event.detail?.gameUrl || null;
      this.setActivity({ app: 'Games', gameTitle: title, gameUrl: url });
    };
    window.addEventListener('zengs:select', this._onGameSelected);
    window.addEventListener('authProfileReady', this._authChanged);
    window.addEventListener('beforeunload', this._leave);
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('vaultnet_v1');
        this.channel.onmessage = e => this._receiveLocal(e.data);
      } catch (e) { console.warn('[VaultNet] Local channel unavailable:', e); }
    }
    this.timer = window.setInterval(() => {
      this._prune();
      this._publishPresence();
    }, HEARTBEAT_MS);
    this._publishPresence();
  }

  _authChanged = () => this._syncSession();
  _leave = () => {
    this._broadcast({ type: 'leave', clientId: this.clientId });
    if (this.presenceRef) this.presenceRef.remove().catch(() => {});
  };

  destroy() {
    if (!this.started) return;
    this._leave();
    window.clearInterval(this.timer);
    window.removeEventListener('authProfileReady', this._authChanged);
    window.removeEventListener('zengs:select', this._onGameSelected);
    window.removeEventListener('beforeunload', this._leave);
    this.cleanups.forEach(fn => { try { fn(); } catch {} });
    this.cleanups = [];
    this.channel?.close();
    this.channel = null;
    this.started = false;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getPeers() {
    this._prune();
    return [{
      clientId: this.clientId, uid: this.uid, username: this.username,
      activity: { ...this.activity }, isSelf: true, lastSeen: Date.now()
    }, ...this.peers.values()];
  }

  getMessages() { return this.messages.slice(); }

  setUsername(value) {
    const name = this._cleanName(value);
    this.username = name;
    try { window.localStorage?.setItem('vaultnet_username', name); } catch {}
    this._publishPresence();
    this._changed();
    return name;
  }

  _syncActivityFromWindows() {
    const windows = store.getState('windows');
    let focused = null;
    if (windows instanceof Map) {
      for (const win of windows.values()) {
        if (win?.isFocused && win.state !== 'minimized') focused = win;
      }
    }
    if (!focused) {
      this.setActivity({ app: 'Desktop' });
      return;
    }
    const appId = String(focused.appId || focused.title || 'Desktop');
    const labels = {
      browser: 'Vault Browser', games: 'Games', lounge: 'VaultNet Lounge',
      files: 'File Explorer', terminal: 'Terminal', settings: 'Settings',
      notes: 'Notes', calculator: 'Calculator'
    };
    this.setActivity({ app: labels[appId] || String(focused.title || appId).slice(0, 40) });
  }

  setActivity({ app = 'Desktop', gameTitle = null, gameUrl = null } = {}) {
    this.activity = {
      app: String(app).slice(0, 40),
      gameTitle: gameTitle ? String(gameTitle).slice(0, 80) : null,
      gameUrl: this._httpUrl(gameUrl)
    };
    this._publishPresence();
  }

  async sendChat(text) {
    const body = String(text || '').trim().slice(0, MAX_CHAT);
    if (!body) return false;
    const message = {
      id: this._id(), uid: this.uid, clientId: this.clientId,
      username: this.username, text: body, timestamp: Date.now()
    };
    this._addMessage(message);
    this._broadcast({ type: 'chat', payload: message });
    if (!this.uid || !this.db) {
      notificationManager.notify({
        title: 'Sign in required',
        message: 'Sign in to send messages to people online across the internet.',
        type: 'warning'
      });
      return false;
    }
    try {
      await this.db.ref('vaultnet/chat').push(message);
      return true;
    } catch (error) {
      console.warn('[VaultNet] Chat write failed:', error);
      notificationManager.notify({
        title: 'VaultNet unavailable',
        message: 'Chat could not sync. Firebase rules may need updating.',
        type: 'warning'
      });
      return false;
    }
  }

  _syncSession() {
    const session = store.getState('session') || {};
    const nextUid = session.isLoggedIn && session.uid ? String(session.uid) : null;
    this.username = this._cleanName(
      this._storageGet('vaultnet_username') || session.displayName || session.username || 'Vault Guest'
    );
    if (nextUid === this.uid) return;
    if (this.presenceRef) this.presenceRef.remove().catch(() => {});
    this._detachFirebase();
    this.uid = nextUid;
    this.presenceRef = null;
    if (this.uid && this.db) this._attachFirebase();
    this._publishPresence();
    this._changed();
  }

  _attachFirebase() {
    const presence = this.db.ref('vaultnet/presence');
    const onPresence = snap => {
      const next = new Map();
      const data = snap.val() || {};
      for (const peer of Object.values(data)) {
        if (!peer || !peer.clientId || !peer.uid || peer.uid === this.uid) continue;
        if (Date.now() - Number(peer.lastSeen || 0) > STALE_MS) continue;
        next.set(String(peer.clientId), {
          clientId: String(peer.clientId), uid: String(peer.uid),
          username: this._cleanName(peer.username),
          activity: this._cleanActivity(peer.activity),
          isSelf: false, lastSeen: Number(peer.lastSeen) || Date.now()
        });
      }
      this.peers = next;
      this._changed();
    };
    presence.on('value', onPresence);
    const offPresence = () => presence.off('value', onPresence); offPresence.firebaseListener = true; this.cleanups.push(offPresence);

    const chat = this.db.ref('vaultnet/chat').limitToLast(40);
    // Firebase push() stores messages under generated child keys. Listen to
    // each child, not the entire object, so incoming messages have an id.
    const onChat = snap => {
      const value = snap.val();
      if (value) {
        const message = { ...value, id: value.id || snap.key };
        this._notifyPublicMessage(message);
        this._addMessage(message);
      }
    };
    chat.on('child_added', onChat);
    const offChat = () => chat.off('child_added', onChat); offChat.firebaseListener = true; this.cleanups.push(offChat);

    this.presenceRef = this.db.ref('vaultnet/presence/' + this.clientId);
    this.presenceRef.onDisconnect().remove().catch(() => {});

    // Each signed-in user listens only to their own inbox.
  }

  _detachFirebase() {
    const retained = [];
    for (const fn of this.cleanups) {
      if (fn.firebaseListener) { try { fn(); } catch {} }
      else retained.push(fn);
    }
    this.cleanups = retained;
  }

  _publishPresence() {
    const peer = {
      clientId: this.clientId, uid: this.uid, username: this.username,
      activity: { ...this.activity }, lastSeen: Date.now()
    };
    this._broadcast({ type: 'presence', payload: peer });
    if (this.uid && this.presenceRef) {
      this.presenceRef.set(peer).catch(error => console.warn('[VaultNet] Presence denied:', error));
    }
  }

  _broadcast(packet) {
    try { this.channel?.postMessage(packet); } catch {}
  }

  _receiveLocal(packet) {
    if (!packet) return;
    if (packet.type === 'presence') {
      const peer = packet.payload;
      if (!peer || peer.clientId === this.clientId || Date.now() - Number(peer.lastSeen || 0) > STALE_MS) return;
      this.peers.set(peer.clientId, {
        ...peer, username: this._cleanName(peer.username), isSelf: false
      });
      this._changed();
    } else if (packet.type === 'leave') {
      if (this.peers.delete(packet.clientId)) this._changed();
    } else if (packet.type === 'chat') {
      this._notifyPublicMessage(packet.payload);
      this._addMessage(packet.payload);
    }
  }

  unlockChime() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      if (!this.audioContext) this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') this.audioContext.resume();
      this.audioUnlocked = true;
    } catch (error) {
      console.warn('[VaultNet] Audio chime unavailable:', error);
    }
  }

  _playChime() {
    if (!this.audioUnlocked || !this.audioContext || this.audioContext.state !== 'running') return;
    try {
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.setValueAtTime(1174.66, context.currentTime + 0.08);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
    } catch (error) {
      console.warn('[VaultNet] Could not play chat chime:', error);
    }
  }

  _notifyPublicMessage(message) {
    if (!message || !message.text) return;
    // Firebase replays recent child_added events on subscribe. Ignore older
    // history and messages sent by this same signed-in account.
    const timestamp = Number(message.timestamp) || 0;
    if (Date.now() - timestamp > 60000 || timestamp > Date.now() + 5000) return;
    // Suppress only this exact client session. Other tabs/devices may share
    // an account but should still receive notifications for incoming messages.
    if (message.clientId && message.clientId === this.clientId) return;
    const notificationId = String(message.id || '');
    if (notificationId && this.notifiedMessageIds.has(notificationId)) return;
    if (notificationId) {
      this.notifiedMessageIds.add(notificationId);
      if (this.notifiedMessageIds.size > 200) {
        this.notifiedMessageIds.delete(this.notifiedMessageIds.values().next().value);
      }
    }
    this._playChime();
  }

  _addMessage(message) {
    if (!message || !message.id || this.messages.some(m => m.id === message.id)) return;
    this.messages.push({
      id: String(message.id).slice(0, 100),
      uid: message.uid ? String(message.uid).slice(0, 128) : null,
      clientId: String(message.clientId || '').slice(0, 100),
      username: this._cleanName(message.username),
      text: String(message.text || '').slice(0, MAX_CHAT),
      timestamp: Number(message.timestamp) || Date.now()
    });
    if (this.messages.length > 50) this.messages.splice(0, this.messages.length - 50);
    this._changed();
  }

  _cleanActivity(activity) {
    return {
      app: String(activity?.app || 'Desktop').slice(0, 40),
      gameTitle: activity?.gameTitle ? String(activity.gameTitle).slice(0, 80) : null,
      gameUrl: this._httpUrl(activity?.gameUrl)
    };
  }

  _cleanName(value) {
    return String(value || 'Vault Guest').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20) || 'Vault Guest';
  }

  _httpUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }

  _storageGet(key) { try { return window.localStorage?.getItem(key); } catch { return null; } }
  _id() { return 'vn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }

  _prune() {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.peers) {
      if (now - Number(peer.lastSeen || 0) > STALE_MS) {
        this.peers.delete(id);
        changed = true;
      }
    }
    if (changed) this._changed();
  }

  _changed() {
    store.setState('multiplayer.onlineCount', this.peers.size + 1);
    this.listeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[VaultNet] Subscriber failed:', e); } });
  }
}

const multiplayerService = new MultiplayerService();
export default multiplayerService;
