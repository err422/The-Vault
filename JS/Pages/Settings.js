var isCapturingKey = false;

// Privacy Settings UI
function loadPrivacySettings() {
    const settings = window.PrivacySettings.getSettings();

    // Panic Key
    document.getElementById('key-display').textContent = settings.panicKey ? settings.panicKey.toUpperCase() : 'Not Set';

    // Panic URL
    document.getElementById('panic-url').value = settings.panicURL;

    // Disguise
    const toggle = document.getElementById('disguise-toggle');
    if (settings.disguiseEnabled) {
        toggle.classList.add('active');
    }
    document.getElementById('disguise-title').value = settings.disguiseTitle;
    document.getElementById('disguise-favicon').value = settings.disguiseFavicon;
}

function startKeyCapture() {
    if (isCapturingKey) return;

    isCapturingKey = true;
    const capture = document.getElementById('key-capture');
    const display = document.getElementById('key-display');

    capture.classList.add('active');
    display.textContent = 'Press any key...';

    const keyHandler = (e) => {
        e.preventDefault();

        const key = e.key;
        window.PrivacySettings.setPanicKey(key);

        display.textContent = key.toUpperCase();
        capture.classList.remove('active');
        isCapturingKey = false;

        document.removeEventListener('keydown', keyHandler);
        showSaveIndicator();
    };

    document.addEventListener('keydown', keyHandler);
}

function savePanicURL() {
    const url = document.getElementById('panic-url').value;
    window.PrivacySettings.setPanicURL(url);
    showSaveIndicator();
}

function setPanicURLPreset(url) {
    document.getElementById('panic-url').value = url;
    window.PrivacySettings.setPanicURL(url);
    showSaveIndicator();
}

function toggleDisguise() {
    const toggle = document.getElementById('disguise-toggle');
    const isEnabled = !toggle.classList.contains('active');

    toggle.classList.toggle('active');
    window.PrivacySettings.toggleDisguise(isEnabled);
    showSaveIndicator();
}

function saveDisguiseSettings() {
    const title = document.getElementById('disguise-title').value;
    const favicon = document.getElementById('disguise-favicon').value;

    window.PrivacySettings.setDisguiseSettings(title, favicon);
    showSaveIndicator();
}

function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('show');

    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Init — runs immediately since this script only executes once it's
// actually attached to the page (both on first load and on every SPA
// swap into settings.html), so no 'load' listener is needed here.
var checkPrivacy = setInterval(() => {
    if (window.PrivacySettings) {
        loadPrivacySettings();
        clearInterval(checkPrivacy);
    }
}, 100);
