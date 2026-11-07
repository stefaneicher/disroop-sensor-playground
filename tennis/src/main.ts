/** Thingy Tennis: wires the motion link, controller, game core, arena, HUD, menu and sounds. */
import { MotionController } from './core/controller.ts';
import { DIFFICULTIES, type Difficulty } from './core/cpu.ts';
import { Autopilot, Game, type GameEvent, type GameSwing } from './core/game.ts';
import type { MotionFrame } from './core/motion.ts';
import { Sfx } from './audio.ts';
import { Hud, type Badge } from './hud.ts';
import { MotionLink } from './link.ts';
import { Arena, CAMERAS, CAMERA_LABEL, type CameraMode } from './scene.ts';

type Mode = 'menu' | 'calibrate' | 'play' | 'demo';

const params = new URLSearchParams(location.search);
const demo = params.has('demo');
const $ = (id: string): HTMLElement => document.getElementById(id)!;

const stage = $('stage');
const arena = new Arena(stage);
const hud = new Hud();
const sfx = new Sfx();
const ctrl = new MotionController();
const pendingSwings: GameSwing[] = [];
const keys = new Set<string>();

let mode: Mode = demo ? 'demo' : 'menu';
let difficulty: Difficulty = (DIFFICULTIES as string[]).includes(params.get('diff') ?? '') ? (params.get('diff') as Difficulty) : 'mittel';
let game = new Game({ difficulty, seed: 52 });
let pilot: Autopilot | null = new Autopilot(3);
let serveRequest = false;
let lastFrameAt = 0;
let hintUntil = performance.now() + 10000;

arena.camera_mode = (CAMERAS as string[]).includes(params.get('cam') ?? '') ? (params.get('cam') as CameraMode) : 'third';

function onFrame(f: MotionFrame): void {
  lastFrameAt = performance.now();
  if (!ctrl.latest) {
    ctrl.feed(f);
    ctrl.calibrate(); // first pose = neutral until the player calibrates
    return;
  }
  const out = ctrl.feed(f);
  for (const s of out.swings) {
    if (mode !== 'play') continue;
    pendingSwings.push({ t: game.t - s.ageMs / 1000, speedKmh: s.speedKmh, side: s.side, kind: s.kind });
  }
  if (out.button === 'long') calibrateNow();
  if (out.button === 'short') {
    if (mode === 'calibrate') calibrateNow(true);
    else if (mode === 'menu') startMatch();
    else if (mode === 'play' && game.phase === 'over') startMatch();
    else serveRequest = true;
  }
}

const link = new MotionLink(onFrame);
link.start();

function live(): boolean {
  return link.status === 'open' && performance.now() - lastFrameAt < 1000;
}

function badge(): Badge {
  if (!live()) return 'off';
  return link.source === 'sim' ? 'sim' : 'live';
}

// ---- menu ---------------------------------------------------------------

function show(id: string, on: boolean): void {
  $(id).hidden = !on;
}

function setMode(m: Mode): void {
  mode = m;
  show('menu', m === 'menu');
  show('cal', m === 'calibrate');
  pilot = m === 'menu' || m === 'demo' ? new Autopilot(3) : null;
}

function startMatch(): void {
  sfx.unlock();
  game = new Game({ difficulty, seed: Math.floor(Math.random() * 1e9) });
  pendingSwings.length = 0;
  setMode('play');
  hud.say(`Match gegen CPU (${difficulty}) – viel Glück!`, performance.now(), 2000);
}

function calibrateNow(back = false): void {
  if (!ctrl.calibrate()) {
    hud.say('Kein Thingy verbunden – Tastatur-Modus', performance.now());
    return;
  }
  hud.say('Kalibriert ✓', performance.now());
  if (back) setMode('menu');
}

function cycleCamera(): void {
  const i = CAMERAS.indexOf(arena.camera_mode);
  arena.camera_mode = CAMERAS[(i + 1) % CAMERAS.length]!;
  $('m-cam-v').textContent = CAMERA_LABEL[arena.camera_mode];
}

$('m-start').addEventListener('click', startMatch);
$('m-diff').addEventListener('click', () => {
  difficulty = DIFFICULTIES[(DIFFICULTIES.indexOf(difficulty) + 1) % DIFFICULTIES.length]!;
  $('m-diff-v').textContent = difficulty;
});
$('m-cam').addEventListener('click', cycleCamera);
$('m-cal').addEventListener('click', () => setMode('calibrate'));
$('cal-ok').addEventListener('click', () => calibrateNow(true));
$('cal-back').addEventListener('click', () => setMode('menu'));
$('m-diff-v').textContent = difficulty;
$('m-cam-v').textContent = CAMERA_LABEL[arena.camera_mode];

// ---- keyboard / mouse fallback -------------------------------------------

function keySwing(): void {
  if (mode !== 'play') return;
  if (game.phase === 'over') {
    startMatch();
    return;
  }
  const slice = keys.has('ArrowDown');
  const side = game.ball.p[0] >= game.player.x ? 'forehand' : 'backhand';
  pendingSwings.push({ t: game.t, speedKmh: keys.has('ArrowUp') ? 145 : 115, side, kind: slice ? 'slice' : side });
}

window.addEventListener('keydown', (e) => {
  sfx.unlock();
  if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  keys.add(e.key);
  if (e.key === ' ') {
    e.preventDefault();
    if (mode === 'menu') startMatch();
    else keySwing();
  } else if (e.key === 'c' || e.key === 'C') cycleCamera();
  else if (e.key === 'k' || e.key === 'K') calibrateNow(mode === 'calibrate');
  else if (e.key === 'Enter' && mode === 'calibrate') calibrateNow(true);
  else if (e.key === 'Escape') setMode(mode === 'menu' ? 'play' : 'menu');
  else if (e.key === 'm' || e.key === 'M') sfx.muted = !sfx.muted;
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key));
stage.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (e.target instanceof HTMLCanvasElement) keySwing();
});

// ---- loop ----------------------------------------------------------------

function onEvent(e: GameEvent, now: number): void {
  hud.event(e, now);
  if (e.type === 'hit') {
    sfx.hit(Math.max(0, Math.min(1, (e.speedKmh - 50) / 110)));
    if (e.who === 'cpu' || !live()) arena.swing(e.who, e.kind === 'backhand' ? 'backhand' : 'forehand');
    if (e.who === 'player' && mode === 'play') link.beep('hit');
  } else if (e.type === 'bounce') sfx.bounce();
  else if (e.type === 'net') sfx.net();
  else if (e.type === 'point') {
    sfx.crowd(e.winner === 'player' ? 1 : 0.4);
    if (mode === 'play') link.beep(e.winner === 'player' ? 'point' : 'miss');
  }
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const keySteer = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const steer = Math.max(-1, Math.min(1, keySteer + (mode === 'play' ? ctrl.steer() : 0)));
  const swings = pilot ? pilot.swings(game, dt) : pendingSwings.splice(0);
  if (mode !== 'calibrate' && !(mode === 'menu' && !pilot)) {
    for (const e of game.update(dt, { steer, swings, serve: serveRequest })) onEvent(e, now);
  }
  serveRequest = false;
  if (pilot && game.phase === 'over') game = new Game({ difficulty, seed: Math.floor(Math.random() * 1e9) });

  const b = badge();
  hud.badge(b);
  hud.camera(CAMERA_LABEL[arena.camera_mode]);
  hud.roll(ctrl.latest ? ctrl.roll() : null);
  const hint =
    b === 'off'
      ? 'Kein Thingy: Leertaste/Klick schlägt, ←/→ laufen. Start mit „thingy tennis“ (live) oder „--sim“.'
      : now < hintUntil
        ? 'Thingy wie einen Schläger halten. Neigen = laufen, schwingen = schlagen. Knopf lang drücken = neu kalibrieren.'
        : '';
  hud.hint(mode === 'play' ? hint : '');
  if (mode === 'calibrate') $('cal-live').textContent = ctrl.latest ? `Neigung: ${ctrl.roll().toFixed(0)}°` : 'Kein Thingy verbunden';
  $('m-status').textContent =
    b === 'live' ? 'Thingy verbunden (LIVE)' : b === 'sim' ? 'Simulator verbunden (SIM)' : 'Kein Thingy – Tastatur: Leertaste schlägt, ←/→ laufen';
  if (game.phase === 'over' && mode === 'play') hud.update(game, now, 'Leertaste/Knopf = neues Match');
  else hud.update(game, now, mode === 'demo' ? 'Demo' : 'Bereit');

  arena.render(
    {
      ball: game.ball.p,
      ballVisible: true,
      player: game.player,
      cpu: game.cpu,
      racket: live() ? ctrl.racket() : null,
    },
    dt,
  );
  requestAnimationFrame(frame);
}

document.body.classList.toggle('demo', demo);
setMode(mode);
if (params.has('nohint')) hintUntil = 0;
requestAnimationFrame(frame);
(window as unknown as { tennis: object }).tennis = { game: () => game, link, mode: () => mode };
