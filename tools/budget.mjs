// Budget d'un niveau : PV totaux à abattre rapportés à l'or disponible, vague par vague.
import { LEVELS, ENEMIES, RULES } from '../js/data.js';

for (const lv of LEVELS) {
  let gold = lv.gold, hpTot = 0;
  const rows = [];
  lv.waves.forEach((w, i) => {
    if (i > 0) gold += RULES.waveGold + RULES.waveGoldStep * i;
    const scale = lv.hp * (1 + 0.05 * i);
    let hp = 0, kill = 0, dur = 0;
    for (const g of w) { hp += ENEMIES[g.type].hp * scale * g.n; kill += ENEMIES[g.type].gold * g.n; dur = Math.max(dur, g.delay + (g.n - 1) * g.gap); }
    hpTot += hp;
    rows.push(`${(hp / gold).toFixed(1)}·${Math.round(dur)}s·${(hp / (dur + 6) / gold).toFixed(3)}`);
    gold += kill;
  });
  console.log(lv.id.padEnd(10), 'PV', String(Math.round(hpTot)).padStart(6), 'or', String(gold).padStart(5), 'ratio', (hpTot / gold).toFixed(2), '|', rows.join(' '));
}
