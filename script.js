var gameboard = Array(16).fill(0);
gameboard[0] = 2;
gameboard[1] = 2;
gameboard[2] = 4;
gameboard[3] = 8;
let GAME = {
    'boardSize': 16,
    'tileValues': [2, 4],
};


var gameboardDiv = document.getElementById("gameboard");
renderGameboard();

function renderGameboard() {
    gameboardDiv.innerHTML = "";
    for (let i = 0; i < GAME['boardSize']; i++) {
        let cellDiv = document.createElement("div");
        cellDiv.className = "cell";     

        let tileDiv = document.createElement("div");
        tileDiv.className = "tile tile-" + gameboard[i];
        if (gameboard[i] === 0) {
            tileDiv.textContent = " ";
        } else {
            tileDiv.textContent = gameboard[i];
        }
        cellDiv.appendChild(tileDiv);
        gameboardDiv.appendChild(cellDiv);

    }
}

var score = 0;
document.onkeydown = function (e) {
    // only handle arrow keys
    if (![37, 38, 39, 40].includes(e.keyCode)) return;

    const before = gameboard.slice();  // copy
    move(e.keyCode);

    // did anything change?
    let changed = false;
    for (let i = 0; i < GAME.boardSize; i++) {
        if (gameboard[i] !== before[i]) { changed = true; break; }
    }

    if (changed) addRandomTile();
    renderGameboard();
};


function move(keycode) {
    switch (keycode) {
        case 37: moveLeft(); break;
        case 38: moveUp(); break;
        case 39: moveRight(); break;
        case 40: moveDown(); break;
    }
}
function moveLeft() {

    for (let row = 0; row < 16; row += 4) {
        let pointer = row;
        let elementCount = 0;

        for (let i = row + 0; i < row + 4; i++) {
            if (gameboard[i] != 0) {
                if (pointer != i) {
                    gameboard[pointer] = gameboard[i];
                    gameboard[i] = 0;
                }
                pointer++;
                elementCount++;
            }
        }
        if (elementCount > 1) {
            for (let i = row; i < row + elementCount - 1; i++) {
                if (gameboard[i] == gameboard[i + 1]) {
                    gameboard[i] *= 2;
                    gameboard[i + 1] = 0;
                    score += gameboard[i];
                    i++;
                }
            }
            pointer = row;
            for (let i = row; i < row + 4; i++) {
                if (gameboard[i] != 0) {
                    if (pointer != i) {
                        gameboard[pointer] = gameboard[i];
                        gameboard[i] = 0;
                    }
                    pointer++;
                }
            }
        }

    }

}

function moveRight() {

    for (let row = 0; row < 16; row += 4) {
        let pointer = row + 3;
        let elementCount = 0;

        // 1) pack right
        for (let i = row + 3; i >= row; i--) {
            if (gameboard[i] != 0) {
                if (pointer != i) {
                    gameboard[pointer] = gameboard[i];
                    gameboard[i] = 0;
                }
                pointer--;
                elementCount++;
            }
        }

        // 2) merge right (right-to-left)
        if (elementCount > 1) {
            for (let i = row + 3; i > row + 3 - elementCount; i--) {
                if (gameboard[i] == gameboard[i - 1]) {
                    gameboard[i] *= 2;
                    gameboard[i - 1] = 0;
                    score += gameboard[i];
                    i--; // skip next to avoid double-merge
                }
            }

            // 3) pack right again (remove holes)
            pointer = row + 3;
            for (let i = row + 3; i >= row; i--) {
                if (gameboard[i] != 0) {
                    if (pointer != i) {
                        gameboard[pointer] = gameboard[i];
                        gameboard[i] = 0;
                    }
                    pointer--;
                }
            }
        }
    }
}

function moveUp() {
    for (let col = 0; col < 4; col++) {
        let pointer = col;       // top cell in this column
        let elementCount = 0;

        // 1) pack up
        for (let i = col; i < 16; i += 4) {
            if (gameboard[i] != 0) {
                if (pointer != i) {
                    gameboard[pointer] = gameboard[i];
                    gameboard[i] = 0;
                }
                pointer += 4;
                elementCount++;
            }
        }

        // 2) merge up
        if (elementCount > 1) {
            let start = col;
            let end = col + (elementCount - 1) * 4; // last packed tile index
            for (let i = start; i < end; i += 4) {
                if (gameboard[i] == gameboard[i + 4]) {
                    gameboard[i] *= 2;
                    gameboard[i + 4] = 0;
                    score += gameboard[i];
                    i += 4; // skip next to avoid double-merge
                }
            }

            // 3) pack up again
            pointer = col;
            for (let i = col; i < 16; i += 4) {
                if (gameboard[i] != 0) {
                    if (pointer != i) {
                        gameboard[pointer] = gameboard[i];
                        gameboard[i] = 0;
                    }
                    pointer += 4;
                }
            }
        }
    }
}

function moveDown() {
    for (let col = 0; col < 4; col++) {
        let pointer = col + 12;  // bottom cell in this column
        let elementCount = 0;

        // 1) pack down
        for (let i = col + 12; i >= col; i -= 4) {
            if (gameboard[i] != 0) {
                if (pointer != i) {
                    gameboard[pointer] = gameboard[i];
                    gameboard[i] = 0;
                }
                pointer -= 4;
                elementCount++;
            }
        }

        // 2) merge down
        if (elementCount > 1) {
            let start = col + 12;
            let end = col + 12 - (elementCount - 1) * 4; // last packed tile index upward
            for (let i = start; i > end; i -= 4) {
                if (gameboard[i] == gameboard[i - 4]) {
                    gameboard[i] *= 2;
                    gameboard[i - 4] = 0;
                    score += gameboard[i];
                    i -= 4; // skip next to avoid double-merge
                }
            }

            // 3) pack down again
            pointer = col + 12;
            for (let i = col + 12; i >= col; i -= 4) {
                if (gameboard[i] != 0) {
                    if (pointer != i) {
                        gameboard[pointer] = gameboard[i];
                        gameboard[i] = 0;
                    }
                    pointer -= 4;
                }
            }
        }
    }
}

function addRandomTile() {
    let emptyIndices = []; // Collect all empty cell indices
    for (let i = 0; i < GAME['boardSize']; i++) {
        if (gameboard[i] === 0) {
            emptyIndices.push(i);
        }
    }
    if (emptyIndices.length === 0) return; // No empty cells available

    // Select a random empty cell
    let randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    // Assign a random tile value (2 or 4)
    let tileValue = GAME['tileValues'][Math.floor(Math.random() * GAME['tileValues'].length)];
    gameboard[randomIndex] = tileValue;
}