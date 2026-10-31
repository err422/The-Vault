// VaultAds.js - Central membership-aware advertising gate.
(function () {
  let ready = false;
  let adFree = false;
  let adsLoaded = false;

  function syncUI() {
    document.body.classList.toggle('vault-plus-active', ready && adFree);
    window.dispatchEvent(new CustomEvent('vaultMembershipChanged', {
      detail: { ready, adFree }
    }));
  }

  function injectScript(src, attributes = {}) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    const script = document.createElement('script');
    script.src = src;
    Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
    document.head.appendChild(script);
  }

  function loadAds() {
    if (adsLoaded || adFree || !ready) return;
    adsLoaded = true;

    // AdSense Auto Ads
    injectScript(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1639294484325644',
      { async: '', crossorigin: 'anonymous' }
    );

    // Monetization / pop-under provider. Never loaded for Vault+ accounts.
    injectScript('https://bauval.org/14/8c0b873d66a359e0f25e1402357679d4', {
      'data-cfasync': 'false'
    });
  }

  function applyMembership(membership, signedIn) {
    ready = true;
    adFree = !!signedIn &&
      membership?.plan === 'vault_plus' &&
      membership?.active === true;
    window.VaultAds.ready = true;
    syncUI();
    if (!adFree) loadAds();
  }

  window.VaultAds = {
    ready: false,
    isAdFree: () => ready && adFree,
    canShowAds: () => ready && !adFree,
    refresh: () => {
      const auth = window.AuthCore;
      if (auth?.profileReady) applyMembership(auth.currentMembership, !!auth.currentUser);
    }
  };

  window.addEventListener('authProfileReady', (event) => {
    const detail = event.detail || {};
    applyMembership(detail.membership, !!detail.user);
  });

  // AuthCore may have finished before this script was evaluated.
  if (window.AuthCore?.profileReady) {
    applyMembership(window.AuthCore.currentMembership, !!window.AuthCore.currentUser);
  }

  const style = document.createElement('style');
  style.textContent = `
    body.vault-plus-active #bmc-home-button,
    body.vault-plus-active .vault-plus-promo {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();
