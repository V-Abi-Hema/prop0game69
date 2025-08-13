// prop.js

// DOM elements
const MIN = parseInt(document.getElementById("min").dataset.value);
const MAX = parseInt(document.getElementById("max").dataset.value);
const msg = document.getElementById("msg");
const result = document.getElementById("result");
const btn1 = document.getElementById("btn1");
const btn2 = document.getElementById("btn2");
const btn3 = document.getElementById("btn3");
const playAgain = document.getElementById("playAgain");
const winsDisplay = document.getElementById("wins");
const lossesDisplay = document.getElementById("losses");
const loginPopup = document.getElementById("loginPopup");
const registerPopup = document.getElementById("registerPopup");
const resetPasswordPopup = document.getElementById("resetPasswordPopup");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");

const userArea = document.getElementById('userArea');
const userWelcome = document.getElementById('userWelcome');
const authButtons = document.getElementById('authButtons');

const popup = document.getElementById("popup");
const playerList = document.getElementById("playerList");

let wins = 0;
let losses = 0;
let hasShownRegisterPopup = false;
let currentUser = null;

const contactCircle = document.getElementById('contactCircle');
const contactPopup = document.getElementById('contactPopup');

contactCircle.addEventListener('click', () => {
  if (contactPopup.style.display === 'none' || contactPopup.style.display === '') {
    contactPopup.style.display = 'block';
  } else {
    contactPopup.style.display = 'none';
  }
});

// Optional: Close popup if user clicks outside popup or circle
document.addEventListener('click', (event) => {
  if (!contactCircle.contains(event.target) && !contactPopup.contains(event.target)) {
    contactPopup.style.display = 'none';
  }
});


// Device ID (for 3-device rule)
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = 'dev_' + Math.random().toString(36).slice(2) + '_' + Date.now();
  localStorage.setItem('deviceId', deviceId);
}

// Base URL for backend
const API_BASE = 'https://prop0game69.onrender.com';

// UI state helpers
function updateUIAfterLogin() {
  if (currentUser) {
    userArea.style.display = 'flex';
    userWelcome.textContent = `Welcome, ${currentUser.username}`;
    authButtons.style.display = 'none';
    if (typeof currentUser.wins === 'number') wins = currentUser.wins;
    if (typeof currentUser.losses === 'number') losses = currentUser.losses;
    winsDisplay.textContent = wins;
    lossesDisplay.textContent = losses;
  }
}

function loadUserFromStorage() {
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    updateUIAfterLogin();
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  userArea.style.display = 'none';
  authButtons.style.display = 'block';
  wins = 0;
  losses = 0;
  winsDisplay.textContent = wins;
  lossesDisplay.textContent = losses;
  hasShownRegisterPopup = false;
}

// Game logic
const buttons = [btn1, btn2, btn3];

function setupGame() {
  msg.textContent = "";
  result.textContent = "";

  const winningNumber = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  const winnerIndex = Math.floor(Math.random() * 3);

  function generateDummyNumbers(exclude) {
    const nums = new Set();
    while (nums.size < 2) {
      const num = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
      if (num !== exclude) nums.add(num);
    }
    return Array.from(nums);
  }

  const dummyNumbers = generateDummyNumbers(winningNumber);

  buttons.forEach((btn, index) => {
    btn.disabled = false;
    btn.style.backgroundColor = "";
    btn.style.color = "";
    if (index === winnerIndex) {
      btn.textContent = winningNumber;
      btn.dataset.winner = "true";
    } else {
      btn.textContent = dummyNumbers.pop();
      btn.dataset.winner = "false";
    }

    btn.onclick = function () {
      const chosen = parseInt(btn.textContent);
      result.textContent = `You clicked: ${chosen}`;
      if (btn.dataset.winner === "true") {
        msg.textContent = `🎉 Winner! The number was ${winningNumber}.`;
        btn.style.backgroundColor = "green";
        wins++;
      } else {
        msg.textContent = `❌ Loser! The winning number was ${winningNumber}.`;
        btn.style.backgroundColor = "red";
        losses++;
      }
      winsDisplay.textContent = wins;
      lossesDisplay.textContent = losses;

      // Show register popup only once when threshold reached
      if ((wins >= 10 || losses >= 10) && !hasShownRegisterPopup) {
        registerPopup.style.display = "block";
        hasShownRegisterPopup = true;
      }

      buttons.forEach(b => b.disabled = true);
    };
  });
}

playAgain.onclick = setupGame;

// Auth popups
function showLogin() {
  loginPopup.style.display = "block";
}
function closeLogin() {
  loginPopup.style.display = "none";
  document.getElementById("loginMsg").textContent = "";
}
function showRegister() {
  registerPopup.style.display = "block";
}
function closeRegister() {
  registerPopup.style.display = "none";
  document.getElementById("regUser").value = "";
  document.getElementById("regPass").value = "";
  document.getElementById("regEmail").value = "";
}
function showResetPassword() {
  resetPasswordPopup.style.display = "block";
}
function closeResetPassword() {
  resetPasswordPopup.style.display = "none";
  document.getElementById("resetEmail").value = "";
  document.getElementById("resetNewPassword").value = "";
  document.getElementById("resetMsg").textContent = "";
}

// Login
function validateLogin() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const loginMsg = document.getElementById("loginMsg");

  if (!user || !pass) {
    loginMsg.textContent = "Please enter both username and password.";
    return;
  }

  loginMsg.textContent = "Logging in...";

  fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, deviceId })
  })
    .then(r => r.json().then(j => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      if (!ok) {
        if (j && j.requirePasswordReset) {
          loginMsg.textContent = "Maximum 3 devices reached. Please reset password.";
          closeLogin();
          showResetPassword();
          return;
        }
        loginMsg.textContent = j.error || "Login failed.";
        return;
      }
      currentUser = j.player;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUIAfterLogin();
      closeLogin();
    })
    .catch(() => {
      loginMsg.textContent = "Network error.";
    });
}

// Register
function submitRegister(event) {
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();
  const email = document.getElementById("regEmail").value.trim();

  if (!user || !pass || !email) {
    alert("Please fill in all fields.");
    return;
  }
  if (user.length < 3) {
    alert("Username must be at least 3 characters long.");
    return;
  }
  if (pass.length < 4) {
    alert("Password must be at least 4 characters long.");
    return;
  }
  if (!email.toLowerCase().endsWith("@gmail.com")) {
    alert("Email must end with @gmail.com");
    return;
  }

  const btn = registerSubmitBtn;
  btn.disabled = true;
  btn.textContent = "Saving...";

  fetch(`${API_BASE}/savePlayer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, gmail: email, wins, losses })
  })
    .then(r => r.json().then(j => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      if (!ok) {
        alert(j.error || "Failed to register.");
        return;
      }
      alert(j.message || "Registration successful!");
      currentUser = { username: user, wins, losses };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUIAfterLogin();
      closeRegister();
      // Reset counters post-registration if desired:
      // wins = 0; losses = 0; winsDisplay.textContent = wins; lossesDisplay.textContent = losses;
    })
    .catch(() => {
      alert("Network error while registering.");
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Submit";
    });
}

// Reset password (for 4th device)
function submitPasswordReset() {
  const email = document.getElementById("resetEmail").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const resetMsg = document.getElementById("resetMsg");

  if (!email || !newPassword) {
    resetMsg.textContent = "Please fill in all fields.";
    return;
  }
  if (newPassword.length < 4) {
    resetMsg.textContent = "Password must be at least 4 characters long.";
    return;
  }

  resetMsg.textContent = "Resetting password...";

  fetch(`${API_BASE}/resetPassword`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gmail: email, newPassword, deviceId })
  })
    .then(r => r.json().then(j => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      if (!ok) {
        resetMsg.textContent = j.error || "Password reset failed.";
        return;
      }
      currentUser = j.player;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUIAfterLogin();
      closeResetPassword();
      alert("Password reset successful! You are now logged in.");
    })
    .catch(() => {
      resetMsg.textContent = "Network error.";
    });
}

// Player Rank popup
let players = [];
let currentPage = 0;
const pageSize = 10;

function showPlayerRank() {
  playerList.innerHTML = "<li>Loading players...</li>";
  popup.style.display = "block";

  fetch(`${API_BASE}/players`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("Invalid data format");
      players = data.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      currentPage = 0;
      renderPage();
    })
    .catch(err => {
      console.error("Error fetching players:", err);
      playerList.innerHTML = "<li>Could not load player ranks. Please try again.</li>";
    });
}

function closePopup() {
  popup.style.display = "none";
}

function renderPage() {
  playerList.innerHTML = "";

  if (players.length === 0) {
    playerList.innerHTML = "<li>No players found.</li>";
    return;
  }

  const start = currentPage * pageSize;
  const end = start + pageSize;
  const pagePlayers = players.slice(start, end);

  pagePlayers.forEach((player, index) => {
    const li = document.createElement("li");
    const rank = start + index + 1;
    const name = player.username || player.name || 'Unknown';
    li.textContent = `#${rank} ${name} - Wins: ${player.wins || 0}, Losses: ${player.losses || 0}`;
    playerList.appendChild(li);
  });
}

function nextPage() {
  if ((currentPage + 1) * pageSize < players.length) {
    currentPage++;
    renderPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

// Init
loadUserFromStorage();
setupGame();

// Expose functions to window for HTML onclick
window.showLogin = showLogin;
window.closeLogin = closeLogin;
window.validateLogin = validateLogin;
window.showRegister = showRegister;
window.closeRegister = closeRegister;
window.submitRegister = submitRegister;
window.showResetPassword = showResetPassword;
window.closeResetPassword = closeResetPassword;
window.submitPasswordReset = submitPasswordReset;
window.showPlayerRank = showPlayerRank;
window.closePopup = closePopup;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.logout = logout;

