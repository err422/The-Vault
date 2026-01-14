(function() {
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const label = this.querySelector('.nav-label').textContent.trim();
                
                console.log('Navigation clicked:', label);
                
                switch(label) {
                    case 'Home':
                        window.location.href = 'index.html'; 
                        break;
                    case 'Games':
                        window.location.href = 'games.html';
                        break;
                    case 'Websites':
                        window.location.href = 'websites.html';
                        break;
                    case 'Credits':
                        window.location.href = 'credits.html';
                        break;
                    case 'Account':
                    case 'Sign In':
                        window.location.href = 'Account.html';
                        break;
                    case 'Fullscreen':
                        toggleFullScreen();
                        break;
                    default:
                        // Check if it's a username (starts with @)
                        if (label.startsWith('@')) {
                            window.location.href = 'account.html';
                        }
                        break;
                }
            });
        });
    }

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
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
            // Exit fullscreen
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
    
    // Auto-initialize navigation when DOM is ready
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