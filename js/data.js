// ===== 静态配置数据 =====

const CHARACTERS = [
  {
    id: 'well-rounded',
    name: '全能土豆',
    icon: '🥔',
    desc: '均衡型，适合新手',
    stats: { maxHp: 10, hpRegen: 0, damage: 0, attackSpeed: 0, range: 0, critChance: 0, critMult: 1.5, armor: 0, speed: 0, luck: 0, harvesting: 0, dodge: 0, pickupRange: 0 },
    startWeapons: ['pistol'],
    color: '#c4a56a',
  },
  {
    id: 'brawler',
    name: '狂战土豆',
    icon: '💪',
    desc: '近战加成，生命更多，但射程更短',
    stats: { maxHp: 15, hpRegen: 1, damage: 20, attackSpeed: 10, range: -20, critChance: 0, critMult: 1.5, armor: 2, speed: 5, luck: 0, harvesting: 0, dodge: 0, pickupRange: 0 },
    startWeapons: ['fist'],
    color: '#d4896a',
  },
  {
    id: 'sniper',
    name: '狙击土豆',
    icon: '🎯',
    desc: '远程暴击流，生命较少',
    stats: { maxHp: 7, hpRegen: 0, damage: 15, attackSpeed: -10, range: 40, critChance: 15, critMult: 2.0, armor: 0, speed: 0, luck: 5, harvesting: 0, dodge: 0, pickupRange: 0 },
    startWeapons: ['sniper'],
    color: '#7ab0d4',
  },
  {
    id: 'engineer',
    name: '工程土豆',
    icon: '🔧',
    desc: '攻速快，幸运高，伤害略低',
    stats: { maxHp: 9, hpRegen: 1, damage: -10, attackSpeed: 30, range: 10, critChance: 5, critMult: 1.5, armor: 0, speed: 10, luck: 15, harvesting: 5, dodge: 0, pickupRange: 10 },
    startWeapons: ['smg'],
    color: '#8fd4a0',
  },
  {
    id: 'ghost',
    name: '幽灵土豆',
    icon: '👻',
    desc: '高速闪避，脆弱但灵活',
    stats: { maxHp: 6, hpRegen: 0, damage: 5, attackSpeed: 15, range: 5, critChance: 10, critMult: 1.5, armor: 0, speed: 25, luck: 10, harvesting: 0, dodge: 20, pickupRange: 20 },
    startWeapons: ['smg'],
    color: '#b8a0d4',
  },
  {
    id: 'farmer',
    name: '农夫土豆',
    icon: '🌾',
    desc: '收获丰厚，便于滚雪球',
    stats: { maxHp: 11, hpRegen: 2, damage: 0, attackSpeed: 0, range: 0, critChance: 0, critMult: 1.5, armor: 1, speed: 5, luck: 10, harvesting: 25, dodge: 0, pickupRange: 15 },
    startWeapons: ['pistol'],
    color: '#d4c06a',
  },
  {
    id: 'zombie',
    name: '僵尸土豆',
    icon: '🧟',
    desc: '死亡后一次复活（半血）',
    stats: { maxHp: 12, hpRegen: 1, damage: 5, attackSpeed: 5, range: 0, critChance: 0, critMult: 1.5, armor: 1, speed: -5, luck: 0, harvesting: 0, dodge: 0, pickupRange: 0 },
    startWeapons: ['fist'],
    color: '#7ab87a',
    revive: true,
  },
  {
    id: 'gambler',
    name: '赌徒土豆',
    icon: '🎰',
    desc: '暴击极高，身板极脆',
    stats: { maxHp: 5, hpRegen: 0, damage: 10, attackSpeed: 10, range: 5, critChance: 25, critMult: 2.5, armor: 0, speed: 10, luck: 20, harvesting: -10, dodge: 10, pickupRange: 0 },
    startWeapons: ['smg'],
    color: '#d4a0e8',
  },
];

const WEAPONS = {
  pistol: {
    id: 'pistol', name: '手枪', icon: '🔫', rarity: 'common',
    desc: '稳定可靠的远程武器',
    damage: 10, cooldown: 0.85, range: 280, speed: 420, pierce: 0, spread: 0.04,
    bullets: 1, bulletSize: 3, color: '#e8d4a0',
    melee: false, knockback: 40,
    price: 15,
  },
  smg: {
    id: 'smg', name: '冲锋枪', icon: '🔫', rarity: 'common',
    desc: '射速极快，单发伤害较低',
    damage: 4, cooldown: 0.18, range: 220, speed: 480, pierce: 0, spread: 0.14,
    bullets: 1, bulletSize: 2, color: '#a0d4e8',
    melee: false, knockback: 18,
    price: 22,
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', icon: '💥', rarity: 'uncommon',
    desc: '一次喷出多枚弹丸',
    damage: 5, cooldown: 1.1, range: 160, speed: 380, pierce: 0, spread: 0.35,
    bullets: 5, bulletSize: 2, color: '#e8a060',
    melee: false, knockback: 55,
    price: 28,
  },
  sniper: {
    id: 'sniper', name: '狙击枪', icon: '🎯', rarity: 'uncommon',
    desc: '超远射程，高伤害高暴击',
    damage: 28, cooldown: 1.6, range: 420, speed: 700, pierce: 2, spread: 0.01,
    bullets: 1, bulletSize: 3, color: '#e86060',
    melee: false, knockback: 80,
    price: 32,
  },
  fist: {
    id: 'fist', name: '拳击', icon: '👊', rarity: 'common',
    desc: '近距离快速挥击',
    damage: 8, cooldown: 0.55, range: 55, speed: 0, pierce: 0, spread: 0,
    bullets: 0, bulletSize: 14, color: '#e8c060',
    melee: true, knockback: 70,
    price: 12,
  },
  flamethrower: {
    id: 'flamethrower', name: '火焰喷射', icon: '🔥', rarity: 'rare',
    desc: '持续灼烧近距离敌人',
    damage: 2.5, cooldown: 0.08, range: 120, speed: 280, pierce: 99, spread: 0.4,
    bullets: 1, bulletSize: 4, color: '#e87030',
    melee: false, knockback: 10,
    price: 40,
  },
  rocket: {
    id: 'rocket', name: '火箭筒', icon: '🚀', rarity: 'rare',
    desc: '高伤害爆炸范围攻击',
    damage: 35, cooldown: 1.8, range: 320, speed: 300, pierce: 0, spread: 0.03,
    bullets: 1, bulletSize: 5, color: '#e84040',
    melee: false, knockback: 100, aoe: 50,
    price: 48,
  },
  laser: {
    id: 'laser', name: '激光枪', icon: '⚡', rarity: 'epic',
    desc: '穿透一切的光束',
    damage: 12, cooldown: 0.35, range: 360, speed: 900, pierce: 99, spread: 0.02,
    bullets: 1, bulletSize: 2, color: '#80f0e0',
    melee: false, knockback: 20,
    price: 55,
  },
  wand: {
    id: 'wand', name: '魔法杖', icon: '✨', rarity: 'uncommon',
    desc: '自动追踪敌人的法球',
    damage: 14, cooldown: 1.0, range: 300, speed: 260, pierce: 1, spread: 0.1,
    bullets: 1, bulletSize: 4, color: '#c080f0',
    melee: false, knockback: 35, homing: true,
    price: 30,
  },
  minigun: {
    id: 'minigun', name: '加特林', icon: '⚙️', rarity: 'legendary',
    desc: '毁灭性的火力倾泻',
    damage: 6, cooldown: 0.09, range: 260, speed: 520, pierce: 1, spread: 0.18,
    bullets: 1, bulletSize: 3, color: '#f0e060',
    melee: false, knockback: 25,
    price: 70,
  },
};

const UPGRADES = [
  { id: 'maxHp', name: '生命上限', icon: '❤️', desc: '+2 最大生命', weight: 10, apply: s => s.maxHp += 2 },
  { id: 'hpRegen', name: '生命回复', icon: '💚', desc: '+1 每秒回复', weight: 8, apply: s => s.hpRegen += 1 },
  { id: 'damage', name: '伤害', icon: '⚔️', desc: '+8% 伤害', weight: 10, apply: s => s.damage += 8 },
  { id: 'attackSpeed', name: '攻速', icon: '⚡', desc: '+8% 攻击速度', weight: 10, apply: s => s.attackSpeed += 8 },
  { id: 'range', name: '射程', icon: '🔭', desc: '+12% 射程', weight: 7, apply: s => s.range += 12 },
  { id: 'critChance', name: '暴击率', icon: '🎯', desc: '+5% 暴击率', weight: 7, apply: s => s.critChance += 5 },
  { id: 'critMult', name: '暴击伤害', icon: '💥', desc: '+25% 暴击伤害', weight: 5, apply: s => s.critMult += 0.25 },
  { id: 'armor', name: '护甲', icon: '🛡️', desc: '+2 护甲', weight: 7, apply: s => s.armor += 2 },
  { id: 'speed', name: '移速', icon: '👟', desc: '+8% 移动速度', weight: 8, apply: s => s.speed += 8 },
  { id: 'luck', name: '幸运', icon: '🍀', desc: '+8 幸运', weight: 6, apply: s => s.luck += 8 },
  { id: 'harvesting', name: '收获', icon: '🌾', desc: '+8 收获（材料加成）', weight: 6, apply: s => s.harvesting += 8 },
  { id: 'dodge', name: '闪避', icon: '💨', desc: '+5% 闪避（最高60%）', weight: 5, apply: s => s.dodge = Math.min(60, s.dodge + 5) },
  { id: 'pickup', name: '拾取范围', icon: '🧲', desc: '+20% 拾取范围', weight: 4, apply: s => s.pickupRange += 20 },
];

const CONSUMABLES = [
  { id: 'heal_s', name: '小回复', icon: '🍎', desc: '回复 5 点生命', price: 8, rarity: 'common', use: g => { g.player.hp = Math.min(g.player.stats.maxHp, g.player.hp + 5); } },
  { id: 'heal_l', name: '大回复', icon: '🍖', desc: '回复 15 点生命', price: 18, rarity: 'uncommon', use: g => { g.player.hp = Math.min(g.player.stats.maxHp, g.player.hp + 15); } },
  { id: 'full_heal', name: '满血药剂', icon: '🧪', desc: '完全恢复生命', price: 35, rarity: 'rare', use: g => { g.player.hp = g.player.stats.maxHp; } },
];

const PASSIVES = [
  {
    id: 'lifesteal', name: '吸血牙', icon: '🦷', rarity: 'uncommon', price: 28,
    desc: '击杀敌人回复 1 点生命',
    apply: p => { p.passives.lifesteal = (p.passives.lifesteal || 0) + 1; },
  },
  {
    id: 'heavy_plate', name: '重甲片', icon: '🛡️', rarity: 'uncommon', price: 30,
    desc: '+8 护甲，-5% 移速',
    apply: p => { p.stats.armor += 8; p.stats.speed -= 5; },
  },
  {
    id: 'ammo_belt', name: '弹药带', icon: '🎗️', rarity: 'rare', price: 36,
    desc: '+12% 攻击速度',
    apply: p => { p.stats.attackSpeed += 12; },
  },
  {
    id: 'bounty', name: '赏金令', icon: '💰', rarity: 'rare', price: 40,
    desc: '击杀额外 +1 材料（受收获加成）',
    apply: p => { p.passives.bounty = (p.passives.bounty || 0) + 1; },
  },
];

const ENEMY_TYPES = {
  runner: {
    id: 'runner', name: '疾行者', hp: 8, speed: 95, damage: 4, radius: 8,
    color: '#e86a6a', xp: 1, mat: 1, touchDamage: true,
  },
  grunt: {
    id: 'grunt', name: '步兵', hp: 16, speed: 55, damage: 6, radius: 10,
    color: '#c06060', xp: 2, mat: 1, touchDamage: true,
  },
  tank: {
    id: 'tank', name: '重装', hp: 48, speed: 32, damage: 12, radius: 14,
    color: '#8a5050', xp: 4, mat: 2, touchDamage: true,
  },
  shooter: {
    id: 'shooter', name: '射手', hp: 12, speed: 40, damage: 5, radius: 9,
    color: '#a070c0', xp: 3, mat: 2, touchDamage: false,
    shootRange: 220, shootCooldown: 1.8, bulletSpeed: 200,
  },
  swarm: {
    id: 'swarm', name: '虫群', hp: 4, speed: 120, damage: 3, radius: 6,
    color: '#d0c060', xp: 1, mat: 1, touchDamage: true,
  },
  elite: {
    id: 'elite', name: '精英', hp: 80, speed: 50, damage: 14, radius: 13,
    color: '#e09040', xp: 10, mat: 6, touchDamage: true,
  },
  boss: {
    id: 'boss', name: '暴君', hp: 320, speed: 38, damage: 18, radius: 22,
    color: '#e04060', xp: 30, mat: 20, touchDamage: true,
    shootRange: 280, shootCooldown: 1.2, bulletSpeed: 180, boss: true,
  },
};

const WAVES = [
  // wave 1-20
  { time: 40, spawnRate: 0.7, pool: ['runner'], count: 12 },
  { time: 40, spawnRate: 0.65, pool: ['runner', 'grunt'], count: 16 },
  { time: 42, spawnRate: 0.6, pool: ['runner', 'grunt'], count: 20 },
  { time: 42, spawnRate: 0.55, pool: ['runner', 'grunt', 'shooter'], count: 22 },
  { time: 45, spawnRate: 0.5, pool: ['grunt', 'shooter', 'runner'], count: 26 },
  { time: 45, spawnRate: 0.5, pool: ['grunt', 'tank', 'runner'], count: 28 },
  { time: 45, spawnRate: 0.45, pool: ['runner', 'grunt', 'shooter', 'swarm'], count: 32 },
  { time: 48, spawnRate: 0.45, pool: ['grunt', 'tank', 'shooter'], count: 34 },
  { time: 48, spawnRate: 0.4, pool: ['runner', 'swarm', 'shooter', 'grunt'], count: 38 },
  { time: 50, spawnRate: 0.4, pool: ['tank', 'shooter', 'grunt', 'elite'], count: 40, elite: 1 },
  { time: 50, spawnRate: 0.38, pool: ['runner', 'grunt', 'tank', 'shooter'], count: 42 },
  { time: 50, spawnRate: 0.35, pool: ['swarm', 'shooter', 'tank', 'grunt'], count: 46 },
  { time: 52, spawnRate: 0.35, pool: ['tank', 'shooter', 'elite', 'grunt'], count: 48, elite: 2 },
  { time: 52, spawnRate: 0.32, pool: ['runner', 'shooter', 'tank', 'swarm'], count: 50 },
  { time: 55, spawnRate: 0.32, pool: ['tank', 'shooter', 'elite', 'grunt'], count: 54, elite: 2 },
  { time: 55, spawnRate: 0.3, pool: ['grunt', 'tank', 'shooter', 'elite'], count: 56, elite: 3 },
  { time: 55, spawnRate: 0.28, pool: ['tank', 'elite', 'shooter', 'swarm'], count: 60, elite: 3 },
  { time: 58, spawnRate: 0.28, pool: ['tank', 'shooter', 'elite', 'grunt'], count: 64, elite: 4 },
  { time: 58, spawnRate: 0.25, pool: ['elite', 'tank', 'shooter', 'runner'], count: 68, elite: 4 },
  { time: 70, spawnRate: 0.5, pool: ['boss'], count: 1, boss: true, elite: 0 },
];

function getWaveConfig(n) {
  const i = Math.min(n - 1, WAVES.length - 1);
  const base = WAVES[i];
  // 后续循环难度
  if (n > WAVES.length) {
    const extra = n - WAVES.length;
    return {
      ...base,
      time: 60,
      spawnRate: Math.max(0.15, 0.25 - extra * 0.01),
      pool: ['tank', 'elite', 'shooter', 'grunt', 'runner'],
      count: 70 + extra * 8,
      elite: 4 + extra,
      boss: n % 5 === 0,
    };
  }
  return base;
}

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_COLORS = {
  common: '#5a6a7a',
  uncommon: '#4a9a6a',
  rare: '#5a7acc',
  epic: '#a060d0',
  legendary: '#e8a838',
};
