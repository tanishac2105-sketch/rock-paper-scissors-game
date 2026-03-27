/* ===== STATE ===== */
let userScore = 0;
let computerScore = 0;
let isMuted = false;
let isPlaying = false;

const emojiMap = { rock: '🪨', paper: '🗒️', scissors: '✂️' };

/* ===== AUDIO ENGINE ===== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playTone(type) {
    if (isMuted) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const configs = {
            click:    { freq: [440, 520],       dur: 0.08, wave: 'sine',     vol: 0.18 },
            win:      { freq: [523, 659, 784],   dur: 0.18, wave: 'triangle', vol: 0.22 },
            lose:     { freq: [300, 220, 180],   dur: 0.22, wave: 'sawtooth', vol: 0.15 },
            draw:     { freq: [440, 440],        dur: 0.14, wave: 'sine',     vol: 0.14 },
            reset:    { freq: [330, 280],        dur: 0.1,  wave: 'sine',     vol: 0.12 },
        };

        const c = configs[type] || configs.click;
        gain.gain.setValueAtTime(c.vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.dur * c.freq.length);
        osc.type = c.wave;

        c.freq.forEach((f, i) => {
            osc.frequency.setValueAtTime(f, ctx.currentTime + i * c.dur);
        });

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + c.dur * c.freq.length + 0.05);
    } catch (e) { /* silent fail */ }
}

/* ===== PARTICLES ===== */
const canvas = document.getElementById('particles-canvas');
const pctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(60, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.8 + 0.4,
            dx: (Math.random() - 0.5) * 0.35,
            dy: (Math.random() - 0.5) * 0.35,
            alpha: Math.random() * 0.5 + 0.1,
            color: ['#b06aff','#6af4ff','#ff6af0','#6affa0'][Math.floor(Math.random()*4)]
        });
    }
}

function animateParticles() {
    pctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = p.color;
        pctx.globalAlpha = p.alpha;
        pctx.fill();
    });
    pctx.globalAlpha = 1;
    requestAnimationFrame(animateParticles);
}

resizeCanvas();
createParticles();
animateParticles();
window.addEventListener('resize', () => { resizeCanvas(); createParticles(); });

/* ===== CONFETTI ===== */
function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#b06aff','#ff6af0','#6af4ff','#6affa0','#ffe06a','#fff'];
    for (let i = 0; i < 70; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.cssText = `
            left: ${Math.random() * 100}%;
            top: -10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            width: ${Math.random() * 8 + 6}px;
            height: ${Math.random() * 8 + 6}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            animation-duration: ${Math.random() * 1.5 + 1.2}s;
            animation-delay: ${Math.random() * 0.6}s;
            opacity: 1;
        `;
        container.appendChild(el);
    }
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}

/* ===== INTRO ===== */
document.getElementById('intro-btn').addEventListener('click', () => {
    playTone('click');
    document.getElementById('intro-overlay').classList.add('hidden');
    document.getElementById('game-wrapper').classList.add('visible');
});

/* ===== MUTE TOGGLE ===== */
document.getElementById('mute-btn').addEventListener('click', () => {
    isMuted = !isMuted;
    document.getElementById('mute-icon').textContent = isMuted ? '🔇' : '🔊';
});

/* ===== PLAY GAME ===== */
async function playGame(choice) {
    if (isPlaying) return;
    isPlaying = true;

    playTone('click');

    // Highlight selected button
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById(`btn-${choice}`).classList.add('selected');

    // Reset arena state
    const arenaCard = document.getElementById('arena-card');
    const resultBadge = document.getElementById('result-badge');
    const userEmojiEl = document.getElementById('user-emoji');
    const cpuEmojiEl = document.getElementById('cpu-emoji');
    const resultText = document.getElementById('result-text');

    arenaCard.className = 'arena-card';
    resultBadge.className = 'result-badge';
    resultText.textContent = '...';
    userEmojiEl.textContent = emojiMap[choice];
    userEmojiEl.classList.add('revealed');
    cpuEmojiEl.textContent = '💫';
    cpuEmojiEl.classList.remove('revealed');

    // Animate user emoji in
    userEmojiEl.style.animation = 'none';
    void userEmojiEl.offsetWidth;
    userEmojiEl.style.animation = 'revealEmoji 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';

    try {
        const response = await fetch('/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_choice: choice })
        });
        const data = await response.json();

        // Reveal CPU choice with delay
        setTimeout(() => {
            cpuEmojiEl.textContent = emojiMap[data.computer_choice];
            cpuEmojiEl.classList.add('revealed');
            cpuEmojiEl.style.animation = 'none';
            void cpuEmojiEl.offsetWidth;
            cpuEmojiEl.style.animation = 'revealEmoji 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';

            // Determine outcome
            const isWin  = data.result === 'You win!';
            const isLose = data.result === 'Computer wins!';
            const isDraw = data.result === 'Draw';

            setTimeout(() => {
                if (isWin) {
                    arenaCard.classList.add('win');
                    resultBadge.classList.add('win');
                    resultText.textContent = 'You Win!';
                    userScore++;
                    playTone('win');
                    spawnConfetti();
                    bumpScore('user-score', userScore);
                } else if (isLose) {
                    arenaCard.classList.add('lose');
                    resultBadge.classList.add('lose');
                    resultText.textContent = 'CPU Wins';
                    computerScore++;
                    playTone('lose');
                    arenaCard.classList.add('shake');
                    setTimeout(() => arenaCard.classList.remove('shake'), 500);
                    bumpScore('computer-score', computerScore);
                } else {
                    arenaCard.classList.add('draw');
                    resultBadge.classList.add('draw');
                    resultText.textContent = 'Draw!';
                    playTone('draw');
                    arenaCard.classList.add('pulse');
                    setTimeout(() => arenaCard.classList.remove('pulse'), 700);
                }

                isPlaying = false;
            }, 200);
        }, 400);

    } catch (err) {
        console.error('Error:', err);
        resultText.textContent = 'Error';
        isPlaying = false;
    }
}

function bumpScore(id, val) {
    const el = document.getElementById(id);
    el.textContent = val;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 400);
}

/* ===== RESET ===== */
function resetGame() {
    if (isPlaying) return;
    playTone('reset');

    userScore = 0;
    computerScore = 0;

    document.getElementById('user-score').textContent = '0';
    document.getElementById('computer-score').textContent = '0';
    document.getElementById('user-emoji').textContent = '✦';
    document.getElementById('user-emoji').classList.remove('revealed');
    document.getElementById('cpu-emoji').textContent = '✦';
    document.getElementById('cpu-emoji').classList.remove('revealed');
    document.getElementById('result-text').textContent = '?';

    const arenaCard = document.getElementById('arena-card');
    const resultBadge = document.getElementById('result-badge');
    arenaCard.className = 'arena-card';
    resultBadge.className = 'result-badge';

    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('confetti-container').innerHTML = '';
}
