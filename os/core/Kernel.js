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
    const handleKey = (e) => {
      if (e.key === 'Enter') {
        cleanup();
        resolve();
      }
    };
    const handleClick = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.removeEventListener('keydown', handleKey);
      if (bootScreen) bootScreen.removeEventListener('click', handleClick);
      if (actionText) actionText.textContent = 'BOOTING...';
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
  }, 1500);
}

boot._booted = false;

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
    AboutApp
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