/**
 * First-run desktop setup for The Web Vault WebOS.
 * Account-wide choices live in users/{uid}/webos; fullscreen remains device-local.
 */
import settingsManager, { ACCENTS, WALLPAPERS } from '../core/SettingsManager.js';
import store from '../core/Store.js';

const STYLE_ID = 'vault-first-run-setup-styles';
const APP_CHOICES = [
  { id: 'file-explorer', label: 'File Explorer', icon: '📁' },
  { id: 'browser', label: 'Browser', icon: '🌐' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'terminal', label: 'Terminal', icon: '💻' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'vault-hub', label: 'Vault Hub', icon: '🏠' },
  { id: 'lounge', label: 'VaultNet', icon: '💬' },
  { id: 'bell', label: 'Bell', icon: '🔔' }
];

class SetupWizard {
  constructor() {
    this._shownFor = new Set();
  }

  async show(user, cloudPrefs = {}, { force = false } = {}) {
    if (!user?.uid || (this._shownFor.has(user.uid) && !force)) return;
    this._shownFor.add(user.uid);
    if (cloudPrefs.setupCompleted === true && !force) return;

    const existing = document.getElementById('vault-first-run-setup');
    if (existing) existing.remove();

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        #vault-first-run-setup{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:20px;background:rgba(5,3,12,.78);backdrop-filter:blur(22px);color:#f5f3ff;font:14px/1.5 system-ui,-apple-system,sans-serif}
        #vault-first-run-setup *{box-sizing:border-box}
        .vfs-card{width:min(620px,100%);max-height:min(88vh,760px);overflow:auto;border:1px solid rgba(196,181,253,.24);border-radius:24px;background:linear-gradient(145deg,rgba(30,20,48,.98),rgba(10,8,18,.98));box-shadow:0 30px 100px #0009;padding:clamp(22px,5vw,38px)}
        .vfs-kicker{color:#c4b5fd;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:800}
        .vfs-title{font-size:clamp(25px,5vw,34px);line-height:1.15;margin:9px 0}
        .vfs-sub{color:#aaa2bd;margin:0 0 25px}
        .vfs-progress{display:flex;gap:7px;margin:0 0 26px}.vfs-progress span{height:4px;flex:1;border-radius:9px;background:#ffffff18}.vfs-progress span.active{background:#a78bfa}
        .vfs-field{display:block;color:#d8d2e8;font-weight:650;margin:18px 0 7px}
        .vfs-input,.vfs-select{width:100%;border:1px solid #ffffff24;border-radius:11px;padding:12px 13px;background:#100c1b;color:#fff;font:inherit;outline:none}
        .vfs-input:focus,.vfs-select:focus{border-color:#a78bfa}
        .vfs-options{display:flex;flex-wrap:wrap;gap:9px}
        .vfs-option{border:1px solid #ffffff24;border-radius:12px;background:#ffffff08;color:#eee8ff;padding:10px 13px;cursor:pointer}
        .vfs-option[aria-pressed=true]{border-color:#a78bfa;background:#8b5cf629;box-shadow:inset 0 0 0 1px #8b5cf655}
        .vfs-swatches{display:flex;gap:10px;flex-wrap:wrap}.vfs-swatch{width:34px;height:34px;border-radius:50%;border:3px solid transparent;cursor:pointer;box-shadow:0 0 0 1px #ffffff35}.vfs-swatch[aria-pressed=true]{outline:2px solid #fff;outline-offset:3px}
        .vfs-note{font-size:12px;color:#9991ad;margin-top:8px}
        .vfs-app-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .vfs-app-choice{display:flex;align-items:center;gap:8px;min-width:0;padding:11px;border:1px solid #ffffff20;border-radius:12px;background:#ffffff08;color:#eee8ff;cursor:pointer;font-weight:600}
        .vfs-app-choice:has(input:checked){border-color:#a78bfa;background:#8b5cf626}
        .vfs-app-choice input{accent-color:#8b5cf6;width:16px;height:16px;flex-shrink:0}
        .vfs-app-icon{font-size:20px}
        @media(max-width:480px){.vfs-app-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        .vfs-footer{display:flex;justify-content:space-between;gap:12px;margin-top:28px}
        .vfs-btn{border:1px solid #ffffff26;border-radius:12px;padding:11px 17px;background:#ffffff0c;color:#eee8ff;font:inherit;font-weight:700;cursor:pointer}.vfs-btn.primary{background:#8b5cf6;border-color:#a78bfa;color:white}.vfs-btn:disabled{opacity:.6;cursor:wait}
        .vfs-avatars{display:flex;gap:8px;flex-wrap:wrap}.vfs-avatar{font-size:22px;width:44px;height:44px;border:1px solid #ffffff24;border-radius:12px;background:#ffffff08;cursor:pointer}.vfs-avatar[aria-pressed=true]{border-color:#a78bfa;background:#8b5cf633}
        @media(max-width:480px){#vault-first-run-setup{padding:10px}.vfs-card{border-radius:18px}.vfs-footer .vfs-btn{padding:10px 12px}}
      `;
      document.head.appendChild(style);
    }

    const accents = ACCENTS.map(a => `<button type="button" class="vfs-swatch" data-accent="${a.id}" title="${a.name}" aria-label="${a.name}" style="background:${a.primary}" aria-pressed="${(cloudPrefs.accent || settingsManager.get('accent')) === a.id}"></button>`).join('');
    const avatars = ['🧑‍💻','🎮','🦊','🐈','🌙','⚡','🛸'].map((emoji,i)=>`<button type="button" class="vfs-avatar" data-avatar="${emoji}" aria-label="Avatar ${i+1}" aria-pressed="${(cloudPrefs.avatar || '🧑‍💻')===emoji}">${emoji}</button>`).join('');
    const savedDesktopApps = Array.isArray(cloudPrefs.desktopApps) ? cloudPrefs.desktopApps : (Array.isArray(settingsManager.get('desktopApps')) ? settingsManager.get('desktopApps') : APP_CHOICES.map(a => a.id));
    const desktopAppOptions = APP_CHOICES.map(app => `<label class="vfs-app-choice"><input type="checkbox" data-desktop-app="${app.id}" ${savedDesktopApps.includes(app.id) ? 'checked' : ''}><span class="vfs-app-icon">${app.icon}</span><span>${app.label}</span></label>`).join('');

    const wallpaperOptions = [
      {id:'vault-default',name:'Current Vault wallpaper'},
      {id:'nebula-purple',name:'Cosmic Nebula'},
      {id:'cyber-grid',name:'Cyber Grid'},
      {id:'abyss-dark',name:'Obsidian'},
      {id:'synthwave',name:'Synthwave'},
      {id:'deep-space',name:'Deep Space'}
    ].map(w=>`<button type="button" class="vfs-option" data-wallpaper="${w.id}" aria-pressed="${(cloudPrefs.wallpaper || settingsManager.get('wallpaper') || 'vault-default')===w.id}">${w.name}</button>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'vault-first-run-setup';
    overlay.innerHTML = `
      <section class="vfs-card" role="dialog" aria-modal="true" aria-labelledby="vfs-title">
        <div class="vfs-kicker">THE WEB VAULT · FIRST RUN</div>
        <div class="vfs-progress"><span class="active"></span><span></span><span></span></div>
        <div class="vfs-step" data-step="0">
          <h1 class="vfs-title" id="vfs-title">Make this desktop yours.</h1>
          <p class="vfs-sub">A couple quick choices, then you're straight into WebOS. You can change everything later in Settings.</p>
          <label class="vfs-field" for="vfs-display-name">Display name</label>
          <input class="vfs-input" id="vfs-display-name" maxlength="24" value="${String(cloudPrefs.displayName || store.getState('session.username') || user.displayName || user.email?.split('@')[0] || 'User').replace(/[&<>"']/g,'')}" placeholder="What should WebOS call you?">
          <label class="vfs-field">Choose an avatar</label><div class="vfs-avatars">${avatars}</div>
        </div>
        <div class="vfs-step" data-step="1" hidden>
          <h2 class="vfs-title">Pick your vibe.</h2><p class="vfs-sub">Your accent and theme follow your account between computers.</p>
          <label class="vfs-field">Appearance</label><div class="vfs-options"><button class="vfs-option" data-theme="dark" aria-pressed="${(cloudPrefs.theme || settingsManager.get('theme') || 'dark') === 'dark'}">🌙 Dark</button><button class="vfs-option" data-theme="light" aria-pressed="${(cloudPrefs.theme || settingsManager.get('theme') || 'dark') === 'light'}">☀️ Light</button></div>
          <label class="vfs-field">Accent color</label><div class="vfs-swatches">${accents}</div>
          <label class="vfs-field">Wallpaper</label><div class="vfs-options">${wallpaperOptions}</div>
          <label class="vfs-field" for="vfs-custom-wallpaper">Or use a custom wallpaper URL (optional)</label><input class="vfs-input" id="vfs-custom-wallpaper" type="url" maxlength="1500" placeholder="https://example.com/wallpaper.jpg" value="${String(cloudPrefs.customWallpaperUrl || '').replace(/[&<>"']/g,'')}">
          <p class="vfs-note">The current Vault wallpaper stays selected by default. A custom URL only replaces it if you enter one.</p>
        </div>
        <div class="vfs-step" data-step="2" hidden>
          <h2 class="vfs-title">One last thing.</h2><p class="vfs-sub">These choices make the desktop feel right on this computer.</p>
                    <label class="vfs-field">Desktop shortcuts</label>
          <p class="vfs-note">Choose which apps appear on your desktop. You can still open any app from the launcher.</p>
          <div class="vfs-app-grid">${desktopAppOptions}</div>
          <label class="vfs-field">Launch behavior</label>
          <div class="vfs-options"><button type="button" class="vfs-option" data-fullscreen="false" aria-pressed="${settingsManager.get('autoFullscreenOnClick') === false}">🪟 Normal window</button><button type="button" class="vfs-option" data-fullscreen="true" aria-pressed="${settingsManager.get('autoFullscreenOnClick') !== false}">⛶ Auto-fullscreen on click</button></div>
          <p class="vfs-note">Fullscreen is saved on this device only, since different computers may have different needs.</p>
          <div style="margin-top:24px;padding:15px;border-radius:14px;background:#ffffff08;border:1px solid #ffffff12"><strong>You're all set.</strong><div class="vfs-note">Your account preferences sync through Firebase, so they'll follow you to another computer.</div></div>
        </div>
        <div class="vfs-error" role="status" style="color:#fca5a5;min-height:20px;margin-top:10px"></div>
        <div class="vfs-footer"><button type="button" class="vfs-btn" data-back hidden>Back</button><button type="button" class="vfs-btn primary" data-next>Continue →</button></div>
      </section>`;
    document.body.appendChild(overlay);

    let step = 0;
    let accent = cloudPrefs.accent || settingsManager.get('accent') || 'violet';
    let theme = cloudPrefs.theme || settingsManager.get('theme') || 'dark';
    let wallpaper = cloudPrefs.wallpaper || settingsManager.get('wallpaper') || 'vault-default';
    let avatar = cloudPrefs.avatar || '🧑‍💻';
    let fullscreen = settingsManager.get('autoFullscreenOnClick') !== false;
    const steps = [...overlay.querySelectorAll('.vfs-step')];
    const progress = [...overlay.querySelectorAll('.vfs-progress span')];
    const error = overlay.querySelector('.vfs-error');
    const back = overlay.querySelector('[data-back]');
    const next = overlay.querySelector('[data-next]');

    const update = () => {
      steps.forEach((el,i)=>el.hidden=i!==step);
      progress.forEach((el,i)=>el.classList.toggle('active',i<=step));
      back.hidden = step===0;
      next.textContent = step===2 ? 'Save & enter desktop →' : 'Continue →';
    };
    overlay.querySelectorAll('[data-avatar]').forEach(b=>b.addEventListener('click',()=>{avatar=b.dataset.avatar;overlay.querySelectorAll('[data-avatar]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
    overlay.querySelectorAll('[data-accent]').forEach(b=>b.addEventListener('click',()=>{accent=b.dataset.accent;overlay.querySelectorAll('[data-accent]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));settingsManager.set('accent',accent);}));
    overlay.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.theme;overlay.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));settingsManager.set('theme',theme);}));
    overlay.querySelectorAll('[data-wallpaper]').forEach(b=>b.addEventListener('click',()=>{wallpaper=b.dataset.wallpaper;overlay.querySelectorAll('[data-wallpaper]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));settingsManager.set('wallpaper',wallpaper);settingsManager.set('customWallpaperUrl','');overlay.querySelector('#vfs-custom-wallpaper').value='';}));
    overlay.querySelectorAll('[data-fullscreen]').forEach(b=>b.addEventListener('click',()=>{fullscreen=b.dataset.fullscreen==='true';overlay.querySelectorAll('[data-fullscreen]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
    back.addEventListener('click',()=>{if(step>0){step--;update();}});
    next.addEventListener('click',async()=>{
      error.textContent='';
      if(step<2){step++;update();return;}
      const customUrl=overlay.querySelector('#vfs-custom-wallpaper').value.trim();
      if(customUrl && !/^https?:\/\//i.test(customUrl)){error.textContent='Wallpaper URL must start with http:// or https://';step=1;update();return;}
      next.disabled=true;next.textContent='Saving…';
      try{
        if(customUrl){settingsManager.set('customWallpaperUrl',customUrl);}
        else {settingsManager.set('wallpaper',wallpaper);settingsManager.set('customWallpaperUrl','');}
        settingsManager.set('autoFullscreenOnClick',fullscreen);
        const desktopApps=[...overlay.querySelectorAll('[data-desktop-app]:checked')].map(input=>input.dataset.desktopApp);
        settingsManager.set('desktopApps',desktopApps);
        const prefs={setupCompleted:true,setupVersion:1,displayName:(overlay.querySelector('#vfs-display-name').value.trim().slice(0,24) || store.getState('session.username') || 'User'),avatar,theme,accent,wallpaper:customUrl?'vault-default':wallpaper,customWallpaperUrl:customUrl,desktopApps,updatedAt:Date.now()};
        if(window.database && user.uid) {
          try {
            await window.database.ref(`users/${user.uid}/webos`).update(prefs);
          } catch (cloudError) {
            // Do not trap a user in setup when Firebase is temporarily unavailable.
            console.warn('[SetupWizard] Cloud save failed; keeping local choices:', cloudError);
          }
        }
        store.setState('session.displayName',prefs.displayName);
        store.setState('session.avatar',avatar);
        window.dispatchEvent(new CustomEvent('vaultos:desktop-apps-changed',{detail:{desktopApps}}));
        overlay.remove();
        window.dispatchEvent(new CustomEvent('webos:setup-complete',{detail:prefs}));
      }catch(err){console.warn('[SetupWizard] Could not save preferences to cloud:',err);error.textContent='Could not sync right now. Your choices are applied on this device; try saving again when online.';next.disabled=false;next.textContent='Save & enter desktop →';}
    });
    update();
  }
}

const setupWizard = new SetupWizard();
export default setupWizard;
