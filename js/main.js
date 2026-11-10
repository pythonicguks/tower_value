// Écrans, interface, entrées et boucle de jeu.

import { W, H, TOWERS, TOWER_ORDER, ENEMIES, TALENTS, LEVELS, RULES, starsFor, isUnlocked } from './data.js';
import { Sim } from './sim.js';
import { Renderer, towerIcon, enemyIcon } from './render.js';
import { Sfx } from './sfx.js';

const $ = (s) => document.querySelector(s);
const SAVE_KEY = 'tower_value_save_v1';
const STEP = 1 / 60;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const NODES = [[9, 72], [20, 36], [33, 68], [45, 30], [57, 64], [69, 28], [81, 62], [91, 28]];
const MAP_TINT = {
  prairie: 'rgba(111,157,69,.55)', foret: 'rgba(42,82,48,.55)', marais: 'rgba(61,90,80,.55)', montagne: 'rgba(190,205,215,.8)',
  desert: 'rgba(215,170,90,.65)', necropole: 'rgba(70,66,90,.55)', volcan: 'rgba(120,50,30,.55)', citadelle: 'rgba(80,90,110,.6)',
};

// ---------------------------------------------------------- Sauvegarde ---

function loadSave() {
  const base = { stars: {}, talents: {}, mute: false, speed: 1 };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { ...base, ...raw, stars: { ...raw.stars }, talents: { ...raw.talents } };
  } catch { return base; }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* stockage indisponible */ } }

const save = loadSave();
const sfx = new Sfx();
sfx.muted = !!save.mute;

const totalStars = () => LEVELS.reduce((a, lv) => a + (save.stars[lv.id] || 0), 0);
const spentStars = () => TALENTS.reduce((a, t) => a + (save.talents[t.id] || 0) * t.cost, 0);
const freeStars = () => totalStars() - spentStars();
const unlockedTowers = () => TOWER_ORDER.filter((t) => isUnlocked(t, totalStars()));
const levelOpen = (i) => i === 0 || (save.stars[LEVELS[i - 1].id] || 0) > 0;
const fr = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('fr-FR');
const starsHTML = (n, max = 3) => '<span class="st on">★</span>'.repeat(n) + '<span class="st">★</span>'.repeat(max - n);

// -------------------------------------------------------------- Icônes ---

const icons = { tower: {}, enemy: {} };
function tIcon(type, lvl = 0) { return (icons.tower[type + lvl] ||= towerIcon(type, 64, lvl)); }
function eIcon(type) { return (icons.enemy[type] ||= enemyIcon(type, 48)); }

// --------------------------------------------------------------- Écrans ---

let screen = 's-title';
let G = null;
const renderer = new Renderer($('#cv'));

function show(id) {
  screen = id;
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  if (id === 's-map') renderMap();
  if (id === 's-sanct') renderSanct();
  if (id === 's-game') { layout(); checkRotate(); } else { $('#rotate').hidden = true; }
}

function initTitle() {
  $('#wipe').hidden = totalStars() === 0;
  $('#title-towers').innerHTML = TOWER_ORDER.map((t) => `<img src="${tIcon(t, 2)}" alt="${TOWERS[t].title}" title="${TOWERS[t].title}">`).join('');
}

// ---------------------------------------------------------------- Carte ---

function renderMap() {
  const total = totalStars();
  $('#stars-total').innerHTML = `<span class="st on">★</span> ${total} / ${LEVELS.length * 3}`;
  $('#sanct-dot').hidden = freeStars() <= 0 || !TALENTS.some((t) => (save.talents[t.id] || 0) < t.max && t.cost <= freeStars());
  // En portrait, la carte se déroule de haut en bas.
  const vert = window.innerHeight > window.innerWidth * 1.1;
  const pos = NODES.map(([x, y]) => (vert ? [18 + (y - 28) * 1.45, 6 + (x - 9) * 1.03] : [x, y]));
  const [vw, vh] = vert ? [90, 150] : [160, 90];
  const pts = pos.map(([x, y]) => `${(x * vw) / 100},${(y * vh) / 100}`).join(' ');
  const map = $('#map');
  map.classList.toggle('vert', vert);
  map.style.backgroundImage = [...LEVELS.map((lv, i) => `radial-gradient(ellipse ${vert ? '38% 14%' : '21% 24%'} at ${pos[i][0]}% ${pos[i][1]}%, ${MAP_TINT[lv.theme]}, transparent 70%)`),
    'radial-gradient(ellipse at 50% 50%, #f1e5c8, #d8c599 80%, #bfa878)'].join(',');
  let html = `<svg class="trail" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
  LEVELS.forEach((lv, i) => {
    const st = save.stars[lv.id] || 0;
    const open = levelOpen(i);
    const cls = !open ? 'locked' : st ? 'done' : 'open';
    html += `<button class="node ${cls} th-${lv.theme}" style="left:${pos[i][0]}%;top:${pos[i][1]}%" data-act="level" data-level="${i}" ${open ? '' : 'disabled'}>
      <span class="medal">${open ? ROMAN[i] : '🔒'}</span>
      <span class="nname">${lv.name}</span>
      <span class="nstars">${starsHTML(st)}</span>
    </button>`;
  });
  map.innerHTML = html;

  $('#unlocks').innerHTML = TOWER_ORDER.map((t) => {
    const ok = isUnlocked(t, total);
    return `<div class="ul ${ok ? 'ok' : ''}" title="${TOWERS[t].title}">
      <img src="${tIcon(t)}" alt="">
      <span>${ok ? TOWERS[t].name : `★ ${TOWERS[t].stars}`}</span>
    </div>`;
  }).join('');
}

function openBriefing(i) {
  const lv = LEVELS[i];
  const types = [...new Set(lv.waves.flat().map((grp) => grp.type))];
  const best = save.stars[lv.id] || 0;
  openModal(`
    <p class="over dark">Bataille ${ROMAN[i]} · ${lv.waves.length} vagues</p>
    <h3>${lv.name}</h3>
    <p class="lead">${lv.intro}</p>
    <h4>Forces ennemies</h4>
    <div class="foes">${types.map((t) => `<div class="foe"><img src="${eIcon(t)}" alt=""><div><b>${ENEMIES[t].name}</b><span>${ENEMIES[t].trait}</span></div></div>`).join('')}</div>
    <h4>Votre arsenal</h4>
    <div class="arsenal">${unlockedTowers().map((t) => `<img src="${tIcon(t)}" alt="${TOWERS[t].title}" title="${TOWERS[t].title}">`).join('')}</div>
    <div class="actions">
      <span class="best">${best ? `Meilleur résultat ${starsHTML(best)}` : ''}</span>
      <button class="btn ghost dark" data-act="close">Retour</button>
      <button class="btn" data-act="start" data-level="${i}">Au combat !</button>
    </div>`);
}

// ---------------------------------------------------------- Sanctuaire ---

function renderSanct() {
  const free = freeStars();
  $('#sanct-stars').innerHTML = `<span class="st on">★</span> ${free} à dépenser`;
  const groups = [...new Set(TALENTS.map((t) => t.group))];
  $('#sanct').innerHTML = groups.map((grp) => `
    <h3>${grp}</h3>
    <div class="talents">${TALENTS.filter((t) => t.group === grp).map((t) => {
      const rank = save.talents[t.id] || 0;
      const full = rank >= t.max;
      const locked = t.el && !isUnlocked(t.el, totalStars());
      return `<div class="talent ${full ? 'full' : ''} ${locked ? 'locked' : ''}">
        ${t.el ? `<img src="${tIcon(t.el)}" alt="">` : '<div class="crest">♜</div>'}
        <div class="tbody">
          <b>${t.name}</b>
          <span>${t.desc}</span>
          <div class="pips">${'<i class="on"></i>'.repeat(rank)}${'<i></i>'.repeat(t.max - rank)}</div>
        </div>
        <button class="btn small" data-act="talent" data-id="${t.id}" ${full || locked || free < t.cost ? 'disabled' : ''}>${full ? 'Acquis' : locked ? 'Tour verrouillée' : `★ ${t.cost}`}</button>
      </div>`;
    }).join('')}</div>`).join('');
}

// ------------------------------------------------------------ Grimoire ---

const REACTIONS = [
  ['eau', 'Eau', '→', 'wet', 'Mouillé', "L'ondine mouille en zone. L'eau lave l'huile et éteint les flammes."],
  ['glace', 'Mouillé + Givre', '→', 'frozen', 'Givré', "L'ennemi s'arrête net… jusqu'à la prochaine attaque physique."],
  ['phys', 'Givré + Archers', '→', 'shatter', 'Brisé ×4', "La flèche brise la glace : dégâts ×4, armure ignorée."],
  ['foudre', 'Mouillé + Foudre', '→', 'zap', 'Dégâts ×2', "L'éclair rebondit ensuite sur les autres cibles mouillées."],
  ['sable', 'Mouillé + Sable', '→', 'mud', 'Boueux', 'Très ralenti, mais la boue isole de la foudre (dégâts ×0,3).'],
  ['huile', 'Huile', '→', 'oil', 'Huilé', "Inoffensive seule. Recouvre l'eau ; l'eau la lave."],
  ['feu', 'Huilé + Feu', '→', 'burn', 'Embrasé', 'Brûlure continue qui ignore les armures et stoppe la régénération.'],
  ['feu', 'Mouillé ou Givré + Feu', '→', 'dry', 'Séché', 'La flamme sèche ou dégèle la cible : gardez le feu loin de vos givres.'],
];

function grimoireHTML(tab = 'reactions') {
  const total = totalStars();
  const tabs = [['reactions', 'Réactions'], ['tours', 'Tours'], ['bestiaire', 'Bestiaire']];
  let body = '';
  if (tab === 'reactions') {
    body = `<p class="lead">Aucune tour ne gagne seule. Chaque élément prépare le suivant : mouillez, puis givrez, foudroyez ou embourbez ; huilez, puis embrasez.</p>
      <div class="reacts">${REACTIONS.map(([el, a, , st, b, txt]) => `
        <div class="react"><img src="${tIcon(el)}" alt=""><div><div class="eq"><span class="tag el-${el}">${a}</span><i>→</i><span class="tag st-${st}">${b}</span></div><span>${txt}</span></div></div>`).join('')}</div>`;
  } else if (tab === 'tours') {
    body = `<div class="cards">${TOWER_ORDER.map((t) => {
      const d = TOWERS[t], ok = isUnlocked(t, total);
      return `<div class="card ${ok ? '' : 'locked'}"><img src="${tIcon(t, 2)}" alt=""><div><b>${d.title}</b><em>${d.cost} or · ${ok ? d.short : `se débloque à ★ ${d.stars}`}</em><span>${d.desc}</span></div></div>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="cards">${Object.entries(ENEMIES).map(([t, d]) => `<div class="card"><img src="${eIcon(t)}" alt=""><div><b>${d.name}</b><span>${d.trait}</span></div></div>`).join('')}</div>`;
  }
  return `<h3>Grimoire</h3>
    <div class="tabs">${tabs.map(([id, name]) => `<button class="tab ${id === tab ? 'on' : ''}" data-act="grim-tab" data-tab="${id}">${name}</button>`).join('')}</div>
    <div class="grim">${body}</div>
    <div class="actions"><button class="btn" data-act="close">Fermer</button></div>`;
}

// ---------------------------------------------------------------- Modal ---

let modalOpen = false;
function openModal(html, cls = '') {
  $('#sheet').className = `sheet ${cls}`;
  $('#sheet').innerHTML = html;
  $('#modal').hidden = false;
  modalOpen = true;
}
function closeModal() {
  $('#modal').hidden = true;
  modalOpen = false;
}

// ------------------------------------------------------------------ Jeu ---

function startLevel(i) {
  const lv = LEVELS[i];
  const sim = new Sim(lv, { talents: save.talents, unlocked: unlockedTowers() }, (Math.random() * 1e9) | 0);
  G = { i, lv, sim, sel: null, hover: null, preview: null, previewUp: false, paused: false, over: false, acc: 0, speed: save.speed || 1, panelKey: '', hud: {}, before: unlockedTowers() };
  closeModal();
  show('s-game');
  renderer.setLevel(lv, sim);
  renderPanel();
  $('#btn-speed').textContent = `×${G.speed}`;
  $('#btn-pause').textContent = '❚❚';
  $('#btn-sound').classList.toggle('off', sfx.muted);
  banner(lv.name, `Bataille ${ROMAN[i]}`);
}

function layout() {
  const st = $('#stage');
  const w = st.clientWidth, h = st.clientHeight;
  if (!w || !h) return;
  const k = Math.min(w / W, h / H);
  const fw = Math.floor(W * k), fh = Math.floor(H * k);
  const f = $('#field');
  f.style.width = `${fw}px`; f.style.height = `${fh}px`;
  f.style.setProperty('--u', (fw / W).toFixed(4));
  renderer.resize(fw, fh);
}

let rotateOk = false;
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 700;
  $('#rotate').hidden = !(portrait && screen === 's-game' && !rotateOk);
}

let bannerTimer = 0;
function banner(text, sub = '') {
  const b = $('#banner');
  b.innerHTML = `${sub ? `<small>${sub}</small>` : ''}<b>${text}</b>`;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
}

function onEvent(ev) {
  renderer.handle(ev);
  switch (ev.type) {
    case 'shot': sfx.play(ev.el); break;
    case 'zap': sfx.play('foudre'); break;
    case 'freeze': case 'shatter': case 'ignite': case 'death': case 'leak': case 'build': case 'upgrade': case 'sell': case 'purge':
      sfx.play(ev.type); break;
    case 'wave': {
      sfx.play('wave');
      const boss = G.lv.waves[ev.n].find((grp) => ENEMIES[grp.type].boss);
      const last = ev.n === G.sim.waveCount - 1;
      banner(boss ? `${ENEMIES[boss.type].name} !` : last ? 'Dernière vague' : `Vague ${ev.n + 1}`, boss ? `Vague ${ev.n + 1}` : '');
      break;
    }
    case 'bonus': banner(`+${ev.amount} or`, 'Vague appelée en avance'); break;
    case 'won': case 'lost': G.over = true; setTimeout(() => endLevel(ev.type === 'won'), 1100); break;
  }
}

function flush() {
  if (!G) return;
  for (const ev of G.sim.events) onEvent(ev);
  G.sim.events.length = 0;
}

function endLevel(won) {
  if (!G) return;
  const { sim, lv, i } = G;
  sfx.play(won ? 'won' : 'lost');
  if (won) {
    const stars = starsFor(sim.lives, sim.maxLives);
    const prev = save.stars[lv.id] || 0;
    if (stars > prev) { save.stars[lv.id] = stars; persist(); }
    const fresh = unlockedTowers().filter((t) => !G.before.includes(t));
    const next = LEVELS[i + 1];
    const gained = Math.max(0, stars - prev);
    openModal(`
      <p class="over dark">${lv.name}</p>
      <h3 class="win">Victoire</h3>
      <div class="bigstars">${[1, 2, 3].map((n) => `<span class="st ${n <= stars ? 'on' : ''}" style="animation-delay:${n * 0.25}s">★</span>`).join('')}</div>
      <p class="lead center">${sim.lives} vie${sim.lives > 1 ? 's' : ''} sur ${sim.maxLives} · ${sim.stats.kills} ennemis vaincus${sim.stats.shatters ? ` · ${sim.stats.shatters} brisés` : ''}${sim.stats.ignites ? ` · ${sim.stats.ignites} embrasés` : ''}</p>
      ${gained ? `<p class="gain">+${gained} étoile${gained > 1 ? 's' : ''} pour le Sanctuaire</p>` : stars < 3 ? '<p class="hint">Perdez moins de vies pour gagner plus d\'étoiles.</p>' : ''}
      ${fresh.map((t) => `<div class="unlock"><img src="${tIcon(t)}" alt=""><div><b>Nouvelle tour : ${TOWERS[t].title}</b><span>${TOWERS[t].desc}</span></div></div>`).join('')}
      ${!next && stars ? '<p class="gain">Le royaume de Valeur est sauf. Gloire au Gardien !</p>' : ''}
      <div class="actions">
        <button class="btn ghost dark" data-act="map">Carte</button>
        <button class="btn ghost dark" data-act="start" data-level="${i}">Rejouer</button>
        ${next ? `<button class="btn" data-act="brief" data-level="${i + 1}">Bataille suivante</button>` : ''}
      </div>`, 'result');
    [1, 2, 3].forEach((n) => { if (n <= stars) setTimeout(() => sfx.play('star'), 500 + n * 250); });
  } else {
    const tips = [
      'Une Ondine seule ne tue rien : placez-la devant un Givre, une Foudre ou un Sable.',
      'Les archers visent en priorité les ennemis givrés. Gardez-les à portée de vos Givres.',
      "L'eau lave l'huile et le feu sèche l'eau : séparez vos brasiers de vos fontaines.",
      'Contre les armures, le bris de glace et la brûlure ignorent la résistance physique.',
      'Appeler une vague en avance rapporte de l’or… si votre défense suit.',
      'Les étoiles gagnées se dépensent au Sanctuaire en améliorations permanentes.',
    ];
    openModal(`
      <p class="over dark">${lv.name}</p>
      <h3 class="lose">Défaite</h3>
      <p class="lead center">Les portes de Valeur ont cédé à la vague ${sim.wave + 1} sur ${sim.waveCount}.</p>
      <p class="hint">${tips[(Math.random() * tips.length) | 0]}</p>
      <div class="actions">
        <button class="btn ghost dark" data-act="map">Carte</button>
        <button class="btn" data-act="start" data-level="${i}">Réessayer</button>
      </div>`, 'result');
  }
}

// ------------------------------------------------------------- Panneau ---

function statRows(type, lvl) {
  const cur = TOWERS[type].lv[lvl], nxt = TOWERS[type].lv[lvl + 1];
  const row = (label, f, unit = '') => {
    const a = f(cur), b = nxt ? f(nxt) : a;
    return `<div class="row"><span>${label}</span><b>${a}${unit}${nxt && a !== b ? ` <i>→ ${b}${unit}</i>` : ''}</b></div>`;
  };
  const rows = [row('Dégâts', (s) => fr(s.dmg, 0)), row('Cadence', (s) => fr(1 / s.rate, 2), '/s'), row('Portée', (s) => fr(s.range, 0))];
  if (type === 'eau') rows.push(row('Mouille', (s) => fr(s.dur, 0), ' s'));
  if (type === 'glace') rows.push(row('Givre', (s) => fr(s.freeze), ' s max'));
  if (type === 'foudre') rows.push(row('Rebonds', (s) => s.chain));
  if (type === 'huile') rows.push(row('Huile', (s) => fr(s.dur, 0), ' s'));
  if (type === 'feu') rows.push(row('Brûlure', (s) => fr(s.burn, 0), '/s'));
  if (type === 'sable') rows.push(row('Boue', (s) => `−${Math.round(s.slow * 100)}`, ' %'));
  return rows.join('');
}

function panelKey() {
  const sim = G.sim;
  const slot = G.sel != null ? sim.slots[G.sel] : null;
  return `${G.sel}|${slot?.tower?.type}|${slot?.tower?.lvl}|${sim.wave}|${sim.state}`;
}

function renderPanel() {
  const sim = G.sim;
  const p = $('#panel');
  G.panelKey = panelKey();
  G.preview = null; G.previewUp = false;
  if (G.sel == null) {
    const next = sim.wave + 1;
    let waves = '';
    if (next < sim.waveCount) {
      const sum = sim.waveSummary(next);
      waves = `<div class="ptitle">${next === 0 ? 'Première vague' : 'Vague suivante'} <em>${next + 1}/${sim.waveCount}</em></div>
        <div class="chips">${Object.entries(sum).map(([t, n]) => `<span class="echip" title="${ENEMIES[t].name} — ${ENEMIES[t].trait}"><img src="${eIcon(t)}" alt="${ENEMIES[t].name}"><b>×${n}</b></span>`).join('')}</div>`;
    } else {
      waves = '<div class="ptitle">Dernière vague lancée</div><p class="phint">Tenez bon jusqu\'au dernier ennemi.</p>';
    }
    p.innerHTML = `<div class="pwrap idle">${waves}<p class="phint">Touchez un emplacement <span class="plus">+</span> pour bâtir une tour, ou une tour pour l'améliorer.</p></div>`;
    return;
  }
  const slot = sim.slots[G.sel];
  if (!slot.tower) {
    const total = totalStars();
    p.innerHTML = `<div class="pwrap build"><div class="ptitle">Bâtir <button class="x" data-act="deselect" aria-label="Fermer">✕</button></div><div class="tgrid">${TOWER_ORDER.map((t, k) => {
      const d = TOWERS[t];
      if (!isUnlocked(t, total)) return `<div class="tbtn locked" title="${d.title} — se débloque à ${d.stars} étoiles"><img src="${tIcon(t)}" alt=""><span class="tname">${d.name}</span><span class="tcost">★ ${d.stars}</span></div>`;
      return `<button class="tbtn el-${t}" data-act="build" data-type="${t}" data-cost="${d.cost}" title="${d.title} — ${d.desc} [${k + 1}]"><img src="${tIcon(t)}" alt=""><span class="tname">${d.name}</span><span class="tcost"><i class="coin"></i>${d.cost}</span><span class="tshort">${d.short}</span></button>`;
    }).join('')}</div></div>`;
    return;
  }
  const tw = slot.tower, d = TOWERS[tw.type];
  const up = sim.upgradeCost(tw);
  p.innerHTML = `<div class="pwrap info">
    <div class="ptitle el-${tw.type}">${d.title} <button class="x" data-act="deselect" aria-label="Fermer">✕</button></div>
    <div class="ihead"><img src="${tIcon(tw.type, tw.lvl)}" alt=""><div><div class="lvl">Niveau ${tw.lvl + 1}/3</div><p>${d.desc}</p></div></div>
    <div class="stats">${statRows(tw.type, tw.lvl)}</div>
    <div class="pact">
      ${up != null ? `<button class="btn small" data-act="upgrade" data-cost="${up}">Améliorer <i class="coin"></i>${up}</button>` : '<span class="maxed">Niveau maximal</span>'}
      <button class="btn small ghost" data-act="sell">Vendre <i class="coin"></i>${sim.sellValue(tw)}</button>
    </div></div>`;
}

function updateHud() {
  const sim = G.sim, h = G.hud;
  const set = (key, val, fn) => { if (h[key] !== val) { h[key] = val; fn(val); } };
  set('lives', sim.lives, (v) => { $('#hud-lives').innerHTML = `<i class="heart"></i>${v}`; $('#hud-lives').classList.toggle('low', v <= sim.maxLives * 0.3); });
  set('gold', sim.gold, (v) => { $('#hud-gold').innerHTML = `<i class="coin"></i>${v}`; });
  set('wave', sim.wave, (v) => { $('#hud-wave').textContent = `Vague ${Math.max(1, v + 1)}/${sim.waveCount}`; });

  let label, cls = '';
  if (sim.state === 'prep') { label = 'Lancer la première vague'; cls = 'ready pulse'; }
  else if (sim.state === 'won' || sim.state === 'lost') { label = ''; cls = 'gone'; }
  else if (sim.spawning) { label = `Vague ${sim.wave + 1} en cours`; cls = 'busy'; }
  else if (sim.lastWave) { label = 'Dernière vague'; cls = 'busy'; }
  else { const b = sim.earlyBonus(); label = `Vague suivante dans ${Math.max(0, Math.ceil(sim.nextT))} s${b ? ` · appeler +${b}` : ''}`; cls = 'ready'; }
  set('wbtn', label + cls, () => { const b = $('#wavebtn'); b.innerHTML = label + (cls.includes('ready') && label.includes('appeler') ? '<i class="coin"></i>' : ''); b.className = `wavebtn ${cls}`; b.disabled = !cls.includes('ready'); });

  set('paused', G.paused, (v) => { $('#btn-pause').textContent = v ? '▶' : '❚❚'; });
  if (panelKey() !== G.panelKey) renderPanel();
  for (const el of document.querySelectorAll('#panel [data-cost]')) el.classList.toggle('poor', sim.gold < +el.dataset.cost);
}

// -------------------------------------------------------------- Actions ---

function select(i) {
  if (!G || G.over) return;
  if (G.sel === i) return;
  G.sel = i;
  if (i != null) sfx.play('click');
  renderPanel();
}

function act(name, el) {
  sfx.unlock();
  switch (name) {
    case 'play': case 'map': closeModal(); G = null; show('s-map'); break;
    case 'title': initTitle(); show('s-title'); break;
    case 'wipe':
      if (window.confirm('Effacer toutes les étoiles et tous les talents ?')) { save.stars = {}; save.talents = {}; persist(); initTitle(); }
      break;
    case 'sanct': show('s-sanct'); break;
    case 'grimoire':
      if (G && screen === 's-game') G.paused = true;
      openModal(grimoireHTML(), 'wide');
      break;
    case 'grim-tab': openModal(grimoireHTML(el.dataset.tab), 'wide'); break;
    case 'close':
      closeModal();
      if (G && screen === 's-game' && !G.over) setPaused(false);
      break;
    case 'level': case 'brief': openBriefing(+el.dataset.level); break;
    case 'start': startLevel(+el.dataset.level); break;
    case 'talent': {
      const t = TALENTS.find((x) => x.id === el.dataset.id);
      const rank = save.talents[t.id] || 0;
      if (rank < t.max && freeStars() >= t.cost) { save.talents[t.id] = rank + 1; persist(); sfx.play('upgrade'); renderSanct(); }
      break;
    }
    case 'reset-talents': save.talents = {}; persist(); sfx.play('sell'); renderSanct(); break;
    case 'rotate-ok': rotateOk = true; $('#rotate').hidden = true; break;
  }
  if (!G || screen !== 's-game') return;
  const sim = G.sim;
  switch (name) {
    case 'wave': if (sim.callWave()) { G.paused = false; $('#btn-pause').textContent = '❚❚'; } break;
    case 'speed': G.speed = G.speed >= 3 ? 1 : G.speed + 1; save.speed = G.speed; persist(); $('#btn-speed').textContent = `×${G.speed}`; break;
    case 'pause':
      if (G.over) break;
      G.paused = true;
      openModal(`<h3>Pause</h3><p class="lead center">${G.lv.name} · vague ${Math.max(1, sim.wave + 1)}/${sim.waveCount}</p>
        <div class="actions col">
          <button class="btn" data-act="close">Reprendre</button>
          <button class="btn ghost dark" data-act="start" data-level="${G.i}">Recommencer</button>
          <button class="btn ghost dark" data-act="map">Abandonner la bataille</button>
        </div>`, 'narrow');
      break;
    case 'sound': sfx.muted = !sfx.muted; save.mute = sfx.muted; persist(); $('#btn-sound').classList.toggle('off', sfx.muted); break;
    case 'deselect': select(null); break;
    case 'build':
      if (G.sel != null && sim.build(G.sel, el.dataset.type)) renderPanel(); else sfx.play('deny');
      break;
    case 'upgrade': if (G.sel != null && !sim.upgrade(G.sel)) sfx.play('deny'); break;
    case 'sell': if (G.sel != null && sim.sell(G.sel)) { G.sel = null; renderPanel(); } break;
  }
  flush();
}

function setPaused(v) {
  if (!G) return;
  G.paused = v;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) act(el.dataset.act, el);
});
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' && !$('#sheet').classList.contains('result')) act('close');
});

// aperçu de portée au survol des boutons du panneau
$('#panel').addEventListener('pointerover', (e) => {
  if (!G) return;
  const b = e.target.closest('[data-act]');
  G.preview = b?.dataset.act === 'build' ? b.dataset.type : null;
  G.previewUp = b?.dataset.act === 'upgrade';
});
$('#panel').addEventListener('pointerleave', () => { if (G) { G.preview = null; G.previewUp = false; } });

// ------------------------------------------------------------- Pointeur ---

const cv = $('#cv');
function fieldPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function pickSlot(p, radius) {
  let best = null, bd = radius;
  for (const s of G.sim.slots) {
    const d = Math.hypot(s.x - p.x, s.y - (s.tower ? 12 : 0) - p.y);
    if (d < bd) { bd = d; best = s.i; }
  }
  return best;
}
cv.addEventListener('pointerdown', (e) => {
  if (!G) return;
  sfx.unlock();
  select(pickSlot(fieldPos(e), e.pointerType === 'mouse' ? 32 : 44));
});
cv.addEventListener('pointermove', (e) => {
  if (!G || e.pointerType !== 'mouse') return;
  G.hover = pickSlot(fieldPos(e), 32);
  cv.style.cursor = G.hover != null ? 'pointer' : 'default';
});
cv.addEventListener('pointerleave', () => { if (G) G.hover = null; });

document.addEventListener('keydown', (e) => {
  if (!G || screen !== 's-game') return;
  if (e.key === 'Escape') { if (modalOpen) act('close'); else if (G.sel != null) select(null); else act('pause'); return; }
  if (modalOpen || G.over) return;
  const slot = G.sel != null ? G.sim.slots[G.sel] : null;
  if (e.key >= '1' && e.key <= '7' && slot && !slot.tower) { act('build', { dataset: { type: TOWER_ORDER[+e.key - 1] } }); return; }
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'p') { e.preventDefault(); G.paused = !G.paused; $('#btn-pause').textContent = G.paused ? '▶' : '❚❚'; if (G.paused) banner('Pause', 'Espace pour reprendre'); }
  else if (k === 'n' || k === 'enter') act('wave');
  else if (k === 'a' || k === 'u') { if (slot?.tower) act('upgrade'); }
  else if (k === 'v' || k === 'delete') { if (slot?.tower) act('sell'); }
  else if (k === 'f') act('speed');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G && screen === 's-game' && !G.over && !modalOpen && G.sim.state === 'run') act('pause');
});

window.addEventListener('resize', () => { if (screen === 's-game') { layout(); checkRotate(); } else if (screen === 's-map') renderMap(); });
if (window.ResizeObserver) new ResizeObserver(() => { if (screen === 's-game') layout(); }).observe($('#stage'));

// --------------------------------------------------------------- Boucle ---

let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  if (!G || screen !== 's-game') return;
  if (!G.paused && !G.over) {
    G.acc += dt * G.speed;
    let n = 0;
    while (G.acc >= STEP && n++ < 12) {
      G.sim.step(STEP);
      flush();
      G.acc -= STEP;
      if (G.over) break;
    }
    if (n >= 12) G.acc = 0;
  }
  renderer.draw(G.sim, { selected: G.sel, hover: G.hover, preview: G.preview, previewUp: G.previewUp }, G.paused ? 0 : dt);
  updateHud();
}

initTitle();
show('s-title');
requestAnimationFrame(frame);

// Accès pour les tests et le débogage depuis la console.
window.__tv = { get game() { return G; }, save, LEVELS, show, startLevel, RULES };
