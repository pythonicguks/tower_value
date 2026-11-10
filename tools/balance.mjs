// Vérification des cartes et équilibrage par simulation sans affichage.
//   node tools/balance.mjs            → tous les niveaux, plusieurs stratégies
//   node tools/balance.mjs check      → géométrie des emplacements uniquement

import { LEVELS, TOWERS, TOWER_ORDER, W, H, starsFor, isUnlocked, tuneWaves } from '../js/data.js';
import { Sim, buildPath, distToPath } from '../js/sim.js';

function checkMaps() {
  let ok = true;
  for (const lv of LEVELS) {
    const paths = lv.paths.map(buildPath);
    lv.slots.forEach(([x, y], i) => {
      const d = Math.min(...paths.map((p) => distToPath(p, x, y)));
      const issues = [];
      if (d < 40) issues.push(`trop près du chemin (${d.toFixed(0)})`);
      if (d > 80) issues.push(`loin du chemin (${d.toFixed(0)})`);
      if (x < 30 || x > W - 30 || y < 56 || y > H - 14) issues.push('près du bord');
      lv.slots.forEach(([x2, y2], j) => {
        if (j > i && Math.hypot(x - x2, y - y2) < 54) issues.push(`collé à l'emplacement ${j}`);
      });
      if (issues.length) { ok = false; console.log(`${lv.id} #${i} (${x},${y}) : ${issues.join(', ')}`); }
    });
  }
  console.log(ok ? 'Cartes : OK' : 'Cartes : à corriger');
  return ok;
}

// Longueur de chemin couverte par un emplacement.
function coverage(sim, slot, range = 118) {
  let c = 0;
  for (const p of sim.paths) {
    for (let d = 0; d < p.len; d += 8) {
      const i = p.cum.findIndex((v) => v > d);
      const k = Math.max(1, i) - 1;
      const t = (d - p.cum[k]) / ((p.cum[k + 1] - p.cum[k]) || 1);
      const x = p.pts[k][0] + (p.pts[k + 1][0] - p.pts[k][0]) * t;
      const y = p.pts[k][1] + (p.pts[k + 1][1] - p.pts[k][1]) * t;
      if (Math.hypot(x - slot.x, y - slot.y) <= range) c += 8;
    }
  }
  return c;
}

const FROST = ['phys', 'eau', 'glace', 'phys'];
const STORM = ['eau', 'foudre', 'foudre'];
const FIRE = ['huile', 'feu', 'feu'];
const MUD = ['eau', 'sable', 'huile', 'feu'];
const has = (un, grp) => grp.every((t) => un.includes(t));
const PLANS = {
  phys: () => [['phys']],
  givre: () => [FROST, ['eau', 'glace', 'phys']],
  orage: (un) => (has(un, STORM) ? [['phys', ...STORM], STORM, FROST] : [FROST]),
  brasier: (un) => (has(un, FIRE) ? [['phys', ...FIRE], FIRE, has(un, STORM) ? STORM : FROST] : [FROST]),
  mixte: (un) => [FROST, STORM, FIRE, MUD].filter((grp) => has(un, grp)),
};
const DEALERS = ['phys', 'foudre', 'feu'];

function play(level, { plan = 'mixte', stars = 99, talents = {}, seed = 7, trace = null } = {}) {
  const unlocked = TOWER_ORDER.filter((t) => isUnlocked(t, stars));
  const sim = new Sim(level, { talents, unlocked }, seed);
  const cov = sim.slots.map((s) => coverage(sim, s));
  const groups = PLANS[plan](unlocked);
  const queue = [];
  const free = new Set(sim.slots.map((s) => s.i));
  let gi = 0;
  while (free.size) {
    const grp = groups[gi % groups.length];
    gi++;
    let anchor = null;
    for (const i of free) if (anchor == null || cov[i] > cov[anchor]) anchor = i;
    const a = sim.slots[anchor];
    const near = [...free].sort((i, j) =>
      Math.hypot(sim.slots[i].x - a.x, sim.slots[i].y - a.y) - Math.hypot(sim.slots[j].x - a.x, sim.slots[j].y - a.y));
    grp.forEach((type, k) => {
      const s = near[k];
      if (s == null) return;
      free.delete(s);
      queue.push({ slot: s, type });
    });
  }
  const dt = 1 / 30;
  let guard = 0, built = 0;
  sim.callWave();
  while (sim.state === 'run' && guard++ < 30 * 60 * 40) {
    // Construire ; une amélioration toutes les trois constructions, puis uniquement des améliorations.
    for (let k = 0; k < 4; k++) {
      const wantUp = queue.length === 0 || built >= 3;
      if (wantUp) {
        let best = null, bc = Infinity;
        for (const s of sim.slots) {
          if (!s.tower) continue;
          let c = sim.upgradeCost(s.tower);
          if (c == null) continue;
          if (!DEALERS.includes(s.tower.type)) c += 1000; // les soutiens passent après
          if (c < bc) { bc = c; best = s; }
        }
        if (best) bc = sim.upgradeCost(best.tower);
        if (!best) { built = 0; if (!queue.length) break; continue; }
        if (sim.gold >= bc) { sim.upgrade(best.i); built = 0; continue; }
        break;
      }
      const q = queue[0];
      if (sim.gold >= TOWERS[q.type].cost) { sim.build(q.slot, q.type); queue.shift(); built++; continue; }
      break;
    }
    sim.step(dt);
    if (trace) for (const ev of sim.events) if (ev.type === 'wave') trace.push(`v${ev.n + 1}:${sim.lives}♥ ${sim.gold}or`);
    sim.events.length = 0;
  }
  return { state: sim.state, lives: sim.lives, max: sim.maxLives, wave: sim.wave + 1, waves: sim.waveCount, gold: sim.gold, time: sim.time, stats: sim.stats };
}

function best(lv, stars, talents) {
  let top = null;
  for (const plan of ['givre', 'orage', 'brasier', 'mixte']) {
    const r = play(lv, { plan, stars, talents });
    r.plan = plan;
    r.score = r.state === 'won' ? 100 + r.lives : r.wave;
    if (!top || r.score > top.score) top = r;
  }
  return top;
}

const ALL_TALENTS = { tresor: 3, remparts: 2, butin: 2, architecte: 2, revente: 1, perce: 1, eclats: 1, hiver: 1, deluge: 1, conduction: 1, nappe: 1, propagation: 1, sables: 1 };

function report() {
  const pad = (s, n) => String(s).padEnd(n);
  const cell = (r) => pad(`${r.state === 'won' ? '★'.repeat(starsFor(r.lives, r.max)) : 'perdu v' + r.wave + '/' + r.waves} ${r.lives}♥ ${r.plan || ''}`, 24);
  console.log(pad('niveau', 11), pad('tours min (1★/niv.)', 24), pad('toutes les tours', 24), pad('+ tous les talents', 24), pad('archers seuls', 20), 'durée');
  LEVELS.forEach((lv, i) => {
    const a = best(lv, i, {});
    const b = best(lv, 99, {});
    const d = best(lv, 99, ALL_TALENTS);
    const c = play(lv, { plan: 'phys', stars: 99 });
    console.log(pad(lv.id, 11), cell(a), cell(b), cell(d), cell(c).slice(0, 20), `${Math.round(b.time / 60)} min`);
  });
}

// Cherche, pour chaque niveau, le flux le plus dur que le joueur automatique (sans talent, tours
// minimales) termine encore avec le nombre de vies visé — et tous les flux plus doux aussi.
function autotune() {
  const targets = [20, 17, 15, 13, 11, 9, 7, 5];
  const shape = 1.25;
  LEVELS.forEach((lv, i) => {
    let pick = 0.05;
    const rows = [];
    for (let start = 0.06; start <= 0.4001; start += 0.01) {
      lv.flux = [start, start * shape];
      tuneWaves(lv);
      const r = best(lv, i, {});
      const lives = r.state === 'won' ? r.lives : 0;
      rows.push(`${start.toFixed(2)}:${lives}`);
      if (lives < targets[i]) break;
      pick = start;
    }
    lv.flux = [Math.round(pick * 1000) / 1000, Math.round(pick * shape * 1000) / 1000];
    tuneWaves(lv);
    console.log(lv.id.padEnd(10), 'flux', JSON.stringify(lv.flux), '|', rows.join(' '));
  });
}

if (process.argv[2] === 'check') checkMaps();
else if (process.argv[2] === 'tune') { autotune(); report(); }
else if (process.argv[2] === 'trace') {
  for (const lv of LEVELS) {
    const trace = [];
    const r = play(lv, { plan: process.argv[3] || 'mixte', stars: 99, trace });
    console.log(lv.id, r.state, trace.join(' | '), JSON.stringify(r.stats));
  }
}
else { checkMaps(); report(); }

export { play, checkMaps };
