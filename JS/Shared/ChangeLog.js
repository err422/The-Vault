// ============================================================
//  THE VAULT — CHANGELOG POPUP
//  How to update:
//    1. Change CHANGELOG_VERSION to any new string (e.g. "1.1", "2025-03-24")
//    2. Edit the entries array below — add new items at the TOP
//    3. Save the file. Users who haven't seen this version will
//       automatically get the popup on their next visit.
// ============================================================

const CHANGELOG_VERSION = "2.8.5"; // <-- bump this every time you update

const CHANGELOG_ENTRIES = [
  // Most recent changes first
  {
    label: "NEW",       // badge text: "NEW", "FIX", "IMPROVED", "REMOVED"
    text: "Added a semi working chatbot"
  },
  {
    label: "NEW",
    text: "Added alt + ` as fullscreen shortcut"
  },
  {
    label: "IMPROVED",
    text: "Cleaned up debug menu"
  }
  // Add more entries above this line, example:
  // { label: "FIX",      text: "Fixed broken links on the Games page." },
  // { label: "IMPROVED", text: "Faster load times across all pages." },
];

(function () {
  const STORAGE_KEY = "vault_changelog_seen";

  // Only show if user hasn't seen this version yet
//   if (localStorage.getItem(STORAGE_KEY) === CHANGELOG_VERSION) return;

  // ---- Build styles ----
  const style = document.createElement("style");
  style.textContent = `
    #vault-changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: vco-fadein 0.25s ease;
    }
    @keyframes vco-fadein {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    #vault-changelog-modal {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 28px 32px 24px;
      width: min(480px, 90vw);
      box-shadow: 0 8px 40px rgba(0,0,0,0.7);
      animation: vco-slidein 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      font-family: inherit;
      color: #e8e8e8;
    }
    @keyframes vco-slidein {
      from { transform: translateY(18px); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }

    #vault-changelog-modal h2 {
      margin: 0 0 4px;
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.02em;
    }

    #vault-changelog-modal .vcl-version {
      font-size: 0.75rem;
      color: #666;
      margin-bottom: 18px;
      display: block;
    }

    #vault-changelog-modal ul {
      list-style: none;
      padding: 0;
      margin: 0 0 22px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #vault-changelog-modal ul li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.9rem;
      line-height: 1.5;
      color: #ccc;
    }

    #vault-changelog-modal .vcl-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .vcl-badge-NEW      { background: #1a3d2b; color: #4ade80; border: 1px solid #4ade8040; }
    .vcl-badge-FIX      { background: #3d1a1a; color: #f87171; border: 1px solid #f8717140; }
    .vcl-badge-IMPROVED { background: #1a2a3d; color: #60a5fa; border: 1px solid #60a5fa40; }
    .vcl-badge-REMOVED  { background: #2d2014; color: #fb923c; border: 1px solid #fb923c40; }
    .vcl-badge-DEFAULT  { background: #2a2a2a; color: #aaa;    border: 1px solid #444;      }

    #vault-changelog-close {
      display: block;
      width: 100%;
      padding: 10px;
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid #444;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      font-family: inherit;
    }
    #vault-changelog-close:hover {
      background: #333;
      border-color: #666;
    }
  `;
  document.head.appendChild(style);

  // ---- Build HTML ----
  const overlay = document.createElement("div");
  overlay.id = "vault-changelog-overlay";

  const badgeClass = (label) => {
    const known = ["NEW", "FIX", "IMPROVED", "REMOVED"];
    return known.includes(label.toUpperCase())
      ? `vcl-badge-${label.toUpperCase()}`
      : "vcl-badge-DEFAULT";
  };

  const items = CHANGELOG_ENTRIES.map(
    (e) => `
    <li>
      <span class="vcl-badge ${badgeClass(e.label)}">${e.label}</span>
      <span>${e.text}</span>
    </li>`
  ).join("");

  overlay.innerHTML = `
    <div id="vault-changelog-modal" role="dialog" aria-modal="true" aria-label="What's New">
      <h2>What's New</h2>
      <span class="vcl-version">Version ${CHANGELOG_VERSION}</span>
      <ul>${items}</ul>
      <button id="vault-changelog-close">Got it</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // ---- Close logic ----
  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
    overlay.style.animation = "vco-fadein 0.2s ease reverse forwards";
    setTimeout(() => overlay.remove(), 200);
  }

  document.getElementById("vault-changelog-close").addEventListener("click", dismiss);

  // Click outside the modal to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  // Escape key to close
  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      dismiss();
      document.removeEventListener("keydown", handler);
    }
  });
})();