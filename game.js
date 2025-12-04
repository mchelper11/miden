const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

canvas.width = 400;
canvas.height = 600;

let bird = {
    x: 80,
    y: 260,
    width: 51,
    height: 36,
    velocity: 0,
    gravity: 0.5,
    lift: -8.5
};

let pipes = [];
let frameCount = 0;
let score = 0;
let gameStarted = false;
let gameEnded = false;
const pipeGap = 160;
const pipeWidth = 65;
const pipeSpeed = 2.3;

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');
    bird.velocity = bird.lift;
}

function restartGame() {
    bird.y = 260;
    bird.velocity = 0;
    pipes = [];
    frameCount = 0;
    score = 0;
    gameEnded = false;
    gameStarted = false;
    scoreElement.textContent = score;
    finalScoreElement.textContent = score;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

function createPipe() {
    const minHeight = 60;
    const maxTop = canvas.height - pipeGap - minHeight - 60;
    const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight,
        bottomY: topHeight + pipeGap,
        passed: false
    });
}

let astronautImg = new Image();
astronautImg.src = 'astronaut.png'; // Твоя картинка

function drawBird() {
    ctx.drawImage(astronautImg, bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
    ctx.fillStyle = '#2ecc71';
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 3;

    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);

        ctx.fillStyle = '#27ae60';
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, pipeWidth + 8, 20);
        ctx.fillRect(pipe.x - 4, pipe.bottomY, pipeWidth + 8, 20);
        ctx.fillStyle = '#2ecc71';
    });
}

function checkCollision() {
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        return true;
    }

    for (const pipe of pipes) {
        if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipeWidth) {
            if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
                return true;
            }
        }
    }
    return false;
}

function update() {
    if (!gameStarted || gameEnded) return;

    frameCount++;
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (frameCount % 120 === 0) createPipe();

    pipes.forEach((pipe, index) => {
        pipe.x -= pipeSpeed;

        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = score;
        }

        if (pipe.x + pipeWidth < 0) pipes.splice(index, 1);
    });

    if (checkCollision()) {
        gameEnded = true;
        finalScoreElement.textContent = score;
        gameOverScreen.classList.remove('hidden');
    }
}

function drawBackground() {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    drawBackground();
    drawPipes();
    drawBird();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (!gameStarted) {
            startGame();
        } else if (!gameEnded) {
            bird.velocity = bird.lift;
        }
    }
});

canvas.addEventListener('click', () => {
    if (!gameStarted) {
        startGame();
    } else if (!gameEnded) {
        bird.velocity = bird.lift;
    }
});

gameLoop();
