// Pop-under ad lifecycle manager for The Web Vault.
// The provider does not expose a documented pause/resume API, so this uses
// best-effort gating while the shared game/website viewer is open.
(function () {
    if (window.vaultPopunderManagerInitialized) return;
    window.vaultPopunderManagerInitialized = true;

    const SCRIPT_ID = 'vault-popunder-script';
    const SCRIPT_URL = 'https://abscloud.org/1/3060b7572b8b54c300c53f74df0b0937';
    let viewerOpen = !!document.getElementById('game-iframe-overlay');
    let originalWindowOpen = null;
    let scriptLoaded = false;

    function blockPopunderWindows() {
        if (originalWindowOpen) return;
        originalWindowOpen = window.open;
        window.open = function () {
            if (viewerOpen) {
                return null;
            }
            return originalWindowOpen.apply(window, arguments);
        };
    }

    function restoreWindowOpen() {
        if (!originalWindowOpen) return;
        window.open = originalWindowOpen;
        originalWindowOpen = null;
    }

    function loadScript() {
        if (viewerOpen || scriptLoaded || document.getElementById(SCRIPT_ID)) return;
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.src = SCRIPT_URL;
        // Mark it as loaded before appending so close/open cycles never inject
        // duplicate provider scripts and duplicate pop-under event handlers.
        scriptLoaded = true;
        script.onerror = function () {
            script.remove();
            scriptLoaded = false;
        };
        document.body.appendChild(script);
    }

    window.setVaultPopunderEnabled = function (enabled) {
        viewerOpen = !enabled || !!document.getElementById('game-iframe-overlay');
        if (viewerOpen) {
            blockPopunderWindows();
            const script = document.getElementById(SCRIPT_ID);
            if (script) script.remove();
            return;
        }

        restoreWindowOpen();
        loadScript();
    };

    // If this script runs after the viewer was already created, keep ads gated.
    if (viewerOpen) blockPopunderWindows();
    else loadScript();

    // Covers SPA-restored content and viewer removal outside the normal close path.
    const observer = new MutationObserver(function () {
        const isOpen = !!document.getElementById('game-iframe-overlay');
        if (isOpen !== viewerOpen) {
            window.setVaultPopunderEnabled(!isOpen);
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
