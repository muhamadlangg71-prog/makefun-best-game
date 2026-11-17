// Lanternfall — the game itself: state machine, the update loop,
// collisions, scoring, the combo chain, waves, upgrades and the win
// and loss conditions. Rendering lives in render.js; input in input.js.
import {
  ARENA, PLAYER, ENEMIES, UPGRADES, WAVES, POWERUPS, COMBO, EMBER, SCORE,
} from './config.js';
import { makeRng, clamp, distance } from './random.js';
import {
  makePlayer, makeLantern, makeEnemy, makeBullet, makeOrb, makeEmber,
  makePowerup, makeParticle, updatePlayer, updateEnemy, updateBullet,
  updateOrb, updateEmber, updatePowerup, updateParticle,
} from './entities.js';
import { WaveDirector, edgeSpawnPoint, totalWaves } from './waves.js';

const BEST_KEY = 'lanternfall-best-score';

export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage may be unavailable; the score still counts this run.
  }
}

export class Game {
  constructor(sounds) {
    this.sounds = sounds;
    this.rng = makeRng((Date.now() % 2147483647) || 1);
    this.state = 'title'; // title | playing | upgrade | paused | gameover | victory
    this.time = 0;
    this.shake = 0;
    this.reset();
  }

  reset() {
    this.player = makePlayer();
    this.lantern = makeLantern();
    this.enemies = [];
    this.bullets = [];
    this.orbs = [];
    this.embers = [];
    this.powerups = [];
    this.particles = [];
    this.texts = []; // floating score popups
    this.director = new WaveDirector(this.rng);
    this.wave = 0;
    this.score = 0;
    this.best = loadBest();
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.upgradesTaken = {};
    this.offered = [];
    this.enemiesLeft = 0;
    this.waveBanner = '';
    this.bannerTimer = 0;
    this.isNewBest = false;
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.director.startWave(n);
    this.waveBanner = n === 1 ? 'Wave 1 — the dark stirs' : `Wave ${n} of ${totalWaves()}`;
    this.bannerTimer = 2.2;
    this.sounds.waveStart();
  }

  // Offer three upgrade cards the keeper has not maxed out.
  offerUpgrades() {
    const pool = UPGRADES.filter((u) => (this.upgradesTaken[u.id] || 0) < u.max);
    const picks = [];
    while (picks.length < 3 && pool.length > 0) {
      const i = Math.floor(this.rng.next() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }
    this.offered = picks;
    this.state = 'upgrade';
    this.sounds.upgrade();
  }

  takeUpgrade(id) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return;
    def.apply(this.player);
    // Lantern Mend applies to the lantern, not the keeper.
    if (id === 'mend') {
      this.lantern.hp = Math.min(this.lantern.maxHp, this.lantern.hp + 40);
    }
    this.upgradesTaken[id] = (this.upgradesTaken[id] || 0) + 1;
    this.sounds.upgrade();
    if (this.wave >= totalWaves()) {
      this.win();
    } else {
      this.state = 'playing';
      this.startWave(this.wave + 1);
    }
  }

  win() {
    this.state = 'victory';
    this.finishRun();
    this.sounds.victory();
  }

  lose() {
    this.state = 'gameover';
    this.finishRun();
    this.sounds.gameOver();
  }

  finishRun() {
    this.isNewBest = this.score > this.best;
    if (this.isNewBest) {
      this.best = this.score;
      saveBest(this.score);
    }
  }

  addScore(base, x, y) {
    const gained = Math.round(base * this.multiplier);
    this.score += gained;
    this.texts.push({
      value: `+${gained}`, x, y, color: '#ffd166', life: 0.9, maxLife: 0.9,
    });
  }

  bumpCombo() {
    this.combo += 1;
    this.comboTimer = COMBO.window;
    this.multiplier = Math.min(COMBO.max, 1 + this.combo * COMBO.step);
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      this.particles.push(makeParticle(x, y, color, speed * (0.4 + Math.random() * 0.8), 0.5 + Math.random() * 0.4, 2 + Math.random() * 3));
    }
  }

  spawnEnemy(kind) {
    const point = edgeSpawnPoint(this.rng, this.player);
    // Most creatures hunt the keeper; a few slip past toward the light.
    const target = kind === 'boss' ? 'player' : (this.rng.next() < 0.2 ? 'lantern' : 'player');
    this.enemies.push(makeEnemy(kind, point.x, point.y, target, this.wave));
  }

  fireBolt() {
    const p = this.player;
    const rate = p.overdriveTimer > 0 ? POWERUPS.overdriveRate : 1;
    p.fireTimer = (PLAYER.fireInterval / p.rateMul) / rate;
    const baseAngle = p.angle;
    const count = p.shots;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 0.16;
      const angle = baseAngle + offset;
      const ox = p.x + Math.cos(angle) * (p.radius + 8);
      const oy = p.y + Math.sin(angle) * (p.radius + 8);
      this.bullets.push(makeBullet(ox, oy, angle, PLAYER.bulletDamage * p.damageMul, p.pierce));
    }
    this.sounds.shoot();
  }

  hurtPlayer(amount, fromX, fromY) {
    const p = this.player;
    if (p.hurtTimer > 0 || p.shieldTimer > 0 || this.state !== 'playing') return;
    p.hp -= amount;
    p.hurtTimer = 0.6;
    this.shake = 9;
    this.sounds.hurt();
    this.burst(p.x, p.y, '#ff5252', 10, 160);
    if (p.hp <= 0) {
      p.hp = 0;
      this.burst(p.x, p.y, '#26c6da', 26, 260);
      this.lose();
    }
  }

  hurtLantern(amount) {
    if (this.state !== 'playing') return;
    this.lantern.hp -= amount;
    this.shake = Math.max(this.shake, 5);
    this.sounds.hit();
    this.burst(this.lantern.x, this.lantern.y, '#ffd166', 8, 140);
    if (this.lantern.hp <= 0) {
      this.lantern.hp = 0;
      this.burst(this.lantern.x, this.lantern.y, '#ffd166', 30, 280);
      this.lose();
    }
  }

  killEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.bumpCombo();
    this.addScore(enemy.score, enemy.x, enemy.y);
    this.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 40 : 12, 200);
    this.sounds.explode();
    // Ember shards.
    const shards = EMBER.dropMin + Math.floor(this.rng.next() * (EMBER.dropMax - EMBER.dropMin + 1));
    for (let i = 0; i < shards; i++) {
      this.embers.push(makeEmber(enemy.x, enemy.y, this.rng));
    }
    // Occasionally a power-up.
    if (this.rng.next() < POWERUPS.dropChance) {
      const type = this.rng.pick(['heart', 'shield', 'overdrive']);
      this.powerups.push(makePowerup(enemy.x, enemy.y, type));
    }
    if (enemy.kind === 'boss') this.shake = 14;
  }

  applyPowerup(type) {
    const p = this.player;
    if (type === 'heart') {
      p.hp = Math.min(p.maxHp, p.hp + POWERUPS.heartHeal);
      this.texts.push({ value: `+${POWERUPS.heartHeal} HP`, x: p.x, y: p.y - 24, color: '#69f0ae', life: 1, maxLife: 1 });
    } else if (type === 'shield') {
      p.shieldTimer = POWERUPS.shieldSeconds;
      this.texts.push({ value: 'Aegis shield!', x: p.x, y: p.y - 24, color: '#69f0ae', life: 1, maxLife: 1 });
    } else {
      p.overdriveTimer = POWERUPS.overdriveSeconds;
      this.texts.push({ value: 'Overdrive!', x: p.x, y: p.y - 24, color: '#ffd166', life: 1, maxLife: 1 });
    }
    this.sounds.powerup();
  }

  update(dt) {
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    for (const t of this.texts) {
      t.y -= 28 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const pt of this.particles) updateParticle(pt, dt);
    this.particles = this.particles.filter((pt) => pt.life > 0);

    if (this.state !== 'playing') return;

    // Combo chain decays.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }

    // Aim at the mouse (arena coordinates are set by main.js).
    if (this.aim) {
      this.player.angle = Math.atan2(this.aim.y - this.player.y, this.aim.x - this.player.x);
    }
    updatePlayer(this.player, this.lantern, this.move || { x: 0, y: 0 }, dt);
    if (this.firing && this.player.fireTimer <= 0) this.fireBolt();

    // Spawn the wave.
    for (const kind of this.director.update(dt)) this.spawnEnemy(kind);

    // Enemies.
    const spawnOrb = (x, y, angle, damage) => {
      this.orbs.push(makeOrb(x, y, angle, damage));
    };
    for (const enemy of this.enemies) {
      updateEnemy(enemy, this.player, this.lantern, dt, spawnOrb);
    }

    // The lantern mends itself, and its light burns shadows that press
    // too close — the keeper can lure creatures into the glow.
    this.lantern.hp = Math.min(this.lantern.maxHp, this.lantern.hp + ARENA.regenPerSecond * dt);
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const enemy = this.enemies[ei];
      if (distance(enemy.x, enemy.y, this.lantern.x, this.lantern.y) < ARENA.auraRadius + enemy.radius) {
        enemy.hp -= ARENA.auraDamagePerSecond * dt;
        enemy.flash = 0.05;
        if (enemy.hp <= 0) this.killEnemy(enemy, ei);
      }
    }

    // Bolts.
    for (const bullet of this.bullets) updateBullet(bullet, dt);
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.x > -20 && b.x < ARENA.width + 20 && b.y > -20 && b.y < ARENA.height + 20,
    );

    // Orbs.
    for (const orb of this.orbs) updateOrb(orb, dt);
    this.orbs = this.orbs.filter(
      (o) => o.life > 0 && o.x > -20 && o.x < ARENA.width + 20 && o.y > -20 && o.y < ARENA.height + 20,
    );

    // Embers and power-ups.
    for (const ember of this.embers) updateEmber(ember, this.player, dt);
    this.embers = this.embers.filter((e) => e.life > 0);
    for (const pu of this.powerups) updatePowerup(pu, dt);
    this.powerups = this.powerups.filter((pu) => pu.life > 0);

    this.collide();
    this.enemiesLeft = this.enemies.length + this.director.remaining;

    // Wave cleared: no enemies left and nothing left to spawn.
    if (this.enemies.length === 0 && this.director.remaining === 0) {
      this.director.stop();
      this.score += SCORE.waveClearBonus * this.wave;
      if (this.wave >= totalWaves()) {
        this.win();
      } else {
        this.offerUpgrades();
      }
    }
  }

  collide() {
    const p = this.player;

    // Bolts against enemies.
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.bullets[bi];
      let spent = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.enemies[ei];
        if (bullet.hit.has(enemy)) continue;
        const d = distance(bullet.x, bullet.y, enemy.x, enemy.y);
        if (d < bullet.radius + enemy.radius) {
          enemy.hp -= bullet.damage;
          enemy.flash = 0.09;
          enemy.knockX += bullet.vx * 0.12;
          enemy.knockY += bullet.vy * 0.12;
          bullet.hit.add(enemy);
          this.burst(bullet.x, bullet.y, '#ffd166', 4, 120);
          this.sounds.hit();
          if (enemy.hp <= 0) {
            this.killEnemy(enemy, ei);
          }
          if (bullet.hit.size > bullet.pierce) {
            spent = true;
          }
          break;
        }
      }
      if (spent) this.bullets.splice(bi, 1);
    }

    // Enemies touching the keeper or the lantern.
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const enemy = this.enemies[ei];
      const dp = distance(enemy.x, enemy.y, p.x, p.y);
      if (dp < enemy.radius + p.radius) {
        this.hurtPlayer(enemy.damage, enemy.x, enemy.y);
        // Push the creature back so one touch is one hit.
        const a = Math.atan2(enemy.y - p.y, enemy.x - p.x);
        enemy.x = p.x + Math.cos(a) * (enemy.radius + p.radius + 2);
        enemy.y = p.y + Math.sin(a) * (enemy.radius + p.radius + 2);
      }
      const dl = distance(enemy.x, enemy.y, this.lantern.x, this.lantern.y);
      if (dl < enemy.radius + this.lantern.radius) {
        // One touch is one hit: without the cooldown a creature pressed
        // against the lantern would strike it every frame.
        if (enemy.strikeTimer <= 0) {
          this.hurtLantern(enemy.damage);
          enemy.strikeTimer = 1;
        }
        const a = Math.atan2(enemy.y - this.lantern.y, enemy.x - this.lantern.x);
        enemy.x = this.lantern.x + Math.cos(a) * (enemy.radius + this.lantern.radius + 2);
        enemy.y = this.lantern.y + Math.sin(a) * (enemy.radius + this.lantern.radius + 2);
      }
    }

    // Enemy orbs against the keeper and the lantern.
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (distance(orb.x, orb.y, p.x, p.y) < orb.radius + p.radius) {
        this.hurtPlayer(orb.damage, orb.x, orb.y);
        this.orbs.splice(i, 1);
        continue;
      }
      if (distance(orb.x, orb.y, this.lantern.x, this.lantern.y) < orb.radius + this.lantern.radius) {
        this.hurtLantern(orb.damage);
        this.orbs.splice(i, 1);
      }
    }

    // Embers and power-ups collected by the keeper.
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const ember = this.embers[i];
      if (distance(ember.x, ember.y, p.x, p.y) < ember.radius + p.radius + 6) {
        this.score += ember.value;
        this.texts.push({ value: `+${ember.value}`, x: ember.x, y: ember.y - 8, color: '#ffd166', life: 0.6, maxLife: 0.6 });
        this.embers.splice(i, 1);
        this.sounds.pickup();
      }
    }
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (distance(pu.x, pu.y, p.x, p.y) < pu.radius + p.radius + 4) {
        this.applyPowerup(pu.type);
        this.powerups.splice(i, 1);
      }
    }
  }
}
