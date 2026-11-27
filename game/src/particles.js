// Particles for DESERT THUNDER. One clear job: smoke columns, retardant spray,
// lake spray, flare bursts and dust — everything that moves besides the tanker.
import { mulberry32 } from './random.js';

export function freshParticles() {
  return { list: [], rng: mulberry32(777) };
}

export function spawnSmoke(ps, x, z, altitude, n) {
  for (let i = 0; i < n; i += 1) {
    ps.list.push({
      kind: 'smoke',
      x: x + (ps.rng() - 0.5) * 300,
      z: z + (ps.rng() - 0.5) * 200,
      y: altitude + ps.rng() * 120,
      vx: (ps.rng() - 0.5) * 8,
      vy: 14 + ps.rng() * 10,
      vz: (ps.rng() - 0.5) * 8,
      size: 26 + ps.rng() * 40,
      life: 1,
      decay: 0.12 + ps.rng() * 0.1,
    });
  }
}

export function spawnRetardant(ps, x, z, altitude) {
  for (let i = 0; i < 46; i += 1) {
    ps.list.push({
      kind: 'retardant',
      x: x + (ps.rng() - 0.5) * 60,
      z: z + (ps.rng() - 0.5) * 40,
      y: altitude - ps.rng() * 20,
      vx: (ps.rng() - 0.5) * 12,
      vy: -46 - ps.rng() * 30,
      vz: 30 + ps.rng() * 20,
      size: 5 + ps.rng() * 9,
      life: 1,
      decay: 0.5,
    });
  }
}

export function spawnSpray(ps, x, z, altitude, n) {
  for (let i = 0; i < n; i += 1) {
    ps.list.push({
      kind: 'spray',
      x: x + (ps.rng() - 0.5) * 90,
      z: z - ps.rng() * 60,
      y: altitude + ps.rng() * 8,
      vx: (ps.rng() - 0.5) * 16,
      vy: 6 + ps.rng() * 14,
      vz: -20 - ps.rng() * 30,
      size: 3 + ps.rng() * 6,
      life: 1,
      decay: 0.9,
    });
  }
}

export function spawnFlare(ps, x, z, altitude) {
  for (let i = 0; i < 26; i += 1) {
    ps.list.push({
      kind: 'flare',
      x: x + (ps.rng() - 0.5) * 40,
      z: z + (ps.rng() - 0.5) * 40,
      y: altitude - 10 - ps.rng() * 30,
      vx: (ps.rng() - 0.5) * 6,
      vy: -4 - ps.rng() * 6,
      vz: (ps.rng() - 0.5) * 6,
      size: 4 + ps.rng() * 7,
      life: 1,
      decay: 0.28,
    });
  }
}

export function spawnDust(ps, x, z, altitude, n) {
  for (let i = 0; i < n; i += 1) {
    ps.list.push({
      kind: 'dust',
      x: x + (ps.rng() - 0.5) * 120,
      z: z + (ps.rng() - 0.5) * 80,
      y: altitude + ps.rng() * 10,
      vx: (ps.rng() - 0.5) * 10,
      vy: 2 + ps.rng() * 5,
      vz: -10 - ps.rng() * 16,
      size: 4 + ps.rng() * 8,
      life: 1,
      decay: 0.7,
    });
  }
}

export function stepParticles(ps, dt) {
  for (let i = ps.list.length - 1; i >= 0; i -= 1) {
    const q = ps.list[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    q.life -= q.decay * dt;
    if (q.kind === 'smoke') q.size += 14 * dt;
    if (q.life <= 0 || q.y < 0) ps.list.splice(i, 1);
  }
  if (ps.list.length > 900) ps.list.splice(0, ps.list.length - 900);
}
