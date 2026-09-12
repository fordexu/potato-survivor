// ===== UI 与渲染 =====

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function renderCharacterSelect() {
  const list = $('char-list');
  list.innerHTML = '';
  for (const c of CHARACTERS) {
    const el = document.createElement('div');
    el.className = 'char-card';
    el.innerHTML = `
      <div class="icon">${c.icon}</div>
      <div class="name">${c.name}</div>
      <div class="desc">${c.desc}</div>
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
    el.innerHTML = `
      <div class="card-icon">${item.icon}</div>
      <div class="card-name">${item.name}${sold ? '（已购）' : ''}</div>
      <div class="card-desc">${item.desc}${extra ? `<br><span style="color:#9ab">${extra}</span>` : ''}</div>
      <div class="card-price">${sold ? '—' : item.price + ' ◈'}<span style="float:right;color:#6a5a7a;font-weight:400">${i + 1}</span></div>
    `;
    if (!sold) el.onclick = () => onBuy(i);
    grid.appendChild(el);
  });
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

  // 震屏
  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }

  // 背景
  ctx.fillStyle = '#141018';
  ctx.fillRect(0, 0, w, h);

  // 地板
  ctx.fillStyle = '#1e1826';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

  // 网格
  ctx.strokeStyle = '#2a2233';
  ctx.lineWidth = 1;
  for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA.y);
    ctx.lineTo(x, ARENA.y + ARENA.h);
    ctx.stroke();
  }
  for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(ARENA.x, y);
    ctx.lineTo(ARENA.x + ARENA.w, y);
    ctx.stroke();
  }

  // 边界
  ctx.strokeStyle = '#4a3d55';
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

  // 拾取物
  for (const item of g.pickups) {
    const bob = Math.sin(item.bob) * 2;
    ctx.beginPath();
    if (item.kind === 'mat') {
      ctx.fillStyle = '#e8a838';
      // 菱形
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

  // 子弹
  for (const b of g.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // 拖尾
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 敌人
  for (const e of g.enemies) {
    drawEnemy(e);
  }

  // 玩家
  drawPlayer(g.player);

  // 粒子
  for (const p of g.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // 飘字
  for (const f of g.floats) {
    const a = f.life / f.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // 受伤红闪
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(232, 60, 60, ${g.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

function drawPlayer(p) {
  const { x, y, r } = p;
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 身体（土豆）
  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.4;

  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  const fx = Math.cos(p.facing) * 3;
  const fy = Math.sin(p.facing) * 2;
  ctx.fillStyle = '#2a2030';
  ctx.fillRect(x - 5 + fx * 0.4, y - 4 + fy * 0.3, 3, 4);
  ctx.fillRect(x + 2 + fx * 0.4, y - 4 + fy * 0.3, 3, 4);
  // 嘴
  ctx.fillRect(x - 2 + fx * 0.2, y + 3 + fy * 0.2, 4, 2);

  // 武器指示
  const n = p.weapons.length;
  for (let i = 0; i < n; i++) {
    const w = p.weapons[i];
    const ang = w.angle;
    const ox = x + Math.cos(ang) * (r + 8);
    const oy = y + Math.sin(ang) * (r + 6);
    const kick = w.fireAnim > 0 ? 4 : 0;
    const kx = ox + Math.cos(ang) * kick;
    const ky = oy + Math.sin(ang) * kick;
    ctx.fillStyle = w.def.color;
    ctx.fillRect(kx - 4, ky - 3, 8, 6);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(kx - 1, ky - 1, 3, 2);
  }

  ctx.restore();
}

function drawEnemy(e) {
  const { x, y, r } = e;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  let col = e.color;
  if (e.hitFlash > 0) col = '#ffffff';

  ctx.fillStyle = col;
  if (e.boss) {
    // BOSS 六边形
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // 王冠
    ctx.fillStyle = '#e8a838';
    ctx.fillRect(x - 10, y - r - 6, 20, 6);
    ctx.fillRect(x - 10, y - r - 10, 4, 5);
    ctx.fillRect(x - 2, y - r - 12, 4, 7);
    ctx.fillRect(x + 6, y - r - 10, 4, 5);
  } else if (e.elite) {
    // 菱形精英
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 眼睛
  ctx.fillStyle = '#1a1018';
  ctx.fillRect(x - r * 0.35, y - r * 0.15, r * 0.25, r * 0.3);
  ctx.fillRect(x + r * 0.1, y - r * 0.15, r * 0.25, r * 0.3);

  // 血条
  if (e.hp < e.maxHp) {
    const bw = r * 2;
    const bh = 3;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - bw / 2, y - r - 8, bw, bh);
    ctx.fillStyle = e.boss ? '#e8a838' : '#e85a5a';
    ctx.fillRect(x - bw / 2, y - r - 8, bw * (e.hp / e.maxHp), bh);
  }
}
