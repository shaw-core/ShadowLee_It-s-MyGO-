// ============================================================
// 漫画分镜过场（第一章开场/结尾、第二章入场）
// 每一页是 12×8 的格子，分镜按 [列, 行, 宽, 高] 摆放。
// art 指向 game2d/art.ts 中的像素绘制函数。
// ============================================================
import { Speaker } from './types';

export type ArtId =
  | 'city_night' | 'dousha_desk' | 'danmaku_screen' | 'novus_door' | 'glitch'
  | 'rooftop_door' | 'hands' | 'door_light'
  | 'falling' | 'block_hand';

export interface Bubble {
  who: Speaker;
  t: string;
  /** 气泡中心在分镜中的位置（0~1） */
  x: number; y: number;
  tail?: 'left' | 'right' | 'down' | 'none';
  shout?: boolean;
}

export interface Panel {
  at: [number, number, number, number];
  /** 第一章：像素画 */
  art?: ArtId;
  /** 第二章：3D 分镜（game3d/mangaShots.ts 里的镜头 id） */
  shot?: string;
  ink?: boolean;
  caption?: string;
  bubbles?: Bubble[];
  sfx?: { t: string; x: number; y: number; rot?: number; size?: number }[];
}

export interface MangaPage {
  id: string;
  panels: Panel[];
  /** 页角页码 */
  pageNo?: string;
  /** 结尾特效 */
  outro?: 'tear' | 'shatter' | 'fade';
  /** 3D：第二章的全彩立体分镜页 */
  style?: '3d';
}

export const PAGES: Record<string, MangaPage> = {
  c1_open: {
    id: 'c1_open', pageNo: 'P.001', outro: 'fade',
    panels: [
      { at: [0, 0, 7, 3], art: 'city_night', caption: '某个和往常一样的晚上。' },
      { at: [7, 0, 5, 5], art: 'dousha_desk', bubbles: [{ who: 'dousha', t: '大家晚上好～\n今天也一起玩吧！', x: 0.5, y: 0.2, tail: 'down' }] },
      { at: [0, 3, 4, 5], art: 'danmaku_screen', sfx: [{ t: '刷——', x: 0.72, y: 0.86, rot: -8, size: 1 }] },
      { at: [4, 3, 3, 5], art: 'novus_door', bubbles: [{ who: 'novus', t: '……又开播了。', x: 0.5, y: 0.16, tail: 'down' }] },
      { at: [7, 5, 5, 3], art: 'glitch', ink: true, caption: '画面，好像闪了一下。', bubbles: [{ who: 'dousha', t: '……诶？', x: 0.78, y: 0.3, tail: 'left' }] },
    ],
  },
  c1_close: {
    id: 'c1_close', pageNo: 'P.???', outro: 'tear',
    panels: [
      { at: [0, 0, 12, 3], art: 'rooftop_door', caption: '门后的光，漫了过来。' },
      { at: [0, 3, 5, 5], art: 'hands', caption: '谁都没有松手。' },
      { at: [5, 3, 7, 5], art: 'door_light', ink: true, sfx: [{ t: '吱——', x: 0.3, y: 0.3, rot: -12, size: 1.3 }] },
    ],
  },
  c2_open: {
    id: 'c2_open', pageNo: 'P.000', outro: 'shatter',
    panels: [
      { at: [0, 0, 12, 5], art: 'falling', caption: '推开门的那一刻，纸面碎成了无数个三角形。' },
      { at: [0, 5, 7, 3], art: 'block_hand', bubbles: [{ who: 'dousha', t: '……我的手？', x: 0.78, y: 0.35, tail: 'left' }] },
      { at: [7, 5, 5, 3], art: 'door_light', caption: '第二层。' },
    ],
  },

  // ---------- 第二章：关卡之间的 3D 分镜 ----------
  c2_mid1: {
    id: 'c2_mid1', pageNo: '2-1', outro: 'fade', style: '3d',
    panels: [
      { at: [0, 0, 7, 4], shot: 'm1_wide', caption: '岛，一座接着一座。' },
      { at: [7, 0, 5, 4], shot: 'm1_dizzy', bubbles: [{ who: 'dousha', t: '头……有点晕。', x: 0.5, y: 0.16, tail: 'down' }], sfx: [{ t: '晃——', x: 0.2, y: 0.78, rot: -14, size: 1 }] },
      { at: [0, 4, 5, 4], shot: 'm1_offer', bubbles: [{ who: 'novus', t: '张嘴。\n薄荷味的。', x: 0.32, y: 0.2, tail: 'down' }] },
      { at: [5, 4, 7, 4], shot: 'm1_mint', caption: '凉凉的。脚下不晃了。', sfx: [{ t: '咔哒', x: 0.82, y: 0.3, rot: 10, size: 0.9 }] },
    ],
  },
  c2_mid2: {
    id: 'c2_mid2', pageNo: '2-2', outro: 'fade', style: '3d',
    panels: [
      { at: [0, 0, 12, 4], shot: 'm2_street', bubbles: [{ who: 'dousha', t: '那是……\n我们住的那条街？', x: 0.24, y: 0.3, tail: 'down' }] },
      { at: [0, 4, 6, 4], shot: 'm2_hold', bubbles: [{ who: 'novus', t: '别靠太近。', x: 0.7, y: 0.2, tail: 'down' }] },
      { at: [6, 4, 6, 4], shot: 'm2_panda', caption: '熊猫一直看着她们的背影。' },
    ],
  },
  c2_mid3: {
    id: 'c2_mid3', pageNo: '2-3', outro: 'fade', style: '3d',
    panels: [
      { at: [0, 0, 5, 8], shot: 'm3_wire', caption: '在线框里，只有她还是彩色的。' },
      { at: [5, 0, 7, 4], shot: 'm3_hands', bubbles: [{ who: 'dousha', t: '……小室，\n你的手是暖的。', x: 0.3, y: 0.24, tail: 'right' }] },
      { at: [5, 4, 7, 4], shot: 'm3_smile', bubbles: [{ who: 'novus', t: '你的也是。', x: 0.24, y: 0.22, tail: 'right' }] },
    ],
  },
  c2_mid4: {
    id: 'c2_mid4', pageNo: '2-4', outro: 'fade', style: '3d',
    panels: [
      { at: [0, 0, 12, 5], shot: 'm4_crack', caption: '天空的那道缝，越来越近了。' },
      { at: [0, 5, 6, 3], shot: 'm4_dousha', bubbles: [{ who: 'dousha', t: '如果那边\n什么都没有呢？', x: 0.72, y: 0.3, tail: 'left' }] },
      { at: [6, 5, 6, 3], shot: 'm4_roomie', bubbles: [{ who: 'novus', t: '那就一起看看\n什么都没有的样子。', x: 0.3, y: 0.3, tail: 'right' }] },
    ],
  },
};

// ---------- 隐藏系统 · 序（只有电视头小豆进去） ----------
PAGES.arc_open = {
  id: 'arc_open', pageNo: '∅', outro: 'shatter', style: '3d',
  panels: [
    { at: [0, 0, 7, 4], shot: 'x1_archived', caption: '那一条线上，门没有开。' },
    { at: [7, 0, 5, 4], shot: 'x2_face', bubbles: [{ who: 'tv', t: '……再来一次。', x: 0.32, y: 0.2, tail: 'right' }], sfx: [{ t: '滋——', x: 0.78, y: 0.82, rot: -10, size: 0.9 }] },
    { at: [0, 4, 5, 4], shot: 'x3_layers', caption: '穿过一页，又一页。' },
    { at: [5, 4, 7, 4], shot: 'x4_tree', caption: '这里没有时间戳。' },
  ],
};

/** 第二章：通关第 n 关之后、进入第 n+1 关之前播放的分镜页 */
export const CH2_MID_PAGE: Record<number, string> = { 1: 'c2_mid1', 2: 'c2_mid2', 3: 'c2_mid3', 4: 'c2_mid4' };
