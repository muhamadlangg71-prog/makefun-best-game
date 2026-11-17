// Lanternfall — deterministic demo states for the screenshots. Each one
// builds a real game state with the game's own code (a seeded run, then
// a fixed number of simulated ticks), so every shot is a genuine render
// of the game, not a mock-up. The page reads ?shot=<name>&seed=<n>.
import { ARENA, ENEMIES } from './config.js';
import { makeRng } from './random.js';
import {
  makeEnemy, makeBullet, makeEmber, makePowerup, makeParticle,
} from './entities.js';

function seedRng(game, seed) {
  game.rng = makeRng(seed);
}

// Title screen: a fresh game waiting to start.
export function setupStart(game) {
  game.reset();
  game.state = 'title';
}

// Mid-combat: wave 3, the keeper firing, wisps, darts and a spitter
// closing in, embers and particles in the air. The simulation is run
// for a fixed number of ticks so the frame looks alive and is the same
// every time the same seed is used.
export function setupPlay(game, seed) {
  seedRng(game, seed);
  game.reset();
  game.state = 'playing';
  game.wave = 3;
  game.score = 1250;
  game.best = 3120;
  game.combo = 4;
  game.multiplier = 1.4;
  game.comboTimer = 2.1;
  game.player.x = 330;
  game.player.y = 330;
  game.player.hp = 78;
  game.player.angle = -0.5;
  game.lantern.hp = 86;
  game.director.stop();
  const rng = game.rng;
  const places = [
    ['wisp', 560, 180], ['wisp', 640, 420], ['wisp', 420, 520],
    ['dart', 700, 260], ['dart', 250, 180],
    ['spitter', 760, 380], ['gloom', 600, 500],
  ];
  for (const [kind, x, y] of places) {
    game.enemies.push(makeEnemy(kind, x, y, 'player', 3));
  }
  for (let i = 0; i < 5; i++) {
    game.bullets.push(makeBullet(360 + i * 26, 300 - i * 14, -0.5, 20, 0));
  }
  for (let i = 0; i < 4; i++) {
    game.embers.push(makeEmber(520 + i * 30, 300 + (i % 2) * 40, rng));
  }
  game.powerups.push(makePowerup(430, 420, 'heart'));
  for (let i = 0; i < 10; i++) {
    game.particles.push(makeParticle(560 + rng.range(-30, 30), 200 + rng.range(-20, 20), '#b388ff', 120, 0.6, 3));
  }
  // Run the sim briefly so bolts, particles and embers are mid-flight.
  game.aim = { x: 700, y: 200 };
  game.move = { x: 0.4, y: -0.2 };
  game.firing = true;
  for (let i = 0; i < 40; i++) game.update(1 / 60);
  game.firing = false;
  game.move = { x: 0, y: 0 };
  game.aim = null;
  game.waveBanner = 'Wave 3 of 10';
  game.bannerTimer = 1.5;
}

// The upgrade choice after clearing wave 2.
export function setupUpgrade(game, seed) {
  seedRng(game, seed);
  game.reset();
  game.state = 'upgrade';
  game.wave = 2;
  game.score = 890;
  game.best = 3120;
  game.kills = 34;
  game.player.hp = 64;
  game.lantern.hp = 92;
  game.offered = [
    { id: 'twin', name: 'Twin Flames', text: '+1 bolt per volley', max: 2, apply: () => {} },
    { id: 'damage', name: 'Ember Rounds', text: '+35% bolt damage', max: 5, apply: () => {} },
    { id: 'mend', name: 'Lantern Mend', text: 'Repair the lantern +40', max: 5, apply: () => {} },
  ];
}

// Game over: the keeper fell on wave 6, with the results and restart.
export function setupEnd(game, seed) {
  seedRng(game, seed);
  game.reset();
  game.state = 'gameover';
  game.wave = 6;
  game.score = 2480;
  game.best = 3120;
  game.kills = 87;
  game.player.hp = 0;
  game.lantern.hp = 41;
  game.isNewBest = false;
  const rng = game.rng;
  for (let i = 0; i < 6; i++) {
    game.enemies.push(makeEnemy(rng.pick(['wisp', 'dart', 'gloom']), rng.range(120, 840), rng.range(100, 500), 'player', 6));
  }
  for (let i = 0; i < 14; i++) {
    game.particles.push(makeParticle(480 + rng.range(-80, 80), 460 + rng.range(-40, 40), '#26c6da', 180, 0.8, 3));
  }
}

// Victory: the tenth wave is cleared and the lantern still burns.
export function setupWin(game, seed) {
  seedRng(game, seed);
  game.reset();
  game.state = 'victory';
  game.wave = 10;
  game.score = 5210;
  game.best = 5210;
  game.kills = 214;
  game.player.hp = 62;
  game.lantern.hp = 74;
  game.isNewBest = true;
  for (let i = 0; i < 20; i++) {
    game.particles.push(makeParticle(480 + game.rng.range(-160, 160), 300 + game.rng.range(-120, 120), '#ffd166', 140, 1.2, 3));
  }
}

export const SHOTS = {
  start: setupStart,
  play: setupPlay,
  upgrade: setupUpgrade,
  end: setupEnd,
  win: setupWin,
};
