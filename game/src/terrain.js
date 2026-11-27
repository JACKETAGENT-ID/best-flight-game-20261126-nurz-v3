// Canyon terrain for DESERT THUNDER. One clear job: the world the tanker flies in —
// the red-rock canyon corridor, Ember Lake, Canyon Strip, the fire line and the
// thermal columns that rise off the flames. Everything here is deterministic.
import { WORLD } from './config.js';
import { noise1 } from './random.js';

/** Height of the canyon floor (feet) at corridor distance z. Gentle rolling desert. */
export function floorHeightAt(z) {
  return 40 + noise1(z * 0.00012) * 90 + noise1(z * 0.000031 + 7.3) * 60;
}

/** Height of the canyon wall crest on one side at distance z. */
export function wallHeightAt(z, side) {
  const base = 430 + noise1(z * 0.00009 + side * 13.7) * 380;
  const mesa = noise1(z * 0.000021 + side * 4.1) * 190;
  return base + mesa;
}

/** The river snakes across the canyon floor; returns its lateral offset at z. */
export function riverOffsetAt(z) {
  return Math.sin(z * 0.00021) * 260 + Math.sin(z * 0.000063 + 2.0) * 180;
}

/** Lateral centre of the dirt airstrip. */
export function stripCentreX() {
  return -120;
}

/** The three retardant drop rings on the fire line. */
export function dropRings() {
  return [
    { z: 16200, x: -260, radius: 190, covered: 0 },
    { z: 17600, x: 140, radius: 210, covered: 0 },
    { z: 19000, x: -60, radius: 200, covered: 0 },
  ];
}

/** The four night flare markers. */
export function flareMarkers() {
  return [
    { z: 16400, x: 320, lit: false },
    { z: 17600, x: -380, lit: false },
    { z: 18800, x: 300, lit: false },
    { z: 19900, x: -180, lit: false },
  ];
}

/** Thermal updraft columns rising off the fire line; lift in ft/s at (x, z). */
export function thermalLiftAt(x, z, altitude) {
  if (z < WORLD.fireStart || z > WORLD.fireEnd) return 0;
  if (altitude > 900) return 0;
  const columns = [
    { x: -260, z: 16200 },
    { x: 140, z: 17600 },
    { x: -60, z: 19000 },
  ];
  let lift = 0;
  for (const c of columns) {
    const d = Math.hypot(x - c.x, (z - c.z) * 0.4);
    if (d < 420) lift += (1 - d / 420) * 6.5;
  }
  return lift;
}

/** Sink over cold water: the lake pulls the tanker down a touch. */
export function lakeSinkAt(x, z, altitude) {
  if (z < WORLD.lakeStart || z > WORLD.lakeEnd) return 0;
  if (altitude > 500) return 0;
  const d = Math.abs(x - riverOffsetAt(z));
  if (d > 320) return 0;
  return (1 - d / 320) * 2.2;
}

/** Wind gust (knots, lateral) at corridor distance z — deterministic, seeded by z. */
export function gustAt(z) {
  return (noise1(z * 0.0004 + 3.1) - 0.5) * 14 + Math.sin(z * 0.0011) * 4;
}

/** Distance to the nearest terrain the tanker can hit at (x, z, altitude).
 * Over the lake the water surface is the floor, so a low scoop run is safe there. */
export function clearanceAt(x, z, altitude) {
  let floor = floorHeightAt(z);
  if (z > WORLD.lakeStart && z < WORLD.lakeEnd && Math.abs(x - riverOffsetAt(z)) < 320) {
    floor = Math.min(floor, 40);
  }
  const wall = Math.abs(x) > WORLD.canyonHalfWidth ? wallHeightAt(z, x > 0 ? 1 : -1) : floor;
  return altitude - Math.max(floor, wall);
}

/** Is the tanker over the lake surface, low enough to scoop? */
export function overLakeForScoop(x, z, altitude) {
  if (z < WORLD.lakeStart || z > WORLD.lakeEnd) return false;
  if (altitude > 120) return false;
  return Math.abs(x - riverOffsetAt(z)) < 300;
}

/** Is the tanker on the runway strip, slow and low enough to land? */
export function onStripForLanding(x, z, altitude) {
  if (z < WORLD.stripStart || z > WORLD.stripEnd) return false;
  if (altitude > floorHeightAt(z) + 60) return false;
  return Math.abs(x - stripCentreX()) < 110;
}

/** Distance along the corridor to the next named landmark ahead of z. */
export function nextLandmark(z) {
  const marks = [
    { z: WORLD.lakeStart, name: 'EMBER LAKE' },
    { z: WORLD.stripStart, name: 'CANYON STRIP' },
    { z: WORLD.fireStart, name: 'FIRE LINE' },
    { z: WORLD.nightStart, name: 'NIGHT SECTOR' },
  ];
  for (const m of marks) if (m.z > z + 200) return m;
  return { z: WORLD.corridorLength, name: 'CORRIDOR END' };
}
