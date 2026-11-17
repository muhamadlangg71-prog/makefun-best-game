// Lanternfall — everything drawn on the canvas: the arena, the lantern
// and its light, the keeper, the creatures, bolts, orbs, embers and the
// particle bursts. The HUD and the menus are DOM; this file only paints
// the playfield.
import { ARENA } from './config.js';

const TAU = Math.PI * 2;

// A fixed starfield, seeded once so the background never changes.
const STARS = (() => {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rand() * ARENA.width,
      y: rand() * ARENA.height,
      r: 0.6 + rand() * 1.4,
      a: 0.15 + rand() * 0.5,
    });
  }
  return stars;
})();

export function drawArena(ctx, time, lantern) {
  // Deep indigo floor.
  const floor = ctx.createRadialGradient(
    ARENA.lanternX, ARENA.lanternY, 60,
    ARENA.lanternX, ARENA.lanternY, 620,
  );
  floor.addColorStop(0, '#1b2340');
  floor.addColorStop(0.55, '#12172b');
  floor.addColorStop(1, '#0a0d1a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Stars.
  for (const star of STARS) {
    ctx.globalAlpha = star.a * (0.7 + 0.3 * Math.sin(time * 0.8 + star.x));
    ctx.fillStyle = '#cfe3ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The lantern's warm light, breathing slowly.
  const breathe = 1 + 0.04 * Math.sin(time * 1.6);
  const light = ctx.createRadialGradient(
    lantern.x, lantern.y, 20,
    lantern.x, lantern.y, 250 * breathe,
  );
  light.addColorStop(0, 'rgba(255, 214, 130, 0.30)');
  light.addColorStop(0.5, 'rgba(255, 170, 60, 0.10)');
  light.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Arena ring: a stone circle with a soft gold rim.
  ctx.strokeStyle = '#3a466e';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(ARENA.lanternX, ARENA.lanternY, 268, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 205, 110, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ARENA.lanternX, ARENA.lanternY, 262, 0, TAU);
  ctx.stroke();

  // Faint grid of flagstones, for depth.
  ctx.strokeStyle = 'rgba(120, 140, 200, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 80; x < ARENA.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
    ctx.stroke();
  }
  for (let y = 80; y < ARENA.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
    ctx.stroke();
  }
}

export function drawLantern(ctx, lantern, time) {
  const flicker = 1 + 0.06 * Math.sin(time * 7) + 0.04 * Math.sin(time * 13);
  // Glow.
  const glow = ctx.createRadialGradient(
    lantern.x, lantern.y, 4,
    lantern.x, lantern.y, 70 * flicker,
  );
  glow.addColorStop(0, 'rgba(255, 220, 140, 0.85)');
  glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y, 70 * flicker, 0, TAU);
  ctx.fill();
  // Post and cage.
  ctx.fillStyle = '#2c3554';
  ctx.fillRect(lantern.x - 3, lantern.y - 6, 6, 26);
  ctx.fillStyle = '#ffd682';
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 12, 11, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 12, 6, 0, TAU);
  ctx.fill();
  // Lantern health ring.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y - 12, 18, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = lantern.hp > 30 ? '#ffd166' : '#ff5252';
  ctx.beginPath();
  ctx.arc(
    lantern.x, lantern.y - 12, 18,
    -Math.PI / 2,
    -Math.PI / 2 + TAU * Math.max(0, lantern.hp / lantern.maxHp),
  );
  ctx.stroke();
}

export function drawPlayer(ctx, player, time) {
  const blink = player.hurtTimer > 0 && Math.floor(time * 20) % 2 === 0;
  const shield = player.shieldTimer > 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (blink) ctx.globalAlpha = 0.4;
  // Cloak: a hooded keeper, drawn as a teal robe with a gold trim.
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = '#26c6da';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(11, 10);
  ctx.lineTo(0, 14);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0a0d1a';
  ctx.beginPath();
  ctx.arc(0, -4, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Aim line, faint, from the keeper toward the cursor.
  ctx.strokeStyle = 'rgba(38, 198, 218, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.angle) * 34, player.y + Math.sin(player.angle) * 34);
  ctx.stroke();

  if (shield) {
    ctx.strokeStyle = 'rgba(105, 240, 174, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 22 + 2 * Math.sin(time * 6), 0, TAU);
    ctx.stroke();
  }
}

export function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.flash > 0) ctx.globalAlpha = 0.85;
  // Glow halo.
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, enemy.radius * 2.2);
  halo.addColorStop(0, enemy.glow + '55');
  halo.addColorStop(1, enemy.glow + '00');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 2.2, 0, TAU);
  ctx.fill();

  if (enemy.kind === 'wisp') {
    // A drifting flame-wisp with a tail.
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -3, 3, 0, TAU);
    ctx.arc(4, -3, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1033';
    ctx.beginPath();
    ctx.arc(-4, -3, 1.5, 0, TAU);
    ctx.arc(4, -3, 1.5, 0, TAU);
    ctx.fill();
  } else if (enemy.kind === 'dart') {
    ctx.rotate(Math.atan2(enemy.y - 300, enemy.x - 480));
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'spitter') {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#0a0d1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius - 5, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -2, 3.5, 0, TAU);
    ctx.fill();
  } else if (enemy.kind === 'gloom') {
    // A heavy, cracked stone brute.
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(0, 2);
    ctx.lineTo(10, -6);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-7, -6, 3, 0, TAU);
    ctx.arc(7, -6, 3, 0, TAU);
    ctx.fill();
  } else {
    // The Gloomlord: a crowned boss with a pulsing core.
    const pulse = 1 + 0.08 * Math.sin(time * 4);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * enemy.radius, Math.sin(a) * enemy.radius);
      ctx.lineTo(Math.cos(a + 0.2) * (enemy.radius + 10), Math.sin(a + 0.2) * (enemy.radius + 10));
      ctx.lineTo(Math.cos(a + 0.4) * enemy.radius, Math.sin(a + 0.4) * enemy.radius);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-12, -8, 5, 0, TAU);
    ctx.arc(12, -8, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(-12, -8, 2.5, 0, TAU);
    ctx.arc(12, -8, 2.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Health bar for hurt tough enemies and the boss.
  if (enemy.maxHp >= 120 && enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    const frac = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * frac, 5);
  }
}

export function drawBullet(ctx, bullet) {
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
  const grad = ctx.createLinearGradient(-14, 0, 8, 0);
  grad.addColorStop(0, 'rgba(255, 214, 130, 0)');
  grad.addColorStop(1, 'rgba(255, 214, 130, 0.95)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 3.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath();
  ctx.arc(6, 0, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawOrb(ctx, orb) {
  ctx.save();
  ctx.translate(orb.x, orb.y);
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, orb.radius * 2.4);
  glow.addColorStop(0, 'rgba(213, 0, 249, 0.8)');
  glow.addColorStop(1, 'rgba(213, 0, 249, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius * 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ea80fc';
  ctx.beginPath();
  ctx.arc(0, 0, orb.radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawEmber(ctx, ember, time) {
  const blink = 0.6 + 0.4 * Math.sin(time * 6 + ember.x);
  ctx.save();
  ctx.translate(ember.x, ember.y);
  ctx.globalAlpha = Math.max(0.25, blink);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawPowerup(ctx, powerup) {
  const y = powerup.y + Math.sin(powerup.bob) * 3;
  ctx.save();
  ctx.translate(powerup.x, y);
  const color = powerup.type === 'heart' ? '#ff5252' : powerup.type === 'shield' ? '#69f0ae' : '#ffd166';
  ctx.fillStyle = 'rgba(10, 13, 26, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(powerup.type === 'heart' ? '+' : powerup.type === 'shield' ? '◈' : '»', 0, 1);
  ctx.restore();
}

export function drawParticle(ctx, particle) {
  ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawFloatingText(ctx, text) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = text.color;
  ctx.fillText(text.value, text.x, text.y);
  ctx.restore();
}
