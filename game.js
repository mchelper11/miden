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
// Завантажуємо картинки
// -----------------------
const astronautImg = new Image();
astronautImg.src = 'astronaut.png';

const coinImg = new Image();
coinImg.src = 'coin.png';

// після завантаження → запуск гри
Promise.all([new Promise(r => astronautImg.onload = r), new Promise(r => coinImg.onload = r)])
    .then(() => {
        console.log("✅ All images loaded");
        initGame();
    })
    .catch(() => {
        console.warn("⚠️ Some images failed to load");
        initGame();
    });

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
// АСТРОНАВТ (нахил на ~30° при стрибку)
// -----------------------
const astronaut = {
    x: 80,
    y: 250,
    width: 45,
    height: 62,

    vy: 0,
    gravity: 0.32,
    jumpPower: 6.4,

    angle: 0, // кут повороту в радіанах (0 = прямо)

    draw() {
        ctx.save();

        // Малюємо відносно центру спрайта
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        if (astronautImg.complete && astronautImg.naturalWidth > 0) {
            ctx.drawImage(
                astronautImg,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
        } else {
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    update() {
        // Політ
        this.vy += this.gravity;
        this.y += this.vy;

        // Плавне повернення кута до 0 (вирівнювання)
        this.angle *= 0.9; // можна змінити на 0.85 / 0.95 для швидше/повільніше

        // Межі екрану
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

        // Нахил вправо приблизно на 30° (π / 6 радіан)
        const tilt30deg = Math.PI / 6;
        this.angle = tilt30deg;
    },

    reset() {
        this.y = 250;
        this.vy = 0;
        this.angle = 0;
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
// БОНУСИ (МОНЕТКИ)
// -----------------------
const bonuses = {
    items: [],
    coinSize: 32, // розмір монетки

    draw() {
        this.items.forEach(bonus => {
            if (bonus.collected) return;

            ctx.save();
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 20;

            if (coinImg.complete && coinImg.naturalWidth > 0) {
                ctx.drawImage(
                    coinImg,
                    bonus.x - this.coinSize / 2,
                    bonus.y - this.coinSize / 2,
                    this.coinSize,
                    this.coinSize
                );
            } else {
                const gradient = ctx.createRadialGradient(
                    bonus.x - 8, bonus.y - 8, 2,
                    bonus.x, bonus.y, this.coinSize / 2
                );
                gradient.addColorStop(0, "#FFD700");
                gradient.addColorStop(1, "#DAA520");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, this.coinSize / 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = "#FFF";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

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

            if (dist < astronaut.width / 2 + this.coinSize / 2 && !bonus.collected) {
                bonus.collected = true;
                score += 5;
                scoreEl.textContent = score;
            }

            if (bonus.x + this.coinSize / 2 < 0) {
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
