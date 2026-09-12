// ===== UI 与渲染 =====

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function renderCharacterSelect() {
  // 难度
  const dlist = $('diff-list');
  if (dlist) {
    dlist.innerHTML = '';
    DIFFICULTIES.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'diff-card' + (selectedDifficulty === d.id ? ' active' : '');
      el.innerHTML = `
        <div class="diff-icon">${d.icon}</div>
        <div class="diff-name">${d.name}</div>
        <div class="diff-desc">${d.desc}</div>
      `;
      el.onclick = () => {
        selectedDifficulty = d.id;
        saveSetting('ps_diff', d.id);
        renderCharacterSelect();
      };
      dlist.appendChild(el);
    });
  }

  const list = $('char-list');
  list.innerHTML = '';
  const STAT_LABELS = [
    ['maxHp', '生命'], ['damage', '伤害'], ['attackSpeed', '攻速'],
    ['critChance', '暴击'], ['speed', '移速'], ['harvesting', '收获'],
    ['armor', '护甲'], ['luck', '幸运'],
  ];
  for (const c of CHARACTERS) {
    const el = document.createElement('div');
    el.className = 'char-card';
    const w = WEAPONS[c.startWeapons[0]];
    const buffs = STAT_LABELS
      .filter(([k]) => (c.stats[k] || 0) !== 0)
      .slice(0, 6)
      .map(([k, label]) => {
        const v = c.stats[k];
        const col = v > 0 ? '#7bc96f' : '#e85a5a';
        return `<span style="color:${col}">${label}${v > 0 ? '+' : ''}${v}</span>`;
      }).join(' · ');
    el.innerHTML = `
      <div class="icon">${c.icon}</div>
      <div class="name">${c.name}</div>
      <div class="desc">${c.desc}</div>
      <div class="weapon-tag">${w ? w.icon + ' ' + w.name : ''}</div>
      <div class="buffs">${buffs}</div>
    `;
    el.onclick = () => onCharPicked(c);
    list.appendChild(el);
  }
}

function renderLevelup(g) {
  const list = $('upgrade-list');
  list.innerHTML = '';
  g.upgradeChoices.forEach((u, i) => {
    const el = document.createElement('div');
    el.className = 'card rarity-common';
    el.innerHTML = `
      <div class="card-icon">${u.icon}</div>
      <div class="card-name">${u.name}</div>
      <div class="card-desc">${u.desc}</div>
      <div class="tag">按 ${i + 1} 选择</div>
    `;
    el.onclick = () => onUpgradePicked(i);
    list.appendChild(el);
  });
}

function renderShop(g) {
  $('shop-mat').textContent = g.player.materials;
  $('reroll-cost').textContent = g.rerollCost;
  const nextWave = g.wave + 1;
  const ncfg = getWaveConfig(Math.min(nextWave, 20));
  const types = [...new Set(ncfg.pool)].map(t => ENEMY_TYPES[t]).filter(Boolean);
  $('wave-preview').innerHTML = `下一波：${types.map(t => `<span class="wp-chip" title="${t.name}">${t.name}</span>`).join('')}<span class="lock-hint">锁定后重铸/下一波都会保留</span>`;

  const grid = $('shop-items');
  grid.innerHTML = '';
  g.shopItems.forEach((item, i) => {
    const el = document.createElement('div');
    const sold = item.sold;
    const afford = g.player.materials >= item.price;
    el.className = `card rarity-${item.rarity}`
      + ((sold || !afford) ? ' disabled' : '')
      + (item.locked && !sold ? ' locked' : '');
    let extra = '';
    if (item.kind === 'weapon' && item.weapon) {
      const w = item.weapon;
      const as = (1 / w.cooldown).toFixed(1);
      extra = w.melee
        ? `伤害${w.damage} · ${as}/s · 近战`
        : `伤害${w.damage} · ${as}/s · 射程${w.range}`;
    }
    const kindTag = { weapon: '武器', upgrade: '属性', consumable: '消耗', passive: '被动' }[item.kind] || '';
    el.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${item.icon}</div>
        <button type="button" class="lock-btn ${item.locked ? 'on' : ''}" data-lock="${i}" title="锁定（重铸保留）">${item.locked ? '🔒' : '🔓'}</button>
      </div>
      <div class="card-name">${item.name}${sold ? '（已购）' : ''}${item.locked && !sold ? ' ·已锁' : ''}</div>
      <div class="card-desc">${item.desc.replace(/\n/g, '<br>')}${extra ? `<br><span style="color:#9ab">${extra}</span>` : ''}</div>
      <div class="card-price">${sold ? '—' : item.price + ' ◈'}<span style="float:right;color:#6a5a7a;font-weight:400">${kindTag} ${i + 1}</span></div>
    `;
    if (!sold) {
      el.onclick = (ev) => {
        if (ev && ev.target && ev.target.classList && ev.target.classList.contains('lock-btn')) return;
        onBuy(i);
      };
    }
    grid.appendChild(el);
  });
  if (grid.querySelectorAll) {
    grid.querySelectorAll('.lock-btn').forEach((btn) => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-lock'), 10);
        onToggleLock(idx);
      };
    });
  }
  renderStatsPanel(g);
}

function onToggleLock(i) {
  if (!game || game.state !== 'shop') return;
  if (toggleShopLock(game, i)) renderShop(game);
}

function renderHud(g) {
  const p = g.player;
  const hpPct = Math.max(0, p.hp / p.stats.maxHp * 100);
  $('hp-bar').style.width = hpPct + '%';
  $('hp-text').textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.stats.maxHp)}`;
  $('wave-label').textContent = `波次 ${g.wave}`;
  const t = Math.max(0, Math.ceil(g.waveTime));
  const tl = $('timer-label');
  const remainingSpawn = g.waveConfig ? Math.max(0, g.waveConfig.count - g.spawned) : 0;
  if (remainingSpawn > 0) {
    tl.textContent = `${t}s · 待刷${remainingSpawn}`;
  } else if (g.enemies.length > 0) {
    tl.textContent = `清剿 ${g.enemies.length}`;
  } else {
    tl.textContent = '已清空';
  }
  tl.style.color = t <= 10 && remainingSpawn > 0 ? '#e85a5a' : '';
  $('mat-count').textContent = p.materials;
  const xpPct = p.xp / p.xpNeed * 100;
  $('xp-bar').style.width = xpPct + '%';
  $('xp-text').textContent = `Lv ${p.level}`;

  const slots = $('weapon-slots');
  // 简单重建
  if (slots.children.length !== 6) {
    slots.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div');
      d.className = 'wslot empty';
      slots.appendChild(d);
    }
  }
  for (let i = 0; i < 6; i++) {
    const d = slots.children[i];
    const w = p.weapons[i];
    if (w) {
      d.className = 'wslot';
      d.innerHTML = `${w.def.icon}<span class="lv">+${w.level}</span>`;
      d.title = w.def.name;
    } else {
      d.className = 'wslot empty';
      d.innerHTML = '';
    }
  }
}

function showBanner(wave, sub) {
  $('banner-wave').textContent = wave;
  $('banner-sub').textContent = sub;
  show('wave-banner');
  setTimeout(() => hide('wave-banner'), 1600);
}

function renderStatsPanel(g) {
  const html = buildStatsHtml(g);
  for (const id of ['stats-panel', 'stats-panel-pause', 'stats-panel-tab']) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }
  const ov = $('stats-overlay');
  if (ov && !ov.classList.contains('hidden')) {
    // already updated via stats-panel-tab
  }
}

function buildStatsHtml(g) {
  const s = g.player.stats;
  const rows = [
    ['生命', Math.ceil(g.player.hp) + '/' + Math.ceil(s.maxHp)],
    ['回复', s.hpRegen.toFixed(1) + '/s'],
    ['伤害', (s.damage >= 0 ? '+' : '') + s.damage + '%'],
    ['攻速', (s.attackSpeed >= 0 ? '+' : '') + s.attackSpeed + '%'],
    ['射程', (s.range >= 0 ? '+' : '') + s.range + '%'],
    ['暴击', s.critChance + '% ×' + s.critMult.toFixed(2)],
    ['护甲', s.armor],
    ['移速', (s.speed >= 0 ? '+' : '') + s.speed + '%'],
    ['闪避', s.dodge + '%'],
    ['幸运', s.luck],
    ['收获', s.harvesting],
    ['拾取', (s.pickupRange >= 0 ? '+' : '') + s.pickupRange + '%'],
  ];
  const passives = Object.entries(g.player.passives || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const def = PASSIVES.find(p => p.id === k);
      return def ? `${def.icon}${def.name}×${v}` : k;
    }).join(' ');
  return `
    <div class="stats-title">属性</div>
    <div class="stats-grid">
      ${rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('')}
    </div>
    ${passives ? `<div class="passives-line">被动：${passives}</div>` : ''}
  `;
}

function renderEnd(g, victory) {
  const p = g.player;
  $('end-title').textContent = victory ? '胜利！' : '你倒下了';
  $('end-stats').innerHTML = `
    <div>难度 <span>${(g.difficulty && g.difficulty.name) || '标准'}</span></div>
    <div>到达波次 <span>${g.wave}</span></div>
    <div>击杀 <span>${p.kills}</span></div>
    <div>等级 <span>${p.level}</span></div>
    <div>造成伤害 <span>${Math.round(p.damageDealt)}</span></div>
    <div>剩余材料 <span>${p.materials}</span></div>
    <div>用时 <span>${Math.floor(g.elapsed / 60)}分${Math.floor(g.elapsed % 60)}秒</span></div>
  `;
  show('gameover');
}

// ===== Canvas 绘制 =====

function drawGame(g) {
  if (!g || !g.player) return;
  const w = canvas.width, h = canvas.height;
  try {
    drawGameInner(g, w, h);
  } catch (err) {
    // 最后兜底：保证场上至少能看到玩家
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#141018';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = g.player.color || '#c4a56a';
      ctx.beginPath();
      ctx.arc(g.player.x, g.player.y, g.player.r || 14, 0, Math.PI * 2);
      ctx.fill();
    } catch (_) { /* ignore */ }
  }
}

function drawGameInner(g, w, h) {
  ctx.save();

  // 摄像机
  if (!g.camera) g.camera = { x: g.player.x - w / 2, y: g.player.y - h / 2 };
  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }
  ctx.translate(-Math.round(g.camera.x), -Math.round(g.camera.y));

  // 视口范围（世界坐标）
  const viewX0 = g.camera.x - 40;
  const viewY0 = g.camera.y - 40;
  const viewX1 = g.camera.x + w + 40;
  const viewY1 = g.camera.y + h + 40;

  ctx.fillStyle = '#141018';
  ctx.fillRect(viewX0, viewY0, viewX1 - viewX0, viewY1 - viewY0);

  // 地板：只画视口内
  const floorA = getSpriteImg('floor:a');
  const floorB = getSpriteImg('floor:b');
  const ts = 48;
  const x0 = Math.max(ARENA.x, Math.floor(viewX0 / ts) * ts);
  const y0 = Math.max(ARENA.y, Math.floor(viewY0 / ts) * ts);
  const x1 = Math.min(ARENA.x + ARENA.w, viewX1);
  const y1 = Math.min(ARENA.y + ARENA.h, viewY1);

  if (floorA && floorA.width) {
    ctx.imageSmoothingEnabled = false;
    for (let y = y0; y < y1; y += ts) {
      for (let x = x0; x < x1; x += ts) {
        const ix = ((x - ARENA.x) / ts) | 0;
        const iy = ((y - ARENA.y) / ts) | 0;
        const useB = floorB && ((ix * 3 + iy * 5) % 7 === 0);
        ctx.drawImage(useB ? floorB : floorA, x, y, ts + 1, ts + 1);
      }
    }
    ctx.fillStyle = 'rgba(18, 14, 28, 0.22)';
    ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  } else {
    ctx.fillStyle = '#2a2234';
    ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  }

  // 外墙
  const wall = 12;
  ctx.fillStyle = '#1a1424';
  ctx.fillRect(ARENA.x - wall, ARENA.y - wall, ARENA.w + wall * 2, wall);
  ctx.fillRect(ARENA.x - wall, ARENA.y + ARENA.h, ARENA.w + wall * 2, wall);
  ctx.fillRect(ARENA.x - wall, ARENA.y, wall, ARENA.h);
  ctx.fillRect(ARENA.x + ARENA.w, ARENA.y, wall, ARENA.h);
  ctx.strokeStyle = '#5a4a6a';
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.x - wall + 1, ARENA.y - wall + 1, ARENA.w + wall * 2 - 2, ARENA.h + wall * 2 - 2);
  ctx.strokeStyle = '#6a5878';
  ctx.lineWidth = 1;
  ctx.strokeRect(ARENA.x + 0.5, ARENA.y + 0.5, ARENA.w - 1, ARENA.h - 1);

  // 暗角（屏幕空间，稍后恢复）
  // 拾取物（视口剔除）
  for (const item of g.pickups) {
    if (item.x < viewX0 || item.x > viewX1 || item.y < viewY0 || item.y > viewY1) continue;
    const bob = Math.sin(item.bob) * 2;
    ctx.beginPath();
    if (item.kind === 'mat') {
      ctx.fillStyle = '#e8a838';
      ctx.moveTo(item.x, item.y - 6 + bob);
      ctx.lineTo(item.x + 5, item.y + bob);
      ctx.lineTo(item.x, item.y + 6 + bob);
      ctx.lineTo(item.x - 5, item.y + bob);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'xp') {
      ctx.fillStyle = '#6fd3c8';
      ctx.fillRect(item.x - 3, item.y - 3 + bob, 6, 6);
    } else {
      ctx.fillStyle = '#7bc96f';
      ctx.fillRect(item.x - 4, item.y - 2 + bob, 8, 4);
      ctx.fillRect(item.x - 2, item.y - 4 + bob, 4, 8);
    }
  }

  for (const b of g.bullets) {
    if (b.x < viewX0 || b.x > viewX1 || b.y < viewY0 || b.y > viewY1) continue;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 冲刺残影
  if (g.ghosts) {
    for (const gh of g.ghosts) {
      const t = gh.life / gh.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.45;
      ctx.translate(gh.x, gh.y);
      ctx.scale(gh.flip * (gh.sx || 1), gh.sy || 1);
      ctx.fillStyle = gh.color || '#c4a56a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  for (const e of g.enemies) {
    if (e.x < viewX0 - 40 || e.x > viewX1 + 40 || e.y < viewY0 - 40 || e.y > viewY1 + 40) continue;
    drawEnemy(e, g);
  }
  drawPlayer(g.player);

  for (const p of g.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const f of g.floats) {
    const a = f.life / f.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // 回到屏幕空间
  ctx.restore();
  ctx.save();

  // 暗角
  const vg = ctx.createRadialGradient(w / 2, h / 2, 240, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(232, 60, 60, ${g.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (g.bossAlert > 0) {
    ctx.fillStyle = `rgba(224, 64, 96, ${g.bossAlert * 0.25})`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8a838';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS 登场 ⚠', w / 2, 80);
  }

  // Boss 血条（屏幕顶）
  const boss = g.enemies.find(e => e.boss);
  if (boss && boss.spawnAnim <= 0) {
    const bw = 420, bh = 14;
    const bx = (w - bw) / 2, by = 16;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#3a2030';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#e04060';
    ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), bh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暴君', w / 2, by + 11);
  }

  // 小地图
  drawMinimap(g, w, h);

  ctx.restore();
}

function drawMinimap(g, w, h) {
  const mw = 140, mh = Math.round(140 * ARENA.h / ARENA.w);
  const mx = w - mw - 14, my = h - mh - 14;
  ctx.fillStyle = 'rgba(10, 8, 16, 0.72)';
  ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  ctx.strokeStyle = '#5a4a6a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 2.5, my - 2.5, mw + 5, mh + 5);
  ctx.fillStyle = '#2a2234';
  ctx.fillRect(mx, my, mw, mh);

  const sx = mw / ARENA.w;
  const sy = mh / ARENA.h;
  // 敌人
  for (const e of g.enemies) {
    ctx.fillStyle = e.boss ? '#e04060' : e.elite ? '#e8a838' : '#c06060';
    ctx.fillRect(mx + (e.x - ARENA.x) * sx - 1, my + (e.y - ARENA.y) * sy - 1, e.boss ? 4 : 2, e.boss ? 4 : 2);
  }
  // 玩家
  const p = g.player;
  ctx.fillStyle = '#9ad0ff';
  ctx.fillRect(mx + (p.x - ARENA.x) * sx - 2, my + (p.y - ARENA.y) * sy - 2, 4, 4);
  // 视口框
  const cam = g.camera || { x: 0, y: 0 };
  ctx.strokeStyle = 'rgba(154,208,255,.7)';
  ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, canvas.width * sx, canvas.height * sy);
}

function drawPlayer(p) {
  const { x, y, r } = p;
  const R = r || 14;
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.7, R * 0.9, R * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.45;

  const bob = p.walkT ? Math.sin(p.walkT) * 1.5 : 0;
  p.idleT = (p.idleT || 0) + 0.016;
  const breathe = Math.sin(p.idleT * 2.2) * 0.8;
  const py = y + bob + (p.moveX || p.moveY ? 0 : breathe * 0.3);
  let size = R * 2.4;
  let sx = 1, sy = 1;
  if (p.dashTime > 0) {
    sx = 1.25; sy = 0.85;
  } else if (p.moveX || p.moveY) {
    sx = 1 + Math.sin(p.walkT * 2) * 0.06;
    sy = 1 - Math.sin(p.walkT * 2) * 0.06;
  } else {
    sx = 1 + breathe * 0.02;
    sy = 1 - breathe * 0.02;
  }
  // 受击后仰
  if (p.invuln > 0 && p.invuln < 0.45) {
    sx *= 1.08; sy *= 0.94;
  }
  const dw = size * sx;
  const dh = size * sy;
  const flip = (p.moveX || p.facing) && Math.cos(p.facing || 0) < -0.15 ? -1 : 1;

  const charKey = 'char:' + (p.charId || 'well-rounded');
  ctx.save();
  ctx.translate(x, py);

  // 脚步（走路时交替）
  if (p.moveX || p.moveY) {
    const step = Math.sin(p.walkT * 2) * 4;
    ctx.fillStyle = 'rgba(40,30,25,0.85)';
    ctx.fillRect(-6 + step, R * 0.55, 5, 4);
    ctx.fillRect(2 - step, R * 0.55, 5, 4);
  } else {
    ctx.fillStyle = 'rgba(40,30,25,0.7)';
    ctx.fillRect(-6, R * 0.55, 5, 3);
    ctx.fillRect(2, R * 0.55, 5, 3);
  }

  ctx.scale(flip, 1);
  if (!drawSpriteImg(ctx, charKey, 0, 0, dw, dh)) {
    ctx.fillStyle = p.color || '#c4a56a';
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.95 * sx, R * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(-5, -4, 3, 4);
    ctx.fillRect(2, -4, 3, 4);
    ctx.fillRect(-2, 3, 4, 2);
  }
  ctx.restore();

  // 冲刺冷却环
  if (p.dashCd > 0) {
    const t = 1 - p.dashCd / 1.2;
    ctx.strokeStyle = 'rgba(154, 208, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, py, R + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(154, 208, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, py, R + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 武器
  const n = p.weapons.length;
  for (let i = 0; i < n; i++) {
    const w = p.weapons[i];
    const aim = w.aimAngle || w.angle || 0;
    const orbit = w.angle || 0;
    const ox = x + Math.cos(orbit) * (R + 10);
    const oy = py + Math.sin(orbit) * (R + 7);
    const rec = (w.recoil || 0) * 5;
    // 开火时武器微旋
    const kickRot = (w.fireAnim > 0 ? -0.15 * w.fireAnim : 0) + Math.sin(p.walkT + i) * 0.03;
    const kx = ox - Math.cos(aim) * rec;
    const ky = oy - Math.sin(aim) * rec;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(aim + kickRot);
    ctx.fillStyle = (w.def && w.def.color) || '#e8d4a0';
    ctx.fillRect(-3, -3, 10, 6);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, -1, 4, 2);
    if (w.fireAnim > 0) {
      ctx.fillStyle = '#fff8d0';
      const fz = 4 + w.fireAnim * 6;
      ctx.fillRect(9, -fz / 2, fz, fz);
    }
    ctx.restore();
  }

  // 近战挥砍弧
  if (p.swing > 0) {
    ctx.strokeStyle = `rgba(255, 240, 180, ${p.swing * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const sw = p.facing || 0;
    ctx.arc(x, py, R + 18, sw - 0.9, sw + 0.9);
    ctx.stroke();
  }

  if (p.killStreak >= 5) {
    ctx.fillStyle = '#ffe060';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.killStreak + ' 连杀', x, py - R - 16);
  }

  ctx.restore();
}

function drawEnemy(e, g) {
  const { x, y, r } = e;

  // 出生：从地面升起 + 扩散环
  if (e.spawnAnim > 0) {
    const t = 1 - e.spawnAnim / 0.45;
    ctx.globalAlpha = Math.min(1, t * 1.4);
    const rise = (1 - t) * 18;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r * 0.9 * t, r * 0.3 * t, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y - rise);
    ctx.scale(0.4 + t * 0.6, 0.4 + t * 0.6);
    drawEnemyBody(e, 0);
    ctx.restore();
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r + (1 - t) * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  // 死亡：压扁淡出
  if (e.dead && e.dying > 0) {
    const t = e.dying / (e.boss ? 0.55 : 0.32);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(x, y);
    ctx.scale(1 + (1 - t) * 0.4, Math.max(0.15, t));
    drawEnemyBody(e, 0);
    ctx.restore();
    return;
  }
  if (e.dead) return;

  // 影子（受击/跳跃时缩小）
  const air = e.lunge > 0 ? Math.sin(e.lunge * Math.PI) * 6 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.85 - air * 0.2, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 走路起伏 / 受击挤压 / 开火前摇鼓包
  const walk = Math.sin(e.animT) * (e.type === 'runner' || e.type === 'swarm' ? 2.2 : 1.2);
  let sx = 1, sy = 1, rot = 0;
  if (e.hitFlash > 0) { sx = 1.15; sy = 0.9; }
  if (e.squash > 0) {
    const s = e.squash;
    sx *= 1 + s * 0.18;
    sy *= 1 - s * 0.12;
  }
  if (e.windup > 0.05) {
    const w = e.windup / 0.35;
    sx *= 1 + w * 0.12;
    sy *= 1 + w * 0.12;
  }
  if (e.lunge > 0) {
    sx *= 1.12; sy *= 0.92;
    rot = Math.atan2(e.faceY, e.faceX) * 0.08;
  }
  // 虫群抖动
  if (e.type === 'swarm') rot += Math.sin(e.animT * 3) * 0.15;

  const flip = e.faceX < -0.2 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y - air + walk);
  ctx.rotate(rot);
  ctx.scale(flip * sx, sy);
  drawEnemyBody(e, e.animT);
  ctx.restore();

  // 开火前摇红圈
  if (e.windup > 0.05) {
    ctx.strokeStyle = `rgba(255,80,80,${0.3 + e.windup})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 4 + e.windup * 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Boss 王冠
  if (e.boss) {
    ctx.fillStyle = '#e8a838';
    ctx.fillRect(x - 10, y - r - 6 - air, 20, 6);
    ctx.fillRect(x - 10, y - r - 10 - air, 4, 5);
    ctx.fillRect(x - 2, y - r - 12 - air, 4, 7);
    ctx.fillRect(x + 6, y - r - 10 - air, 4, 5);
  } else if (e.elite) {
    ctx.strokeStyle = `rgba(232,168,56,${0.4 + Math.sin(e.animT) * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
  }

  if (!e.boss && e.hp < e.maxHp) {
    const bw = r * 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - bw / 2, y - r - 10 - air, bw, 3);
    ctx.fillStyle = '#e85a5a';
    ctx.fillRect(x - bw / 2, y - r - 10 - air, bw * Math.max(0, e.hp / e.maxHp), 3);
  }
}

function drawEnemyBody(e, animT) {
  const r = e.r;
  const col = e.hitFlash > 0 ? '#ffffff' : e.color;
  const eSize = r * 2.3;
  const t = animT || 0;

  if (e.hitFlash <= 0 && drawSpriteImg(ctx, 'enemy:' + (e.type || 'grunt'), 0, 0, eSize, eSize)) {
    // sprite 已画，额外叠类型特效
  } else {
    ctx.fillStyle = col;
    if (e.boss) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.elite) {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'runner' || e.type === 'swarm') {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      const flap = Math.sin(t * 2.5) * r * 0.25;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.3);
      ctx.lineTo(-r * 1.15, -r * 0.9 - flap);
      ctx.lineTo(-r * 0.2, -r * 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 0.3);
      ctx.lineTo(r * 1.15, -r * 0.9 - flap);
      ctx.lineTo(r * 0.2, -r * 0.5);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 蝙蝠/虫翅膀层（即使有 sprite 也叠一点摆动感）
  if ((e.type === 'runner' || e.type === 'swarm') && e.hitFlash <= 0) {
    const flap = Math.sin(t * 3) * 0.35;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.9, -r * 0.2, r * 0.45, r * 0.25 + flap, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.9, -r * 0.2, r * 0.45, r * 0.25 + flap, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 重装脚部踏地
  if (e.type === 'tank' && e.hitFlash <= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const st = Math.sin(t) * 2;
    ctx.fillRect(-r * 0.5 + st, r * 0.55, r * 0.35, r * 0.3);
    ctx.fillRect(r * 0.15 - st, r * 0.55, r * 0.35, r * 0.3);
  }

  if (e.hitFlash > 0) {
    ctx.strokeStyle = '#1a1018';
    ctx.lineWidth = 1.5;
    const s = r * 0.25;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35 - s, -s); ctx.lineTo(-r * 0.35 + s, s);
    ctx.moveTo(-r * 0.35 + s, -s); ctx.lineTo(-r * 0.35 - s, s);
    ctx.moveTo(r * 0.1 - s, -s); ctx.lineTo(r * 0.1 + s, s);
    ctx.moveTo(r * 0.1 + s, -s); ctx.lineTo(r * 0.1 - s, s);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(-r * 0.35, -r * 0.12, r * 0.22, r * 0.28);
    ctx.fillRect(r * 0.12, -r * 0.12, r * 0.22, r * 0.28);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(-r * 0.45, -r * 0.45, r * 0.3, r * 0.2);
  }
}
