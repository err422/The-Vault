// AuthUI.js - Simple version that just adds account button
(function() {
    function addAccountButton() {
        const navBar = document.querySelector('.nav-bar');
        if (!navBar || document.getElementById('auth-nav-item')) return;
        
        const btn = document.createElement('div');
        btn.id = 'auth-nav-item';
        btn.className = 'nav-item';
        btn.style.cursor = 'pointer';
        btn.innerHTML = `
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-label">Account</span>
        `;
        
        // Click goes to account page
        btn.addEventListener('click', () => {
            window.location.href = 'account.html';
        });
        
        const fs = document.getElementById('fullscreen-btn');
        fs ? navBar.insertBefore(btn, fs) : navBar.appendChild(btn);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addAccountButton);
    } else {
        addAccountButton();
    }
})();