// LoadingScreen.js - Universal loading screen for The Vault
(function() {
    const L = {
        el: null,
        active: false,
        minTime: 800,
        start: null,
        
        init() {
            const l = document.createElement('div');
            l.id = 'vault-loading-screen';
            l.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s';
            l.innerHTML = '<div style="text-align:center"><h1 style="font-family:Poppins,sans-serif;font-size:4rem;margin:0 0 40px;background:linear-gradient(to right,#fc72ff,#8f68ff,#487bff,#8f68ff,#fc72ff);background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:g 2.5s linear infinite,p 2s ease-in-out infinite">The Vault</h1><div style="width:60px;height:60px;border:4px solid rgba(255,255,255,.1);border-top-color:#8f68ff;border-radius:50%;margin:0 auto;animation:s 1s linear infinite"></div><p style="margin-top:30px;font-family:Poppins,sans-serif;font-size:1.1rem;color:rgba(255,255,255,.6);animation:f 1.5s ease-in-out infinite">Loading...</p></div>';
            const s = document.createElement('style');
            s.textContent = '@keyframes g{to{background-position:200%}}@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes s{to{transform:rotate(360deg)}}@keyframes f{0%,100%{opacity:.4}50%{opacity:1}}';
            document.head.appendChild(s);
            document.body.appendChild(l);
            this.el = l;
            this.hookNav();
            this.hookIframe();
        },
        
        show() {
            if (!this.el) return;
            this.active = true;
            this.start = Date.now();
            this.el.style.pointerEvents = 'all';
            this.el.style.opacity = '1';
        },
        
        hide() {
            if (!this.el || !this.active) return;
            const elapsed = Date.now() - this.start;
            const remaining = Math.max(0, this.minTime - elapsed);
            setTimeout(() => {
                this.el.style.opacity = '0';
                setTimeout(() => {
                    this.el.style.pointerEvents = 'none';
                    this.active = false;
                }, 300);
            }, remaining);
        },
        
        hookNav() {
            const orig = window.navigation?.setup;
            if (typeof orig !== 'function') return;
            window.navigation.setup = () => {
                orig();
                document.querySelectorAll('.nav-item').forEach(item => {
                    const clone = item.cloneNode(true);
                    item.parentNode.replaceChild(clone, item);
                    clone.addEventListener('click', () => {
                        const lbl = clone.querySelector('.nav-label').textContent.trim();
                        if (['Home', 'Games', 'Websites', 'Credits', 'Account', 'Sign In'].includes(lbl) || lbl.startsWith('@')) this.show();
                        switch(lbl) {
                            case 'Home': window.location.href = 'index.html'; break;
                            case 'Games': window.location.href = 'games.html'; break;
                            case 'Websites': window.location.href = 'websites.html'; break;
                            case 'Settings': window.location.href = 'settings.html'; break;
                            case 'Account':
                            case 'Sign In': window.location.href = 'account.html'; break;
                            case 'Fullscreen': window.navigation?.toggleFullScreen?.(); break;
                            default: if (lbl.startsWith('@')) window.location.href = 'Account.html';
                        }
                    });
                });
            };
            window.navigation.setup();
        },
        
        hookIframe() {
            const wrap = (orig) => {
                return function(url, title) {
                    L.show();
                    const result = orig.call(this, url, title);
                    setTimeout(() => {
                        const iframe = document.querySelectorAll('iframe');
                        const newest = iframe[iframe.length - 1];
                        if (newest) {
                            newest.addEventListener('load', () => L.hide());
                            setTimeout(() => L.hide(), 5000);
                        } else L.hide();
                    }, 100);
                    return result;
                };
            };
            if (window.openGameIframe) window.openGameIframe = wrap(window.openGameIframe);
            if (window.openWebsiteIframe) window.openWebsiteIframe = wrap(window.openWebsiteIframe);
            if (window.openInBrowser) window.openInBrowser = wrap(window.openInBrowser);
        }
    };
    
    L.show();
    window.addEventListener('load', () => {
        L.init();
        L.hide();
    });
    window.LoadingScreen = L;
})();