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

    messageDiv.classList.add(senderType === "user" ? "user-message": "bot-message");

    messageDiv.innerText = text;

    chatMessages.appendChild(messageDiv);

    

    // Scroll to the bottom automatically

    chatMessages.scrollTop = chatMessages.scrollHeight;

}



// 2. Fetch Logic (Modified from earlier)

async function fetchGameRecommendation() {
    const userText = chatInput.value.trim();
    if (!userText) return; 

    // 1. UI: Add user message and clear input
    appendMessage(userText, "user");
    chatInput.value = ""; 

    // 2. UI: Add a loading bubble
    const loadingId = Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "bot-message");
    loadingDiv.id = `loading-${loadingId}`;
    loadingDiv.innerText = "Thinking...";
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 3. Setup the Request
    const requestData = {
        user_message: userText,
        categories: [], 
        related_games: []
    };

    // Replace the URL below with your CURRENT localtunnel link!
    const backendURL = "https://https://urban-potato-r4rjxjwqr5vjhwj75-8000.app.github.dev/api/recommend"; 
                        
    try {
        const response = await fetch(backendURL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "bypass-tunnel-reminder": "true" 
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove loading and add bot reply
        const loader = document.getElementById(`loading-${loadingId}`);
        if (loader) loader.remove();
        
        appendMessage(data.bot_reply, "bot");

    } catch (error) {
        console.error("Fetch Error:", error);
        const loader = document.getElementById(`loading-${loadingId}`);
        if (loader) loader.remove();
        appendMessage("No. Leave me alone.", "bot");
    }
}
// Trigger the fetch when clicking Send
sendBtn.addEventListener("click", fetchGameRecommendation);

// Trigger the fetch when pressing Enter in the input box
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        fetchGameRecommendation();
    }
});
