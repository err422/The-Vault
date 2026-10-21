/**
 * @fileoverview First-time onboarding tour for The Web Vault WebOS.
 * All user-facing content is rendered with DOM APIs (no HTML-string injection).
 */

const STORAGE_KEY = 'vaultos_onboarded_v2';

const TOUR_STEPS = [
  {
    icon: '🛡️',
    title: 'Welcome to vaultOS 2.0',
    badge: 'Getting Started',
    description: 'The Web Vault has evolved into a desktop environment inside your browser. Run apps, play games, and browse the web from one workspace.',
    tips: [
      'Everything runs in movable, resizable windows',
      'Your notes, files, and settings save automatically',
      'Customize wallpapers and performance modes in Settings'
    ]
  },
  {
    icon: '🚀',
    title: 'Taskbar Dock & Start Launcher',
    badge: 'Navigation',
    description: 'Use the bottom dock to switch between apps, or open the Start Launcher to see what is installed.',
    tips: [
      'Click the Vault icon or press the Super/Windows key to open the launcher',
      'Hover at the bottom edge to summon the dock when auto-hide is enabled',
      'Active apps show an indicator beneath their icon'
    ]
  },
  {
    icon: '🪟',
    title: 'Window Controls & Multitasking',
    badge: 'Workspace',
    description: 'Each app opens in its own window. Arrange windows or maximize an app to focus on it.',
    tips: [
      'Drag a window title bar to move it; drag its edges to resize',
      'Use the window controls to minimize, maximize, or close apps',
      'Enable Reduced Motion in Settings for a simpler, lighter experience'
    ]
  },
  {
    icon: '🌐',
    title: 'Vault Games, Browser & Terminal',
    badge: 'Core Apps',
    description: 'Explore built-in tools and entertainment designed for vaultOS.',
    tips: [
      'Vault Games lets you search the arcade and launch games',
      'Vault Browser has a ? Help button that explains the address bar, tabs, and how to switch Proxy and Direct modes',
      'Terminal includes commands such as help, ls, and neofetch'
    ]
  }
];

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export const OnboardingTour = {
  init(force = false) {
    try {
      if (!force && localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch (error) {
      console.warn('[OnboardingTour] localStorage unavailable:', error);
    }
    this.mount();
  },

  mount() {
    document.getElementById('vault-onboarding-overlay')?.remove();

    let currentStep = 0;
    let closed = false;
    const overlay = makeElement('div');
    overlay.id = 'vault-onboarding-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999990',
      'background:rgba(7,4,13,.78)', 'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:20px',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      'opacity:0', 'transition:opacity .3s ease'
    ].join(';');

    const style = makeElement('style');
    style.textContent = `
      #vault-onboarding-overlay * { box-sizing:border-box; }
      #vault-onboarding-overlay .vo-card {
        width:100%; max-width:480px; max-height:calc(100vh - 40px); overflow:auto;
        background:linear-gradient(160deg,rgba(26,18,44,.98),rgba(13,8,24,.99));
        border:1px solid rgba(168,85,247,.35); border-radius:18px;
        box-shadow:0 24px 60px rgba(0,0,0,.75),0 0 40px rgba(139,92,246,.2);
        color:#f3f0f9; display:flex; flex-direction:column;
        transform:translateY(12px) scale(.98);
        transition:transform .3s cubic-bezier(.16,1,.3,1);
      }
      #vault-onboarding-overlay.vo-visible .vo-card { transform:translateY(0) scale(1); }
      #vault-onboarding-overlay .vo-header,#vault-onboarding-overlay .vo-footer {
        padding:18px 24px; display:flex; align-items:center; justify-content:space-between;
      }
      #vault-onboarding-overlay .vo-header { border-bottom:1px solid rgba(168,85,247,.15); }
      #vault-onboarding-overlay .vo-badge { background:rgba(168,85,247,.18); border:1px solid rgba(168,85,247,.4); color:#d8b4fe; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; padding:4px 10px; border-radius:999px; }
      #vault-onboarding-overlay button { font:inherit; cursor:pointer; }
      #vault-onboarding-overlay .vo-skip { background:transparent; border:0; color:#a79bc8; font-size:12px; padding:6px 8px; border-radius:6px; }
      #vault-onboarding-overlay .vo-skip:hover { color:#fff; background:rgba(255,255,255,.06); }
      #vault-onboarding-overlay .vo-body { padding:22px 24px; }
      #vault-onboarding-overlay .vo-icon { font-size:42px; margin-bottom:12px; display:inline-block; filter:drop-shadow(0 4px 12px rgba(168,85,247,.4)); }
      #vault-onboarding-overlay .vo-title { margin:0 0 10px; font-size:20px; font-weight:700; color:#fff; }
      #vault-onboarding-overlay .vo-desc { margin:0 0 18px; font-size:13.5px; line-height:1.55; color:#c4b5fd; }
      #vault-onboarding-overlay .vo-tips { background:rgba(7,4,13,.65); border:1px solid rgba(168,85,247,.2); border-radius:12px; padding:12px 16px; display:flex; flex-direction:column; gap:9px; }
      #vault-onboarding-overlay .vo-tip-item { font-size:12.5px; color:#e9d5ff; line-height:1.45; }
      #vault-onboarding-overlay .vo-footer { border-top:1px solid rgba(255,255,255,.06); background:rgba(10,6,20,.5); gap:14px; flex-wrap:wrap; }
      #vault-onboarding-overlay .vo-dots { display:flex; gap:6px; align-items:center; }
      #vault-onboarding-overlay .vo-dot { width:8px; height:8px; border-radius:999px; background:rgba(168,85,247,.25); transition:width .2s,background .2s; }
      #vault-onboarding-overlay .vo-dot.active { width:22px; background:#a855f7; }
      #vault-onboarding-overlay .vo-actions { display:flex; gap:8px; margin-left:auto; }
      #vault-onboarding-overlay .vo-btn { padding:8px 14px; border-radius:10px; font-size:12.5px; font-weight:600; }
      #vault-onboarding-overlay .vo-btn:active { transform:scale(.97); }
      #vault-onboarding-overlay .vo-btn-back { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#d8b4fe; }
      #vault-onboarding-overlay .vo-btn-next { background:linear-gradient(135deg,#9333ea,#7e22ce); border:1px solid rgba(216,180,254,.3); color:#fff; box-shadow:0 4px 14px rgba(147,51,234,.3); }
      @media(max-width:520px) { #vault-onboarding-overlay { padding:12px; } #vault-onboarding-overlay .vo-body { padding:18px; } #vault-onboarding-overlay .vo-header,#vault-onboarding-overlay .vo-footer { padding:14px 18px; } }
      @media(prefers-reduced-motion:reduce) { #vault-onboarding-overlay *,#vault-onboarding-overlay { transition:none!important; } }
    `;

    const card = makeElement('div', 'vo-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'vo-step-title');

    const header = makeElement('div', 'vo-header');
    const badge = makeElement('span', 'vo-badge');
    const skip = makeElement('button', 'vo-skip', 'Skip Tour ×');
    skip.type = 'button';
    skip.title = 'Skip tutorial';
    header.append(badge, skip);

    const body = makeElement('div', 'vo-body');
    const icon = makeElement('div', 'vo-icon');
    const title = makeElement('h2', 'vo-title');
    title.id = 'vo-step-title';
    const description = makeElement('p', 'vo-desc');
    const tips = makeElement('div', 'vo-tips');
    body.append(icon, title, description, tips);

    const footer = makeElement('div', 'vo-footer');
    const dots = makeElement('div', 'vo-dots');
    dots.setAttribute('aria-label', 'Tour progress');
    const actions = makeElement('div', 'vo-actions');
    const back = makeElement('button', 'vo-btn vo-btn-back', 'Back');
    back.type = 'button';
    const next = makeElement('button', 'vo-btn vo-btn-next', 'Next →');
    next.type = 'button';
    actions.append(back, next);
    footer.append(dots, actions);
    card.append(header, body, footer);
    overlay.append(style, card);
    document.body.appendChild(overlay);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') finishTour();
      else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        if (!closed) { event.preventDefault(); next.click(); }
      } else if (event.key === 'ArrowLeft' && !closed) {
        event.preventDefault();
        back.click();
      }
    };

    const finishTour = () => {
      if (closed) return;
      closed = true;
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      window.removeEventListener('keydown', onKeyDown);
      overlay.style.opacity = '0';
      overlay.classList.remove('vo-visible');
      window.setTimeout(() => overlay.remove(), 300);
    };

    const renderStep = () => {
      const step = TOUR_STEPS[currentStep];
      badge.textContent = `${step.badge} • ${currentStep + 1} of ${TOUR_STEPS.length}`;
      icon.textContent = step.icon;
      title.textContent = step.title;
      description.textContent = step.description;
      tips.replaceChildren();
      step.tips.forEach((tip) => tips.appendChild(makeElement('div', 'vo-tip-item', `• ${tip}`)));
      dots.replaceChildren();
      TOUR_STEPS.forEach((_, index) => {
        const dot = makeElement('span', `vo-dot${index === currentStep ? ' active' : ''}`);
        dot.setAttribute('aria-hidden', 'true');
        dots.appendChild(dot);
      });
      back.style.display = currentStep === 0 ? 'none' : 'inline-block';
      next.textContent = currentStep === TOUR_STEPS.length - 1 ? 'Start Exploring 🚀' : 'Next →';
    };

    back.addEventListener('click', () => {
      if (closed || currentStep === 0) return;
      currentStep -= 1;
      renderStep();
    });
    next.addEventListener('click', () => {
      if (closed) return;
      if (currentStep < TOUR_STEPS.length - 1) {
        currentStep += 1;
        renderStep();
      } else finishTour();
    });
    skip.addEventListener('click', finishTour);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finishTour();
    });
    window.addEventListener('keydown', onKeyDown);
    renderStep();
    requestAnimationFrame(() => {
      if (!closed) {
        overlay.style.opacity = '1';
        overlay.classList.add('vo-visible');
      }
    });
    next.focus();
  },

  resetAndShow() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    this.init(true);
  }
};

export default OnboardingTour;
