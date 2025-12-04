const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// -----------------------
// Змінні гри
// -----------------------
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('spaceFlappyBest') || 0;
let gamePlaying = false;
let gameSpeed = 3;

// UI елементи
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');

// -----------------------
// Завантажуємо astronaut.png
// -----------------------
const astronautImg = new Image();
astronautImg.src = 'astronaut.png';

// після завантаження → запуск гри
astronautImg.onload = () => {
    console.log("Astronaut loaded");
    initGame();
};

astronautImg.onerror = () => {
    console.warn("Cannot load astronaut.png");
    initGame();
};

// -----------------------
// Ініціалізація
// -----------------------
function initGame() {
    updateUI();
    drawStaticFrame();
    setupEventListeners();
}

// -----------------------
// Зірки (фон)
// -----------------------
const stars = [];
for (let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2
    });
}

function drawBackground() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.twinkle += 0.05;
        ctx.globalAlpha = star.alpha * (0.7 + 0.3 * Math.sin(star.twinkle));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF";
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// -----------------------
// АСТРОНАВТ (оновлено повністю)
// -----------------------
const astronaut = {
    x: 80,
    y: 250,

    width: 85,    // твій реальний розмір PNG
    height: 117,  // твій реальний розмір PNG

    vx: 0,
    vy: 0,
    gravity: 0.32,
    jumpPower: 6.4,

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        ctx.rotate(this.vx * 0.08); // приємне легке обертання

        if (astronautImg.complete && astronautImg.naturalWidth > 0) {
            ctx.drawImage(
                astronautImg,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
        } else {
            // fallback — рідко використається, тільки якщо PNG не знайдено
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    update() {
        this.vy += this.gravity;
        this.y += this.vy;
        this.vx *= 0.96;

        if (this.y + this.height > canvas.height - 20) {
            gameOver();
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }
    },

    jump() {
        this.vy = -this.jumpPower;
        this.vx += 0.35;
    },

    reset() {
        this.y = 250;
        this.vy = 0;
        this.vx = 0;
    }
};

// -----------------------
// Труби
// -----------------------
const pipes = {
    items: [],
    width: 75,
    gap: 165,
    speed: gameSpeed,

    draw() {
        ctx.fillStyle = "#2ecc71";
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#00ff00";
        ctx.shadowBlur = 10;

        this.items.forEach(pipe => {
            ctx.fillRect(pipe.x, 0, this.width, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, this.width, pipe.topHeight);

            const bottomY = pipe.topHeight + this.gap;
            ctx.fillRect(pipe.x, bottomY, this.width, canvas.height - bottomY);
            ctx.strokeRect(pipe.x, bottomY, this.width, canvas.height - bottomY);
        });

        ctx.shadowBlur = 0;
    },

    update() {
        if (frames % 95 === 0) {
            const topHeight = 40 + Math.random() * (canvas.height - this.gap - 140);
            this.items.push({
                x: canvas.width,
                topHeight,
                passed: false
            });

            if (Math.random() > 0.45) {
                bonuses.items.push({
                    x: canvas.width + this.width / 2,
                    y: topHeight + this.gap / 2,
                    collected: false
                });
            }
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const pipe = this.items[i];
            pipe.x -= this.speed;

            if (pipe.x + this.width < 0) {
                this.items.splice(i, 1);
                continue;
            }

            const hit =
                astronaut.x + astronaut.width / 2 > pipe.x &&
                astronaut.x - astronaut.width / 2 < pipe.x + this.width &&
                (astronaut.y < pipe.topHeight ||
                 astronaut.y + astronaut.height > pipe.topHeight + this.gap);

            if (hit) {
                gameOver();
                return;
            }

            if (pipe.x + this.width < astronaut.x && !pipe.passed) {
                score++;
                scoreEl.textContent = score;
                pipe.passed = true;
            }
        }
    },

    reset() {
        this.items = [];
    }
};

// -----------------------
// Бонуси
// -----------------------
const bonuses = {
    items: [],
    radius: 14,

    draw() {
        this.items.forEach(bonus => {
            if (bonus.collected) return;

            ctx.save();
            ctx.shadowColor = "#FF4500";
            ctx.shadowBlur = 15;

            ctx.fillStyle = "#FF4500";
            ctx.beginPath();
            ctx.arc(bonus.x, bonus.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#FFF";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("+5", bonus.x, bonus.y + 1);

            ctx.restore();
        });
    },

    update() {
        for (let i = bonuses.items.length - 1; i >= 0; i--) {
            const bonus = bonuses.items[i];
            bonus.x -= gameSpeed;

            const dx = astronaut.x + astronaut.width / 2 - bonus.x;
            const dy = astronaut.y + astronaut.height / 2 - bonus.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < astronaut.width / 2 + this.radius && !bonus.collected) {
                bonus.collected = true;
                score += 5;
                scoreEl.textContent = score;
            }

            if (bonus.x + this.radius < 0) {
                bonuses.items.splice(i, 1);
            }
        }
    },

    reset() {
        this.items = [];
    }
};

// -----------------------
// Основна логіка
// -----------------------
function updateUI() {
    bestScoreEl.textContent = highScore;
    scoreEl.textContent = score;
}

function drawStaticFrame() {
    drawBackground();
}

function gameLoop() {
    if (!gamePlaying) return;

    drawBackground();

    pipes.update();
    pipes.draw();

    bonuses.update();
    bonuses.draw();

    astronaut.update();
    astronaut.draw();

    frames++;
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gamePlaying = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceFlappyBest', highScore);
    }

    finalScoreEl.textContent = score;
    bestScoreEl.textContent = highScore;
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    astronaut.reset();
    pipes.reset();
    bonuses.reset();
    score = 0;
    frames = 0;

    updateUI();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gamePlaying = true;

    gameLoop();
}

function setupEventListeners() {
    document.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gamePlaying) astronaut.jump();
            else resetGame();
        }
    });

    canvas.addEventListener('click', () => {
        if (gamePlaying) astronaut.jump();
        else resetGame();
    });

    restartBtn.addEventListener('click', e => {
        e.stopPropagation();
        resetGame();
    });
}
