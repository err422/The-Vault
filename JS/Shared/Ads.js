// The Vault - centralized ad loader
// Global Monetag zones load once on every page.
// In-Page Push zone 11936390 only loads on Games/Websites.

(function () {
    'use strict';

    const GLOBAL_ADS = [
        {
            id: 'monetag-11929381',
            src: 'https://5gvci.com/act/files/tag.min.js?z=11929381',
            attrs: {
                'data-cfasync': 'false',
                'async': ''
            }
        },
        {
            id: 'monetag-11936392',
            src: 'https://n6wxm.com/vignette.min.js',
            zone: '11936392'
        },
        {
            id: 'monetag-11929386',
            src: 'https://nap5k.com/tag.min.js',
            zone: '11929386'
        }
    ];

    const PAGE_AD = {
        id: 'monetag-11936390',
        src: 'https://al5sm.com/tag.min.js',
        zone: '11936390'
    };

    function getCurrentPage() {
        const content = document.getElementById('app-content');
        return content?.dataset.page || '';
    }

    function isGameOrWebsitePage() {
        const page = getCurrentPage();
        return page === 'games' || page === 'websites';
    }

    function hasAd(id) {
        return !!document.querySelector('script[data-vault-ad="' + id + '"]');
    }

    function loadScript(ad) {
        if (hasAd(ad.id)) return;

        const script = document.createElement('script');
        script.dataset.vaultAd = ad.id;

        if (ad.src) {
            script.src = ad.src;
        }

        if (ad.zone) {
            script.dataset.zone = ad.zone;
        }

        if (ad.attrs) {
            Object.entries(ad.attrs).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
        }

        document.head.appendChild(script);
    }

    function loadGlobalAds() {
        GLOBAL_ADS.forEach(loadScript);
    }

    function loadPageAds() {
        if (isGameOrWebsitePage()) {
            loadScript(PAGE_AD);
        }
    }

    function updateAds() {
        loadGlobalAds();
        loadPageAds();
    }

    window.VaultAds = {
        update: updateAds
    };

    // Initial page load.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAds, { once: true });
    } else {
        updateAds();
    }

    // Navigation.js dispatches this after every SPA page swap.
    window.addEventListener('pageLoaded', updateAds);
})();
