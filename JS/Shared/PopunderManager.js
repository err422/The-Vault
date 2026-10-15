// Pop-under gate for The Web Vault.
// Keep the provider script statically loaded so its normal initialization works.
// The wrapper is installed first, so providers that capture window.open at load
// time still see a function that checks the current viewer state.
(function () {
    if (window.vaultPopunderManagerInitialized) return;
    window.vaultPopunderManagerInitialized = true;

    let viewerOpen = !!document.getElementById('game-iframe-overlay');
    const originalWindowOpen = window.open;

    window.open = function () {
        if (viewerOpen || document.getElementById('game-iframe-overlay')) {
            return null;
        }
        return originalWindowOpen.apply(window, arguments);
    };

    window.setVaultPopunderEnabled = function (enabled) {
        viewerOpen = !enabled || !!document.getElementById('game-iframe-overlay');
    };

    // Covers opening/closing through the shared SPA viewer, including fallback paths.
    const observer = new MutationObserver(function () {
        viewerOpen = !!document.getElementById('game-iframe-overlay');
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
