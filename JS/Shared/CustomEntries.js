// CustomEntries.js - Custom Games/Websites System

(function() {
    const LIMITS = {
        title: 50,
        icon: 10,
        category: 30,
        description: 200
    };

    let customEntries = [];
    let currentPageType = null; // 'games' or 'websites'

    window.CustomEntriesSystem = {
        init(pageType) {
            currentPageType = pageType;
            console.log(`🎨 Initializing Custom Entries for ${pageType}`);
            
            this.createFloatingButton();
            
            // Wait for auth state to be ready
            if (typeof auth !== 'undefined') {
                auth.onAuthStateChanged((user) => {
                    if (user) {
                        console.log('✅ User authenticated, loading custom entries...');
                        this.loadCustomEntries();
                    } else {
                        console.log('ℹ️ No user logged in');
                        customEntries = [];
                        this.renderCustomEntries();
                    }
                });
            } else {
                console.warn('⚠️ Auth not available yet');
            }
        },

        createFloatingButton() {
            // Remove existing button if present
            const existing = document.getElementById('custom-entry-fab');
            if (existing) existing.remove();

            const fab = document.createElement('button');
            fab.id = 'custom-entry-fab';
            fab.innerHTML = '+';
            fab.title = `Add Custom ${currentPageType === 'games' ? 'Game' : 'Website'}`;
            fab.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border: none;
                color: white;
                font-size: 32px;
                font-weight: 300;
                cursor: pointer;
                box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
                transition: all 0.3s ease;
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            fab.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.1) rotate(90deg)';
                this.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.8)';
            });

            fab.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1) rotate(0deg)';
                this.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.6)';
            });

            fab.addEventListener('click', () => this.openModal());

            document.body.appendChild(fab);
            console.log('✅ Floating button created');
        },

        async loadCustomEntries() {
            const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (!user) {
                console.log('❌ No user logged in, cannot load custom entries');
                customEntries = [];
                this.renderCustomEntries();
                return;
            }

            try {
                console.log(`📥 Loading custom ${currentPageType} for user ${user.uid}...`);
                
                // Load from top-level customEntries path
                const snapshot = await database.ref(`customEntries/${currentPageType}`).once('value');
                customEntries = [];
                
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const entry = child.val();
                        // Only include entries from this user
                        if (entry.userId === user.uid) {
                            customEntries.push({
                                id: child.key,
                                ...entry
                            });
                        }
                    });
                }

                console.log(`✅ Loaded ${customEntries.length} custom ${currentPageType}`);
                this.renderCustomEntries();
            } catch (error) {
                console.error('❌ Error loading custom entries:', error);
            }
        },

        renderCustomEntries() {
            const grid = document.getElementById(currentPageType === 'games' ? 'gamesGrid' : 'websitesGrid');
            if (!grid) {
                console.warn('⚠️ Grid not found');
                return;
            }

            console.log(`🎨 Rendering ${customEntries.length} custom entries...`);

            // Remove old custom entries
            const oldCards = grid.querySelectorAll('.custom-entry-card');
            console.log(`🗑️ Removing ${oldCards.length} old custom entry cards`);
            oldCards.forEach(card => card.remove());

            // Add new custom entries at the beginning
            customEntries.forEach(entry => {
                const card = this.createEntryCard(entry);
                grid.insertBefore(card, grid.firstChild);
            });

            console.log(`✅ Rendered ${customEntries.length} custom entry cards`);

            // Re-add stars to cards
            if (typeof addStarsToCards === 'function') {
                addStarsToCards();
            } else if (typeof addStarsToSearchResults === 'function') {
                addStarsToSearchResults();
            }
        },

        createEntryCard(entry) {
            const card = document.createElement('div');
            card.className = currentPageType === 'games' ? 'game-card custom-entry-card' : 'website-card custom-entry-card';
            card.dataset.category = entry.category;
            card.style.position = 'relative';

            card.innerHTML = `
                <div style="position: absolute; top: 12px; right: 12px; background: linear-gradient(135deg, #667eea, #764ba2); 
                            padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; 
                            display: flex; align-items: center; gap: 4px; z-index: 10;">
                    ✨ CUSTOM
                    ${entry.flagForReview ? '<span title="Flagged for review">🚩</span>' : ''}
                </div>

                <div class="${currentPageType === 'games' ? 'game-icon' : 'website-favicon'}">${entry.icon}</div>
                <h3 class="${currentPageType === 'games' ? 'game-title' : 'website-title'}">${entry.title}</h3>
                <p class="${currentPageType === 'games' ? 'game-description' : 'website-description'}">${entry.description}</p>
                
                <div class="${currentPageType === 'games' ? 'game-meta' : 'website-meta'}">
                    <span class="${currentPageType === 'games' ? 'game-category' : 'website-category'}">${entry.category.toUpperCase()}</span>
                    <span class="${currentPageType === 'games' ? 'game-rating' : 'website-rating'}">${entry.rating}</span>
                </div>

                <div style="margin-top: 16px; display: flex; gap: 8px;">
                    <button class="custom-edit-btn" style="flex: 1; padding: 10px; background: rgba(59, 130, 246, 0.2); 
                            border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px; color: #3b82f6; 
                            cursor: pointer; font-weight: 600; transition: all 0.2s;">
                        ✏️ Edit
                    </button>
                    <button class="custom-delete-btn" style="flex: 1; padding: 10px; background: rgba(239, 68, 68, 0.2); 
                            border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; color: #ef4444; 
                            cursor: pointer; font-weight: 600; transition: all 0.2s;">
                        🗑️ Delete
                    </button>
                </div>
            `;

            // Click to open - UPDATED TO USE openIframe
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('custom-edit-btn') && 
                    !e.target.classList.contains('custom-delete-btn') &&
                    !e.target.classList.contains('favorite-star')) {
                    // Use unified openIframe function from browser.js
                    if (typeof openIframe === 'function') {
                        openIframe(entry.url, entry.title);
                    } else {
                        console.error('openIframe function not found. Make sure browser.js is loaded.');
                    }
                }
            });

            // Edit button
            card.querySelector('.custom-edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModal(entry);
            });

            // Delete button
            card.querySelector('.custom-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteEntry(entry.id);
            });

            return card;
        },

        openModal(entryToEdit = null) {
            const isEditing = !!entryToEdit;
            
            const modal = document.createElement('div');
            modal.id = 'custom-entry-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            `;

            const categories = currentPageType === 'games' 
                ? ['FPS', 'Idle', 'Puzzle', 'RPG', 'Racing', 'Action', 'Sports', 'Simulation', 'Incremental', 'Trivia']
                : ['Games', 'Proxy', 'Education', 'Other'];

            const ratings = ['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

            modal.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(30, 30, 30, 0.98), rgba(15, 15, 15, 0.98)); 
                            border-radius: 20px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; 
                            overflow-y: auto; border: 2px solid rgba(102, 126, 234, 0.3); 
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg, #667eea, #764ba2); 
                                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0;">
                            ${isEditing ? 'Edit' : 'Add'} Custom ${currentPageType === 'games' ? 'Game' : 'Website'}
                        </h2>
                        <button id="close-modal" style="background: rgba(255, 255, 255, 0.1); border: none; border-radius: 8px; 
                                width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; 
                                cursor: pointer; color: white; font-size: 20px; transition: all 0.2s;">×</button>
                    </div>

                    <form id="custom-entry-form" style="display: flex; flex-direction: column; gap: 20px;">
                        <!-- Title -->
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">
                                Title * <span id="title-count" style="color: #666; font-size: 0.85rem;">(0/${LIMITS.title})</span>
                            </label>
                            <input type="text" id="entry-title" value="${entryToEdit?.title || ''}" maxlength="${LIMITS.title}" 
                                   placeholder="Enter title..." required
                                   style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                          color: white; font-size: 1rem;">
                            <div id="title-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 4px; min-height: 20px;"></div>
                        </div>

                        <!-- URL -->
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">URL *</label>
                            <input type="url" id="entry-url" value="${entryToEdit?.url || ''}" placeholder="https://example.com" required
                                   style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                          color: white; font-size: 1rem;">
                            <div id="url-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 4px; min-height: 20px;"></div>
                        </div>

                        <!-- Icon and Category -->
                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">
                                    Icon * <span id="icon-count" style="color: #666; font-size: 0.85rem;">(0/${LIMITS.icon})</span>
                                </label>
                                <input type="text" id="entry-icon" value="${entryToEdit?.icon || (currentPageType === 'games' ? '🎮' : '🌐')}" 
                                       maxlength="${LIMITS.icon}" placeholder="🎮" required
                                       style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                              border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                              color: white; font-size: 1.5rem; text-align: center;">
                                <div id="icon-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 4px; min-height: 20px;"></div>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">Category *</label>
                                <select id="entry-category" required
                                        style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                               border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                               color: white; font-size: 1rem;">
                                    <option value="">Select category...</option>
                                    ${categories.map(cat => `<option value="${cat}" ${entryToEdit?.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                                </select>
                                <div id="category-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 4px; min-height: 20px;"></div>
                            </div>
                        </div>

                        <!-- Description -->
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">
                                Description * <span id="desc-count" style="color: #666; font-size: 0.85rem;">(0/${LIMITS.description})</span>
                            </label>
                            <textarea id="entry-description" maxlength="${LIMITS.description}" rows="4" required
                                      placeholder="Describe your ${currentPageType === 'games' ? 'game' : 'website'}..."
                                      style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                             border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                             color: white; font-size: 1rem; resize: vertical; font-family: inherit;">${entryToEdit?.description || ''}</textarea>
                            <div id="desc-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 4px; min-height: 20px;"></div>
                        </div>

                        <!-- Rating -->
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #888;">Rating *</label>
                            <select id="entry-rating" required
                                    style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3); 
                                           border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                           color: white; font-size: 1rem;">
                                ${ratings.map(r => `<option value="${r}" ${entryToEdit?.rating === r ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Flag for Review -->
                        <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); 
                                    border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" id="entry-flag" ${entryToEdit?.flagForReview ? 'checked' : ''}
                                   style="width: 20px; height: 20px; cursor: pointer; accent-color: #fbbf24;">
                            <label for="entry-flag" style="cursor: pointer; flex: 1; color: #fbbf24; font-size: 0.9rem;">
                                <strong>Flag for Review</strong> - Suggest this ${currentPageType === 'games' ? 'game' : 'website'} to be added to The Vault for everyone
                            </label>
                        </div>

                        <!-- Buttons -->
                        <div style="display: flex; gap: 12px; margin-top: 10px;">
                            <button type="button" id="cancel-btn" style="flex: 1; padding: 14px; background: rgba(255, 255, 255, 0.1); 
                                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 10px; color: white; 
                                    cursor: pointer; font-size: 1rem; font-weight: 600; transition: all 0.2s;">
                                Cancel
                            </button>
                            <button type="submit" style="flex: 2; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); 
                                    border: none; border-radius: 10px; color: white; cursor: pointer; font-size: 1rem; 
                                    font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                💾 ${isEditing ? 'Update' : 'Add'} ${currentPageType === 'games' ? 'Game' : 'Website'}
                            </button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            // Character counters
            const setupCounter = (inputId, countId) => {
                const input = document.getElementById(inputId);
                const counter = document.getElementById(countId);
                input.addEventListener('input', () => {
                    counter.textContent = `(${input.value.length}/${input.maxLength})`;
                });
                counter.textContent = `(${input.value.length}/${input.maxLength})`;
            };

            setupCounter('entry-title', 'title-count');
            setupCounter('entry-icon', 'icon-count');
            setupCounter('entry-description', 'desc-count');

            // Close handlers
            const closeModal = () => modal.remove();
            document.getElementById('close-modal').addEventListener('click', closeModal);
            document.getElementById('cancel-btn').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // Form submit
            document.getElementById('custom-entry-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEntry(entryToEdit?.id);
            });
        },

        async saveEntry(editingId = null) {
            const formData = {
                title: document.getElementById('entry-title').value.trim(),
                url: document.getElementById('entry-url').value.trim(),
                icon: document.getElementById('entry-icon').value.trim(),
                category: document.getElementById('entry-category').value,
                description: document.getElementById('entry-description').value.trim(),
                rating: document.getElementById('entry-rating').value,
                flagForReview: document.getElementById('entry-flag').checked
            };

            // Validate
            const errors = this.validateForm(formData);
            if (Object.keys(errors).length > 0) {
                Object.entries(errors).forEach(([field, message]) => {
                    const errorDiv = document.getElementById(`${field}-error`);
                    if (errorDiv) errorDiv.textContent = message;
                });
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                alert('You must be logged in to add custom entries');
                return;
            }

            try {
                console.log(`💾 Saving custom entry to top-level path...`);
                
                // Get username for better organization
                const username = (typeof AuthCore !== 'undefined' && AuthCore.currentUsername) 
                    ? AuthCore.currentUsername 
                    : 'unknown';
                
                const entryData = {
                    ...formData,
                    userId: user.uid,
                    username: username,
                    createdAt: editingId ? customEntries.find(e => e.id === editingId)?.createdAt || Date.now() : Date.now(),
                    updatedAt: Date.now()
                };

                if (editingId) {
                    // Update existing entry at top level
                    await database.ref(`customEntries/${currentPageType}/${editingId}`).update(entryData);
                    console.log(`✅ Updated entry ${editingId} at customEntries/${currentPageType}`);
                } else {
                    // Create new entry at top level
                    await database.ref(`customEntries/${currentPageType}`).push(entryData);
                    console.log(`✅ Created new entry at customEntries/${currentPageType}`);
                }

                document.getElementById('custom-entry-modal').remove();
                await this.loadCustomEntries();

            } catch (error) {
                console.error('❌ Error saving entry:', error);
                alert('Failed to save entry. Please try again.');
            }
        },

        validateForm(data) {
            const errors = {};

            if (!data.title) errors.title = 'Title is required';
            else if (data.title.length > LIMITS.title) errors.title = `Title must be ${LIMITS.title} characters or less`;

            if (!data.url) errors.url = 'URL is required';
            else if (!data.url.match(/^https?:\/\/.+/)) errors.url = 'URL must start with http:// or https://';

            if (!data.icon) errors.icon = 'Icon is required';
            else if (data.icon.length > LIMITS.icon) errors.icon = `Icon must be ${LIMITS.icon} characters or less`;

            if (!data.category) errors.category = 'Category is required';
            else if (data.category.length > LIMITS.category) errors.category = `Category must be ${LIMITS.category} characters or less`;

            if (!data.description) errors.desc = 'Description is required';
            else if (data.description.length > LIMITS.description) errors.desc = `Description must be ${LIMITS.description} characters or less`;

            return errors;
        },

        async deleteEntry(id) {
            if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
                return;
            }

            const user = auth.currentUser;
            if (!user) return;

            try {
                console.log(`🗑️ Deleting entry ${id} from customEntries/${currentPageType}`);
                await database.ref(`customEntries/${currentPageType}/${id}`).remove();
                console.log(`✅ Deleted entry ${id}`);
                await this.loadCustomEntries();
            } catch (error) {
                console.error('❌ Error deleting entry:', error);
                alert('Failed to delete entry. Please try again.');
            }
        }
    };

    console.log('✅ CustomEntries.js loaded');
})();

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .custom-entry-card {
        animation: fadeIn 0.3s ease;
    }
`;
document.head.appendChild(style);