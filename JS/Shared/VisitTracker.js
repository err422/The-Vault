// The Vault visit tracker
// Counts every real index.html load and every SPA navigation that loads index.html.
(function () {
    'use strict';

    function updateVisitDisplay(count) {
        const display = document.getElementById('visit-count');
        if (display) {
            display.textContent = 'Total visits: ' + count;
        }
    }

    function recordVisit() {
        if (typeof database === 'undefined' || !database) {
            console.warn('[VisitTracker] Firebase database is not available.');
            return;
        }

        const visitsRef = database.ref('siteStats/visits');

        visitsRef.transaction(function (currentVisits) {
            const count = Number(currentVisits);
            return Number.isFinite(count) ? count + 1 : 1;
        }).then(function (result) {
            if (result.committed) {
                window.vaultVisitCount = result.snapshot.val();
                updateVisitDisplay(window.vaultVisitCount);
                console.log('[VisitTracker] Visit recorded. Total:', window.vaultVisitCount);
            }
        }).catch(function (error) {
            console.warn('[VisitTracker] Could not record visit:', error.message);
        });
    }

    // Make this available to the SPA navigation system.
    window.recordVaultVisit = recordVisit;

    // The initial index.html load counts once here.
    if (typeof database !== 'undefined' && database) {
        recordVisit();
    } else {
        window.addEventListener('load', recordVisit, { once: true });
    }
})();