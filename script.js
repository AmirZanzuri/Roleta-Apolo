import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, push, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Initialize Firebase
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

const dbRef = ref(db, 'game/');

// Join game function
function joinGame() {
    const nameInput = document.getElementById("player-name");
    const playerName = nameInput.value.trim();
    if (!playerName) return alert("Please enter your name");
    
    playerId = Math.random().toString(36).substr(2, 9); // Generate random ID
    players[playerId] = { name: playerName, score: 0, number: null };
    
    // Save player to Firebase
    set(ref(db, `players/${playerId}`), players[playerId]);
    
    document.getElementById("join-game").style.display = "none";
    document.getElementById("game-area").style.display = "block";
    updateScoreboard();
}

// Pick number function
function pickNumber() {
    if (!playerId || players[playerId].number !== null) return;
    
    let number;
    do {
        number = Math.floor(Math.random() * 15) + 1;
    } while (currentNumbers.has(number));
    
    currentNumbers.add(number);
    players[playerId].number = number;
    
    // Save number to Firebase
    set(ref(db, `players/${playerId}/number`), number);
    document.getElementById("your-number").innerText = `Your Number: ${number}`;
    document.getElementById("your-number").style.display = "block";
}

// Eliminated function
function eliminated() {
    if (!playerId || players[playerId].number === null) return;
    alert(`Player ${players[playerId].name} was eliminated. Number: ${players[playerId].number}`);
    currentNumbers.delete(players[playerId].number);
    players[playerId].number = null;
    
    // Remove eliminated player from Firebase
    set(ref(db, `players/${playerId}/number`), null);
}

// Won round function
function wonRound() {
    if (!playerId || players[playerId].number === null) return;
    alert(`Player ${players[playerId].name} won the round! Number: ${players[playerId].number}`);
    
    // Distribute points (assuming each player contributes 10 points for now)
    let totalPoints = Object.keys(players).length * 10;
    players[playerId].score += totalPoints;
    
    // Save updated score to Firebase
    set(ref(db, `players/${playerId}/score`), players[playerId].score);
    
    // Reset for next round
    currentNumbers.clear();
    Object.keys(players).forEach(id => players[id].number = null);
    updateScoreboard();
}

// Update scoreboard function
function updateScoreboard() {
    const scoreboard = document.getElementById("scoreboard");
    scoreboard.innerHTML = "";
    
    // Get players from Firebase and update scoreboard
    onValue(ref(db, 'players/'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            Object.values(data).forEach(player => {
                const row = document.createElement("tr");
                row.innerHTML = `<td>${player.name}</td><td>${player.score}</td>`;
                scoreboard.appendChild(row);
            });
        }
    });
}

// Make functions globally available
window.joinGame = joinGame;
window.pickNumber = pickNumber;
window.eliminated = eliminated;
window.wonRound = wonRound;