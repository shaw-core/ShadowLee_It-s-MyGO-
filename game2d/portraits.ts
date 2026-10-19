// ============================================================
// 对话头像：64×64 像素半身像，多表情
// ============================================================
import { Pix, inkRemap } from './pixel';
import type { Face } from '../story/types';

type Who = 'dousha' | 'novus' | 'kimo';

const OUT = '#1c1f3b';
const SKIN = '#ffe7d6', SKIN_S = '#f3c4ad', BLUSH = '#ffadbd';
const DARK = '#262238';

// ---------------- 眼睛与嘴 ----------------
const eyePair = (p: Pix, face: Face, iris: string, irisLo: string, lx: number, rx: number, y: number) => {
  const closedArc = (cx: number, up: boolean) => {
    // ^ ^ 笑眼 或 ‿ 闭眼
    for (let i = -3; i <= 3; i++) {
      const dy = up ? -Math.round(Math.sqrt(9 - i * i) * 0.7) : Math.round(Math.sqrt(9 - i * i) * 0.5);
      p.px(cx + i, y + 3 + dy, DARK);
      p.px(cx + i, y + 4 + dy, DARK);
    }
  };
  const open = (cx: number, tall = 4, lid = 0) => {
    p.ellipse(cx, y + 4.5, 3.3, tall, iris);
    p.ellipse(cx, y + 6, 2.6, tall - 1.6, irisLo);
    p.ellipse(cx, y + 4.5, 1.4, Math.max(1.2, tall - 2.4), '#121a3a');
    p.rect(cx - 2, y + 2 + lid, 2, 2, '#ffffff');
    p.px(cx + 2, y + 7, '#ffffff');
    // 上睫毛
    p.rect(cx - 4, y + lid, 8, 2, DARK);
    p.px(cx + 4, y + lid + 1, DARK);
    if (lid > 0) p.rect(cx - 3, y, 7, lid, SKIN);
  };
  const spiral = (cx: number) => {
    p.circle(cx, y + 4.5, 3.5, '#ffffff');
    for (let a = 0; a < Math.PI * 4; a += 0.25) {
      const r = a * 0.27;
      p.px(cx + Math.cos(a) * r, y + 4.5 + Math.sin(a) * r, DARK);
    }
  };
  switch (face) {
    case 'grin': closedArc(lx, true); closedArc(rx, true); break;
    case 'closed': closedArc(lx, false); closedArc(rx, false); break;
    case 'dizzy': spiral(lx); spiral(rx); break;
    case 'surprised': open(lx, 5); open(rx, 5); break;
    case 'sad': case 'worried': open(lx, 4, 1); open(rx, 4, 1); break;
    case 'serious': open(lx, 3.6, 2); open(rx, 3.6, 2); break;
    case 'tease': open(lx, 3.6, 2); closedArc(rx, true); break;
    case 'pout': open(lx, 3.8, 1); open(rx, 3.8, 1); break;
    default: open(lx); open(rx);
  }
  // 眉毛（盖在刘海上）
  const brow = (cx: number, tilt: number) => {
    for (let i = -3; i <= 3; i++) p.px(cx + i, y - 4 + Math.round(i * tilt * (cx < 32 ? 1 : -1)), DARK);
  };
  if (face === 'sad' || face === 'worried') { brow(lx, -0.35); brow(rx, -0.35); }
  if (face === 'serious' || face === 'pout') { brow(lx, 0.3); brow(rx, 0.3); }
  if (face === 'surprised') { brow(lx, 0); brow(rx, 0); }
};

const mouth = (p: Pix, face: Face, cx: number, y: number) => {
  const M = '#b4465a';
  switch (face) {
    case 'grin':
      p.poly([[cx - 4, y - 1], [cx + 4, y - 1], [cx + 2, y + 3], [cx - 2, y + 3]], '#8e2a3c');
      p.rect(cx - 2, y + 1, 4, 2, '#f58ca0');
      break;
    case 'surprised': p.ellipse(cx, y + 1, 2, 2.4, '#8e2a3c'); break;
    case 'smile': case 'tease':
      p.px(cx - 3, y - 1, M); p.rect(cx - 2, y, 4, 1, M); p.px(cx + 2, y - 1, M); break;
    case 'sad': p.px(cx - 2, y + 1, M); p.rect(cx - 1, y, 2, 1, M); p.px(cx + 1, y + 1, M); break;
    case 'pout': p.rect(cx - 1, y - 1, 2, 3, M); p.px(cx + 1, y, M); break;
    case 'worried': case 'dizzy':
      for (let i = -3; i <= 3; i++) p.px(cx + i, y + (i % 2 === 0 ? 0 : 1), M); break;
    case 'serious': p.rect(cx - 2, y, 4, 1, M); break;
    default: p.rect(cx - 1, y, 3, 1, M); p.px(cx - 2, y - 1, M);
  }
};

const blushLines = (p: Pix, x: number, y: number) => {
  for (let i = 0; i < 3; i++) p.line(x + i * 3, y + 2, x + i * 3 + 2, y, '#f0708a');
};
const sweat = (p: Pix, x: number, y: number) => {
  p.poly([[x, y], [x - 2, y + 4], [x + 2, y + 4]], '#bfe0ff');
  p.ellipse(x, y + 4.5, 2.2, 2, '#bfe0ff');
  p.px(x - 1, y + 3, '#ffffff');
};

// ---------------- 李豆沙 ----------------
const drawDousha = (face: Face): Pix => {
  const p = new Pix(64, 64);
  const HAIR = '#eef1f8', HAIR_S = '#c6ccdb', HAIR_IN = '#7aa7ee';
  // 后发
  p.ellipse(32, 27, 21.5, 17, HAIR);
  p.poly([[10.5, 30], [53.5, 30], [57, 63], [7, 63]], HAIR);
  p.poly([[50, 34], [55, 40], [57, 63], [52, 63]], HAIR_IN);
  p.poly([[11, 40], [14, 40], [10, 63], [7, 63]], HAIR_S);
  // 衣服
  p.poly([[6, 64], [9, 55], [20, 49], [44, 49], [55, 55], [58, 64]], '#3b6fd8');
  p.poly([[25, 49], [39, 49], [32, 62]], '#ffffff');
  p.line(25, 49, 31, 62, '#2a51a8'); p.line(39, 49, 33, 62, '#2a51a8');
  p.poly([[9, 55], [20, 49], [22, 52], [12, 60]], '#2a51a8');
  p.poly([[55, 55], [44, 49], [42, 52], [52, 60]], '#2a51a8');
  // 脖子
  p.rect(27, 42, 10, 9, SKIN); p.rect(27, 42, 10, 2, SKIN_S);
  // 脸
  p.ellipse(32, 32.5, 14.2, 13.5, SKIN);
  p.poly([[20, 38], [44, 38], [36, 47], [28, 47]], SKIN);
  // 顶发 + 刘海
  p.ellipse(32, 22, 17.5, 12.5, HAIR);
  const bang = (x: number, len: number, w = 3.4) => p.poly([[x - w, 21], [x + w, 21], [x + 0.6, 21 + len]], HAIR);
  bang(17, 13); bang(21, 10); bang(25, 12); bang(29.5, 8); bang(34, 11); bang(38.5, 9); bang(42.5, 12); bang(46.5, 14);
  // 侧发
  p.poly([[13, 22], [19, 24], [19, 49], [14, 52]], HAIR);
  p.poly([[45, 24], [51, 22], [50, 52], [45, 49]], HAIR);
  p.poly([[47, 34], [50, 32], [50, 50], [47, 47]], HAIR_IN);
  p.line(20, 14, 44, 14, '#ffffff');
  // 熊猫耳
  p.circle(14, 10, 6.6, '#2a2a35'); p.circle(14, 10.5, 3, '#4a4a58');
  p.circle(50, 10, 6.6, '#2a2a35'); p.circle(50, 10.5, 3, '#4a4a58');
  // 头顶大墨镜
  p.circle(24.5, 14, 5.2, '#4a3632'); p.circle(39.5, 14, 5.2, '#4a3632');
  p.rect(29, 13, 6, 2, '#4a3632');
  p.line(21, 12, 24, 10, '#9c7b6c'); p.line(36, 12, 39, 10, '#9c7b6c');
  // 眼 / 嘴 / 腮红
  eyePair(p, face, '#2c5bd6', '#6a9af6', 24.5, 39.5, 29);
  if (face !== 'dizzy') {
    p.ellipse(22, 41, 2.6, 1.1, BLUSH);
    p.ellipse(43, 41, 2.6, 1.1, BLUSH);
  }
  if (face === 'blush') { blushLines(p, 17, 39); blushLines(p, 39, 39); }
  // 右脸蓝十字
  p.rect(17, 40, 3, 1, '#3b82f6'); p.rect(18, 39, 1, 3, '#3b82f6');
  p.px(32, 38, SKIN_S);
  mouth(p, face, 32, 44);
  if (face === 'worried' || face === 'dizzy') sweat(p, 49, 24);
  p.outline(OUT);
  return p;
};

// ---------------- 室友姐 ----------------
const drawNovus = (face: Face): Pix => {
  const p = new Pix(64, 64);
  const HAIR = '#e07a43', HAIR_S = '#b65a2b', HAIR_HI = '#f4a06e';
  // 猫耳
  p.poly([[12, 20], [16, 2], [27, 13]], HAIR); p.poly([[16, 15], [17, 7], [23, 13]], '#ffc8a8');
  p.poly([[37, 13], [48, 2], [52, 20]], HAIR); p.poly([[41, 13], [47, 7], [48, 15]], '#ffc8a8');
  // 后发（长发，披到肩膀以下）
  p.ellipse(32, 31, 19.5, 18, HAIR);
  p.rect(12, 30, 40, 34, HAIR);
  p.rect(12, 56, 40, 8, HAIR_S);
  // 衣服：奶油色高领毛衣
  p.poly([[6, 64], [9, 55], [21, 50], [43, 50], [55, 55], [58, 64]], '#fbf0dc');
  p.rect(25, 46, 14, 7, '#f3e3c4');
  for (let x = 12; x < 54; x += 4) p.line(x, 56, x - 1, 63, '#ead8b8');
  // 脖子 + 脸
  p.rect(28, 42, 8, 5, SKIN);
  p.ellipse(32, 32.5, 13.8, 13.2, SKIN);
  p.poly([[21, 38], [43, 38], [36, 46], [28, 46]], SKIN);
  // 刘海（厚）
  p.ellipse(32, 21, 17, 11, HAIR);
  const bang = (x: number, len: number) => p.poly([[x - 4, 20], [x + 4, 20], [x, 20 + len]], HAIR);
  bang(18, 11); bang(24, 9); bang(30, 10); bang(36, 9); bang(42, 10); bang(47, 12);
  p.line(22, 13, 40, 11, HAIR_HI);
  // 包脸侧发：一直垂到胸前
  p.poly([[14, 22], [20, 25], [21, 58], [18, 63], [14, 60]], HAIR);
  p.poly([[44, 25], [50, 22], [50, 60], [46, 63], [43, 58]], HAIR);
  p.line(16, 50, 17, 60, HAIR_S); p.line(48, 50, 47, 60, HAIR_S);
  // 眼 / 嘴
  const f: Face = face === 'normal' ? 'normal' : face;
  eyePair(p, f, '#9a5b2e', '#d08a4c', 25, 39, 29);
  if (face !== 'dizzy') { p.ellipse(22, 41, 2.4, 1, BLUSH); p.ellipse(42, 41, 2.4, 1, BLUSH); }
  if (face === 'blush') { blushLines(p, 17, 39); blushLines(p, 39, 39); }
  p.px(32, 38, SKIN_S);
  mouth(p, face, 32, 43);
  if (face === 'worried') sweat(p, 48, 26);
  p.outline('#3b2318');
  return p;
};

// ---------------- Kimo熊（熊猫） ----------------
const drawKimo = (face: Face): Pix => {
  const p = new Pix(64, 64);
  const BLACK = '#2a2d33';
  p.circle(14, 14, 8.5, BLACK); p.circle(50, 14, 8.5, BLACK);
  // 身体 + 粉围巾
  p.ellipse(32, 62, 22, 10, '#ffffff');
  p.rect(14, 52, 36, 6, '#f472b6'); p.rect(38, 52, 6, 10, '#ec4899');
  // 头
  p.ellipse(32, 35, 23, 20.5, '#ffffff');
  p.ellipse(32, 44, 19, 8, '#fbf7f0');
  // 眼斑
  p.ellipse(21.5, 34, 6.5, 8, BLACK); p.ellipse(42.5, 34, 6.5, 8, BLACK);
  const eye = (cx: number) => {
    if (face === 'smile' || face === 'grin' || face === 'closed') {
      for (let i = -2; i <= 2; i++) p.px(cx + i, 34 - Math.round(Math.sqrt(4 - i * i) * (face === 'closed' ? -0.6 : 0.8)), '#ffffff');
      return;
    }
    const h = face === 'sad' ? 2.2 : face === 'serious' ? 2 : 3;
    p.ellipse(cx, 34.5, 2.4, h, '#3556c9');
    p.px(cx - 1, 33, '#ffffff');
    if (face === 'sad') p.rect(cx - 3, 31, 6, 2, BLACK);
  };
  eye(22); eye(42);
  // 鼻子 + ω
  p.ellipse(32, 42, 3, 2, BLACK);
  p.px(30, 45, BLACK); p.px(31, 46, BLACK); p.px(32, 45, BLACK); p.px(33, 46, BLACK); p.px(34, 45, BLACK);
  // 右脸蓝星
  const star: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? 4 : 1.8;
    star.push([47 + Math.cos(a) * r, 44 + Math.sin(a) * r]);
  }
  p.poly(star, '#8db8f5');
  p.ellipse(18, 44, 2.5, 1, '#ffd0da');
  p.outline('#1a1c22');
  return p;
};

const cacheMap = new Map<string, HTMLCanvasElement>();
export const portrait = (who: Who, face: Face = 'normal', ink = false): HTMLCanvasElement => {
  const k = `${who}:${face}:${ink}`;
  let c = cacheMap.get(k);
  if (c) return c;
  const p = who === 'dousha' ? drawDousha(face) : who === 'novus' ? drawNovus(face) : drawKimo(face);
  if (ink) inkRemap(p);
  c = p.toCanvas();
  cacheMap.set(k, c);
  return c;
};

export const ALL_FACES: Face[] = ['normal', 'smile', 'grin', 'blush', 'surprised', 'sad', 'worried', 'dizzy', 'pout', 'closed', 'serious', 'tease'];
