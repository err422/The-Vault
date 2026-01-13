

// ===== FIX 1: Update FirebaseConfig.js =====
// Prevent multiple initializations and add error handling

(function() {
    // Check if Firebase is already initialized
    if (window.firebaseInitialized) {
        console.log('Firebase already initialized, skipping...');
        return;
    }

    const firebaseConfig = {
        apiKey: "AIzaSyAukwEW-0tGsjsgHSuatFQwc2-2u-RiXm8",
        authDomain: "the-vault-server.firebaseapp.com",
        databaseURL: "https://the-vault-server-default-rtdb.firebaseio.com",
        projectId: "the-vault-server",
        storageBucket: "the-vault-server.firebasestorage.app",
        messagingSenderId: "335810962420",
        appId: "1:335810962420:web:5d71b0c7e7625fb0e4cfa1",
        measurementId: "G-QG96FRFH0C"
    };

    try {
        // Initialize Firebase only once
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully");
        }
        
        // Export references
        window.auth = firebase.auth();
        window.database = firebase.database();
        
        // Enable persistence for faster loading
        window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                console.log("Auth persistence enabled");
            })
            .catch((error) => {
                console.error("Persistence error:", error);
            });
        
        // Mark as initialized
        window.firebaseInitialized = true;
        
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
})();