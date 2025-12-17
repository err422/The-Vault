// stars.js - Star animation management
(function() {
    let stars = [];
    let shootingStarInterval = null;
    let starsActive = false;

    // Create a single star
    function createStar(isStatic = false) {
        const star = document.createElement('div');
        star.className = isStatic ? 'star static' : 'star';
        star.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 50%;
            opacity: 0;
            transition: opacity 1s ease;
            pointer-events: none;
            z-index: 1;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
        `;
        
        const size = Math.random() * 2 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.dataset.size = size;
        
        if (!isStatic) {
            star.style.animation = `twinkle ${Math.random() * 3 + 2}s linear infinite`;
        }
        
        document.body.appendChild(star);
        return star;
    }

    // Make a star shoot
    function makeShootingStar(star) {
        if (star.classList.contains('static')) return;
        
        const directions = ['down-right', 'down-left', 'up-right', 'up-left'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        star.classList.add('shooting', direction);
        star.style.animation = `shoot-${direction} 3s linear forwards`;
        
        setTimeout(() => {
            if (!starsActive) return;
            star.remove();
            const newStar = createStar(false);
            newStar.classList.add('visible');
            newStar.style.opacity = '0.8';
            stars[stars.indexOf(star)] = newStar;
        }, 3000);
    }

    // Start shooting stars
    function startShootingStars() {
        if (shootingStarInterval) return;
        
        shootingStarInterval = setInterval(() => {
            if (!starsActive) return;
            
            if (Math.random() < 0.5) {
                const visibleStars = stars.filter(star =>
                    star.classList.contains('visible') &&
                    !star.classList.contains('shooting') &&
                    !star.classList.contains('static')
                );
                if (visibleStars.length > 0) {
                    const randomStar = visibleStars[Math.floor(Math.random() * visibleStars.length)];
                    makeShootingStar(randomStar);
                }
            }
        }, 1000);
    }

    // Stop shooting stars
    function stopShootingStars() {
        if (shootingStarInterval) {
            clearInterval(shootingStarInterval);
            shootingStarInterval = null;
        }
    }

    // Initialize stars
    function initStars() {
        if (starsActive) return;
        
        starsActive = true;
        stars = [];
        
        // Create stars - 50% static, 50% twinkling
        for (let i = 0; i < 300; i++) {
            const isStatic = Math.random() < 0.5;
            stars.push(createStar(isStatic));
        }
        
        // Show stars with fade-in
        setTimeout(() => {
            stars.forEach(star => {
                star.classList.add('visible');
                star.style.opacity = star.classList.contains('static') ? '0.7' : '0.8';
            });
        }, 100);
        
        // Start shooting stars after delay
        setTimeout(() => {
            startShootingStars();
        }, 1000);
    }

    // Remove all stars
    function removeStars() {
        if (!starsActive) return;
        
        starsActive = false;
        stopShootingStars();
        
        stars.forEach(star => {
            if (star && star.parentNode) {
                star.remove();
            }
        });
        
        stars = [];
    }

    // Export to global scope
    window.starManager = {
        remove: removeStars,
        init: initStars,
        isActive: () => starsActive
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStars);
    } else {
        initStars();
    }
})();