const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = canvas.width = 900;
const GAME_HEIGHT = canvas.height = 600;
const GROUND_LEVEL = GAME_HEIGHT - 60;

let backgroundImage = new Image();
backgroundImage.src = 'bg.avif';

// Load bullet fire sound
const bulletSound = new Audio('Gunshot.mp3');

let survivor, gameOver, gamePaused, tracing, traceStartX, traceStartY, traceEndX, traceEndY, score, timeRemaining, zombies, bullets, blocks;
const zombieSpeed = 1;
const bulletSpeed = 7;
const gravity = 0.3;
const jumpStrength = -5;
const keys = {};
const blockHealth = 3; // Blocks can take 3 hits before being destroyed
const shootingCooldown = 300; // 300ms cooldown for shooting
let lastShootTime = 0;

function initGame() {
    survivor = {
        x: canvas.width / 2,
        y: GROUND_LEVEL,
        width: 30,
        height: 30,
        health: 200,
        isAlive: true,
        speed: 5,
        vy: 0, // Vertical velocity for jumping
        onGround: true
    };

    gameOver = false;
    gamePaused = false;
    tracing = false;
    traceStartX = 0;
    traceStartY = 0;
    traceEndX = 0;
    traceEndY = 0;
    score = 0;
    timeRemaining = 300; // 5 minutes in seconds
    zombies = [];
    bullets = [];

    blocks = [
        { x: survivor.x - 90, y: GROUND_LEVEL - 30, width: 30, height: 30, health: blockHealth },
        { x: survivor.x - 60, y: GROUND_LEVEL - 30, width: 30, height: 30, health: blockHealth },
        { x: survivor.x - 90, y: GROUND_LEVEL - 60, width: 30, height: 30, health: blockHealth },
        { x: survivor.x - 60, y: GROUND_LEVEL - 60, width: 30, height: 30, health: blockHealth },
        { x: survivor.x + 60, y: GROUND_LEVEL - 30, width: 30, height: 30, health: blockHealth },
        { x: survivor.x + 90, y: GROUND_LEVEL - 30, width: 30, height: 30, health: blockHealth },
        { x: survivor.x + 60, y: GROUND_LEVEL - 60, width: 30, height: 30, health: blockHealth },
        { x: survivor.x + 90, y: GROUND_LEVEL - 60, width: 30, height: 30, health: blockHealth }
    ];

    document.getElementById('scoreValue').innerText = score;
    document.getElementById('timerValue').innerText = '05:00';
    gameLoop();
}

function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawSurvivor() {
    drawRect(survivor.x - survivor.width / 2, survivor.y - survivor.height, survivor.width, survivor.height, 'blue'); // Body
    drawRect(survivor.x - survivor.width / 4, survivor.y - survivor.height - 10, survivor.width / 2, 10, 'blue'); // Head

    // Draw health bar
    const healthBarWidth = 50;
    const healthBarHeight = 5;
    const healthBarX = survivor.x - healthBarWidth / 2;
    const healthBarY = survivor.y - survivor.height - 30; // Height above the survivor's head
    drawRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight, 'red');
    drawRect(healthBarX, healthBarY, (survivor.health / 200) * healthBarWidth, healthBarHeight, 'green');
}

function drawZombie(zombie) {
    drawRect(zombie.x, zombie.y - zombie.height, zombie.width, zombie.height, 'green'); // Body
    drawRect(zombie.x + zombie.width / 4, zombie.y - zombie.height - 10, zombie.width / 2, 10, 'green'); // Head
}

function drawBullet(bullet) {
    drawRect(bullet.x, bullet.y, bullet.width, bullet.height, 'red');
}

function drawTraceLine() {
    if (tracing) {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.moveTo(traceStartX, traceStartY);
        ctx.lineTo(traceEndX, traceEndY);
        ctx.stroke();
    }
}

function drawBlocks() {
    blocks.forEach(block => {
        drawRect(block.x, block.y, block.width, block.height, 'red');
    });
}

function spawnZombie() {
    const x = Math.random() > 0.5 ? 0 : canvas.width - 40;
    const y = GROUND_LEVEL;
    zombies.push({ x, y, width: 30, height: 30, speed: zombieSpeed, direction: x === 0 ? 'right' : 'left' });
}

function update() {
    if (!survivor.isAlive) {
        gameOver = true;
        saveScore(score);
        alert(`Game Over! Your score: ${score}`);
        displayLeaderboard();
        return;
    }

    // Apply gravity
    survivor.vy += gravity;
    survivor.y += survivor.vy;

    // Prevent falling below ground level
    if (survivor.y > GROUND_LEVEL) {
        survivor.y = GROUND_LEVEL;
        survivor.vy = 0;
        survivor.onGround = true;
    }

    // Move zombies
    zombies.forEach((zombie, index) => {
        if (zombie.direction === 'left') {
            zombie.x -= zombie.speed;
        } else {
            zombie.x += zombie.speed;
        }

        // Check collision with blocks
        blocks.forEach((block, bIndex) => {
            if (zombie.x < block.x + block.width &&
                zombie.x + zombie.width > block.x &&
                zombie.y === block.y + block.height) {
                block.health--;
                if (block.health <= 0) blocks.splice(bIndex, 1); // Remove block if health is 0
            }
        });

        // Check collision with survivor
        if (zombie.y === survivor.y &&
            zombie.x + zombie.width > survivor.x - survivor.width / 2 &&
            zombie.x < survivor.x + survivor.width / 2) {
            survivor.health -= 2; // Zombie damages the survivor
            if (survivor.health <= 0) survivor.isAlive = false;
        }
    });

    // Move bullets
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.vy += gravity; // Apply gravity to the bullet's vertical velocity

        // Check collision with zombies
        zombies.forEach((zombie, zIndex) => {
            if (bullet.x < zombie.x + zombie.width &&
                bullet.x + bullet.width > zombie.x &&
                bullet.y < zombie.y &&
                bullet.y + bullet.height > zombie.y - zombie.height) {
                zombies.splice(zIndex, 1);
                bullets.splice(index, 1);
                score += 10; // Increase score for each zombie killed
                document.getElementById('scoreValue').innerText = score;
            }
        });

        // Remove bullets that are out of bounds
        if (bullet.y > canvas.height || bullet.x > canvas.width || bullet.x < 0) {
            bullets.splice(index, 1);
        }
    });

    
    // Handle survivor movement
    if (keys['ArrowLeft'] && survivor.x > survivor.width / 2) {
        // Check if there's a block to the left of the survivor
        let canMoveLeft = true;
        blocks.forEach(block => {
            if (
                survivor.x - survivor.speed <= block.x + block.width &&
                survivor.x > block.x &&
                block.y === GROUND_LEVEL - block.height
            ) {
                canMoveLeft = false;
            }
        });
        if (canMoveLeft) {
            survivor.x -= survivor.speed;
        }
    }
    if (keys['ArrowRight'] && survivor.x < canvas.width - survivor.width / 2) {
        // Check if there's a block to the right of the survivor
        let canMoveRight = true;
        blocks.forEach(block => {
            if (
                survivor.x + survivor.speed >= block.x &&
                survivor.x < block.x + block.width &&
                block.y === GROUND_LEVEL - block.height
            ) {
                canMoveRight = false;
            }
        });
        if (canMoveRight) {
            survivor.x += survivor.speed;
        }
    }
    if (keys['ArrowUp'] && survivor.onGround) {
        survivor.vy = jumpStrength;
        survivor.onGround = false;
    }
}
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT); // Draw the background image
    drawSurvivor();
    zombies.forEach(zombie => drawZombie(zombie));
    bullets.forEach(bullet => drawBullet(bullet));
    drawBlocks();
    drawTraceLine();
}

function gameLoop() {
    if (gameOver) {
        return;
    }
    if (!gamePaused) {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function updateTimer() {
    if (timeRemaining > 0) {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        document.getElementById('timerValue').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        gameOver = true;
    }
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') {
        gamePaused = !gamePaused;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousedown', (e) => {
    tracing = true;
    traceStartX = survivor.x;
    traceStartY = survivor.y - survivor.height / 2;
    traceEndX = e.offsetX;
    traceEndY = e.offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (tracing) {
        traceEndX = e.offsetX;
        traceEndY = e.offsetY;
    }
});

canvas.addEventListener('mouseup', (e) => {
    tracing = false;
    const currentTime = Date.now();
    if (currentTime - lastShootTime >= shootingCooldown) {
        const dx = traceEndX - traceStartX;
        const dy = traceEndY - traceStartY;
        const angle = Math.atan2(dy, dx);
        const vx = bulletSpeed * Math.cos(angle);
        const vy = bulletSpeed * Math.sin(angle);
        bullets.push({
            x: survivor.x,
            y: survivor.y - survivor.height / 2,
            width: 10,
            height: 4,
            vx: vx,
            vy: vy
        });
        bulletSound.currentTime = 0; // Reset sound to start for overlapping plays
        bulletSound.play(); // Play bullet sound
        lastShootTime = currentTime;
    }
});

function saveScore(score) {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboard.push(score);
    leaderboard.sort((a, b) => b - a);
    leaderboard = leaderboard.slice(0, 10); // Keep only top 10 scores
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

function displayLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    let leaderboardHtml = '<h2>Leaderboard</h2><ol>';
    leaderboard.forEach((score, index) => {
        leaderboardHtml += `<li>${score}</li>`;
    });
    leaderboardHtml += '</ol>';
    document.body.innerHTML = leaderboardHtml;
}

setInterval(() => {
    if (!gamePaused) spawnZombie();
}, 1000);

setInterval(() => {
    if (!gamePaused) updateTimer();
}, 1000);

backgroundImage.onload = () => {
    initGame();
};

