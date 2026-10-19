// ============================================================
// 第一章角色像素小人（24×34，脚底在 y=33，朝右绘制，朝左时水平翻转）
// 李豆沙：白长发 + 蓝色内层挑染 · 熊猫耳 · 推到头顶的大墨镜 · 蓝外套 · 右脸蓝十字
// 室友姐：橘色长发 · 猫耳 · 奶油色上衣 · 琥珀色眼睛
// ============================================================
import { Pix, inkRemap } from './pixel';

export interface Pose {
  bob: number;            // 身体上下（像素）
  legL: [number, number]; // 左腿（远侧）偏移 x,y
  legR: [number, number]; // 右腿（近侧）偏移
  armL: number;           // 手臂摆动（像素，正=向前）
  armR: number;
  armUp?: boolean;        // 双手举起（跳跃）
  hair: number;           // 发梢摆动
  blink?: boolean;
  squash?: number;        // 落地压缩
}

type Who = 'dousha' | 'novus';

const PAL = {
  dousha: {
    hair: '#eef1f8', hairS: '#c4cad8', hairIn: '#7aa7ee', skin: '#ffe7d6', skinS: '#f6c9b3',
    top: '#3b6fd8', topS: '#2a51a8', shirt: '#ffffff', bottom: '#27304f', sock: '#ffffff',
    shoe: '#3a2a26', eye: '#2c5bd6', ear: '#2a2a35', glass: '#4a3632', glassHi: '#8a6a5e', mark: '#3b82f6',
    outline: '#1c1f3b',
  },
  novus: {
    hair: '#e07a43', hairS: '#b65a2b', hairIn: '#f0a070', skin: '#ffe7d6', skinS: '#f6c9b3',
    top: '#fbf0dc', topS: '#e8d5b5', shirt: '#ffffff', bottom: '#f6e4c4', sock: '#ffe7d6',
    shoe: '#8a5a3b', eye: '#9a5b2e', ear: '#e07a43', glass: '', glassHi: '', mark: '',
    outline: '#3b2318',
  },
};

export const SPR_W = 26, SPR_H = 38;

const drawChibi = (who: Who, pose: Pose, ink = false): Pix => {
  const P = ink ? { ...PAL[who], eye: '#1c1c2a', mark: '#1c1c2a', hairIn: '#d0d4dc' } : PAL[who];
  const p = new Pix(SPR_W, SPR_H);
  const sq = pose.squash ?? 0;
  const by = pose.bob + sq;        // 身体整体下沉
  const hy = by;                   // 头跟随身体
  const cx = 13.5, cy = 12 + hy;   // 头中心

  // ---- 后发（在身体之后） ----
  if (who === 'dousha') {
    const sw = pose.hair;
    p.poly([[5.5, cy - 2], [11, cy - 4], [11, cy + 14 + by * 0], [8 - sw, cy + 17], [5 - sw, cy + 14]], P.hair);
    p.poly([[6 - sw, cy + 10], [8, cy + 9], [8 - sw, cy + 16]], P.hairIn);
    p.rect(9, cy + 2, 1, 10, P.hairS);
  } else {
    // 长发：垂到背后，跑起来发梢会甩
    const sw = pose.hair;
    p.ellipse(cx - 0.5, cy + 0.5, 8.4, 7.6, P.hair);
    p.poly([[5, cy - 1], [11, cy - 3], [11, cy + 13], [8 - sw, cy + 16], [4.5 - sw, cy + 13]], P.hair);
    p.poly([[5.5 - sw, cy + 11], [8, cy + 10], [7.5 - sw, cy + 15]], P.hairIn);
    p.rect(9, cy + 2, 1, 10, P.hairS);
  }

  // ---- 腿 ----
  const legBase = 30 + by;
  const leg = (x: number, off: [number, number], near: boolean) => {
    const lx = x + off[0], ly = legBase + off[1];
    const h = Math.max(2, 5 - sq);
    p.rect(lx, ly, 2, h, near ? P.skin : P.skinS);
    if (who === 'dousha') p.rect(lx, ly + h - 2, 2, 2, near ? P.sock : '#dde3ee');
    p.rect(lx - (near ? 0 : 1), ly + h, 3, 2, P.shoe);
  };
  leg(10, pose.legL, false);
  leg(14, pose.legR, true);

  // ---- 下装 ----
  if (who === 'dousha') {
    p.rect(9, 27 + by, 8, 3, P.bottom);
  } else {
    p.poly([[8.5, 26 + by], [17.5, 26 + by], [19, 31 + by], [7, 31 + by]], P.bottom);
    p.rect(7, 30 + by, 12, 1, '#e3c597');
  }

  // ---- 远侧手臂 ----
  const armY = 20 + by;
  const arm = (x: number, sw: number, col: string, skin: string) => {
    if (pose.armUp) {
      p.rect(x, armY - 5, 2, 6, col);
      p.rect(x, armY - 7, 2, 2, skin);
    } else {
      p.rect(x + sw, armY, 2, 6, col);
      p.rect(x + sw, armY + 6, 2, 2, skin);
    }
  };
  arm(7, -pose.armL, P.topS, P.skinS);

  // ---- 身体 ----
  p.poly([[9, 19 + by], [17, 19 + by], [18, 28 + by], [8, 28 + by]], P.top);
  if (who === 'dousha') {
    p.rect(12, 19 + by, 3, 8, P.shirt);
    p.rect(11, 19 + by, 1, 9, P.topS);
    p.rect(15, 19 + by, 1, 9, P.topS);
    p.rect(8, 27 + by, 11, 1, P.topS);
    p.px(13, 22 + by, '#f9a8d4');
  } else {
    p.rect(11, 20 + by, 5, 1, '#e8d5b5');
    p.px(13, 21 + by, '#e8d5b5');
    p.rect(8, 25 + by, 10, 1, P.topS);
  }

  // ---- 近侧手臂 ----
  arm(17, pose.armR, P.top, P.skin);

  // ---- 头 ----
  p.ellipse(cx + 0.3, cy + 1, 6.6, 6.2, P.skin);
  // 顶发
  p.ellipse(cx - 0.2, cy - 2.8, 7.6, 5.2, P.hair);
  // 锯齿刘海
  const bangs: [number, number][] = [[8, 1.5], [10, 2.5], [12, 1.5], [14, 3], [16, 2], [18, 2.5]];
  bangs.forEach(([bx, len]) => p.poly([[bx - 1.4, cy - 1.5], [bx + 1.6, cy - 1.5], [bx + 0.3, cy - 1.5 + len + 1.2]], P.hair));
  p.rect(6, cy - 1, 2, 7, P.hair);                 // 后侧鬓发
  p.rect(19, cy - 1, 2, who === 'novus' ? 9 : 5, P.hair);  // 脸前侧发（室友姐的长发垂到肩前）
  if (who === 'dousha') p.rect(20, cy + 1, 1, 4, P.hairIn);
  p.rect(9, cy - 7, 8, 1, '#ffffff80');            // 头顶高光

  // 眼睛（3/4 朝右）
  const eyeY = cy + 1;
  const eye = (x: number) => {
    if (pose.blink) { p.rect(x, eyeY + 1, 2, 1, '#2a2440'); return; }
    p.rect(x, eyeY - 1, 2, 3, '#2a2440');
    p.rect(x, eyeY + 0, 2, 2, P.eye);
    p.px(x, eyeY - 1, '#ffffff');
  };
  eye(12); eye(17);
  // 腮红 / 嘴
  p.rect(10, eyeY + 3, 2, 1, '#ffb3bf');
  p.px(19, eyeY + 3, '#ffb3bf');
  p.px(15, eyeY + 4, '#b6485a');
  // 右脸蓝十字（豆沙）
  if (who === 'dousha') {
    p.px(19, eyeY + 4, P.mark); p.px(19, eyeY + 2.6, '#93c5fd');
  }

  // 耳朵 + 墨镜
  if (who === 'dousha') {
    p.circle(7.5, cy - 6.5, 2.4, P.ear);
    p.circle(18.5, cy - 7, 2.4, P.ear);
    p.px(7.5, cy - 7, '#4a4a58'); p.px(18.5, cy - 7.5, '#4a4a58');
    p.circle(11.3, cy - 5.2, 1.9, P.glass);
    p.circle(15.7, cy - 5.4, 1.9, P.glass);
    p.rect(12.5, cy - 6, 2, 1, P.glass);
    p.px(10.6, cy - 6, P.glassHi); p.px(15, cy - 6.2, P.glassHi);
  } else {
    p.poly([[6.5, cy - 4], [8.5, cy - 10.5], [11, cy - 5.5]], P.ear);
    p.poly([[15.5, cy - 5.5], [19, cy - 10.5], [20.5, cy - 3.5]], P.ear);
    p.px(8.4, cy - 7, '#ffc8a8'); p.px(18.7, cy - 7, '#ffc8a8');
  }

  p.outline(P.outline);
  return p;
};

// ---- 动作帧表 ----
const RUN: Pose[] = [
  { bob: 0, legL: [-2, 0], legR: [2, -1], armL: -1, armR: 1, hair: 1 },
  { bob: -1, legL: [-1, -1], legR: [1, 0], armL: 0, armR: 0, hair: 1 },
  { bob: 0, legL: [0, -2], legR: [0, 0], armL: 1, armR: -1, hair: 2 },
  { bob: 0, legL: [2, -1], legR: [-2, 0], armL: 1, armR: -1, hair: 1 },
  { bob: -1, legL: [1, 0], legR: [-1, -1], armL: 0, armR: 0, hair: 1 },
  { bob: 0, legL: [0, 0], legR: [0, -2], armL: -1, armR: 1, hair: 2 },
];
const IDLE: Pose[] = [
  { bob: 0, legL: [0, 0], legR: [0, 0], armL: 0, armR: 0, hair: 0 },
  { bob: 1, legL: [0, -1], legR: [0, -1], armL: 0, armR: 0, hair: 0 },
];
const JUMP: Pose = { bob: -1, legL: [-1, -2], legR: [1, -3], armL: 0, armR: 0, armUp: true, hair: -1 };
const FALL: Pose = { bob: 0, legL: [-2, 0], legR: [2, -1], armL: 2, armR: -2, armUp: true, hair: -2 };
const LAND: Pose = { bob: 0, legL: [-1, -1], legR: [1, -1], armL: 1, armR: 1, hair: 1, squash: 2 };
const WAVE: Pose = { bob: 0, legL: [0, 0], legR: [0, 0], armL: 0, armR: 0, armUp: false, hair: 0 };

export type Anim = 'idle' | 'run' | 'jump' | 'fall' | 'land' | 'blink';

export interface SpriteSet {
  frames: Record<Anim, HTMLCanvasElement[][]>; // [anim][frame][0=right,1=left]
}

const build = (who: Who, ink: boolean): SpriteSet => {
  const mk = (pose: Pose) => {
    const r = drawChibi(who, pose, ink);
    if (ink) inkRemap(r);
    const l = r.clone(); l.flipX();
    return [r.toCanvas(), l.toCanvas()];
  };
  return {
    frames: {
      idle: IDLE.map(mk),
      run: RUN.map(mk),
      jump: [mk(JUMP)],
      fall: [mk(FALL)],
      land: [mk(LAND)],
      blink: [mk({ ...IDLE[0], blink: true })],
    },
  };
};

const sets = new Map<string, SpriteSet>();
export const getSprites = (who: Who, ink: boolean): SpriteSet => {
  const k = who + (ink ? ':ink' : ':col');
  let s = sets.get(k);
  if (!s) { s = build(who, ink); sets.set(k, s); }
  return s;
};

/** 室友姐挥手帧（站立 + 举起近侧手） */
export const novusWave = (ink: boolean, t: number): HTMLCanvasElement => {
  const k = `wave:${ink}:${t}`;
  const cached = waveCache.get(k);
  if (cached) return cached;
  const p = drawChibi('novus', { ...WAVE, armUp: t === 1, bob: t === 1 ? 0 : 1 }, ink);
  if (ink) inkRemap(p);
  const c = p.toCanvas();
  waveCache.set(k, c);
  return c;
};
const waveCache = new Map<string, HTMLCanvasElement>();
