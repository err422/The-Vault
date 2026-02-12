// ThemeLoader.js - Add this to JS folder and include on ALL pages

(function() {
    // Define all theme CSS
    const themeStyles = `
        /* Background Themes */
        body.theme-default { 
            background: #000 !important; 
        }
        
        body.theme-purple { 
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e) !important; 
        }
        
        body.theme-ocean { 
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460) !important; 
        }
        
        body.theme-midnight { 
            background: linear-gradient(135deg, #2c003e, #1a0033, #0d001f) !important; 
        }
        
        body.theme-night { 
            background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%) !important; 
        }
        
        body.theme-royal { 
            background: linear-gradient(135deg, #2d1b69, #1a0f3d, #0a0520) !important; 
        }

        /* Smooth transition between themes */
        body {
            transition: background 0.5s ease;
        }
    `;

    // Inject theme styles into page
    function injectThemeStyles() {
        const styleId = 'vault-theme-styles';
        
        // Check if already injected
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = themeStyles;
        document.head.appendChild(style);
    }

    // Load saved theme
    function loadTheme() {
        const savedTheme = localStorage.getItem('vaultTheme') || 'default';
        
        // Remove any existing theme classes
        document.body.className = document.body.className
            .split(' ')
            .filter(c => !c.startsWith('theme-'))
            .join(' ');
        
        // Add saved theme class
        document.body.classList.add(`theme-${savedTheme}`);
        
        console.log(`🎨 Theme loaded: ${savedTheme}`);
    }

    // Initialize immediately (before DOM loads for no flash)
    injectThemeStyles();
    
    // Load theme as soon as possible
    if (document.readyState === 'loading') {
        loadTheme();
        document.addEventListener('DOMContentLoaded', loadTheme);
    } else {
        loadTheme();
    }

    // Export for use in settings page
    window.ThemeLoader = {
        loadTheme: loadTheme,
        getCurrentTheme: function() {
            return localStorage.getItem('vaultTheme') || 'default';
        },
        setTheme: function(themeName) {
            localStorage.setItem('vaultTheme', themeName);
            loadTheme();
        }
    };

    console.log('✅ ThemeLoader initialized');
})();