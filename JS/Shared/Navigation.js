(function() {
    // Prevent double initialization
    if (window.navigationInitialized) {
        return;
    }
    window.navigationInitialized = true;
    
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const label = this.querySelector('.nav-label');
                if (!label) return;
                
                const labelText = label.textContent.trim().replace(/\s+/g, ' ');
                
                console.log('Navigation clicked:', labelText);
                
                // Prevent any default behavior
                e.preventDefault();
                e.stopPropagation();
                
                // Check what page to navigate to
                if (labelText === 'Home') {
                    window.location.href = 'index.html';
                } else if (labelText === 'Games') {
                    window.location.href = 'games.html';
                } else if (labelText === 'Websites') {
                    window.location.href = 'websites.html';
                } else if (labelText === 'Settings') {
                    window.location.href = 'settings.html';
                } else if (labelText === 'Account' || labelText === 'Sign In' || labelText.startsWith('@')) {
                    window.location.href = 'account.html';
                } else if (labelText === 'Fullscreen') {
                    toggleFullScreen();
                }
            });
        });
    }
    
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNavigation);
    } else {
        setupNavigation();
    }
    
    window.navigation = {
        toggleFullScreen: toggleFullScreen,
        setup: setupNavigation
    }
    
})();