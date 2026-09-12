// ===== 轻量 WebAudio 音效 =====
const Sfx = (() => {
  let ctx = null;
  let enabled = true;
  let streak = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'square', vol = 0.05, slide = 0) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.04) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  const SHOOT_FREQ = {
    pistol: 880, smg: 980, shotgun: 420, sniper: 1200, fist: 200,
    flamethrower: 300, rocket: 180, laser: 1400, wand: 700, minigun: 1100,
  };

  return {
    unlock() { ensure(); },
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },
    shoot(weaponId) {
      const f = SHOOT_FREQ[weaponId] || 880;
      tone(f + Math.random() * 80, 0.045, weaponId === 'fist' ? 'triangle' : 'square', 0.022, -f * 0.4);
      if (weaponId === 'shotgun' || weaponId === 'rocket') noise(0.05, 0.03);
    },
    hit() { tone(220, 0.04, 'triangle', 0.03, -80); },
    kill(n) {
      const pitch = 320 + Math.min(10, n || 0) * 28;
      tone(pitch, 0.08, 'square', 0.04, -pitch * 0.5);
      noise(0.05, 0.02);
    },
    hurt() { tone(140, 0.12, 'sawtooth', 0.05, -60); noise(0.08, 0.03); },
    pickup() { tone(660, 0.06, 'sine', 0.03, 220); },
    levelup() {
      tone(523, 0.1, 'square', 0.04, 0);
      setTimeout(() => tone(659, 0.1, 'square', 0.04, 0), 80);
      setTimeout(() => tone(784, 0.14, 'square', 0.04, 0), 160);
    },
    buy() { tone(440, 0.07, 'sine', 0.04, 220); },
    deny() { tone(180, 0.12, 'square', 0.04, -40); },
    wave() {
      tone(392, 0.15, 'triangle', 0.05, 0);
      setTimeout(() => tone(523, 0.2, 'triangle', 0.05, 0), 120);
    },
    boss() {
      tone(80, 0.4, 'sawtooth', 0.07, 20);
      setTimeout(() => tone(60, 0.5, 'sawtooth', 0.06, 10), 200);
      noise(0.3, 0.04);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.05), i * 120));
    },
    lose() {
      [400, 320, 240, 160].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.05), i * 140));
    },
  };
})();
