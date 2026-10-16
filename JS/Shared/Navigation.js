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
                } else if (labelText === 'Admin') {
                    if (window.AuthCore?.currentUser && window.AuthCore?.currentAdmin === true) {
                        navigateTo('admin.html');
                    } else {
                        document.getElementById('admin-nav-item')?.remove();
                    }
                } else if (labelText === 'Fullscreen') {
                    // Alternate sponsored-link and fullscreen actions on each click.
                    // Keep the site in this tab; the sponsored destination opens separately.
                    if (window.__vaultFullscreenAdNext !== false) {
                        window.__vaultFullscreenAdNext = false;
                        window.open('https://asiafilm.org/4/ef24d6c489753d45db16a7d6b10ab991', '_blank', 'noopener,noreferrer');
                    } else {
                        window.__vaultFullscreenAdNext = true;
                        toggleFullScreen();
                    }
                }
            });
        });
    }

    function buildPageContent(doc, page) {
        const content = doc.getElementById(CONTENT_ID);
        if (content) return content;

        // The admin console predates the SPA shell and stores its UI outside #app-content.
        // Move only its page UI into the shared content slot; keep the existing site nav alive.
        if (page === 'admin.html' || page.endsWith('/admin.html')) {
            const adminRoot = doc.getElementById('admin-root');
            if (!adminRoot) return null;

            const wrapper = doc.createElement('main');
            wrapper.id = CONTENT_ID;
            wrapper.dataset.page = 'admin';

            [adminRoot, doc.getElementById('admin-loading'), doc.getElementById('toast')]
                .filter(Boolean)
                .forEach(element => wrapper.appendChild(element.cloneNode(true)));

            return wrapper;
        }

        return null;
    }

    function updateActiveNavigation(page) {
        const activeLabel = ({
            'index.html': 'Home',
            'games.html': 'Games',
            'websites.html': 'Websites',
            'settings.html': 'Settings',
            'account.html': 'Account',
            'admin.html': 'Admin'
        })[page] || '';

        document.querySelectorAll('.nav-item').forEach(item => {
            const label = item.querySelector('.nav-label')?.textContent.trim();
            item.classList.toggle('active', !!activeLabel && label === activeLabel);
        });
    }

    async function navigateTo(page, pushState = true) {
        const currentContent = document.getElementById(CONTENT_ID);

        if (!currentContent) {
            window.location.href = page;
            return;
        }

        try {
            // Do not let an SPA route expose the admin shell to a non-admin session.
            if ((page === 'admin.html' || page.endsWith('/admin.html')) &&
                window.AuthCore?.profileReady &&
                (!window.AuthCore.currentUser || window.AuthCore.currentAdmin !== true)) {
                page = 'index.html';
            }

            const res = await fetch(page, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch ' + page + ': ' + res.status);
            const html = await res.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newContent = buildPageContent(doc, page);
            if (!newContent) throw new Error('No #' + CONTENT_ID + ' found in ' + page);

            // Notify page-specific code before its old DOM is removed.
            window.dispatchEvent(new CustomEvent('pageUnloading', { detail: { page } }));

            currentContent.innerHTML = newContent.innerHTML;
            currentContent.dataset.page = newContent.dataset.page || '';

            // Count every SPA navigation to Home as a page view.
            if (page === 'index.html' && typeof window.recordVaultVisit === 'function') {
                window.recordVaultVisit();
            }

            // Show the Buy Me a Coffee button only on the Home page.
            const bmcButton = document.getElementById('bmc-home-button');
            if (bmcButton) {
                bmcButton.style.display = currentContent.dataset.page === 'home' ? '' : 'none';
            }

            const newStyle = doc.getElementById(STYLE_ID);
            let currentStyle = document.getElementById(STYLE_ID);
            if (newStyle) {
                if (!currentStyle) {
                    currentStyle = document.createElement('link');
                    currentStyle.rel = 'stylesheet';
                    currentStyle.id = STYLE_ID;
                    document.head.appendChild(currentStyle);
                }
                currentStyle.setAttribute('href', newStyle.getAttribute('href'));
            } else if (currentStyle) {
                // Do not let a previous page's stylesheet leak into pages without page-specific CSS.
                currentStyle.remove();
            }

            if (doc.title) document.title = doc.title;

            if (pushState) {
                history.pushState({ page }, '', page);
            }

            await loadMissingSharedScripts(doc);
            await runPageScripts(doc);

            setupNavigation();
            updateActiveNavigation(page);

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
            if (s.hasAttribute('data-page-script')) return false;
            const src = s.getAttribute('src');
            if (!src) return false;
            const absoluteSrc = new URL(src, document.baseURI).href;
            return !alreadyLoaded.has(absoluteSrc);
        });

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

        return scripts.reduce((chain, script) => {
            return chain.then(() => runScript(script));
        }, Promise.resolve());
    }

    function runScript(oldScript) {
        return new Promise((resolve, reject) => {
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