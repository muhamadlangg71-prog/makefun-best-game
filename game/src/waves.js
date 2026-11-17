// Lanternfall — the wave director. Each wave is a list of creatures to
// send, spawned at the arena edges on a timer. Waves 5 and 10 bring the
// Gloomlord, the boss. Clearing wave 10 wins the game.
import { ARENA, WAVES } from './config.js';

// How many of each creature a wave sends. The mix grows harder as the
// waves go on: darts from wave 2, spitters from wave 3, glooms from 4.
export function waveComposition(wave) {
  const list = [];
  const add = (kind, count) => {
    for (let i = 0; i < count; i++) list.push(kind);
  };
  add('wisp', 4 + wave * 2);
  if (wave >= 2) add('dart', Math.floor(wave * 1.5));
  if (wave >= 3) add('spitter', wave);
  if (wave >= 4) add('gloom', Math.floor(wave / 2));
  if (wave === 5 || wave === 10) list.push('boss');
  return list;
}

export function totalWaves() {
  return WAVES;
}

// Pick a spawn point on the arena edge, away from the keeper so nothing
// appears on top of the player.
export function edgeSpawnPoint(rng, player) {
  for (let tries = 0; tries < 12; tries++) {
    const side = rng.int(0, 3);
    let x;
    let y;
    if (side === 0) {
      x = rng.range(30, ARENA.width - 30);
      y = 30;
    } else if (side === 1) {
      x = rng.range(30, ARENA.width - 30);
      y = ARENA.height - 30;
    } else if (side === 2) {
      x = 30;
      y = rng.range(30, ARENA.height - 30);
    } else {
      x = ARENA.width - 30;
      y = rng.range(30, ARENA.height - 30);
    }
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy > 220 * 220) return { x, y };
  }
  return { x: 40, y: 40 };
}

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.queue = []; // kinds waiting to spawn
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.active = false;
  }

  startWave(wave) {
    this.queue = waveComposition(wave);
    // Shuffle so the mix arrives in a varied order.
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.spawnTimer = 0.6;
    this.spawnInterval = Math.max(0.35, 0.95 - wave * 0.05);
    this.active = true;
  }

  // Returns the kinds to spawn this frame (usually zero or one).
  update(dt) {
    const out = [];
    if (!this.active || this.queue.length === 0) return out;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.queue.length > 0) {
      out.push(this.queue.shift());
      this.spawnTimer += this.spawnInterval;
    }
    return out;
  }

  get remaining() {
    return this.queue.length;
  }

  stop() {
    this.active = false;
    this.queue = [];
  }
}
