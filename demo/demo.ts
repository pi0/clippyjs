import { initAgent } from "../src/index.ts";
import * as agents from "../src/agents/index.ts";

const availableAgents = Object.keys(agents);

const talks = [
  "How can I help you?",
  "Nice day!",
  "Glad to meet you.",
  "At your service!",
  "Helloo!",
  "Welcome!\nI'm here to help you\nwith anything you need.",
];

let currentAgent = null;
let currentIntervals = [];
let activeBtn = null;
const statusText = document.getElementById("status-text");
const agentCount = document.getElementById("agent-count");
const btnContainer = document.getElementById("agent-buttons");
const ttsToggle = document.getElementById("tts-toggle");
const ttsLabel = document.querySelector('label[for="tts-toggle"]');
const animSelect = document.getElementById("anim-select");
const ttsSupported = "speechSynthesis" in window;
if (!ttsSupported) {
  ttsToggle.checked = false;
  ttsToggle.disabled = true;
  ttsLabel.classList.add("disabled");
  ttsLabel.textContent = "Text-to-speech (not supported)";
}

// Build agent buttons
const buttons = new Map();
for (const name of availableAgents) {
  const btn = document.createElement("button");
  btn.className = "agent-btn";
  btn.textContent = name;
  btn.addEventListener("click", () => loadAgent(name, btn));
  btnContainer.appendChild(btn);
  buttons.set(name, btn);
}

// Load agent from URL hash or pick a random one
const hashAgent = location.hash.slice(1);
const randomAgent = availableAgents[~~(Math.random() * availableAgents.length)];
const initialAgent = !hashAgent
  ? randomAgent
  : availableAgents.includes(hashAgent)
    ? hashAgent
    : randomAgent;
const isRandom = !hashAgent;
loadAgent(initialAgent, buttons.get(initialAgent), { updateHash: !isRandom });

async function loadAgent(name, btn, { updateHash = true } = {}) {
  if (activeBtn === btn) return;

  // Persist selection in URL
  if (updateHash) history.replaceState(null, "", "#" + name);

  // Remove previous agent
  if (currentAgent) {
    currentAgent.dispose();
    for (const id of currentIntervals) clearInterval(id);
    currentIntervals = [];
  }
  if (activeBtn) {
    activeBtn.classList.remove("active");
    activeBtn.disabled = false;
  }

  btn.classList.add("active");
  btn.disabled = true;
  activeBtn = btn;
  statusText.textContent = "Loading " + name + "...";

  const agent = await initAgent(agents[name]);

  // If another agent was selected while loading, bail out
  if (activeBtn !== btn) {
    agent.dispose();
    return;
  }
  currentAgent = agent;
  agentCount.textContent = "1 agent";
  statusText.textContent = name + " loaded!";

  agent.show();

  // Populate animation dropdown
  animSelect.innerHTML = "";
  const anims = agent.animations().sort();
  for (const anim of anims) {
    const opt = document.createElement("option");
    opt.value = anim;
    opt.textContent = anim;
    animSelect.appendChild(opt);
  }
  animSelect.disabled = false;

  const speak = () => {
    agent.speak("I am " + name + ". " + talks[~~(Math.random() * talks.length)], {
      tts: ttsToggle.checked,
    });
    agent.animate();
  };
  agent._el.addEventListener("click", () => speak());
  speak();

  currentIntervals.push(setInterval(() => agent.animate(), 3000 + Math.random() * 4000));
}

// Play animation on selection change
animSelect.addEventListener("change", () => {
  if (!currentAgent || !animSelect.value) return;
  currentAgent.stop();
  currentAgent.play(animSelect.value);
});

// GitHub tray notification
const ghNotification = document.getElementById("gh-notification");
const ghTrayIcon = document.getElementById("gh-tray-icon");
const notifCloseBtn = document.getElementById("notif-close-btn");

// Show after a short delay
ghNotification.style.display = "none";
setTimeout(() => {
  ghNotification.style.display = "";
}, 2000);

notifCloseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  ghNotification.style.display = "none";
});

ghTrayIcon.addEventListener("click", () => {
  ghNotification.style.display = ghNotification.style.display === "none" ? "" : "none";
});

// Taskbar clock
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
updateClock();
setInterval(updateClock, 30000);
