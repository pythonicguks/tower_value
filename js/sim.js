// Simulation du jeu : aucune dépendance au DOM, pas fixe, déterministe.
// Le rendu et le son lisent `sim.events` après chaque pas.

import { TOWERS, ENEMIES, RULES, PROJECTILE_SPEED } from './data.js';

// ------------------------------------------------------------ Chemins ---

function chaikin(pts, iters) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i];
      const [bx, by] = p[i + 1];
      out.push([ax * 0.78 + bx * 0.22, ay * 0.78 + by * 0.22]);
      out.push([ax * 0.22 + bx * 0.78, ay * 0.22 + by * 0.78]);
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

export function buildPath(raw) {
  const pts = chaikin(raw, 2);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, cum, len: cum[cum.length - 1] };
}

// Position sur un chemin à la distance d. `seg` est un indice de départ (optimisation).
export function pathAt(path, d, seg = 0) {
  const { pts, cum } = path;
  let i = Math.min(seg, pts.length - 2);
  while (i < pts.length - 2 && cum[i + 1] < d) i++;
  while (i > 0 && cum[i] > d) i--;
  const span = cum[i + 1] - cum[i] || 1;
  const t = Math.max(0, Math.min(1, (d - cum[i]) / span));
  const dx = (pts[i + 1][0] - pts[i][0]) / span;
  const dy = (pts[i + 1][1] - pts[i][1]) / span;
  return {
    x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
    y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
    dx, dy, seg: i,
  };
}

export function distToPath(path, x, y) {
  let best = Infinity;
  const p = path.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], ay = p[i][1], bx = p[i + 1][0], by = p[i + 1][1];
    const vx = bx - ax, vy = by - ay;
    const l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
    const d = Math.hypot(x - ax - vx * t, y - ay - vy * t);
    if (d < best) best = d;
  }
  return best;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------- Simulation ---

export class Sim {
  constructor(level, meta = {}, seed = 12345) {
    this.level = level;
    this.talents = meta.talents || {};
    this.unlocked = meta.unlocked || Object.keys(TOWERS);
    this.rand = mulberry32(seed);
    this.paths = level.paths.map(buildPath);
    this.slots = level.slots.map(([x, y], i) => ({ i, x, y, tower: null }));
    this.gold = Math.round(level.gold * (1 + 0.08 * this.tal('tresor')));
    this.maxLives = level.lives + 2 * this.tal('remparts');
    this.lives = this.maxLives;
    this.goldMul = 1 + 0.05 * this.tal('butin');
    this.wave = -1;
    this.spawners = [];
    this.enemies = [];
    this.projectiles = [];
    this.events = [];
    this.time = 0;
    this.nextT = 0;
    this.state = 'prep'; // prep | run | won | lost
    this.nextId = 1;
    this.stats = { kills: 0, shatters: 0, ignites: 0, leaks: 0, dmg: 0 };
  }

  tal(id) { return this.talents[id] || 0; }
  ev(type, data) { data.type = type; this.events.push(data); }

  // ---------------------------------------------------------- Vagues ---

  get waveCount() { return this.level.waves.length; }
  get spawning() { return this.spawners.length > 0; }
  get lastWave() { return this.wave >= this.waveCount - 1; }

  canCallWave() {
    return (this.state === 'prep' || this.state === 'run') && !this.lastWave && !this.spawning;
  }

  earlyBonus() {
    return this.wave < 0 ? 0 : Math.max(0, Math.ceil(this.nextT)) * RULES.earlyGoldPerSec;
  }

  callWave() {
    if (!this.canCallWave()) return false;
    const bonus = this.earlyBonus();
    if (bonus > 0) { this.gold += bonus; this.ev('bonus', { amount: bonus }); }
    this.startWave();
    return true;
  }

  startWave() {
    this.wave++;
    this.state = 'run';
    const scale = this.level.hp * (1 + 0.05 * this.wave);
    for (const grp of this.level.waves[this.wave]) {
      this.spawners.push({ type: grp.type, left: grp.n, gap: grp.gap, t: grp.delay, path: grp.path, scale: scale * (grp.mul || 1) });
    }
    this.nextT = RULES.waveBreak;
    if (this.wave > 0) this.gold += this.waveGold(this.wave);
    this.ev('wave', { n: this.wave });
  }

  waveGold(i) { return RULES.waveGold + RULES.waveGoldStep * i; }

  waveSummary(i) {
    const out = {};
    const w = this.level.waves[i];
    if (!w) return out;
    for (const grp of w) out[grp.type] = (out[grp.type] || 0) + grp.n;
    return out;
  }

  spawn(type, pathIdx, scale) {
    const def = ENEMIES[type];
    const path = this.paths[pathIdx];
    const hp = Math.round(def.hp * scale);
    const p = pathAt(path, 0);
    const e = {
      id: this.nextId++, type, def, path, hp, maxHp: hp,
      dist: 0, seg: 0, x: p.x, y: p.y, dx: p.dx, dy: p.dy,
      off: (this.rand() - 0.5) * (def.boss ? 4 : 16),
      coat: null, coatT: 0, mudT: 0, mudSlow: 0, claim: 0,
      frozen: 0, freezeImm: 0, burnT: 0, burnDps: 0,
      purgeT: def.purge || 0, flash: 0, dead: false,
    };
    this.enemies.push(e);
    return e;
  }

  // ------------------------------------------------------------ Tours ---

  stat(t) { return TOWERS[t.type].lv[t.lvl]; }

  canBuild(type) { return this.unlocked.includes(type); }

  build(slotIdx, type) {
    const slot = this.slots[slotIdx];
    const def = TOWERS[type];
    if (!slot || slot.tower || !def || !this.canBuild(type) || this.gold < def.cost) return false;
    if (this.state === 'won' || this.state === 'lost') return false;
    this.gold -= def.cost;
    slot.tower = { type, lvl: 0, x: slot.x, y: slot.y, cd: 0.25, invested: def.cost, angle: -Math.PI / 2, kick: 0, slot: slotIdx };
    this.ev('build', { x: slot.x, y: slot.y, el: type });
    return true;
  }

  upgradeCost(t) {
    const base = TOWERS[t.type].up[t.lvl];
    return base == null ? null : Math.round(base * (1 - 0.1 * this.tal('architecte')));
  }

  upgrade(slotIdx) {
    const t = this.slots[slotIdx]?.tower;
    if (!t) return false;
    const cost = this.upgradeCost(t);
    if (cost == null || this.gold < cost) return false;
    this.gold -= cost;
    t.invested += cost;
    t.lvl++;
    this.ev('upgrade', { x: t.x, y: t.y, el: t.type });
    return true;
  }

  sellValue(t) {
    return Math.floor(t.invested * (this.tal('revente') ? 0.9 : RULES.sellRefund));
  }

  sell(slotIdx) {
    const slot = this.slots[slotIdx];
    if (!slot?.tower) return false;
    this.gold += this.sellValue(slot.tower);
    this.ev('sell', { x: slot.x, y: slot.y });
    slot.tower = null;
    return true;
  }

  // Classe de priorité d'une cible pour un élément (0 = à éviter).
  priority(type, e) {
    const frozen = e.frozen > 0, burning = e.burnT > 0, c = e.coat;
    switch (type) {
      case 'phys': return frozen ? (e.claim > 0 ? 2 : 3) : 1;
      case 'eau':
        if (burning) return 0;
        if (frozen) return 1;
        return c === 'oil' ? 2 : c === 'wet' ? 3 : 4;
      case 'glace':
        if (frozen) return 0;
        return c === 'wet' && e.freezeImm <= 0 ? 3 : 1;
      case 'foudre': return e.mudT > 0 ? 1 : c === 'wet' ? 3 : 2;
      case 'huile':
        if (frozen) return 0;
        if (c === 'wet') return 1;
        return c === 'oil' || burning ? 2 : 4;
      case 'feu':
        if (frozen) return 0;
        if (c === 'oil' && !e.def.noBurn) return 4;
        return c === 'wet' ? 1 : 2;
      case 'sable': return c === 'wet' ? 3 : 1;
    }
    return 1;
  }

  pickTarget(t, range) {
    let best = null, bestScore = -1;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      const cls = this.priority(t.type, e);
      // À classe égale : l'ennemi le plus avancé (en proportion du chemin).
      const score = cls * 10 + e.dist / e.path.len;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    // Une classe 0 seule en vue : le feu et l'eau s'abstiennent plutôt que de nuire.
    if (best && bestScore < 10 && (t.type === 'feu' || t.type === 'eau')) return null;
    return best;
  }

  fire(t, target) {
    const st = this.stat(t);
    t.angle = Math.atan2(target.y - (t.y - 34), target.x - t.x);
    t.kick = 1;
    if (t.type === 'foudre') {
      this.zap(t, st, target);
      return;
    }
    if (t.type === 'phys' && target.frozen > 0) target.claim = 0.6;
    this.projectiles.push({
      kind: t.type, x: t.x, y: t.y - 34, tx: target.x, ty: target.y - 6,
      target, st, speed: PROJECTILE_SPEED[t.type], dead: false,
    });
    this.ev('shot', { el: t.type, x: t.x, y: t.y - 34 });
  }

  // ---------------------------------------------------------- Effets ---

  damage(e, amount, type, pierce = false, quiet = false) {
    if (e.dead) return 0;
    const res = pierce ? 0 : (e.def.res?.[type] || 0);
    const dealt = amount * (1 - res);
    if (dealt <= 0) return 0;
    e.hp -= dealt;
    this.stats.dmg += Math.min(dealt, dealt + e.hp);
    if (!quiet) e.flash = 0.12;
    if (e.hp <= 0) this.kill(e);
    return dealt;
  }

  kill(e) {
    e.dead = true;
    const gold = Math.round(e.def.gold * this.goldMul);
    this.gold += gold;
    this.stats.kills++;
    this.ev('death', { x: e.x, y: e.y, gold, r: e.def.r, boss: !!e.def.boss, burning: e.burnT > 0 });
    if (e.burnT > 0 && this.tal('propagation')) {
      for (const o of this.enemies) {
        if (o.dead || o === e || o.coat !== 'oil') continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) <= 70) this.ignite(o, e.burnDps, 4);
      }
    }
  }

  wet(e, dur) {
    if (e.frozen > 0) return;
    if (e.burnT > 0) { e.burnT = 0; this.ev('steam', { x: e.x, y: e.y }); }
    e.coat = 'wet';
    e.coatT = dur * (e.def.wetMul || 1) * (1 + 0.4 * this.tal('deluge'));
  }

  oil(e, dur) {
    if (e.frozen > 0) return;
    if (e.burnT > 0) { e.burnT = Math.max(e.burnT, 2.5); return; }
    e.coat = 'oil';
    e.coatT = dur * (1 + 0.3 * this.tal('nappe'));
  }

  ignite(e, dps, dur) {
    if (e.dead || e.def.noBurn) return false;
    const prev = e.burnT > 0 ? e.burnDps : 0;
    e.coat = null;
    e.burnT = dur;
    e.burnDps = Math.max(prev, dps * (1 + 0.25 * this.tal('propagation')));
    this.stats.ignites++;
    this.ev('ignite', { x: e.x, y: e.y });
    return true;
  }

  thaw(e) {
    e.frozen = 0;
    e.claim = 0;
    e.freezeImm = e.def.boss ? RULES.bossFreezeImmunity : RULES.freezeImmunity;
  }

  hitPhys(e, dmg) {
    if (e.frozen > 0) {
      const mul = RULES.shatterMul + this.tal('perce');
      const x = e.x, y = e.y;
      this.thaw(e);
      const dealt = this.damage(e, dmg * mul, 'phys', true);
      this.stats.shatters++;
      this.ev('shatter', { x, y, dealt: Math.round(dealt), r: e.def.r });
      if (this.tal('eclats')) {
        for (const o of this.enemies) {
          if (o.dead || o === e) continue;
          if (Math.hypot(o.x - x, o.y - y) <= 58) this.damage(o, dmg * mul * 0.5, 'phys', true);
        }
      }
    } else {
      this.damage(e, dmg, 'phys');
      this.ev('hit', { x: e.x, y: e.y - 6, el: 'phys' });
    }
  }

  zap(t, st, target) {
    const pts = [{ x: t.x, y: t.y - 44 }];
    const hit = (e, base) => {
      const mul = e.mudT > 0 ? RULES.mudElecMul : e.coat === 'wet' ? RULES.wetElecMul : 1;
      pts.push({ x: e.x, y: e.y - 6, strong: mul > 1, weak: mul < 1 });
      this.damage(e, base * mul, 'foudre');
    };
    const seen = new Set([target]);
    const wasWet = target.coat === 'wet' && target.mudT <= 0;
    let last = { x: target.x, y: target.y };
    hit(target, st.dmg);
    if (wasWet) {
      let jumps = st.chain + 2 * this.tal('conduction');
      let base = st.dmg;
      while (jumps-- > 0) {
        let next = null, bd = RULES.chainRange;
        for (const o of this.enemies) {
          if (o.dead || seen.has(o) || o.coat !== 'wet' || o.mudT > 0) continue;
          const d = Math.hypot(o.x - last.x, o.y - last.y);
          if (d < bd) { bd = d; next = o; }
        }
        if (!next) break;
        seen.add(next);
        base *= RULES.chainMul;
        last = { x: next.x, y: next.y };
        hit(next, base);
      }
    }
    this.ev('zap', { pts });
  }

  impact(p) {
    const st = p.st, t = p.target;
    const alive = t && !t.dead;
    const x = p.tx, y = p.ty + 6;
    switch (p.kind) {
      case 'phys':
        if (alive) this.hitPhys(t, st.dmg);
        break;
      case 'glace': {
        if (!alive) break;
        const hiver = this.tal('hiver');
        this.damage(t, st.dmg * (1 + 0.5 * hiver), 'glace');
        let froze = false;
        for (const e of this.enemies) {
          if (e.dead || e.coat !== 'wet' || e.frozen > 0 || e.freezeImm > 0) continue;
          if (e !== t && Math.hypot(e.x - x, e.y - y) > st.splash + e.def.r * 0.5) continue;
          e.coat = null;
          e.frozen = st.freeze * (1 + 0.4 * hiver) * (e.def.boss ? RULES.bossFreezeMul : 1);
          froze = true;
          this.ev('freeze', { x: e.x, y: e.y, r: e.def.r });
        }
        if (!froze) this.ev('hit', { x, y: y - 6, el: 'glace' });
        break;
      }
      case 'eau':
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - x, e.y - y) > st.splash + e.def.r * 0.5) continue;
          this.damage(e, st.dmg, 'eau');
          if (!e.dead) this.wet(e, st.dur);
        }
        this.ev('splash', { x, y, r: st.splash, el: 'eau' });
        break;
      case 'huile': {
        const r = st.splash * (1 + 0.25 * this.tal('nappe'));
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - x, e.y - y) > r + e.def.r * 0.5) continue;
          this.damage(e, st.dmg, 'huile');
          if (!e.dead) this.oil(e, st.dur);
        }
        this.ev('splash', { x, y, r, el: 'huile' });
        break;
      }
      case 'sable': {
        const slow = st.slow + 0.15 * this.tal('sables');
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - x, e.y - y) > st.splash + e.def.r * 0.5) continue;
          this.damage(e, st.dmg, 'sable');
          if (!e.dead && e.coat === 'wet' && e.frozen <= 0) {
            e.coat = null;
            e.mudT = st.dur;
            e.mudSlow = slow;
            this.ev('mud', { x: e.x, y: e.y });
          }
        }
        this.ev('splash', { x, y, r: st.splash, el: 'sable' });
        break;
      }
      case 'feu': {
        if (alive) {
          let dmg = st.dmg;
          if (t.frozen > 0) {
            this.thaw(t);
            this.ev('steam', { x: t.x, y: t.y });
          } else if (t.coat === 'wet') {
            t.coat = null;
            dmg *= RULES.fireOnWetMul;
            this.ev('steam', { x: t.x, y: t.y });
          }
          this.damage(t, dmg, 'feu');
        }
        for (const e of this.enemies) {
          if (e.dead || e.coat !== 'oil' || e.frozen > 0) continue;
          if (Math.hypot(e.x - x, e.y - y) <= st.splash + e.def.r * 0.5) this.ignite(e, st.burn, st.burnDur);
        }
        this.ev('splash', { x, y, r: st.splash, el: 'feu' });
        break;
      }
    }
  }

  // ------------------------------------------------------------- Pas ---

  step(dt) {
    if (this.state === 'won' || this.state === 'lost') return;
    this.time += dt;

    // Enchaînement des vagues.
    if (this.state === 'run' && !this.spawning && !this.lastWave) {
      if (this.enemies.length === 0 && this.nextT > 4) this.nextT = 4;
      this.nextT -= dt;
      if (this.nextT <= 0) this.startWave();
    }

    // Apparitions.
    for (const s of this.spawners) {
      s.t -= dt;
      while (s.t <= 0 && s.left > 0) {
        this.spawn(s.type, s.path, s.scale);
        s.left--;
        s.t += s.gap;
      }
    }
    if (this.spawners.length) this.spawners = this.spawners.filter((s) => s.left > 0);

    // Ennemis.
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.freezeImm > 0) e.freezeImm -= dt;
      if (e.frozen > 0) {
        e.frozen -= dt;
        if (e.frozen <= 0) { this.thaw(e); this.ev('thaw', { x: e.x, y: e.y }); }
      }
      if (e.coat) {
        e.coatT -= dt;
        if (e.coatT <= 0) e.coat = null;
      }
      if (e.mudT > 0) e.mudT -= dt;
      if (e.claim > 0) e.claim -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damage(e, e.burnDps * dt, 'feu', false, true);
        if (e.dead) continue;
      } else if (e.def.regen && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.def.regen * dt);
      }
      if (e.def.purge) {
        e.purgeT -= dt;
        if (e.purgeT <= 0) {
          e.purgeT = e.def.purge;
          for (const o of this.enemies) {
            if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > 100) continue;
            o.coat = null; o.burnT = 0; o.mudT = 0;
            if (o.frozen > 0) this.thaw(o);
          }
          this.ev('purge', { x: e.x, y: e.y });
        }
      }
      let sp = e.def.speed;
      if (e.frozen > 0) sp = 0;
      else if (e.mudT > 0) sp *= 1 - e.mudSlow * (e.def.boss ? RULES.bossMudMul : 1);
      e.dist += sp * dt;
      if (e.dist >= e.path.len) {
        e.dead = true;
        e.leaked = true;
        this.lives -= e.def.lives || 1;
        this.stats.leaks++;
        this.ev('leak', { x: e.x, y: e.y, n: e.def.lives || 1 });
        continue;
      }
      const p = pathAt(e.path, e.dist, e.seg);
      e.seg = p.seg;
      e.dx = p.dx; e.dy = p.dy;
      e.x = p.x - p.dy * e.off;
      e.y = p.y + p.dx * e.off;
    }

    // Tours.
    for (const slot of this.slots) {
      const t = slot.tower;
      if (!t) continue;
      if (t.kick > 0) t.kick = Math.max(0, t.kick - dt * 5);
      t.cd -= dt;
      if (t.cd > 0) continue;
      const st = this.stat(t);
      const target = this.pickTarget(t, st.range);
      if (target) { this.fire(t, target); t.cd = st.rate; } else t.cd = 0;
    }

    // Projectiles.
    for (const p of this.projectiles) {
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y - 6; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * dt;
      if (d <= stepLen) {
        p.x = p.tx; p.y = p.ty;
        p.dead = true;
        this.impact(p);
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
        p.ang = Math.atan2(dy, dx);
      }
    }

    // Nettoyage.
    if (this.projectiles.some((p) => p.dead)) this.projectiles = this.projectiles.filter((p) => !p.dead);
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);

    // Fin de partie.
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = 'lost';
      this.ev('lost', {});
    } else if (this.lastWave && !this.spawning && this.enemies.length === 0) {
      this.state = 'won';
      this.ev('won', {});
    }
  }
}
