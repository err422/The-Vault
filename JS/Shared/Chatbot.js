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
    if (!userText) return; // Don't send empty messages

    // Add the user's message to the chat UI
    appendMessage(userText, "user");
    chatInput.value = ""; // Clear the input box

    // Show a loading message from the bot
    const loadingId = Date.now(); // Unique ID to find and remove this later
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "bot-message");
    loadingDiv.id = `loading-${loadingId}`;
    loadingDiv.innerText = "Thinking...";
    chatMessages.appendChild(loadingDiv);

    // Prepare data for backend
    const requestData = {
        user_message: userText,
        categories: [], 
        related_games: []
    };

    const backendURL = "https://ubiquitous-space-acorn-69rjpjwqr6wgf5775-8000.app.github.dev/api/recommend";
    
    try {
        const response = await fetch(backendURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error("Server error");
        
        const data = await response.json();
        
        // Remove loading message
        document.getElementById(`loading-${loadingId}`).remove();
        
        // Add the real AI response
        appendMessage(data.bot_reply, "bot");

    } catch (error) {
        console.error("Error:", error);
        document.getElementById(`loading-${loadingId}`).remove();
        appendMessage("Oops! Couldn't reach the server.", "bot");
    }
}

// Trigger the fetch when clicking Send, or pressing Enter
sendBtn.addEventListener("click", fetchGameRecommendation);
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") fetchGameRecommendation();
});
