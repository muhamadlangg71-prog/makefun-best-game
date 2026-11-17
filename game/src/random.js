// Lanternfall — a small seeded random number generator (mulberry32) and
// helpers. Seeded runs make the screenshot states reproducible, while a
// live game seeds from the clock so no two runs play the same.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const rand = mulberry32(seed);
  return {
    // Float in [0, 1).
    next() {
      return rand();
    },
    // Float in [min, max).
    range(min, max) {
      return min + rand() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(rand() * (max - min + 1));
    },
    // Pick one element of an array.
    pick(list) {
      return list[Math.floor(rand() * list.length)];
    },
    // Angle in radians, uniformly around the circle.
    angle() {
      return rand() * Math.PI * 2;
    },
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Move a point toward a target by at most `step` units, returning the
// new position as [x, y].
export function stepToward(x, y, tx, ty, step) {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= step || d === 0) return [tx, ty];
  return [x + (dx / d) * step, y + (dy / d) * step];
}
