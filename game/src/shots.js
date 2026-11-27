// Deterministic screenshot scenes for DESERT THUNDER. One clear job: fly the real
// game forward from a fresh world with a scripted autopilot so each screenshot is
// exactly what a short sortie looks like, the same on every run.
import { WORLD, SCORES } from './config.js';
import { stepPlane, scoopWater, clamp } from './physics.js';
import { stepMission } from './missions.js';
import { spawnSmoke, spawnRetardant, spawnFlare, spawnSpray, stepParticles } from './particles.js';
import { overLakeForScoop, riverOffsetAt } from './terrain.js';

const STEP = 1 / 60;

/**
 * Steer toward a target altitude and lateral position. Pitch +1 climbs, -1 descends.
 * The roll controller tracks the target line while levelling the heading, so the
 * tanker flies straight down the corridor instead of spiralling. `descendAfterZ`
 * holds the tanker up at 420 ft until it is past that point, then lets it descend.
 */
function autopilot(p, targetAlt, targetX, descendAfterZ) {
  const alt = descendAfterZ !== undefined && p.z < descendAfterZ ? Math.max(targetAlt, 420) : targetAlt;
  const pitch = p.altitude < alt - 40 ? 0.7 : p.altitude > alt + 40 ? -0.7 : 0;
  const roll = clamp((targetX - p.x) * 0.002 - p.heading * 1.6, -0.7, 0.7);
  return { pitch, roll, throttle: p.speed < 150 ? 0.4 : p.speed > 175 ? -0.4 : 0 };
}

function flyTo(state, targetZ, targetAlt, targetX, maxSteps, descendAfterZ) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (state.p.z >= targetZ) break;
    const ctl = autopilot(state.p, targetAlt, targetX, descendAfterZ);
    stepPlane(state.p, ctl, STEP, state.campaign);
    stepParticles(state.ps, STEP);
    // Only the fire line smokes: near the fire the columns rise off the flames.
    if (i % 30 === 0 && state.p.z > WORLD.fireStart - 4000) {
      spawnSmoke(state.ps, state.p.x, state.p.z + 900, 300, 2);
    }
  }
}

export function stageShot(name, state) {
  const { p, campaign: c, ps } = state;
  c.mode = 'campaign';
  if (name === 'scoop') {
    c.index = 0;
    c.state = 'flying';
    c.message = 'SCOOP RUN — HOLD LOW OVER EMBER LAKE';
    c.messageTime = 9;
    c.time = 38;
    c.score = 320;
    flyTo(state, 5200, 260, riverOffsetAt(5600), 60 * 40);
    // Second leg: only once over the lake itself, drop to scoop height.
    flyTo(state, 6000, 95, riverOffsetAt(5900), 60 * 40, 5200);
    p.water = 55;
    for (let i = 0; i < 40; i += 1) {
      if (overLakeForScoop(p.x, p.z, p.altitude)) scoopWater(p, STEP);
      spawnSpray(ps, p.x, p.z - 40, 20, 2);
      stepParticles(ps, STEP);
    }
    return 'play';
  }
  if (name === 'drop') {
    c.index = 1;
    c.state = 'flying';
    c.message = 'FIRE LINE — DROP RETARDANT ON THE RINGS';
    c.messageTime = 9;
    c.time = 55;
    c.score = 940;
    c.rings[0].covered = 62;
    c.coverage = 21;
    flyTo(state, 17100, 380, 140, 60 * 110);
    p.water = 58;
    // Clear the smoke trail the autopilot flew through: the shot is the drop.
    ps.list.length = 0;
    spawnRetardant(ps, p.x, p.z + 120, p.altitude - 40);
    spawnSmoke(ps, p.x - 100, p.z + 1200, 300, 8);
    stepParticles(ps, STEP);
    return 'play';
  }
  if (name === 'night') {
    c.index = 3;
    c.state = 'flying';
    c.message = 'NIGHT FLARE RUN — FLY BY INSTRUMENTS';
    c.messageTime = 9;
    c.time = 61;
    c.score = 1480;
    c.flares[0].lit = true;
    c.flares[1].lit = true;
    c.flaresDropped = 2;
    flyTo(state, 18200, 430, -120, 60 * 120);
    ps.list.length = 0;
    spawnFlare(ps, p.x, p.z + 200, p.altitude - 60);
    spawnSmoke(ps, p.x, p.z + 1000, 300, 6);
    stepParticles(ps, STEP);
    return 'play';
  }
  // Cover: chase view with the canyon airstrip ahead and the fire line glowing
  // beyond it, instruments lit, HUD complete.
  c.index = 1;
  c.state = 'flying';
  c.message = 'FIRE LINE AHEAD — TANK FULL, RUNWAY IN SIGHT';
  c.messageTime = 9;
  c.time = 42;
  c.score = 760;
  c.rings[0].covered = 35;
  c.coverage = 12;
  p.water = 100;
  flyTo(state, 10400, 640, -120, 60 * 75);
  spawnSmoke(ps, p.x - 200, p.z + 5200, 300, 10);
  stepParticles(ps, STEP);
  return 'play';
}
