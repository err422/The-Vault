// Grab our UI elements

const chatBubbleBtn = document.getElementById("chat-bubble-btn");

const chatWindow = document.getElementById("chat-window");

const closeChatBtn = document.getElementById("close-chat-btn");

const sendBtn = document.getElementById("send-btn");

const chatInput = document.getElementById("chat-input");

const chatMessages = document.getElementById("chat-messages");



// 1. Toggle Chat Window Logic

chatBubbleBtn.addEventListener("click", () => {

    chatWindow.classList.remove("hidden");

    chatBubbleBtn.classList.add("hidden"); // Hide bubble when open

});



closeChatBtn.addEventListener("click", () => {

    chatWindow.classList.add("hidden");

    chatBubbleBtn.classList.remove("hidden"); // Show bubble when closed

});



// Helper function to add message bubbles to the UI

function appendMessage(text, senderType) {

    const messageDiv = document.createElement("div");

    messageDiv.classList.add("message");

    messageDiv.classList.add(senderType === "user" ? "user-message" : "bot-message");

    messageDiv.innerText = text;

    chatMessages.appendChild(messageDiv);

    

    // Scroll to the bottom automatically

    chatMessages.scrollTop = chatMessages.scrollHeight;

}



// 2. Fetch Logic (Modified from earlier)

async function fetchGameRecommendation() {
    const userText = chatInput.value.trim();
    if (!userText) return; 

    appendMessage(userText, "user");
    chatInput.value = ""; 

    const loadingId = Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "bot-message");
    loadingDiv.id = `loading-${loadingId}`;
    loadingDiv.innerText = "Thinking...";
    chatMessages.appendChild(loadingDiv);

    const requestData = {
        user_message: userText,
        categories: [], 
        related_games: []
    };

    // 1. FIXED: Added /api/recommend to the end
    const backendURL = "https://red-suns-reply.loca.lt/api/recommend"; 
                        
    try {
        const response = await fetch(backendURL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                // 2. FIXED: This header skips the Localtunnel "Warning" page
                "bypass-tunnel-reminder": "true" 
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error("Server error");
        
        const data = await response.json();
        
        document.getElementById(`loading-${loadingId}`).remove();
        appendMessage(data.bot_reply, "bot");

    } catch (error) {
        console.error("Error:", error);
        // Clean up the loading message if it exists
        const loader = document.getElementById(`loading-${loadingId}`);
        if (loader) loader.remove();
        appendMessage("The server is acting up. Maybe it's also depressed.", "bot");
    }
}
