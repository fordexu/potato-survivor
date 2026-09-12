// ===== 主循环与状态管理 =====

let game = null;
let selectedChar = null;
let lastTs = 0;
let running = false;

const input = {
  up: false, down: false, left: false, right: false,
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

function onCharPicked(char) {
  selectedChar = char;
  hide('char-select');
  startNewGame(char);
}

function onUpgradePicked(i) {
  if (!game || game.state !== 'levelup') return;
  const u = game.upgradeChoices[i];
  if (!u) return;
  applyUpgrade(game, u);
  hide('levelup');
  if (game.state === 'levelup') {
    renderLevelup(game);
    show('levelup');
  } else if (game.state === 'shop') {
    renderShop(game);
    show('shop');
  }
}

function onBuy(i) {
  if (!game || game.state !== 'shop') return;
  if (buyShopItem(game, i)) {
    renderShop(game);
  }
}

function startNewGame(char) {
  game = createGame(char);
  hide('menu');
  hide('gameover');
  hide('shop');
  hide('levelup');
  show('hud');
  startWave(game);
  showBanner(1, '生存下去！');
  renderHud(game);
  running = true;
  lastTs = performance.now();
}

function goMenu() {
  running = false;
  game = null;
  hide('hud');
  hide('gameover');
  hide('shop');
  hide('levelup');
  hide('wave-banner');
  show('menu');
  drawIdle();
}

function enterShop() {
  if (!game) return;
  game.state = 'shop';
  renderShop(game);
  show('shop');
}

function leaveShop() {
  if (!game) return;
  hide('shop');
  nextWave(game);
  showBanner(game.wave, game.wave === 20 ? '最终决战！' : '准备迎战');
  renderHud(game);
}

function loop(ts) {
  if (!running || !game) {
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if (game.state === 'playing') {
    updatePlaying(game, dt, input);
    // 波次结束进入商店
    if (game.state === 'shop') {
      enterShop();
    } else if (game.state === 'levelup') {
      renderLevelup(game);
      show('levelup');
    } else if (game.state === 'gameover') {
      renderEnd(game, false);
      running = false;
    } else if (game.state === 'victory') {
      renderEnd(game, true);
      running = false;
    }
    renderHud(game);
  }

  drawGame(game);
  requestAnimationFrame(loop);
}

function drawIdle() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#141018';
  ctx.fillRect(0, 0, w, h);
  // 装饰网格
  ctx.strokeStyle = '#1e1826';
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // 居中土豆
  const cx = w / 2, cy = h / 2 + 40;
  ctx.fillStyle = '#c4a56a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 36, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2030';
  ctx.fillRect(cx - 12, cy - 8, 6, 8);
  ctx.fillRect(cx + 6, cy - 8, 6, 8);
  ctx.fillRect(cx - 4, cy + 8, 8, 4);
}

// ===== 事件绑定 =====

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  const dir = KEYMAP[e.code];
  if (dir) input[dir] = true;
  Sfx.unlock();

  if (e.code === 'KeyM') {
    const on = Sfx.toggle();
    // 轻提示
    if (game) game.floats.push({ x: game.player.x, y: game.player.y - 28, text: on ? '音效开' : '音效关', color: '#9ab', size: 12, life: 0.8, maxLife: 0.8, vy: -20 });
  }

  // 数字键
  if (game) {
    if (game.state === 'levelup') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) onUpgradePicked(n - 1);
    } else if (game.state === 'shop') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) onBuy(n - 1);
      if (e.code === 'KeyR') rerollShop(game), renderShop(game);
      if (e.code === 'Space' || e.code === 'Enter') leaveShop();
    }
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) input[dir] = false;
});

window.addEventListener('blur', () => {
  input.up = input.down = input.left = input.right = false;
});

$('btn-start').onclick = () => {
  Sfx.unlock();
  hide('menu');
  renderCharacterSelect();
  show('char-select');
};

$('btn-char-back').onclick = () => {
  hide('char-select');
  show('menu');
};

$('btn-next-wave').onclick = () => leaveShop();
$('btn-reroll').onclick = () => {
  if (game && rerollShop(game)) renderShop(game);
};

$('btn-retry').onclick = () => {
  hide('gameover');
  if (selectedChar) startNewGame(selectedChar);
  else {
    renderCharacterSelect();
    show('char-select');
  }
};

$('btn-menu').onclick = () => goMenu();

// 启动
drawIdle();
show('menu');
requestAnimationFrame(loop);
