// ============================================================
// 第一章场景道具（像素画，彩色版；漫画层由 inkRemap 自动转换）
// 坐标：道具 Pix 的底边对齐所在格子的底边，左边对齐格子左边。
// ============================================================
import { Pix, rng, shadeCol } from './pixel';

export interface PropDef {
  draw: () => Pix;
  fg?: boolean;                 // 画在地形之前（遮住地形）
  dx?: number; dy?: number;     // 额外像素偏移
  glow?: { x: number; y: number; r: number; color: string }; // 现实层的光晕（相对道具左下）
}

const O = '#1c1f3b';
const outline = (p: Pix, c = O) => { p.outline(c); return p; };

// ---------------- 通用小部件 ----------------
const windowPix = (w: number, h: number, frame: string, glass: string, lit: boolean, curtain?: string) => {
  const p = new Pix(w, h);
  p.rect(0, 0, w, h, frame);
  p.rect(2, 2, w - 4, h - 4, glass);
  if (lit) {
    p.rect(3, 3, w - 6, Math.floor((h - 6) / 2), shadeCol(glass, 1.08));
  }
  p.rect(Math.floor(w / 2) - 1, 2, 2, h - 4, frame);
  p.rect(2, Math.floor(h / 2) - 1, w - 4, 2, frame);
  if (curtain) { p.rect(2, 2, 4, h - 4, curtain); p.rect(w - 6, 2, 4, h - 4, curtain); }
  return outline(p);
};

const lampGlow = (color: string, r = 40) => ({ color, r });

export const PROPS: Record<string, PropDef> = {
  // ======================= 房间 =======================
  window: {
    draw: () => {
      const p = new Pix(52, 60);
      p.rect(0, 0, 52, 60, '#e9dcc4');
      p.rect(3, 3, 46, 54, '#1b2559');
      // 夜空与星星
      const r = rng(7);
      for (let i = 0; i < 14; i++) p.px(4 + r() * 44, 4 + r() * 50, '#fff7c2');
      p.circle(38, 14, 5, '#fff2b0'); p.circle(40, 12, 4.5, '#1b2559');
      p.rect(25, 3, 2, 54, '#e9dcc4'); p.rect(3, 29, 46, 2, '#e9dcc4');
      // 窗帘
      p.poly([[0, 0], [12, 0], [8, 60], [0, 60]], '#9cc3f5');
      p.poly([[40, 0], [52, 0], [52, 60], [44, 60]], '#9cc3f5');
      p.line(4, 2, 4, 58, '#7aa7e8'); p.line(48, 2, 48, 58, '#7aa7e8');
      return outline(p);
    },
  },
  poster: {
    draw: () => {
      const p = new Pix(30, 40);
      p.rect(0, 0, 30, 40, '#fdf2f8');
      p.rect(3, 3, 24, 22, '#f9a8d4');
      p.circle(15, 13, 6, '#fff');
      p.circle(12, 12, 1, O); p.circle(18, 12, 1, O);
      p.rect(4, 28, 22, 2, '#ec4899'); p.rect(4, 32, 16, 2, '#f472b6');
      p.px(15, 1, '#e11d48');
      return outline(p);
    },
  },
  deskLegs: {
    draw: () => {
      const p = new Pix(14 * 16, 64);
      p.rect(4, 0, 8, 64, '#8a5a3b'); p.rect(14 * 16 - 12, 0, 8, 64, '#8a5a3b');
      p.rect(14, 4, 60, 30, '#a8754f'); p.rect(16, 6, 56, 12, '#b9855a'); p.rect(16, 20, 56, 12, '#b9855a');
      p.rect(42, 10, 6, 2, '#e8c79a'); p.rect(42, 24, 6, 2, '#e8c79a');
      return outline(p);
    },
    dy: -16 * 0,
  },
  monitor: {
    draw: () => {
      const p = new Pix(84, 54);
      p.rect(36, 44, 12, 8, '#3a3f55'); p.rect(26, 50, 32, 4, '#2a2f45');
      p.rect(0, 0, 84, 46, '#2a2f45');
      p.rect(3, 3, 78, 40, '#c7e3ff');
      // 直播画面：小人 + 弹幕条
      p.rect(3, 33, 78, 10, '#9be3b0');
      p.rect(36, 18, 8, 15, '#3b6fd8'); p.circle(40, 14, 5, '#eef1f8');
      for (let i = 0; i < 5; i++) p.rect(8 + i * 14, 6 + (i % 3) * 7, 10, 2, i % 2 ? '#ec4899' : '#ffffff');
      // LIVE 标
      p.rect(64, 5, 14, 6, '#ef4444'); p.rect(66, 7, 2, 2, '#fff'); p.rect(70, 7, 6, 2, '#fff');
      return outline(p);
    },
    glow: { x: 42, y: 30, r: 70, color: 'rgba(170,215,255,0.35)' },
  },
  chair: {
    draw: () => {
      const p = new Pix(28, 46);
      p.rect(4, 0, 20, 22, '#ec4899'); p.rect(6, 2, 16, 18, '#f472b6');
      p.rect(2, 22, 24, 6, '#db2777');
      p.rect(12, 28, 4, 12, '#3a3f55');
      p.rect(2, 40, 24, 3, '#3a3f55'); p.circle(4, 44, 2, '#222'); p.circle(24, 44, 2, '#222');
      return outline(p);
    },
  },
  sticky: {
    draw: () => {
      const p = new Pix(14, 14);
      p.rect(0, 0, 14, 14, '#fde68a'); p.rect(0, 0, 14, 3, '#fbbf24');
      p.rect(2, 5, 9, 1, '#a16207'); p.rect(2, 8, 7, 1, '#a16207'); p.rect(2, 11, 8, 1, '#a16207');
      return outline(p);
    },
    dy: -40,
  },
  bookshelf: {
    draw: () => {
      const p = new Pix(56, 112);
      p.rect(0, 0, 56, 112, '#8a5a3b'); p.rect(4, 4, 48, 104, '#6b4430');
      const r = rng(31);
      const cols = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#f1f5f9'];
      for (let shelf = 0; shelf < 4; shelf++) {
        const y = 4 + shelf * 26;
        p.rect(4, y + 22, 48, 4, '#8a5a3b');
        let x = 6;
        while (x < 48) {
          const bw = 3 + Math.floor(r() * 4), bh = 12 + Math.floor(r() * 9);
          if (x + bw > 50) break;
          p.rect(x, y + 22 - bh, bw, bh, cols[Math.floor(r() * cols.length)]);
          p.px(x + 1, y + 24 - bh, '#ffffff80');
          x += bw + 1;
        }
      }
      return outline(p);
    },
  },
  plushPanda: {
    draw: () => {
      const p = new Pix(22, 22);
      p.circle(5, 4, 3, '#2a2a35'); p.circle(17, 4, 3, '#2a2a35');
      p.ellipse(11, 15, 9, 7, '#ffffff');
      p.ellipse(11, 9, 8, 6.5, '#ffffff');
      p.ellipse(7.5, 9, 2.2, 2.6, '#2a2a35'); p.ellipse(14.5, 9, 2.2, 2.6, '#2a2a35');
      p.px(7, 8, '#fff'); p.px(14, 8, '#fff');
      p.rect(10, 12, 2, 1, '#2a2a35');
      p.ellipse(4, 17, 3, 3, '#2a2a35'); p.ellipse(18, 17, 3, 3, '#2a2a35');
      return outline(p);
    },
  },
  bed: {
    draw: () => {
      const W = 15 * 16;
      const p = new Pix(W, 60);
      p.rect(0, 4, 10, 56, '#a8754f'); p.rect(2, 6, 6, 50, '#c48f63');   // 床头
      p.rect(W - 8, 22, 8, 38, '#a8754f');
      // 床架与床腿
      p.rect(10, 46, W - 18, 5, '#a8754f'); p.rect(10, 46, W - 18, 1, '#c48f63');
      p.rect(16, 51, 5, 9, '#8a5d3b'); p.rect(W - 22, 51, 5, 9, '#8a5d3b');
      // 弹簧床垫：整面都是弹簧，侧边一圈露出粉色的弹簧圈
      p.rect(10, 36, W - 18, 10, '#ffffff');
      p.rect(10, 36, W - 18, 1, '#e2e8f0'); p.rect(10, 45, W - 18, 1, '#cbd5e1');
      for (let x = 12; x + 8 <= W - 8; x += 8) { p.line(x, 38, x + 4, 43, '#f472b6'); p.line(x + 4, 43, x + 8, 38, '#f472b6'); }
      // 被子盖在床垫上
      p.rect(10, 26, W - 18, 10, '#bcd7ff');
      for (let x = 14; x < W - 12; x += 12) p.rect(x, 28, 6, 6, '#a5c6f8');
      p.ellipse(26, 25, 14, 6, '#ffffff'); p.ellipse(26, 25, 11, 4, '#f5f7ff');
      p.rect(10, 35, W - 18, 1, '#7aa7e8');
      return outline(p);
    },
    fg: true, dy: 0,
  },
  /** 真结局「她们的房间」里的床：普通床垫（没有弹簧圈）、床头两个蓬松的枕头、掀开一角的被子、坐着的熊猫玩偶 */
  roomBed: {
    draw: () => {
      const W = 15 * 16;
      const p = new Pix(W, 60);
      p.rect(0, 4, 10, 56, '#a8754f'); p.rect(2, 6, 6, 50, '#c48f63');   // 床头
      p.rect(W - 8, 22, 8, 38, '#a8754f');
      p.rect(10, 46, W - 18, 5, '#a8754f'); p.rect(10, 46, W - 18, 1, '#c48f63');
      p.rect(16, 51, 5, 9, '#8a5d3b'); p.rect(W - 22, 51, 5, 9, '#8a5d3b');
      // 床垫 + 床单
      p.rect(10, 34, W - 18, 12, '#f8fafc'); p.rect(10, 44, W - 18, 2, '#e2e8f0');
      // 两个枕头：后面那个稍高、颜色暗一点；前面那个压出一道褶
      p.ellipse(34, 24, 21, 8, '#dfe7f6'); p.ellipse(34, 23, 19, 6, '#eef2fb');
      p.ellipse(30, 29, 20, 7, '#ffffff'); p.ellipse(30, 31, 18, 4, '#f1f5fd');
      p.line(16, 29, 22, 28, '#d5deef'); p.line(36, 27, 44, 29, '#d5deef');
      // 被子：盖住后三分之二，靠枕头这头翻折出白色被里
      p.rect(64, 27, W - 72, 9, '#bcd7ff');
      for (let x = 70; x < W - 12; x += 12) p.rect(x, 29, 6, 5, '#a5c6f8');
      p.rect(58, 26, 8, 10, '#ffffff'); p.rect(58, 26, 8, 1, '#e2e8f0');
      p.rect(64, 36, W - 72, 2, '#7aa7e8');
      // 熊猫玩偶（坐在被子上，面朝外）
      const X = 150, Y = 26;
      p.ellipse(X, Y - 4, 7, 6, '#ffffff');                         // 身体
      p.ellipse(X - 6, Y - 6, 2.5, 3.5, '#24252e'); p.ellipse(X + 6, Y - 6, 2.5, 3.5, '#24252e'); // 手
      p.ellipse(X - 4, Y, 3, 2, '#24252e'); p.ellipse(X + 4, Y, 3, 2, '#24252e');               // 脚
      p.px(X - 4, Y, '#f2a6ae'); p.px(X + 4, Y, '#f2a6ae');
      p.circle(X - 6, Y - 20, 3, '#24252e'); p.circle(X + 6, Y - 20, 3, '#24252e');            // 耳朵
      p.ellipse(X, Y - 14, 8, 7, '#ffffff');                        // 头
      p.ellipse(X - 3.5, Y - 14, 2.2, 2.6, '#24252e'); p.ellipse(X + 3.5, Y - 14, 2.2, 2.6, '#24252e');
      p.px(X - 3, Y - 15, '#ffffff'); p.px(X + 4, Y - 15, '#ffffff');
      p.px(X, Y - 11, '#24252e'); p.rect(X - 7, Y - 11, 2, 1, '#f9b7c3'); p.rect(X + 6, Y - 11, 2, 1, '#f9b7c3');
      p.rect(X - 5, Y - 8, 11, 2, '#93c5fd');                       // 蓝色小围巾
      return outline(p);
    },
    fg: true, dy: 0,
  },
  lamp: {
    draw: () => {
      const p = new Pix(24, 64);
      p.poly([[2, 18], [22, 18], [17, 2], [7, 2]], '#fde68a');
      p.rect(7, 2, 10, 2, '#fbbf24');
      p.rect(11, 18, 2, 40, '#64748b');
      p.rect(4, 58, 16, 6, '#475569');
      return outline(p);
    },
    glow: { x: 12, y: 54, r: 60, color: 'rgba(255,230,150,0.35)' },
  },
  rug: {
    draw: () => {
      const p = new Pix(96, 6);
      p.rect(0, 0, 96, 6, '#c4b5fd'); p.rect(4, 1, 88, 4, '#ddd6fe');
      for (let x = 8; x < 88; x += 10) p.rect(x, 2, 4, 2, '#a78bfa');
      return p;
    },
    fg: true, dy: 2,
  },
  plant: {
    draw: () => {
      const p = new Pix(28, 40);
      p.rect(6, 26, 16, 14, '#e2885b'); p.rect(4, 24, 20, 4, '#c8704a');
      const leaf = (x: number, y: number, rx: number, ry: number) => p.ellipse(x, y, rx, ry, '#4ade80');
      leaf(14, 14, 4, 10); leaf(7, 17, 4, 7); leaf(21, 17, 4, 7); leaf(10, 8, 3, 6); leaf(18, 9, 3, 6);
      p.line(14, 6, 14, 24, '#16a34a');
      return outline(p);
    },
  },
  roomDoor: {
    draw: () => {
      const p = new Pix(40, 72);
      p.rect(0, 0, 40, 72, '#e9dcc4');
      p.rect(4, 4, 32, 68, '#c48f63');
      p.rect(8, 8, 24, 26, '#b17e54'); p.rect(8, 40, 24, 28, '#b17e54');
      p.circle(30, 40, 2, '#fde68a');
      return outline(p);
    },
  },
  crt: {
    draw: () => {
      const p = new Pix(34, 30);
      p.rect(0, 0, 34, 26, '#cbd5e1'); p.rect(3, 3, 24, 19, '#334155');
      p.rect(29, 6, 3, 3, '#64748b'); p.rect(29, 12, 3, 3, '#64748b');
      p.rect(5, 26, 6, 4, '#64748b'); p.rect(23, 26, 6, 4, '#64748b');
      p.line(9, 0, 4, -4, '#94a3b8'); p.line(22, 0, 27, -4, '#94a3b8');
      return outline(p);
    },
  },

  // ======================= 街道 =======================
  shop: {
    draw: () => {
      const W = 8 * 16;
      const p = new Pix(W, 120);
      p.rect(0, 0, W, 120, '#f4d9b8');
      p.rect(0, 0, W, 8, '#d9a77a');
      // 招牌
      p.rect(10, 14, W - 20, 18, '#3b6fd8'); p.rect(14, 18, W - 28, 10, '#ffffff');
      for (let i = 0; i < 5; i++) p.rect(20 + i * 18, 21, 10, 4, '#3b6fd8');
      // 遮阳棚条纹
      for (let i = 0; i < W; i += 12) p.rect(i, 36, 6, 14, '#ec4899');
      for (let i = 6; i < W; i += 12) p.rect(i, 36, 6, 14, '#fdf2f8');
      // 橱窗
      p.rect(8, 58, 60, 50, '#a8d8ff'); p.rect(10, 60, 56, 20, '#c6e7ff');
      p.rect(78, 58, 34, 62, '#8a5a3b'); p.circle(84, 90, 2, '#fde68a');
      p.rect(14, 92, 12, 16, '#fda4af'); p.rect(32, 96, 10, 12, '#fde68a'); p.rect(48, 90, 12, 18, '#bbf7d0');
      return outline(p);
    },
    glow: { x: 38, y: 40, r: 70, color: 'rgba(255,220,160,0.25)' },
  },
  shop2: {
    draw: () => {
      const W = 7 * 16;
      const p = new Pix(W, 150);
      p.rect(0, 0, W, 150, '#c9b6e4');
      for (let y = 8; y < 90; y += 26) for (let x = 10; x < W - 20; x += 32) {
        p.rect(x, y, 20, 18, '#ffe9a8'); p.rect(x, y, 20, 3, '#e9d58a');
      }
      for (let i = 0; i < W; i += 12) p.rect(i, 104, 6, 12, '#22c55e');
      for (let i = 6; i < W; i += 12) p.rect(i, 104, 6, 12, '#f0fdf4');
      p.rect(8, 120, 50, 30, '#a8d8ff'); p.rect(66, 118, 30, 32, '#6b4430');
      return outline(p);
    },
  },
  clock: {
    draw: () => {
      const p = new Pix(24, 80);
      p.rect(10, 22, 4, 58, '#334155');
      p.circle(12, 12, 11, '#334155'); p.circle(12, 12, 9, '#fffbeb');
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.px(12 + Math.cos(a) * 7.5, 12 + Math.sin(a) * 7.5, '#64748b'); }
      p.line(12, 12, 12, 5, '#1e293b');      // 分针：12
      p.line(12, 12, 6, 12, '#1e293b');      // 时针：7 点（指向左下）
      p.line(12, 12, 8, 16, '#1e293b');
      p.rect(6, 76, 12, 4, '#334155');
      return outline(p);
    },
  },
  streetLamp: {
    draw: () => {
      const p = new Pix(30, 100);
      p.rect(13, 12, 4, 84, '#475569');
      p.rect(8, 96, 14, 4, '#334155');
      p.rect(13, 10, 14, 3, '#475569');
      p.poly([[20, 12], [30, 12], [28, 20], [22, 20]], '#334155');
      p.rect(22, 20, 6, 3, '#fff3b0');
      return outline(p);
    },
    glow: { x: 25, y: 78, r: 80, color: 'rgba(255,236,160,0.4)' },
  },
  vending: {
    draw: () => {
      const p = new Pix(30, 52);
      p.rect(0, 0, 30, 52, '#ef4444'); p.rect(3, 3, 24, 26, '#dbeafe');
      for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 4; c++) p.rect(5 + c * 6, 5 + r2 * 8, 4, 6, ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899'][c]);
      p.rect(3, 34, 18, 6, '#1f2937'); p.rect(23, 34, 4, 10, '#fde68a');
      return outline(p);
    },
    glow: { x: 15, y: 30, r: 46, color: 'rgba(200,230,255,0.3)' },
  },
  chimney: {
    draw: () => {
      const p = new Pix(16, 30);
      p.rect(2, 4, 12, 26, '#b45f45'); p.rect(0, 0, 16, 6, '#8e4835');
      for (let y = 8; y < 30; y += 6) p.rect(2, y, 12, 1, '#8e4835');
      return outline(p);
    },
  },
  antenna: {
    draw: () => {
      const p = new Pix(26, 40);
      p.rect(12, 6, 2, 34, '#64748b');
      p.rect(2, 10, 22, 2, '#64748b'); p.rect(5, 18, 16, 2, '#64748b'); p.rect(8, 26, 10, 2, '#64748b');
      p.circle(13, 4, 2, '#ef4444');
      return outline(p);
    },
  },
  bench: {
    draw: () => {
      const p = new Pix(48, 26);
      p.rect(2, 0, 44, 4, '#a8754f'); p.rect(2, 6, 44, 4, '#a8754f');
      p.rect(0, 12, 48, 4, '#c48f63');
      p.rect(4, 16, 3, 10, '#475569'); p.rect(41, 16, 3, 10, '#475569');
      return outline(p);
    },
  },
  poster2: {
    draw: () => {
      const p = new Pix(28, 36);
      p.rect(0, 0, 28, 36, '#fef3c7');
      p.rect(3, 3, 22, 16, '#93c5fd'); p.circle(14, 11, 5, '#eef1f8'); p.circle(10, 6, 2, '#2a2a35'); p.circle(18, 6, 2, '#2a2a35');
      p.rect(4, 22, 20, 3, '#1e3a8a'); p.rect(4, 27, 12, 2, '#ec4899'); p.rect(18, 27, 6, 2, '#ec4899');
      return outline(p);
    },
  },

  // ======================= 公寓 =======================
  aptWindow: { draw: () => windowPix(28, 32, '#9aa3b8', '#1e2747', false) },
  aptWindowLit: {
    draw: () => windowPix(28, 32, '#9aa3b8', '#ffe39a', true, '#f9a8d4'),
    glow: { x: 14, y: 16, r: 40, color: 'rgba(255,220,140,0.3)' },
  },
  ac: {
    draw: () => {
      const p = new Pix(48, 32);
      p.rect(0, 0, 48, 32, '#e5e7eb'); p.circle(30, 16, 11, '#9ca3af'); p.circle(30, 16, 8, '#6b7280');
      p.line(22, 16, 38, 16, '#d1d5db'); p.line(30, 8, 30, 24, '#d1d5db');
      for (let y = 4; y < 28; y += 4) p.rect(3, y, 12, 2, '#9ca3af');
      return outline(p);
    },
  },
  cactus: {
    draw: () => {
      const p = new Pix(32, 24);
      for (const cx of [8, 24]) {
        p.rect(cx - 5, 14, 10, 10, '#e2885b');
        p.ellipse(cx, 8, 4, 8, '#22c55e');
        p.rect(cx - 6, 6, 3, 5, '#22c55e'); p.rect(cx + 3, 4, 3, 5, '#22c55e');
        for (let y = 2; y < 14; y += 3) { p.px(cx - 2, y, '#fef9c3'); p.px(cx + 2, y + 1, '#fef9c3'); }
      }
      return outline(p);
    },
    fg: true,
  },
  laundry: {
    draw: () => {
      const W = 9 * 16;
      const p = new Pix(W, 30);
      const r = rng(5);
      const cols = ['#f9a8d4', '#93c5fd', '#fde68a', '#ffffff', '#bbf7d0'];
      for (let x = 8; x < W - 16; x += 22) {
        const c = cols[Math.floor(r() * cols.length)];
        if (r() > 0.5) { p.rect(x, 2, 14, 16, c); p.rect(x - 3, 2, 3, 6, c); p.rect(x + 14, 2, 3, 6, c); }
        else { p.rect(x, 2, 12, 22, c); p.rect(x + 4, 2, 4, 3, '#ffffff'); }
      }
      return outline(p);
    },
    fg: true, dy: 14,
  },
  pipe: {
    draw: () => {
      const p = new Pix(10, 180);
      p.rect(2, 0, 6, 180, '#94a3b8'); p.rect(3, 0, 2, 180, '#cbd5e1');
      for (let y = 20; y < 180; y += 40) p.rect(0, y, 10, 4, '#64748b');
      return outline(p);
    },
  },
  waterTank: {
    draw: () => {
      const p = new Pix(48, 46);
      p.rect(4, 6, 40, 30, '#94a3b8'); p.ellipse(24, 6, 20, 5, '#cbd5e1');
      p.rect(4, 14, 40, 2, '#64748b'); p.rect(4, 26, 40, 2, '#64748b');
      p.rect(8, 36, 3, 10, '#475569'); p.rect(37, 36, 3, 10, '#475569');
      return outline(p);
    },
  },
  tvWindow: {
    draw: () => {
      const p = new Pix(46, 44);
      p.rect(0, 0, 46, 44, '#9aa3b8'); p.rect(3, 3, 40, 38, '#141a33');
      p.rect(9, 12, 28, 20, '#334155'); p.rect(11, 14, 24, 16, '#b8c7d9');
      const r = rng(12);
      for (let i = 0; i < 60; i++) p.px(11 + r() * 24, 14 + r() * 16, r() > 0.5 ? '#ffffff' : '#64748b');
      p.rect(19, 32, 8, 3, '#334155');
      return outline(p);
    },
    glow: { x: 23, y: 22, r: 40, color: 'rgba(125,180,255,0.35)' },
  },

  // ======================= 快递站 =======================
  boxStack: {
    draw: () => {
      const p = new Pix(52, 60);
      const box = (x: number, y: number, w: number, h: number) => {
        p.rect(x, y, w, h, '#d6a565'); p.rect(x, y, w, 3, '#e8bd7f');
        p.rect(x + Math.floor(w / 2) - 2, y, 4, h, '#f3dfb8');
        p.rect(x + 3, y + h - 8, 8, 5, '#ffffff');
      };
      box(0, 30, 26, 30); box(26, 34, 26, 26); box(8, 6, 24, 24);
      return outline(p);
    },
  },
  genkoBox: {
    draw: () => {
      const p = new Pix(34, 26);
      p.rect(0, 0, 34, 26, '#d6a565'); p.rect(0, 0, 34, 4, '#e8bd7f');
      p.rect(14, 0, 6, 26, '#f3dfb8');
      p.rect(3, 9, 10, 12, '#ffffff'); p.rect(4, 11, 8, 1, '#1e293b'); p.rect(4, 14, 6, 1, '#1e293b'); p.rect(4, 17, 7, 1, '#ef4444');
      p.rect(22, 10, 9, 9, '#ef4444'); p.rect(24, 12, 5, 5, '#fca5a5');
      return outline(p);
    },
  },
  conveyor: {
    draw: () => {
      const W = 27 * 16;
      const p = new Pix(W, 14);
      p.rect(0, 2, W, 10, '#475569');
      for (let x = 4; x < W; x += 12) p.circle(x, 7, 3, '#94a3b8');
      p.rect(0, 0, W, 2, '#1f2937');
      return outline(p);
    },
    dy: -2,
  },
  shelf: {
    draw: () => {
      const p = new Pix(16 * 15, 140);
      for (const x of [0, 112, 224]) p.rect(x, 0, 8, 140, '#64748b');
      for (const y of [20, 60, 100]) p.rect(0, y, 232, 4, '#94a3b8');
      const r = rng(4);
      for (const y of [20, 60, 100]) for (let x = 10; x < 220; x += 24) if (r() > 0.35) {
        const h = 10 + Math.floor(r() * 14);
        p.rect(x, y - h, 18, h, r() > 0.5 ? '#d6a565' : '#c48f63');
        p.rect(x + 7, y - h, 4, h, '#f3dfb8');
      }
      return outline(p);
    },
  },
  hook: {
    draw: () => {
      const p = new Pix(20, 70);
      p.rect(9, 0, 2, 56, '#94a3b8');
      p.rect(4, 56, 12, 4, '#f59e0b');
      p.line(10, 60, 10, 66, '#64748b'); p.line(10, 66, 14, 66, '#64748b'); p.line(14, 66, 14, 62, '#64748b');
      return outline(p);
    },
  },
  warehouseLamp: {
    draw: () => {
      const p = new Pix(30, 40);
      p.rect(14, 0, 2, 26, '#334155');
      p.poly([[2, 36], [28, 36], [22, 26], [8, 26]], '#475569');
      p.rect(8, 36, 14, 3, '#fff7cc');
      return outline(p);
    },
    glow: { x: 15, y: -40, r: 90, color: 'rgba(255,245,200,0.3)' },
  },

  // ======================= 公园 =======================
  tree: {
    draw: () => {
      const p = new Pix(80, 120);
      p.rect(36, 60, 10, 60, '#8a5a3b'); p.rect(38, 60, 3, 60, '#a8754f');
      p.line(41, 80, 22, 66, '#8a5a3b', 3); p.line(42, 74, 62, 62, '#8a5a3b', 3);
      const blob = (x: number, y: number, r: number, c: string) => p.circle(x, y, r, c);
      blob(40, 34, 30, '#2f8f5b'); blob(22, 44, 20, '#2f8f5b'); blob(60, 44, 20, '#2f8f5b');
      blob(36, 26, 22, '#3fae6e'); blob(52, 32, 16, '#3fae6e'); blob(24, 36, 14, '#3fae6e');
      blob(32, 18, 10, '#5cc98a'); blob(50, 22, 8, '#5cc98a');
      const r = rng(9);
      for (let i = 0; i < 10; i++) p.px(14 + r() * 52, 14 + r() * 40, '#a7f3d0');
      return outline(p, '#1d3b2a');
    },
  },
  parkLamp: {
    draw: () => {
      const p = new Pix(20, 80);
      p.rect(9, 14, 3, 66, '#334155');
      p.rect(4, 4, 13, 12, '#fff3b0'); p.rect(3, 2, 15, 3, '#334155'); p.rect(3, 16, 15, 2, '#334155');
      return outline(p);
    },
    glow: { x: 10, y: 70, r: 80, color: 'rgba(255,236,160,0.42)' },
  },
  pond: {
    draw: () => {
      const W = 23 * 16;
      const p = new Pix(W, 34);
      p.rect(0, 0, W, 34, '#2b4f8a');
      p.rect(0, 0, W, 4, '#4f7fc9');
      const r = rng(3);
      for (let i = 0; i < 30; i++) p.rect(r() * W, 6 + r() * 24, 6, 1, '#6b9ae0');
      return p;
    },
    fg: true, dy: 18 - 16,
  },
  bush: {
    draw: () => {
      const p = new Pix(40, 22);
      p.circle(10, 14, 9, '#2f8f5b'); p.circle(22, 10, 11, '#3fae6e'); p.circle(32, 14, 8, '#2f8f5b');
      p.rect(0, 16, 40, 6, '#2f8f5b');
      p.px(18, 6, '#f9a8d4'); p.px(26, 9, '#fde68a'); p.px(12, 11, '#f9a8d4');
      return outline(p, '#1d3b2a');
    },
  },
  fence: {
    draw: () => {
      const W = 9 * 16;
      const p = new Pix(W, 26);
      for (let x = 2; x < W; x += 10) { p.rect(x, 2, 5, 24, '#f8fafc'); p.px(x + 2, 0, '#f8fafc'); }
      p.rect(0, 8, W, 3, '#e2e8f0'); p.rect(0, 18, W, 3, '#e2e8f0');
      return outline(p);
    },
  },
  house: {
    draw: () => {
      const p = new Pix(200, 150);
      p.poly([[0, 62], [100, 4], [200, 62]], '#c0544a');
      p.poly([[14, 60], [100, 12], [186, 60]], '#d9675b');
      p.rect(18, 60, 164, 90, '#fdf3e2');
      p.rect(18, 60, 164, 6, '#e8d5b5');
      // 窗（暖光）
      p.rect(34, 78, 40, 32, '#ffd98a'); p.rect(34, 78, 40, 3, '#e8c06a'); p.rect(53, 78, 2, 32, '#e8d5b5');
      p.rect(124, 78, 40, 32, '#ffd98a'); p.rect(143, 78, 2, 32, '#e8d5b5');
      // 门
      p.rect(84, 98, 30, 52, '#8a5a3b'); p.circle(108, 126, 2, '#fde68a');
      p.rect(80, 94, 38, 4, '#6b4430');
      p.rect(150, 20, 14, 30, '#a8754f');
      return outline(p);
    },
    glow: { x: 100, y: 50, r: 120, color: 'rgba(255,214,140,0.32)' },
  },
  mailbox: {
    draw: () => {
      const p = new Pix(18, 36);
      p.rect(7, 14, 4, 22, '#475569');
      p.rect(0, 2, 18, 14, '#3b6fd8'); p.ellipse(9, 2, 9, 3, '#3b6fd8');
      p.rect(3, 7, 12, 2, '#1e3a8a'); p.rect(16, 0, 2, 8, '#ef4444');
      return outline(p);
    },
  },
  houseWindow: { draw: () => new Pix(1, 1) },

  // ======================= 弹幕之海 =======================
  liveBadge: {
    draw: () => {
      const p = new Pix(60, 22);
      p.rect(0, 0, 60, 22, '#ef4444'); p.circle(10, 11, 4, '#ffffff');
      p.rect(20, 6, 3, 10, '#fff'); p.rect(20, 14, 7, 2, '#fff');
      p.rect(29, 6, 3, 10, '#fff');
      p.line(34, 6, 37, 16, '#fff'); p.line(40, 6, 37, 16, '#fff');
      p.rect(43, 6, 8, 2, '#fff'); p.rect(43, 10, 6, 2, '#fff'); p.rect(43, 14, 8, 2, '#fff'); p.rect(43, 6, 2, 10, '#fff');
      return outline(p);
    },
  },
  heartBox: {
    draw: () => {
      const p = new Pix(20, 18);
      p.circle(6, 6, 5, '#f472b6'); p.circle(14, 6, 5, '#f472b6');
      p.poly([[1, 8], [19, 8], [10, 18]], '#f472b6');
      p.px(5, 4, '#fff');
      return outline(p);
    },
  },

  // ======================= 天台 =======================
  vent: {
    draw: () => {
      const p = new Pix(80, 40);
      p.rect(0, 6, 80, 34, '#9aa3b8');
      for (let x = 6; x < 74; x += 8) p.rect(x, 12, 4, 22, '#6b7390');
      p.rect(0, 0, 80, 8, '#b8c0d0');
      return outline(p);
    },
    fg: true,
  },
  laundryPole: {
    draw: () => {
      const W = 7 * 16;
      const p = new Pix(W, 80);
      p.rect(2, 10, 4, 70, '#94a3b8'); p.rect(W - 6, 10, 4, 70, '#94a3b8');
      p.rect(0, 10, W, 3, '#cbd5e1');
      p.rect(20, 13, 16, 18, '#f9a8d4'); p.rect(50, 13, 14, 22, '#bfdbfe'); p.rect(76, 13, 16, 14, '#fef3c7');
      return outline(p);
    },
  },
  waterTankBig: {
    draw: () => {
      const p = new Pix(110, 120);
      p.rect(6, 20, 98, 70, '#a7b0c4'); p.ellipse(55, 20, 49, 10, '#c6cedd');
      for (let y = 34; y < 90; y += 16) p.rect(6, y, 98, 2, '#7d879e');
      p.rect(14, 90, 6, 30, '#64748b'); p.rect(90, 90, 6, 30, '#64748b'); p.rect(50, 90, 6, 30, '#64748b');
      p.rect(14, 104, 82, 3, '#64748b');
      return outline(p);
    },
  },
  antennaBig: {
    draw: () => {
      const p = new Pix(40, 150);
      p.rect(18, 10, 4, 140, '#64748b');
      for (const [y, w] of [[30, 36], [56, 28], [80, 20], [104, 14]] as [number, number][]) p.rect(20 - w / 2, y, w, 3, '#64748b');
      p.circle(20, 6, 4, '#ef4444');
      return outline(p);
    },
    glow: { x: 20, y: 144, r: 26, color: 'rgba(255,90,90,0.45)' },
  },
  railing: {
    draw: () => {
      const W = 16 * 16;
      const p = new Pix(W, 28);
      p.rect(0, 0, W, 4, '#cbd5e1');
      for (let x = 0; x < W; x += 12) p.rect(x, 4, 3, 24, '#94a3b8');
      p.rect(0, 14, W, 2, '#94a3b8');
      return outline(p);
    },
  },
  plantPot: {
    draw: () => {
      const p = new Pix(22, 30);
      p.rect(4, 18, 14, 12, '#e2885b');
      p.ellipse(11, 11, 8, 9, '#4ade80'); p.circle(8, 6, 3, '#f9a8d4'); p.circle(15, 8, 3, '#fde68a');
      return outline(p);
    },
  },
  starSign: { draw: () => new Pix(1, 1) },
};
