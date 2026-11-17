// Lanternfall — tuning constants. One place for every number that shapes
// how the game feels, so balance can be changed without touching logic.
export const ARENA = {
  width: 960,
  height: 600,
  // The lantern stands at the centre of the arena.
  lanternX: 480,
  lanternY: 300,
  lanternRadius: 26,
  lanternHp: 150,
  // Standing near the lantern slowly mends the keeper.
  healRadius: 150,
  healPerSecond: 3,
  // The lantern mends itself slowly, and its light burns shadows that
  // come too close — so it is a pressure, not a countdown.
  regenPerSecond: 2.5,
  auraRadius: 70,
  auraDamagePerSecond: 16,
};

export const PLAYER = {
  radius: 14,
  speed: 260,
  hp: 100,
  fireInterval: 0.24, // seconds between bolts
  bulletSpeed: 540,
  bulletDamage: 20,
  bulletRadius: 5,
  emberMagnet: 90, // pickup radius for ember shards
};

export const BULLET = {
  pierce: 0, // extra enemies a bolt passes through
  shots: 1, // bolts fired per trigger pull
  spread: 0.16, // radians between bolts in a volley
};

// Enemy kinds. speed in arena units/second, damage on contact.
export const ENEMIES = {
  wisp:   { radius: 14, hp: 30,  speed: 95,  damage: 10, score: 50,  color: '#b388ff', glow: '#7c4dff' },
  dart:   { radius: 10, hp: 15,  speed: 195, damage: 8,  score: 80,  color: '#ff80ab', glow: '#f50057' },
  spitter:{ radius: 16, hp: 40,  speed: 62,  damage: 12, score: 120, color: '#69f0ae', glow: '#00c853' },
  gloom:  { radius: 24, hp: 120, speed: 46,  damage: 20, score: 200, color: '#ffab40', glow: '#ff6d00' },
  boss:   { radius: 46, hp: 950, speed: 38,  damage: 25, score: 1000, color: '#ff5252', glow: '#d50000' },
};

export const SPITTER = {
  keepDistance: 260, // tries to hold this range from its target
  shotInterval: 2.2,
  orbSpeed: 210,
  orbRadius: 7,
  orbDamage: 12,
};

export const DART = {
  lungeInterval: 2.0, // seconds between lunges
  lungeSpeed: 420,
  lungeTime: 0.35,
};

export const BOSS = {
  burstInterval: 3.0, // seconds between radial orb bursts
  burstCount: 10,
  hpWave5: 950,
  hpWave10: 1500,
};

export const WAVES = 10; // clearing wave 10 wins the game

export const POWERUPS = {
  dropChance: 0.08, // chance a kill drops a power-up
  heartHeal: 30,
  shieldSeconds: 5,
  overdriveSeconds: 8,
  overdriveRate: 2, // fire-rate multiplier while active
};

export const COMBO = {
  window: 3.0, // seconds a kill chain stays alive
  step: 0.1, // +10% score per chain step
  max: 3.0, // multiplier cap
};

export const EMBER = {
  value: 10, // score per shard
  dropMin: 1,
  dropMax: 3,
};

// Upgrades offered between waves. Each has an id, a name, a short line
// for its card, and a cap on how many times it can be taken.
export const UPGRADES = [
  { id: 'damage',   name: 'Ember Rounds',  text: '+35% bolt damage',        max: 5, apply: (s) => { s.damageMul *= 1.35; } },
  { id: 'rapid',    name: 'Swift Trigger', text: '+25% fire rate',          max: 5, apply: (s) => { s.rateMul *= 1.25; } },
  { id: 'twin',     name: 'Twin Flames',   text: '+1 bolt per volley',      max: 2, apply: (s) => { s.shots += 1; } },
  { id: 'boots',    name: 'Swift Boots',   text: '+15% move speed',         max: 4, apply: (s) => { s.speedMul *= 1.15; } },
  { id: 'heart',    name: 'Heartwood',     text: '+25 max HP, heal 25 now', max: 4, apply: (s) => { s.maxHp += 25; s.hp = Math.min(s.maxHp, s.hp + 25); } },
  { id: 'magnet',   name: 'Magnet Charm',  text: '+80% ember pickup range', max: 3, apply: (s) => { s.magnetMul *= 1.8; } },
  { id: 'mend',     name: 'Lantern Mend',  text: 'Repair the lantern +40',  max: 5, apply: () => { /* the repair is applied by takeUpgrade */ } },
  { id: 'pierce',   name: 'Piercing Light',text: 'Bolts pierce +1 enemy',   max: 2, apply: (s) => { s.pierce += 1; } },
];

export const SCORE = {
  waveClearBonus: 100, // times the wave number
};
