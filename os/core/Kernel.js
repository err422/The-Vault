/**
 * @fileoverview Boot Kernel for The Web Vault WebOS.
 *
 * Orchestrates the full startup sequence with interactive boot trigger & diagnostics:
 * 1. Retro BIOS / Terminal boot overlay awaiting [ENTER]
 * 2. High-volume pseudo-random kernel & network diagnostics flood
 * 3. Global error boundary & Store initialization
 * 4. VirtualFS initialization and folder seeding
 * 5. SettingsManager & NotificationManager daemons
 * 6. FirebaseSync bridge initialization
 * 7. Core application registration (10 apps)
 * 8. Shell UI mounting & Neofetch system info display
 *
 * @module os/core/Kernel
 */

import store from './Store.js';
import windowManager from './WindowManager.js';
import appRegistry from './AppRegistry.js';
import virtualFS from './VirtualFS.js';
import settingsManager from './SettingsManager.js';
import notificationManager from './NotificationManager.js';
import firebaseSync from '../services/FirebaseSync.js';

import Desktop from '../ui/Desktop.js';
import TopMenuBar from '../ui/TopMenuBar.js';
import TaskbarDock from '../ui/TaskbarDock.js';
import StartLauncher from '../ui/StartLauncher.js';
import QuickSettings from '../ui/QuickSettings.js';
import OnboardingTour from '../ui/OnboardingTour.js';
import SetupWizard from '../ui/SetupWizard.js';

// Import all 10 core applications
import VaultHubApp from '../apps/VaultHubApp.js';
import BrowserApp from '../apps/BrowserApp.js';
import GamesApp from '../apps/GamesApp.js';
import FileExplorerApp from '../apps/FileExplorerApp.js';
import TerminalApp from '../apps/TerminalApp.js';
import SettingsApp from '../apps/SettingsApp.js';
import NotesApp from '../apps/NotesApp.js';
import CalculatorApp from '../apps/CalculatorApp.js';
import SystemMonitorApp from '../apps/SystemMonitorApp.js';
import AppStoreApp from '../apps/AppStoreApp.js';
import AboutApp from '../apps/AboutApp.js';
import LoungeApp from '../apps/LoungeApp.js';
import BellApp from '../apps/BellApp.js';

let _shellBootComplete = false;
let _setupCheckRunning = false;
const _setupCheckedUsers = new Set();

export async function boot() {
  if (boot._booted) {
    console.warn('[Kernel] Already booted — ignoring duplicate boot() call.');
    return;
  }
  boot._booted = true;

  const terminalOut = document.getElementById('boot-terminal-output');
  const bootScreen = document.getElementById('retro-boot-screen');
  const actionText = document.getElementById('boot-action-text');

  const printBootLine = (text, color = '#c4b5fd') => {
    if (!terminalOut) return;
    const line = document.createElement('div');
    line.style.color = color;
    line.innerHTML = text;
    terminalOut.appendChild(line);
    terminalOut.scrollTop = terminalOut.scrollHeight;
  };

  // --- FULLSCREEN SUPPORT ---
  const requestFullscreen = () => {
    const el = document.documentElement;

    if (document.fullscreenElement || !el.requestFullscreen) {
      return Promise.resolve(false);
    }

    // Call immediately from the user gesture so browsers allow fullscreen.
    return el.requestFullscreen()
      .then(() => {
        console.log('[Kernel] Entered fullscreen mode.');
        return true;
      })
      .catch((err) => {
        console.warn('[Kernel] Fullscreen request was blocked:', err);
        return false;
      });
  };

  // --- STEP 1: AWAIT USER INTERACTION TO START ---


  
  
  printBootLine(`
    <span style="color:#8b5cf6;">██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗     ██████╗ ███████╗</span>
    <span style="color:#8b5cf6;">██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝    ██╔═══██╗██╔════╝</span>
    <span style="color:#a855f7;">██║   ██║███████║██║   ██║██║     ██║       ██║   ██║███████╗</span>
    <span style="color:#a855f7;">╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║       ██║   ██║╚════██║</span>
    <span style="color:#c084fc;"> ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║       ╚██████╔╝███████║</span>
    <span style="color:#c084fc;">  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝        ╚═════╝ ╚══════╝</span>
  `)
  printBootLine('CPU: Virtual ES6 Reactive Processor @ 3.40GHz');
  printBootLine('Memory Check: 131072K System RAM Verified OK.\n', '#10b981');
  printBootLine('Press <span style="color:#fff; background:#4c1d95; padding:0 4px;">ENTER</span> or click to initialize kernel sequence...', '#c4b5fd');
  
  await new Promise((resolve) => {
    let firstClickHandled = false;

    const cleanup = () => {
      window.removeEventListener('keydown', handleKey);
      if (bootScreen) bootScreen.removeEventListener('click', handleClick);
      if (actionText) actionText.textContent = 'BOOTING...';
    };

    const handleKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        // ENTER remains a one-step boot shortcut and requests fullscreen
        // during the same user gesture.
        requestFullscreen();
        resolve();
      }
    };

    const handleClick = () => {
      if (!firstClickHandled) {
        firstClickHandled = true;
        // First click is reserved for the browser's fullscreen permission.
        requestFullscreen();
        if (actionText) actionText.textContent = 'CLICK AGAIN TO BOOT';
        printBootLine('Fullscreen requested. Click again to initialize the kernel...', '#c4b5fd');
        return;
      }

      // Second click starts the actual boot sequence.
      cleanup();
      resolve();
    };

    window.addEventListener('keydown', handleKey);
    if (bootScreen) bootScreen.addEventListener('click', handleClick);
  });

  if (terminalOut) terminalOut.innerHTML = ''; // Clear initial prompt
  const t0 = performance.now();

  // --- STEP 2: RANDOM ASS DIAGNOSTIC SPAM (IMPRESSIVE TEXT FLOOD) ---
  const diagnosticSpam = [
    "[    ] Parsing ACPI tables at 0x000ffef0...",
    "[<span style=\"color:#10b981\">  OK  </span>] CPU0: APIC 0 reg active, thermal vector loaded.",
    "[    ] Initializing cgroup subsys cpuset / cpu / memory / net_cls",
    "[<span style=\"color:#10b981\">  OK  </span>] Switched to clocksource tsc",
    "[    ] PCI: Using configuration type 1 for access mapping",
    "[<span style=\"color:#10b981\">  OK  </span>] Netfilter tables v0..47 framework initialized.",
    "[    ] Mounting securityfs on /sys/kernel/security...",
    "[<span style=\"color:#10b981\">  OK  </span>] Sequencer device initialized [MIDI core v5.3]",
    "[    ] Loading Secure Enclave cryptographic modules..."
  ];

  for (const diag of diagnosticSpam) {
    printBootLine(diag);
    await new Promise(r => setTimeout(r, 35)); // Fast scrolling effect
  }

  printBootLine('\n[    ] Starting Core Subsystems...', '#8b5cf6');

  /* ---- 0. Global error boundary ---- */
  _installErrorBoundary();
  printBootLine('[<span style=\"color:#10b981\">  OK  </span>] Installed Global Error Boundary.');

  /* ---- 1. Initialize Store defaults ---- */
  _initStoreDefaults();
  printBootLine('[<span style=\"color:#10b981\">  OK  </span>] Initialized Store State.');

  /* ---- 2. Initialize Virtual Filesystem ---- */
  try {
    await virtualFS.init();
    printBootLine('[<span style=\"color:#10b981\">  OK  </span>] Mounted Virtual Filesystem (VFS).');
  } catch (err) {
    printBootLine('[<span style=\"color:#ef4444\">FAILED</span>] VirtualFS init error: ' + err.message, '#ef4444');
  }

  /* ---- 3. Initialize Settings ---- */
  try {
    await settingsManager.init();
    _installAutoFullscreenOnClick();
    printBootLine('[<span style=\"color:#10b981\">  OK  </span>] Loaded Settings & Theme Preferences.');
  } catch (err) {
    printBootLine('[<span style=\"color:#ef4444\">FAILED</span>] SettingsManager init error: ' + err.message, '#ef4444');
  }

  /* ---- 4. Initialize Notifications & QuickSettings ---- */
  notificationManager.init();
  QuickSettings.init();
  printBootLine('[<span style=\"color:#10b981\">  OK  </span>] Initialized Notification & QuickSettings Daemons.');

  /* ---- 5. Initialize Firebase bridge ---- */
  firebaseSync.init();
  printBootLine('[<span style=\"color:#10b981">  OK  </span>] Established Firebase Sync Bridge.');

  /* ---- 6. Register all built-in apps ---- */
  _registerCoreApps();
  printBootLine('[<span style=\"color:#10b981">  OK  </span>] Registered core WebOS applications.');

  /* ---- 7. Mount Shell UI components ---- */
  _mountShell();
  printBootLine('[<span style=\"color:#10b981">  OK  </span>] Mounted Desktop, Dock, and Window Manager.');

  /* ---- 8. Boot complete & Neofetch Display ---- */
  const bootMs = Math.round(performance.now() - t0);
  printBootLine(`\n[<span style=\"color:#10b981\"> SUCCESS </span>] WebOS Boot complete in ${bootMs}ms.\n`, '#10b981');

  const user = store.getState('session.displayName') || 'Guest';
  const windows = store.getState('windows');
  const windowCount = windows ? (windows instanceof Map ? windows.size : Object.keys(windows).length) : 0;
  const heap = performance?.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'Browser Sandboxed';

  // Hold the neofetch summary for 1.5 seconds, then transition to desktop
  setTimeout(() => {
    if (bootScreen) {
      bootScreen.style.opacity = '0';
      setTimeout(() => bootScreen.remove(), 400);
    }

    notificationManager.notify({
      title: 'The Web Vault WebOS 2.0',
      message: 'System loaded successfully. Press Super / Vault icon for apps.',
      type: 'success',
      duration: 3500
    });

    store.emit('kernel:ready', { bootMs });
    _shellBootComplete = true;

    // Show What's New once per release. Do not mark it seen until its UI
    // has actually mounted; launch() returning an ID only means a window was created.
    const whatsNewKey = 'vaultos_whats_new_seen_2_3';
    try {
      if (localStorage.getItem(whatsNewKey) !== 'true') {
        const openWhatsNew = (attempt = 0) => {
          if (localStorage.getItem(whatsNewKey) === 'true') return;

          try {
            const instanceId = appRegistry.launch('about');
            if (instanceId) {
              // AppRegistry mounts on a microtask after WindowManager creates the host.
              // Wait for the actual changelog UI before saving the dismissal state.
              window.setTimeout(() => {
                const content = document.querySelector(
                  '[data-window-content="' + instanceId + '"]'
                );
                if (content && content.querySelector('#whats-new-entry-list')) {
                  localStorage.setItem(whatsNewKey, 'true');
                  return;
                }

                if (attempt < 8) {
                  window.setTimeout(() => openWhatsNew(attempt + 1), 800);
                } else {
                  console.warn('[Kernel] What\\x27s New window did not mount; will retry next startup.');
                }
              }, 350);
              return;
            }
          } catch (launchError) {
            console.warn('[Kernel] Could not open What\\x27s New:', launchError);
          }

          if (attempt < 8) {
            window.setTimeout(() => openWhatsNew(attempt + 1), 800);
          }
        };

        // Let the desktop and any first-run setup UI settle before opening it.
        window.setTimeout(() => openWhatsNew(), 2800);
      }
    } catch (err) {
      console.warn('[Kernel] Could not check What\\x27s New startup state:', err);
    }

    // Handle both persistent sign-in during startup and users who sign in later.
    window.setTimeout(() => _checkFirstRunSetup(), 450);
  }, 1500);
}

boot._booted = false;

window.addEventListener('authProfileReady', (event) => {
  if (_shellBootComplete && event.detail?.user) _checkFirstRunSetup(event.detail.user);
});

async function _checkFirstRunSetup(eventUser = null) {
  if (!_shellBootComplete || _setupCheckRunning) return;
  const user = eventUser || window.AuthCore?.currentUser || null;
  if (!user?.uid || _setupCheckedUsers.has(user.uid)) {
    if (!user) OnboardingTour.init();
    return;
  }
  _setupCheckRunning = true;
  try {
    const cloudPrefs = await firebaseSync.waitForCloudPreferences();
    if (cloudPrefs.setupCompleted === true) {
      _setupCheckedUsers.add(user.uid);
      OnboardingTour.init();
      return;
    }
    _setupCheckedUsers.add(user.uid);
    window.addEventListener('webos:setup-complete', () => OnboardingTour.init(), { once: true });
    SetupWizard.show(user, cloudPrefs);
  } catch (err) {
    console.warn('[Kernel] First-run setup could not start:', err);
    OnboardingTour.init();
  } finally {
    _setupCheckRunning = false;
  }
}


/**
 * Enter fullscreen on the first screen click when enabled. Fullscreen APIs
 * require a user gesture, so this must be triggered directly from the click.
 */
function _installAutoFullscreenOnClick() {
  if (window.__vaultAutoFullscreenHandlerInstalled) return;
  window.__vaultAutoFullscreenHandlerInstalled = true;

  document.addEventListener('click', () => {
    if (!settingsManager.get('autoFullscreenOnClick')) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;

    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (request) {
      try {
        const result = request.call(root);
        if (result && typeof result.catch === 'function') {
          result.catch((err) => console.debug('[WebOS] Auto-fullscreen was not available:', err));
        }
      } catch (err) {
        console.debug('[WebOS] Auto-fullscreen was not available:', err);
      }
    }
  }, true);
}

function _installErrorBoundary() {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Kernel] Uncaught error:', { message, source, lineno, colno, error });
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Kernel] Unhandled rejection:', event.reason);
  });
}

function _initStoreDefaults() {
  if (!(store.getState('windows') instanceof Map)) {
    store.setState('windows', new Map());
  }
}

function _registerCoreApps() {
  const apps = [
    VaultHubApp,
    BrowserApp,
    GamesApp,
    FileExplorerApp,
    TerminalApp,
    SettingsApp,
    NotesApp,
    CalculatorApp,
    SystemMonitorApp,
    AppStoreApp,
    AboutApp,
    LoungeApp,
    BellApp
  ];

  for (const manifest of apps) {
    try {
      appRegistry.register(manifest);
    } catch (err) {
      console.error(`[Kernel] Failed to register app ${manifest?.id}:`, err);
    }
  }

  console.log(`[Kernel] Registered ${apps.length} core WebOS applications.`);
}

function _mountShell() {
  let windowsLayer = document.getElementById('vault-windows-layer');
  if (!windowsLayer) {
    windowsLayer = document.createElement('div');
    windowsLayer.id = 'vault-windows-layer';
    windowsLayer.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:100; overflow:hidden;';
    document.body.appendChild(windowsLayer);
  }

  const style = document.createElement('style');
  style.textContent = `
    #vault-windows-layer > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);

  let desktopMount = document.getElementById('vault-desktop');
  if (!desktopMount) {
    desktopMount = document.createElement('div');
    desktopMount.id = 'vault-desktop';
    document.body.appendChild(desktopMount);
  }
  Desktop.init(desktopMount);

  TopMenuBar.init();
  TaskbarDock.init();
  StartLauncher.init();

  console.log('[Kernel] Shell UI mounted successfully.');
}

export { store, windowManager, appRegistry, virtualFS, settingsManager, notificationManager };