// Banc d'essai : dégâts infligés par des compositions de coût voisin à un flot continu d'ennemis.
import { LEVELS, TOWERS, ENEMIES } from '../js/data.js';
import { Sim } from '../js/sim.js';

const setups = {
  '8 archers': ['phys', 'phys', 'phys', 'phys', 'phys', 'phys', 'phys', 'phys'],
  '4 archers': ['phys', 'phys', 'phys', 'phys'],
  'givre (eau, glace, 2 archers)': ['eau', 'glace', 'phys', 'phys'],
  'boue + brasier (eau, sable, huile, 2 feu)': ['eau', 'sable', 'huile', 'feu', 'feu'],
  'givre (eau, glace, 6 archers)': ['eau', 'glace', 'phys', 'phys', 'phys', 'phys', 'phys', 'phys'],
  'givre ×2 (2 eau, 2 glace, 4 archers)': ['eau', 'glace', 'phys', 'phys', 'eau', 'glace', 'phys', 'phys'],
  'foudre seule (5)': ['foudre', 'foudre', 'foudre', 'foudre', 'foudre'],
  'orage (2 eau, 4 foudre)': ['eau', 'foudre', 'foudre', 'eau', 'foudre', 'foudre'],
  'brasier (2 huile, 4 feu)': ['huile', 'feu', 'feu', 'huile', 'feu', 'feu'],
  'feu seul (6)': ['feu', 'feu', 'feu', 'feu', 'feu', 'feu'],
  'boue (2 eau, 2 sable, 4 archers)': ['eau', 'sable', 'phys', 'phys', 'eau', 'sable', 'phys', 'phys'],
  'boue + foudre (eau, sable, 4 foudre)': ['eau', 'sable', 'foudre', 'foudre', 'foudre', 'foudre'],
};

function run(types, enemy, gap) {
  const lv = { ...LEVELS[0], waves: [[{ type: enemy, n: 400, gap, delay: 0, path: 0 }]], hp: 1, lives: 1e9 };
  const sim = new Sim(lv, {}, 5);
  sim.gold = 1e6;
  const order = [2, 3, 5, 4, 6, 8, 9, 10];
  types.forEach((t, i) => sim.build(order[i], t));
  const cost = 1e6 - sim.gold;
  sim.callWave();
  for (let i = 0; i < 30 * 150; i++) { sim.step(1 / 30); sim.events.length = 0; }
  return { cost, kills: sim.stats.kills, leaks: sim.stats.leaks, perGold: sim.stats.dmg / cost };
}

for (const [enemy, gap] of [['gobelin', 0.3], ['orque', 0.6], ['chevalier', 0.8], ['spectre', 0.6], ['troll', 1.5]]) {
  console.log(`\n— ${enemy} (toutes les ${gap}s) —`);
  for (const [name, types] of Object.entries(setups)) {
    const r = run(types, enemy, gap);
    console.log(name.padEnd(40), `coût ${r.cost}`.padEnd(10), `tués ${r.kills}`.padEnd(10), `fuites ${r.leaks}`.padEnd(11), `dégâts/or ${r.perGold.toFixed(1)}`);
  }
}
