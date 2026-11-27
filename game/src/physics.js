// Flight physics for DESERT THUNDER. One clear job: how the airtanker moves —
// throttle, pitch, bank, stall, tank weight, fuel burn, damage and thermals.
// The model is arcade-honest: speed and turn discipline decide every mission.
import { PLANE, WORLD } from './config.js';
import { thermalLiftAt, lakeSinkAt, gustAt, clearanceAt } from './terrain.js';

export function freshPlane() {
  return {
    x: 0,
    z: 600,
    altitude: 620,
    heading: 0,
    speed: 150,
    throttle: 0.62,
    pitch: 0,
    roll: 0,
    verticalSpeed: 0,
    fuel: 100,
    water: 0,
    damage: 0,
    gearDown: false,
    flaps: false,
    stalled: false,
    onGround: false,
    crashed: false,
    landed: false,
    propAngle: 0,
  };
}

/**
 * Advance the tanker one step. `input` is { pitch, roll, throttle, gear, flaps } with
 * pitch/roll in -1..1. Returns event flags: stalled, terrainHit, fuelEmpty.
 */
export function stepPlane(p, input, dt, mission) {
  const events = { stalled: false, terrainHit: false, fuelEmpty: false };
  if (p.crashed || p.onGround) return events;

  const tankFactor = 1 - (p.water / PLANE.tankCapacity) * (1 - PLANE.fullTankClimbFactor);
  const rollFactor = 1 - (p.water / PLANE.tankCapacity) * (1 - PLANE.fullTankRollFactor);

  p.throttle = clamp(p.throttle + input.throttle * dt * 0.5, 0, 1);
  const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.45);

  p.roll = clamp(p.roll + input.roll * PLANE.rollRate * rollFactor * dt, -1, 1);
  p.roll *= Math.pow(0.35, dt);
  p.pitch = clamp(p.pitch + input.pitch * PLANE.pitchRate * dt, -1, 1);
  p.pitch *= Math.pow(0.4, dt);

  // Stall: slow and nose-high means the wing quits and the nose drops.
  p.stalled = p.speed < PLANE.stallSpeed && p.pitch > 0.15;
  if (p.stalled) {
    events.stalled = true;
    p.pitch = -0.6;
    p.verticalSpeed -= 14 * dt;
  }

  p.heading += p.roll * PLANE.turnRate * (p.speed / PLANE.cruiseSpeed) * dt;
  p.heading = wrapAngle(p.heading);

  const climb = p.pitch * PLANE.climbRate * tankFactor * (p.speed / PLANE.cruiseSpeed);
  const lift = thermalLiftAt(p.x, p.z, p.altitude);
  const sink = lakeSinkAt(p.x, p.z, p.altitude);
  p.verticalSpeed += (climb + lift - sink - p.verticalSpeed) * Math.min(1, dt * 1.6);
  if (p.stalled) p.verticalSpeed = Math.min(p.verticalSpeed, -9);
  p.altitude += p.verticalSpeed * dt * 10;
  p.altitude = clamp(p.altitude, 0, WORLD.maxAltitude);

  const forward = p.speed * 2.4 * dt;
  const lateral = p.roll * p.speed * 1.1 * dt + gustAt(p.z) * dt * 0.6;
  p.z += Math.cos(p.heading) * forward;
  p.x += Math.sin(p.heading) * forward + lateral;
  p.x = clamp(p.x, -WORLD.canyonHalfWidth - 120, WORLD.canyonHalfWidth + 120);

  // Fuel burns with throttle; a heavy tank burns more.
  const burn = (0.16 + p.throttle * 0.5 + (p.water / PLANE.tankCapacity) * 0.12) * dt;
  p.fuel = Math.max(0, p.fuel - burn);
  if (p.fuel <= 0) {
    events.fuelEmpty = true;
    p.throttle = Math.max(0, p.throttle - dt * 0.2);
  }

  p.propAngle += dt * (6 + p.throttle * 26);

  // Terrain strike.
  const clearance = clearanceAt(p.x, p.z, p.altitude);
  if (clearance <= 0) {
    if (mission && mission.id === 'pickup' && p.speed < 118 && Math.abs(p.verticalSpeed) < 6) {
      p.onGround = true;
      p.landed = true;
      p.altitude = Math.max(0, p.altitude);
    } else {
      events.terrainHit = true;
      p.damage = Math.min(PLANE.maxDamage, p.damage + 34);
      p.altitude += 60;
      p.speed *= 0.55;
      p.verticalSpeed = 4;
      if (p.damage >= PLANE.maxDamage) p.crashed = true;
    }
  }
  return events;
}

/** Drop retardant: returns the ring hit (if any) and the coverage added. */
export function dropRetardant(p, rings) {
  if (p.water < 12) return { ring: null, coverage: 0 };
  p.water = Math.max(0, p.water - 34);
  let best = null;
  let bestD = Infinity;
  for (const ring of rings) {
    const d = Math.hypot(p.x - ring.x, (p.z - ring.z) * 0.45);
    if (d < bestD) {
      bestD = d;
      best = ring;
    }
  }
  if (!best || bestD > best.radius * 1.6) return { ring: null, coverage: 0 };
  const hit = Math.max(0, 1 - bestD / (best.radius * 1.6));
  const coverage = Math.round(hit * 46);
  best.covered = Math.min(100, best.covered + coverage);
  return { ring: best, coverage };
}

/** Scoop water: fills the tank while skimming the lake. Returns litres scooped. */
export function scoopWater(p, dt) {
  if (p.water >= PLANE.tankCapacity) return 0;
  const rate = 34 * dt;
  const got = Math.min(rate, PLANE.tankCapacity - p.water);
  p.water += got;
  return got;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function headingDegrees(heading) {
  let d = (heading * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return d;
}
