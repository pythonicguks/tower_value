// Données du jeu : tours, ennemis, talents, niveaux.
// Aucune dépendance au DOM : ce fichier sert aussi aux simulations d'équilibrage (tools/).

export const W = 960;
export const H = 540;

// ---------------------------------------------------------------- Tours ---

export const TOWER_ORDER = ['phys', 'eau', 'glace', 'foudre', 'huile', 'feu', 'sable'];

export const TOWERS = {
  phys: {
    name: 'Archers', title: "Tour d'archers", color: '#cfd4dc', stars: 0,
    cost: 70, up: [70, 130],
    lv: [
      { dmg: 18, rate: 0.85, range: 128 },
      { dmg: 31, rate: 0.8, range: 138 },
      { dmg: 52, rate: 0.72, range: 150 },
    ],
    short: 'Dégâts physiques',
    desc: 'Dégâts physiques francs. Une flèche brise la glace : dégâts ×4 sur une cible givrée, armure ignorée.',
  },
  eau: {
    name: 'Ondine', title: 'Fontaine des ondines', color: '#4aa8f0', stars: 0,
    cost: 60, up: [55, 100],
    lv: [
      { dmg: 2, rate: 1.1, range: 114, splash: 40, dur: 5 },
      { dmg: 4, rate: 1.0, range: 124, splash: 46, dur: 6 },
      { dmg: 6, rate: 0.9, range: 134, splash: 54, dur: 7 },
    ],
    short: 'Mouille en zone',
    desc: "Mouille les ennemis en zone. Lave l'huile et éteint les flammes.",
  },
  glace: {
    name: 'Givre', title: 'Flèche de givre', color: '#a5ecff', stars: 0,
    cost: 80, up: [75, 130],
    lv: [
      { dmg: 8, rate: 1.2, range: 118, freeze: 3.5, splash: 32 },
      { dmg: 14, rate: 1.1, range: 128, freeze: 4.5, splash: 38 },
      { dmg: 22, rate: 1.0, range: 138, freeze: 5.5, splash: 44 },
    ],
    short: 'Givre les mouillés',
    desc: "Givre les cibles mouillées autour de l'impact : elles s'arrêtent jusqu'à la prochaine attaque physique. Sans eau, simple égratignure.",
  },
  foudre: {
    name: 'Foudre', title: 'Tour de foudre', color: '#f6e34d', stars: 1,
    cost: 100, up: [95, 160],
    lv: [
      { dmg: 21, rate: 1.15, range: 122, chain: 2 },
      { dmg: 35, rate: 1.05, range: 132, chain: 3 },
      { dmg: 56, rate: 0.95, range: 142, chain: 4 },
    ],
    short: '×2 sur mouillés',
    desc: "Dégâts ×2 sur les cibles mouillées, et l'éclair rebondit entre elles. Très affaiblie par la boue.",
  },
  huile: {
    name: 'Huile', title: "Chaudron d'huile", color: '#b98a35', stars: 3,
    cost: 55, up: [50, 90],
    lv: [
      { dmg: 1, rate: 1.4, range: 114, splash: 42, dur: 6 },
      { dmg: 2, rate: 1.25, range: 124, splash: 48, dur: 7 },
      { dmg: 3, rate: 1.1, range: 134, splash: 56, dur: 8 },
    ],
    short: 'Huile en zone',
    desc: "Couvre les ennemis d'huile en zone. Seule, elle ne blesse presque pas : c'est le feu qui fait le reste.",
  },
  feu: {
    name: 'Brasier', title: 'Brasier du pyromancien', color: '#ff7033', stars: 3,
    cost: 90, up: [85, 150],
    lv: [
      { dmg: 12, rate: 1.2, range: 112, splash: 36, burn: 26, burnDur: 4 },
      { dmg: 19, rate: 1.1, range: 122, splash: 42, burn: 42, burnDur: 4 },
      { dmg: 30, rate: 1.0, range: 132, splash: 48, burn: 68, burnDur: 4.5 },
    ],
    short: 'Embrase les huilés',
    desc: "Embrase tous les ennemis huilés autour de l'impact. Sur une cible mouillée, la flamme la sèche ; sur une cible givrée, elle la dégèle.",
  },
  sable: {
    name: 'Sables', title: 'Obélisque des sables', color: '#e6b95a', stars: 5,
    cost: 70, up: [65, 110],
    lv: [
      { dmg: 6, rate: 1.3, range: 114, splash: 40, dur: 5, slow: 0.45 },
      { dmg: 10, rate: 1.2, range: 124, splash: 46, dur: 6, slow: 0.5 },
      { dmg: 15, rate: 1.1, range: 134, splash: 52, dur: 7, slow: 0.55 },
    ],
    short: 'Embourbe les mouillés',
    desc: "Change l'eau en boue : les cibles mouillées deviennent boueuses, très ralenties… mais la boue isole de la foudre.",
  },
};

export const PROJECTILE_SPEED = { phys: 430, glace: 360, eau: 300, huile: 280, feu: 340, sable: 300 };

// --------------------------------------------------------------- États ---

export const STATUS = {
  wet: { name: 'Mouillé', color: '#4aa8f0' },
  oil: { name: 'Huilé', color: '#8c6a24' },
  mud: { name: 'Boueux', color: '#8a5f36' },
  frozen: { name: 'Givré', color: '#a5ecff' },
  burn: { name: 'Embrasé', color: '#ff7033' },
};

export const RULES = {
  shatterMul: 4,       // multiplicateur physique sur cible givrée
  wetElecMul: 2,       // foudre sur cible mouillée
  mudElecMul: 0.3,     // foudre sur cible boueuse
  chainRange: 85,      // portée d'un rebond d'éclair
  chainMul: 0.6,       // part des dégâts transmise à chaque rebond
  fireOnWetMul: 0.5,   // dégâts directs du feu sur cible mouillée
  freezeImmunity: 1.2, // secondes sans regel après un dégel
  bossFreezeMul: 0.4,
  bossFreezeImmunity: 3.5,
  bossMudMul: 0.5,
  sellRefund: 0.7,
  waveBreak: 14,       // secondes entre deux vagues
  earlyGoldPerSec: 2,  // or offert par seconde gagnée en appelant la vague
  waveGold: 20,        // solde versée au début de chaque vague après la première
  waveGoldStep: 6,     // … augmentée à chaque vague
};

// ------------------------------------------------------------- Ennemis ---

export const ENEMIES = {
  gobelin: {
    name: 'Gobelin', hp: 60, speed: 48, gold: 4, r: 10,
    trait: 'Faible mais nombreux.',
  },
  loup: {
    name: 'Worg', hp: 46, speed: 88, gold: 4, r: 10,
    trait: 'Très rapide. Arrêtez-le avec le givre ou la boue.',
  },
  orque: {
    name: 'Orque', hp: 185, speed: 38, gold: 10, r: 13,
    trait: 'Robuste. Les dégâts bruts ne suffisent plus.',
  },
  chevalier: {
    name: 'Chevalier noir', hp: 190, speed: 34, gold: 13, r: 13, res: { phys: 0.65 },
    trait: 'Armure : −65 % de dégâts physiques. Le bris de glace ignore son armure.',
  },
  spectre: {
    name: 'Spectre', hp: 115, speed: 54, gold: 9, r: 11, res: { phys: 0.8, sable: 0.8 },
    trait: 'Presque insensible au physique et au sable. Les éléments le blessent.',
  },
  salamandre: {
    name: 'Salamandre', hp: 160, speed: 56, gold: 11, r: 12, res: { feu: 1 }, noBurn: true, wetMul: 0.45,
    trait: "Insensible au feu, et l'eau s'évapore vite sur sa peau brûlante.",
  },
  troll: {
    name: 'Troll', hp: 420, speed: 30, gold: 24, r: 16, regen: 14,
    trait: 'Se régénère en permanence… sauf lorsqu\'il brûle.',
  },
  golem: {
    name: 'Golem de pierre', hp: 720, speed: 24, gold: 40, r: 18, lives: 3, res: { phys: 0.4, foudre: 0.5 },
    trait: 'Colosse résistant au physique et à la foudre. Coûte 3 vies.',
  },
  ogre: {
    name: 'Seigneur ogre', boss: true, hp: 2200, speed: 22, gold: 100, r: 24, lives: 8,
    trait: 'Boss. Le givre et la boue le retiennent bien moins longtemps.',
  },
  liche: {
    name: 'Liche', boss: true, hp: 3000, speed: 24, gold: 150, r: 22, lives: 8, res: { phys: 0.5 }, purge: 6,
    trait: 'Boss. Toutes les 6 s, purge les états de ses serviteurs proches.',
  },
  dragon: {
    name: 'Dragon ancien', boss: true, hp: 5200, speed: 26, gold: 250, r: 30, lives: 12, share: 0.42, res: { feu: 1 }, noBurn: true, wetMul: 0.5,
    trait: "Boss final. Insensible au feu, il sèche vite : la foudre et le bris de glace sont vos meilleures armes.",
  },
};

// ------------------------------------------------------------- Talents ---

export const TALENTS = [
  { id: 'tresor', name: 'Trésor royal', max: 3, cost: 1, group: 'Royaume', desc: '+8 % d\'or de départ par rang.' },
  { id: 'remparts', name: 'Remparts', max: 2, cost: 1, group: 'Royaume', desc: '+2 vies par rang.' },
  { id: 'butin', name: 'Butin de guerre', max: 2, cost: 1, group: 'Royaume', desc: '+5 % d\'or par ennemi vaincu, par rang.' },
  { id: 'architecte', name: 'Maître bâtisseur', max: 2, cost: 1, group: 'Royaume', desc: 'Améliorations de tours −10 % par rang.' },
  { id: 'revente', name: 'Démontage soigné', max: 1, cost: 1, group: 'Royaume', desc: 'La revente rembourse 90 % au lieu de 70 %.' },
  { id: 'perce', name: 'Flèches perce-glace', max: 1, cost: 2, group: 'Éléments', el: 'phys', desc: 'Le bris de glace inflige ×5 au lieu de ×4.' },
  { id: 'eclats', name: 'Éclats tranchants', max: 1, cost: 2, group: 'Éléments', el: 'glace', desc: 'Un ennemi brisé projette des éclats : 50 % des dégâts aux ennemis voisins.' },
  { id: 'hiver', name: 'Long hiver', max: 1, cost: 1, group: 'Éléments', el: 'glace', desc: 'Le givre dure 40 % plus longtemps et blesse 50 % plus fort.' },
  { id: 'deluge', name: 'Déluge', max: 1, cost: 1, group: 'Éléments', el: 'eau', desc: 'Les ennemis restent mouillés 40 % plus longtemps.' },
  { id: 'conduction', name: 'Conduction', max: 1, cost: 2, group: 'Éléments', el: 'foudre', desc: "L'éclair rebondit sur 2 cibles mouillées de plus." },
  { id: 'nappe', name: 'Nappe épaisse', max: 1, cost: 1, group: 'Éléments', el: 'huile', desc: "L'huile couvre une zone 25 % plus large et tient 30 % plus longtemps." },
  { id: 'propagation', name: 'Propagation', max: 1, cost: 2, group: 'Éléments', el: 'feu', desc: 'Un ennemi qui meurt embrasé enflamme les ennemis huilés proches. Brûlure +25 %.' },
  { id: 'sables', name: 'Sables mouvants', max: 1, cost: 1, group: 'Éléments', el: 'sable', desc: 'La boue ralentit 15 points de plus.' },
];

// ------------------------------------------------------------- Niveaux ---
// Une vague est une liste de groupes : [type, nombre, intervalle (s), délai (s), chemin]

const g = (type, n, gap = 1, delay = 0, path = 0) => ({ type, n, gap, delay, path });

export const LEVELS = [
  {
    id: 'aube', name: "Prairie de l'Aube", theme: 'prairie', gold: 230, lives: 20, hp: 1, flux: [0.11, 0.138], span: [8, 20],
    intro: "Les éclaireurs gobelins franchissent la frontière de Valeur. Une Ondine mouille l'ennemi, le Givre le fige, et vos Archers le brisent : tout l'art de la guerre tient dans cet enchaînement.",
    paths: [[[-30, 150], [250, 150], [250, 380], [520, 380], [520, 170], [760, 170], [760, 400], [990, 400]]],
    slots: [[140, 212], [190, 300], [312, 262], [385, 318], [385, 442], [458, 262], [582, 290], [640, 108], [640, 232], [700, 310], [822, 290], [860, 462]],
    waves: [
      [g('gobelin', 6, 1.3)],
      [g('gobelin', 10, 1.0)],
      [g('gobelin', 8, 0.9), g('loup', 4, 1.2, 7)],
      [g('orque', 4, 2.4), g('gobelin', 8, 0.9, 3)],
      [g('loup', 10, 0.8), g('orque', 3, 2.5, 5)],
      [g('orque', 7, 1.8), g('gobelin', 12, 0.7, 4), g('loup', 6, 0.8, 14)],
    ],
  },
  {
    id: 'bois', name: 'Bois des Murmures', theme: 'foret', gold: 260, lives: 20, hp: 1.05, flux: [0.16, 0.2], span: [10, 22],
    intro: "Des chevaliers noirs escortent la horde sous les frondaisons. Leur armure se rit des flèches… sauf quand la glace l'a rendue cassante. La foudre, elle, ne connaît pas d'armure.",
    paths: [[[200, -30], [200, 200], [440, 200], [440, 90], [700, 90], [700, 330], [330, 330], [330, 460], [990, 460]]],
    slots: [[140, 110], [262, 120], [320, 262], [380, 140], [502, 152], [640, 152], [762, 200], [628, 256], [500, 270], [500, 394], [270, 396], [392, 400], [650, 400], [820, 400]],
    waves: [
      [g('gobelin', 10, 0.9)],
      [g('orque', 5, 2), g('loup', 5, 1, 4)],
      [g('chevalier', 3, 3), g('gobelin', 10, 0.8, 2)],
      [g('loup', 12, 0.7), g('chevalier', 3, 3, 4)],
      [g('orque', 8, 1.5), g('chevalier', 4, 2.5, 6)],
      [g('gobelin', 20, 0.5), g('orque', 6, 1.8, 6)],
      [g('chevalier', 8, 2), g('loup', 12, 0.6, 5), g('orque', 6, 1.5, 12)],
    ],
  },
  {
    id: 'marais', name: 'Marais de Brumevase', theme: 'marais', gold: 300, lives: 20, hp: 1.1, flux: [0.115, 0.144], span: [12, 24],
    intro: "Deux sentiers serpentent dans la vase et se rejoignent avant la chaussée. Des spectres s'y mêlent : l'acier les traverse, les éléments les déchirent.",
    paths: [
      [[-30, 120], [300, 120], [300, 290], [600, 290], [600, 430], [990, 430]],
      [[-30, 470], [160, 470], [160, 290], [300, 290], [600, 290], [600, 430], [990, 430]],
    ],
    slots: [[150, 182], [362, 182], [232, 228], [100, 380], [228, 356], [450, 230], [380, 352], [540, 355], [665, 365], [780, 370], [780, 492], [660, 492], [900, 370]],
    waves: [
      [g('gobelin', 8, 1.0, 0, 0), g('gobelin', 8, 1.0, 2, 1)],
      [g('orque', 4, 2.2, 0, 0), g('loup', 8, 0.9, 3, 1)],
      [g('spectre', 5, 1.6, 0, 1), g('gobelin', 10, 0.8, 2, 0)],
      [g('chevalier', 4, 2.5, 0, 0), g('spectre', 5, 1.5, 4, 1)],
      [g('loup', 10, 0.7, 0, 0), g('loup', 10, 0.7, 1, 1), g('orque', 5, 2, 8, 0)],
      [g('spectre', 8, 1.2, 0, 0), g('chevalier', 5, 2.2, 3, 1)],
      [g('orque', 10, 1.4, 0, 1), g('spectre', 8, 1.2, 4, 0), g('chevalier', 4, 2.5, 10, 0)],
      [g('gobelin', 24, 0.45, 0, 0), g('spectre', 10, 1.1, 3, 1), g('chevalier', 6, 2, 8, 0), g('orque', 8, 1.5, 12, 1)],
    ],
  },
  {
    id: 'col', name: 'Col du Vent Hurlant', theme: 'montagne', gold: 340, lives: 20, hp: 1.15, flux: [0.2, 0.25], span: [12, 26],
    intro: "Le Seigneur ogre mène ses trolls par les lacets enneigés. Un troll se régénère sans cesse — sauf quand il brûle. Et nul givre ne retient longtemps un ogre.",
    paths: [[[-30, 100], [820, 100], [820, 240], [140, 240], [140, 380], [820, 380], [820, 570]]],
    slots: [[200, 170], [360, 170], [520, 170], [680, 170], [882, 170], [80, 310], [280, 310], [440, 310], [600, 310], [720, 310], [300, 442], [560, 442], [758, 452], [884, 452]],
    waves: [
      [g('orque', 6, 1.8), g('gobelin', 10, 0.8, 4)],
      [g('loup', 14, 0.7), g('chevalier', 3, 2.5, 5)],
      [g('troll', 2, 5), g('gobelin', 12, 0.7, 2)],
      [g('chevalier', 6, 2), g('spectre', 6, 1.4, 5)],
      [g('troll', 4, 4), g('loup', 12, 0.6, 6)],
      [g('orque', 12, 1.2), g('spectre', 8, 1.2, 5), g('troll', 2, 4, 12)],
      [g('chevalier', 8, 1.8), g('troll', 4, 3.5, 4), g('loup', 14, 0.5, 12)],
      [g('ogre', 1, 1), g('orque', 10, 1.5, 4), g('troll', 3, 4, 10), g('loup', 12, 0.6, 18)],
    ],
  },
  {
    id: 'dunes', name: "Dunes d'Ambre", theme: 'desert', gold: 380, lives: 20, hp: 1.2, flux: [0.17, 0.213], span: [13, 27],
    intro: "Sous le soleil d'Ambre, les salamandres ne craignent aucune flamme et l'eau s'évapore sur leurs écailles. Il faudra frapper vite, ou les embourber.",
    paths: [[[480, -30], [480, 130], [180, 130], [180, 410], [480, 410], [480, 270], [780, 270], [780, 470], [990, 470]]],
    slots: [[542, 82], [418, 70], [330, 192], [240, 204], [120, 270], [242, 302], [330, 350], [418, 340], [330, 472], [542, 350], [542, 208], [630, 208], [630, 332], [718, 340], [846, 372], [900, 410]],
    waves: [
      [g('loup', 12, 0.7), g('orque', 5, 2, 4)],
      [g('salamandre', 5, 1.6), g('gobelin', 12, 0.7, 3)],
      [g('chevalier', 6, 2), g('salamandre', 5, 1.5, 5)],
      [g('loup', 20, 0.45), g('troll', 2, 4, 5)],
      [g('salamandre', 10, 1.1), g('spectre', 6, 1.4, 4)],
      [g('troll', 5, 3), g('chevalier', 6, 2, 4), g('loup', 10, 0.6, 12)],
      [g('salamandre', 12, 0.9), g('orque', 12, 1.1, 3), g('spectre', 8, 1.2, 10)],
      [g('golem', 2, 6), g('salamandre', 10, 1, 3), g('loup', 16, 0.5, 10)],
      [g('golem', 3, 5), g('troll', 5, 3, 3), g('salamandre', 12, 0.9, 8), g('chevalier', 8, 1.6, 14)],
    ],
  },
  {
    id: 'necropole', name: 'Nécropole des Cendres', theme: 'necropole', gold: 430, lives: 20, hp: 1.25, flux: [0.125, 0.156], span: [13, 28],
    intro: "La Liche relève ses morts par deux portes à la fois, et leurs colonnes se rejoignent au cœur de la nécropole. Tous les six battements, elle purge les états de ceux qui l'entourent : frappez ses serviteurs loin d'elle.",
    paths: [
      [[-30, 120], [240, 120], [240, 300], [440, 300], [440, 430], [700, 430], [700, 330], [860, 330], [860, 570]],
      [[990, 110], [640, 110], [640, 220], [440, 220], [440, 300], [440, 430], [700, 430], [700, 330], [860, 330], [860, 570]],
    ],
    slots: [[130, 180], [296, 186], [180, 240], [330, 246], [340, 360], [700, 172], [820, 170], [580, 160], [540, 280], [396, 186], [500, 360], [380, 420], [500, 490], [620, 370], [640, 490], [760, 392], [780, 270], [652, 312], [800, 440]],
    waves: [
      [g('spectre', 6, 1.4, 0, 0), g('orque', 6, 1.6, 2, 1)],
      [g('chevalier', 6, 2, 0, 1), g('loup', 14, 0.6, 3, 0)],
      [g('spectre', 10, 1.1, 0, 1), g('troll', 3, 3.5, 4, 0)],
      [g('salamandre', 8, 1.2, 0, 0), g('chevalier', 6, 1.8, 2, 1)],
      [g('golem', 2, 6, 0, 0), g('spectre', 12, 1, 3, 1)],
      [g('troll', 5, 3, 0, 1), g('loup', 20, 0.45, 4, 0), g('chevalier', 6, 1.8, 10, 0)],
      [g('spectre', 16, 0.8, 0, 0), g('spectre', 10, 1, 4, 1), g('golem', 2, 5, 10, 1)],
      [g('orque', 16, 0.9, 0, 0), g('salamandre', 10, 1, 4, 1), g('troll', 4, 3, 10, 0)],
      [g('liche', 1, 1, 0, 1), g('spectre', 14, 0.9, 3, 0), g('chevalier', 8, 1.6, 8, 1), g('golem', 2, 5, 16, 0)],
    ],
  },
  {
    id: 'forges', name: 'Forges de Cendrefer', theme: 'volcan', gold: 480, lives: 20, hp: 1.3, flux: [0.115, 0.144], span: [14, 30],
    intro: "Au cœur du volcan, les golems sortent des forges. Pierre contre flèches, pierre contre foudre : seul un brasier bien nourri d'huile les fera éclater.",
    paths: [[[-30, 440], [200, 440], [200, 120], [420, 120], [420, 400], [640, 400], [640, 120], [860, 120], [860, 570]]],
    slots: [[100, 378], [140, 280], [262, 222], [360, 300], [310, 182], [482, 200], [580, 200], [530, 338], [530, 462], [372, 372], [702, 262], [800, 262], [750, 182], [920, 300], [800, 430], [262, 340]],
    waves: [
      [g('salamandre', 8, 1.2), g('orque', 8, 1.3, 3)],
      [g('golem', 2, 5), g('loup', 16, 0.5, 3)],
      [g('chevalier', 10, 1.4), g('salamandre', 8, 1.1, 5)],
      [g('troll', 6, 2.6), g('spectre', 10, 1, 4)],
      [g('golem', 4, 4), g('gobelin', 30, 0.35, 3)],
      [g('salamandre', 16, 0.8), g('chevalier', 8, 1.5, 4), g('troll', 3, 3, 12)],
      [g('spectre', 18, 0.7), g('golem', 3, 4, 4), g('loup', 20, 0.4, 12)],
      [g('troll', 8, 2.2), g('salamandre', 14, 0.8, 4), g('golem', 3, 4, 12)],
      [g('golem', 6, 3.2), g('chevalier', 12, 1.2, 4), g('spectre', 12, 0.9, 12)],
      [g('ogre', 2, 8), g('golem', 4, 4, 4), g('troll', 6, 2.5, 8), g('salamandre', 16, 0.7, 14), g('loup', 20, 0.4, 24)],
    ],
  },
  {
    id: 'trone', name: 'Trône du Dragon', theme: 'citadelle', gold: 540, lives: 20, hp: 1.4, flux: [0.115, 0.144], span: [14, 32],
    intro: "Devant les portes de Valeur, le Dragon ancien rassemble tout ce qui marche, rampe et brûle. Chaque élément doit trouver sa place. Tenez bon, Gardien.",
    paths: [
      [[-30, 110], [200, 110], [200, 250], [420, 250], [420, 400], [660, 400], [660, 150], [860, 150], [860, 570]],
      [[420, -30], [420, 250], [420, 400], [660, 400], [660, 150], [860, 150], [860, 570]],
    ],
    slots: [[120, 170], [260, 180], [140, 250], [356, 330], [360, 120], [480, 110], [484, 210], [480, 330], [540, 460], [452, 460], [600, 330], [720, 300], [600, 200], [684, 414], [760, 90], [760, 210], [800, 300], [920, 300], [800, 440], [636, 128]],
    waves: [
      [g('orque', 10, 1.2, 0, 0), g('loup', 14, 0.6, 2, 1)],
      [g('chevalier', 8, 1.5, 0, 1), g('spectre', 10, 1, 3, 0)],
      [g('salamandre', 12, 0.9, 0, 0), g('troll', 4, 3, 3, 1)],
      [g('golem', 3, 4.5, 0, 1), g('gobelin', 30, 0.35, 2, 0)],
      [g('spectre', 16, 0.8, 0, 0), g('chevalier', 10, 1.3, 3, 1)],
      [g('troll', 6, 2.5, 0, 0), g('salamandre', 14, 0.8, 3, 1), g('loup', 20, 0.4, 12, 0)],
      [g('ogre', 1, 1, 0, 0), g('golem', 3, 4, 3, 1), g('orque', 16, 0.9, 6, 0)],
      [g('chevalier', 14, 1.1, 0, 0), g('spectre', 14, 0.8, 2, 1), g('troll', 5, 2.8, 12, 1)],
      [g('golem', 5, 3.5, 0, 0), g('salamandre', 16, 0.7, 3, 1), g('loup', 24, 0.35, 14, 0)],
      [g('liche', 1, 1, 0, 1), g('spectre', 16, 0.8, 2, 0), g('troll', 6, 2.5, 8, 1), g('chevalier', 10, 1.2, 14, 0)],
      [g('ogre', 2, 6, 0, 0), g('golem', 5, 3.5, 3, 1), g('salamandre', 16, 0.7, 8, 0), g('troll', 6, 2.5, 16, 1)],
      [g('dragon', 1, 1, 0, 0), g('salamandre', 14, 0.9, 4, 1), g('golem', 4, 4, 8, 0), g('chevalier', 12, 1.1, 14, 1), g('loup', 24, 0.35, 24, 0)],
    ],
  },
];

// Ajuste chaque vague à la difficulté du niveau. Les vagues ci-dessus donnent la composition ;
// l'effectif et le rythme en découlent.
//   flux = [début, fin] : dégâts par seconde exigés par pièce d'or disponible au lancement ;
//   span = [début, fin] : durée d'arrivée d'une vague, en secondes.
// `flux` est le curseur de difficulté (tools/balance.mjs tune le règle par simulation).
const PASS_TIME = 6; // secondes qu'un ennemi moyen passe sous le feu d'une tour
const BOSS_SHARE = 0.3; // part des points de vie d'une vague portée par son ou ses boss

export function tuneWaves(level) {
  level.raw = level.raw || level.waves;
  const [f0, f1] = level.flux;
  const [d0, d1] = level.span;
  const n = level.raw.length;
  let gold = level.gold;
  level.waves = level.raw.map((wave, i) => {
    if (i > 0) gold += RULES.waveGold + RULES.waveGoldStep * i;
    const k = n > 1 ? i / (n - 1) : 0;
    const scale = level.hp * (1 + 0.05 * i);
    const span = d0 + (d1 - d0) * k;
    const target = (f0 + (f1 - f0) * k) * gold * (span + PASS_TIME);
    // Les boss prennent une part fixe du budget de la vague ; l'escorte se partage le reste.
    let bossHp = 0, flex = 0;
    for (const grp of wave) {
      const hp = ENEMIES[grp.type].hp * scale * grp.n;
      if (ENEMIES[grp.type].boss) bossHp += hp; else flex += hp;
    }
    const share = wave.reduce((m, grp) => Math.max(m, ENEMIES[grp.type].share || 0), 0) || BOSS_SHARE;
    const bossMul = bossHp ? (share * target) / bossHp : 1;
    const f = Math.max(0.1, (target * (bossHp ? 1 - share : 1)) / (flex || 1));
    const out = wave.map((grp) => (ENEMIES[grp.type].boss
      ? { ...grp, mul: Math.round(bossMul * 100) / 100 }
      : { ...grp, n: Math.max(1, Math.round(grp.n * f)) }));
    let dur = 0;
    for (const grp of out) {
      dur = Math.max(dur, grp.delay + (grp.n - 1) * grp.gap);
      gold += ENEMIES[grp.type].gold * grp.n;
    }
    const stretch = span / (dur || 1);
    for (const grp of out) {
      grp.gap = Math.round(Math.min(4, Math.max(0.28, grp.gap * stretch)) * 100) / 100;
      grp.delay = Math.round(grp.delay * stretch * 10) / 10;
    }
    return out;
  });
}
LEVELS.forEach(tuneWaves);

// Étoiles d'après les vies restantes.
export function starsFor(lives, maxLives) {
  if (lives <= 0) return 0;
  const ratio = lives / maxLives;
  return ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
}

export function isUnlocked(type, totalStars) {
  return totalStars >= TOWERS[type].stars;
}
