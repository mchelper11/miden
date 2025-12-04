const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Змінні гри
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

// Завантажуємо картинку космонавта
const astronautImg = new Image();
astronautImg.src = 'astronaut.png';

// Чекаємо завантаження картинки
astronautImg.onload = () => {
    console.log('✅ Astronaut image loaded');
    initGame();
};
astronautImg.onerror = () => {
    console.error('❌ Cannot load astronaut.png');
    // Малюємо заглушку якщо картинка не завантажилась
    initGame();
};

function initGame() {
    updateUI();
    drawStaticFrame();
    
    // Події
    setupEventListeners();
}

// --- ЗІРКИ ---
const stars = [];
for(let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2
    });
}

function drawBackground() {
    // Чорний фон
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Зірки з мерехтінням
    stars.forEach(star => {
        star.twinkle += 0.05;
        const twinkleAlpha = star.alpha * (0.7 + 0.3 * Math.sin(star.twinkle));
        
        ctx.save();
        ctx.globalAlpha = twinkleAlpha;
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// --- АСТРОНАВТ ---
const astronaut = {
    x: 80,
    y: 200,
    width: 40,
    height: 40,
    vx: 0,  // Обертання
    vy: 0,
    gravity: 0.3,
    jumpPower: 6.2,
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.vx * 0.1);
        
        if (astronautImg.complete && astronautImg.naturalHeight !== 0) {
            // Малюємо картинку
            ctx.drawImage(
                astronautImg,
                -this.width/2, -this.height/2,
                this.width, this.height
            );
        } else {
            // Заглушка - білий круг з шоломом
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = "#88CCFF";
            ctx.fillRect(-5, -12, 10, 8);
        }
        
        ctx.restore();
    },
    
    update() {
        this.vy += this.gravity;
        this.y += this.vy;
        this.vx *= 0.95; // Згасання обертання
        
        // Границі
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
        this.vx += 0.3; // Легке обертання при стрибку
    },
    
    reset() {
        this.y = 200;
        this.vy = 0;
        this.vx = 0;
    }
};

// --- ТРУБИ ---
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
            // Верхня труба
            ctx.fillRect(pipe.x, 0, this.width, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, this.width, pipe.topHeight);
            
            // Нижня труба
            const bottomY = pipe.topHeight + this.gap;
            ctx.fillRect(pipe.x, bottomY, this.width, canvas.height - bottomY);
            ctx.strokeRect(pipe.x, bottomY, this.width, canvas.height - bottomY);
        });
        
        ctx.shadowBlur = 0;
    },
    
    update() {
        if (frames % 95 === 0) {
            const topHeight = 50 + Math.random() * (canvas.height - this.gap - 120);
            this.items.push({
                x: canvas.width,
                topHeight,
                passed: false
            });
            
            // Бонус з шансом 60%
            if (Math.random() > 0.4) {
                bonuses.items.push({
                    x: canvas.width + this.width/2,
                    y: topHeight + this.gap/2,
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
            
            // Колізія
            const hit = astronaut.x + astronaut.width/2 > pipe.x &&
                       astronaut.x - astronaut.width/2 < pipe.x + this.width &&
                       (astronaut.y < pipe.topHeight || astronaut.y + astronaut.height > pipe.topHeight + this.gap);
            
            if (hit) {
                gameOver();
                return;
            }
            
            // Очки
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

// --- БОНУСИ ---
const bonuses = {
    items: [],
    radius: 14,
    
    draw() {
        this.items.forEach(bonus => {
            if (bonus.collected) return;
            
            ctx.save();
            ctx.shadowColor = "#FF4500";
            ctx.shadowBlur = 15;
            
            // Червоний круг
            ctx.fillStyle = "#FF4500";
            ctx.beginPath();
            ctx.arc(bonus.x, bonus.y, this.radius, 0, Math.PI*2);
            ctx.fill();
            
            // Білий контур
            ctx.strokeStyle = "#FFF";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Знак "+"
            ctx.fillStyle = "#FFF";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("+5", bonus.x, bonus.y + 2);
            
            ctx.restore();
        });
    },
    
    update() {
        for (let i = bonuses.items.length - 1; i >= 0; i--) {
            const bonus = bonuses.items[i];
            bonus.x -= gameSpeed;
            
            // Колізія з астронавтом
            const dx = astronaut.x + astronaut.width/2 - bonus.x;
            const dy = astronaut.y + astronaut.height/2 - bonus.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < astronaut.width/2 + this.radius && !bonus.collected) {
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

// --- ОСНОВНА ЛОГІКА ---
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
    // Клавіатура
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gamePlaying) {
                astronaut.jump();
            } else {
                resetGame();
            }
        }
    });
    
    // Мишка/тач
    canvas.addEventListener('click', () => {
        if (gamePlaying) {
            astronaut.jump();
        } else {
            resetGame();
        }
    });
    
    // Рестарт кнопка
    restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetGame();
    });
}
