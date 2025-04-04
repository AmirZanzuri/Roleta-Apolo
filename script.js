import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, remove, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyAwyHSiTUPPOmZ9V8offHqJ4IN5WdzB-Wo",
    authDomain: "roleta---apolo.firebaseapp.com",
    databaseURL: "https://roleta---apolo-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "roleta---apolo",
    storageBucket: "roleta---apolo.firebasestorage.app",
    messagingSenderId: "955205002496",
    appId: "1:955205002496:web:2a099654d37ab72d74bfe5",
    measurementId: "G-KTDBVF05ZK"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let players = {};
let currentNumbers = new Set();
let playerId = null;
let playerName = "";
let roundActive = false;
let roundsPlayed = 0;
let pointsPerRound = 10;

// Update UI elements
function updateUI() {
    const roundsPlayedElement = document.getElementById("rounds-played");
    const roundStatusElement = document.getElementById("round-status");

    if (roundsPlayedElement && roundStatusElement) {
        roundsPlayedElement.innerText = roundsPlayed;
        roundStatusElement.innerText = roundActive ? "Active" : "Not Active";
    }
}


// Join game function
function joinGame() {
    const nameInput = document.getElementById("player-name");
    playerName = nameInput.value.trim();
    if (!playerName) return alert("Please enter your name");

    playerId = Math.random().toString(36).substr(2, 9);
    players[playerId] = { name: playerName, score: 0, number: null, roundsWon: 0 };

    set(ref(db, `players/${playerId}`), players[playerId]);

    document.getElementById("join-game").style.display = "none";
    document.getElementById("game-area").style.display = "block";

    // Show admin controls only for Amir Z
    if (playerName === "Amir Z") {
        document.getElementById("reset-game").style.display = "block";
        document.getElementById("admin-actions").style.display = "block";
        document.getElementById("admin-controls").style.display = "block";
    }

    updateScoreboard();
}

// Pick number function
function pickNumber() {
    if (!playerId || players[playerId].number !== null || roundActive) return;

    let number;
    do {
        number = Math.floor(Math.random() * 15) + 1;
    } while (currentNumbers.has(number));

    currentNumbers.add(number);
    players[playerId].number = number;

    set(ref(db, `players/${playerId}/number`), number);

    document.getElementById("your-number").innerText = `Your Number: ${number}`;
    document.getElementById("your-number").style.display = "block";
    document.getElementById("pick-number").disabled = true;

    checkAllPlayersPicked();
}

// Check if round should start
function checkAllPlayersPicked() {
    onValue(ref(db, 'players/'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const allPicked = Object.values(data).every(player => player.number !== null);
            if (allPicked) {
                roundActive = true;
                roundsPlayed++;
                updateUI();
            }
        }
    });
}

// Eliminated function
function eliminated() {
    if (!playerId || players[playerId].number === null) return;

    alert(`Player ${players[playerId].name} was eliminated. Number: ${players[playerId].number}`);

    currentNumbers.delete(players[playerId].number);
    players[playerId].number = null;
    set(ref(db, `players/${playerId}/number`), null);

    checkEndRound();
}

// Won round function
function wonRound() {
    if (!playerId || players[playerId].number === null) return;

    let losers = Object.values(players).filter(player => player.number !== null && player.name !== playerName);
    let totalPointsWon = pointsPerRound * losers.length;

    players[playerId].score += totalPointsWon;
    players[playerId].roundsWon += 1;

    losers.forEach(loser => {
        players[loser.id].score -= pointsPerRound;
        update(ref(db, `players/${loser.id}`), { score: players[loser.id].score });
    });

    set(ref(db, `players/${playerId}`), players[playerId]);

    resetRound();
}

// Reset round logic
function resetRound() {
    roundActive = false;
    currentNumbers.clear();
    Object.keys(players).forEach(id => players[id].number = null);
    set(ref(db, 'players/'), players);
    updateUI();
}

// Check if round should end
function checkEndRound() {
    const remainingPlayers = Object.values(players).filter(player => player.number !== null);
    if (remainingPlayers.length === 1) {
        wonRound(remainingPlayers[0].playerId);
    }
}

// Reset game function (Amir Z only)
function resetGame() {
    if (playerName !== "Amir Z") return;

    remove(ref(db, 'players/')).then(() => {
        alert("Game has been reset!");
        location.reload();
    });
}

// Update scoreboard function
function updateScoreboard() {
    onValue(ref(db, 'players/'), (snapshot) => {
        const scoreboard = document.getElementById("scoreboard");
        scoreboard.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            Object.values(data).forEach(player => {
                const row = `<tr><td>${player.name}</td><td>${player.score}</td><td>${player.roundsWon}</td></tr>`;
                scoreboard.innerHTML += row;
            });
        }
    });
}

window.joinGame = joinGame;
window.pickNumber = pickNumber;
window.eliminated = eliminated;
window.wonRound = wonRound;
window.resetGame = resetGame;
