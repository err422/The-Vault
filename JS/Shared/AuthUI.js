// AuthUI.js - Account nav button + mandatory auth modal
(function() {
    const GATED_PAGES = ['index.html', 'games.html', 'websites.html', ''];

    function injectStyles() {
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
            window.location.href = 'account.html';
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
                <div class="auth-modal-header">
                    <div class="auth-modal-title">Create Your Profile</div>
                    <p class="auth-modal-subtitle">An account is required to use The Vault. Sign up to track playtime, save favorites, and climb the leaderboard.</p>
                </div>
                <div class="auth-modal-tabs">
                    <button class="auth-modal-tab" id="auth-tab-signin" type="button">Sign In</button>
                    <button class="auth-modal-tab active" id="auth-tab-signup" type="button">Sign Up</button>
                </div>
                <div id="auth-modal-signin" style="display: none;">
                    <div class="auth-modal-group">
                        <label class="auth-modal-label">Username or Email</label>
                        <input type="text" class="auth-modal-input" id="auth-signin-user" placeholder="Enter username or email" autocomplete="username">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label">Password</label>
                        <input type="password" class="auth-modal-input" id="auth-signin-pass" placeholder="Enter password" autocomplete="current-password">
                    </div>
                    <div class="auth-modal-error" id="auth-signin-error"></div>
                    <button class="auth-modal-btn" id="auth-signin-btn" type="button">Sign In</button>
                </div>
                <div id="auth-modal-signup">
                    <div class="auth-modal-group">
                        <label class="auth-modal-label">Username</label>
                        <input type="text" class="auth-modal-input" id="auth-signup-user" placeholder="Choose a username" autocomplete="username">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label">Email</label>
                        <input type="email" class="auth-modal-input" id="auth-signup-email" placeholder="Enter your email" autocomplete="email">
                    </div>
                    <div class="auth-modal-group">
                        <label class="auth-modal-label">Password</label>
                        <input type="password" class="auth-modal-input" id="auth-signup-pass" placeholder="At least 6 characters" autocomplete="new-password">
                    </div>
                    <label class="auth-modal-tos">
                        <input type="checkbox" id="auth-signup-tos">
                        <span>I agree to the <a href="tos.html" target="_blank">Terms of Service</a></span>
                    </label>
                    <div class="auth-modal-error" id="auth-signup-error"></div>
                    <button class="auth-modal-btn" id="auth-signup-btn" type="button">Create Account</button>
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

        if (tab === 'signin') {
            signInTab.classList.add('active');
            signUpTab.classList.remove('active');
            signInForm.style.display = 'block';
            signUpForm.style.display = 'none';
        } else {
            signUpTab.classList.add('active');
            signInTab.classList.remove('active');
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
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        try {
            await window.AuthCore.signIn(username, password);
        } catch (error) {
            errorDiv.textContent = error.message;
            btn.textContent = 'Sign In';
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
        btn.textContent = 'Creating account...';
        btn.disabled = true;

        try {
            await window.AuthCore.signUp(username, email, password);
        } catch (error) {
            errorDiv.textContent = error.message;
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    }

    function attachModalListeners() {
        document.getElementById('auth-tab-signin').addEventListener('click', () => switchTab('signin'));
        document.getElementById('auth-tab-signup').addEventListener('click', () => switchTab('signup'));
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
            signInBtn.textContent = 'Sign In';
            signInBtn.disabled = false;
        }
        if (signUpBtn) {
            signUpBtn.textContent = 'Create Account';
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
                if (user) {
                    this.hideModal();
                } else {
                    this.showModal('signup');
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
