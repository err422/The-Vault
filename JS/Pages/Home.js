// Search functionality
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', async function() {
    const query = this.value.toLowerCase();
    if (!query) {
        searchResults.innerHTML = '';
        return;
    }

    try {
        const [gamesResponse, websitesResponse] = await Promise.all([
            fetch('json/games.json'),
            fetch('json/Websites.json')
        ]);
        
        const games = await gamesResponse.json();
        const websites = await websitesResponse.json();

        const matchedGames = games.filter(game => 
            game.title.toLowerCase().includes(query) ||
            game.description.toLowerCase().includes(query)
        );

        const matchedWebsites = websites.filter(website => 
            website.title.toLowerCase().includes(query) ||
            website.description.toLowerCase().includes(query)
        );

        displayResults([...matchedGames, ...matchedWebsites]);
    } catch (error) {
        console.error('Error fetching search data:', error);
    }
});

// Site URLs for Websites and games
const BASE_URLS = {
    'Cryzen.io': 'https://cryzen.io/',
    'Kour.io': 'https://kour.org/',
    'Nut Simulator': 'https://nutsimulator.github.io/index.html',
    'Shell Shockers': 'https://eggshooter.best/',
    'Idle Breakout': 'https://idle-breakout.neocities.org/?utm_source=chatgpt.com',
    'Diablo': 'https://d07riv.github.io/diabloweb/',
    'Clicker Heroes': 'https://www.yoosfuhl.com/game/clickerheroes/index.html',
    'Trimps': 'https://trimps.github.io/',
    'Tube Clicker': 'https://html5.gamedistribution.com/d9ef28d7e6a9493da73860d1e0b70414/',
    'GrindCraft': 'https://grindcraft.com/game.html',
    'Hex GL': 'https://hexgl.bkcore.com/play/',
    'Idle Shooter': 'https://html5.gamedistribution.com/acdee4deb06d46759e4577a83262dfce',
    'Masked Special Forces': 'https://www.onlinegames.io/games/2022/unity2/masked-special-forces/index.html',
    'Capybara Clicker': 'https://www.onlinegames.io/games/2023/q2/capybara-clicker-pro/index.html',
    'Block Blast': 'https://cloud.onlinegames.io/games/2024/unity3/block-blast/index-og.html',
    'CS Online': 'https://www.onlinegames.io/games/2023/unity2/cs-online/index.html',
    'Archer Hero': 'https://www.onlinegames.io/games/2023/unity/archer-hero/index.html',
    'Basketball King': 'https://cloud.onlinegames.io/games/2024/construct/316/basketball-king/index-og.html',
    'OpenGuessr': 'https://openguessr.com/',
    "GameOZero": "https://gameozero.com",
    "Phantom Games": "https://phantom.delusionz.xyz",
    "Frogies Arcade": "https://full.boxathome.net",
    "LunarSync": "https://lunarsync.smartfoloo.space",
    "FallGuy Games": "https://fallguys.onl",
    "Slope Games": "https://slopeio.org",
    "Subkeys Game Shack": "https://subkeys.github.io/sayeo",
    "Plexile Arcade": "https://plexile-learning-cheddar.glitch.me/about.html",
    "BCHS Unblocked": "https://bchs.pages.dev",
    "CrazyGames.ee": "https://crazygames.ee",
    "CrazyGames Unblocked": "https://crazygames-unblocked.github.io",
    "Planet Clicker": "https://planetclicker.io",
    "SubwaySurfer (inactive)": "https://subwaysurfer.pages.dev/NewGames",
    "ClassLink Phish": "http://launchpad.classlink.com.servers.radio.am",
    "Luma": "https://lumamain.com",
    "IO Games": "https://iogames.onl",
    "Ghost": "https://immortal2willlose.xyz",
    "VaultV6 (AJH)": "https://ajhmath.org/home/",
    "MathsFrame Unblocked": "https://mathsframe.github.io",
    "UBG365": "https://ubg365.github.io",
    "ExtremeMath": "https://datacrafted.org",
    "DuckMath": "https://duckmath.org/index.html",
    "JustStudy CE": "https://juststudy-ce.github.io",
    "Lunar (Bearcat)": "https://lunmeow.bearcat.rocks",
    "Lupine Vault": "https://lupinevault.com",
    "Boredom V2": "http://boredomarcade.xyz",
    "Mexi": "https://mexi.my/notes.html",
    "Truffled": "https://truffled.lol",
    "Pete Zah": "https://broenoughbandwith.web.app",
    "Compass Network": "https://compassnetwork.online"
};

function displayResults(results) {
    searchResults.innerHTML = '';
    
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        card.innerHTML = `
            <div class="game-icon">${item.icon || '🎮'}</div>
            <div class="game-title">${item.title}</div>
            <div class="game-description">${item.description}</div>
            <div class="game-meta">
                <span class="game-category">${item.category}</span>
                <span class="game-rating">${item.rating}</span>
            </div>
        `;

        // Add click handler for iframe using predefined URLs
        card.addEventListener('click', () => {
            const url = BASE_URLS[item.title] || `https://${item.title.toLowerCase().replace(/\s+/g, '')}.com`;
            
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'game-iframe-container';
            
            iframeContainer.innerHTML = `
                <div class="iframe-header">
                    <h2>${item.title}</h2>
                    <div class="iframe-controls">
                        <button class="fullscreen-iframe">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                            </svg>
                        </button>
                        <button class="close-iframe">&times;</button>
                    </div>
                </div>
                <iframe src="${url}" class="game-iframe"></iframe>
            `;
            
            document.body.appendChild(iframeContainer);
            
            // Add event listeners for controls
            const closeBtn = iframeContainer.querySelector('.close-iframe');
            const fullscreenBtn = iframeContainer.querySelector('.fullscreen-iframe');
            const iframe = iframeContainer.querySelector('.game-iframe');
            
            closeBtn.onclick = () => iframeContainer.remove();
            fullscreenBtn.onclick = () => {
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                } else if (iframe.webkitRequestFullscreen) {
                    iframe.webkitRequestFullscreen();
                } else if (iframe.msRequestFullscreen) {
                    iframe.msRequestFullscreen();
                }
            };
        });
        
        searchResults.appendChild(card);
    });
}

// Disabled search functionality for now
const searchBox = document.querySelector('.search-box');
const searchIcon = document.querySelector('.search-icon');

// Make search box appear interactive but not functional
searchBox.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        console.log('Search disabled for now');
    }
});

searchIcon.addEventListener('click', function () {
    console.log('Search disabled for now');
});

// Add click handlers for nav items (excluding fullscreen which is handled above)
document.querySelectorAll('.nav-item:not(#fullscreen-btn)').forEach(item => {
    item.addEventListener('click', function () {
        const label = this.querySelector('.nav-label').textContent;
        console.log(label + ' clicked');
    });
});