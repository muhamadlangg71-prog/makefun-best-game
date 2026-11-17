// Lanternfall — the things that live in the arena: the keeper, the
// lantern, the shadow creatures, bolts, orbs, embers and power-ups.
// Factories build them; the update functions move them one step.
import { ARENA, PLAYER, ENEMIES, SPITTER, DART, BOSS } from './config.js';
import { clamp, distance, stepToward } from './random.js';

export function makePlayer() {
  return {
    kind: 'player',
    x: ARENA.width / 2,
    y: ARENA.height / 2 + 160,
    radius: PLAYER.radius,
    hp: PLAYER.hp,
    maxHp: PLAYER.hp,
    angle: -Math.PI / 2, // aim direction, radians
    fireTimer: 0,
    shieldTimer: 0,
    overdriveTimer: 0,
    hurtTimer: 0, // brief invulnerability after taking a hit
    // Upgrade multipliers, applied by the upgrade cards.
    damageMul: 1,
    rateMul: 1,
    speedMul: 1,
    magnetMul: 1,
    shots: 1,
    pierce: 0,
  };
}

export function makeLantern() {
  return {
    x: ARENA.lanternX,
    y: ARENA.lanternY,
    radius: ARENA.lanternRadius,
    hp: ARENA.lanternHp,
    maxHp: ARENA.lanternHp,
    flicker: 0, // visual only
  };
}

// kind is one of wisp, dart, spitter, gloom, boss. target is 'player'
// or 'lantern': what this creature hunts.
export function makeEnemy(kind, x, y, target, wave) {
  const base = ENEMIES[kind];
  const hp = kind === 'boss' ? (wave >= 10 ? BOSS.hpWave10 : BOSS.hpWave5) : base.hp;
  return {
    kind,
    x,
    y,
    radius: base.radius,
    hp,
    maxHp: hp,
    speed: base.speed,
    damage: base.damage,
    score: base.score,
    color: base.color,
    glow: base.glow,
    target,
    // Behaviour timers.
    shotTimer: 1 + Math.random() * 1.5,
    lungeTimer: DART.lungeInterval,
    lungeTime: 0,
    burstTimer: BOSS.burstInterval,
    // Time before this creature can strike again (the lantern and the
    // keeper are not hit once per frame by a creature pressed against them).
    strikeTimer: 0,
    flash: 0, // white flash frames after a hit
    knockX: 0,
    knockY: 0,
  };
}

export function makeBullet(x, y, angle, damage, pierce) {
  return {
    kind: 'bullet',
    x,
    y,
    vx: Math.cos(angle) * 540,
    vy: Math.sin(angle) * 540,
    radius: 5,
    damage,
    pierce,
    hit: new Set(), // enemies already pierced by this bolt
    life: 1.2, // seconds before it fades
  };
}

export function makeOrb(x, y, angle, damage) {
  return {
    kind: 'orb',
    x,
    y,
    vx: Math.cos(angle) * SPITTER.orbSpeed,
    vy: Math.sin(angle) * SPITTER.orbSpeed,
    radius: SPITTER.orbRadius,
    damage,
    life: 4,
  };
}

export function makeEmber(x, y, rng) {
  const angle = rng.angle();
  const speed = rng.range(40, 120);
  return {
    kind: 'ember',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 5,
    value: 10,
    life: 9, // seconds before it winks out
  };
}

export function makePowerup(x, y, type) {
  return {
    kind: 'powerup',
    type, // 'heart' | 'shield' | 'overdrive'
    x,
    y,
    radius: 13,
    life: 10,
    bob: 0,
  };
}

export function makeParticle(x, y, color, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  return {
    kind: 'particle',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life,
    maxLife: life,
    size,
  };
}

// Move the player one step: WASD/arrows, clamped to the arena, and the
// lantern's heal aura when the keeper stands close to the light.
export function updatePlayer(player, lantern, move, dt) {
  const speed = PLAYER.speed * player.speedMul;
  player.x = clamp(player.x + move.x * speed * dt, PLAYER.radius, ARENA.width - PLAYER.radius);
  player.y = clamp(player.y + move.y * speed * dt, PLAYER.radius, ARENA.height - PLAYER.radius);
  if (player.fireTimer > 0) player.fireTimer -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  if (player.shieldTimer > 0) player.shieldTimer -= dt;
  if (player.overdriveTimer > 0) player.overdriveTimer -= dt;
  if (distance(player.x, player.y, lantern.x, lantern.y) < ARENA.healRadius) {
    player.hp = Math.min(player.maxHp, player.hp + ARENA.healPerSecond * dt);
  }
}

// Move one enemy one step. Chasers walk at their target; darts lunge;
// spitters hold their distance and shoot; the boss fires radial bursts.
export function updateEnemy(enemy, player, lantern, dt, spawnOrb) {
  if (enemy.flash > 0) enemy.flash -= dt;
  if (enemy.strikeTimer > 0) enemy.strikeTimer -= dt;
  const target = enemy.target === 'lantern' ? lantern : player;
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  let speed = enemy.speed;

  if (enemy.kind === 'dart') {
    enemy.lungeTimer -= dt;
    if (enemy.lungeTimer <= 0) {
      enemy.lungeTime = DART.lungeTime;
      enemy.lungeTimer = DART.lungeInterval;
    }
    if (enemy.lungeTime > 0) {
      enemy.lungeTime -= dt;
      speed = DART.lungeSpeed;
    }
  }

  if (enemy.kind === 'spitter') {
    // Hold the preferred range: back away when too close, close in
    // when too far, strafe otherwise.
    const want = SPITTER.keepDistance;
    let mx = 0;
    let my = 0;
    if (dist > want + 40) {
      mx = dx / dist;
      my = dy / dist;
    } else if (dist < want - 40) {
      mx = -dx / dist;
      my = -dy / dist;
    } else {
      mx = -dy / dist;
      my = dx / dist;
    }
    enemy.x += mx * speed * dt;
    enemy.y += my * speed * dt;
    enemy.shotTimer -= dt;
    if (enemy.shotTimer <= 0) {
      enemy.shotTimer = SPITTER.shotInterval;
      spawnOrb(enemy.x, enemy.y, Math.atan2(dy, dx), SPITTER.orbDamage);
    }
  } else if (enemy.kind === 'boss') {
    enemy.x += (dx / dist) * speed * dt;
    enemy.y += (dy / dist) * speed * dt;
    enemy.burstTimer -= dt;
    if (enemy.burstTimer <= 0) {
      enemy.burstTimer = BOSS.burstInterval;
      for (let i = 0; i < BOSS.burstCount; i++) {
        const a = (i / BOSS.burstCount) * Math.PI * 2;
        spawnOrb(enemy.x, enemy.y, a, SPITTER.orbDamage);
      }
    }
  } else {
    const [nx, ny] = stepToward(enemy.x, enemy.y, target.x, target.y, speed * dt);
    enemy.x = nx;
    enemy.y = ny;
  }

  // Knockback from bolts decays.
  enemy.x += enemy.knockX * dt;
  enemy.y += enemy.knockY * dt;
  enemy.knockX *= 0.86;
  enemy.knockY *= 0.86;
  enemy.x = clamp(enemy.x, enemy.radius, ARENA.width - enemy.radius);
  enemy.y = clamp(enemy.y, enemy.radius, ARENA.height - enemy.radius);
  if (enemy.flash > 0) enemy.flash -= dt;
}

export function updateBullet(bullet, dt) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.life -= dt;
}

export function updateOrb(orb, dt) {
  orb.x += orb.vx * dt;
  orb.y += orb.vy * dt;
  orb.life -= dt;
}

// Embers drift, slow down, and get pulled toward the keeper when close.
export function updateEmber(ember, player, dt) {
  const magnet = PLAYER.emberMagnet * player.magnetMul;
  const d = distance(ember.x, ember.y, player.x, player.y);
  if (d < magnet) {
    const pull = 420 * (1 - d / magnet);
    const [nx, ny] = stepToward(ember.x, ember.y, player.x, player.y, pull * dt);
    ember.x = nx;
    ember.y = ny;
  } else {
    ember.x += ember.vx * dt;
    ember.y += ember.vy * dt;
    ember.vx *= 0.92;
    ember.vy *= 0.92;
  }
  ember.life -= dt;
}

export function updatePowerup(powerup, dt) {
  powerup.bob += dt * 3;
  powerup.life -= dt;
}

export function updateParticle(particle, dt) {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vx *= 0.94;
  particle.vy *= 0.94;
  particle.life -= dt;
}
