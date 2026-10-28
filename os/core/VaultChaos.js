/**
 * Local-only Web Vault chaos Easter egg.
 * Uses a bounded particle pool and automatic cleanup so the joke cannot
 * intentionally exhaust the browser or leave animations running forever.
 */
const STORAGE_KEY = 'vaultos_chaos_chance_v1';
const DEFAULT_CHANCE = 1;
const MAX_PARTICLES = 320;
const DURATION_MS = 12000;
let activeOverlay = null;
let keyBuffer = '';
let keyBufferAt = 0;

export function getChaosChance() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_CHANCE;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_CHANCE;
  } catch {
    return DEFAULT_CHANCE;
  }
}

export function setChaosChance(value) {
  const chance = Number(value);
  if (!Number.isFinite(chance) || chance < 0 || chance > 100) return false;
  try {
    localStorage.setItem(STORAGE_KEY, String(chance));
    return true;
  } catch {
    return false;
  }
}

export function maybeTriggerChaos() {
  if (Math.random() * 100 < getChaosChance()) triggerChaos();
}

export function triggerChaos() {
  if (activeOverlay) return;
  if (typeof document === 'undefined' || !document.body) return;

  const overlay = document.createElement('div');
  overlay.id = 'vault-chaos-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Secret code celebration');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:hidden;pointer-events:auto;background:rgba(8,3,18,.92);color:white;font-family:system-ui,sans-serif;';
  const style = document.createElement('style');
  style.textContent = `
    #vault-chaos-overlay .vc-card{position:absolute;z-index:2;left:50%;top:42%;transform:translate(-50%,-50%);width:min(680px,90vw);text-align:center;padding:30px 20px;border:1px solid #a855f7;border-radius:20px;background:rgba(25,12,42,.94);box-shadow:0 0 60px #7c3aed66}
    #vault-chaos-overlay .vc-title{font-size:clamp(26px,5vw,52px);font-weight:900;letter-spacing:.03em;color:#e9d5ff;text-shadow:0 0 22px #a855f7}
    #vault-chaos-overlay .vc-sub{margin-top:12px;color:#d8b4fe}
    #vault-chaos-overlay .vc-particle{position:absolute;top:-24px;width:10px;height:16px;will-change:transform;pointer-events:none;border-radius:2px}
    #vault-chaos-overlay .vc-stop{margin-top:22px;padding:10px 16px;border:1px solid #c4b5fd;border-radius:9px;background:#6d28d9;color:white;font-weight:700;cursor:pointer}
    #vault-chaos-overlay .vc-count{font-variant-numeric:tabular-nums;color:#c4b5fd;font-size:12px;margin-top:10px}
  `;
  const card = document.createElement('div');
  card.className = 'vc-card';
  card.innerHTML = '<div class="vc-title">CONGRATULATIONS!</div><div class="vc-title" style="font-size:clamp(19px,3vw,30px)">YOU FOUND THE SECRET CODE!</div><div class="vc-sub">Achievement unlocked: Unsupervised Developer</div><div class="vc-count">Confetti systems: suspiciously operational</div><button class="vc-stop" type="button">RESTORE REALITY</button>';
  overlay.append(style, card);
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const stop = () => {
    if (activeOverlay !== overlay) return;
    cancelAnimationFrame(frameId);
    clearTimeout(cleanupTimer);
    window.removeEventListener('keydown', onKeydown, true);
    overlay.remove();
    activeOverlay = null;
  };
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stop();
    }
  };
  card.querySelector('.vc-stop').addEventListener('click', stop);
  window.addEventListener('keydown', onKeydown, true);

  const colors = ['#c084fc', '#f0abfc', '#f9a8d4', '#a5b4fc', '#fef08a', '#6ee7b7', '#ffffff'];
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const node = document.createElement('i');
    node.className = 'vc-particle';
    node.style.background = colors[Math.floor(Math.random() * colors.length)];
    overlay.appendChild(node);
    particles.push({
      node,
      x: Math.random() * Math.max(1, window.innerWidth),
      y: -Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 5,
      vy: 1 + Math.random() * 5,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      size: 0.55 + Math.random() * 1.4
    });
  }

  const started = performance.now();
  let last = started;
  let frameId = 0;
  const cleanupTimer = setTimeout(stop, DURATION_MS);
  function animate(now) {
    if (activeOverlay !== overlay) return;
    const dt = Math.min(2, (now - last) / 16.67 || 1);
    last = now;
    const elapsed = now - started;
    const count = card.querySelector('.vc-count');
    if (count) count.textContent = elapsed < 4000
      ? 'Confetti systems: suspiciously operational'
      : elapsed < 8000
        ? 'ConfettiManager.js is making several decisions'
        : 'This is absolutely a feature. Probably.';
    for (const p of particles) {
      p.vy += 0.055 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > window.innerHeight + 30) {
        p.y = -20;
        p.x = Math.random() * Math.max(1, window.innerWidth);
        p.vy = 1 + Math.random() * 5;
      }
      if (p.x < -20 || p.x > window.innerWidth + 20) p.vx *= -1;
      p.node.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg) scale(${p.size})`;
    }
    frameId = requestAnimationFrame(animate);
  }
  frameId = requestAnimationFrame(animate);
}

if (typeof window !== 'undefined' && !window.__vaultChaosKeyListener) {
  window.__vaultChaosKeyListener = true;
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    const now = Date.now();
    if (now - keyBufferAt > 1800) keyBuffer = '';
    keyBufferAt = now;
    keyBuffer = (keyBuffer + event.key.toLowerCase()).slice(-10);
    if (keyBuffer === 'vaultchaos') {
      keyBuffer = '';
      triggerChaos();
    }
  }, true);
}
