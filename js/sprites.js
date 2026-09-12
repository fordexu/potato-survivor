// ===== 外部像素素材加载（Kenney CC0 + AI 生成土豆）=====
const SpriteAssets = {
  ready: false,
  images: {},
  failed: {},
};

const SPRITE_MANIFEST = {
  // 玩家
  'char:well-rounded': 'assets/game/p_well.png',
  'char:brawler': 'assets/game/p_brawler.png',
  'char:sniper': 'assets/game/p_sniper.png',
  'char:engineer': 'assets/game/p_engineer.png',
  'char:ghost': 'assets/game/p_ghost.png',
  'char:farmer': 'assets/game/p_farmer.png',
  'char:zombie': 'assets/game/mob_zombie.png',
  'char:gambler': 'assets/game/hero_rogue.png',
  // 敌人
  'enemy:runner': 'assets/game/mob_bat.png',
  'enemy:grunt': 'assets/game/mob_zombie.png',
  'enemy:tank': 'assets/game/mob_knight.png',
  'enemy:shooter': 'assets/game/mob_spider.png',
  'enemy:swarm': 'assets/game/mob_bat.png',
  'enemy:elite': 'assets/game/mob_beast.png',
  'enemy:boss': 'assets/game/mob_red.png',
  // 地板
  'floor:a': 'assets/game/floor_a.png',
  'floor:b': 'assets/game/floor_b.png',
};

function loadSpriteAssets(onProgress) {
  const keys = Object.keys(SPRITE_MANIFEST);
  let done = 0;
  return Promise.all(keys.map((key) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      SpriteAssets.images[key] = img;
      done++;
      if (onProgress) onProgress(done, keys.length);
      resolve();
    };
    img.onerror = () => {
      SpriteAssets.failed[key] = true;
      done++;
      if (onProgress) onProgress(done, keys.length);
      resolve();
    };
    img.src = SPRITE_MANIFEST[key];
  }))).then(() => {
    SpriteAssets.ready = true;
    return SpriteAssets;
  });
}

function getSpriteImg(key) {
  return SpriteAssets.images[key] || null;
}

function drawSpriteImg(ctx2, key, x, y, dw, dh) {
  const img = getSpriteImg(key);
  if (!img || !img.width) return false;
  ctx2.imageSmoothingEnabled = false;
  ctx2.drawImage(img, Math.round(x - dw / 2), Math.round(y - dh / 2), dw, dh);
  return true;
}
