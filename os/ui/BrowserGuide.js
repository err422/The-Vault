/**
 * Beginner-friendly help overlay for the Vault Browser.
 * All guide text is inserted with textContent / DOM APIs.
 */
export function showBrowserGuide() {
  document.getElementById('vault-browser-guide')?.remove();
  try { localStorage.setItem('vault_browser_guide_seen_v1', 'true'); } catch (error) { console.warn('[BrowserGuide] Could not save first-visit flag:', error); }
  const steps = [
    ['Using the address bar', 'Click the long rounded box near the top, type a website address (like wikipedia.org) or a search (like cats), then press Enter. The + button opens a new tab.'],
    ['Proxy ON (purple)', 'If the toolbar button is purple and says Proxy, this tab uses the Vault proxy service to request and display the page. Click the mode button until it says Proxy to turn it on. It will not work for every website and does not guarantee anonymity or safety.'],
    ['Proxy OFF (yellow)', 'Click the mode button when it says Proxy. It changes to yellow and says Direct. The tab now tries to load the page directly without the Vault proxy. To turn proxy back on, click Direct once and check that it changes to purple Proxy.'],
    ['Tabs and navigation', 'Each tab is a separate page. Click a tab at the top to switch pages; + opens a tab and × closes one. ← goes back, → goes forward, and ↻ reloads. New tabs inherit the current tab’s Proxy/Direct setting.'],
    ['If a page does not work', 'Try switching Proxy ↔ Direct, then press ↻ to reload. Check the address spelling. Some websites refuse to load inside another page, and either mode can fail. Do not enter passwords or personal information on websites you do not trust.']
  ];
  const make = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const overlay = make('div');
  overlay.id = 'vault-browser-guide';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,4,13,.82);backdrop-filter:blur(10px);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#f5f3ff;';
  const style = make('style');
  style.textContent = '#vault-browser-guide *{box-sizing:border-box}#vault-browser-guide .card{width:100%;max-width:520px;background:linear-gradient(155deg,#211735,#0d0818);border:1px solid #a855f766;border-radius:18px;box-shadow:0 24px 70px #000b;overflow:auto;max-height:calc(100vh - 32px)}#vault-browser-guide header,#vault-browser-guide footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px}#vault-browser-guide header,#vault-browser-guide footer{border-bottom:1px solid #ffffff12}#vault-browser-guide footer{border:0;border-top:1px solid #ffffff12}#vault-browser-guide .body{padding:22px 20px}#vault-browser-guide h2{margin:0 0 12px;font-size:21px;color:#fff}#vault-browser-guide p{font-size:14px;line-height:1.65;color:#d6c8f4;margin:0}#vault-browser-guide .label{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#d8b4fe}#vault-browser-guide .progress{font-size:12px;color:#a79bc8}#vault-browser-guide button{font:inherit;cursor:pointer;border-radius:9px;padding:9px 13px;color:#e9d5ff;background:#ffffff0a;border:1px solid #ffffff22}#vault-browser-guide .primary{color:white;background:linear-gradient(135deg,#9333ea,#6d28d9);border-color:#d8b4fe55}#vault-browser-guide .actions{display:flex;gap:8px}';
  const card = make('section', 'card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Vault Browser Guide');
  const header = make('header');
  const label = make('span', 'label', 'Vault Browser Guide');
  const close = make('button', '', 'Close ×');
  header.append(label, close);
  const body = make('div', 'body');
  const title = make('h2');
  const description = make('p');
  body.append(title, description);
  const footer = make('footer');
  const progress = make('span', 'progress');
  const actions = make('div', 'actions');
  const back = make('button', '', 'Back');
  const next = make('button primary', '', 'Next →');
  actions.append(back, next);
  footer.append(progress, actions);
  card.append(header, body, footer);
  overlay.append(style, card);
  document.body.append(overlay);
  let index = 0, closed = false;
  function render() {
    title.textContent = steps[index][0];
    description.textContent = steps[index][1];
    progress.textContent = 'Step ' + (index + 1) + ' of ' + steps.length;
    back.disabled = index === 0;
    back.style.opacity = back.disabled ? '.4' : '1';
    next.textContent = index === steps.length - 1 ? 'Got it' : 'Next →';
  }
  function finish() {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey);
    overlay.remove();
  }
  function onKey(event) {
    if (event.key === 'Escape') finish();
    else if (event.key === 'ArrowRight' && !closed) next.click();
    else if (event.key === 'ArrowLeft' && !closed) back.click();
  }
  back.addEventListener('click', () => { if (index > 0) { index--; render(); } });
  next.addEventListener('click', () => { if (index < steps.length - 1) { index++; render(); } else finish(); });
  close.addEventListener('click', finish);
  overlay.addEventListener('click', event => { if (event.target === overlay) finish(); });
  window.addEventListener('keydown', onKey);
  render();
  next.focus();
}
export default showBrowserGuide;
