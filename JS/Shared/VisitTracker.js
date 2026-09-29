// The Vault visit tracker
// Increments the global visit count once every time index.html loads.
(function () {
    'use strict';

    function recordVisit() {
        if (typeof database === 'undefined' || !database) {
            console.warn('[VisitTracker] Firebase database is not available.');
            return;
        }

        const visitsRef = database.ref('siteStats/visits');

        // transaction() makes the increment atomic, so simultaneous visitors
        // cannot overwrite each other's counts.
        visitsRef.transaction(function (currentVisits) {
            const count = Number(currentVisits);
            return Number.isFinite(count) ? count + 1 : 1;
        }).then(function (result) {
            if (result.committed) {
                window.vaultVisitCount = result.snapshot.val();
                console.log('[VisitTracker] Visit recorded. Total:', window.vaultVisitCount);
            }
        }).catch(function (error) {
            console.warn('[VisitTracker] Could not record visit:', error.message);
        });
    }

    // FirebaseConfig.js is loaded immediately before this file.
    // Use the load event as a fallback in case initialization is still settling.
    if (typeof database !== 'undefined' && database) {
        recordVisit();
    } else {
        window.addEventListener('load', recordVisit, { once: true });
    }
})();
