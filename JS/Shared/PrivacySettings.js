// PrivacySettings.js - Privacy & Safety System for The Vault

(function() {
    console.log('🛡️ Privacy Settings System Initializing...');

    const PrivacySettings = {
        panicKey: null,
        panicURL: 'https://classroom.google.com',
        disguiseEnabled: false,
        disguiseTitle: 'Classes',
        disguiseFavicon: 'https://ssl.gstatic.com/classroom/ic_product_classroom_32.png',

        // Initialize the system
        init() {
            this.loadSettings();
            this.setupPanicKeyListener();
            this.applyDisguise();
            console.log('✅ Privacy Settings loaded');
        },

        // Load settings from Firebase or localStorage
        async loadSettings() {
            try {
                // Try Firebase first if user is logged in
                if (typeof auth !== 'undefined' && auth.currentUser) {
                    const userId = auth.currentUser.uid;
                    const snapshot = await database.ref(`users/${userId}/privacy`).once('value');
                    const data = snapshot.val();
                    
                    if (data) {
                        this.panicKey = data.panicKey || null;
                        this.panicURL = data.panicURL || 'https://classroom.google.com';
                        this.disguiseEnabled = data.disguiseEnabled || false;
                        this.disguiseTitle = data.disguiseTitle || 'Classes';
                        this.disguiseFavicon = data.disguiseFavicon || 'https://ssl.gstatic.com/classroom/ic_product_classroom_32.png';
                        console.log('✅ Settings loaded from Firebase');
                        return;
                    }
                }
            } catch (error) {
                console.log('⚠️ Firebase load failed, using localStorage:', error);
            }

            // Fallback to localStorage
            const saved = localStorage.getItem('vaultPrivacySettings');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.panicKey = data.panicKey || null;
                    this.panicURL = data.panicURL || 'https://classroom.google.com';
                    this.disguiseEnabled = data.disguiseEnabled || false;
                    this.disguiseTitle = data.disguiseTitle || 'Classes';
                    this.disguiseFavicon = data.disguiseFavicon || 'https://ssl.gstatic.com/classroom/ic_product_classroom_32.png';
                    console.log('✅ Settings loaded from localStorage');
                } catch (error) {
                    console.error('❌ Error parsing localStorage:', error);
                }
            }
        },

        // Save settings to Firebase and localStorage
        async saveSettings() {
            const data = {
                panicKey: this.panicKey,
                panicURL: this.panicURL,
                disguiseEnabled: this.disguiseEnabled,
                disguiseTitle: this.disguiseTitle,
                disguiseFavicon: this.disguiseFavicon
            };

            // Always save to localStorage
            localStorage.setItem('vaultPrivacySettings', JSON.stringify(data));
            console.log('✅ Settings saved to localStorage');

            // Try Firebase if logged in
            try {
                if (typeof auth !== 'undefined' && auth.currentUser) {
                    const userId = auth.currentUser.uid;
                    await database.ref(`users/${userId}/privacy`).set(data);
                    console.log('✅ Settings saved to Firebase');
                }
            } catch (error) {
                console.log('⚠️ Firebase save failed:', error);
            }
        },

        // Setup panic key listener
        setupPanicKeyListener() {
            document.addEventListener('keydown', (e) => {
                if (this.panicKey && e.key === this.panicKey) {
                    e.preventDefault();
                    this.triggerPanic();
                }
            });
            console.log('✅ Panic key listener active');
        },

        // Trigger panic redirect
        triggerPanic() {
            console.log('🚨 PANIC TRIGGERED - Redirecting...');
            window.location.href = this.panicURL;
        },

        // Apply tab disguise
        applyDisguise() {
            if (!this.disguiseEnabled) {
                // Restore original
                document.title = this.getOriginalTitle();
                this.setFavicon(this.getOriginalFavicon());
                return;
            }

            // Apply disguise
            document.title = this.disguiseTitle;
            this.setFavicon(this.disguiseFavicon);
            console.log('🎭 Tab disguise applied:', this.disguiseTitle);
        },

        // Set favicon
        setFavicon(url) {
            // Remove existing favicons
            const existingLinks = document.querySelectorAll("link[rel*='icon']");
            existingLinks.forEach(link => link.remove());

            // Add new favicon
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = url;
            document.head.appendChild(link);
        },

        // Get original title based on page
        getOriginalTitle() {
            const path = window.location.pathname;
            if (path.includes('games.html')) return 'The Vault - Games';
            if (path.includes('websites.html')) return 'The Vault - Websites';
            if (path.includes('settings.html')) return 'The Vault - Settings';
            if (path.includes('Account.html')) return 'The Vault - Account';
            return 'The Vault';
        },

        // Get original favicon (you can customize this)
        getOriginalFavicon() {
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔐</text></svg>';
        },

        // Update panic key
        async setPanicKey(key) {
            this.panicKey = key;
            await this.saveSettings();
            console.log('✅ Panic key set to:', key);
        },

        // Update panic URL
        async setPanicURL(url) {
            // Basic URL validation
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            this.panicURL = url;
            await this.saveSettings();
            console.log('✅ Panic URL set to:', url);
        },

        // Toggle disguise
        async toggleDisguise(enabled) {
            this.disguiseEnabled = enabled;
            await this.saveSettings();
            this.applyDisguise();
            console.log('✅ Disguise', enabled ? 'enabled' : 'disabled');
        },

        // Update disguise settings
        async setDisguiseSettings(title, faviconURL) {
            this.disguiseTitle = title;
            this.disguiseFavicon = faviconURL;
            await this.saveSettings();
            if (this.disguiseEnabled) {
                this.applyDisguise();
            }
            console.log('✅ Disguise settings updated');
        },

        // Get current settings (for UI)
        getSettings() {
            return {
                panicKey: this.panicKey,
                panicURL: this.panicURL,
                disguiseEnabled: this.disguiseEnabled,
                disguiseTitle: this.disguiseTitle,
                disguiseFavicon: this.disguiseFavicon
            };
        }
    };

    // Export to global scope
    window.PrivacySettings = PrivacySettings;

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PrivacySettings.init());
    } else {
        PrivacySettings.init();
    }

    console.log('✅ Privacy Settings System Loaded');
})();