// ============================================================
// 迷你像素画库：在低分辨率缓冲上画形状，然后自动描边、输出 canvas。
// 所有 2D 美术（角色帧、头像、道具、分镜）都由它程序化生成。
// ============================================================

export type Col = string; // '#rrggbb' 或 '#rrggbbaa'

const cache = new Map<string, number>();
export const toU32 = (c: Col): number => {
  let v = cache.get(c);
  if (v !== undefined) return v;
  const h = c.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  cache.set(c, v);
  return v;
};

export class Pix {
  w: number; h: number;
  buf: Uint32Array;
  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.buf = new Uint32Array(w * h);
  }
  px(x: number, y: number, c: Col) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.buf[y * this.w + x] = toU32(c);
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.buf[y * this.w + x];
  }
  clearPx(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.buf[y * this.w + x] = 0;
  }
  rect(x: number, y: number, w: number, h: number, c: Col) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  /** 填充椭圆（中心 + 半径，支持半像素） */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col) {
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.px(x, y, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: Col) { this.ellipse(cx, cy, r, r, c); }
  line(x0: number, y0: number, x1: number, y1: number, c: Col, thick = 1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const n = Math.max(dx, dy, 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (thick <= 1) this.px(x, y, c);
      else this.rect(Math.round(x - thick / 2), Math.round(y - thick / 2), thick, thick, c);
    }
  }
  /** 填充多边形（扫描线） */
  poly(pts: [number, number][], c: Col) {
    let minY = Infinity, maxY = -Infinity;
    pts.forEach(p => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      const yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
      }
    }
  }
  /** 只在已有像素上着色（用于阴影/高光遮罩） */
  shade(test: (x: number, y: number) => boolean, c: Col) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.buf[y * this.w + x] && test(x, y)) this.buf[y * this.w + x] = toU32(c);
    }
  }
  /** 外描边：透明且与实心相邻的像素染成描边色 */
  outline(c: Col, diag = false) {
    const out = new Uint32Array(this.buf);
    const cv = toU32(c);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.buf[y * this.w + x]) continue;
      const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)
        || (diag && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
      if (n) out[y * this.w + x] = cv;
    }
    this.buf = out;
  }
  /** 颜色映射（彩色 → 漫画墨色） */
  remap(fn: (r: number, g: number, b: number, a: number) => [number, number, number]) {
    for (let i = 0; i < this.buf.length; i++) {
      const v = this.buf[i];
      if (!v) continue;
      const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255, a = (v >>> 24) & 255;
      const [nr, ng, nb] = fn(r, g, b, a);
      this.buf[i] = ((a << 24) | (nb << 16) | (ng << 8) | nr) >>> 0;
    }
  }
  flipX() {
    const out = new Uint32Array(this.buf.length);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out[y * this.w + (this.w - 1 - x)] = this.buf[y * this.w + x];
    this.buf = out;
  }
  blit(src: Pix, dx: number, dy: number) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.buf[y * src.w + x];
      if (v) {
        const tx = dx + x, ty = dy + y;
        if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.buf[ty * this.w + tx] = v;
      }
    }
  }
  clone() { const p = new Pix(this.w, this.h); p.buf.set(this.buf); return p; }
  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.buf);
    g.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = document.createElement('canvas');
    s.width = this.w * scale; s.height = this.h * scale;
    const sg = s.getContext('2d')!;
    sg.imageSmoothingEnabled = false;
    sg.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }
}

/** 漫画化：按亮度映射到 黑 / 网点灰 / 白 三档 */
export const inkRemap = (p: Pix, tone = true) => {
  p.remap((r, g, b) => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    if (l < 70) return [22, 24, 42];
    if (l < 165) return tone ? [150, 150, 158] : [22, 24, 42];
    if (l < 215) return [214, 214, 220];
    return [255, 255, 255];
  });
};

/** 灰阶 */
export const grayRemap = (p: Pix) => {
  p.remap((r, g, b) => { const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b); return [l, l, l]; });
};

/** 确定性随机 */
export const rng = (seed: number) => {
  let t = seed >>> 0 || 1;
  return () => {
    t ^= t << 13; t ^= t >>> 17; t ^= t << 5;
    return ((t >>> 0) % 100000) / 100000;
  };
};

/** 颜色明暗调整 */
export const shadeCol = (c: Col, k: number): Col => {
  const h = c.replace('#', '');
  const f = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k)));
  return '#' + [f(0), f(2), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
};
