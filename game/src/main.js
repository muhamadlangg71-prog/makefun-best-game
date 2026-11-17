// Lanternfall — boot and the main loop. Wires the canvas, the input,
// the sound bank and the game together; keeps the DOM HUD and the menu
// overlays in step with the game state; and serves the ?shot= states
// the screenshots are taken from.
import { ARENA } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { SHOTS } from './shots.js';
import {
  drawArena, drawLantern, drawPlayer, drawEnemy, drawBullet, drawOrb,
  drawEmber, drawPowerup, drawParticle, drawFloatingText,
} from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sounds = new SoundBank();
const input = new Input(canvas);
const game = new Game(sounds);
// Debug/testing handle: lets a play-test read the game state.
window.__lanternfall = game;

// The arena is 960x600 logical units; the canvas scales it to fit the
// window, letterboxed, so the game looks the same at any window size.
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  scale = Math.min(w / ARENA.width, h / ARENA.height);
  offsetX = (w - ARENA.width * scale) / 2;
  offsetY = (h - ARENA.height * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

// --- HUD -----------------------------------------------------------------
const el = (id) => document.getElementById(id);
const hud = {
  score: el('hud-score'),
  best: el('hud-best'),
  wave: el('hud-wave'),
  enemies: el('hud-enemies'),
  combo: el('hud-combo'),
  hpFill: el('hp-fill'),
  hpText: el('hp-text'),
  lanternFill: el('lantern-fill'),
  lanternText: el('lantern-text'),
  banner: el('banner'),
};

function updateHud() {
  hud.score.textContent = String(game.score);
  hud.best.textContent = String(game.best);
  hud.wave.textContent = game.wave > 0 ? `Wave ${game.wave} / 10` : '—';
  hud.enemies.textContent = game.state === 'playing' ? String(game.enemiesLeft) : '—';
  hud.combo.textContent = game.multiplier > 1 ? `Combo x${game.multiplier.toFixed(1)}` : '';
  const hpFrac = Math.max(0, game.player.hp / game.player.maxHp);
  hud.hpFill.style.width = `${hpFrac * 100}%`;
  hud.hpFill.style.background = hpFrac > 0.5 ? '#69f0ae' : hpFrac > 0.25 ? '#ffd166' : '#ff5252';
  hud.hpText.textContent = `${Math.ceil(game.player.hp)} / ${game.player.maxHp}`;
  const lnFrac = Math.max(0, game.lantern.hp / game.lantern.maxHp);
  hud.lanternFill.style.width = `${lnFrac * 100}%`;
  hud.lanternFill.style.background = lnFrac > 0.5 ? '#ffd166' : '#ff5252';
  hud.lanternText.textContent = `${Math.ceil(game.lantern.hp)} / ${game.lantern.maxHp}`;
  if (game.bannerTimer > 0 && game.waveBanner) {
    hud.banner.textContent = game.waveBanner;
    hud.banner.classList.add('show');
  } else {
    hud.banner.classList.remove('show');
  }
}

// --- Overlays --------------------------------------------------------------
const screens = {
  title: el('screen-title'),
  upgrade: el('screen-upgrade'),
  over: el('screen-over'),
  win: el('screen-win'),
  pause: el('screen-pause'),
};

function showOnly(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle('hidden', key !== name);
  }
  el('hud').classList.toggle('hidden', name === 'title');
}

function buildUpgradeCards() {
  const wrap = el('upgrade-cards');
  wrap.innerHTML = '';
  game.offered.forEach((def, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.innerHTML = `<span class="card-key">${i + 1}</span><span class="card-name">${def.name}</span><span class="card-text">${def.text}</span>`;
    card.addEventListener('click', () => {
      sounds.click();
      game.takeUpgrade(def.id);
      syncScreens();
    });
    wrap.appendChild(card);
  });
}

function syncScreens() {
  if (game.state === 'title') {
    el('title-best').textContent = game.best > 0 ? `Best score: ${game.best}` : 'No runs yet — light your first lantern.';
    showOnly('title');
  } else if (game.state === 'upgrade') {
    buildUpgradeCards();
    el('upgrade-score').textContent = `Score ${game.score} · Wave ${game.wave} cleared`;
    showOnly('upgrade');
  } else if (game.state === 'gameover') {
    el('over-score').textContent = String(game.score);
    el('over-wave').textContent = `Wave ${game.wave} · ${game.kills} creatures banished`;
    el('over-best').textContent = `Best: ${game.best}`;
    el('over-newbest').classList.toggle('hidden', !game.isNewBest);
    showOnly('over');
  } else if (game.state === 'victory') {
    el('win-score').textContent = String(game.score);
    el('win-best').textContent = `Best: ${game.best}`;
    el('win-newbest').classList.toggle('hidden', !game.isNewBest);
    showOnly('win');
  } else if (game.state === 'paused') {
    showOnly('pause');
  } else {
    showOnly(null);
  }
}

function startGame() {
  sounds.unlock();
  sounds.click();
  game.start();
  syncScreens();
}

el('btn-start').addEventListener('click', startGame);
el('btn-restart').addEventListener('click', startGame);
el('btn-again').addEventListener('click', startGame);
el('btn-resume').addEventListener('click', () => {
  game.state = 'playing';
  syncScreens();
});
el('btn-quit').addEventListener('click', () => {
  game.reset();
  game.state = 'title';
  syncScreens();
});
el('btn-restart2').addEventListener('click', startGame);

const muteBtn = el('btn-mute');
function toggleMute() {
  sounds.setMuted(!sounds.muted);
  muteBtn.textContent = sounds.muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', sounds.muted ? 'Unmute sound' : 'Mute sound');
}
muteBtn.addEventListener('click', toggleMute);

el('btn-pause').addEventListener('click', () => {
  if (game.state === 'playing') {
    game.state = 'paused';
    syncScreens();
  } else if (game.state === 'paused') {
    game.state = 'playing';
    syncScreens();
  }
});

// --- Screenshot states -------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1') || 1;
const shotMode = shotName && SHOTS[shotName];
if (shotMode) {
  shotMode(game, shotSeed);
  // Freeze the simulation: the shot is one rendered frame of a real
  // game state, identical every time the same seed is used.
  game.frozen = true;
  syncScreens();
  updateHud();
  document.title = `Lanternfall — ${shotName}`;
} else {
  syncScreens();
}

// --- Main loop ---------------------------------------------------------------
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Keyboard shortcuts.
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (game.state === 'playing') {
      game.state = 'paused';
      syncScreens();
    } else if (game.state === 'paused') {
      game.state = 'playing';
      syncScreens();
    }
  }
  if (input.wasPressed('m')) toggleMute();
  if (input.wasPressed('enter')) {
    if (game.state === 'title' || game.state === 'gameover' || game.state === 'victory') startGame();
  }
  if (game.state === 'upgrade') {
    for (let i = 0; i < game.offered.length; i++) {
      if (input.wasPressed(String(i + 1))) {
        game.takeUpgrade(game.offered[i].id);
        syncScreens();
        break;
      }
    }
  }

  if (!game.frozen) {
    // Aim: mouse position in arena units.
    const aimX = (input.mouseX - offsetX) / scale;
    const aimY = (input.mouseY - offsetY) / scale;
    game.aim = { x: aimX, y: aimY };
    game.move = input.moveVector();
    game.firing = input.firing;
    const before = game.state;
    game.update(dt);
    if (game.state !== before) syncScreens();
    updateHud();
  }

  // Render.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  ctx.setTransform(scale, 0, 0, scale, offsetX + shakeX, offsetY + shakeY);
  drawArena(ctx, game.time, game.lantern);
  drawLantern(ctx, game.lantern, game.time);
  for (const ember of game.embers) drawEmber(ctx, ember, game.time);
  for (const pu of game.powerups) drawPowerup(ctx, pu);
  for (const enemy of game.enemies) drawEnemy(ctx, enemy, game.time);
  for (const orb of game.orbs) drawOrb(ctx, orb);
  for (const bullet of game.bullets) drawBullet(ctx, bullet);
  drawPlayer(ctx, game.player, game.time);
  for (const pt of game.particles) drawParticle(ctx, pt);
  for (const text of game.texts) drawFloatingText(ctx, text);

  // Low-health vignette: the dark closes in as the keeper weakens.
  if (game.state === 'playing' && game.player.hp < 35) {
    const pulse = 0.25 + 0.1 * Math.sin(game.time * 5);
    const vg = ctx.createRadialGradient(
      ARENA.width / 2, ARENA.height / 2, 220,
      ARENA.width / 2, ARENA.height / 2, 520,
    );
    vg.addColorStop(0, 'rgba(255, 0, 0, 0)');
    vg.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  input.endFrame();
  // Signal the screenshot harness that the first frame is on screen.
  window.__shotReady = true;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
