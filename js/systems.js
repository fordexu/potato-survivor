// ===== 游戏系统 =====

const ARENA = { x: 0, y: 0, w: 2400, h: 1600 };

function arenaCenter() {
  return { x: ARENA.x + ARENA.w / 2, y: ARENA.y + ARENA.h / 2 };
}

function updateCamera(g, dt) {
  const p = g.player;
  if (!g.camera) {
    g.camera = { x: p.x, y: p.y };
  }
  const viewW = (typeof canvas !== 'undefined' && canvas.width) || 1280;
  const viewH = (typeof canvas !== 'undefined' && canvas.height) || 720;
  // 目标：玩家居中，并限制在场地内
  let tx = p.x - viewW / 2;
  let ty = p.y - viewH / 2;
  const minX = ARENA.x - 20;
  const minY = ARENA.y - 20;
  const maxX = ARENA.x + ARENA.w - viewW + 20;
  const maxY = ARENA.y + ARENA.h - viewH + 20;
  if (ARENA.w <= viewW) tx = ARENA.x - (viewW - ARENA.w) / 2;
  else tx = clamp(tx, minX, Math.max(minX, maxX));
  if (ARENA.h <= viewH) ty = ARENA.y - (viewH - ARENA.h) / 2;
  else ty = clamp(ty, minY, Math.max(minY, maxY));

  const k = 1 - Math.exp(-6 * dt);
  g.camera.x += (tx - g.camera.x) * k;
  g.camera.y += (ty - g.camera.y) * k;
}

function createGame(char, seed = Date.now(), difficultyId = 'normal') {
  const player = makePlayer(char);
  const c = arenaCenter();
  player.x = c.x;
  player.y = c.y;
  const diff = getDifficulty(difficultyId);
  player.materials += diff.startBonus || 0;
  for (const wid of char.startWeapons) {
    player.weapons.push(makeWeapon(WEAPONS[wid]));
  }
  return {
    state: 'playing',
    difficulty: diff,
    player,
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    floats: [],
    wave: 1,
    waveTime: 0,
    waveConfig: null,
    spawnTimer: 0,
    spawned: 0,
    elapsed: 0,
    rng: mulberry32(seed),
    shake: 0,
    flash: 0,
    hitStop: 0,
    bossAlert: 0,
    shopItems: [],
    rerollCost: 5,
    upgradeChoices: [],
    pendingLevelUps: 0,
    pendingShop: false,
    score: 0,
    timeScale: 1,
    camera: null,
  };
}

function startWave(g) {
  const cfg = getWaveConfig(g.wave);
  const diff = g.difficulty || getDifficulty('normal');
  g.waveConfig = {
    ...cfg,
    count: Math.max(1, Math.round(cfg.count * (diff.enemyCount || 1))),
    spawnRate: cfg.spawnRate * (diff.spawnRate || 1),
  };
  g.waveTime = cfg.time;
  g.spawnTimer = g.waveConfig.boss ? 1.2 : 0.5;
  g.spawned = 0;
  g.state = 'playing';
  if (g.waveConfig.boss) {
    g.bossAlert = 1.4;
    Sfx.boss();
  } else {
    Sfx.wave();
  }
}

function enemyScale(g) {
  const base = 1 + (g.wave - 1) * 0.15;
  return base * ((g.difficulty && g.difficulty.enemyHp) || 1);
}

function tryDash(g) {
  const p = g.player;
  if (p.dashCd > 0 || p.dashTime > 0 || p.hp <= 0) return false;
  let dx = p.moveX || Math.cos(p.facing || 0);
  let dy = p.moveY || Math.sin(p.facing || 0);
  if (!dx && !dy) { dx = 1; dy = 0; }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  p.dashTime = 0.18;
  p.dashCd = 1.2;
  p.dashVx = dx * 720;
  p.dashVy = dy * 720;
  p.invuln = Math.max(p.invuln, 0.22);
  p.facing = Math.atan2(dy, dx);
  for (let i = 0; i < 10; i++) {
    g.particles.push(makeParticle(p.x, p.y, -dx * 80 + (g.rng() - 0.5) * 40, -dy * 80 + (g.rng() - 0.5) * 40, 0.3, '#9ad0ff', 3));
  }
  return true;
}

function updatePlaying(g, dt, input) {
  const p = g.player;
  // hit-stop
  if (g.hitStop > 0) {
    g.hitStop -= dt;
    dt *= 0.25;
  }
  g.elapsed += dt;
  g.waveTime -= dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 18);
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 4);
  if (g.bossAlert > 0) g.bossAlert -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.streakTimer > 0) {
    p.streakTimer -= dt;
    if (p.streakTimer <= 0) p.killStreak = 0;
  }
  if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt);
    // 冲刺位移
    p.x += p.dashVx * dt;
    p.y += p.dashVy * dt;
    p.x = clamp(p.x, ARENA.x + p.r, ARENA.x + ARENA.w - p.r);
    p.y = clamp(p.y, ARENA.y + p.r, ARENA.y + ARENA.h - p.r);
    if (g.rng() < 0.6) {
      g.particles.push(makeParticle(p.x, p.y, 0, 0, 0.25, 'rgba(200,220,255,0.55)', 4));
    }
  } else {
    // 移动
    let mx = 0, my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    const ml = Math.hypot(mx, my) || 1;
    const spd = 160 * (1 + p.stats.speed / 100);
    if (mx || my) {
      p.x += (mx / ml) * spd * dt;
      p.y += (my / ml) * spd * dt;
      p.facing = Math.atan2(my, mx);
      p.walkT += dt * 12;
      p.moveX = mx / ml;
      p.moveY = my / ml;
    } else {
      p.moveX = 0;
      p.moveY = 0;
    }
    p.x = clamp(p.x, ARENA.x + p.r, ARENA.x + ARENA.w - p.r);
    p.y = clamp(p.y, ARENA.y + p.r, ARENA.y + ARENA.h - p.r);

    // 请求冲刺
    if (input.dash) {
      input.dash = false;
      tryDash(g);
    }
  }

  // 回血
  if (p.stats.hpRegen > 0 && p.hp > 0 && p.hp < p.stats.maxHp) {
    p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.hpRegen * dt);
  }

  // 刷怪
  if (g.waveConfig && g.spawned < g.waveConfig.count) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      const cfg = g.waveConfig;
      g.spawnTimer = cfg.spawnRate * (0.7 + g.rng() * 0.6);
      let type = cfg.pool[Math.floor(g.rng() * cfg.pool.length)];
      if (cfg.elite && g.spawned >= cfg.count - cfg.elite && type !== 'boss') {
        type = 'elite';
      }
      if (cfg.boss && g.spawned === 0) type = 'boss';
      const pos = spawnEdgePos(ARENA, g.rng);
      g.enemies.push(makeEnemy(type, pos.x, pos.y, enemyScale(g)));
      const e = g.enemies[g.enemies.length - 1];
      e.damage *= (g.difficulty && g.difficulty.enemyDmg) || 1;
      e.speed *= (g.difficulty && g.difficulty.enemySpeed) || 1;
      g.spawned++;
    }
  }

  updateWeapons(g, dt);
  updateEnemies(g, dt);
  updateBullets(g, dt);
  updatePickups(g, dt);
  updateFx(g, dt);
  updateCamera(g, dt);

  // 波次结束：全部刷完且清空敌人立刻结算，不必等倒计时
  const living = g.enemies.filter(e => !e.dead).length;
  const allSpawned = !g.waveConfig || g.spawned >= (g.waveConfig.count || 0);
  if (allSpawned && living === 0) {
    for (const item of g.pickups) {
      if (item.kind === 'mat') p.materials += item.value;
      else if (item.kind === 'xp') addXp(g, item.value, true);
      else if (item.kind === 'heal') p.hp = Math.min(p.stats.maxHp, p.hp + item.value);
    }
    g.pickups.length = 0;
    const bonus = Math.round(3 + g.wave * 2 + p.stats.harvesting * 0.2);
    p.materials += bonus;
    g.floats.push(makeFloatText(p.x, p.y - 28, `波次奖励 +${bonus}◈`, '#e8a838', 14));
    if (g.wave >= 20) {
      g.state = 'victory';
      Sfx.win();
    } else {
      if (g.pendingLevelUps > 0) {
        g.pendingShop = true;
        openLevelup(g);
      } else {
        g.state = 'shop';
        generateShop(g);
        Sfx.wave();
      }
    }
  }

  if (p.hp <= 0 && g.state === 'playing') {
    p.hp = 0;
    g.state = 'gameover';
    Sfx.lose();
  }
}

function updateWeapons(g, dt) {
  const p = g.player;
  const asMul = 1 + p.stats.attackSpeed / 100;
  const rangeMul = 1 + p.stats.range / 100;
  const n = p.weapons.length;
  for (let i = 0; i < n; i++) {
    const w = p.weapons[i];
    const baseAngle = (i / Math.max(1, n)) * Math.PI * 2;
    w.angle = baseAngle;
    if (w.recoil > 0) w.recoil = Math.max(0, w.recoil - dt * 6);

    let target = null;
    let best = Infinity;
    const wx = p.x + Math.cos(baseAngle) * 18;
    const wy = p.y + Math.sin(baseAngle) * 10;
    const range = w.def.range * rangeMul * (1 + (w.level - 1) * 0.08);
    for (const e of g.enemies) {
      if (e.spawnAnim > 0) continue;
      const d = dist({ x: wx, y: wy }, e);
      if (d < best && d < range) { best = d; target = e; }
    }

    w.cd -= dt * asMul;
    if (w.fireAnim > 0) w.fireAnim -= dt * 4;

    if (target) {
      const aim = Math.atan2(target.y - wy, target.x - wx);
      // 平滑转向
      let da = aim - w.aimAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      w.aimAngle += da * Math.min(1, dt * 10);
    }

    if (target && w.cd <= 0) {
      w.cd = w.def.cooldown * (1 + (w.level - 1) * 0.04);
      w.fireAnim = 1;
      w.recoil = 1;
      fireWeapon(g, w, wx, wy, target, rangeMul);
    }
  }
}

function rollDamage(g, base) {
  const p = g.player;
  const dmul = (g.difficulty && g.difficulty.playerDmgMul) || 1;
  let dmg = base * (1 + p.stats.damage / 100) * dmul;
  let crit = false;
  if (g.rng() * 100 < p.stats.critChance) {
    dmg *= p.stats.critMult;
    crit = true;
  }
  return { dmg, crit };
}

function fireWeapon(g, w, wx, wy, target, rangeMul) {
  const def = w.def;
  const levelMul = 1 + (w.level - 1) * 0.25;
  const aim = Math.atan2(target.y - wy, target.x - wx);
  w.aimAngle = aim;
  Sfx.shoot(def.id);

  if (def.melee) {
    const range = def.range * rangeMul * (1 + (w.level - 1) * 0.1);
    for (const e of g.enemies) {
      const d = dist({ x: wx, y: wy }, e);
      if (d < range + e.r) {
        const ang = Math.atan2(e.y - wy, e.x - wx);
        let da = ang - aim;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.9) {
          const { dmg, crit } = rollDamage(g, def.damage * levelMul);
          damageEnemy(g, e, dmg, crit, aim, def.knockback);
        }
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = aim + (g.rng() - 0.5) * 1.2;
      g.particles.push(makeParticle(wx, wy, Math.cos(a) * 100, Math.sin(a) * 100, 0.18, def.color, 3));
    }
    // muzzle flash
    g.particles.push(makeParticle(wx + Math.cos(aim) * 12, wy + Math.sin(aim) * 12, 0, 0, 0.08, '#fff8d0', 6));
    return;
  }

  const count = def.bullets;
  for (let i = 0; i < count; i++) {
    const spread = (g.rng() - 0.5) * 2 * def.spread;
    const a = aim + spread;
    const speed = def.speed;
    const { dmg, crit } = rollDamage(g, def.damage * levelMul);
    const b = makeBullet(wx, wy, Math.cos(a) * speed, Math.sin(a) * speed, dmg, {
      size: def.bulletSize,
      pierce: def.pierce,
      color: def.color,
      life: (def.range * rangeMul) / Math.max(1, speed) + 0.1,
      homing: !!def.homing,
      aoe: def.aoe || 0,
      knockback: def.knockback,
    });
    b.crit = crit;
    g.bullets.push(b);
  }
  // muzzle flash
  g.particles.push(makeParticle(wx + Math.cos(aim) * 10, wy + Math.sin(aim) * 10, Math.cos(aim) * 40, Math.sin(aim) * 40, 0.07, def.color, 5));
}

function damageEnemy(g, e, dmg, crit, angle = 0, kb = 0) {
  if (e.dead) return;
  e.hp -= dmg;
  e.hitFlash = 0.16;
  if (crit) g.hitStop = Math.max(g.hitStop, 0.04);
  if (kb) {
    e.vx += Math.cos(angle) * kb;
    e.vy += Math.sin(angle) * kb;
    e.kb = 0.15;
  }
  g.player.damageDealt += dmg;
  const col = crit ? '#ffe060' : '#fff';
  g.floats.push(makeFloatText(e.x, e.y - e.r - 4, Math.round(dmg) + (crit ? '!' : ''), col, crit ? 14 : 11));
  for (let i = 0; i < (crit ? 6 : 3); i++) {
    g.particles.push(makeParticle(e.x, e.y, (g.rng() - 0.5) * 100, (g.rng() - 0.5) * 100, 0.25, e.color, 2));
  }

  if (e.hp <= 0) {
    e.dead = true;
    e.dying = e.boss ? 0.55 : 0.32;
    const p = g.player;
    p.kills++;
    p.killStreak++;
    p.streakTimer = 2.5;
    g.score += Math.round(e.maxHp);
    Sfx.kill(p.killStreak);

    // 吸血牙
    const ls = p.passives.lifesteal || 0;
    if (ls > 0 && p.hp < p.stats.maxHp) {
      p.hp = Math.min(p.stats.maxHp, p.hp + ls);
      g.floats.push(makeFloatText(p.x, p.y - 22, `+${ls}`, '#7bc96f', 11));
    }

    const luckBonus = p.stats.luck / 100;
    const matMulD = (g.difficulty && g.difficulty.matMul) || 1;
    const xpMulD = (g.difficulty && g.difficulty.xpMul) || 1;
    // 掉落物夹在场地内，保证能捡到
    const drop = clampToArena(e.x, e.y, 12);
    if (g.rng() < 0.9 + luckBonus * 0.08) {
      const matVal = Math.max(1, Math.round(e.mat * (1 + p.stats.harvesting / 100) * matMulD));
      g.pickups.push(makePickup(drop.x, drop.y, 'mat', matVal));
    }
    // 赏金令
    const bounty = p.passives.bounty || 0;
    if (bounty > 0) {
      const bv = Math.round(bounty * (1 + p.stats.harvesting / 100) * matMulD);
      const bdrop = clampToArena(drop.x + 8, drop.y, 12);
      g.pickups.push(makePickup(bdrop.x, bdrop.y, 'mat', bv));
    }
    const xdrop = clampToArena(drop.x + (g.rng() - 0.5) * 10, drop.y + (g.rng() - 0.5) * 10, 12);
    g.pickups.push(makePickup(xdrop.x, xdrop.y, 'xp', Math.max(1, Math.round(e.xp * xpMulD))));
    if (g.rng() < 0.03 + luckBonus * 0.05) {
      g.pickups.push(makePickup(drop.x, drop.y, 'heal', 2));
    }
    for (let i = 0; i < (e.boss ? 20 : e.elite ? 12 : 8); i++) {
      const a = g.rng() * Math.PI * 2;
      const sp = 40 + g.rng() * 100;
      g.particles.push(makeParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35, e.color, 3));
    }
    if (e.boss) {
      g.shake = 14;
      g.hitStop = 0.12;
    } else if (e.elite) g.shake = Math.max(g.shake, 6);
  }
}

function damagePlayer(g, amount) {
  const p = g.player;
  if (p.invuln > 0 || g.state !== 'playing') return;
  if (g.rng() * 100 < p.stats.dodge) {
    g.floats.push(makeFloatText(p.x, p.y - 20, '闪避', '#6fd3c8', 12));
    return;
  }
  const armor = p.stats.armor;
  const reduced = amount * (100 / (100 + armor));
  p.hp -= reduced;
  p.invuln = 0.5;
  g.shake = 6;
  g.flash = 0.35;
  Sfx.hurt();
  g.floats.push(makeFloatText(p.x, p.y - 22, '-' + Math.round(reduced), '#ff6060', 13));
  for (let i = 0; i < 6; i++) {
    const a = g.rng() * Math.PI * 2;
    g.particles.push(makeParticle(p.x, p.y, Math.cos(a) * 60, Math.sin(a) * 60, 0.3, '#e85a5a', 3));
  }
  if (p.hp <= 0) {
    if (p.revive && !p.revived) {
      p.revived = true;
      p.hp = Math.ceil(p.stats.maxHp * 0.5);
      p.invuln = 1.5;
      g.shake = 10;
      g.floats.push(makeFloatText(p.x, p.y - 30, '复活！', '#7bc96f', 16));
      Sfx.levelup();
      for (let i = 0; i < 20; i++) {
        const a = g.rng() * Math.PI * 2;
        g.particles.push(makeParticle(p.x, p.y, Math.cos(a) * 120, Math.sin(a) * 120, 0.5, '#7bc96f', 3));
      }
    } else {
      p.hp = 0;
      g.state = 'gameover';
      Sfx.lose();
    }
  }
}

function updateEnemies(g, dt) {
  const p = g.player;
  for (const e of g.enemies) {
    if (e.dead) {
      if (e.dying > 0) e.dying = Math.max(0, e.dying - dt);
      continue;
    }
    e.animT += dt * 8;
    e.idleT += dt;
    if (e.windup > 0) e.windup = Math.max(0, e.windup - dt);
    if (e.lunge > 0) e.lunge = Math.max(0, e.lunge - dt * 4);
    if (e.squash > 0) e.squash = Math.max(0, e.squash - dt * 5);
    if (e.spawnAnim > 0) {
      e.spawnAnim -= dt;
      continue;
    }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.kb > 0) {
      e.kb -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.85;
      e.vy *= 0.85;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let mvx = 0, mvy = 0;

    // 射手保持距离
    if (e.shootRange && !e.boss) {
      e.shootTimer -= dt;
      const ideal = e.shootRange * 0.7;
      if (d > ideal + 20) {
        mvx = dx / d; mvy = dy / d;
      } else if (d < ideal - 30) {
        mvx = -dx / d * 0.7; mvy = -dy / d * 0.7;
      } else {
        mvx = -dy / d * 0.4; mvy = dx / d * 0.4;
      }
      // 开火前摇
      if (e.shootTimer < 0.35 && e.shootTimer > 0 && d < e.shootRange) e.windup = e.shootTimer;
      if (e.shootTimer <= 0 && d < e.shootRange) {
        e.shootTimer = e.shootCooldown;
        e.squash = 1;
        const a = Math.atan2(dy, dx);
        g.bullets.push(makeEnemyBullet(e.x, e.y, Math.cos(a) * e.bulletSpeed, Math.sin(a) * e.bulletSpeed, e.damage, { color: e.color }));
      }
    } else if (e.boss) {
      mvx = dx / d; mvy = dy / d;
      e.shootTimer -= dt;
      if (e.shootTimer < 0.5 && e.shootTimer > 0) e.windup = e.shootTimer;
      if (e.shootTimer <= 0) {
        e.shootTimer = e.shootCooldown;
        e.squash = 1.2;
        e.lunge = 1;
        g.shake = Math.max(g.shake, 8);
        const base = Math.atan2(dy, dx);
        for (let i = 0; i < 8; i++) {
          const a = base + (i / 8) * Math.PI * 2;
          g.bullets.push(makeEnemyBullet(e.x, e.y, Math.cos(a) * 160, Math.sin(a) * 160, e.damage * 0.6, { color: '#e04060', size: 5 }));
        }
      }
    } else {
      mvx = dx / d; mvy = dy / d;
      // 疾行者偶尔小跳
      if (e.type === 'runner' && e.lunge <= 0 && g.rng() < dt * 0.8) {
        e.lunge = 0.6;
      }
    }

    const moveMul = 1 + (e.lunge > 0 ? 0.55 : 0);
    e.x += mvx * e.speed * moveMul * dt;
    e.y += mvy * e.speed * moveMul * dt;
    if (mvx || mvy) {
      e.faceX = mvx;
      e.faceY = mvy;
      e.animT += dt * 4 * (moveMul - 0.5);
    }

    e.x = clamp(e.x, ARENA.x + e.r, ARENA.x + ARENA.w - e.r);
    e.y = clamp(e.y, ARENA.y + e.r, ARENA.y + ARENA.h - e.r);

    if (e.touchDamage && dist(e, p) < e.r + p.r) {
      damagePlayer(g, e.damage);
    }

    for (const o of g.enemies) {
      if (o === e || o.dead) continue;
      const ddx = e.x - o.x;
      const ddy = e.y - o.y;
      const dd = Math.hypot(ddx, ddy) || 1;
      const minD = e.r + o.r;
      if (dd < minD) {
        const push = (minD - dd) * 0.5;
        e.x += (ddx / dd) * push * dt * 8;
        e.y += (ddy / dd) * push * dt * 8;
      }
    }
  }
  // 保留死亡动画一段时间再移除
  g.enemies = g.enemies.filter(e => !e.dead || e.dying > 0);
}

function updateBullets(g, dt) {
  const p = g.player;
  for (const b of g.bullets) {
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }

    if (b.homing) {
      let target = null;
      let best = 120;
      for (const e of g.enemies) {
        const d = dist(b, e);
        if (d < best) { best = d; target = e; }
      }
      if (target) {
        const a = Math.atan2(target.y - b.y, target.x - b.x);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx += (Math.cos(a) * sp - b.vx) * 4 * dt;
        b.vy += (Math.sin(a) * sp - b.vy) * 4 * dt;
      }
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // 出界
    if (b.x < ARENA.x - 40 || b.x > ARENA.x + ARENA.w + 40 ||
        b.y < ARENA.y - 40 || b.y > ARENA.y + ARENA.h + 40) {
      b.dead = true;
      continue;
    }

    if (b.fromPlayer) {
      for (const e of g.enemies) {
        if (e.dead || b.hitIds.has(e.id)) continue;
        if (dist(b, e) < b.r + e.r) {
          b.hitIds.add(e.id);
          const ang = Math.atan2(b.vy, b.vx);
          damageEnemy(g, e, b.damage, b.crit, ang, b.knockback);
          Sfx.hit();
          if (b.aoe) {
            for (const oe of g.enemies) {
              if (oe.dead || oe === e) continue;
              if (dist(e, oe) < b.aoe) {
                damageEnemy(g, oe, b.damage * 0.6, false, ang, b.knockback * 0.5);
              }
            }
            for (let i = 0; i < 12; i++) {
              const a = g.rng() * Math.PI * 2;
              g.particles.push(makeParticle(e.x, e.y, Math.cos(a) * 120, Math.sin(a) * 120, 0.3, '#e87030', 3));
            }
            g.shake = Math.max(g.shake, 4);
          }
          if (b.pierce > 0) b.pierce--;
          else { b.dead = true; break; }
        }
      }
    } else {
      // 敌方子弹打玩家
      if (dist(b, p) < b.r + p.r) {
        damagePlayer(g, b.damage);
        b.dead = true;
      }
    }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
}

function updatePickups(g, dt) {
  const p = g.player;
  const pickupR = 120 * (1 + p.stats.pickupRange / 100);
  for (const item of g.pickups) {
    item.bob += dt * 4;
    // 兜底：任何在场外的掉落拉回场内
    if (item.x < ARENA.x + 6 || item.x > ARENA.x + ARENA.w - 6 ||
        item.y < ARENA.y + 6 || item.y > ARENA.y + ARENA.h - 6) {
      const c = clampToArena(item.x, item.y, 10);
      item.x = c.x;
      item.y = c.y;
    }
    const d = dist(item, p);
    if (d < pickupR) item.magnet = true;
    if (item.magnet) {
      const dx = p.x - item.x;
      const dy = p.y - item.y;
      const dd = Math.hypot(dx, dy) || 1;
      const sp = 220 + Math.max(0, 200 - dd);
      item.x += (dx / dd) * sp * dt;
      item.y += (dy / dd) * sp * dt;
    }
    if (d < p.r + item.r + 4) {
      item.dead = true;
      if (item.kind === 'mat') {
        p.materials += item.value;
        Sfx.pickup();
      } else if (item.kind === 'xp') {
        addXp(g, item.value);
        Sfx.pickup();
      } else if (item.kind === 'heal') {
        p.hp = Math.min(p.stats.maxHp, p.hp + item.value);
        g.floats.push(makeFloatText(p.x, p.y - 20, '+' + item.value, '#7bc96f', 12));
        Sfx.pickup();
      }
    }
  }
  g.pickups = g.pickups.filter(i => !i.dead);
}

function addXp(g, amount, silent = false) {
  const p = g.player;
  p.xp += amount;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level++;
    p.xpNeed = Math.floor(6 + p.level * 5);
    g.pendingLevelUps++;
  }
  if (!silent && g.pendingLevelUps > 0 && g.state === 'playing') {
    openLevelup(g);
  }
}

function openLevelup(g) {
  g.state = 'levelup';
  g.upgradeChoices = rollUpgrades(g, 4);
  Sfx.levelup();
}

function rollUpgrades(g, n) {
  const pool = UPGRADES.slice();
  const picks = [];
  for (let i = 0; i < n && pool.length; i++) {
    const u = pickWeighted(pool, g.rng, x => x.weight);
    picks.push(u);
    pool.splice(pool.indexOf(u), 1);
  }
  return picks;
}

function applyUpgrade(g, upgrade) {
  upgrade.apply(g.player.stats);
  if (g.player.hp > g.player.stats.maxHp) g.player.hp = g.player.stats.maxHp;
  g.pendingLevelUps--;
  if (g.pendingLevelUps > 0) {
    g.upgradeChoices = rollUpgrades(g, 4);
  } else if (g.pendingShop) {
    g.pendingShop = false;
    g.state = 'shop';
    generateShop(g);
    Sfx.wave();
  } else {
    g.state = 'playing';
  }
}

function rollShopItem(g) {
  const p = g.player;
  const ownedIds = new Set(p.weapons.map(w => w.def.id));
  const kindRoll = g.rng();
  if (kindRoll < 0.4) {
    const wids = Object.keys(WEAPONS);
    const pick = wids[Math.floor(g.rng() * wids.length)];
    const def = WEAPONS[pick];
    let rarity = def.rarity;
    if (g.rng() < p.stats.luck / 200) {
      const idx = RARITY_ORDER.indexOf(rarity);
      rarity = RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, idx + 1)];
    }
    const owned = ownedIds.has(pick);
    const full = p.weapons.length >= 6;
    let hint = '';
    if (owned && !full) hint = '已持有 · 再购多一件';
    else if (owned && full) hint = '已持有 · 将升级该武器';
    else if (full) hint = '槽位已满 · 随机升级一件';
    return {
      kind: 'weapon',
      id: pick,
      name: def.name,
      icon: def.icon,
      desc: def.desc + (hint ? `\n${hint}` : ''),
      rarity,
      price: Math.round(def.price * (1 + (g.wave - 1) * 0.06)),
      weapon: def,
      owned,
      locked: false,
      sold: false,
    };
  }
  if (kindRoll < 0.62) {
    const u = pickWeighted(UPGRADES, g.rng, x => x.weight);
    return {
      kind: 'upgrade',
      id: u.id,
      name: u.name,
      icon: u.icon,
      desc: u.desc,
      rarity: 'common',
      price: 8 + g.wave + Math.floor(g.rng() * 6),
      upgrade: u,
      locked: false,
      sold: false,
    };
  }
  if (kindRoll < 0.82) {
    const c = CONSUMABLES[Math.floor(g.rng() * CONSUMABLES.length)];
    return {
      kind: 'consumable',
      id: c.id,
      name: c.name,
      icon: c.icon,
      desc: c.desc,
      rarity: c.rarity,
      price: c.price,
      consumable: c,
      locked: false,
      sold: false,
    };
  }
  const ps = PASSIVES[Math.floor(g.rng() * PASSIVES.length)];
  return {
    kind: 'passive',
    id: ps.id,
    name: ps.name,
    icon: ps.icon,
    desc: ps.desc,
    rarity: ps.rarity,
    price: Math.round(ps.price * (1 + (g.wave - 1) * 0.06)),
    passive: ps,
    locked: false,
    sold: false,
  };
}

function generateShop(g, _unused) {
  const p = g.player;
  const slots = 4 + (g.rng() < 0.3 + p.stats.luck / 200 ? 1 : 0);
  const items = [];
  // 锁定且未购买的商品跨「重铸」和「下一波」都保留
  const prev = g.shopItems || [];
  for (const old of prev) {
    if (old && old.locked && !old.sold) items.push(old);
  }
  while (items.length < slots) items.push(rollShopItem(g));
  g.shopItems = items;
  g.rerollCost = 5 + g.wave;
}

function toggleShopLock(g, idx) {
  const item = g.shopItems[idx];
  if (!item || item.sold) return false;
  item.locked = !item.locked;
  Sfx.buy();
  return true;
}

function buyShopItem(g, idx) {
  const item = g.shopItems[idx];
  if (!item || item.sold) return false;
  const p = g.player;
  if (p.materials < item.price) {
    Sfx.deny();
    return false;
  }
  p.materials -= item.price;
  item.sold = true;
  item.locked = false;
  Sfx.buy();

  if (item.kind === 'weapon') {
    if (p.weapons.length < 6) {
      p.weapons.push(makeWeapon(item.weapon));
    } else {
      const same = p.weapons.find(w => w.def.id === item.weapon.id);
      if (same) same.level++;
      else p.weapons[Math.floor(g.rng() * p.weapons.length)].level++;
    }
  } else if (item.kind === 'upgrade') {
    item.upgrade.apply(p.stats);
    if (p.hp > p.stats.maxHp) p.hp = p.stats.maxHp;
  } else if (item.kind === 'passive') {
    item.passive.apply(p);
    if (p.hp > p.stats.maxHp) p.hp = p.stats.maxHp;
  } else if (item.kind === 'consumable') {
    item.consumable.use(g);
  }
  return true;
}

function rerollShop(g) {
  const p = g.player;
  if (p.materials < g.rerollCost) {
    Sfx.deny();
    return false;
  }
  p.materials -= g.rerollCost;
  g.rerollCost += 3;
  const oldCost = g.rerollCost;
  // 只刷新未锁定的商品
  generateShop(g, g.shopItems);
  g.rerollCost = oldCost;
  Sfx.buy();
  return true;
}

function updateFx(g, dt) {
  for (const p of g.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
  }
  g.particles = g.particles.filter(p => p.life > 0);

  for (const f of g.floats) {
    f.life -= dt;
    f.y += f.vy * dt;
  }
  g.floats = g.floats.filter(f => f.life > 0);
}

function nextWave(g) {
  g.wave++;
  startWave(g);
}
