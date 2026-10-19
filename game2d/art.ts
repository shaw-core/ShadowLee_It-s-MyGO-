// ============================================================
// 漫画分镜的像素插画。每格按「格子数 × 20px」的低分辨率绘制，
// 显示时整数倍放大。ink=true 时转成黑白网点（漫画层）。
// ============================================================
import { Pix, inkRemap, rng, shadeCol } from './pixel';
import { portrait } from './portraits';
import { ArtId } from '../story/cutscenes';

export const CELL = 20;

const fromCanvas = (c: HTMLCanvasElement): Pix => {
  const p = new Pix(c.width, c.height);
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
  p.buf.set(new Uint32Array(d.data.buffer));
  return p;
};

/** 把 src 以整数倍放大贴到 dst（透明像素跳过），可水平翻转、可裁剪到 clipX 左侧 */
const blitS = (dst: Pix, src: Pix, x: number, y: number, s = 1, flip = false, clip?: (dx: number, dy: number) => boolean) => {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
    const v = src.buf[j * src.w + (flip ? src.w - 1 - i : i)];
    if ((v >>> 24) < 128) continue;
    for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) {
      const dx = x + i * s + a, dy = y + j * s + b;
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
      if (clip && !clip(dx, dy)) continue;
      dst.buf[dy * dst.w + dx] = v;
    }
  }
};

const vgrad = (p: Pix, stops: string[], y0 = 0, y1 = p.h) => {
  const toRGB = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const cols = stops.map(toRGB);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < p.w; x++) {
      const k = f > (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? 1 : 0;
      const c = cols[i + k];
      p.px(x, y, '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''));
    }
  }
};

const stars = (p: Pix, n: number, hMax: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * p.w), y = Math.floor(r() * hMax);
    p.px(x, y, r() > 0.8 ? '#fff8d6' : '#c7d2fe');
    if (r() > 0.92) { p.px(x - 1, y, '#8ea0e0'); p.px(x + 1, y, '#8ea0e0'); p.px(x, y - 1, '#8ea0e0'); p.px(x, y + 1, '#8ea0e0'); }
  }
};

const skyline = (p: Pix, base: number, minH: number, maxH: number, col: string, win: string, seed: number, lit = 0.25) => {
  const r = rng(seed);
  let x = -4;
  while (x < p.w) {
    const w = 10 + Math.floor(r() * 16), h = minH + Math.floor(r() * (maxH - minH));
    p.rect(x, base - h, w, h, col);
    if (r() > 0.6) p.rect(x + 2, base - h - 3, 2, 3, col);
    for (let wy = base - h + 3; wy < base - 2; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (r() < lit) p.px(wx, wy, win);
    x += w + Math.floor(r() * 3);
  }
};

const speedLines = (p: Pix, cx: number, cy: number, col: string, n = 40, inner = 18, seed = 5) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, r0 = inner + r() * 12, len = Math.max(p.w, p.h);
    p.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * len, cy + Math.sin(a) * len, col);
  }
};

const painters: Record<ArtId, (w: number, h: number) => Pix> = {
  city_night: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#141a3d', '#2a3170', '#5a4d9a', '#c77fae']);
    stars(p, 60, h * 0.6, 3);
    p.circle(w - 26, 14, 7, '#fff4c8'); p.circle(w - 23, 12, 6, '#2a3170');
    skyline(p, h, 18, 36, '#2c2f5e', '#ffd56b', 7, 0.15);
    skyline(p, h, 8, 24, '#1a1c3a', '#ffe08a', 11, 0.3);
    // 她们的窗：粉色的光
    const wx = Math.floor(w * 0.42), wy = h - 22;
    p.rect(wx - 6, wy - 10, 26, 32, '#1a1c3a');
    p.rect(wx, wy - 4, 9, 7, '#ffd1e6');
    p.rect(wx + 1, wy - 3, 7, 5, '#ffeaf3');
    p.rect(wx + 4, wy - 4, 1, 7, '#1a1c3a');
    p.circle(wx + 6, wy + 1, 1.5, '#5a4d9a');
    for (let i = 0; i < 4; i++) p.px(wx - 2 - i * 2, wy - 6 - i, '#ffd1e6');
    return p;
  },
  dousha_desk: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#dbe8ff', '#eaf1ff', '#f9e8f1']);
    // 墙上串灯
    for (let x = 0; x < w; x++) { const y = 10 + Math.round(Math.sin(x / 14) * 3); p.px(x, y, '#8b7a9e'); if (x % 10 === 0) p.rect(x - 1, y + 1, 2, 3, ['#fde68a', '#fbcfe8', '#bfdbfe'][(x / 10) % 3]); }
    // 屏幕光
    for (let y = h - 46; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 3 === 0 && y > h - 46 + (Math.abs(x - w / 2) / 3)) p.px(x, y, '#cfe3ff');
    const por = fromCanvas(portrait('dousha', 'grin'));
    blitS(p, por, Math.floor(w / 2 - 32), h - 70, 1);
    // 桌面 + 麦克风
    p.rect(0, h - 10, w, 10, '#c48f63'); p.rect(0, h - 10, w, 2, '#e8b98a');
    p.rect(w - 22, h - 34, 2, 24, '#475569'); p.ellipse(w - 21, h - 38, 4, 6, '#2b2f45'); p.rect(w - 24, h - 40, 6, 1, '#64748b');
    // 熊猫玩偶
    p.circle(14, h - 16, 7, '#ffffff'); p.circle(9, h - 22, 2.5, '#2a2a3a'); p.circle(19, h - 22, 2.5, '#2a2a3a');
    p.px(12, h - 17, '#2a2a3a'); p.px(16, h - 17, '#2a2a3a');
    p.outline('#1c1f3b');
    return p;
  },
  danmaku_screen: (w, h) => {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, '#1c1f3b');
    p.rect(4, 4, w - 8, h - 14, '#cfe3ff');
    vgrad(p, ['#bcd6ff', '#e6f0ff'], 4, h - 10);
    p.rect(4, h - 10, w - 8, 6, '#2b2f45');
    const r = rng(9);
    const cols = ['#ffffff', '#f472b6', '#facc15', '#60a5fa', '#a78bfa', '#34d399'];
    for (let y = 8; y < h - 16; y += 5) {
      let x = 6 + Math.floor(r() * 20);
      while (x < w - 10) {
        const l = 8 + Math.floor(r() * 18);
        const c = cols[Math.floor(r() * cols.length)];
        p.rect(x, y, Math.min(l, w - 8 - x), 2, c);
        p.rect(x, y + 2, Math.min(l, w - 8 - x), 1, shadeCol(c === '#ffffff' ? '#94a3b8' : c, 0.6));
        x += l + 6 + Math.floor(r() * 16);
      }
    }
    // 屏幕中央小小的豆沙
    p.rect(w / 2 - 6, h - 30, 12, 14, '#3b6fd8'); p.circle(w / 2, h - 34, 6, '#eef1f8'); p.circle(w / 2 - 5, h - 40, 2, '#2a2a35'); p.circle(w / 2 + 5, h - 40, 2, '#2a2a35');
    return p;
  },
  novus_door: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#3a3352', '#5c4a6e', '#7a5f7d']);
    // 门框（左）和走廊暖光
    p.rect(0, 0, 14, h, '#8a6a4a'); p.rect(12, 0, 2, h, '#5f4530');
    for (let y = 0; y < h; y++) for (let x = 14; x < w; x++) if ((x * 7 + y * 3) % 11 === 0) p.px(x, y, '#8e7397');
    const por = fromCanvas(portrait('novus', 'closed'));
    blitS(p, por, w - 54, h - 74, 1, true, dx => dx > 13);
    // 手里的马克杯
    p.rect(w - 30, h - 14, 9, 10, '#ffffff'); p.rect(w - 21, h - 12, 3, 5, '#ffffff'); p.rect(w - 29, h - 13, 7, 2, '#7c4a2b');
    p.outline('#1c1f3b');
    return p;
  },
  glitch: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#bcd6ff', '#e6f0ff']);
    const r = rng(17);
    for (let y = 0; y < h; y += 1 + Math.floor(r() * 4)) {
      const off = Math.floor((r() - 0.5) * 30);
      const band = 1 + Math.floor(r() * 3);
      for (let j = 0; j < band; j++) for (let x = 0; x < w; x++) {
        const c = (Math.floor((x + off) / 6) + y) % 5 === 0 ? '#1c1f3b' : (x + off) % 9 < 2 ? '#f472b6' : '#93c5fd';
        if (r() > 0.3) p.px(x, y + j, c);
      }
    }
    p.rect(w * 0.2, h * 0.35, w * 0.6, 3, '#ffffff');
    p.rect(w * 0.1, h * 0.62, w * 0.45, 2, '#1c1f3b');
    return p;
  },
  rooftop_door: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#0f1533', '#1c2650', '#34407e']);
    stars(p, 90, h * 0.7, 21);
    skyline(p, h - 8, 6, 20, '#1a2048', '#ffd56b', 4, 0.2);
    // 栏杆
    p.rect(0, h - 14, w, 2, '#64748b');
    for (let x = 2; x < w; x += 8) p.rect(x, h - 14, 1, 10, '#475569');
    p.rect(0, h - 4, w, 4, '#3b4366');
    // 门
    const dx = Math.floor(w / 2 - 9), dy = h - 40;
    for (let rr = 40; rr > 0; rr -= 4) p.ellipse(dx + 9, dy + 18, rr * 1.4, rr, rr > 28 ? '#2f3a72' : rr > 16 ? '#59609a' : '#a3a5d1');
    p.rect(dx - 1, dy - 1, 20, 37, '#cbd5e1');
    p.rect(dx + 1, dy + 1, 16, 35, '#fffbe6');
    p.rect(dx + 7, dy + 1, 4, 35, '#ffffff');
    // 两个小小的背影
    p.rect(dx - 26, h - 14, 5, 9, '#1c1f3b'); p.circle(dx - 23.5, h - 17, 3, '#eef1f8');
    p.rect(dx - 19, h - 14, 5, 9, '#1c1f3b'); p.circle(dx - 16.5, h - 17, 3, '#e07a43');
    p.rect(dx - 21, h - 11, 2, 1, '#1c1f3b');
    return p;
  },
  hands: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#fff4d6', '#ffe0ec']);
    speedLines(p, w / 2, h / 2, '#ffe9b8', 60, 20, 8);
    // 左：蓝色袖子；右：奶油色袖子
    p.poly([[-4, h * 0.62], [w * 0.36, h * 0.46], [w * 0.4, h * 0.6], [-4, h * 0.82]], '#3b6fd8');
    p.poly([[-4, h * 0.7], [w * 0.38, h * 0.55], [w * 0.38, h * 0.6], [-4, h * 0.82]], '#2a51a8');
    p.poly([[w + 4, h * 0.38], [w * 0.62, h * 0.46], [w * 0.6, h * 0.6], [w + 4, h * 0.58]], '#fbf0dc');
    p.poly([[w + 4, h * 0.5], [w * 0.6, h * 0.55], [w * 0.6, h * 0.6], [w + 4, h * 0.58]], '#e8d5b5');
    // 交握的手
    p.ellipse(w * 0.47, h * 0.53, 12, 9, '#ffe7d6');
    p.ellipse(w * 0.53, h * 0.52, 11, 8, '#ffefe2');
    for (let i = 0; i < 4; i++) p.line(w * 0.44 + i * 4, h * 0.47, w * 0.46 + i * 4, h * 0.58, '#f6c9b3');
    p.circle(w * 0.5, h * 0.3, 3, '#f472b6'); p.circle(w * 0.5 + 5, h * 0.3, 3, '#f472b6');
    p.poly([[w * 0.5 - 3, h * 0.31], [w * 0.5 + 8, h * 0.31], [w * 0.5 + 2.5, h * 0.31 + 7]], '#f472b6');
    p.outline('#1c1f3b');
    return p;
  },
  door_light: (w, h) => {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, '#fffdf2');
    speedLines(p, w / 2, h * 0.45, '#ffe9a8', 80, 10, 13);
    p.rect(w / 2 - 22, h * 0.12, 44, h * 0.82, '#ffffff');
    p.rect(w / 2 - 24, h * 0.12, 2, h * 0.82, '#cbd5e1');
    p.rect(w / 2 + 22, h * 0.12, 2, h * 0.82, '#cbd5e1');
    // 两个剪影走进光里
    const by = Math.floor(h * 0.88);
    p.rect(w / 2 - 8, by - 14, 6, 14, '#64748b'); p.circle(w / 2 - 5, by - 18, 4, '#94a3b8');
    p.rect(w / 2 + 2, by - 14, 6, 14, '#64748b'); p.circle(w / 2 + 5, by - 18, 4, '#94a3b8');
    p.rect(w / 2 - 2, by - 9, 4, 2, '#64748b');
    return p;
  },
  falling: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#c4b5fd', '#93c5fd', '#fbcfe8', '#fff1f2']);
    const r = rng(33);
    const cols = ['#ffffff', '#e0e7ff', '#fbcfe8', '#bfdbfe', '#fde68a'];
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, s = 2 + r() * 7, a = r() * Math.PI * 2;
      const c = cols[Math.floor(r() * cols.length)];
      p.poly([[x + Math.cos(a) * s, y + Math.sin(a) * s], [x + Math.cos(a + 2.2) * s, y + Math.sin(a + 2.2) * s], [x + Math.cos(a + 4.1) * s * 0.7, y + Math.sin(a + 4.1) * s * 0.7]], c);
    }
    // 纸面碎片（带格线的三角形）
    for (let i = 0; i < 9; i++) {
      const x = r() * w, y = r() * h * 0.7, s = 10 + r() * 12;
      p.poly([[x, y], [x + s, y + s * 0.3], [x + s * 0.2, y + s]], '#fffbe6');
      p.line(x + 2, y + 3, x + s * 0.7, y + s * 0.4, '#cbd5e1');
    }
    // 下落的豆沙（小小的）
    const cx = w * 0.55, cy = h * 0.62;
    p.circle(cx, cy, 6, '#eef1f8'); p.circle(cx - 6, cy - 5, 2.5, '#2a2a35'); p.circle(cx + 6, cy - 5, 2.5, '#2a2a35');
    p.rect(cx - 4, cy + 5, 8, 9, '#3b6fd8');
    p.line(cx - 4, cy + 7, cx - 10, cy + 1, '#3b6fd8', 2); p.line(cx + 4, cy + 7, cx + 10, cy + 1, '#3b6fd8', 2);
    p.line(cx - 2, cy + 14, cx - 4, cy + 20, '#27304f', 2); p.line(cx + 2, cy + 14, cx + 5, cy + 19, '#27304f', 2);
    p.poly([[cx - 6, cy - 2], [cx - 9, cy + 10], [cx - 4, cy + 4]], '#7aa7ee');
    return p;
  },
  block_hand: (w, h) => {
    const p = new Pix(w, h);
    vgrad(p, ['#e0e7ff', '#fce7f3']);
    // 低模手：几块平涂多边形
    const cx = w * 0.42, cy = h * 0.62;
    const tri = (pts: [number, number][], c: string) => p.poly(pts.map(([x, y]) => [cx + x, cy + y] as [number, number]), c);
    tri([[-26, 30], [-12, -4], [6, 0], [10, 30]], '#f6c9b3');
    tri([[-12, -4], [6, 0], [-2, -14]], '#ffe7d6');
    tri([[-14, -6], [-10, -30], [-4, -30], [-4, -10]], '#ffe7d6');
    tri([[-4, -10], [-2, -36], [4, -36], [4, -8]], '#ffefe2');
    tri([[4, -8], [6, -32], [12, -31], [10, -4]], '#ffe7d6');
    tri([[10, -4], [14, -24], [19, -22], [14, 2]], '#f6c9b3');
    tri([[6, 0], [24, -6], [26, -1], [10, 8]], '#ffe7d6');
    tri([[-26, 30], [10, 30], [8, 40], [-24, 40]], '#3b6fd8');
    // 面片高光边
    p.line(cx - 12, cy - 4, cx + 6, cy, '#ffffff');
    p.line(cx - 2, cy - 36, cx - 2, cy - 12, '#ffffff');
    p.outline('#4c4f7a');
    return p;
  },
};

const cache = new Map<string, HTMLCanvasElement>();
export const paintPanel = (art: ArtId, cw: number, ch: number, ink = false): HTMLCanvasElement => {
  const k = `${art}:${cw}:${ch}:${ink}`;
  let c = cache.get(k);
  if (c) return c;
  const p = painters[art](cw * CELL, ch * CELL);
  if (ink) inkRemap(p);
  c = p.toCanvas();
  cache.set(k, c);
  return c;
};
