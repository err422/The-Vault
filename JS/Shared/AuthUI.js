// AuthUI.js - Account nav button + mandatory auth modal
(function() {
    const GATED_PAGES = ['index.html', 'games.html', 'websites.html', ''];

    function injectStyles() {
        const guestStyle = document.createElement('style');
        guestStyle.textContent = `
            .auth-guest-btn {
                display: block; width: 100%; margin-top: 14px; padding: 12px 16px;
                border: 1px solid rgba(168, 85, 247, .7); border-radius: 10px;
                background: rgba(124, 58, 237, .14); color: inherit; font: inherit;
                font-weight: 600; cursor: pointer; transition: background .15s ease;
            }
            .auth-guest-btn:hover { background: rgba(124, 58, 237, .28); }
            .auth-guest-note { margin: 8px 0 0; font-size: 12px; opacity: .72; text-align: center; }
        `;
        document.head.appendChild(guestStyle);
        if (document.getElementById('auth-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'auth-ui-styles';
        style.textContent = `
            body.auth-gated .main-content,
            body.auth-gated .container,
            body.auth-gated .search-container,
            body.auth-gated .filter-container,
            body.auth-gated .games-grid,
            body.auth-gated #search-results,
            body.auth-gated #chat-bubble-btn {
                filter: blur(6px);
                pointer-events: none;
                user-select: none;
            }

            #auth-required-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(4px);
                z-index: 99998;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            #auth-required-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            #auth-required-modal {
                width: 100%;
                max-width: 480px;
                background: rgba(20, 20, 30, 0.98);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 20px;
                padding: 36px 32px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
                transform: translateY(16px) scale(0.97);
                transition: transform 0.3s ease;
            }

            #auth-required-overlay.visible #auth-required-modal {
                transform: translateY(0) scale(1);
            }

            .auth-modal-header {
                text-align: center;
                margin-bottom: 28px;
            }

            .auth-modal-title {
                font-size: 1.75rem;
                font-weight: 700;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .auth-modal-subtitle {
                color: #888;
                font-size: 0.95rem;
                line-height: 1.5;
            }

            .auth-modal-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 24px;
            }

            .auth-modal-tab {
                flex: 1;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #888;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.95rem;
                transition: all 0.2s;
            }

            .auth-modal-tab.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-color: transparent;
                color: white;
            }

            .auth-modal-tab:hover:not(.active) {
                background: rgba(255, 255, 255, 0.08);
            }

            .auth-modal-group {
                margin-bottom: 16px;
            }

            .auth-modal-label {
                display: block;
                margin-bottom: 6px;
                font-size: 0.85rem;
                color: #888;
            }

            .auth-modal-input {
                width: 100%;
                padding: 14px 16px;
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                transition: border-color 0.2s;
            }

            .auth-modal-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 16px rgba(102, 126, 234, 0.2);
            }

            .auth-modal-input::placeholder {
                color: #555;
            }

            .auth-modal-error {
                color: #ef4444;
                font-size: 0.88rem;
                min-height: 20px;
                margin-bottom: 12px;
            }

            .auth-modal-btn {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s, transform 0.1s;
            }

            .auth-modal-btn:hover:not(:disabled) {
                opacity: 0.92;
            }

            .auth-modal-btn:active:not(:disabled) {
                transform: scale(0.98);
            }

            .auth-modal-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .auth-modal-tos {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                font-size: 0.85rem;
                color: #aaa;
                cursor: pointer;
                margin-bottom: 4px;
            }

            .auth-modal-tos input {
                margin-top: 3px;
            }

            .auth-modal-tos a {
                color: #667eea;
            }

            /* Desktop-style lock screen window */
            #auth-required-overlay {
                background:
                    radial-gradient(ellipse at 18% 12%, rgba(139,92,246,.20), transparent 42%),
                    radial-gradient(ellipse at 85% 90%, rgba(88,28,135,.22), transparent 40%),
                    rgba(3,2,9,.88);
                backdrop-filter: blur(22px) saturate(125%);
            }
            #auth-required-modal {
                position: relative;
                max-width: 480px;
                padding: 0 30px 30px;
                overflow: hidden;
                border-radius: 16px;
                background: linear-gradient(155deg, rgba(29,23,43,.98), rgba(10,9,17,.99));
                border: 1px solid rgba(196,181,253,.28);
                box-shadow: 0 32px 110px rgba(0,0,0,.72), inset 0 1px rgba(255,255,255,.07);
            }
            .auth-window-bar {
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 0 -30px 28px;
                padding: 0 15px;
                background: rgba(7,5,13,.58);
                border-bottom: 1px solid rgba(196,181,253,.13);
                color: #aaa2bd;
                font-size: 11px;
                letter-spacing: .04em;
            }
            .auth-window-controls { display:flex; align-items:center; gap:7px; }
            .auth-window-dot { width:9px; height:9px; border-radius:50%; display:block; }
            .auth-window-dot.close { background:#fb7185; }
            .auth-window-dot.minimize { background:#fbbf24; }
            .auth-window-dot.maximize { background:#4ade80; }
            .auth-window-brand { display:flex; align-items:center; gap:7px; font-weight:600; }
            .auth-window-brand-mark {
                display:grid; place-items:center; width:19px; height:19px;
                border-radius:6px; background:rgba(139,92,246,.2); color:#c4b5fd;
                font-size:12px;
            }
            .auth-window-status { color:#8f83a8; font-size:10px; }
            .auth-modal-header { margin-bottom: 24px; }
            .auth-modal-header::before {
                width: 64px;
                height: 64px;
                border-radius: 20px;
                background: linear-gradient(145deg, rgba(139,92,246,.24), rgba(88,28,135,.18));
                box-shadow: 0 8px 28px rgba(124,58,237,.12);
            }
            .auth-modal-header::before {
                content: "🔒";
                display: grid;
                place-items: center;
                width: 58px;
                height: 58px;
                margin: 0 auto 20px;
                border-radius: 18px;
                background: rgba(139,92,246,.16);
                border: 1px solid rgba(196,181,253,.22);
                font-size: 25px;
                -webkit-text-fill-color: initial;
            }
            .auth-modal-title {
                font-size: 1.8rem;
                letter-spacing: -.04em;
                background: linear-gradient(135deg, #f5f3ff 10%, #c4b5fd 85%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .auth-modal-subtitle { color: #aaa2bd; }
            .auth-modal-tabs { gap: 6px; padding: 5px; border-radius: 13px; background: rgba(0,0,0,.24); }
            .auth-modal-tab { border: 1px solid transparent; border-radius: 9px; padding: 11px; }
            .auth-modal-tab.active { background: rgba(139,92,246,.25); border-color: rgba(167,139,250,.45); color: #f5f3ff; }
            .auth-modal-input { border-radius: 11px; border-color: rgba(196,181,253,.16); background: rgba(0,0,0,.28); }
            .auth-modal-input:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(139,92,246,.14); }
            .auth-modal-btn {
                border-radius: 11px;
                background: linear-gradient(135deg, #7c3aed, #8b5cf6);
                box-shadow: 0 8px 24px rgba(124,58,237,.2);
            }
            /* Native vaultOS session panel */
            #auth-required-modal { max-width: 500px; padding: 0 34px 30px; border-radius: 17px; }
            .auth-window-bar { height: 44px; margin-bottom: 26px; }
            .auth-session-heading { display:flex; align-items:center; gap:17px; margin: 0 0 24px; text-align:left; }
            .auth-session-avatar { position:relative; flex:0 0 66px; width:66px; height:66px; display:grid; place-items:center; border-radius:20px; background:linear-gradient(145deg,rgba(139,92,246,.34),rgba(76,29,149,.2)); border:1px solid rgba(196,181,253,.28); box-shadow:inset 0 1px rgba(255,255,255,.12),0 10px 28px rgba(0,0,0,.22); }
            .auth-session-avatar span { font-size:30px; line-height:1; font-weight:800; letter-spacing:-.08em; color:#ede9fe; text-shadow:0 2px 16px rgba(167,139,250,.4); }
            .auth-session-avatar i { position:absolute; right:-3px; bottom:-3px; width:15px; height:15px; border-radius:50%; background:#4ade80; border:3px solid #171222; box-shadow:0 0 12px rgba(74,222,128,.4); }
            .auth-session-copy { min-width:0; }
            .auth-session-eyebrow { color:#a78bfa; font-size:9px; font-weight:800; letter-spacing:.16em; margin-bottom:7px; }
            .auth-modal-header { margin:0; text-align:left; }
            .auth-modal-header::before { display:none; content:none; }
            .auth-modal-title { margin:0 0 4px; font-size:25px; line-height:1.15; letter-spacing:-.045em; }
            .auth-modal-subtitle { margin:0; font-size:12px; line-height:1.45; }
            .auth-modal-tabs { display:flex; gap:5px; padding:5px; margin-bottom:21px; border:1px solid rgba(196,181,253,.12); background:rgba(4,3,10,.38); border-radius:11px; }
            .auth-modal-tab { padding:10px 12px; color:#8f86a2; font-size:11px; letter-spacing:.01em; }
            .auth-modal-tab.active { color:#f5f3ff; background:linear-gradient(135deg,rgba(124,58,237,.38),rgba(139,92,246,.2)); border-color:rgba(167,139,250,.35); box-shadow:inset 0 1px rgba(255,255,255,.06); }
            .auth-session-context { display:flex; align-items:center; gap:8px; margin:0 0 16px; color:#8f83a8; font-size:9px; font-weight:700; letter-spacing:.13em; }
            .auth-context-dot { width:6px; height:6px; border-radius:50%; background:#a78bfa; box-shadow:0 0 9px rgba(167,139,250,.7); }
            .auth-context-line { height:1px; flex:1; background:linear-gradient(90deg,rgba(167,139,250,.25),transparent); }
            .auth-modal-group { margin-bottom:15px; }
            .auth-modal-label { margin-bottom:7px; color:#a99fba; font-size:9px; font-weight:800; letter-spacing:.12em; }
            .auth-modal-input { box-sizing:border-box; min-height:47px; padding:13px 14px; border-radius:9px; background:rgba(3,2,8,.52); border-color:rgba(196,181,253,.15); font-size:13px; }
            .auth-modal-input::placeholder { color:#665d75; }
            .auth-modal-input:focus { border-color:rgba(167,139,250,.75); background:rgba(8,5,17,.8); box-shadow:0 0 0 3px rgba(139,92,246,.12); }
            .auth-modal-btn { display:flex; align-items:center; justify-content:space-between; min-height:47px; padding:0 16px; border:1px solid rgba(196,181,253,.25); border-radius:9px; background:linear-gradient(110deg,#6d28d9,#8b5cf6); color:#fff; font-size:12px; font-weight:750; letter-spacing:.02em; box-shadow:0 8px 25px rgba(109,40,217,.22),inset 0 1px rgba(255,255,255,.14); }
            .auth-modal-btn span:last-child { font-size:17px; opacity:.8; }
            .auth-modal-btn:hover:not(:disabled) { filter:brightness(1.1); }
            .auth-guest-divider { display:flex; align-items:center; gap:12px; margin:17px 0 12px; color:#716781; font-size:9px; font-weight:700; letter-spacing:.14em; }
            .auth-guest-divider::before,.auth-guest-divider::after { content:""; height:1px; flex:1; background:rgba(196,181,253,.12); }
            .auth-guest-btn { display:flex; align-items:center; justify-content:center; gap:9px; margin:0; min-height:42px; padding:10px 14px; border:1px solid rgba(196,181,253,.16); border-radius:9px; background:rgba(255,255,255,.025); color:#c9c1d8; font-size:11px; font-weight:650; }
            .auth-guest-btn:hover { background:rgba(139,92,246,.1); border-color:rgba(167,139,250,.32); }
            .auth-guest-icon { font-size:18px; color:#a78bfa; }
            .auth-guest-note { margin:8px 0 0; color:#756c84; font-size:9px; line-height:1.4; }
            .auth-modal-tos { margin:8px 0 12px; font-size:11px; line-height:1.5; }
            .auth-modal-tos a { color:#c4b5fd; }
            .auth-modal-error { min-height:18px; margin-bottom:8px; font-size:11px; }
            #auth-modal-signup .auth-modal-group { margin-bottom:12px; }
            .auth-guest-btn-signup { width:100%; }
            @media(max-width:520px) {
                #auth-required-modal { padding:0 20px 24px; }
                .auth-session-heading { gap:13px; }
                .auth-session-avatar { flex-basis:56px; width:56px; height:56px; border-radius:17px; }
                .auth-session-avatar span { font-size:26px; }
                .auth-modal-title { font-size:22px; }
                .auth-window-bar { margin-left:-20px; margin-right:-20px; padding:0 12px; }
                .auth-window-status { font-size:9px; }
            }
            @media(max-width:520px) {
                #auth-required-overlay { padding: 12px; }
                #auth-required-modal { padding: 0 20px 24px; border-radius: 14px; }
                .auth-window-bar { margin-left:-20px; margin-right:-20px; padding:0 12px; }
                .auth-window-status { font-size:9px; }
            }
        `;
        document.head.appendChild(style);
    }

    function addAccountButton() {
        const navBar = document.querySelector('.nav-bar');
        if (!navBar || document.getElementById('auth-nav-item')) return;

        const btn = document.createElement('div');
        btn.id = 'auth-nav-item';
        btn.className = 'nav-item auth-button';
        btn.style.cursor = 'pointer';
        btn.innerHTML = `
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-label">Account</span>
        `;

        btn.addEventListener('click', () => {
            if (window.navigation?.navigateTo) {
                window.navigation.navigateTo('account.html');
            } else {
                window.location.href = 'account.html';
            }
        });

        const fs = document.getElementById('fullscreen-btn');
        fs ? navBar.insertBefore(btn, fs) : navBar.appendChild(btn);
    }

    function createModal() {
        if (document.getElementById('auth-required-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'auth-required-overlay';
        overlay.innerHTML = `
            <div id="auth-required-modal">
                <div class="auth-window-bar" aria-hidden="true">
                    <div class="auth-window-controls">
                        <span class="auth-window-dot close"></span>
                        <span class="auth-window-dot minimize"></span>
                        <span class="auth-window-dot maximize"></span>
                    </div>
                    <div class="auth-window-brand"><span class="auth-window-brand-mark">V</span> THE WEB VAULT</div>
                    <span class="auth-window-status">SECURE SESSION</span>
                </div>
                <div class="auth-session-heading">
                    <div class="auth-session-avatar" aria-hidden="true"><span>V</span><i></i></div>
                    <div class="auth-session-copy">
                        <div class="auth-session-eyebrow">VAULTOS · USER SESSION</div>
                        <div class="auth-modal-title" id="auth-modal-title">Welcome back</div>
                        <p class="auth-modal-subtitle" id="auth-modal-subtitle">Sign in to restore your desktop and account.</p>
                    </div>
                </div>
                <div class="auth-modal-tabs" role="tablist" aria-label="Account access">
                    <button class="auth-modal-tab active" id="auth-tab-signin" type="button" role="tab" aria-selected="true">Unlock session</button>
                    <button class="auth-modal-tab" id="auth-tab-signup" type="button" role="tab" aria-selected="false">New account</button>
                </div>
                <div id="auth-modal-signin" style="display: none;">
                    <div class="auth-session-context"><span class="auth-context-dot"></span> LOCAL DESKTOP ACCESS <span class="auth-context-line"></span></div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label" for="auth-signin-user">ACCOUNT IDENTIFIER</label>
                        <input type="text" class="auth-modal-input" id="auth-signin-user" placeholder="Username or email" autocomplete="username">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label" for="auth-signin-pass">PASSWORD</label>
                        <input type="password" class="auth-modal-input" id="auth-signin-pass" placeholder="Enter your password" autocomplete="current-password">
                    </div>
                    <div class="auth-modal-error" id="auth-signin-error" role="alert"></div>
                    <button class="auth-modal-btn" id="auth-signin-btn" type="button"><span>Unlock Desktop</span><span aria-hidden="true">↗</span></button>
                    <div class="auth-guest-divider"><span>OR</span></div>
                    <button class="auth-guest-btn" id="auth-continue-guest" type="button"><span class="auth-guest-icon">◌</span> Start a guest session</button>
                    <p class="auth-guest-note">Guest sessions are saved on this device. Account features won't be available.</p>
                </div>
                <div id="auth-modal-signup">
                    <div class="auth-modal-group">
                        <label class="auth-modal-label" for="auth-signup-user">CHOOSE A USERNAME</label>
                        <input type="text" class="auth-modal-input" id="auth-signup-user" placeholder="Your desktop username" autocomplete="username">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label" for="auth-signup-email">EMAIL ADDRESS</label>
                        <input type="email" class="auth-modal-input" id="auth-signup-email" placeholder="name@example.com" autocomplete="email">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label" for="auth-signup-pass">CREATE PASSWORD</label>
                        <input type="password" class="auth-modal-input" id="auth-signup-pass" placeholder="At least 6 characters" autocomplete="new-password">
                    </div>
                    <label class="auth-modal-tos">
                        <input type="checkbox" id="auth-signup-tos">
                        <span>I agree to the <a href="https://docs.google.com/document/d/1iEg2ysVHRlZni3fwQHKJUDzd3qKMmcW8FbB6CEl5L_Q/edit?tab=t.0" target="_blank">Terms of Service</a></span>
                    </label>
                    <div class="auth-modal-error" id="auth-signup-error"></div>
                    <button class="auth-modal-btn" id="auth-signup-btn" type="button"><span>Create Vault Account</span><span aria-hidden="true">↗</span></button>
                    <div class="auth-guest-divider"><span>OR</span></div>
                    <button class="auth-guest-btn auth-guest-btn-signup" id="auth-continue-guest-signup" type="button"><span class="auth-guest-icon">◌</span> Explore as a guest</button>
                    <p class="auth-guest-note">You can create an account later from your desktop.</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        attachModalListeners();
    }

    function switchTab(tab) {
        const signInTab = document.getElementById('auth-tab-signin');
        const signUpTab = document.getElementById('auth-tab-signup');
        const signInForm = document.getElementById('auth-modal-signin');
        const signUpForm = document.getElementById('auth-modal-signup');

        const title = document.getElementById('auth-modal-title');
        const subtitle = document.getElementById('auth-modal-subtitle');
        if (tab === 'signin') {
            if (title) title.textContent = 'Welcome back';
            if (subtitle) subtitle.textContent = 'Sign in to restore your desktop and account.';
            signInTab.classList.add('active');
            signUpTab.classList.remove('active');
            signInTab.setAttribute('aria-selected', 'true');
            signUpTab.setAttribute('aria-selected', 'false');
            signInForm.style.display = 'block';
            signUpForm.style.display = 'none';
        } else {
            if (title) title.textContent = 'Set up your desktop';
            if (subtitle) subtitle.textContent = 'Create a Vault account to save your desktop across sessions.';
            signUpTab.classList.add('active');
            signInTab.classList.remove('active');
            signUpTab.setAttribute('aria-selected', 'true');
            signInTab.setAttribute('aria-selected', 'false');
            signUpForm.style.display = 'block';
            signInForm.style.display = 'none';
        }
    }

    async function handleSignIn() {
        const username = document.getElementById('auth-signin-user').value.trim();
        const password = document.getElementById('auth-signin-pass').value;
        const errorDiv = document.getElementById('auth-signin-error');
        const btn = document.getElementById('auth-signin-btn');

        errorDiv.textContent = '';
        btn.querySelector('span').textContent = 'Unlocking session...';
        btn.disabled = true;

        try {
            await window.AuthCore.signIn(username, password);
        } catch (error) {
            errorDiv.textContent = error.message;
            btn.querySelector('span').textContent = 'Unlock Desktop';
            btn.disabled = false;
        }
    }

    async function handleSignUp() {
        const username = document.getElementById('auth-signup-user').value.trim();
        const email = document.getElementById('auth-signup-email').value.trim();
        const password = document.getElementById('auth-signup-pass').value;
        const tosChecked = document.getElementById('auth-signup-tos').checked;
        const errorDiv = document.getElementById('auth-signup-error');
        const btn = document.getElementById('auth-signup-btn');

        if (!tosChecked) {
            errorDiv.textContent = 'You must agree to the Terms of Service.';
            return;
        }

        errorDiv.textContent = '';
        btn.querySelector('span').textContent = 'Creating account...';
        btn.disabled = true;

        try {
            await window.AuthCore.signUp(username, email, password);
        } catch (error) {
            errorDiv.textContent = error.message;
            btn.querySelector('span').textContent = 'Create Vault Account';
            btn.disabled = false;
        }
    }

    function attachModalListeners() {
        document.getElementById('auth-tab-signin').addEventListener('click', () => switchTab('signin'));
        document.getElementById('auth-tab-signup').addEventListener('click', () => switchTab('signup'));
        const guestHandler = () => window.AuthCore.continueAsGuest();
        document.getElementById('auth-continue-guest')?.addEventListener('click', guestHandler);
        document.getElementById('auth-continue-guest-signup')?.addEventListener('click', guestHandler);
        document.getElementById('auth-signin-btn').addEventListener('click', handleSignIn);
        document.getElementById('auth-signup-btn').addEventListener('click', handleSignUp);
        document.getElementById('auth-signin-pass').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignIn();
        });
        document.getElementById('auth-signup-pass').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignUp();
        });
    }

    function resetFormButtons() {
        const signInBtn = document.getElementById('auth-signin-btn');
        const signUpBtn = document.getElementById('auth-signup-btn');
        if (signInBtn) {
            signInBtn.querySelector('span').textContent = 'Unlock Desktop';
            signInBtn.disabled = false;
        }
        if (signUpBtn) {
            signUpBtn.querySelector('span').textContent = 'Create Vault Account';
            signUpBtn.disabled = false;
        }
    }

    window.AuthUI = {
        showModal(defaultTab) {
            createModal();
            switchTab(defaultTab || 'signup');
            document.body.classList.add('auth-gated');
            requestAnimationFrame(() => {
                document.getElementById('auth-required-overlay').classList.add('visible');
            });
        },

        hideModal() {
            const overlay = document.getElementById('auth-required-overlay');
            if (overlay) overlay.classList.remove('visible');
            document.body.classList.remove('auth-gated');
            resetFormButtons();
        },

        requireAuth() {
            if (typeof auth === 'undefined') {
                console.warn('AuthUI: Firebase auth not loaded');
                return;
            }

            document.body.classList.add('auth-gated');
            createModal();

            auth.onAuthStateChanged((user) => {
                if (user || localStorage.getItem('vault_guest_session') === '1') {
                    this.hideModal();
                } else {
                    this.showModal('signin');
                }
            });
        },

        init() {
            injectStyles();
            addAccountButton();

            const page = location.pathname.split('/').pop().toLowerCase();
            if (GATED_PAGES.includes(page)) {
                this.requireAuth();
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AuthUI.init());
    } else {
        window.AuthUI.init();
    }
})();
