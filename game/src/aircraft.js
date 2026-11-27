// The airtanker, drawn in chase view. One clear job: make the aircraft look built —
// fuselage, high wings, twin turboprops, tail, belly tank and lit navigation lights.
import { VIEW } from './config.js';

export function drawAirtanker(ctx, p, time) {
  const cx = VIEW.width / 2;
  const cy = 492 + p.pitch * 26;
  const bank = p.roll * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank);
  const s = 1.0;

  // Prop wash blur behind the wings.
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-150 * s, -6, 66, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(150 * s, -6, 66, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wings: high wing with red tips and walkway stripes.
  ctx.fillStyle = '#d8d3c8';
  ctx.strokeStyle = '#8a8578';
  ctx.lineWidth = 2;
  drawWing(ctx, -1, s);
  drawWing(ctx, 1, s);

  // Tailplane.
  ctx.fillStyle = '#c9c2b2';
  ctx.beginPath();
  ctx.moveTo(-118 * s, 96 * s);
  ctx.lineTo(-196 * s, 128 * s);
  ctx.lineTo(-188 * s, 142 * s);
  ctx.lineTo(-104 * s, 118 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(118 * s, 96 * s);
  ctx.lineTo(196 * s, 128 * s);
  ctx.lineTo(188 * s, 142 * s);
  ctx.lineTo(104 * s, 118 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fuselage: rounded, shaded, red cheatline.
  const grad = ctx.createLinearGradient(0, -26 * s, 0, 30 * s);
  grad.addColorStop(0, '#f4efe4');
  grad.addColorStop(0.55, '#ddd5c2');
  grad.addColorStop(1, '#a89f88');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -118 * s);
  ctx.quadraticCurveTo(30 * s, -112 * s, 34 * s, -58 * s);
  ctx.lineTo(38 * s, 96 * s);
  ctx.quadraticCurveTo(36 * s, 128 * s, 0, 132 * s);
  ctx.quadraticCurveTo(-36 * s, 128 * s, -38 * s, 96 * s);
  ctx.lineTo(-34 * s, -58 * s);
  ctx.quadraticCurveTo(-30 * s, -112 * s, 0, -118 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7d7666';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Red cheatline and titles.
  ctx.fillStyle = '#c22a1e';
  ctx.fillRect(-37 * s, -8 * s, 74 * s, 10 * s);
  ctx.fillStyle = '#2a2620';
  ctx.font = `bold ${13 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('DESERT THUNDER', 0, 52 * s);
  ctx.font = `bold ${11 * s}px sans-serif`;
  ctx.fillStyle = '#5a5344';
  ctx.fillText('N774DT', 0, 70 * s);

  // Lit cockpit windows (the instruments glow from inside).
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(-20 * s, -104 * s);
  ctx.lineTo(0, -116 * s);
  ctx.lineTo(20 * s, -104 * s);
  ctx.lineTo(14 * s, -84 * s);
  ctx.lineTo(-14 * s, -84 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a352c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -116 * s);
  ctx.lineTo(0, -84 * s);
  ctx.stroke();

  // Belly water tank.
  ctx.fillStyle = p.water > 1 ? '#2f7fa8' : '#9a927e';
  ctx.beginPath();
  ctx.ellipse(0, 96 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a5344';
  ctx.stroke();
  ctx.fillStyle = '#e8f4f8';
  ctx.font = `bold ${9 * s}px sans-serif`;
  ctx.fillText(p.water > 1 ? 'H2O' : 'EMPTY', 0, 99 * s);

  // Twin turboprop nacelles with spinning props.
  drawEngine(ctx, -118 * s, -2 * s, p.propAngle, time);
  drawEngine(ctx, 118 * s, -2 * s, p.propAngle + 1.3, time);

  // Vertical stabiliser with red flash.
  ctx.fillStyle = '#c22a1e';
  ctx.beginPath();
  ctx.moveTo(-14 * s, 96 * s);
  ctx.lineTo(-10 * s, 150 * s);
  ctx.lineTo(10 * s, 150 * s);
  ctx.lineTo(14 * s, 96 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4efe4';
  ctx.font = `bold ${12 * s}px sans-serif`;
  ctx.fillText('DT', 0, 132 * s);

  // Navigation lights: green left, red right, white strobe flashing.
  ctx.fillStyle = '#39ff6a';
  ctx.beginPath();
  ctx.arc(-232 * s, -4 * s, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(232 * s, -4 * s, 5, 0, Math.PI * 2);
  ctx.fill();
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 152 * s, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWing(ctx, side, s) {
  ctx.beginPath();
  ctx.moveTo(0, -18 * s);
  ctx.lineTo(side * 236 * s, -16 * s);
  ctx.lineTo(side * 228 * s, 10 * s);
  ctx.lineTo(0, 12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c22a1e';
  ctx.beginPath();
  ctx.moveTo(side * 200 * s, -16 * s);
  ctx.lineTo(side * 236 * s, -16 * s);
  ctx.lineTo(side * 228 * s, 10 * s);
  ctx.lineTo(side * 196 * s, 10 * s);
  ctx.closePath();
  ctx.fill();
}

function drawEngine(ctx, x, y, angle, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#b8b0a0';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7d7666';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Spinning prop: translucent disc + two blades.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#dddddd';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.rotate(angle);
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(-3, -34, 6, 68);
  ctx.fillRect(-34, -3, 68, 6);
  ctx.restore();
}
