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
    hp: s.maxHp,
    stats: s,
    weapons: [],
    invuln: 0,
    facing: 0,
    walkT: 0,
    level: 1,
    xp: 0,
    xpNeed: 8,
    materials: 0,
    kills: 0,
    damageDealt: 0,
  };
}

function makeWeapon(def) {
  return {
    def,
    level: 1,
    cd: Math.random() * def.cooldown,
    angle: 0,
    fireAnim: 0,
  };
}

function makeEnemy(typeId, x, y, scale = 1) {
  const base = ENEMY_TYPES[typeId];
  const hpScale = 1 + (scale - 1);
  return {
    id: nextId(),
    type: typeId,
    x, y,
    r: base.radius,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * (0.9 + Math.random() * 0.2),
    damage: base.damage * (1 + (scale - 1) * 0.5),
    color: base.color,
    xp: base.xp,
    mat: base.mat,
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
