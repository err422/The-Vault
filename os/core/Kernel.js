/**
 * @fileoverview Boot Kernel for The Web Vault WebOS.
 *
 * Orchestrates the full startup sequence:
 * 1. Global error boundary
 * 2. Store baseline initialization
 * 3. VirtualFS initialization and folder seeding
 * 4. SettingsManager initialization & theme/wallpaper application
 * 5. NotificationManager initialization
 * 6. FirebaseSync initialization
 * 7. Built-in application registration (10 core apps)
 * 8. Shell UI mounting (Desktop, TopMenuBar, TaskbarDock, StartLauncher, QuickSettings)
 * 9. Kernel ready event emission
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

  const t0 = performance.now();
  console.log('%c[Kernel] Booting The Web Vault OS 2.0…', 'color:#8b5cf6;font-weight:bold;font-size:14px;');

  /* ---- 0. Global error boundary ---- */
  _installErrorBoundary();

  /* ---- 1. Initialize Store defaults ---- */
  _initStoreDefaults();

  /* ---- 2. Initialize Virtual Filesystem ---- */
  try {
    await virtualFS.init();
    console.log('[Kernel] VirtualFS ready.');
  } catch (err) {
    console.error('[Kernel] VirtualFS init error:', err);
  }

  /* ---- 3. Initialize Settings ---- */
  try {
    await settingsManager.init();
    console.log('[Kernel] SettingsManager ready.');
  } catch (err) {
    console.error('[Kernel] SettingsManager init error:', err);
  }

  /* ---- 4. Initialize Notifications & QuickSettings ---- */
  notificationManager.init();
  QuickSettings.init();

  /* ---- 5. Initialize Firebase bridge ---- */
  firebaseSync.init();

  /* ---- 6. Register all built-in apps ---- */
  _registerCoreApps();

  /* ---- 7. Mount Shell UI components ---- */
  _mountShell();

  /* ---- 8. Boot complete ---- */
  const bootMs = Math.round(performance.now() - t0);
  console.log(
    `%c[Kernel] WebOS Boot complete in ${bootMs}ms.`,
    'color:#10b981;font-weight:bold;font-size:13px;'
  );

  notificationManager.notify({
    title: 'The Web Vault WebOS 2.0',
    message: 'System loaded successfully. Press Super / Vault icon for apps.',
    type: 'success',
    duration: 3500
  });

  store.emit('kernel:ready', { bootMs });
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
  // Ensure windows layer container exists
  let windowsLayer = document.getElementById('vault-windows-layer');
  if (!windowsLayer) {
    windowsLayer = document.createElement('div');
    windowsLayer.id = 'vault-windows-layer';
    windowsLayer.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:100; overflow:hidden;';
    document.body.appendChild(windowsLayer);
  }

  // Ensure windows within layer can receive pointer events
  const style = document.createElement('style');
  style.textContent = `
    #vault-windows-layer > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);

  // Mount desktop
  let desktopMount = document.getElementById('vault-desktop');
  if (!desktopMount) {
    desktopMount = document.createElement('div');
    desktopMount.id = 'vault-desktop';
    document.body.appendChild(desktopMount);
  }
  Desktop.init(desktopMount);

  // Mount top bar, dock, start launcher
  TopMenuBar.init();
  TaskbarDock.init();
  StartLauncher.init();

  console.log('[Kernel] Shell UI mounted successfully.');
}

export { store, windowManager, appRegistry, virtualFS, settingsManager, notificationManager };
