// DESERT THUNDER — Canyon Firefighting Airtanker. Configuration: world constants,
// aircraft limits, mission definitions and scoring. One clear job: numbers only.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = {
  seed: 20261126,
  canyonHalfWidth: 1150,
  corridorLength: 26000,
  groundBase: 0,
  lakeStart: 5200,
  lakeEnd: 6800,
  stripStart: 11800,
  stripEnd: 13000,
  fireStart: 15600,
  fireEnd: 19600,
  nightStart: 20800,
  maxAltitude: 2400,
  gravity: 1,
};

export const PLANE = {
  minSpeed: 55,
  maxSpeed: 235,
  cruiseSpeed: 150,
  stallSpeed: 88,
  climbRate: 9.5,
  sinkRate: 7.0,
  rollRate: 1.9,
  pitchRate: 1.4,
  turnRate: 0.55,
  tankCapacity: 100,
  fuelCapacity: 100,
  maxDamage: 100,
  // A full water tank makes the tanker heavy: slower climb, lazier roll.
  fullTankClimbFactor: 0.62,
  fullTankRollFactor: 0.7,
};

export const MISSIONS = [
  {
    id: 'scoop',
    name: 'MISSION 1 — SCOOP RUN',
    brief: 'Descend below 120 ft over Ember Lake and hold level for 3 seconds to fill the tank.',
    target: 'Ember Lake',
    parTime: 75,
  },
  {
    id: 'drop',
    name: 'MISSION 2 — FIRE LINE',
    brief: 'Drop retardant on all three fire rings. Coverage 80% or better saves the canyon.',
    target: 'Fire line',
    parTime: 120,
  },
  {
    id: 'pickup',
    name: 'MISSION 3 — CREW PICKUP',
    brief: 'Land on Canyon Strip, pick up the hotshot crew, then take off again.',
    target: 'Canyon Strip',
    parTime: 150,
  },
  {
    id: 'night',
    name: 'MISSION 4 — NIGHT FLARE RUN',
    brief: 'After dusk, drop a flare over each of the four fire markers. Fly by instruments.',
    target: 'Fire line at night',
    parTime: 120,
  },
];

export const SCORES = {
  coverageNeeded: 80,
  scoopHoldSeconds: 3,
  landingSpeedMax: 118,
  landingSinkMax: 6,
  flareTargets: 4,
  dropRings: 3,
};

export const COLORS = {
  skyTopDay: '#2e4a7a',
  skyMidDay: '#e8804a',
  skyLowDay: '#f7b267',
  skyTopNight: '#0b1026',
  skyMidNight: '#2a2140',
  skyLowNight: '#7a3b4d',
  sunCore: '#ffd97a',
  mesaFar: '#8a5a4e',
  mesaMid: '#a05a3c',
  mesaNear: '#c06a3e',
  groundSand: '#c98a4b',
  groundRock: '#8f5a34',
  scrub: '#5d6b2f',
  lake: '#2f7fa8',
  lakeShine: '#9fd8e8',
  fireCore: '#ffcf3d',
  fireMid: '#ff7a1a',
  fireEdge: '#d92b0e',
  smoke: '#4a4038',
  retardant: '#e83e2e',
  runway: '#3a3a40',
  runwayMark: '#f2e9c9',
  hudAmber: '#ffb347',
  hudGreen: '#7dff9a',
  hudRed: '#ff5a4a',
  hudCyan: '#8fe8ff',
  panel: 'rgba(10, 14, 24, 0.72)',
};
