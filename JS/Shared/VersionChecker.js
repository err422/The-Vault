// VersionChecker.js - Compact & Working Version
(function() {
    const CFG = {
        VER: 'v2.6.0',  // UPDATE THIS when releasing new version
        PATH: 'System/latestVersion',  // Firebase path (case-sensitive!)
        LINK: 'https://www.dropbox.com/scl/fo/g7c2f6cirpkchl8apxnpm/ANf6VEgqyMBw5BtTxBUwzVk?rlkey=le90mf4pcmfu9z30px72b64i4&st=w4mchget&dl=0',
        INT: 300000  // Check every 5 minutes
    };

    let interval, latest;

    const VC = {
        init() {
            const page = location.pathname.split('/').pop().toLowerCase();
            if(['index.html','account.html',''].includes(page)) {
                this.addBadge();
                this.check();
                interval = setInterval(() => this.check(), CFG.INT);
            }
        },

        async check() {
            if(typeof database === 'undefined') return;
            try {
                const snap = await database.ref(CFG.PATH).once('value');
                latest = snap.val();
                if(latest && this.needsUpdate(CFG.VER, latest.version)) {
                    this.showModal();
                }
                this.updateBadge();
            } catch(e) {
                console.error('Version check failed:', e);
            }
        },

        needsUpdate(current, latest) {
            const c = current.replace('v','').split('.').map(Number);
            const l = latest.replace('v','').split('.').map(Number);
            for(let i = 0; i < 3; i++) {
                if(l[i] > c[i]) return true;
                if(l[i] < c[i]) return false;
            }
            return false;
        },

        addBadge() {
            if(document.getElementById('version-badge')) return;

            const badge = document.createElement('div');
            badge.id = 'version-badge';
            badge.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(30,30,30,.95);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:10px 16px;font-size:12px;color:rgba(255,255,255,.7);z-index:1000;cursor:pointer;transition:.2s;font-family:monospace;backdrop-filter:blur(10px)';

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex;align-items:center;gap:8px';

            const icon = document.createElement('span');
            icon.id = 'version-icon';
            icon.textContent = '📦';

            const text = document.createElement('span');
            text.id = 'version-text';
            text.textContent = 'Version ' + CFG.VER;

            wrapper.appendChild(icon);
            wrapper.appendChild(text);
            badge.appendChild(wrapper);

            badge.onmouseenter = function() {
                this.style.background = 'rgba(40,40,40,.98)';
                this.style.transform = 'translateY(-2px)';
            };
            badge.onmouseleave = function() {
                this.style.background = 'rgba(30,30,30,.95)';
                this.style.transform = 'translateY(0)';
            };
            badge.onclick = () => {
                if(latest && this.needsUpdate(CFG.VER, latest.version)) {
                    this.showModal();
                } else {
                    this.showInfo();
                }
            };

            document.body.appendChild(badge);
        },

        updateBadge() {
            const badge = document.getElementById('version-badge');
            const icon = document.getElementById('version-icon');
            const text = document.getElementById('version-text');

            if(!badge || !icon || !text) return;

            if(latest && this.needsUpdate(CFG.VER, latest.version)) {
                badge.style.borderColor = 'rgba(251,191,36,.5)';
                badge.style.background = 'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.2))';
                icon.textContent = '🆕';
                text.innerHTML = CFG.VER + ' <span style="color:#fbbf24">→ ' + latest.version + '</span>';
            } else {
                badge.style.borderColor = 'rgba(255,255,255,.2)';
                badge.style.background = 'rgba(30,30,30,.95)';
                icon.textContent = '✅';
                text.textContent = 'Version ' + CFG.VER;
            }
        },

        showModal() {
            if(document.getElementById('update-modal')) return;

            const modal = document.createElement('div');
            modal.id = 'update-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center';

            const content = document.createElement('div');
            content.style.cssText = 'background:linear-gradient(135deg,rgba(30,30,30,.98),rgba(20,20,20,.98));border-radius:20px;padding:40px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.9);border:2px solid #fbbf24;position:relative';

            content.innerHTML = `
                <button id="close-modal" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.7);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:20px;transition:.2s">×</button>
                <div style="text-align:center;margin-bottom:30px">
                    <div style="font-size:64px;margin-bottom:16px">🆕</div>
                    <h2 style="font-size:28px;font-weight:700;color:white;margin:0 0 8px 0">Update Available!</h2>
                    <p style="color:#888;font-size:14px;margin:0">A new version of The Vault is ready</p>
                </div>
                <div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;margin-bottom:24px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                        <div>
                            <div style="font-size:12px;color:#888;margin-bottom:4px">CURRENT</div>
                            <div style="font-size:20px;font-weight:700;color:#ef4444">${CFG.VER}</div>
                        </div>
                        <div style="font-size:32px;color:#888">→</div>
                        <div>
                            <div style="font-size:12px;color:#888;margin-bottom:4px">LATEST</div>
                            <div style="font-size:20px;font-weight:700;color:#22c55e">${latest?.version || 'Unknown'}</div>
                        </div>
                    </div>
                    ${latest?.releaseNotes ? `
                        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1)">
                            <div style="font-size:12px;color:#888;margin-bottom:8px">WHAT'S NEW</div>
                            <div style="color:#ddd;font-size:14px;line-height:1.6">${latest.releaseNotes}</div>
                        </div>
                    ` : ''}
                </div>
                <div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:12px;padding:16px;margin-bottom:24px">
                    <h3 style="font-size:14px;font-weight:600;color:#fbbf24;margin:0 0 12px 0">📥 How to Update</h3>
                    <ol style="margin:0;padding-left:20px;color:#ddd;font-size:13px;line-height:1.8">
                        <li>Click the download button below</li>
                        <li>Download from DropBox</li>
                        <li>Extract files to your location</li>
                        <li>Open the new version</li>
                    </ol>
                </div>
                <div style="display:flex;gap:12px">
                    <button id="dismiss" style="flex:1;padding:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.2);color:white;border-radius:12px;cursor:pointer;font-weight:600;font-size:14px;transition:.2s">Later</button>
                    <button id="download" style="flex:2;padding:14px;background:linear-gradient(to right,#fbbf24,#f59e0b);border:none;color:white;border-radius:12px;cursor:pointer;font-weight:700;font-size:14px;transition:.2s;box-shadow:0 4px 15px rgba(251,191,36,.3)">📥 Download Update</button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            const close = () => modal.remove();
            document.getElementById('close-modal').onclick = close;
            document.getElementById('dismiss').onclick = close;
            document.getElementById('download').onclick = () => {
                window.open(CFG.LINK, '_blank');
                close();
            };
            modal.onclick = e => e.target === modal && close();
        },

        showInfo() {
            const info = document.createElement('div');
            info.style.cssText = 'position:fixed;bottom:80px;left:20px;background:rgba(30,30,30,.98);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:16px;z-index:10000;max-width:300px;backdrop-filter:blur(10px)';
            info.innerHTML = `
                <div style="font-size:14px;font-weight:600;color:#22c55e;margin-bottom:8px">✅ You're up to date!</div>
                <div style="font-size:12px;color:#888;line-height:1.5">Current: ${CFG.VER}<br>Latest: ${latest?.version || CFG.VER}</div>
            `;
            document.body.appendChild(info);
            setTimeout(() => info.remove(), 3000);
        }
    };

    // Auto-initialize
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VC.init());
    } else {
        VC.init();
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        if(interval) clearInterval(interval);
    });

    // Export
    window.VersionChecker = VC;
    window.VERSION = CFG.VER;
})();