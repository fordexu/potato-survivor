// ===== UI 与渲染 =====

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function renderCharacterSelect() {
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
  // 下一波预览
  const nextWave = g.wave + 1;
  const ncfg = getWaveConfig(Math.min(nextWave, 20));
  const types = [...new Set(ncfg.pool)].map(t => ENEMY_TYPES[t]).filter(Boolean);
  $('wave-preview').innerHTML = `下一波：${types.map(t => `<span class="wp-chip" title="${t.name}">${t.name}</span>`).join('')}`;

  const grid = $('shop-items');
  grid.innerHTML = '';
  g.shopItems.forEach((item, i) => {
    const el = document.createElement('div');
    const sold = item.sold;
    const afford = g.player.materials >= item.price;
    el.className = `card rarity-${item.rarity}` + ((sold || !afford) ? ' disabled' : '');
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
      <div class="card-icon">${item.icon}</div>
      <div class="card-name">${item.name}${sold ? '（已购）' : ''}</div>
      <div class="card-desc">${item.desc.replace(/\n/g, '<br>')}${extra ? `<br><span style="color:#9ab">${extra}</span>` : ''}</div>
      <div class="card-price">${sold ? '—' : item.price + ' ◈'}<span style="float:right;color:#6a5a7a;font-weight:400">${kindTag} ${i + 1}</span></div>
    `;
    if (!sold) el.onclick = () => onBuy(i);
    grid.appendChild(el);
  });
  renderStatsPanel(g);
}

function renderHud(g) {
  const p = g.player;
  const hpPct = Math.max(0, p.hp / p.stats.maxHp * 100);
  $('hp-bar').style.width = hpPct + '%';
  $('hp-text').textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.stats.maxHp)}`;
  $('wave-label').textContent = `波次 ${g.wave}`;
  const t = Math.max(0, Math.ceil(g.waveTime));
  const tl = $('timer-label');
  tl.textContent = g.waveConfig && g.spawned < g.waveConfig.count ? `${t}s` : `清剿中 ${t}s`;
  tl.style.color = t <= 10 ? '#e85a5a' : '';
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
  const w = canvas.width, h = canvas.height;
  ctx.save();

  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }

  ctx.fillStyle = '#141018';
  ctx.fillRect(0, 0, w, h);

  // 地板 + 砖纹
  ctx.fillStyle = '#1e1826';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.fillStyle = '#241c2e';
  for (let y = ARENA.y; y < ARENA.y + ARENA.h; y += 20) {
    for (let x = ARENA.x + ((y / 20) % 2 === 0 ? 0 : 10); x < ARENA.x + ARENA.w; x += 20) {
      ctx.fillRect(x, y, 9, 9);
    }
  }

  ctx.strokeStyle = '#2a2233';
  ctx.lineWidth = 1;
  for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, ARENA.y); ctx.lineTo(x, ARENA.y + ARENA.h); ctx.stroke();
  }
  for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 40) {
    ctx.beginPath(); ctx.moveTo(ARENA.x, y); ctx.lineTo(ARENA.x + ARENA.w, y); ctx.stroke();
  }

  ctx.strokeStyle = '#4a3d55';
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

  // 暗角
  const vg = ctx.createRadialGradient(w / 2, h / 2, 180, w / 2, h / 2, 520);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // 拾取物
  for (const item of g.pickups) {
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

  for (const e of g.enemies) drawEnemy(e);
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

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(232, 60, 60, ${g.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Boss 警告
  if (g.bossAlert > 0) {
    ctx.fillStyle = `rgba(224, 64, 96, ${g.bossAlert * 0.25})`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8a838';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS 登场 ⚠', w / 2, 80);
  }

  // Boss 血条
  const boss = g.enemies.find(e => e.boss);
  if (boss && boss.spawnAnim <= 0) {
    const bw = 420, bh = 14;
    const bx = (w - bw) / 2, by = ARENA.y + 10;
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

  ctx.restore();
}

function drawPlayer(p) {
  const { x, y, r } = p;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.4;

  const sprite = getPlayerSprite(p.color);
  // 走路轻微上下
  const bob = (p.walkT && Math.sin(p.walkT) * 1.5) || 0;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height / 2 + bob));

  // 武器
  const n = p.weapons.length;
  for (let i = 0; i < n; i++) {
    const w = p.weapons[i];
    const aim = w.aimAngle || w.angle;
    const orbit = w.angle;
    const ox = x + Math.cos(orbit) * (r + 10);
    const oy = y + Math.sin(orbit) * (r + 7);
    const rec = (w.recoil || 0) * 4;
    const kx = ox - Math.cos(aim) * rec;
    const ky = oy - Math.sin(aim) * rec;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(aim);
    ctx.fillStyle = w.def.color;
    ctx.fillRect(-3, -3, 10, 6);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, -1, 4, 2);
    if (w.fireAnim > 0) {
      ctx.fillStyle = '#fff8d0';
      ctx.fillRect(9, -2, 5, 4);
    }
    ctx.restore();
  }

  // 连杀提示
  if (p.killStreak >= 5) {
    ctx.fillStyle = '#ffe060';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.killStreak} 连杀`, x, y - r - 16);
  }

  ctx.restore();
}

function drawEnemy(e) {
  const { x, y, r } = e;
  if (e.spawnAnim > 0) {
    const t = 1 - e.spawnAnim / 0.45;
    ctx.globalAlpha = t * 0.8;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + (1 - t) * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const col = e.hitFlash > 0 ? '#ffffff' : e.color;
  // 用缓存 sprite 时 hitFlash 需要 tint，这里简单重绘色块
  if (e.hitFlash > 0) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sprite = getEnemySprite(e.type, e.color, Math.round(r));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height / 2));
  }

  if (e.boss) {
    ctx.fillStyle = '#e8a838';
    ctx.fillRect(x - 10, y - r - 6, 20, 6);
    ctx.fillRect(x - 10, y - r - 10, 4, 5);
    ctx.fillRect(x - 2, y - r - 12, 4, 7);
    ctx.fillRect(x + 6, y - r - 10, 4, 5);
  } else if (e.elite) {
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
  }

  if (!e.boss && e.hp < e.maxHp) {
    const bw = r * 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - bw / 2, y - r - 8, bw, 3);
    ctx.fillStyle = '#e85a5a';
    ctx.fillRect(x - bw / 2, y - r - 8, bw * Math.max(0, e.hp / e.maxHp), 3);
  }
}
