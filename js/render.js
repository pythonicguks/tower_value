// Rendu Canvas 2D : décors, tours, ennemis et effets, tous dessinés par code.

import { W, H, TOWERS, ENEMIES, STATUS } from './data.js';
import { pathAt, distToPath } from './sim.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------- Outils ---

function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h;
}
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}
function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}

// --------------------------------------------------------------- Décors ---

const THEMES = {
  prairie: { ground: ['#6f9d45', '#527f36'], blots: ['#7fb04f', '#46722f', '#8bbb57'], path: ['#5f4a2c', '#b3945c', '#cbb07a'], deco: ['tree', 'tree', 'bush', 'flowers', 'rock'], dark: 0.28 },
  foret: { ground: ['#3d6e3c', '#2a5230'], blots: ['#47803f', '#224528', '#5a8c44'], path: ['#3f3020', '#8b7147', '#a48a5c'], deco: ['pine', 'pine', 'tree', 'pine', 'mushroom', 'bush'], dark: 0.38, dense: 1.5 },
  marais: { ground: ['#56683f', '#3d4f3a'], blots: ['#3f6c66', '#37595a', '#6a7a45'], path: ['#352c1f', '#7b6a48', '#93815a'], deco: ['reed', 'reed', 'deadtree', 'pond', 'bush', 'rock'], dark: 0.4 },
  montagne: { ground: ['#e6eef3', '#bccbd6'], blots: ['#f7fbfd', '#a9bccb', '#d2dee6'], path: ['#55524f', '#96908a', '#aea8a0'], deco: ['snowpine', 'snowpine', 'rock', 'rock', 'drift'], dark: 0.22 },
  desert: { ground: ['#e6c47f', '#cfa35a'], blots: ['#f0d596', '#c2914a', '#e9cb8a'], path: ['#7b5a30', '#a98049', '#be975d'], deco: ['cactus', 'dune', 'dune', 'rock', 'bones', 'palm'], dark: 0.24 },
  necropole: { ground: ['#454355', '#2c2a3a'], blots: ['#544f6a', '#232130', '#4a3f60'], path: ['#1e1c26', '#676372', '#7d7989'], deco: ['tomb', 'tomb', 'deadtree', 'cross', 'rock', 'wisp'], dark: 0.45 },
  volcan: { ground: ['#45332f', '#2a1e1d'], blots: ['#5a3a30', '#1d1413', '#6b3a26'], path: ['#191211', '#6a5952', '#83716a'], deco: ['lava', 'spire', 'rock', 'rock', 'ember', 'spire'], dark: 0.45 },
  citadelle: { ground: ['#5a6070', '#3d4250'], blots: ['#687083', '#30343f', '#535a6b'], path: ['#23262e', '#878c9a', '#a3a8b6'], deco: ['pillar', 'banner', 'brazier', 'rock', 'pillar', 'statue'], dark: 0.4, tiles: true },
};

const DECO = {
  tree(g, x, y, s, r) {
    g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, x + 3 * s, y + 2 * s, 13 * s, 5 * s);
    g.fillStyle = '#5a4028'; g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 12 * s);
    const c = r() > 0.5 ? ['#3f7a31', '#56963f', '#74b354'] : ['#356d33', '#4a8a3c', '#68a850'];
    g.fillStyle = c[0]; circ(g, x, y - 16 * s, 12 * s);
    g.fillStyle = c[1]; circ(g, x - 4 * s, y - 20 * s, 9 * s); circ(g, x + 5 * s, y - 17 * s, 8 * s);
    g.fillStyle = c[2]; circ(g, x - 3 * s, y - 23 * s, 5 * s);
  },
  pine(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 3 * s, y + 2 * s, 11 * s, 4 * s);
    g.fillStyle = '#4a3421'; g.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 8 * s);
    const cols = ['#1f4a2c', '#2a5c34', '#377040'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = cols[i];
      const w = (12 - i * 3) * s, by = y - (4 + i * 9) * s;
      poly(g, [x - w, by, x + w, by, x, by - 14 * s]);
    }
  },
  snowpine(g, x, y, s) {
    g.fillStyle = 'rgba(40,60,90,.18)'; ell(g, x + 3 * s, y + 2 * s, 11 * s, 4 * s);
    g.fillStyle = '#4a3a2c'; g.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 8 * s);
    for (let i = 0; i < 3; i++) {
      const w = (12 - i * 3) * s, by = y - (4 + i * 9) * s;
      g.fillStyle = ['#2c5547', '#346352', '#3d705d'][i];
      poly(g, [x - w, by, x + w, by, x, by - 14 * s]);
      g.fillStyle = '#f4f9fc';
      poly(g, [x - w * 0.55, by - 6 * s, x + w * 0.5, by - 6.5 * s, x, by - 14 * s]);
    }
  },
  bush(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, x + 2 * s, y + 1 * s, 9 * s, 3 * s);
    g.fillStyle = '#3d7534'; circ(g, x - 4 * s, y - 3 * s, 5 * s); circ(g, x + 4 * s, y - 3 * s, 5 * s);
    g.fillStyle = '#58994a'; circ(g, x, y - 6 * s, 5.5 * s);
  },
  flowers(g, x, y, s, r) {
    const cols = ['#fff3a0', '#ffb3c7', '#ffffff', '#c9b3ff'];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[(r() * cols.length) | 0];
      circ(g, x + (r() - 0.5) * 22 * s, y + (r() - 0.5) * 12 * s, 1.6 * s);
    }
  },
  rock(g, x, y, s, r, th) {
    const base = th === 'montagne' ? ['#8a96a3', '#b7c2cc'] : th === 'volcan' ? ['#2b2221', '#4a3b38'] : th === 'desert' ? ['#a57d4c', '#c9a26a'] : ['#6f716f', '#979a96'];
    g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, x + 2 * s, y + 2 * s, 10 * s, 4 * s);
    g.fillStyle = base[0]; poly(g, [x - 9 * s, y, x - 6 * s, y - 8 * s, x + 1 * s, y - 11 * s, x + 8 * s, y - 6 * s, x + 10 * s, y]);
    g.fillStyle = base[1]; poly(g, [x - 5 * s, y - 7 * s, x + 1 * s, y - 10.5 * s, x + 4 * s, y - 6 * s, x - 2 * s, y - 4 * s]);
  },
  mushroom(g, x, y, s) {
    g.fillStyle = '#efe6d2'; g.fillRect(x - 1.2 * s, y - 5 * s, 2.4 * s, 5 * s);
    g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(x, y - 5 * s, 5 * s, 3.5 * s, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#fff'; circ(g, x - 2 * s, y - 6.5 * s, 0.8 * s); circ(g, x + 1.5 * s, y - 7 * s, 0.8 * s);
  },
  reed(g, x, y, s, r) {
    g.lineWidth = 1.4 * s;
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 3 * s, h = (12 + r() * 10) * s, lean = (r() - 0.5) * 6 * s;
      g.strokeStyle = '#7d8a45'; line(g, x + dx, y, x + dx + lean, y - h);
      g.fillStyle = '#5b3d22'; ell(g, x + dx + lean, y - h, 1.4 * s, 3.4 * s);
    }
  },
  pond(g, x, y, s) {
    g.fillStyle = 'rgba(30,50,50,.5)'; ell(g, x, y, 22 * s, 10 * s);
    g.fillStyle = '#3f7474'; ell(g, x, y - 1 * s, 20 * s, 8.5 * s);
    g.fillStyle = 'rgba(160,220,210,.35)'; ell(g, x - 5 * s, y - 3 * s, 8 * s, 2.5 * s);
    g.fillStyle = '#5f9a4a'; ell(g, x + 8 * s, y + 1 * s, 4 * s, 2 * s); ell(g, x - 10 * s, y + 2 * s, 3 * s, 1.5 * s);
  },
  deadtree(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 2 * s, y + 1 * s, 8 * s, 3 * s);
    g.strokeStyle = '#2f2620'; g.lineCap = 'round';
    g.lineWidth = 3 * s; line(g, x, y, x, y - 16 * s);
    g.lineWidth = 1.8 * s; line(g, x, y - 10 * s, x - 8 * s, y - 20 * s); line(g, x, y - 13 * s, x + 7 * s, y - 22 * s);
    g.lineWidth = 1.1 * s; line(g, x - 5 * s, y - 16 * s, x - 9 * s, y - 14 * s); line(g, x + 4 * s, y - 18 * s, x + 9 * s, y - 17 * s);
  },
  drift(g, x, y, s) {
    g.fillStyle = 'rgba(120,150,180,.25)'; ell(g, x + 2 * s, y + 2 * s, 20 * s, 6 * s);
    g.fillStyle = '#f8fcfe'; ell(g, x, y, 19 * s, 6 * s);
  },
  cactus(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, x + 3 * s, y + 1 * s, 8 * s, 3 * s);
    g.fillStyle = '#4f8a4a';
    rrect(g, x - 3 * s, y - 20 * s, 6 * s, 20 * s, 3 * s);
    rrect(g, x - 10 * s, y - 14 * s, 4 * s, 8 * s, 2 * s); g.fillRect(x - 8 * s, y - 9 * s, 6 * s, 3 * s);
    rrect(g, x + 6 * s, y - 17 * s, 4 * s, 9 * s, 2 * s); g.fillRect(x + 2 * s, y - 11 * s, 6 * s, 3 * s);
    g.fillStyle = '#6aa862'; g.fillRect(x - 1.5 * s, y - 18 * s, 1.5 * s, 16 * s);
  },
  dune(g, x, y, s) {
    g.strokeStyle = 'rgba(150,105,50,.45)'; g.lineWidth = 2 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 26 * s, y); g.quadraticCurveTo(x, y - 12 * s, x + 26 * s, y); g.stroke();
    g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1.4 * s;
    g.beginPath(); g.moveTo(x - 20 * s, y - 4 * s); g.quadraticCurveTo(x, y - 14 * s, x + 20 * s, y - 4 * s); g.stroke();
  },
  bones(g, x, y, s) {
    g.strokeStyle = '#f2ead6'; g.lineWidth = 1.6 * s; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + i * 4 * s, y, 5 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = '#f2ead6'; circ(g, x - 7 * s, y - 2 * s, 3 * s);
  },
  palm(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, x + 4 * s, y + 1 * s, 10 * s, 3 * s);
    g.strokeStyle = '#7a5a34'; g.lineWidth = 3 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4 * s, y - 12 * s, x + 2 * s, y - 24 * s); g.stroke();
    g.strokeStyle = '#3f8a45'; g.lineWidth = 2.6 * s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      g.beginPath(); g.moveTo(x + 2 * s, y - 24 * s);
      g.quadraticCurveTo(x + 2 * s + Math.cos(a) * 8 * s, y - 28 * s + Math.sin(a) * 3 * s, x + 2 * s + Math.cos(a) * 13 * s, y - 21 * s + Math.sin(a) * 5 * s);
      g.stroke();
    }
  },
  tomb(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 2 * s, y + 1 * s, 8 * s, 3 * s);
    g.fillStyle = '#74707f'; rrect(g, x - 5 * s, y - 13 * s, 10 * s, 14 * s, 4 * s);
    g.fillStyle = '#8e8a99'; rrect(g, x - 5 * s, y - 13 * s, 4 * s, 14 * s, 2 * s);
    g.strokeStyle = '#3d3a48'; g.lineWidth = 1.1 * s; line(g, x, y - 10 * s, x, y - 4 * s); line(g, x - 2.5 * s, y - 8 * s, x + 2.5 * s, y - 8 * s);
  },
  cross(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 2 * s, y + 1 * s, 6 * s, 2.4 * s);
    g.fillStyle = '#5e5a69'; g.fillRect(x - 1.5 * s, y - 16 * s, 3 * s, 16 * s); g.fillRect(x - 5.5 * s, y - 12 * s, 11 * s, 3 * s);
  },
  wisp(g, x, y, s) {
    const grd = g.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 12 * s);
    grd.addColorStop(0, 'rgba(160,255,200,.5)'); grd.addColorStop(1, 'rgba(160,255,200,0)');
    g.fillStyle = grd; circ(g, x, y - 8 * s, 12 * s);
  },
  lava(g, x, y, s) {
    const grd = g.createRadialGradient(x, y, 2 * s, x, y, 26 * s);
    grd.addColorStop(0, 'rgba(255,120,30,.45)'); grd.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = grd; circ(g, x, y, 26 * s);
    g.fillStyle = '#1a100f'; ell(g, x, y, 17 * s, 8 * s);
    g.fillStyle = '#e8541c'; ell(g, x, y, 15 * s, 6.5 * s);
    g.fillStyle = '#ffb02e'; ell(g, x - 2 * s, y - 0.5 * s, 9 * s, 3.5 * s);
    g.fillStyle = '#fff0a0'; ell(g, x - 3 * s, y - 1 * s, 3.5 * s, 1.4 * s);
  },
  spire(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 3 * s, y + 1 * s, 9 * s, 3 * s);
    g.fillStyle = '#231a19'; poly(g, [x - 7 * s, y, x - 2 * s, y - 24 * s, x + 2 * s, y - 14 * s, x + 7 * s, y]);
    g.fillStyle = '#4a3632'; poly(g, [x - 2 * s, y - 24 * s, x + 2 * s, y - 14 * s, x + 1 * s, y]);
    g.strokeStyle = '#ff7a2a'; g.lineWidth = 0.9 * s; line(g, x - 3 * s, y - 2 * s, x - 1 * s, y - 9 * s);
  },
  ember(g, x, y, s) {
    g.strokeStyle = 'rgba(255,110,30,.6)'; g.lineWidth = 1.3 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 12 * s, y); g.lineTo(x - 4 * s, y - 3 * s); g.lineTo(x + 2 * s, y + 2 * s); g.lineTo(x + 12 * s, y - 2 * s); g.stroke();
  },
  pillar(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 3 * s, y + 1 * s, 9 * s, 3.5 * s);
    g.fillStyle = '#8b90a0'; g.fillRect(x - 6 * s, y - 3 * s, 12 * s, 4 * s);
    g.fillStyle = '#a7adbc'; g.fillRect(x - 4 * s, y - 24 * s, 8 * s, 22 * s);
    g.fillStyle = '#c4c9d6'; g.fillRect(x - 4 * s, y - 24 * s, 3 * s, 22 * s);
    g.fillStyle = '#8b90a0'; g.fillRect(x - 6 * s, y - 27 * s, 12 * s, 4 * s);
  },
  banner(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 2 * s, y + 1 * s, 5 * s, 2 * s);
    g.strokeStyle = '#5a4630'; g.lineWidth = 1.6 * s; line(g, x, y, x, y - 28 * s);
    g.fillStyle = '#2f5fb3'; poly(g, [x, y - 28 * s, x + 12 * s, y - 28 * s, x + 12 * s, y - 12 * s, x + 6 * s, y - 16 * s, x, y - 12 * s]);
    g.fillStyle = '#e2b857'; circ(g, x + 6 * s, y - 22 * s, 2.4 * s);
  },
  brazier(g, x, y, s) {
    g.fillStyle = 'rgba(255,140,40,.18)'; circ(g, x, y - 8 * s, 16 * s);
    g.strokeStyle = '#3a3d48'; g.lineWidth = 1.6 * s; line(g, x - 4 * s, y, x, y - 8 * s); line(g, x + 4 * s, y, x, y - 8 * s);
    g.fillStyle = '#3a3d48'; g.beginPath(); g.ellipse(x, y - 9 * s, 6 * s, 3 * s, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#ff8a2a'; poly(g, [x - 4 * s, y - 9 * s, x, y - 19 * s, x + 4 * s, y - 9 * s]);
    g.fillStyle = '#ffd35a'; poly(g, [x - 2 * s, y - 9 * s, x, y - 15 * s, x + 2 * s, y - 9 * s]);
  },
  statue(g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 3 * s, y + 1 * s, 9 * s, 3.5 * s);
    g.fillStyle = '#7d8292'; g.fillRect(x - 6 * s, y - 5 * s, 12 * s, 6 * s);
    g.fillStyle = '#a0a6b5'; rrect(g, x - 4 * s, y - 20 * s, 8 * s, 15 * s, 2 * s); circ(g, x, y - 23 * s, 3.4 * s);
    g.strokeStyle = '#a0a6b5'; g.lineWidth = 1.4 * s; line(g, x + 5 * s, y - 6 * s, x + 5 * s, y - 28 * s);
  },
};

// ---------------------------------------------------------------- Tours ---

const BODY = {
  phys: ['#a89c8b', '#7a7064', '#c4b8a6'],
  eau: ['#8ba6b8', '#5d7587', '#a9c2d2'],
  glace: ['#b5d2e0', '#7fa3b7', '#d5ebf5'],
  foudre: ['#77749a', '#4d4a6c', '#9794ba'],
  huile: ['#6a6055', '#423b33', '#857a6d'],
  feu: ['#96614d', '#653e31', '#b47b65'],
  sable: ['#d8b97f', '#ac8d58', '#ecd29c'],
};

function towerBody(g, x, y, type, h) {
  const [mid, dark, light] = BODY[type];
  g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, x + 4, y + 7, 22, 9);
  g.fillStyle = dark; ell(g, x, y + 5, 19, 8);
  g.fillStyle = mid; ell(g, x, y + 3, 17, 7);
  const grd = g.createLinearGradient(x - 14, 0, x + 14, 0);
  grd.addColorStop(0, light); grd.addColorStop(0.45, mid); grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(x - 14, y + 3); g.lineTo(x - 11, y - h); g.lineTo(x + 11, y - h); g.lineTo(x + 14, y + 3);
  g.ellipse(x, y + 3, 14, 5, 0, 0, Math.PI);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const yy = y + 3 - (h + 3) * (i / 4);
    const w = 14 - 3 * (i / 4);
    g.beginPath(); g.ellipse(x, yy, w, 4, 0, 0.15, Math.PI - 0.15); g.stroke();
  }
  g.fillStyle = light; ell(g, x, y - h, 11, 4.2);
  g.fillStyle = dark; ell(g, x, y - h, 8.5, 3);
}

const TOWER_TOP = {
  phys(g, x, y, h, t, tw) {
    const top = y - h;
    g.fillStyle = '#8a7f71'; g.fillRect(x - 14, top - 7, 28, 8);
    g.fillStyle = '#b6aa98';
    for (let i = 0; i < 4; i++) g.fillRect(x - 14 + i * 7.6, top - 12, 5, 6);
    g.fillStyle = '#6b6157'; g.fillRect(x - 14, top - 1, 28, 2);
    // arbalète pivotante
    g.save();
    g.translate(x, top - 13 + tw.kick * 1.5);
    g.rotate(tw.angle);
    g.strokeStyle = '#5a3d22'; g.lineWidth = 2.6; g.lineCap = 'round';
    line(g, -6 - tw.kick * 3, 0, 9, 0);
    g.strokeStyle = '#3d2a17'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(5, -8); g.quadraticCurveTo(10 - tw.kick * 3, 0, 5, 8); g.stroke();
    g.strokeStyle = '#e8e2d2'; g.lineWidth = 0.8;
    line(g, 5, -8, 1 - tw.kick * 4, 0); line(g, 5, 8, 1 - tw.kick * 4, 0);
    g.restore();
    // fanion
    g.strokeStyle = '#4a3a28'; g.lineWidth = 1.2; line(g, x - 11, top - 12, x - 11, top - 26);
    g.fillStyle = '#c0392b';
    const w = Math.sin(t * 4 + x) * 1.5;
    poly(g, [x - 11, top - 26, x - 1, top - 23 + w, x - 11, top - 19]);
  },
  eau(g, x, y, h, t, tw) {
    const top = y - h;
    g.fillStyle = '#4a6172'; ell(g, x, top - 1, 14, 5.5);
    g.fillStyle = '#2f7fc9'; ell(g, x, top - 2, 11.5, 4.2);
    g.fillStyle = 'rgba(190,230,255,.55)'; ell(g, x - 3, top - 3, 5, 1.5);
    const bob = Math.sin(t * 2.2 + x) * 2 - tw.kick * 3;
    const cy = top - 17 + bob;
    g.fillStyle = 'rgba(74,168,240,.28)'; circ(g, x, cy, 11);
    const grd = g.createRadialGradient(x - 2, cy - 3, 1, x, cy, 8);
    grd.addColorStop(0, '#d9f2ff'); grd.addColorStop(0.5, '#4aa8f0'); grd.addColorStop(1, '#1f5fb0');
    g.fillStyle = grd; circ(g, x, cy, 7.5);
    g.fillStyle = '#4aa8f0';
    const d = (t * 1.3 + x * 0.1) % 1;
    circ(g, x, cy + 8 + d * 7, 1.6 * (1 - d));
  },
  glace(g, x, y, h, t, tw) {
    const top = y - h;
    const glow = 0.25 + 0.1 * Math.sin(t * 3 + x) + tw.kick * 0.3;
    g.fillStyle = `rgba(165,236,255,${glow})`; circ(g, x, top - 14, 15);
    const shard = (dx, hh, w, c1, c2) => {
      g.fillStyle = c1; poly(g, [x + dx - w, top + 1, x + dx, top - hh, x + dx + w, top + 1]);
      g.fillStyle = c2; poly(g, [x + dx, top + 1, x + dx, top - hh, x + dx + w, top + 1]);
    };
    shard(-7, 15, 4.5, '#c7f1ff', '#7fc7e6');
    shard(7, 13, 4, '#c7f1ff', '#7fc7e6');
    shard(0, 27, 6, '#ecfbff', '#96dcf5');
    g.fillStyle = '#ffffff'; poly(g, [x - 1.5, top - 20, x, top - 27, x + 0.5, top - 20]);
  },
  foudre(g, x, y, h, t, tw) {
    const top = y - h;
    g.strokeStyle = '#b87333'; g.lineWidth = 3; g.lineCap = 'round'; line(g, x, top, x, top - 20);
    g.strokeStyle = '#e0a060'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, top - 6, 7, 2.5, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x, top - 12, 5, 2, 0, 0, TAU); g.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 9 + x) + tw.kick;
    g.fillStyle = `rgba(246,227,77,${0.2 + 0.12 * pulse})`; circ(g, x, top - 24, 11 + pulse * 2);
    g.fillStyle = '#fff9c4'; circ(g, x, top - 24, 4.5);
    g.strokeStyle = '#f6e34d'; g.lineWidth = 1.1;
    const seed = Math.floor(t * 14);
    for (let i = 0; i < 2; i++) {
      const a = ((seed * 37 + i * 97) % 360) * (Math.PI / 180);
      const r1 = 5, r2 = 10 + ((seed + i) % 3) * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r1, top - 24 + Math.sin(a) * r1);
      g.lineTo(x + Math.cos(a + 0.5) * (r1 + r2) / 2, top - 24 + Math.sin(a + 0.5) * (r1 + r2) / 2);
      g.lineTo(x + Math.cos(a) * r2, top - 24 + Math.sin(a) * r2);
      g.stroke();
    }
  },
  huile(g, x, y, h, t, tw) {
    const top = y - h;
    g.fillStyle = '#1c1a18';
    g.beginPath(); g.ellipse(x, top - 6, 14, 10, 0, 0, Math.PI); g.fill();
    g.fillRect(x - 14, top - 10, 28, 4.5);
    g.fillStyle = '#34302c'; ell(g, x, top - 10, 14, 5);
    g.fillStyle = '#1a1206'; ell(g, x, top - 10, 11.5, 3.8);
    g.fillStyle = '#b98a35'; ell(g, x - 2, top - 10.6, 6, 1.6);
    g.fillStyle = '#e0b860'; ell(g, x - 4, top - 11, 2, 0.7);
    const b = (t * 0.9 + x * 0.07) % 1;
    g.fillStyle = `rgba(185,138,53,${1 - b})`; circ(g, x + 4, top - 11 - b * 5 - tw.kick * 4, 1.5 + b);
    g.strokeStyle = '#4a443d'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(x, top - 11, 15, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  },
  feu(g, x, y, h, t, tw) {
    const top = y - h;
    g.fillStyle = '#2b2422';
    g.beginPath(); g.ellipse(x, top - 3, 13, 7, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#4a3f3b'; ell(g, x, top - 4, 13, 4.2);
    g.fillStyle = '#ff5a1f'; ell(g, x, top - 4, 9.5, 2.8);
    const f1 = Math.sin(t * 11 + x) * 2, f2 = Math.cos(t * 13 + x * 2) * 2;
    const hh = 22 + tw.kick * 8;
    g.fillStyle = `rgba(255,112,51,${0.22 + tw.kick * 0.2})`; circ(g, x, top - 14, 17);
    const flame = (w, hgt, c, sway) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x - w, top - 4);
      g.quadraticCurveTo(x - w * 1.2 + sway, top - 4 - hgt * 0.5, x + sway * 1.4, top - 4 - hgt);
      g.quadraticCurveTo(x + w * 1.2 + sway, top - 4 - hgt * 0.5, x + w, top - 4);
      g.closePath(); g.fill();
    };
    flame(8.5, hh + f1, '#e8431a', f2 * 0.6);
    flame(6, hh * 0.72 + f2, '#ff8a2a', f1 * 0.5);
    flame(3.4, hh * 0.45 + f1 * 0.5, '#ffe07a', f2 * 0.3);
  },
  sable(g, x, y, h, t, tw) {
    const top = y - h;
    g.fillStyle = '#c9a868'; poly(g, [x - 8, top + 1, x - 4.5, top - 20, x + 4.5, top - 20, x + 8, top + 1]);
    g.fillStyle = '#e9cf98'; poly(g, [x - 8, top + 1, x - 4.5, top - 20, x - 0.5, top - 20, x - 1, top + 1]);
    g.fillStyle = '#f5e2b4'; poly(g, [x - 4.5, top - 20, x, top - 29, x + 4.5, top - 20]);
    g.fillStyle = '#d4b06a'; poly(g, [x, top - 20, x, top - 29, x + 4.5, top - 20]);
    g.fillStyle = '#8a6a34'; g.fillRect(x - 2.5, top - 15, 5, 1.4); g.fillRect(x - 1.2, top - 11, 2.4, 5);
    g.strokeStyle = `rgba(230,185,90,${0.6 + tw.kick * 0.4})`; g.lineWidth = 1.5; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = t * 2.5 + i * 2.1;
      g.beginPath(); g.ellipse(x, top - 9 - i * 5, 13 - i * 2 + tw.kick * 3, 3.2, 0, a, a + 1.5); g.stroke();
    }
  },
};

export function drawTower(g, tw, t) {
  const h = 26 + tw.lvl * 4;
  towerBody(g, tw.x, tw.y, tw.type, h);
  TOWER_TOP[tw.type](g, tw.x, tw.y, h, t, tw);
  // chevrons de niveau
  g.fillStyle = '#ffd766'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.8;
  for (let i = 0; i <= tw.lvl; i++) {
    const cx = tw.x - tw.lvl * 4 + i * 8, cy = tw.y + 9;
    g.beginPath(); g.moveTo(cx - 3, cy + 1.5); g.lineTo(cx, cy - 2); g.lineTo(cx + 3, cy + 1.5); g.lineTo(cx, cy); g.closePath();
    g.fill(); g.stroke();
  }
}

// -------------------------------------------------------------- Ennemis ---

function legs(g, x, y, s, t, c) {
  const b = Math.sin(t * 11);
  g.fillStyle = c;
  ell(g, x - 3.2 * s, y + Math.max(0, b) * -1.6 * s, 2.8 * s, 2 * s);
  ell(g, x + 3.2 * s, y + Math.max(0, -b) * -1.6 * s, 2.8 * s, 2 * s);
}

const ENEMY_DRAW = {
  gobelin(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 11)) * 1.2 * s;
    legs(g, x, y, s, t, '#3a2a1a');
    g.fillStyle = '#6d4b2a'; rrect(g, x - 5 * s, y - 11 * s - b, 10 * s, 10 * s, 3 * s);
    g.fillStyle = '#7fb24a';
    poly(g, [x - 4 * s, y - 17 * s - b, x - 12 * s, y - 20 * s - b, x - 5 * s, y - 13 * s - b]);
    poly(g, [x + 4 * s, y - 17 * s - b, x + 12 * s, y - 20 * s - b, x + 5 * s, y - 13 * s - b]);
    circ(g, x, y - 15 * s - b, 6 * s);
    g.fillStyle = '#5c8a33'; g.beginPath(); g.arc(x, y - 15 * s - b, 6 * s, 0.2, Math.PI - 0.2); g.fill();
    g.fillStyle = '#ffe04a'; circ(g, x - 2.2 * s + f * s, y - 16 * s - b, 1.4 * s); circ(g, x + 2.2 * s + f * s, y - 16 * s - b, 1.4 * s);
    g.strokeStyle = '#d8dde4'; g.lineWidth = 1.6 * s; g.lineCap = 'round'; line(g, x + 6 * s * f, y - 7 * s - b, x + 10 * s * f, y - 14 * s - b);
  },
  loup(g, x, y, s, t, f) {
    const run = Math.sin(t * 18);
    g.strokeStyle = '#3d3f47'; g.lineWidth = 2.2 * s; g.lineCap = 'round';
    line(g, x - 6 * s * f, y - 5 * s, x - 6 * s * f - run * 4 * s * f, y); line(g, x - 3 * s * f, y - 5 * s, x - 3 * s * f + run * 3 * s * f, y);
    line(g, x + 5 * s * f, y - 5 * s, x + 5 * s * f + run * 4 * s * f, y); line(g, x + 8 * s * f, y - 5 * s, x + 8 * s * f - run * 3 * s * f, y);
    g.lineWidth = 2.4 * s; g.strokeStyle = '#5a5d68';
    g.beginPath(); g.moveTo(x - 10 * s * f, y - 8 * s); g.quadraticCurveTo(x - 17 * s * f, y - 10 * s, x - 16 * s * f, y - 15 * s + run * s); g.stroke();
    g.fillStyle = '#6a6d79'; ell(g, x, y - 8 * s, 11 * s, 5.6 * s);
    g.fillStyle = '#8a8d99'; ell(g, x - 1 * s * f, y - 10 * s, 8 * s, 3 * s);
    g.fillStyle = '#6a6d79'; circ(g, x + 11 * s * f, y - 11 * s, 5 * s);
    poly(g, [x + 9 * s * f, y - 14 * s, x + 9.5 * s * f, y - 20 * s, x + 12.5 * s * f, y - 15 * s]);
    g.fillStyle = '#4b4d57'; poly(g, [x + 14 * s * f, y - 12 * s, x + 19 * s * f, y - 9.5 * s, x + 14 * s * f, y - 8 * s]);
    g.fillStyle = '#ff5a3c'; circ(g, x + 12.5 * s * f, y - 12 * s, 1.2 * s);
  },
  orque(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 9)) * 1.1 * s;
    legs(g, x, y, s, t, '#2f2620');
    g.fillStyle = '#4a3a2e'; rrect(g, x - 7.5 * s, y - 13 * s - b, 15 * s, 12 * s, 4 * s);
    g.fillStyle = '#7a7f86'; ell(g, x - 7.5 * s, y - 12 * s - b, 3.6 * s, 3 * s); ell(g, x + 7.5 * s, y - 12 * s - b, 3.6 * s, 3 * s);
    g.fillStyle = '#4e7d3a'; circ(g, x, y - 17 * s - b, 6.2 * s);
    g.fillStyle = '#3d6530'; g.beginPath(); g.arc(x, y - 17 * s - b, 6.2 * s, 0.1, Math.PI - 0.1); g.fill();
    g.fillStyle = '#f3ecd6'; poly(g, [x - 3 * s, y - 14 * s - b, x - 2 * s, y - 18 * s - b, x - 1 * s, y - 14 * s - b]); poly(g, [x + 1 * s, y - 14 * s - b, x + 2 * s, y - 18 * s - b, x + 3 * s, y - 14 * s - b]);
    g.fillStyle = '#ff4a2a'; circ(g, x - 2.2 * s + f * s, y - 19 * s - b, 1.1 * s); circ(g, x + 2.2 * s + f * s, y - 19 * s - b, 1.1 * s);
    g.strokeStyle = '#5a4630'; g.lineWidth = 1.8 * s; g.lineCap = 'round'; line(g, x + 9 * s * f, y - 4 * s - b, x + 11 * s * f, y - 20 * s - b);
    g.fillStyle = '#9aa0a8'; poly(g, [x + 11 * s * f, y - 22 * s - b, x + 17 * s * f, y - 19 * s - b, x + 11 * s * f, y - 15 * s - b]);
  },
  chevalier(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 8)) * s;
    legs(g, x, y, s, t, '#1c1d22');
    g.fillStyle = '#2b2d35'; rrect(g, x - 6.5 * s, y - 13 * s - b, 13 * s, 12 * s, 3 * s);
    g.fillStyle = '#4a4d59'; g.fillRect(x - 6.5 * s, y - 13 * s - b, 4 * s, 12 * s);
    g.fillStyle = '#3a3c46'; circ(g, x, y - 17 * s - b, 6 * s);
    g.fillStyle = '#5d606e'; g.beginPath(); g.arc(x, y - 17 * s - b, 6 * s, Math.PI, TAU); g.fill();
    g.fillStyle = '#0d0d10'; g.fillRect(x - 4 * s, y - 18 * s - b, 8 * s, 1.8 * s);
    g.fillStyle = '#ff3b3b'; g.fillRect(x - 2.6 * s + f * s, y - 18 * s - b, 1.6 * s, 1.4 * s); g.fillRect(x + 1 * s + f * s, y - 18 * s - b, 1.6 * s, 1.4 * s);
    g.fillStyle = '#a3262c'; poly(g, [x, y - 23 * s - b, x - 5 * s * f, y - 28 * s - b, x - 2 * s * f, y - 22 * s - b]);
    g.fillStyle = '#1f2026'; rrect(g, x - 11 * s * f - 3.5 * s, y - 13 * s - b, 7 * s, 10 * s, 2 * s);
    g.fillStyle = '#a3262c'; g.fillRect(x - 11 * s * f - 1 * s, y - 11 * s - b, 2 * s, 6 * s);
    g.strokeStyle = '#c9ced6'; g.lineWidth = 1.6 * s; g.lineCap = 'round'; line(g, x + 8 * s * f, y - 6 * s - b, x + 11 * s * f, y - 21 * s - b);
  },
  spectre(g, x, y, s, t) {
    const b = Math.sin(t * 3) * 2 * s;
    g.globalAlpha *= 0.8;
    g.fillStyle = 'rgba(190,220,255,.18)'; circ(g, x, y - 12 * s + b, 13 * s);
    g.fillStyle = '#dbe6ff';
    g.beginPath();
    g.arc(x, y - 15 * s + b, 7.5 * s, Math.PI, TAU);
    g.lineTo(x + 7.5 * s, y - 3 * s + b);
    for (let i = 0; i < 4; i++) {
      const px = x + 7.5 * s - (i + 0.5) * 3.75 * s;
      g.quadraticCurveTo(px + 0.9 * s, y + (i % 2 ? -4 : 1) * s + b + Math.sin(t * 6 + i) * s, px - 1.9 * s, y - 3 * s + b);
    }
    g.closePath(); g.fill();
    g.fillStyle = '#a9b8e8'; g.beginPath(); g.arc(x + 2 * s, y - 15 * s + b, 5 * s, -0.6, 1.2); g.fill();
    g.fillStyle = '#1c2140'; ell(g, x - 2.6 * s, y - 16 * s + b, 1.6 * s, 2.4 * s); ell(g, x + 2.6 * s, y - 16 * s + b, 1.6 * s, 2.4 * s);
    g.fillStyle = '#7ef0ff'; circ(g, x - 2.6 * s, y - 16 * s + b, 0.8 * s); circ(g, x + 2.6 * s, y - 16 * s + b, 0.8 * s);
    g.globalAlpha /= 0.8;
  },
  salamandre(g, x, y, s, t, f) {
    const w = Math.sin(t * 14);
    g.strokeStyle = '#b8431c'; g.lineWidth = 2 * s; g.lineCap = 'round';
    line(g, x - 5 * s * f, y - 5 * s, x - 7 * s * f - w * 2 * s, y); line(g, x + 5 * s * f, y - 5 * s, x + 7 * s * f + w * 2 * s, y);
    g.lineWidth = 3 * s; g.strokeStyle = '#e06a22';
    g.beginPath(); g.moveTo(x - 9 * s * f, y - 6 * s); g.quadraticCurveTo(x - 17 * s * f, y - 5 * s + w * 3 * s, x - 21 * s * f, y - 9 * s); g.stroke();
    g.fillStyle = '#e06a22'; ell(g, x, y - 7 * s, 11 * s, 5 * s);
    g.fillStyle = '#ffc04a'; ell(g, x, y - 5.5 * s, 8 * s, 2.4 * s);
    g.fillStyle = '#e06a22'; ell(g, x + 12 * s * f, y - 8.5 * s, 5.5 * s, 4 * s);
    for (let i = 0; i < 4; i++) {
      const fx = x + (6 - i * 5) * s * f, fl = (5 + Math.sin(t * 12 + i * 2) * 2) * s;
      g.fillStyle = i % 2 ? '#ffd35a' : '#ff5a1f';
      poly(g, [fx - 2.4 * s, y - 11 * s, fx, y - 11 * s - fl, fx + 2.4 * s, y - 11 * s]);
    }
    g.fillStyle = '#fff3a0'; circ(g, x + 13.5 * s * f, y - 9.5 * s, 1.2 * s);
  },
  troll(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 6)) * 1.2 * s;
    legs(g, x, y, s * 1.2, t * 0.6, '#3a4a52');
    g.fillStyle = '#5d7b88'; rrect(g, x - 8 * s, y - 14 * s - b, 16 * s, 13 * s, 5 * s);
    g.fillStyle = '#7b9aa8'; ell(g, x - 2 * s, y - 11 * s - b, 4.5 * s, 3.5 * s);
    g.fillStyle = '#4a3a2a'; g.fillRect(x - 8 * s, y - 5 * s - b, 16 * s, 3 * s);
    g.fillStyle = '#5d7b88'; ell(g, x - 9 * s, y - 9 * s - b, 3.4 * s, 5.5 * s); ell(g, x + 9 * s, y - 9 * s - b, 3.4 * s, 5.5 * s);
    circ(g, x, y - 17 * s - b, 5.6 * s);
    g.fillStyle = '#4b6672'; ell(g, x + f * s, y - 15.5 * s - b, 2.4 * s, 2.8 * s);
    g.fillStyle = '#f3ecd6'; poly(g, [x - 3.4 * s, y - 14 * s - b, x - 2.6 * s, y - 17 * s - b, x - 1.6 * s, y - 14 * s - b]); poly(g, [x + 1.6 * s, y - 14 * s - b, x + 2.6 * s, y - 17 * s - b, x + 3.4 * s, y - 14 * s - b]);
    g.fillStyle = '#ffe04a'; circ(g, x - 2.2 * s + f * s, y - 19 * s - b, s); circ(g, x + 2.2 * s + f * s, y - 19 * s - b, s);
    g.strokeStyle = '#5a4630'; g.lineWidth = 2.6 * s; g.lineCap = 'round'; line(g, x + 10 * s * f, y - 6 * s - b, x + 14 * s * f, y - 20 * s - b);
    g.fillStyle = '#6b5236'; circ(g, x + 14.5 * s * f, y - 21 * s - b, 3.6 * s);
  },
  golem(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 5)) * s;
    g.fillStyle = '#4f4a45'; rrect(g, x - 7 * s, y - 3 * s, 5.5 * s, 4 * s, s); rrect(g, x + 1.5 * s, y - 3 * s, 5.5 * s, 4 * s, s);
    g.fillStyle = '#7a736b'; poly(g, [x - 8 * s, y - 3 * s - b, x - 9 * s, y - 13 * s - b, x - 3 * s, y - 16 * s - b, x + 5 * s, y - 15.5 * s - b, x + 9 * s, y - 11 * s - b, x + 7.5 * s, y - 3 * s - b]);
    g.fillStyle = '#9a938a'; poly(g, [x - 9 * s, y - 13 * s - b, x - 3 * s, y - 16 * s - b, x - 1 * s, y - 10 * s - b, x - 6 * s, y - 7 * s - b]);
    g.fillStyle = '#6a635c'; rrect(g, x - 12.5 * s, y - 13 * s - b, 5 * s, 9 * s, 1.5 * s); rrect(g, x + 7.5 * s, y - 13 * s - b, 5 * s, 9 * s, 1.5 * s);
    g.fillStyle = '#8a837a'; rrect(g, x - 4.5 * s, y - 20.5 * s - b, 9 * s, 7 * s, 1.5 * s);
    g.fillStyle = '#ffb347'; g.fillRect(x - 3 * s + f * s, y - 18 * s - b, 2 * s, 1.5 * s); g.fillRect(x + 1 * s + f * s, y - 18 * s - b, 2 * s, 1.5 * s);
    g.strokeStyle = '#ff8a2a'; g.lineWidth = 0.9 * s; g.beginPath(); g.moveTo(x - 2 * s, y - 12 * s - b); g.lineTo(x + 1 * s, y - 9 * s - b); g.lineTo(x - 1 * s, y - 6 * s - b); g.stroke();
  },
  ogre(g, x, y, s, t, f) {
    const b = Math.abs(Math.sin(t * 5)) * 1.2 * s;
    legs(g, x, y, s * 1.25, t * 0.5, '#3b2c1e');
    g.fillStyle = '#9a7c4e'; rrect(g, x - 9 * s, y - 14 * s - b, 18 * s, 13.5 * s, 6 * s);
    g.fillStyle = '#b89a66'; ell(g, x, y - 7 * s - b, 6 * s, 4.5 * s);
    g.fillStyle = '#5a3a22'; g.fillRect(x - 9 * s, y - 5 * s - b, 18 * s, 2.6 * s);
    g.fillStyle = '#e2b857'; circ(g, x, y - 3.8 * s - b, 1.8 * s);
    g.fillStyle = '#9a7c4e'; ell(g, x - 10 * s, y - 9 * s - b, 3.6 * s, 5.6 * s); ell(g, x + 10 * s, y - 9 * s - b, 3.6 * s, 5.6 * s);
    circ(g, x, y - 17 * s - b, 5.8 * s);
    g.fillStyle = '#f3ecd6'; poly(g, [x - 3.6 * s, y - 14 * s - b, x - 2.8 * s, y - 18 * s - b, x - 1.8 * s, y - 14 * s - b]); poly(g, [x + 1.8 * s, y - 14 * s - b, x + 2.8 * s, y - 18 * s - b, x + 3.6 * s, y - 14 * s - b]);
    g.fillStyle = '#ff3b2a'; circ(g, x - 2.3 * s + f * s, y - 19 * s - b, s); circ(g, x + 2.3 * s + f * s, y - 19 * s - b, s);
    g.fillStyle = '#e2b857'; poly(g, [x - 5 * s, y - 21 * s - b, x - 5 * s, y - 26 * s - b, x - 2.5 * s, y - 23.5 * s - b, x, y - 27 * s - b, x + 2.5 * s, y - 23.5 * s - b, x + 5 * s, y - 26 * s - b, x + 5 * s, y - 21 * s - b]);
    g.strokeStyle = '#4a3622'; g.lineWidth = 2.8 * s; g.lineCap = 'round'; line(g, x + 11 * s * f, y - 5 * s - b, x + 15 * s * f, y - 21 * s - b);
    g.fillStyle = '#7a7f86'; circ(g, x + 15.5 * s * f, y - 22 * s - b, 4 * s);
    g.fillStyle = '#c9ced6'; poly(g, [x + 15.5 * s * f, y - 28 * s - b, x + 14 * s * f, y - 25 * s - b, x + 17 * s * f, y - 25 * s - b]);
  },
  liche(g, x, y, s, t, f) {
    const b = Math.sin(t * 2.5) * 1.5 * s;
    g.fillStyle = 'rgba(150,90,255,.2)'; circ(g, x, y - 12 * s + b, 17 * s);
    g.fillStyle = '#2a1f45'; poly(g, [x - 9 * s, y + b * 0.3, x - 5 * s, y - 16 * s + b, x + 5 * s, y - 16 * s + b, x + 9 * s, y + b * 0.3]);
    g.fillStyle = '#463470'; poly(g, [x - 9 * s, y + b * 0.3, x - 5 * s, y - 16 * s + b, x - 1 * s, y - 16 * s + b, x - 3 * s, y + b * 0.3]);
    g.fillStyle = '#e2b857'; g.fillRect(x - 5 * s, y - 9 * s + b, 10 * s, 1.4 * s);
    g.fillStyle = '#1c1430'; g.beginPath(); g.arc(x, y - 18 * s + b, 6.5 * s, Math.PI * 0.9, Math.PI * 2.1); g.fill();
    g.fillStyle = '#efe9d6'; circ(g, x, y - 17.5 * s + b, 4.6 * s); rrect(g, x - 2.6 * s, y - 15 * s + b, 5.2 * s, 3.4 * s, s);
    g.fillStyle = '#1c1430'; circ(g, x - 1.8 * s + f * 0.5 * s, y - 18 * s + b, 1.4 * s); circ(g, x + 1.8 * s + f * 0.5 * s, y - 18 * s + b, 1.4 * s);
    g.fillStyle = '#7dff9a'; circ(g, x - 1.8 * s + f * 0.5 * s, y - 18 * s + b, 0.7 * s); circ(g, x + 1.8 * s + f * 0.5 * s, y - 18 * s + b, 0.7 * s);
    g.fillStyle = '#e2b857'; poly(g, [x - 4.5 * s, y - 22 * s + b, x - 4.5 * s, y - 26 * s + b, x - 2 * s, y - 24 * s + b, x, y - 27 * s + b, x + 2 * s, y - 24 * s + b, x + 4.5 * s, y - 26 * s + b, x + 4.5 * s, y - 22 * s + b]);
    g.strokeStyle = '#5a4630'; g.lineWidth = 1.6 * s; g.lineCap = 'round'; line(g, x + 10 * s * f, y + b * 0.3, x + 10 * s * f, y - 24 * s + b);
    g.fillStyle = 'rgba(125,255,154,.35)'; circ(g, x + 10 * s * f, y - 26 * s + b, 5 * s);
    g.fillStyle = '#7dff9a'; circ(g, x + 10 * s * f, y - 26 * s + b, 2.6 * s);
  },
  dragon(g, x, y, s, t, f) {
    const flap = Math.sin(t * 5), b = Math.sin(t * 2.5) * 1.5 * s;
    const wing = (dir) => {
      g.fillStyle = dir > 0 ? '#8f1f1a' : '#701613';
      const wy = y - 12 * s + b;
      poly(g, [x - 2 * s * f, wy, x - 8 * s * f, wy - (14 + flap * 6) * s * dir - (dir < 0 ? -6 * s : 0), x - 20 * s * f, wy - (8 + flap * 9) * s * dir, x - 15 * s * f, wy - 2 * s * dir, x - 10 * s * f, wy + 2 * s]);
    };
    wing(-0.5);
    g.strokeStyle = '#a82a22'; g.lineWidth = 4.5 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 9 * s * f, y - 8 * s + b); g.quadraticCurveTo(x - 20 * s * f, y - 4 * s + b, x - 25 * s * f, y - 11 * s + b + flap * 2 * s); g.stroke();
    g.fillStyle = '#701613'; poly(g, [x - 25 * s * f, y - 15 * s + b + flap * 2 * s, x - 29 * s * f, y - 10 * s + b + flap * 2 * s, x - 24 * s * f, y - 8 * s + b + flap * 2 * s]);
    g.strokeStyle = '#701613'; g.lineWidth = 3 * s; line(g, x - 5 * s * f, y - 5 * s + b, x - 6 * s * f, y); line(g, x + 5 * s * f, y - 5 * s + b, x + 6 * s * f, y);
    g.fillStyle = '#c0332a'; ell(g, x, y - 9 * s + b, 12 * s, 7 * s);
    g.fillStyle = '#f0b860'; ell(g, x + 1 * s * f, y - 6 * s + b, 8 * s, 3.4 * s);
    g.strokeStyle = '#c0332a'; g.lineWidth = 5.5 * s;
    g.beginPath(); g.moveTo(x + 8 * s * f, y - 11 * s + b); g.quadraticCurveTo(x + 13 * s * f, y - 20 * s + b, x + 17 * s * f, y - 21 * s + b); g.stroke();
    g.fillStyle = '#c0332a'; ell(g, x + 19 * s * f, y - 21 * s + b, 6 * s, 4.2 * s);
    g.fillStyle = '#a82a22'; ell(g, x + 23.5 * s * f, y - 20 * s + b, 3.4 * s, 2.6 * s);
    g.fillStyle = '#f3ecd6'; poly(g, [x + 16 * s * f, y - 24 * s + b, x + 13 * s * f, y - 30 * s + b, x + 18.5 * s * f, y - 25 * s + b]);
    g.fillStyle = '#ffe04a'; circ(g, x + 20 * s * f, y - 22.5 * s + b, 1.3 * s);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#701613'; poly(g, [x + (4 - i * 4) * s * f, y - 15 * s + b, x + (2.5 - i * 4) * s * f, y - 19 * s + b, x + (1 - i * 4) * s * f, y - 15 * s + b]); }
    wing(1);
    const breath = (Math.sin(t * 3) + 1) / 2;
    g.fillStyle = `rgba(255,160,40,${0.3 + breath * 0.4})`; circ(g, x + 27 * s * f, y - 19.5 * s + b, (1.5 + breath * 1.5) * s);
  },
};

// Ennemi complet avec ses états. `e` peut être un ennemi de la simulation ou une maquette.
export function drawEnemy(g, e, t) {
  const def = e.def, r = def.r * 1.15, s = r / 10 * (def.boss ? 0.8 : 1);
  const x = e.x, y = e.y;
  const f = e.dx >= 0 ? 1 : -1;
  const frozen = e.frozen > 0;
  // flaques d'état sous les pieds
  if (e.coat === 'wet') { g.fillStyle = 'rgba(74,168,240,.4)'; ell(g, x, y + 2, r * 1.25, r * 0.5); }
  if (e.coat === 'oil') {
    g.fillStyle = 'rgba(20,14,6,.6)'; ell(g, x, y + 2, r * 1.3, r * 0.52);
    g.fillStyle = 'rgba(200,150,60,.5)'; ell(g, x - r * 0.3, y + 1, r * 0.4, r * 0.12);
  }
  if (e.mudT > 0) { g.fillStyle = 'rgba(110,74,40,.75)'; ell(g, x, y + 2.5, r * 1.35, r * 0.55); }
  g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, x, y + 1.5, r * 0.95, r * 0.38);

  const tt = frozen ? 0.3 : t + e.id * 0.7;
  ENEMY_DRAW[e.type](g, x, y, s, tt, f);
  if (e.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(0.45, e.flash * 4)})`; ell(g, x, y - r * 0.95, r * 0.8, r * 1.05); }

  const top = y - r * 2.3;
  if (e.mudT > 0) {
    g.fillStyle = '#7a5230';
    circ(g, x - r * 0.5, y - r * 0.35, r * 0.3); circ(g, x + r * 0.45, y - r * 0.5, r * 0.26); circ(g, x, y - r * 0.2, r * 0.3);
  }
  if (e.coat === 'wet') {
    g.fillStyle = '#7cc4ff';
    for (let i = 0; i < 3; i++) {
      const d = (t * 1.6 + i * 0.37 + e.id * 0.13) % 1;
      circ(g, x + (i - 1) * r * 0.6, y - r * 1.6 + d * r * 1.5, 1.5 * (1 - d * 0.5));
    }
  }
  if (e.coat === 'oil') {
    g.fillStyle = '#17110a';
    for (let i = 0; i < 3; i++) {
      const d = (t * 0.9 + i * 0.41 + e.id * 0.17) % 1;
      ell(g, x + (i - 1) * r * 0.55, y - r * 1.4 + d * r * 1.2, 1.6, 2.4);
    }
  }
  if (e.burnT > 0) {
    for (let i = 0; i < 3; i++) {
      const ph = t * 9 + i * 2.1 + e.id;
      const fx = x + (i - 1) * r * 0.55, fh = r * (0.9 + 0.3 * Math.sin(ph));
      g.fillStyle = 'rgba(255,90,31,.85)'; poly(g, [fx - r * 0.3, y - r * 0.8, fx + Math.sin(ph * 0.7) * 2, y - r * 0.8 - fh, fx + r * 0.3, y - r * 0.8]);
      g.fillStyle = 'rgba(255,211,90,.9)'; poly(g, [fx - r * 0.15, y - r * 0.8, fx, y - r * 0.8 - fh * 0.55, fx + r * 0.15, y - r * 0.8]);
    }
  }
  if (frozen) {
    const w = r * 1.25, h = r * 2.5;
    g.fillStyle = 'rgba(165,236,255,.5)';
    poly(g, [x - w, y + 2, x - w * 0.85, y - h * 0.75, x - w * 0.2, y - h, x + w * 0.6, y - h * 0.92, x + w, y - h * 0.4, x + w * 0.9, y + 2]);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - w, y + 2); g.lineTo(x - w * 0.85, y - h * 0.75); g.lineTo(x - w * 0.2, y - h); g.lineTo(x + w * 0.6, y - h * 0.92); g.lineTo(x + w, y - h * 0.4); g.lineTo(x + w * 0.9, y + 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; line(g, x - w * 0.5, y - h * 0.7, x - w * 0.15, y - h * 0.3); line(g, x + w * 0.3, y - h * 0.8, x + w * 0.5, y - h * 0.5);
  }

  // barre de vie et pastilles d'état
  const ratio = Math.max(0, e.hp / e.maxHp);
  if (!e.icon && (ratio < 1 || def.boss)) {
    const bw = def.boss ? 44 : Math.max(18, r * 2), bh = def.boss ? 5 : 3.2;
    g.fillStyle = 'rgba(0,0,0,.65)'; rrect(g, x - bw / 2 - 1, top - 1, bw + 2, bh + 2, 2);
    g.fillStyle = ratio > 0.5 ? '#6fd45a' : ratio > 0.25 ? '#f0c040' : '#e8503c';
    g.fillRect(x - bw / 2, top, bw * ratio, bh);
  }
  let pips = 0;
  const pip = (c) => { g.fillStyle = 'rgba(0,0,0,.6)'; circ(g, x - 8 + pips * 8, top - 6, 3.4); g.fillStyle = c; circ(g, x - 8 + pips * 8, top - 6, 2.5); pips++; };
  if (frozen) pip(STATUS.frozen.color);
  if (e.coat === 'wet') pip(STATUS.wet.color);
  if (e.coat === 'oil') pip('#c79a3e');
  if (e.mudT > 0) pip('#a8713c');
  if (e.burnT > 0) pip(STATUS.burn.color);
}

// --------------------------------------------------------------- Icônes ---

export function towerIcon(type, size = 64, lvl = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  g.scale(size * 2 / 92, size * 2 / 92);
  drawTower(g, { type, lvl, x: 44, y: 76, angle: -0.5, kick: 0 }, 1.3);
  return c.toDataURL();
}

export function enemyIcon(type, size = 48) {
  const def = ENEMIES[type];
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  const wide = type === 'dragon' ? 6.2 : type === 'loup' || type === 'salamandre' ? 5 : 4;
  const span = def.r * wide + 8;
  g.scale(size * 2 / span, size * 2 / span);
  drawEnemy(g, { type, def, icon: true, x: span / 2, y: span * 0.8, dx: 1, id: 1, hp: 1, maxHp: 1, frozen: 0, coat: null, mudT: 0, burnT: 0, flash: 0 }, 0.6);
  return c.toDataURL();
}

// --------------------------------------------------------------- Rendu ---

const EL_FX = {
  eau: { ring: 'rgba(74,168,240,', bits: ['#4aa8f0', '#9fd4ff', '#d9f2ff'] },
  huile: { ring: 'rgba(40,28,10,', bits: ['#1c1408', '#3a2a10', '#b98a35'] },
  sable: { ring: 'rgba(230,185,90,', bits: ['#e6b95a', '#f5dfa6', '#b98f45'] },
  feu: { ring: 'rgba(255,112,51,', bits: ['#ff7033', '#ffd35a', '#e8431a'] },
};

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.scale = 1;
    this.bg = null;
    this.level = null;
    this.parts = [];
    this.bolts = [];
    this.texts = [];
    this.rings = [];
    this.t = 0;
    this.shake = 0;
    this.flash = 0;
  }

  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (this.cv.width === w && this.cv.height === h) return;
    this.cv.width = w; this.cv.height = h;
    this.scale = w / W;
    if (this.level) this.buildBackground();
  }

  setLevel(level, sim) {
    this.level = level;
    this.paths = sim.paths;
    this.slots = sim.slots;
    this.parts = []; this.bolts = []; this.texts = []; this.rings = [];
    this.shake = 0; this.flash = 0;
    this.buildBackground();
  }

  // ----------------------------------------------------------- Décor ---

  buildBackground() {
    const c = document.createElement('canvas');
    c.width = this.cv.width; c.height = this.cv.height;
    const g = c.getContext('2d');
    g.scale(this.scale, this.scale);
    const lv = this.level, th = THEMES[lv.theme];
    const r = rng(hash(lv.id));

    const grd = g.createLinearGradient(0, 0, W * 0.3, H);
    grd.addColorStop(0, th.ground[0]); grd.addColorStop(1, th.ground[1]);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);

    if (th.tiles) {
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
      for (let yy = 0; yy < H; yy += 30) {
        line(g, 0, yy, W, yy);
        for (let xx = (yy / 30) % 2 ? 0 : 24; xx < W; xx += 48) line(g, xx, yy, xx, yy + 30);
      }
    }
    for (let i = 0; i < 150; i++) {
      g.globalAlpha = 0.1 + r() * 0.12;
      g.fillStyle = th.blots[(r() * th.blots.length) | 0];
      ell(g, r() * W, r() * H, 14 + r() * 46, 8 + r() * 22);
    }
    g.globalAlpha = 1;
    // petites touffes / gravillons
    for (let i = 0; i < 420; i++) {
      g.globalAlpha = 0.25;
      g.fillStyle = r() > 0.5 ? th.blots[0] : th.blots[1];
      const x = r() * W, y = r() * H;
      g.fillRect(x, y, 1.6, 3.2);
    }
    g.globalAlpha = 1;

    // chemins
    g.lineJoin = 'round'; g.lineCap = 'round';
    const trace = (p) => {
      g.beginPath();
      g.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) g.lineTo(p.pts[i][0], p.pts[i][1]);
      g.stroke();
    };
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 58; this.paths.forEach(trace);
    g.strokeStyle = th.path[0]; g.lineWidth = 52; this.paths.forEach(trace);
    g.strokeStyle = th.path[1]; g.lineWidth = 45; this.paths.forEach(trace);
    g.strokeStyle = th.path[2]; g.globalAlpha = 0.55; g.lineWidth = 28; this.paths.forEach(trace);
    g.globalAlpha = 1;
    for (const p of this.paths) {
      for (let d = 10; d < p.len; d += 9 + r() * 12) {
        const q = pathAt(p, d);
        const off = (r() - 0.5) * 38;
        g.globalAlpha = 0.3 + r() * 0.3;
        g.fillStyle = r() > 0.5 ? th.path[0] : th.path[2];
        ell(g, q.x - q.dy * off, q.y + q.dx * off, 1.2 + r() * 2.4, 0.9 + r() * 1.4);
      }
    }
    g.globalAlpha = 1;

    // dalles des emplacements
    for (const s of this.slots) {
      g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, s.x + 2, s.y + 8, 24, 11);
      g.fillStyle = '#5c5952'; ell(g, s.x, s.y + 6, 22, 10);
      g.fillStyle = '#8a857b'; ell(g, s.x, s.y + 4, 22, 10);
      g.fillStyle = '#a59f93'; ell(g, s.x, s.y + 3.5, 17.5, 7.6);
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        line(g, s.x + Math.cos(a) * 17.5, s.y + 3.5 + Math.sin(a) * 7.6, s.x + Math.cos(a) * 22, s.y + 4 + Math.sin(a) * 10);
      }
    }

    // décorations
    const items = [];
    const want = Math.round(52 * (th.dense || 1));
    let guard = 0;
    while (items.length < want && guard++ < 4000) {
      const x = 14 + r() * (W - 28), y = 30 + r() * (H - 40);
      if (this.paths.some((p) => distToPath(p, x, y) < 44)) continue;
      if (this.slots.some((s) => Math.hypot(s.x - x, s.y - 12 - y) < 40 && y > s.y - 60)) continue;
      const kind = th.deco[(r() * th.deco.length) | 0];
      const big = kind === 'lava' || kind === 'pond' || kind === 'dune' || kind === 'drift';
      if (items.some((o) => Math.hypot(o.x - x, o.y - y) < (big ? 46 : 20))) continue;
      if (big && this.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 56)) continue;
      items.push({ x, y, kind, s: 0.85 + r() * 0.45 });
    }
    items.sort((a, b) => a.y - b.y);
    for (const o of items) DECO[o.kind](g, o.x, o.y, o.s, r, lv.theme);

    // entrées et porte du royaume
    for (const p of this.paths) this.drawPortal(g, p);
    this.drawGate(g, this.paths[0]);

    // vignette
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${th.dark})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    this.bg = c;
  }

  edgePoint(p, fromEnd) {
    const inside = (q) => q.x > 20 && q.x < W - 20 && q.y > 20 && q.y < H - 20;
    for (let d = 0; d < p.len; d += 4) {
      const q = pathAt(p, fromEnd ? p.len - d : d);
      if (inside(q)) return q;
    }
    return pathAt(p, fromEnd ? p.len : 0);
  }

  drawPortal(g, p) {
    const q = this.edgePoint(p, false);
    const grd = g.createRadialGradient(q.x, q.y, 2, q.x, q.y, 40);
    grd.addColorStop(0, 'rgba(160,30,30,.55)'); grd.addColorStop(1, 'rgba(160,30,30,0)');
    g.fillStyle = grd; circ(g, q.x, q.y, 40);
    g.save();
    g.translate(q.x, q.y);
    g.rotate(Math.atan2(q.dy, q.dx));
    g.fillStyle = '#2a2220';
    for (const side of [-1, 1]) {
      poly(g, [-6, side * 22, 4, side * 34, 12, side * 30, 8, side * 20]);
      g.fillStyle = '#4a3b36'; poly(g, [-2, side * 22, 4, side * 31, 8, side * 28, 6, side * 21]); g.fillStyle = '#2a2220';
    }
    g.fillStyle = '#b3261e';
    for (let i = -1; i <= 1; i++) poly(g, [6, i * 11 - 4, 16, i * 11, 6, i * 11 + 4]);
    g.restore();
  }

  drawGate(g, p) {
    const q = this.edgePoint(p, true);
    g.save();
    g.translate(q.x, q.y);
    const horiz = Math.abs(q.dx) > Math.abs(q.dy);
    const grd = g.createRadialGradient(0, 0, 4, 0, 0, 46);
    grd.addColorStop(0, 'rgba(90,150,255,.4)'); grd.addColorStop(1, 'rgba(90,150,255,0)');
    g.fillStyle = grd; circ(g, 0, 0, 46);
    const post = (px, py) => {
      g.fillStyle = 'rgba(0,0,0,.3)'; ell(g, px + 3, py + 4, 13, 5);
      g.fillStyle = '#7d8492'; g.fillRect(px - 9, py - 30, 18, 32);
      g.fillStyle = '#a3aab8'; g.fillRect(px - 9, py - 30, 6, 32);
      g.fillStyle = '#5c6270'; for (let i = 0; i < 3; i++) g.fillRect(px - 11 + i * 8, py - 36, 6, 7);
      g.fillStyle = '#2f5fb3'; poly(g, [px, py - 36, px, py - 52, px + 13, py - 48, px, py - 44]);
      g.strokeStyle = '#4a3a28'; g.lineWidth = 1.4; line(g, px, py - 36, px, py - 53);
    };
    if (horiz) { post(4, -32); post(4, 36); } else { post(-34, 2); post(34, 2); }
    g.fillStyle = '#e2b857';
    g.strokeStyle = '#7a5a1e'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-8, -9); g.lineTo(8, -9); g.lineTo(8, 2); g.quadraticCurveTo(8, 10, 0, 13); g.quadraticCurveTo(-8, 10, -8, 2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2f5fb3'; g.beginPath(); g.moveTo(-4.5, -5.5); g.lineTo(4.5, -5.5); g.lineTo(4.5, 2); g.quadraticCurveTo(4.5, 7, 0, 9); g.quadraticCurveTo(-4.5, 7, -4.5, 2); g.closePath(); g.fill();
    g.restore();
  }

  // ---------------------------------------------------------- Effets ---

  part(o) { if (this.parts.length < 700) this.parts.push(o); }
  burst(x, y, n, colors, speed, life, size, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.8);
      this.part({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up || 0), g: opts.g ?? 160,
        life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8),
        c: colors[(Math.random() * colors.length) | 0], shard: opts.shard, add: opts.add, rot: Math.random() * TAU,
      });
    }
  }
  text(x, y, str, color, size = 13) { this.texts.push({ x, y, str, color, size, life: 0.9, max: 0.9 }); }
  ring(x, y, r, color, life = 0.35, w = 3) { this.rings.push({ x, y, r, color, life, max: life, w }); }

  handle(ev) {
    switch (ev.type) {
      case 'hit':
        if (ev.el === 'glace') this.burst(ev.x, ev.y, 4, ['#a5ecff', '#ffffff'], 50, 0.3, 2, { g: 60 });
        else this.burst(ev.x, ev.y, 3, ['#e8e2d2', '#b5ada0'], 60, 0.22, 1.6);
        break;
      case 'splash': {
        const fx = EL_FX[ev.el];
        this.ring(ev.x, ev.y, ev.r, fx.ring, 0.4, ev.el === 'feu' ? 5 : 3);
        this.burst(ev.x, ev.y - 4, ev.el === 'feu' ? 12 : 9, fx.bits, ev.el === 'sable' ? 70 : 90, 0.45, ev.el === 'huile' ? 3 : 2.4, { up: ev.el === 'feu' ? 40 : 30, g: ev.el === 'feu' ? -40 : 200, add: ev.el === 'feu' });
        break;
      }
      case 'freeze':
        this.ring(ev.x, ev.y - ev.r, ev.r * 1.8, 'rgba(165,236,255,', 0.35, 2.5);
        this.burst(ev.x, ev.y - ev.r, 7, ['#a5ecff', '#ffffff', '#d9f7ff'], 55, 0.5, 2.6, { g: 30, shard: true });
        break;
      case 'shatter':
        this.ring(ev.x, ev.y - ev.r, ev.r * 2.6, 'rgba(255,255,255,', 0.3, 4);
        this.burst(ev.x, ev.y - ev.r, 16, ['#a5ecff', '#ffffff', '#7fc7e6'], 170, 0.6, 4, { g: 320, shard: true, up: 40 });
        this.text(ev.x, ev.y - ev.r * 2.4, `${ev.dealt}`, '#bff3ff', 17);
        this.shake = Math.min(4, this.shake + 1.6);
        break;
      case 'ignite':
        this.burst(ev.x, ev.y - 8, 7, ['#ff7033', '#ffd35a', '#e8431a'], 50, 0.5, 3, { g: -120, add: true });
        break;
      case 'steam':
        this.burst(ev.x, ev.y - 10, 6, ['rgba(255,255,255,.8)', 'rgba(220,235,245,.7)'], 30, 0.7, 4, { g: -70 });
        break;
      case 'mud':
        this.burst(ev.x, ev.y - 4, 5, ['#7a5230', '#5c3d22', '#96683c'], 60, 0.4, 2.6, { up: 30 });
        break;
      case 'thaw':
        this.burst(ev.x, ev.y - 10, 5, ['#a5ecff', '#d9f7ff'], 40, 0.4, 2, { g: 200 });
        break;
      case 'zap': {
        const pts = ev.pts;
        for (let i = 1; i < pts.length; i++) {
          this.bolts.push({ a: pts[i - 1], b: pts[i], life: 0.16, max: 0.16, strong: pts[i].strong, weak: pts[i].weak, seed: Math.random() * 1000 });
          this.burst(pts[i].x, pts[i].y, pts[i].strong ? 6 : 3, ['#fff9c4', '#f6e34d', '#ffffff'], pts[i].strong ? 120 : 70, 0.25, 1.8, { g: 0, add: true });
        }
        break;
      }
      case 'death':
        this.burst(ev.x, ev.y - ev.r, ev.boss ? 40 : 9, ev.burning ? ['#ff7033', '#3a2a22', '#ffd35a'] : ['#d8d2c4', '#8a8478', '#ffffff'], ev.boss ? 150 : 70, ev.boss ? 0.9 : 0.45, ev.boss ? 5 : 3, { up: 20, g: 60 });
        this.text(ev.x, ev.y - ev.r * 2 - 4, `+${ev.gold}`, '#ffd766', ev.boss ? 16 : 11);
        if (ev.boss) { this.shake = 7; this.ring(ev.x, ev.y, 90, 'rgba(255,215,102,', 0.6, 6); }
        break;
      case 'leak':
        this.ring(ev.x, ev.y, 44, 'rgba(232,80,60,', 0.5, 6);
        this.text(ev.x, ev.y - 26, `−${ev.n} ♥`, '#ff7a6a', 16);
        this.flash = 0.35;
        this.shake = Math.min(6, this.shake + 3);
        break;
      case 'purge':
        this.ring(ev.x, ev.y, 100, 'rgba(125,255,154,', 0.6, 4);
        this.burst(ev.x, ev.y - 20, 14, ['#7dff9a', '#b48cff'], 110, 0.6, 2.4, { g: -20, add: true });
        break;
      case 'build':
        this.ring(ev.x, ev.y + 4, 30, 'rgba(255,255,255,', 0.35, 3);
        this.burst(ev.x, ev.y + 4, 12, ['#cfc6b4', '#8a857b', TOWERS[ev.el].color], 80, 0.5, 2.6, { up: 40 });
        break;
      case 'upgrade':
        this.ring(ev.x, ev.y - 10, 34, 'rgba(255,215,102,', 0.45, 3);
        this.burst(ev.x, ev.y - 16, 16, ['#ffd766', '#fff3c4', TOWERS[ev.el].color], 70, 0.8, 2.2, { g: -90, add: true });
        break;
      case 'sell':
        this.burst(ev.x, ev.y, 10, ['#ffd766', '#cfc6b4'], 80, 0.5, 2.4, { up: 50 });
        break;
    }
  }

  // ---------------------------------------------------------- Image ---

  draw(sim, ui, dt) {
    const g = this.g;
    this.t += dt;
    const t = this.t;
    g.setTransform(1, 0, 0, 1, 0, 0);
    let sx = 0, sy = 0;
    if (this.shake > 0.05) {
      sx = (Math.random() - 0.5) * this.shake * this.scale;
      sy = (Math.random() - 0.5) * this.shake * this.scale;
      this.shake *= Math.pow(0.002, dt);
    }
    if (this.bg) g.drawImage(this.bg, sx, sy);
    g.setTransform(this.scale, 0, 0, this.scale, sx, sy);

    // emplacements libres
    for (const s of sim.slots) {
      if (s.tower) continue;
      const sel = ui.selected === s.i, hov = ui.hover === s.i;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + s.i);
      g.strokeStyle = sel ? '#ffd766' : hov ? 'rgba(255,255,255,.9)' : `rgba(255,236,170,${0.28 + pulse * 0.22})`;
      g.lineWidth = sel ? 2.6 : 1.6;
      g.beginPath(); g.ellipse(s.x, s.y + 3.5, 14, 6, 0, 0, TAU); g.stroke();
      g.lineWidth = sel ? 2.4 : 1.8; g.lineCap = 'round';
      line(g, s.x - 4.5, s.y + 3.5, s.x + 4.5, s.y + 3.5); line(g, s.x, s.y + 1.2, s.x, s.y + 5.8);
    }

    // portée
    const sel = ui.selected != null ? sim.slots[ui.selected] : null;
    if (sel) {
      let type = null, range = 0;
      if (sel.tower) { type = sel.tower.type; range = TOWERS[type].lv[ui.previewUp && sel.tower.lvl < 2 ? sel.tower.lvl + 1 : sel.tower.lvl].range; } else if (ui.preview) { type = ui.preview; range = TOWERS[type].lv[0].range; }
      if (type) {
        g.fillStyle = TOWERS[type].color; g.globalAlpha = 0.1; circ(g, sel.x, sel.y, range);
        g.globalAlpha = 0.8; g.strokeStyle = TOWERS[type].color; g.lineWidth = 1.6; g.setLineDash([7, 6]); g.lineDashOffset = -t * 14;
        g.beginPath(); g.arc(sel.x, sel.y, range, 0, TAU); g.stroke();
        g.setLineDash([]); g.globalAlpha = 1;
      }
    }

    // ondes au sol
    for (const r of this.rings) {
      r.life -= dt;
      const k = 1 - Math.max(0, r.life) / r.max;
      g.strokeStyle = `${r.color}${(1 - k) * 0.8})`; g.lineWidth = r.w * (1 - k * 0.6);
      g.beginPath(); g.ellipse(r.x, r.y, r.r * (0.3 + 0.7 * k), r.r * (0.3 + 0.7 * k) * 0.55, 0, 0, TAU); g.stroke();
    }
    this.rings = this.rings.filter((r) => r.life > 0);

    // tours et ennemis, triés en profondeur
    const list = [];
    for (const s of sim.slots) if (s.tower) list.push({ y: s.y, tw: s.tower, sel: ui.selected === s.i });
    for (const e of sim.enemies) list.push({ y: e.y, e });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.tw) {
        if (o.sel) { g.strokeStyle = '#ffd766'; g.lineWidth = 2; g.beginPath(); g.ellipse(o.tw.x, o.tw.y + 4, 23, 10.5, 0, 0, TAU); g.stroke(); }
        drawTower(g, o.tw, t);
      } else {
        drawEnemy(g, o.e, t);
      }
    }
    // aperçu de la tour à bâtir
    if (sel && !sel.tower && ui.preview) {
      g.globalAlpha = 0.6;
      drawTower(g, { type: ui.preview, lvl: 0, x: sel.x, y: sel.y, angle: -Math.PI / 2, kick: 0 }, t);
      g.globalAlpha = 1;
    }

    // projectiles
    for (const p of sim.projectiles) this.drawProjectile(g, p, t);

    // éclairs
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const b of this.bolts) {
      b.life -= dt;
      const k = Math.max(0, b.life / b.max);
      const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const n = Math.max(3, Math.round(len / 16));
      const rr = rng((b.seed + Math.floor(b.life * 60)) | 0);
      g.beginPath(); g.moveTo(b.a.x, b.a.y);
      for (let i = 1; i < n; i++) {
        const j = (rr() - 0.5) * (b.strong ? 16 : 10);
        g.lineTo(b.a.x + dx * (i / n) + nx * j, b.a.y + dy * (i / n) + ny * j);
      }
      g.lineTo(b.b.x, b.b.y);
      g.strokeStyle = b.weak ? `rgba(160,150,110,${k * 0.6})` : `rgba(246,227,77,${k * 0.5})`;
      g.lineWidth = b.strong ? 7 : 4.5; g.stroke();
      g.strokeStyle = b.weak ? `rgba(220,215,190,${k})` : `rgba(255,255,235,${k})`;
      g.lineWidth = b.strong ? 2.6 : 1.5; g.stroke();
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);

    // particules
    for (const p of this.parts) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.6);
      g.fillStyle = p.c;
      if (p.add) g.globalCompositeOperation = 'lighter';
      if (p.shard) {
        p.rot += dt * 9;
        const c = Math.cos(p.rot) * p.size, s = Math.sin(p.rot) * p.size;
        poly(g, [p.x + c, p.y + s, p.x - s * 0.5, p.y + c * 0.5, p.x - c * 0.6, p.y - s * 0.6]);
      } else circ(g, p.x, p.y, p.size * (0.5 + 0.5 * k));
      if (p.add) g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);

    // textes flottants
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const o of this.texts) {
      o.life -= dt; o.y -= 26 * dt;
      const k = Math.max(0, o.life / o.max);
      g.globalAlpha = Math.min(1, k * 2);
      g.font = `700 ${o.size}px Cinzel, Georgia, serif`;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(o.str, o.x, o.y);
      g.fillStyle = o.color; g.fillText(o.str, o.x, o.y);
    }
    g.globalAlpha = 1;
    this.texts = this.texts.filter((o) => o.life > 0);

    if (this.flash > 0) {
      this.flash -= dt;
      g.setTransform(1, 0, 0, 1, 0, 0);
      const k = Math.max(0, this.flash / 0.35);
      const v = g.createRadialGradient(this.cv.width / 2, this.cv.height / 2, this.cv.height * 0.3, this.cv.width / 2, this.cv.height / 2, this.cv.height * 0.9);
      v.addColorStop(0, 'rgba(200,30,20,0)'); v.addColorStop(1, `rgba(200,30,20,${0.55 * k})`);
      g.fillStyle = v; g.fillRect(0, 0, this.cv.width, this.cv.height);
    }
  }

  drawProjectile(g, p, t) {
    const a = p.ang ?? Math.atan2(p.ty - p.y, p.tx - p.x);
    switch (p.kind) {
      case 'phys':
        g.strokeStyle = '#3d2a17'; g.lineWidth = 2; g.lineCap = 'round';
        line(g, p.x - Math.cos(a) * 9, p.y - Math.sin(a) * 9, p.x, p.y);
        g.fillStyle = '#e8e2d2';
        poly(g, [p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 4, p.x + Math.cos(a + 2.5) * 3.5, p.y + Math.sin(a + 2.5) * 3.5, p.x + Math.cos(a - 2.5) * 3.5, p.y + Math.sin(a - 2.5) * 3.5]);
        break;
      case 'glace':
        g.fillStyle = 'rgba(165,236,255,.35)'; circ(g, p.x, p.y, 7);
        g.fillStyle = '#ecfbff';
        poly(g, [p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8, p.x + Math.cos(a + 1.57) * 3, p.y + Math.sin(a + 1.57) * 3, p.x - Math.cos(a) * 7, p.y - Math.sin(a) * 7, p.x + Math.cos(a - 1.57) * 3, p.y + Math.sin(a - 1.57) * 3]);
        if (Math.random() < 0.5) this.part({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0, life: 0.25, max: 0.25, size: 2, c: '#a5ecff' });
        break;
      case 'eau':
        g.fillStyle = 'rgba(74,168,240,.35)'; circ(g, p.x, p.y, 8);
        g.fillStyle = '#4aa8f0'; circ(g, p.x, p.y, 5.2);
        g.fillStyle = '#d9f2ff'; circ(g, p.x - 1.5, p.y - 1.5, 1.8);
        if (Math.random() < 0.5) this.part({ x: p.x, y: p.y, vx: 0, vy: 20, g: 100, life: 0.3, max: 0.3, size: 2, c: '#7cc4ff' });
        break;
      case 'huile':
        g.fillStyle = '#17110a'; circ(g, p.x, p.y, 5.5);
        g.fillStyle = '#b98a35'; circ(g, p.x - 1.6, p.y - 1.8, 1.6);
        if (Math.random() < 0.4) this.part({ x: p.x, y: p.y, vx: 0, vy: 30, g: 200, life: 0.3, max: 0.3, size: 2, c: '#1c1408' });
        break;
      case 'feu':
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(255,112,51,.45)'; circ(g, p.x, p.y, 9);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#ff7033'; circ(g, p.x, p.y, 5.2);
        g.fillStyle = '#ffe07a'; circ(g, p.x, p.y, 2.6);
        this.part({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, g: -40, life: 0.3, max: 0.3, size: 3, c: Math.random() > 0.5 ? '#ff7033' : '#ffd35a', add: true });
        break;
      case 'sable':
        g.fillStyle = 'rgba(230,185,90,.35)'; circ(g, p.x, p.y, 8);
        g.fillStyle = '#e6b95a'; circ(g, p.x, p.y, 5);
        g.fillStyle = '#b98f45'; g.beginPath(); g.arc(p.x, p.y, 5, t * 10, t * 10 + 2); g.fill();
        if (Math.random() < 0.6) this.part({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, g: 60, life: 0.3, max: 0.3, size: 1.6, c: '#f5dfa6' });
        break;
    }
  }
}
