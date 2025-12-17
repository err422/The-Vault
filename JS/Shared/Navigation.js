(function() {
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const label = this.querySelector('.nav-label').textContent;
                
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
                    case 'Fullscreen':
                        // Toggle fullscreen
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen();
                        } else {
                            document.exitFullscreen();
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
            } else if (document.documentElement.mozRequestFullScreen) { // Firefox
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
                document.documentElement.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
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