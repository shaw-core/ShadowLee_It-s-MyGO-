// ============================================================
// 第一章渲染素材：主题、地形、背景、动态物件精灵
// 现实层 = 彩色像素画；漫画层 = 黑白墨线 + 网点
// ============================================================
import { Pix, inkRemap, rng, shadeCol } from './pixel';
import { PROPS } from './props';
import type { Level2D, ThemeId } from './levels';
import { TILE } from './physics';

export const VIEW_W = 640, VIEW_H = 360;

interface TileStyle {
  top: string; topHi: string; body: string; body2: string; edge: string;
  pattern: 'planks' | 'asphalt' | 'concrete' | 'cardboard' | 'grass' | 'ui' | 'roof';
  one: string; oneHi: string; spike: string; spikeHi: string;
}

const STYLE: Record<ThemeId, TileStyle> = {
  room: { top: '#d9a46e', topHi: '#f3c993', body: '#b9855a', body2: '#a8754f', edge: '#6b4430', pattern: 'planks', one: '#c48f63', oneHi: '#e8b98a', spike: '#ef4444', spikeHi: '#fde68a' },
  street: { top: '#b8bccd', topHi: '#e2e5ef', body: '#6b7088', body2: '#5d627a', edge: '#3e4258', pattern: 'asphalt', one: '#ec4899', oneHi: '#fbcfe8', spike: '#94a3b8', spikeHi: '#e2e8f0' },
  apartment: { top: '#aab3c8', topHi: '#d5dbe8', body: '#7d879e', body2: '#717b92', edge: '#454d66', pattern: 'concrete', one: '#94a3b8', oneHi: '#cbd5e1', spike: '#22c55e', spikeHi: '#bbf7d0' },
  warehouse: { top: '#e3b678', topHi: '#f5d6a2', body: '#d6a565', body2: '#c48f52', edge: '#7a5528', pattern: 'cardboard', one: '#64748b', oneHi: '#94a3b8', spike: '#9ca3af', spikeHi: '#f3f4f6' },
  park: { top: '#5cc98a', topHi: '#a7f3d0', body: '#8a6248', body2: '#7a543c', edge: '#4a3324', pattern: 'grass', one: '#8a5a3b', oneHi: '#a8754f', spike: '#3b82f6', spikeHi: '#bfdbfe' },
  danmaku: { top: '#f472b6', topHi: '#fbcfe8', body: '#2a2650', body2: '#332e5e', edge: '#120f2a', pattern: 'ui', one: '#c4b5fd', oneHi: '#ede9fe', spike: '#f43f5e', spikeHi: '#fecdd3' },
  rooftop: { top: '#b4b0c4', topHi: '#dcd9e6', body: '#8b879e', body2: '#7f7b93', edge: '#4f4b63', pattern: 'roof', one: '#94a3b8', oneHi: '#e2e8f0', spike: '#94a3b8', spikeHi: '#e2e8f0' },
};

// ---------------- 地形 ----------------
const isSolidCh = (c: string, layer: 'R' | 'M') => c === '#' || c === 'B' || (c === 'R' && layer === 'R') || (c === 'M' && layer === 'M');

const drawTileReal = (p: Pix, s: TileStyle, x: number, y: number, n: { up: boolean; dn: boolean; lf: boolean; rt: boolean }, seed: number, special: boolean) => {
  const X = x * TILE, Y = y * TILE;
  p.rect(X, Y, TILE, TILE, s.body);
  const r = rng(seed);
  switch (s.pattern) {
    case 'planks':
      for (let j = 0; j < 2; j++) {
        p.rect(X, Y + j * 8 + 7, TILE, 1, s.body2);
        p.px(X + ((x * 7 + y * 3 + j * 5) % 14) + 1, Y + j * 8 + 3, s.body2);
      }
      p.rect(X + ((x + y) % 2 ? 4 : 11), Y, 1, 8, s.body2);
      break;
    case 'asphalt':
      for (let i = 0; i < 5; i++) p.px(X + r() * 16, Y + r() * 16, s.body2);
      break;
    case 'concrete':
      if ((x + y) % 2 === 0) p.rect(X, Y + 15, TILE, 1, s.body2);
      p.rect(X + 15, Y, 1, TILE, s.body2);
      for (let i = 0; i < 2; i++) p.px(X + r() * 16, Y + r() * 16, s.body2);
      break;
    case 'cardboard':
      p.rect(X + 6, Y, 4, TILE, '#f0d39d');
      if (y % 2 === 0) p.rect(X, Y + 15, TILE, 1, s.body2);
      p.rect(X + 15, Y, 1, TILE, s.body2);
      break;
    case 'grass':
      for (let i = 0; i < 3; i++) p.rect(X + r() * 14, Y + 4 + r() * 10, 2, 1, s.body2);
      if (r() > 0.7) p.rect(X + r() * 12, Y + 6 + r() * 8, 3, 2, '#a08068');
      break;
    case 'ui':
      p.rect(X, Y, TILE, 1, s.body2); p.rect(X, Y, 1, TILE, s.body2);
      if ((x + y) % 3 === 0) p.px(X + 8, Y + 8, '#4c4590');
      break;
    case 'roof':
      p.rect(X, Y + 7, TILE, 1, s.body2); p.rect(X + (y % 2 ? 3 : 11), Y, 1, 7, s.body2); p.rect(X + (y % 2 ? 11 : 3), Y + 8, 1, 8, s.body2);
      break;
  }
  if (!n.up) {
    p.rect(X, Y, TILE, 4, s.top);
    p.rect(X, Y, TILE, 1, s.topHi);
    if (s.pattern === 'grass') {
      for (let i = 0; i < 4; i++) { const gx = X + r() * 15; p.rect(gx, Y - 1, 1, 2, s.top); }
      p.rect(X, Y + 4, TILE, 1, '#3f9e66');
    } else p.rect(X, Y + 4, TILE, 1, shadeCol(s.top, 0.8));
  }
  if (!n.lf) p.rect(X, Y, 1, TILE, s.edge);
  if (!n.rt) p.rect(X + 15, Y, 1, TILE, s.edge);
  if (!n.dn) p.rect(X, Y + 15, TILE, 1, s.edge);
  if (special) {
    // 只在这一层存在的方块：一圈淡蓝色的虚线
    for (let i = 1; i < 15; i += 3) { p.px(X + i, Y + 1, '#bfe3ff'); p.px(X + i, Y + 14, '#bfe3ff'); p.px(X + 1, Y + i, '#bfe3ff'); p.px(X + 14, Y + i, '#bfe3ff'); }
  }
};

const INK = '#16182a';
const drawTileInk = (p: Pix, x: number, y: number, n: { up: boolean; dn: boolean; lf: boolean; rt: boolean }, special: boolean) => {
  const X = x * TILE, Y = y * TILE;
  p.rect(X, Y, TILE, TILE, '#ffffff');
  // 下半部网点
  for (let j = 6; j < 16; j += 3) for (let i = (j % 2); i < 16; i += 3) p.px(X + i, Y + j, '#b4b4bc');
  if (special) for (let k = -16; k < 16; k += 4) p.line(X + Math.max(0, k), Y + Math.max(0, -k), X + Math.min(15, 15 + k), Y + Math.min(15, 15 - k), '#8a8a96');
  if (!n.up) { p.rect(X, Y, TILE, 2, INK); }
  if (!n.lf) p.rect(X, Y, 2, TILE, INK);
  if (!n.rt) p.rect(X + 14, Y, 2, TILE, INK);
  if (!n.dn) p.rect(X, Y + 14, TILE, 2, INK);
};

const drawOneway = (p: Pix, x: number, y: number, s: TileStyle | null, special: boolean) => {
  const X = x * TILE, Y = y * TILE;
  if (s) {
    p.rect(X, Y, TILE, 5, s.one);
    p.rect(X, Y, TILE, 1, s.oneHi);
    p.rect(X, Y + 5, TILE, 1, shadeCol(s.one, 0.6));
    if (special) for (let i = 1; i < 16; i += 3) p.px(X + i, Y + 2, '#bfe3ff');
  } else {
    p.rect(X, Y, TILE, 5, '#ffffff');
    p.rect(X, Y, TILE, 2, INK); p.rect(X, Y + 4, TILE, 1, INK);
    if (special) for (let i = 0; i < 16; i += 4) p.px(X + i, Y + 3, INK);
  }
};

const drawSpike = (p: Pix, x: number, y: number, s: TileStyle | null) => {
  const X = x * TILE, Y = y * TILE;
  for (let k = 0; k < 2; k++) {
    const bx = X + k * 8;
    p.poly([[bx, Y + 16], [bx + 8, Y + 16], [bx + 4, Y + 7]], s ? s.spike : INK);
    if (s) p.line(bx + 4, Y + 8, bx + 2, Y + 14, s.spikeHi);
    else p.line(bx + 4, Y + 9, bx + 4, Y + 15, '#ffffff');
  }
};

const drawSpring = (p: Pix, x: number, y: number, ink: boolean) => {
  const X = x * TILE, Y = y * TILE;
  p.rect(X - 2, Y, TILE + 4, 5, ink ? '#ffffff' : '#f472b6');
  p.rect(X - 2, Y, TILE + 4, 1, ink ? INK : '#fbcfe8');
  for (let i = 0; i < 3; i++) p.line(X + 2, Y + 6 + i * 3, X + 13, Y + 7 + i * 3, ink ? INK : '#94a3b8');
  p.rect(X, Y + 14, TILE, 2, ink ? INK : '#64748b');
};

export interface StaticLayers {
  real: HTMLCanvasElement;      // 现实层：背景道具 + 地形 + 前景道具
  manga: HTMLCanvasElement;
  ghostReal: HTMLCanvasElement; // 在现实层看到的「漫画层专属」虚影
  ghostManga: HTMLCanvasElement;
  glows: { x: number; y: number; r: number; color: string }[];
}

const propBox = (k: string, x: number, y: number, dx = 0, dy = 0) => {
  const def = PROPS[k];
  if (!def) return null;
  const pix = def.draw();
  return { def, pix, px: x * TILE + dx + (def.dx ?? 0), py: (y + 1) * TILE - pix.h + dy + (def.dy ?? 0) };
};

export const buildStatic = (lv: Level2D): StaticLayers => {
  const H = lv.map.length, W = lv.map[0].length;
  const s = STYLE[lv.theme];
  const real = new Pix(W * TILE, H * TILE);
  const manga = new Pix(W * TILE, H * TILE);
  const ghostR = new Pix(W * TILE, H * TILE);
  const ghostM = new Pix(W * TILE, H * TILE);
  const glows: StaticLayers['glows'] = [];
  const at = (x: number, y: number) => (y < 0 || y >= H || x < 0 || x >= W) ? '.' : lv.map[y][x];

  // 背景道具
  const props = lv.ents.flatMap(e => (e.t === 'prop' || (e.t === 'sign' && e.k)) ? [e] : []);
  const placed = props.map(e => {
    const k = (e as any).k as string;
    const b = propBox(k, e.x, e.y);
    if (!b) return null;
    if ((e as any).flip) b.pix.flipX();
    if (b.def.glow) glows.push({ x: b.px + b.def.glow.x, y: b.py + b.pix.h - b.def.glow.y, r: b.def.glow.r, color: b.def.glow.color });
    const layer = (e as any).layer as string | undefined;
    return { ...b, layer };
  }).filter(Boolean) as { def: any; pix: Pix; px: number; py: number; layer?: string }[];

  const paintProps = (fg: boolean) => {
    for (const pr of placed) {
      if (!!pr.def.fg !== fg) continue;
      if (!pr.layer || pr.layer === 'B' || pr.layer === 'R') real.blit(pr.pix, Math.round(pr.px), Math.round(pr.py));
      if (!pr.layer || pr.layer === 'B' || pr.layer === 'M') {
        const ink = pr.pix.clone(); inkRemap(ink);
        manga.blit(ink, Math.round(pr.px), Math.round(pr.py));
      }
    }
  };
  paintProps(false);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = lv.map[y][x];
    const seed = x * 73856093 ^ y * 19349663;
    for (const layer of ['R', 'M'] as const) {
      const p = layer === 'R' ? real : manga;
      if (isSolidCh(c, layer)) {
        const n = {
          up: isSolidCh(at(x, y - 1), layer), dn: isSolidCh(at(x, y + 1), layer),
          lf: isSolidCh(at(x - 1, y), layer), rt: isSolidCh(at(x + 1, y), layer),
        };
        const special = c === 'R' || c === 'M';
        if (c === 'B') drawSpring(p, x, y, layer === 'M');
        else if (layer === 'R') drawTileReal(p, s, x, y, n, seed, special);
        else drawTileInk(p, x, y, n, special);
      } else if (c === '-' || (c === 'r' && layer === 'R') || (c === 'm' && layer === 'M')) {
        drawOneway(p, x, y, layer === 'R' ? s : null, c !== '-');
      } else if (c === '^' || (c === 'x' && layer === 'R') || (c === 'X' && layer === 'M')) {
        drawSpike(p, x, y, layer === 'R' ? s : null);
      }
    }
    // 虚影：另一层专属的东西
    const dashed = (p: Pix, col: string, fill?: string) => {
      const X = x * TILE, Y = y * TILE;
      if (fill) for (let j = 2; j < 14; j += 4) for (let i = 2; i < 14; i += 4) p.px(X + i, Y + j, fill);
      for (let i = 0; i < 16; i += 4) {
        p.rect(X + i, Y, 2, 1, col); p.rect(X + i, Y + 15, 2, 1, col);
        p.rect(X, Y + i, 1, 2, col); p.rect(X + 15, Y + i, 1, 2, col);
      }
    };
    if (c === 'M') dashed(ghostR, '#16182a99', '#16182a40');
    if (c === 'm') { for (let i = 0; i < 16; i += 4) ghostR.rect(x * TILE + i, y * TILE + 1, 2, 2, '#16182a99'); }
    if (c === 'X') dashed(ghostR, '#16182a66');
    if (c === 'R') dashed(ghostM, '#3b82f6aa', '#3b82f640');
    if (c === 'r') { for (let i = 0; i < 16; i += 4) ghostM.rect(x * TILE + i, y * TILE + 1, 2, 2, '#3b82f6aa'); }
    if (c === 'x') dashed(ghostM, '#3b82f677');
  }
  paintProps(true);

  return { real: real.toCanvas(), manga: manga.toCanvas(), ghostReal: ghostR.toCanvas(), ghostManga: ghostM.toCanvas(), glows };
};

// ---------------- 背景 ----------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const gradient = (w: number, h: number, stops: string[]) => {
  const p = new Pix(w, h);
  const cols = stops.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  for (let y = 0; y < h; y++) {
    const t = (y / (h - 1)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < w; x++) {
      const th = BAYER[(y % 4) * 4 + (x % 4)] / 16;
      const band = Math.floor(f * 6 + th) / 6;
      const c = cols[i].map((v, k) => Math.round(v + (cols[i + 1][k] - v) * Math.min(1, band)));
      p.px(x, y, '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''));
    }
  }
  return p;
};

const skyline = (w: number, h: number, base: number, minH: number, maxH: number, col: string, win: string | null, seed: number, density = 0.25) => {
  const p = new Pix(w, h);
  const r = rng(seed);
  let x = 0;
  while (x < w) {
    const bw = 18 + Math.floor(r() * 34), bh = minH + Math.floor(r() * (maxH - minH));
    p.rect(x, base - bh, bw, bh + (h - base), col);
    if (r() > 0.6) p.rect(x + 4, base - bh - 6, 4, 6, col);
    if (win) for (let wy = base - bh + 6; wy < base - 4; wy += 7) for (let wx = x + 4; wx < x + bw - 4; wx += 6) if (r() < density) p.rect(wx, wy, 3, 3, win);
    x += bw + Math.floor(r() * 6);
  }
  return p;
};

const hills = (w: number, h: number, base: number, amp: number, col: string, seed: number) => {
  const p = new Pix(w, h);
  const r = rng(seed);
  const a = r() * 6, b = r() * 6;
  for (let x = 0; x < w; x++) {
    const yy = base - amp * (0.5 + 0.3 * Math.sin((x / w) * Math.PI * 2 * 2 + a) + 0.2 * Math.sin((x / w) * Math.PI * 2 * 5 + b));
    p.rect(x, Math.round(yy), 1, h - Math.round(yy), col);
  }
  return p;
};

export interface BgLayer { img: HTMLCanvasElement; factor: number; y: number; }
export interface Background { sky: HTMLCanvasElement; layers: BgLayer[]; ambient: 'stars' | 'fireflies' | 'dust' | 'hearts' | 'none'; }

const STRIP = 960;

const buildBgReal = (theme: ThemeId): Background => {
  switch (theme) {
    case 'room': {
      const sky = gradient(VIEW_W, VIEW_H, ['#dbe8ff', '#e8f0ff', '#f3eedf']);
      const wall = new Pix(STRIP, VIEW_H);
      const r = rng(2);
      // 竖条纹墙纸 + 小碎花
      for (let x = 0; x < STRIP; x += 32) wall.rect(x, 0, 12, VIEW_H - 64, '#d3e2ff');
      for (let y = 10; y < VIEW_H - 70; y += 28) for (let x = (y / 28) % 2 ? 22 : 6; x < STRIP; x += 32) {
        wall.px(x, y, '#f9a8d4'); wall.px(x - 1, y, '#fbcfe8'); wall.px(x + 1, y, '#fbcfe8'); wall.px(x, y - 1, '#fbcfe8'); wall.px(x, y + 1, '#fbcfe8');
      }
      // 挂串小灯
      for (let x = 0; x < STRIP; x++) {
        const y = 22 + Math.round(Math.sin((x / STRIP) * Math.PI * 6) * 8 + 8);
        wall.px(x, y, '#8b7a9e');
        if (x % 24 === 0) { wall.rect(x - 1, y + 1, 3, 4, ['#fde68a', '#fbcfe8', '#bfdbfe'][(x / 24) % 3]); wall.px(x, y + 1, '#ffffff'); }
      }
      // 相框：里面是小涂鸦
      const doodles = [
        (fx: number, fy: number) => { // 熊猫脸
          wall.circle(fx + 20, fy + 16, 8, '#ffffff'); wall.circle(fx + 14, fy + 9, 3, '#2a2a3a'); wall.circle(fx + 26, fy + 9, 3, '#2a2a3a');
          wall.ellipse(fx + 17, fy + 16, 2, 2.5, '#2a2a3a'); wall.ellipse(fx + 23, fy + 16, 2, 2.5, '#2a2a3a'); wall.px(fx + 20, fy + 20, '#2a2a3a');
        },
        (fx: number, fy: number) => { // 星星
          wall.poly([[fx + 20, fy + 5], [fx + 23, fy + 13], [fx + 31, fy + 14], [fx + 25, fy + 19], [fx + 27, fy + 27], [fx + 20, fy + 22], [fx + 13, fy + 27], [fx + 15, fy + 19], [fx + 9, fy + 14], [fx + 17, fy + 13]], '#fbbf24');
        },
        (fx: number, fy: number) => { // 两个小人
          wall.circle(fx + 14, fy + 12, 4, '#2563eb'); wall.rect(fx + 11, fy + 16, 6, 8, '#2563eb');
          wall.circle(fx + 26, fy + 12, 4, '#ea580c'); wall.rect(fx + 23, fy + 16, 6, 8, '#ea580c');
          wall.rect(fx + 17, fy + 19, 6, 1, '#475569');
        },
        (fx: number, fy: number) => { // 爱心
          wall.circle(fx + 16, fy + 12, 4, '#f472b6'); wall.circle(fx + 24, fy + 12, 4, '#f472b6');
          wall.poly([[fx + 12, fy + 13], [fx + 28, fy + 13], [fx + 20, fy + 23]], '#f472b6'); wall.px(fx + 15, fy + 10, '#ffffff');
        },
      ];
      for (let i = 0; i < 6; i++) {
        const fx = Math.round(40 + i * 160 + r() * 40), fy = Math.round(60 + r() * 60);
        wall.rect(fx - 1, fy - 1, 42, 32, '#8a6a4a');
        wall.rect(fx, fy, 40, 30, '#c9a27a'); wall.rect(fx + 3, fy + 3, 34, 24, ['#fff1f7', '#eef5ff', '#effcf3'][i % 3]);
        doodles[i % 4](fx, fy);
        wall.line(fx + 20, fy - 10, fx + 4, fy, '#8b7a9e'); wall.line(fx + 20, fy - 10, fx + 36, fy, '#8b7a9e');
        wall.rect(fx + 19, fy - 11, 3, 2, '#c9a27a');
      }
      wall.rect(0, VIEW_H - 66, STRIP, 2, '#e9dcc3');
      wall.rect(0, VIEW_H - 64, STRIP, 6, '#c9b08a');
      return { sky: sky.toCanvas(), layers: [{ img: wall.toCanvas(), factor: 0.25, y: 0 }], ambient: 'dust' };
    }
    case 'street': {
      const sky = gradient(VIEW_W, VIEW_H, ['#8f6fc9', '#f59eb0', '#ffc999', '#ffe4b5']);
      const far = skyline(STRIP, VIEW_H, 240, 40, 120, '#a58ac9', '#ffe6a8', 11, 0.15);
      const mid = skyline(STRIP, VIEW_H, 290, 50, 140, '#7e6aa8', '#ffd479', 23, 0.3);
      return { sky: sky.toCanvas(), layers: [{ img: far.toCanvas(), factor: 0.15, y: 0 }, { img: mid.toCanvas(), factor: 0.35, y: 0 }], ambient: 'none' };
    }
    case 'apartment': {
      const sky = gradient(VIEW_W, VIEW_H, ['#0f1533', '#1c2650', '#2f3d78']);
      const sp = sky;
      sp.circle(520, 70, 18, '#fff4c8'); sp.circle(514, 64, 4, '#f3e3a8');
      const far = skyline(STRIP, VIEW_H, 230, 60, 150, '#1f2856', '#ffd56b', 31, 0.12);
      const mid = skyline(STRIP, VIEW_H, 280, 90, 200, '#2a3468', '#ffe08a', 47, 0.22);
      return { sky: sp.toCanvas(), layers: [{ img: far.toCanvas(), factor: 0.12, y: 0 }, { img: mid.toCanvas(), factor: 0.3, y: 0 }], ambient: 'stars' };
    }
    case 'warehouse': {
      const sky = gradient(VIEW_W, VIEW_H, ['#2c3044', '#3a3f58', '#4b5168']);
      const far = new Pix(STRIP, VIEW_H);
      for (let x = 0; x < STRIP; x += 120) {
        far.rect(x, 0, 8, VIEW_H, '#252938');
        for (let y = 40; y < VIEW_H; y += 70) far.rect(x, y, 120, 4, '#2f3447');
      }
      for (let x = 0; x < STRIP; x += 40) far.line(x, 0, x + 40, 36, '#3a3f58');
      const mid = new Pix(STRIP, VIEW_H);
      const r = rng(8);
      for (let x = 0; x < STRIP; x += 96) for (let y = 120; y < 300; y += 60) if (r() > 0.3) {
        mid.rect(x + 10, y, 60, 4, '#3e4560');
        for (let bx = x + 12; bx < x + 64; bx += 18) mid.rect(bx, y - 14, 14, 14, '#4f4a52');
      }
      return { sky: sky.toCanvas(), layers: [{ img: far.toCanvas(), factor: 0.15, y: 0 }, { img: mid.toCanvas(), factor: 0.35, y: 0 }], ambient: 'dust' };
    }
    case 'park': {
      const sky = gradient(VIEW_W, VIEW_H, ['#121c42', '#22336a', '#3a4f86']);
      sky.circle(120, 64, 16, '#fff4c8');
      const far = hills(STRIP, VIEW_H, 250, 70, '#1e3560', 4);
      const mid = hills(STRIP, VIEW_H, 290, 50, '#24456b', 9);
      const r = rng(77);
      for (let i = 0; i < 18; i++) {
        const tx = r() * STRIP, ty = 230 + r() * 40;
        mid.circle(tx, ty, 10 + r() * 10, '#1d3a58'); mid.rect(tx - 1, ty, 3, 40, '#1d3a58');
      }
      return { sky: sky.toCanvas(), layers: [{ img: far.toCanvas(), factor: 0.12, y: 0 }, { img: mid.toCanvas(), factor: 0.3, y: 0 }], ambient: 'fireflies' };
    }
    case 'danmaku': {
      const sky = gradient(VIEW_W, VIEW_H, ['#120c2c', '#1f1648', '#2c1f5c']);
      const grid = new Pix(STRIP, VIEW_H);
      for (let x = 0; x < STRIP; x += 32) grid.rect(x, 0, 1, VIEW_H, '#2e2668');
      for (let y = 0; y < VIEW_H; y += 32) grid.rect(0, y, STRIP, 1, '#2e2668');
      const ui = new Pix(STRIP, VIEW_H);
      for (let x = 30; x < STRIP; x += 300) {
        ui.rect(x, 50, 240, 140, '#3a2f7a');
        ui.rect(x + 4, 54, 232, 132, '#251c55');
        ui.rect(x + 10, 170, 120, 6, '#ec4899');
        ui.circle(x + 200, 90, 14, '#3a2f7a');
      }
      return { sky: sky.toCanvas(), layers: [{ img: grid.toCanvas(), factor: 0.1, y: 0 }, { img: ui.toCanvas(), factor: 0.3, y: 0 }], ambient: 'hearts' };
    }
    case 'rooftop': {
      const sky = gradient(VIEW_W, VIEW_H, ['#090e2a', '#18205a', '#3a3a7c', '#6b4f8a']);
      const far = skyline(STRIP, VIEW_H, 300, 20, 90, '#1a1f48', '#ffe08a', 91, 0.35);
      const mid = skyline(STRIP, VIEW_H, 330, 30, 70, '#232a5c', '#ffd56b', 12, 0.4);
      return { sky: sky.toCanvas(), layers: [{ img: far.toCanvas(), factor: 0.08, y: 0 }, { img: mid.toCanvas(), factor: 0.2, y: 0 }], ambient: 'stars' };
    }
  }
};

const buildBgInk = (real: Background, theme: ThemeId): Background => {
  // 白纸 + 上方粗网点渐变 + 墨线版远景
  const sky = new Pix(VIEW_W, VIEW_H);
  sky.rect(0, 0, VIEW_W, VIEW_H, '#ffffff');
  for (let y = 0; y < 150; y += 5) {
    const r = (1 - y / 150) * 1.8;
    if (r < 0.4) continue;
    for (let x = (y / 5) % 2 ? 2 : 0; x < VIEW_W; x += 5) sky.circle(x, y, r, '#c9c9d2');
  }
  const layers = real.layers.map(l => {
    const c = l.img;
    const g = c.getContext('2d')!;
    const data = g.getImageData(0, 0, c.width, c.height);
    const p = new Pix(c.width, c.height);
    p.buf.set(new Uint32Array(data.data.buffer));
    // 远景只保留轮廓线 + 浅网点
    const out = new Pix(c.width, c.height);
    for (let y = 1; y < c.height - 1; y++) for (let x = 1; x < c.width - 1; x++) {
      const v = p.get(x, y);
      if (!v) continue;
      const edge = !p.get(x, y - 1) || !p.get(x - 1, y) || !p.get(x + 1, y);
      if (edge) out.px(x, y, theme === 'danmaku' ? '#9a9aa6' : '#55556a');
      else if ((x + y) % 4 === 0 && (x % 4 === 0)) out.px(x, y, '#d0d0d8');
    }
    return { img: out.toCanvas(), factor: l.factor, y: l.y };
  });
  return { sky: sky.toCanvas(), layers, ambient: real.ambient === 'hearts' ? 'hearts' : 'none' };
};

const bgCache = new Map<string, { real: Background; ink: Background }>();
export const getBackground = (theme: ThemeId) => {
  let b = bgCache.get(theme);
  if (!b) {
    const real = buildBgReal(theme);
    b = { real, ink: buildBgInk(real, theme) };
    bgCache.set(theme, b);
  }
  return b;
};

// ---------------- 动态物件 ----------------
const mk = (w: number, h: number, f: (p: Pix) => void, ol = '#1c1f3b') => {
  const p = new Pix(w, h); f(p); p.outline(ol);
  const ink = p.clone(); inkRemap(ink);
  return { col: p.toCanvas(), ink: ink.toCanvas() };
};

export const SPR = {
  page: mk(14, 18, p => {
    p.rect(1, 1, 12, 16, '#ffffff');
    p.rect(1, 1, 12, 3, '#f472b6');
    p.rect(3, 6, 8, 1, '#94a3b8'); p.rect(3, 9, 6, 1, '#94a3b8'); p.rect(3, 12, 7, 1, '#94a3b8');
    p.poly([[9, 13], [13, 13], [13, 17], [9, 17]], '#fbcfe8');
  }),
  shard: [0, 1, 2, 3].map(i => mk(12, 12, p => {
    const w = [5, 3.5, 1.5, 3.5][i];
    p.poly([[6, 0], [6 + w, 6], [6, 12], [6 - w, 6]], '#60a5fa');
    p.poly([[6, 0], [6 + w, 6], [6, 6]], '#bfdbfe');
    if (i === 0) p.px(5, 3, '#ffffff');
  })),
  bookmarkOff: mk(14, 30, p => {
    p.rect(6, 6, 2, 24, '#94a3b8');
    p.poly([[1, 0], [13, 0], [13, 14], [7, 10], [1, 14]], '#93a6c4');
    p.rect(3, 3, 8, 1, '#cbd5e1');
  }),
  bookmarkOn: mk(14, 30, p => {
    p.rect(6, 6, 2, 24, '#94a3b8');
    p.poly([[1, 0], [13, 0], [13, 14], [7, 10], [1, 14]], '#f472b6');
    p.rect(3, 3, 8, 1, '#fbcfe8');
    p.px(7, 5, '#ffffff');
  }),
  pageCurl: mk(40, 52, p => {
    p.rect(0, 0, 40, 52, '#ffffff');
    p.rect(0, 0, 40, 4, '#e2e8f0');
    for (let y = 10; y < 40; y += 6) p.rect(5, y, 26, 1, '#cbd5e1');
    p.poly([[18, 52], [40, 30], [40, 52]], '#fde68a');
    p.poly([[18, 52], [40, 30], [22, 34]], '#fbcfe8');
    p.line(18, 52, 40, 30, '#94a3b8');
  }),
  door: mk(38, 60, p => {
    p.rect(0, 0, 38, 60, '#e2e8f0');
    p.rect(3, 3, 32, 57, '#fff8dc');
    p.rect(17, 3, 4, 57, '#ffffff');
    p.rect(3, 3, 32, 4, '#ffffff');
  }),
};

/** 移动平台外观（宽度为格数） */
const moverCache = new Map<string, { col: HTMLCanvasElement; ink: HTMLCanvasElement }>();
export const moverSprite = (style: string, w: number, color?: string) => {
  const k = `${style}:${w}:${color}`;
  let c = moverCache.get(k);
  if (c) return c;
  const W = w * TILE;
  if (style === 'box') c = mk(W, 16, p => {
    p.rect(0, 0, W, 16, '#d6a565'); p.rect(0, 0, W, 3, '#e8bd7f');
    for (let x = 0; x < W; x += 16) { p.rect(x, 0, 1, 16, '#b07a3c'); p.rect(x + 6, 0, 4, 16, '#f3dfb8'); }
  });
  else if (style === 'board') c = mk(W, 22, p => {
    p.rect(0, 0, W, 16, '#3b6fd8'); p.rect(2, 2, W - 4, 12, '#ffffff');
    p.rect(W / 2 - 1, 16, 2, 6, '#475569');
  });
  else if (style === 'leaf') c = mk(W, 8, p => {
    p.ellipse(W / 2, 4, W / 2, 3.5, '#4ade80');
    p.poly([[W / 2, 4], [W / 2 + 6, 0], [W / 2 + 10, 0]], '#2b4f8a');
    p.line(6, 4, W - 6, 4, '#22c55e');
  });
  else if (style === 'danmaku') c = mk(W, 14, p => {
    p.rect(0, 0, W, 14, '#ffffff22');
    p.rect(0, 13, W, 1, color ?? '#ffffff');
  }, '#00000000');
  else c = mk(W, 12, p => { p.ellipse(W / 2, 6, W / 2, 5, '#ffffff'); });
  moverCache.set(k, c);
  return c;
};
