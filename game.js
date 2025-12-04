const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Змінні гри
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappyBest') || 0;
let gamePlaying = false;
let speed = 2.5; // Швидкість гри

// Елементи UI
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');

// --- ФОН (ЗІРКИ) ---
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        opacity: Math.random()
    });
}

function drawBackground() {
    ctx.fillStyle = "#000"; // Чорний фон
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Скидаємо прозорість
}

// --- ГРАВЕЦЬ (ПТАШКА) ---
const bird = {
    x: 50,
    y: 150,
    w: 30,
    h: 30,
    radius: 12,
    velocity: 0,
    gravity: 0.25,
    jump: 5.5, // Трохи сильніший стрибок
    
    draw: function() {
        // Можна замінити на картинку
        ctx.fillStyle = "#FFD700"; // Золотий колір пташки
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Око
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    },
    
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Межі підлоги та стелі
        if (this.y + this.radius >= canvas.height) {
            gameOver();
        }
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },
    
    flap: function() {
        this.velocity = -this.jump;
    },
    
    reset: function() {
        this.y = 150;
        this.velocity = 0;
    }
}

// --- ТРУБИ ---
const pipes = {
    items: [],
    w: 70, // Ширші труби (було 50)
    gap: 170, // Простір між трубами
    dx: speed,
    
    draw: function() {
        ctx.fillStyle = "#2ecc71"; // Яскраво-зелений колір
        ctx.strokeStyle = "#27ae60"; // Темніший контур
        ctx.lineWidth = 2;

        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;
            
            // Верхня труба
            ctx.fillRect(p.x, 0, this.w, topY);
            ctx.strokeRect(p.x, 0, this.w, topY);
            
            // Нижня труба
            ctx.fillRect(p.x, bottomY, this.w, canvas.height - bottomY);
            ctx.strokeRect(p.x, bottomY, this.w, canvas.height - bottomY);
        }
    },
    
    update: function() {
        // Додаємо нову трубу кожні 100 кадрів (залежить від швидкості)
        if (frames % 110 === 0) {
            let positionY = Math.random() * (canvas.height - this.gap - 100) + 50;
            this.items.push({
                x: canvas.width,
                y: positionY,
                passed: false
            });

            // --- ШАНС НА БОНУС (50%) ---
            if (Math.random() > 0.5) {
                bonuses.items.push({
                    x: canvas.width + this.w / 2 - 10, // По центру труби
                    y: positionY + this.gap / 2, // По центру проміжку
                    taken: false
                });
            }
        }
        
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= this.dx;
            
            // Видалення старих труб
            if (p.x + this.w <= 0) {
                this.items.shift();
                i--; // Коригуємо індекс після видалення
                continue;
            }
            
            // Колізія з трубами
            if (
                bird.x + bird.radius > p.x && 
                bird.x - bird.radius < p.x + this.w && 
                (bird.y - bird.radius < p.y || bird.y + bird.radius > p.y + this.gap)
            ) {
                gameOver();
            }

            // Рахунок за проходження
            if (p.x + this.w < bird.x && !p.passed) {
                score++;
                scoreEl.innerText = score;
                p.passed = true;
            }
        }
    },

    reset: function() {
        this.items = [];
    }
}

// --- БОНУСИ ---
const bonuses = {
    items: [],
    radius: 10,

    draw: function() {
        ctx.fillStyle = "#FF4500"; // Червоно-помаранчевий (як пачка Marlboro або просто яскравий бонус)
        ctx.strokeStyle = "#FFF";
        
        for (let i = 0; i < this.items.length; i++) {
            let b = this.items[i];
            if (b.taken) continue;

            // Малюємо бонус (кружечок)
            ctx.beginPath();
            ctx.arc(b.x, b.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Літера "B" або "$" всередині
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText("$", b.x - 3, b.y + 4);
            ctx.fillStyle = "#FF4500"; // Повертаємо колір
        }
    },

    update: function() {
        for (let i = 0; i < this.items.length; i++) {
            let b = this.items[i];
            b.x -= speed;

            // Перевірка взяття бонусу
            let dx = bird.x - b.x;
            let dy = bird.y - b.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bird.radius + this.radius && !b.taken) {
                b.taken = true;
                score += 5; // +5 балів за бонус
                scoreEl.innerText = score;
                // Можна додати звук монетки тут
            }

            // Видалення
            if (b.x + this.radius < 0) {
                this.items.shift();
                i--;
            }
        }
    },

    reset: function() {
        this.items = [];
    }
}

// --- УПРАВЛІННЯ ГРОЮ ---
function gameOver() {
    gamePlaying = false;
    
    // Оновлення рекорду
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyBest', highScore);
    }
    
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = highScore;
    
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    bird.reset();
    pipes.reset();
    bonuses.reset();
    score = 0;
    frames = 0;
    scoreEl.innerText = score;
    gameOverScreen.classList.add('hidden');
    gamePlaying = true;
    loop();
}

function loop() {
    if (!gamePlaying) return;
    
    drawBackground(); // Малюємо зірки
    
    pipes.update();
    pipes.draw();

    bonuses.update();
    bonuses.draw();
    
    bird.update();
    bird.draw();
    
    frames++;
    requestAnimationFrame(loop);
}

// --- ПОДІЇ ---
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        if (gamePlaying) {
            bird.flap();
        } else if (startScreen.classList.contains('hidden') === false) {
            startScreen.classList.add('hidden');
            gamePlaying = true;
            loop();
        } else if (!gameOverScreen.classList.contains('hidden')) {
            resetGame();
        }
    }
});

window.addEventListener("click", () => {
    if (gamePlaying) {
        bird.flap();
    } else if (startScreen.classList.contains('hidden') === false) {
        startScreen.classList.add('hidden');
        gamePlaying = true;
        loop();
    }
});

restartBtn.addEventListener("click", resetGame);
