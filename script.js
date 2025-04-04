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
let roundActive = true; // Changed to true by default
let roundsPlayed = 0;
let pointsPerRound = 10;
let isPickingNumber = false; // Flag to prevent concurrent pickNumber calls
const maxAvailableNumber = 15; // Set the maximum available number
const LOCAL_STORAGE_PLAYER_ID_KEY = 'roletaApoloPlayerId';

// Update UI elements
function updateUI() {
    const roundsPlayedElement = document.getElementById("rounds-played");
    const roundStatusElement = document.getElementById("round-status");
    const resetGameButton = document.getElementById("reset-game");
    const adminControlsDiv = document.getElementById("admin-controls");
    const adminActionsHeader = document.querySelector("#scoreboard th:nth-child(4)"); // Select the 4th th in the scoreboard
    const joinGameDiv = document.getElementById("join-game");
    const gameAreaDiv = document.getElementById("game-area");

    if (roundsPlayedElement) roundsPlayedElement.innerText = roundsPlayed;
    if (roundStatusElement) roundStatusElement.innerText = roundActive ? "Active" : "Not Active";

    if (playerName === "Amir Z") {
        if (resetGameButton) resetGameButton.style.display = "block";
        if (adminControlsDiv) adminControlsDiv.style.display = "block";
        if (adminActionsHeader) adminActionsHeader.style.display = "table-cell";
    } else {
        if (resetGameButton) resetGameButton.style.display = "none";
        if (adminControlsDiv) adminControlsDiv.style.display = "none";
        if (adminActionsHeader) adminActionsHeader.style.display = "none";
    }

    // Update visibility of game areas based on playerId
    if (playerId) {
        if (joinGameDiv) joinGameDiv.style.display = "none";
        if (gameAreaDiv) gameAreaDiv.style.display = "block";
    } else {
        if (joinGameDiv) joinGameDiv.style.display = "block";
        if (gameAreaDiv) gameAreaDiv.style.display = "none";
    }
}

// Function to create a new player in Firebase and store their ID locally
function createNewPlayer(nameInput, joinGameDiv, gameAreaDiv) {
    playerName = nameInput.value.trim();
    playerId = Math.random().toString(36).substr(2, 9);
    players[playerId] = { name: playerName, score: 0, number: null, roundsWon: 0 };

    set(ref(db, `players/${playerId}`), players[playerId]);
    localStorage.setItem(LOCAL_STORAGE_PLAYER_ID_KEY, playerId); // Store the ID

    if (joinGameDiv) joinGameDiv.style.display = "none";
    if (gameAreaDiv) gameAreaDiv.style.display = "block";
    updateUI();
    console.log("New player joined:", playerName, playerId);
}

// Join game function
function joinGame() {
    const nameInput = document.getElementById("player-name");
    const joinGameDiv = document.getElementById("join-game");
    const gameAreaDiv = document.getElementById("game-area");

    playerName = nameInput.value.trim();
    if (!playerName) return alert("Please enter your name");

    let storedPlayerId = localStorage.getItem(LOCAL_STORAGE_PLAYER_ID_KEY);

    if (storedPlayerId) {
        // Check if this playerId exists in Firebase
        get(ref(db, `players/${storedPlayerId}`)).then((snapshot) => {
            if (snapshot.exists()) {
                // Existing user, update their name (if changed) and reuse ID
                playerId = storedPlayerId;
                update(ref(db, `players/${playerId}`), { name: playerName });
                players[playerId] = snapshot.val(); // Update local players object
                if (joinGameDiv) joinGameDiv.style.display = "none";
                if (gameAreaDiv) gameAreaDiv.style.display = "block";
                updateUI();
                console.log("Re-logged in as existing player:", playerName, playerId);
            } else {
                // Stored ID not found in Firebase, treat as new user
                createNewPlayer(nameInput, joinGameDiv, gameAreaDiv);
            }
        }).catch((error) => {
            console.error("Error checking for existing player:", error);
            createNewPlayer(nameInput, joinGameDiv, gameAreaDiv); // Treat as new user on error
        });
    } else {
        // No stored ID, treat as new user
        createNewPlayer(nameInput, joinGameDiv, gameAreaDiv);
    }
}

// Update scoreboard function
function updateScoreboard() {
    const scoreboard = document.getElementById("scoreboard");
    if (!scoreboard) return;
    scoreboard.innerHTML = "";

    Object.entries(players).forEach(([id, player]) => {
        const row = scoreboard.insertRow();

        // Create player name, score, and rounds won cells
        const nameCell = row.insertCell();
        nameCell.textContent = player.name;

        const scoreCell = row.insertCell();
        scoreCell.textContent = player.score || 0;

        const roundsWonCell = row.insertCell();
        roundsWonCell.textContent = player.roundsWon || 0;

        // Add admin actions if current player is Amir Z
        if (playerName === "Amir Z") {
            const actionsCell = row.insertCell();
            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.onclick = () => removePlayer(id);
            actionsCell.appendChild(removeButton);
        }
    });
}

// Pick number function
function pickNumber() {
    const yourNumberElement = document.getElementById("your-number");
    const pickNumberButton = document.getElementById("pick-number");

    if (!playerId || !players[playerId]) {
        return alert("You need to join the game first!");
    }

    if (isPickingNumber) {
        return; // Prevent concurrent execution
    }
    isPickingNumber = true;

    get(ref(db, `players/${playerId}/number`)).then((snapshot) => {
        const currentNumber = snapshot.val();

        if (currentNumber !== null) {
            alert("You already picked a number for this round!");
            return;
        }

        // Generate random numbers from 1 to maxAvailableNumber that haven't been picked yet
        let availableNumbers = [];
        for (let i = 1; i <= maxAvailableNumber; i++) {
            if (!currentNumbers.has(i)) {
                availableNumbers.push(i);
            }
        }

        // If no numbers left
        if (availableNumbers.length === 0) {
            alert("No more numbers available!");
            return;
        }

        // Select random number from available numbers
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const selectedNumber = availableNumbers[randomIndex];

        // Update the player's number in Firebase
        update(ref(db, `players/${playerId}`), { number: selectedNumber })
            .then(() => {
                console.log("Successfully updated number for:", playerId, selectedNumber);
                // Add to current numbers set
                currentNumbers.add(selectedNumber);
                set(ref(db, 'gameState/currentNumbers'), Array.from(currentNumbers)); // Changed to set()

                // Display the number to the player
                if (yourNumberElement) {
                    yourNumberElement.innerText = `Your number: ${selectedNumber}`;
                    yourNumberElement.style.display = "block";
                }

                // Disable the pick number button
                if (pickNumberButton) pickNumberButton.disabled = true;

                // Ensure round is active
                if (!roundActive) {
                    roundActive = true;
                    update(ref(db, 'gameState/'), {
                        roundActive: true
                    });
                    updateUI();
                }
            })
            .catch((error) => {
                console.error("Error updating number:", error);
                alert("An error occurred while picking your number.");
            })
            .finally(() => {
                isPickingNumber = false; // Allow picking again
            });
    }).catch((error) => {
        console.error("Error checking player number:", error);
        alert("An error occurred while checking your number.");
        isPickingNumber = false; // Release the lock on error
    });
}

function eliminated() {
    const yourNumberElement = document.getElementById("your-number");
    const pickNumberButton = document.getElementById("pick-number");

    if (!playerId || !players[playerId] || players[playerId].number === null) {
        return alert("You haven't picked a number for this round!");
    }

    // Reset player's number for next round
    update(ref(db, `players/${playerId}`), { number: null });

    // Hide the number display and enable pick button for next round
    if (yourNumberElement) yourNumberElement.style.display = "none";
    if (pickNumberButton) pickNumberButton.disabled = false;
}

function wonRound() {
    if (!playerId || !players[playerId] || players[playerId].number === null) {
        return alert("You haven't picked a number for this round!");
    }

    const winningPlayerId = playerId;
    const numberOfPlayers = Object.keys(players).length;
    let updates = {};

    // Calculate points to add to the winner
    const pointsToAdd = (numberOfPlayers - 1) * pointsPerRound;
    const currentWinnerScore = players[winningPlayerId].score || 0;
    updates[`players/${winningPlayerId}/score`] = currentWinnerScore + pointsToAdd;
    updates[`players/${winningPlayerId}/roundsWon`] = (players[winningPlayerId].roundsWon || 0) + 1;
    updates[`players/${winningPlayerId}/number`] = null;

    // Deduct points from other players who participated in the round
    for (const id in players) {
        if (id !== winningPlayerId && players[id].number !== null) {
            const currentLoserScore = players[id].score || 0;
            updates[`players/${id}/score`] = currentLoserScore - pointsPerRound; // Removed Math.max(0, ...)
            updates[`players/${id}/number`] = null; // Reset their number
        }
    }

    update(ref(db), updates)
        .then(() => {
            // Reset current numbers for next round
            currentNumbers.clear();
            set(ref(db, 'gameState/currentNumbers'), []);

            // Increment rounds played
            roundsPlayed++;
            update(ref(db, 'gameState/'), {
                roundsPlayed: roundsPlayed
            });

            // Hide the number display and enable pick button for next round
            const yourNumberElement = document.getElementById("your-number");
            const pickNumberButton = document.getElementById("pick-number");
            if (yourNumberElement) yourNumberElement.style.display = "none";
            if (pickNumberButton) pickNumberButton.disabled = false;
        })
        .catch((error) => {
            console.error("Error updating scores after round win:", error);
            alert("An error occurred after declaring the round winner.");
        });
}

function resetGame() {
    if (playerName !== "Amir Z") {
        return alert("Only Amir Z can reset the game!");
    }

    // Reset game state
    set(ref(db, 'gameState/'), {
        roundActive: true, // Always true by default
        roundsPlayed: 0,
        currentNumbers: [],
        pointsPerRound: pointsPerRound
    });

    // Reset all player data
    set(ref(db, 'players/'), {});

    // Reset local variables
    players = {};
    currentNumbers.clear();
    roundsPlayed = 0;
    playerId = null;
    playerName = "";

    // Update UI to reflect logout
    updateUI();
    const yourNumberElement = document.getElementById("your-number");
    const pickNumberButton = document.getElementById("pick-number");
    if (yourNumberElement) yourNumberElement.style.display = "none";
    if (pickNumberButton) pickNumberButton.disabled = false;
}

function updatePointsPerRound() {
    if (playerName !== "Amir Z") {
        return alert("Only Amir Z can change points per round!");
    }

    const pointsInput = document.getElementById("points-per-round");
    const newPoints = parseInt(pointsInput.value);

    if (isNaN(newPoints) || newPoints < 1) {
        return alert("Please enter a valid number of points!");
    }

    pointsPerRound = newPoints;
    update(ref(db, 'gameState/'), {
        pointsPerRound: pointsPerRound
    });

    alert(`Points per round updated to ${pointsPerRound}`);
}

function removePlayer(playerIdToRemove) {
    if (playerName !== "Amir Z") {
        return alert("Only Amir Z can remove players!");
    }

    if (players[playerIdToRemove] && confirm(`Are you sure you want to remove ${players[playerIdToRemove].name}?`)) {
        remove(ref(db, `players/${playerIdToRemove}`));
    }
}

function toggleRound() {
    if (playerName !== "Amir Z") {
        return alert("Only Amir Z can toggle round status!");
    }

    roundActive = !roundActive;
    update(ref(db, 'gameState/'), {
        roundActive: roundActive
    });

    // If starting a new round, clear current numbers and reset player numbers
    if (roundActive) {
        currentNumbers.clear();
        set(ref(db, 'gameState/currentNumbers'), []); // Use set to clear the array

        const updates = {};
        Object.keys(players).forEach(pid => {
            updates[`players/${pid}/number`] = null;
        });
        update(ref(db), updates);

        const yourNumberElement = document.getElementById("your-number");
        const pickNumberButton = document.getElementById("pick-number");
        if (yourNumberElement) yourNumberElement.style.display = "none";
        if (pickNumberButton) pickNumberButton.disabled = false;
    }

    updateUI();
}

// Make functions available globally
window.joinGame = joinGame;
window.updateScoreboard = updateScoreboard;
window.pickNumber = pickNumber;
window.eliminated = eliminated;
window.wonRound = wonRound;
window.resetGame = resetGame;
window.updatePointsPerRound = updatePointsPerRound;
window.removePlayer = removePlayer;
window.toggleRound = toggleRound;

// Initialize by checking if there's existing game state
get(ref(db, 'gameState/')).then((snapshot) => {
    const data = snapshot.val();
    if (data) {
        roundActive = data.roundActive !== undefined ? data.roundActive : true; // Default to true if not set
        roundsPlayed = data.roundsPlayed || 0;
        pointsPerRound = data.pointsPerRound || 10;
        updateUI(); // Initial UI update based on game state
    } else {
        // First time setup
        set(ref(db, 'gameState/'), {
            roundActive: true, // Set to true by default
            roundsPlayed: 0,
            currentNumbers: [],
            pointsPerRound: 10
        });
        updateUI(); // Initial UI update after setting default state
    }
});

onValue(ref(db, 'players/'), (snapshot) => {
    players = snapshot.val() || {};
    updateScoreboard();
    updateUI(); // Ensure UI reflects login/logout state
});