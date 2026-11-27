// Keyboard and mouse input for DESERT THUNDER. One clear job: read the pilot's
// hands and turn them into a control frame the physics can use.
export function freshInput() {
  return {
    keys: new Set(),
    pitch: 0,
    roll: 0,
    throttle: 0,
    dropPressed: false,
    flarePressed: false,
    gearPressed: false,
    pausePressed: false,
    confirmPressed: false,
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
  };
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) {
      if (e.key === ' ') input.dropPressed = true;
      if (e.key === 'f' || e.key === 'F') input.flarePressed = true;
      if (e.key === 'g' || e.key === 'G') input.gearPressed = true;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') input.pausePressed = true;
      if (e.key === 'Enter') input.confirmPressed = true;
    }
    input.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - r.left) / r.width) * 1280;
    input.mouseY = ((e.clientY - r.top) / r.height) * 720;
  });
  canvas.addEventListener('click', () => {
    input.mouseClicked = true;
  });
  window.addEventListener('blur', () => input.keys.clear());
}

/** Read the held keys into a -1..1 control frame for this tick. */
export function readControls(input) {
  const k = input.keys;
  const up = k.has('ArrowUp') || k.has('w');
  const down = k.has('ArrowDown') || k.has('s');
  const left = k.has('ArrowLeft') || k.has('a');
  const right = k.has('ArrowRight') || k.has('d');
  const throttleUp = k.has('Shift') || k.has('e');
  const throttleDown = k.has('Control') || k.has('q');
  return {
    pitch: (up ? 1 : 0) + (down ? -1 : 0),
    roll: (left ? -1 : 0) + (right ? 1 : 0),
    throttle: (throttleUp ? 1 : 0) + (throttleDown ? -1 : 0),
  };
}

/** Edge-triggered actions: consume the press so it fires once. */
export function consumeActions(input) {
  const a = {
    drop: input.dropPressed,
    flare: input.flarePressed,
    gear: input.gearPressed,
    pause: input.pausePressed,
    confirm: input.confirmPressed,
    click: input.mouseClicked,
  };
  input.dropPressed = false;
  input.flarePressed = false;
  input.gearPressed = false;
  input.pausePressed = false;
  input.confirmPressed = false;
  input.mouseClicked = false;
  return a;
}
