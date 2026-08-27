(function() {
    if (window.navigationInitialized) {
        return;
    }
    window.navigationInitialized = true;

    const CONTENT_ID = 'app-content';
    const STYLE_ID = 'page-style';

    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            if (item.dataset.navBound === 'true') return;
            item.dataset.navBound = 'true';

            item.addEventListener('click', function(e) {
                const label = this.querySelector('.nav-label');
                if (!label) return;

                const labelText = label.textContent.trim().replace(/\s+/g, ' ');

                console.log('Navigation clicked:', labelText);

                e.preventDefault();
                e.stopPropagation();

                if (labelText === 'Home') {
                    navigateTo('index.html');
                } else if (labelText === 'Games') {
                    navigateTo('games.html');
                } else if (labelText === 'Websites') {
                    navigateTo('websites.html');
                } else if (labelText === 'Settings') {
                    navigateTo('settings.html');
                } else if (labelText === 'Account' || labelText === 'Sign In' || labelText.startsWith('@')) {
                    navigateTo('account.html');
                } else if (labelText === 'Fullscreen') {
                    toggleFullScreen();
                }
            });
        });
    }

    async function navigateTo(page, pushState = true) {
        const currentContent = document.getElementById(CONTENT_ID);

        // No swappable container on this page (or something's off) — fall
        // back to a real navigation rather than silently doing nothing.
        if (!currentContent) {
            window.location.href = page;
            return;
        }

        try {
            const res = await fetch(page, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch ' + page + ': ' + res.status);
            const html = await res.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newContent = doc.getElementById(CONTENT_ID);
            if (!newContent) throw new Error('No #' + CONTENT_ID + ' found in ' + page);

            currentContent.innerHTML = newContent.innerHTML;
            currentContent.dataset.page = newContent.dataset.page || '';

            const newStyle = doc.getElementById(STYLE_ID);
            const currentStyle = document.getElementById(STYLE_ID);
            if (newStyle && currentStyle) {
                currentStyle.setAttribute('href', newStyle.getAttribute('href'));
            }

            if (doc.title) document.title = doc.title;

            if (pushState) {
                history.pushState({ page }, '', page);
            }

            // Some "shared" scripts (browser.js, BellSchedule.js, etc.) are
            // only referenced on a subset of pages, not every page. If the
            // person is navigating in from a page that never loaded one of
            // those, load it now — otherwise page scripts that depend on it
            // (e.g. Games.js calling openIframe(), defined in browser.js)
            // silently fail because the function doesn't exist yet.
            await loadMissingSharedScripts(doc);

            await runPageScripts(doc);

            setupNavigation();

            window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page } }));
        } catch (err) {
            console.error('SPA navigation failed, falling back to full load:', err);
            window.location.href = page;
        }
    }

    function loadMissingSharedScripts(doc) {
        const fetchedScripts = Array.from(doc.querySelectorAll('script[src]'));

        const alreadyLoaded = new Set(
            Array.from(document.scripts)
                .filter(s => s.src)
                .map(s => s.src)
        );

        const toLoad = fetchedScripts.filter(s => {
            if (s.hasAttribute('data-page-script')) return false; // handled by runPageScripts, always re-run
            const src = s.getAttribute('src');
            if (!src) return false;
            const absoluteSrc = new URL(src, document.baseURI).href;
            return !alreadyLoaded.has(absoluteSrc);
        });

        // Load sequentially, in document order, so scripts that depend on
        // an earlier one (e.g. Firebase SDK before FirebaseConfig.js) still
        // initialize in the right order.
        return toLoad.reduce((chain, script) => {
            return chain.then(() => loadSharedScript(script));
        }, Promise.resolve());
    }

    function loadSharedScript(oldScript) {
        return new Promise((resolve, reject) => {
            const newScript = document.createElement('script');
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }
            newScript.onload = () => resolve();
            newScript.onerror = () => reject(new Error('Failed to load shared script: ' + oldScript.getAttribute('src')));
            document.body.appendChild(newScript);
        });
    }

    function runPageScripts(doc) {
        const scripts = Array.from(doc.querySelectorAll('script[data-page-script]'));

        // Run sequentially so init order matches the source page's order.
        return scripts.reduce((chain, script) => {
            return chain.then(() => runScript(script));
        }, Promise.resolve());
    }

    function runScript(oldScript) {
        return new Promise((resolve, reject) => {
            // Remove any page-script instances from the previous page first,
            // so they don't pile up in the DOM on every navigation.
            document.querySelectorAll('script[data-page-script-instance]').forEach(s => s.remove());

            const newScript = document.createElement('script');
            for (const attr of oldScript.attributes) {
                if (attr.name === 'data-page-script') continue;
                newScript.setAttribute(attr.name, attr.value);
            }
            newScript.setAttribute('data-page-script-instance', 'true');

            if (oldScript.src) {
                newScript.onload = () => resolve();
                newScript.onerror = () => reject(new Error('Failed to load script: ' + oldScript.src));
                document.body.appendChild(newScript);
            } else {
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
                resolve();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === '`') {
            toggleFullScreen();
        }
    });

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    window.addEventListener('popstate', function(e) {
        const page = (e.state && e.state.page) || (location.pathname.split('/').pop() || 'index.html');
        navigateTo(page, false);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNavigation);
    } else {
        setupNavigation();
    }

    window.navigation = {
        toggleFullScreen: toggleFullScreen,
        navigateTo: navigateTo,
        setup: setupNavigation
    };

})();
