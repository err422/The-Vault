let userInput = []; // stores user-entered code
let easterEggCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function createFirework() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f'];
  const burstCount = 40;
  
  // Random position on screen
  const x = Math.random() * 80 + 10; // 10-90% to avoid edges
  const y = Math.random() * 80 + 10; // 10-90% for full screen coverage
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  for (let i = 0; i < burstCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'firework-particle';
    particle.style.left = x + '%';
    particle.style.top = y + '%';
    particle.style.backgroundColor = color;
    particle.style.width = '6px';
    particle.style.height = '6px';
    
    const angle = (i / burstCount) * 360;
    const velocity = Math.random() * 150 + 80;
    particle.style.setProperty('--angle', angle + 'deg');
    particle.style.setProperty('--velocity', velocity + 'px');
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }
}

function createConfetti() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f'];
  let intervalId;
  let fireworkInterval;
  
  // Function to create a single piece of confetti
  function createSingleConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    const duration = Math.random() * 2 + 4; // 4-6 seconds
    confetti.style.animationDuration = duration + 's';
    
    // Random shapes
    const shapes = ['square', 'circle', 'rectangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    if (shape === 'circle') {
      confetti.style.borderRadius = '50%';
      confetti.style.width = (Math.random() * 10 + 5) + 'px';
      confetti.style.height = confetti.style.width;
    } else if (shape === 'rectangle') {
      confetti.style.width = (Math.random() * 5 + 3) + 'px';
      confetti.style.height = (Math.random() * 15 + 10) + 'px';
    } else {
      confetti.style.width = (Math.random() * 10 + 5) + 'px';
      confetti.style.height = confetti.style.width;
    }
    
    // Create unique animation for realistic physics
    const animationName = `fall-${Math.random().toString(36).substr(2, 9)}`;
    const drift = (Math.random() - 0.5) * 100;
    const rotation = Math.random() * 720;
    
    confetti.style.animationName = animationName;
    
    
    // Inject custom keyframe for unique motion
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes ${animationName} {
        0% {
          transform: translateY(0) translateX(0) rotate(0deg);
          opacity: 1;
        }
        95% {
          opacity: 1;
        }
        100% {
          transform: translateY(calc(100vh + 100px)) translateX(${drift}px) rotate(${rotation}deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
      style.remove();
    }, (duration * 1000) + 500);
  }
  
  // Create confetti every 80ms for a nice stream
  intervalId = setInterval(createSingleConfetti, 80);
  
  // Create random fireworks every 0.5-1 second during the effect
  fireworkInterval = setInterval(() => {
    createFirework();
  }, Math.random() * 500 + 1000);
  
  // Stop creating new confetti and fireworks after 5 seconds
  setTimeout(() => {
    clearInterval(intervalId);
    clearInterval(fireworkInterval);
  }, 5000);
}

document.addEventListener("keydown", function(event) {
  userInput.push(event.key);
  if (userInput.length > easterEggCode.length) {
    userInput.shift();
  }
  console.log("Current Input:", userInput);
  
  if (JSON.stringify(userInput) === JSON.stringify(easterEggCode)) {
    console.log("✅ Secret code entered!");
    const easterText = document.querySelector(".EasterEgg-txt");
    console.log("Found element:", easterText);
    if (easterText) {
      easterText.textContent = "Hello There";
      
      // Start confetti with random fireworks
      createConfetti();
      
      setTimeout(() => {
        easterText.textContent = "";
        easterText.style.transform = "scale(1)";
        easterText.style.color = "";
      }, 30000);
    }
    userInput = [];
  }
});

console.log("UserInput = " + userInput);