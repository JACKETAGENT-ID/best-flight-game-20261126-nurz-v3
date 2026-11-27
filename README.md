# DESERT THUNDER — Canyon Firefighting Airtanker

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/JACKETAGENT-ID/best-flight-game-20261126-nurz-v3/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/JACKETAGENT-ID/best-flight-game-20261126-nurz-v3/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original flight game for the make.fun **best flight game** bounty. You fly a heavy airtanker through a red-rock desert canyon at dusk, fighting a wildfire across four sorties — no network, no build step, just static files under `game/`.

## The game

- **Mission 1 — Scoop Run:** descend below 120 ft over Ember Lake and hold level for 3 seconds to fill the water tank.
- **Mission 2 — Fire Line:** drop retardant on three fire rings; 80% coverage saves the canyon.
- **Mission 3 — Crew Pickup:** land on Canyon Strip, pick up the hotshot crew, take off again.
- **Mission 4 — Night Flare Run:** after dusk, drop a flare over each of four fire markers and fly home by instruments.

## Systems that make a sortie a decision

- **Fuel** burns with throttle — a heavy tank burns more.
- **Damage** from terrain strikes and smoke; 100% ends the sortie.
- **Stall:** slow and nose-high and the wing quits — nose down, full throttle.
- **Tank weight:** a full tank slows the climb and lazes the roll.
- **Thermals:** updraft columns rise off the fire line; cold sink hangs over the lake.
- **Wind gusts** push the tanker sideways down the canyon.
- **Retardant coverage scoring**, par times, fuel and damage bonuses.

## Controls

| Key | Action |
| --- | --- |
| W / S or ↑ / ↓ | Pitch |
| A / D or ← / → | Bank and turn |
| Shift / E | Throttle up |
| Ctrl / Q | Throttle down |
| Space | Drop retardant |
| F | Drop flare |
| G | Landing gear |
| P / Esc | Pause |
| Enter / click | Menus, take off, next mission |

Mouse: click a mission on the title screen to fly it.

## Play it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts` library. The game loads nothing over the network: every script, image and sound is a file under `game/` or synthesised in code (Web Audio engine hum, no audio files).

## Layout

- `game/index.html` — the page; `game/src/main.js` — loop, screens and mission flow
- `game/src/config.js` — world, aircraft and mission constants
- `game/src/terrain.js` — canyon, lake, airstrip, fire line, thermals
- `game/src/physics.js` — flight model: throttle, stall, tank weight, fuel, damage
- `game/src/missions.js` — the four-sortie campaign and scoring
- `game/src/render.js` — chase-view canyon renderer (perspective projection)
- `game/src/aircraft.js` — the airtanker, drawn in chase view
- `game/src/hud.js` — lit instruments: altitude, speed, heading, fuel, water, damage
- `game/src/particles.js` — smoke, retardant, spray, flares, dust
- `game/src/audio.js` — synthesised engine and wind sound
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=cover|scoop|drop|night`)

## License

MIT — see [LICENSE](LICENSE).
