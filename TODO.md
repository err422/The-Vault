# The Web Vault — To-Do

A simple, editable task list for The Web Vault / WebOS. Add new ideas under **Backlog**, and check items off with `[x]` as they’re finished.

## VaultNet roadmap

### 1. Upgrade user profiles
- [x] Add selectable avatars and a short status.
- [x] Show profile details in the Lounge and share them through presence when cloud rules allow.
- [x] Open profiles in the main chat pane, with a close button to return to chat.
- [ ] Polish the profile card layout and interactions.
- [ ] Verify custom display names, avatars, statuses, and current activity work across two separate accounts.
- [ ] Confirm cloud presence rules are configured safely in the live Firebase database.

### 2. Improve the chat experience
- [ ] Add unread-message indicators.
- [ ] Group consecutive messages from the same person.
- [ ] Add a jump-to-latest button.
- [x] Keep the existing subtle notification chime for new public messages.

### 3. Add friends
- [ ] Let users send and accept friend requests.
- [ ] Add a friends list with online/offline status.
- [ ] Explore inviting friends to play games or open websites together.

### 4. Add activity interactions
- [ ] Make a person's current activity clickable where supported.
- [ ] Allow clicking an activity to open the same game or website on the user's own WebOS desktop, where supported.
- [ ] Handle unsupported or unavailable links gracefully and safely.

## Bugs / things to test

- [ ] Write down bugs here, including the steps to reproduce them.
- [ ] Test the WebOS at the deployed site and on localhost after major changes.
- [ ] Test VaultNet with two separate accounts and confirm cloud presence and profile updates sync correctly.
- [ ] Confirm profile changes don't break existing chat or presence.

## Backlog

- [ ] Add ideas here.

## Notes

- **Bug / idea:**
- **What happened / what should happen:**
- **Steps to reproduce (if applicable):**
- **Priority:** Low / Medium / High

---

## Completed

- [x] Create a central to-do file in the repository.


---

# The Web Vault — WebOS: Master Architecture & Antigravity Execution Plan

This planning blueprint translates requirements for **The Web Vault** (`err422/The-Vault` / `thewebvault.org`) into a technical specification, directory structure, state architecture, and phased implementation plan for Google Notebook and Antigravity.

> **Status:** Planning/reference document. This is not a claim that every listed component has been implemented. Inspect the live repository and mark work complete only after verification.
>
> **Non-negotiable preservation rule:** Audit the existing code first. Preserve current Web Vault features, visual identity, Firebase initialization/security rules, proxy/VaultNet behavior, and deployment setup. Make incremental changes; do not rewrite unrelated areas or introduce regressions. Keep the existing purple/black identity. Inspiration can come from macOS/Linux/Windows interactions, but do not copy a reference site's appearance.

## 1. Phase 0 — Repository audit and preservation protocol

Before writing WebOS code, inspect the repository tree, `index.html`, secondary HTML pages, CSS, scripts, script loading modes (ES modules vs globals), deployment configuration, Firebase setup, and current WebOS/proxy-browser implementation.

| Audit area | Inspect | Preservation and integration strategy |
|---|---|---|
| Stack and entry points | `index.html`, secondary pages, script tags, deployment config | Keep `index.html` as the primary entry point unless the existing architecture requires a safe alternative. Use native ES modules where compatible; avoid unnecessary build tooling. |
| Firebase Auth and database | Existing config, initialization, auth listeners, database paths and rules | Reuse the existing Firebase instance through a shared bridge. Never duplicate `initializeApp()`, expose secrets, or change security rules as a shortcut. |
| Legacy Vault features | Games catalog, website shortcuts, proxy/iframe loader, chat, accounts, settings, custom entries and scripts | Keep existing capabilities working. Wrap or mount them in Vault Hub and standalone app windows where feasible; don't delete or break legacy features. |
| Visual identity | Existing CSS variables, fonts, logo assets, purple/black palette | Preserve the current brand and evolve it into semantic `--vault-*` tokens. |
| Current WebOS work | Existing `os/` and browser/proxy files, recent changes, branches | Extend the current implementation rather than blindly recreating it. Check history and current behavior before replacing anything. |

## 2. Target modular architecture

The following is a target architecture, not a mandate to create duplicate files if equivalents already exist. Keep it compatible with the repository's existing lightweight static/vanilla setup or existing bundler.

```text
/
├── index.html
├── os/
│   ├── core/
│   │   ├── Kernel.js              # Boot sequence and global error boundary
│   │   ├── Store.js               # Reactive state: windows, theme, session
│   │   ├── WindowManager.js       # Lifecycle, z-order, drag/resize/snap
│   │   ├── AppRegistry.js         # Manifests, app launch and instances
│   │   ├── VirtualFS.js           # IndexedDB/localStorage + optional sync
│   │   ├── SettingsManager.js     # Theme, wallpaper, dock and motion settings
│   │   └── NotificationManager.js # Toast queue and notification center
│   ├── services/
│   │   └── FirebaseSync.js        # Bridge to existing Auth/database
│   ├── ui/
│   │   ├── Desktop.js             # Wallpaper, icons, selection and menus
│   │   ├── TopMenuBar.js          # Active-app menus and system status
│   │   ├── TaskbarDock.js         # Running indicators, dock and tray
│   │   ├── StartLauncher.js       # Search, pinned/all apps, session controls
│   │   ├── WindowFrame.js         # Reusable titlebar and resize handles
│   │   ├── SnapOverlay.js         # Snap-zone preview
│   │   ├── QuickSettings.js       # Theme, motion, fullscreen and status
│   │   └── ContextMenu.js         # Reusable viewport-clamped context menu
│   ├── apps/
│   │   ├── VaultHubApp.js         # Existing Web Vault games/tools/accounts
│   │   ├── BrowserApp.js          # Tabs, history, proxy and frame handling
│   │   ├── FileExplorerApp.js     # Virtual filesystem UI
│   │   ├── TerminalApp.js         # Safe command parser and VFS access
│   │   ├── SettingsApp.js         # System customization
│   │   ├── NotesApp.js            # Text/Markdown notes
│   │   ├── CalculatorApp.js       # Safe arithmetic evaluator
│   │   ├── SystemMonitorApp.js    # Real browser telemetry
│   │   ├── AppStoreApp.js         # App catalog and pin/install manager
│   │   └── AboutApp.js            # Version, credits and system information
│   └── styles/
│       ├── tokens.css             # Theme tokens and z-index layers
│       ├── desktop.css            # Wallpaper, icons and selection
│       ├── window.css             # Frames, glass, resize and snap styles
│       ├── shell.css              # Menubar, dock, launcher and notifications
│       └── apps.css               # Scoped application styles
```

## 3. Visual system — “Vault Glass”

Preserve the purple-and-black aesthetic with semantic CSS custom properties in `os/styles/tokens.css`.

```css
:root, [data-theme="dark"] {
  --vault-bg-deep: #07050c;
  --vault-surface-base: rgba(15, 11, 26, 0.78);
  --vault-surface-elevated: rgba(26, 18, 44, 0.85);
  --vault-surface-active: rgba(42, 28, 72, 0.92);
  --vault-glass-blur: blur(20px) saturate(160%);
  --vault-accent-primary: #8b5cf6;
  --vault-accent-secondary: #a855f7;
  --vault-accent-glow: rgba(139, 92, 246, 0.35);
  --vault-border-subtle: rgba(168, 85, 247, 0.18);
  --vault-border-focused: rgba(139, 92, 246, 0.55);
  --vault-text-primary: #f5f3ff;
  --vault-text-secondary: #c4b5fd;
  --vault-text-muted: #7c6f9f;
  --vault-radius-window: 12px;
  --vault-radius-panel: 14px;
  --vault-radius-control: 8px;
  --vault-shadow-window: 0 20px 50px rgba(0,0,0,.7), 0 0 0 1px var(--vault-border-subtle);
  --vault-shadow-focused: 0 24px 60px rgba(0,0,0,.85), 0 0 20px var(--vault-accent-glow), 0 0 0 1px var(--vault-border-focused);
  --vault-transition-fast: 150ms cubic-bezier(.2,.8,.2,1);
  --vault-transition-smooth: 260ms cubic-bezier(.16,1,.3,1);
  --z-wallpaper: 0;
  --z-desktop-icons: 10;
  --z-selection-marquee: 20;
  --z-snap-preview: 90;
  --z-windows-base: 100; /* WindowManager allocates 100–899 */
  --z-top-menubar: 900;
  --z-taskbar-dock: 910;
  --z-launcher-popover: 950;
  --z-context-menu: 980;
  --z-notifications: 990;
}
[data-theme="light"] {
  /* Use lavender/alabaster surfaces, deep indigo text and rich purple accents. */
  --vault-surface-base: rgba(248, 245, 255, 0.82);
  --vault-text-primary: #1e1b4b;
  --vault-accent-primary: #7c3aed;
}
[data-reduced-motion="true"] {
  --vault-transition-fast: 0ms;
  --vault-transition-smooth: 0ms;
}
@media (prefers-reduced-motion: reduce) {
  :root { --vault-transition-fast: 0ms; --vault-transition-smooth: 0ms; }
}
```

Reduced-motion mode must also disable scale transforms and unnecessary animation, not just change transition durations.

## 4. Core engine requirements

### 4.1 Window manager

Use deterministic window state and pointer-event calculations instead of fragile CSS-only behavior. Suggested state shape:

```js
{
  instanceId: "win_explorer_1",
  appId: "file-explorer",
  title: "File Explorer",
  icon: "folder",
  bounds: { x: 120, y: 80, width: 760, height: 520 },
  restoreBounds: { x: 120, y: 80, width: 760, height: 520 },
  minSize: { width: 320, height: 220 },
  state: "normal", // normal | minimized | maximized | snapped
  snapZone: null, // left/right/top-left/top-right/bottom-left/bottom-right
  zIndex: 105,
  isFocused: true
}
```

Requirements:
- **Iframe pointer shielding:** During window drag/resize, apply `body.is-dragging-window` and disable pointer events on OS iframes; remove it on pointerup/pointercancel.
- **Pointer capture and frame batching:** Use pointer capture on titlebars/handles. Batch movement in `requestAnimationFrame`; use `translate3d(x, y, 0)` and explicit dimensions.
- **Eight-way resizing:** 6px edge hit zones and 12px corner hit zones. Enforce minimum size while keeping the opposite edge anchored.
- **Snap behavior:** Within 12px of top edge, preview maximize; left/right edges preview half-screen; corners preview quarter-screen. Dragging a maximized/snapped window down restores it proportionally under the cursor.
- **Viewport clamping:** Observe work-area resize and keep at least 80px of each titlebar reachable. Under 768px, maximize active windows inside the safe area between top bar and dock.
- Support focus/z-order, minimize, maximize, restore, double-click titlebar maximize and close. Keep touch interactions usable.

### 4.2 Virtual filesystem

Persist a hierarchical virtual filesystem asynchronously using IndexedDB, with namespaced localStorage fallback. Firebase synchronization is optional and must respect existing rules.

Seed these directories on first boot:
- `/Desktop` — shortcuts and user-created desktop items
- `/Documents` — documents and notes
- `/Downloads`
- `/Pictures/Wallpapers`
- `/Vault` — shortcuts to existing Web Vault games and tools

API: `list(path)`, `stat(path)`, `mkdir(path)`, `writeFile(path, content, mime)`, `readFile(path)`, `rename(oldPath, newPath)`, `move(srcPath, destDir)`, and `remove(path)`. Emit `vfs:change` through the shared store so Terminal, Notes, Desktop and File Explorer stay in sync.

### 4.3 App contract

Each app registers a manifest and lifecycle controller. Example:

```js
export const AppManifest = {
  id: "notes",
  name: "Vault Notes",
  icon: "file-text",
  category: "Productivity",
  version: "1.0.0",
  singleton: false,
  defaultSize: { width: 680, height: 480 },
  minSize: { width: 360, height: 280 },
  menus: [
    { label: "File", items: [
      { label: "New Note", action: "note:new" },
      { label: "Save", action: "note:save" }
    ]}
  ],
  mount(containerEl, context) { /* Render UI and return cleanup/hooks. */ }
};
```

Adapt the contract to existing code if there is already an app registry or equivalent.

## 5. Application implementation matrix

- **Vault Hub:** Natively wraps existing games, tools and account features. Offer in-window browsing and standalone launch where practical.
- **Vault Browser:** Multiple tabs, per-tab history, address bar, bookmarks and quick-launch home. Integrate the existing proxy when available. When a site blocks framing (CSP/X-Frame-Options), show an honest explanation and options to use the Vault proxy or open externally; never leave users with an unexplained blank iframe.
- **File Explorer:** Sidebar for Desktop/Documents/Vault, breadcrumbs, search, grid/list modes, context actions (new folder/text file, rename, delete, properties), double-click open, and an explicit computer-file import input.
- **Terminal:** Command history, path completion, and `help`, `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `rm`, `mv`, `echo`, `open <appId>`, `whoami`, `neofetch`, `clear`. Operate only on the VFS; don't imply access to the host OS.
- **Settings:** Dark/light themes; curated purple/cyberpunk wallpapers and custom image URL; violet/magenta/indigo/cyan accents; icon size, snap-to-grid, dock auto-hide, reduced motion, snap toggle, storage usage, account status and factory reset.
- **Notes:** Searchable note list, live editor, word/character count and debounced autosave (~300ms). Store `.txt`/`.md` files under `/Documents/Notes`.
- **Calculator:** Standard/scientific operations, parentheses, keyboard support, history and copy. Use a safe tokenizer/parser (e.g. shunting-yard); **never use `eval()`**.
- **System Monitor:** Only report authentic browser telemetry: windows/process list, session uptime, DOM node count, `performance.memory` where supported, `navigator.storage.estimate()`, and online/offline state. Allow closing a hung app window.
- **App Store:** Catalog installed apps and Web Vault utilities/games; pin/unpin, launch, and inspect version metadata.
- **About WebOS:** Logo, OS version, active profile, rendering engine, storage telemetry, credits and shortcuts to Settings/System Monitor.

## 6. Firebase auth and persistence

- Subscribe to the project's existing Firebase auth state; show profile/status in the menu bar and launcher.
- Guests: store settings/pins/window session locally (e.g. `vault_os_settings_v1`) and VFS data in IndexedDB (e.g. `vault_os_vfs_v1`).
- Signed-in users: optionally sync lightweight preferences (theme, wallpaper, accent, pins, notes metadata) to a user-scoped path only when existing database rules permit. Keep local cache for responsiveness/offline use.
- Wrap network/database operations in error handling. Fall back to local persistence on offline/rule errors and notify only when useful.
- Do not duplicate Firebase initialization, alter security rules as part of this feature, or put private credentials in client code.

## 7. Phased execution plan

### Phase 1 — Inspection and core desktop shell
- [ ] Audit repository tree, entry points, styles, Firebase architecture, existing `os/` files and current proxy/browser work.
- [ ] Record existing files/features that must be preserved before edits.
- [ ] Establish theme tokens in `os/styles/tokens.css`.
- [ ] Implement or adapt Store, WindowManager and WindowFrame.
- [ ] Verify drag, eight-way resize, focus/z-index, minimize/maximize/restore, titlebar double-click and edge/corner snapping.
- [ ] Implement or adapt Desktop, TopMenuBar, TaskbarDock, StartLauncher and ContextMenu.

### Phase 2 — Virtual filesystem and system apps
- [ ] Implement VFS and SettingsManager with local persistence and default directories.
- [ ] Implement/adapt AppRegistry and wire desktop, dock and launcher.
- [ ] Implement Settings, File Explorer, Notes, Calculator, Terminal, System Monitor, App Store and About.
- [ ] Verify cross-app reactivity (e.g. creating a file in Terminal or Notes updates File Explorer/Desktop immediately).

### Phase 3 — Legacy Vault and Firebase integration
- [ ] Integrate VaultHubApp and BrowserApp with existing games, tools, account features and proxy.
- [ ] Connect to existing Firebase Auth/database without duplicate initialization or rule changes.
- [ ] Verify profile/login state and preference persistence, with guest/offline fallback.

### Phase 4 — Notifications, quick settings and mobile polish
- [ ] Implement toast notifications and Notification Center.
- [ ] Add Quick Settings for theme, wallpaper, animation/reduced motion and fullscreen.
- [ ] Add desktop marquee selection and snap-to-grid icon dragging.
- [ ] Tune touch support, compact dock and auto-maximized windows below 768px.

### Phase 5 — Validation and QA
- [ ] Test dragging across iframes, minimum resize limits, off-screen windows and viewport resizing.
- [ ] Audit unsafe DOM insertion: never inject unsanitized user/file names with `innerHTML`; use `textContent` or safe DOM creation.
- [ ] Confirm no secrets are exposed and no Firebase security rules were changed.
- [ ] Run available lint/build checks and verify no console errors during boot and app launches.
- [ ] Test the deployed site and localhost; verify existing Vault, proxy and VaultNet behavior remains intact.

## 8. Antigravity kickoff prompt

Paste the architecture plan into Antigravity and use this kickoff instruction:

> Review the codebase in this repository and the Master Architecture Plan above. Start with Phase 1: inspect the existing HTML/CSS/JS and Firebase architecture, summarize the existing files and behaviors you must preserve, and then implement the core WebOS shell (Store, WindowManager, Desktop, TopMenuBar, TaskbarDock, StartLauncher, WindowFrame, and tokens.css) while keeping all existing Web Vault features, Firebase initialization/security rules, proxy behavior, VaultNet, and deployment working. Do not revert unrelated changes or rebuild already-working components without a reason. First report the audit and proposed file-level changes; then implement Phase 1 incrementally and test it before proceeding. Do not start later phases until Phase 1 is verified.

**Source note:** The kickoff text supplied in chat ended mid-word after “while keeping all existing Web Vau…”. The instruction above completes that sentence conservatively from the preservation requirements in the supplied plan; it is not represented as a verbatim recovery of the missing text.
