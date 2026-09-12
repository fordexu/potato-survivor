// ===== 实体与工厂 =====

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _eid = 1;
function nextId() { return _eid++; }

function makePlayer(char) {
  const s = {
    maxHp: char.stats.maxHp,
    hpRegen: char.stats.hpRegen || 0,
    damage: char.stats.damage || 0,
    attackSpeed: char.stats.attackSpeed || 0,
    range: char.stats.range || 0,
    critChance: char.stats.critChance || 0,
    critMult: char.stats.critMult || 1.5,
    armor: char.stats.armor || 0,
    speed: char.stats.speed || 0,
    luck: char.stats.luck || 0,
    harvesting: char.stats.harvesting || 0,
    dodge: char.stats.dodge || 0,
    pickupRange: char.stats.pickupRange || 0,
  };
  return {
    id: nextId(),
    x: 480,
    y: 270,
    r: 14,
    color: char.color,
    icon: char.icon,
    charId: char.id,
    hp: s.maxHp,
    stats: s,
    weapons: [],
    passives: {},
    revive: !!char.revive,
    revived: false,
    invuln: 0,
    facing: 0,
    walkT: 0,
    level: 1,
    xp: 0,
    xpNeed: 6,
    materials: 0,
    kills: 0,
    damageDealt: 0,
    killStreak: 0,
    streakTimer: 0,
  };
}

function makeWeapon(def) {
  return {
    def,
    level: 1,
    cd: Math.random() * def.cooldown,
    angle: 0,
    aimAngle: 0,
    fireAnim: 0,
    recoil: 0,
  };
}

function makeEnemy(typeId, x, y, scale = 1) {
  const base = ENEMY_TYPES[typeId];
  const hpScale = 1 + (scale - 1);
  const dmgScale = 1 + (scale - 1) * 0.5;
  const matMul = (typeId === 'elite' || typeId === 'boss') ? 1.5 : 1;
  return {
    id: nextId(),
    type: typeId,
    x, y,
    r: base.radius,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * (0.9 + Math.random() * 0.2),
    damage: base.damage * dmgScale,
    color: base.color,
    xp: base.xp,
    mat: Math.round(base.mat * matMul),
    touchDamage: base.touchDamage,
    shootRange: base.shootRange || 0,
    shootCooldown: base.shootCooldown || 0,
    shootTimer: Math.random() * (base.shootCooldown || 1),
    bulletSpeed: base.bulletSpeed || 0,
    boss: !!base.boss,
    elite: typeId === 'elite',
    hitFlash: 0,
    dead: false,
    vx: 0,
    vy: 0,
    kb: 0,
    spawnAnim: 0.45,
  };
}

function makeBullet(x, y, vx, vy, damage, opts = {}) {
  return {
    id: nextId(),
    x, y, vx, vy,
    r: opts.size || 3,
    damage,
    pierce: opts.pierce || 0,
    life: opts.life || 1.2,
    color: opts.color || '#e8d4a0',
    homing: opts.homing || false,
    aoe: opts.aoe || 0,
    knockback: opts.knockback || 0,
    hitIds: new Set(),
    fromPlayer: opts.fromPlayer !== false,
  };
}

function makeEnemyBullet(x, y, vx, vy, damage, opts = {}) {
  return makeBullet(x, y, vx, vy, damage, {
    size: opts.size || 4,
    color: opts.color || '#c080f0',
    life: 2.5,
    fromPlayer: false,
  });
}

function makePickup(x, y, kind, value) {
  return {
    id: nextId(),
    x, y,
    r: kind === 'mat' ? 5 : 6,
    kind, // 'mat' | 'xp' | 'heal'
    value,
    magnet: false,
    bob: Math.random() * Math.PI * 2,
  };
}

function makeParticle(x, y, vx, vy, life, color, size = 2) {
  return { x, y, vx, vy, life, maxLife: life, color, size };
}

function makeFloatText(x, y, text, color = '#fff', size = 12) {
  return { x, y, text, color, size, life: 0.8, maxLife: 0.8, vy: -40 };
}

function spawnEdgePos(arena, rng) {
  const side = Math.floor(rng() * 4);
  const m = 30;
  let x, y;
  if (side === 0) { x = arena.x + rng() * arena.w; y = arena.y - m; }
  else if (side === 1) { x = arena.x + arena.w + m; y = arena.y + rng() * arena.h; }
  else if (side === 2) { x = arena.x + rng() * arena.w; y = arena.y + arena.h + m; }
  else { x = arena.x - m; y = arena.y + rng() * arena.h; }
  return { x, y };
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function pickWeighted(list, rng, getWeight) {
  let total = 0;
  for (const item of list) total += getWeight(item);
  let r = rng() * total;
  for (const item of list) {
    r -= getWeight(item);
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== 像素 sprite 预渲染 =====
const SpriteCache = new Map();

function makeSpriteCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawPixelBlob(g, color, r, style) {
  const size = r * 2 + 2;
  const c = makeSpriteCanvas(size, size);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const cx = size / 2, cy = size / 2;
  const px = Math.max(2, Math.floor(r / 5));

  // 身体
  x.fillStyle = color;
  if (style === 'circle') {
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  } else if (style === 'diamond') {
    x.beginPath();
    x.moveTo(cx, cy - r);
    x.lineTo(cx + r, cy);
    x.lineTo(cx, cy + r);
    x.lineTo(cx - r, cy);
    x.closePath();
    x.fill();
  } else if (style === 'hex') {
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const pxx = cx + Math.cos(a) * r;
      const pyy = cy + Math.sin(a) * r;
      if (i === 0) x.moveTo(pxx, pyy); else x.lineTo(pxx, pyy);
    }
    x.closePath();
    x.fill();
  } else if (style === 'potato') {
    // 土豆：略椭圆 + 边缘像素块
    x.beginPath();
    x.ellipse(cx, cy, r * 0.95, r, 0, 0, Math.PI * 2);
    x.fill();
    // 边缘锯齿像素
    x.fillStyle = color;
    x.fillRect(cx - r * 0.5, cy - r * 0.85, px * 2, px);
    x.fillRect(cx + r * 0.2, cy - r * 0.9, px * 2, px);
    x.fillRect(cx - r * 0.7, cy + r * 0.5, px, px * 2);
    x.fillRect(cx + r * 0.4, cy + r * 0.45, px, px * 2);
  } else {
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  }

  // 高光
  x.fillStyle = 'rgba(255,255,255,0.2)';
  x.fillRect(cx - r * 0.35, cy - r * 0.4, px * 2, px * 2);

  // 眼睛
  x.fillStyle = '#1a1018';
  const ey = cy - r * 0.12;
  x.fillRect(cx - r * 0.4, ey, px, px + 1);
  x.fillRect(cx + r * 0.15, ey, px, px + 1);

  if (style === 'potato') {
    // 嘴
    x.fillRect(cx - px, cy + r * 0.2, px * 2, px);
    // 腮红
    x.fillStyle = 'rgba(200,80,80,0.25)';
    x.fillRect(cx - r * 0.55, cy + r * 0.05, px, px);
    x.fillRect(cx + r * 0.35, cy + r * 0.05, px, px);
  }

  return c;
}

function getSprite(key, factory) {
  if (!SpriteCache.has(key)) SpriteCache.set(key, factory());
  return SpriteCache.get(key);
}

function getPlayerSprite(color) {
  return getSprite('p:' + color, () => drawPixelBlob(color, 14, 'potato'));
}

function getEnemySprite(typeId, color, r) {
  const style = typeId === 'elite' ? 'diamond' : typeId === 'boss' ? 'hex' : 'circle';
  return getSprite('e:' + typeId + color + r, () => drawPixelBlob(color, r, style));
}
