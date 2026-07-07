// ============================================================
// 《李豆沙的次元冲刺·后编》 —— 原生 3D 关卡（加长版）
// 坐标系：y 向上。玩家跳跃最高 ~1.8、最远 ~4.2；弹跳菇弹高 ~4.1。
// 设计约束：普通台阶 ≤1.5，缺口 ≤3.2，弹跳菇上升 ≤3.5。
// 机制一览：图层切换 / 移动平台 / 世界重排(TRIGGER+shiftTo) /
//          弹跳菇(BOUNCE) / 闪烁平台(FADE) / 碎裂平台(CRUMBLE)
// ============================================================

export type LayerMask3D = 'REAL' | 'MANGA' | 'BOTH';

export type EntityType3D =
  | 'PLATFORM'
  | 'MOVER'       // 往返移动平台
  | 'HAZARD'      // 尖刺
  | 'PAGE'        // 纸条页（剧情钥匙）
  | 'SHARD'       // 薄荷糖
  | 'CHECKPOINT'  // 熊猫存档锚点
  | 'GOAL'        // 终点
  | 'TEXT'        // 提示文字
  | 'TRIGGER'     // 隐形触发区（世界重排）
  | 'BOUNCE'      // 弹跳菇
  | 'FADE'        // 闪烁平台（周期性消失）
  | 'CRUMBLE';    // 碎裂平台（踩上后塌落，稍后重生）

export interface Entity3D {
  id: string;
  type: EntityType3D;
  x: number; y: number; z: number;      // 中心点
  w?: number; h?: number; d?: number;   // 尺寸
  layerMask: LayerMask3D;
  color?: number;
  text?: string;
  // MOVER 专用：
  moveTo?: { x: number; y: number; z: number };
  period?: number;
  // 世界重排专用：
  shiftTo?: { x: number; y: number; z: number };
  shiftGroup?: number;
  // FADE 专用：
  fadePeriod?: number;                   // 一个显隐周期（秒）
  fadeOffset?: number;                   // 相位偏移（弧度）
}

export interface Level3D {
  id: number;
  name: string;
  subtitle: string;
  spawn: { x: number; y: number; z: number };
  entities: Entity3D[];
}

// ---- 简写工具 ----
const P = (id: string, x: number, y: number, z: number, w: number, d: number, mask: LayerMask3D = 'BOTH', h = 0.6, color?: number): Entity3D =>
  ({ id, type: 'PLATFORM', x, y, z, w, h, d, layerMask: mask, color });
const MV = (id: string, x: number, y: number, z: number, w: number, d: number, to: {x:number,y:number,z:number}, period: number, mask: LayerMask3D = 'BOTH'): Entity3D =>
  ({ id, type: 'MOVER', x, y, z, w, h: 0.5, d, layerMask: mask, moveTo: to, period });
const HZ = (id: string, x: number, y: number, z: number, w: number, d: number, mask: LayerMask3D = 'BOTH'): Entity3D =>
  ({ id, type: 'HAZARD', x, y, z, w, h: 0.7, d, layerMask: mask });
const PAGE = (id: string, x: number, y: number, z: number): Entity3D =>
  ({ id, type: 'PAGE', x, y, z, layerMask: 'BOTH' });
const SH = (id: string, x: number, y: number, z: number): Entity3D =>
  ({ id, type: 'SHARD', x, y, z, layerMask: 'BOTH' });
const CP = (id: string, x: number, y: number, z: number): Entity3D =>
  ({ id, type: 'CHECKPOINT', x, y, z, layerMask: 'BOTH' });
const GOAL = (id: string, x: number, y: number, z: number): Entity3D =>
  ({ id, type: 'GOAL', x, y, z, layerMask: 'BOTH' });
const TX = (id: string, x: number, y: number, z: number, text: string): Entity3D =>
  ({ id, type: 'TEXT', x, y, z, layerMask: 'BOTH', text });
const BN = (id: string, x: number, y: number, z: number, w = 2.2): Entity3D =>
  ({ id, type: 'BOUNCE', x, y, z, w, h: 0.4, d: w, layerMask: 'BOTH' });
const FD = (id: string, x: number, y: number, z: number, w: number, d: number, period: number, offset: number, mask: LayerMask3D = 'BOTH'): Entity3D =>
  ({ id, type: 'FADE', x, y, z, w, h: 0.5, d, layerMask: mask, fadePeriod: period, fadeOffset: offset });
const CRB = (id: string, x: number, y: number, z: number, w = 2.6, mask: LayerMask3D = 'BOTH'): Entity3D =>
  ({ id, type: 'CRUMBLE', x, y, z, w, h: 0.5, d: w, layerMask: mask });

export const LEVELS3D: Level3D[] = [
  // ============ 第1关：教学 —— 认识第三个轴（+弹跳菇上天） ============
  {
    id: 1,
    name: '第1关：多出来的一维',
    subtitle: '这个世界……好像变得有厚度了？',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l1_start', 0, 0.7, 0, 9, 9),
      CP('l1_cp0', -2.5, 1.7, 2.5),
      TX('l1_t1', 0, 3.2, -3, 'WASD 移动 · 拖动鼠标转视角 · 空格跳跃'),
      // 台阶教学
      P('l1_s1', 6.5, 1.0, 0, 3, 3),
      P('l1_s2', 10, 1.6, 0, 3, 3),
      SH('shard3d_l1_1', 10, 3.0, 0),
      TX('l1_t4', 10, 3.9, 2, '头晕的话，吃小室放的薄荷糖！'),
      // Q 切换教学
      TX('l1_t2', 13, 4.2, 0, '按 Q 切换到线框层！'),
      P('l1_bridge', 14.5, 1.6, 0, 5, 2.4, 'MANGA', 0.4),
      P('l1_isle', 20, 1.6, 0, 7, 7),
      CP('l1_cp1', 20, 2.6, 0),
      // 深度轴支线：纸条页
      TX('l1_t3', 20, 4.4, 3.2, '侧面好像有什么东西……'),
      P('l1_side1', 20, 2.1, 6.5, 2.4, 2.4),
      P('l1_side2', 20, 2.7, 10, 2.4, 2.4),
      PAGE('page3d_ch1', 20, 4.0, 10),
      // 现实/线框交替踏板
      P('l1_a1', 25.5, 2.0, 0, 2.6, 2.6, 'REAL'),
      P('l1_a2', 29, 2.4, 0, 2.6, 2.6, 'MANGA'),
      SH('shard3d_l1_2', 29, 3.8, 0),
      P('l1_end', 34, 2.4, 0, 8, 8),
      SH('shard3d_l1_3', 34, 4.0, 2.5),
      // ---- 加长段：弹跳菇教学，上天 ----
      TX('l1_t5', 38.5, 4.8, 0, '弹跳菇！踩上去！'),
      BN('l1_b1', 38.5, 2.8, 0),
      P('l1_sky1', 41.5, 5.8, 0, 3, 3),
      SH('shard3d_l1_4', 41.5, 7.3, 0),
      P('l1_sky2', 45.5, 6.2, 0, 3, 3),
      CP('l1_cp2', 45.5, 7.2, 0),
      P('l1_sky3', 48.5, 6.2, -2.2, 2.6, 2.6, 'MANGA'),
      P('l1_end2', 52, 6.2, -2.2, 6, 6),
      SH('shard3d_l1_5', 52, 7.8, 0),
      GOAL('l1_goal', 53.5, 7.8, -2.2),
    ],
  },

  // ============ 第2关：空中回廊（+闪烁平台走廊） ============
  {
    id: 2,
    name: '第2关：空中回廊',
    subtitle: '路不再只通向前方。',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l2_start', 0, 0.7, 0, 7, 7),
      CP('l2_cp0', -2, 1.7, 2),
      P('l2_p1', 5.5, 1.1, 0, 3, 3),
      // 拐进 z 轴
      P('l2_p2', 8.5, 1.5, -4, 3, 3),
      P('l2_p3', 8.5, 1.9, -8.5, 3, 3),
      SH('shard3d_l2_1', 8.5, 3.3, -8.5),
      // 尖刺大平台：中间一条安全窄道
      P('l2_spikefloor', 15, 1.9, -8.5, 9, 7, 'BOTH', 0.6, 0x94a3b8),
      HZ('l2_hz1', 15, 2.55, -10.4, 8.4, 2.6),
      HZ('l2_hz2', 15, 2.55, -6.6, 8.4, 2.6),
      TX('l2_t1', 15, 4.6, -8.5, '走中间！'),
      CP('l2_cp1', 20.5, 3.0, -8.5),
      P('l2_p4', 21, 1.9, -8.5, 3.4, 3.4),
      // 线框支线拿纸条
      P('l2_m1', 21, 2.4, -13, 2.6, 2.6, 'MANGA'),
      P('l2_m2', 21, 2.9, -17, 2.6, 2.6, 'MANGA'),
      PAGE('page3d_ch2', 21, 4.2, -17),
      // 移动平台横渡
      MV('l2_mv1', 25.5, 2.2, -8.5, 3, 3, { x: 31.5, y: 2.6, z: -8.5 }, 5),
      P('l2_p5', 35.5, 2.6, -8.5, 3.4, 3.4),
      SH('shard3d_l2_2', 35.5, 4.0, -8.5),
      // 回拐向 +z
      P('l2_p6', 35.5, 3.0, -4, 3, 3, 'REAL'),
      P('l2_p7', 35.5, 3.4, 0, 3, 3, 'MANGA'),
      P('l2_end', 35.5, 3.4, 5.5, 7, 7),
      SH('shard3d_l2_3', 35.5, 5.0, 8),
      // ---- 加长段：闪烁平台走廊 ----
      TX('l2_t2', 35.5, 5.8, 8.5, '闪烁平台会消失！看准节奏跳'),
      FD('l2_f1', 35.5, 3.4, 10.5, 2.6, 2.6, 3.0, 0),
      FD('l2_f2', 35.5, 3.6, 14, 2.6, 2.6, 3.0, Math.PI),
      SH('shard3d_l2_4', 35.5, 5.2, 14),
      FD('l2_f3', 32, 3.8, 16.5, 2.6, 2.6, 3.0, Math.PI / 2),
      P('l2_far', 28, 3.8, 18.5, 4, 4),
      CP('l2_cp2', 28, 4.8, 18.5),
      P('l2_m3', 24, 4.2, 18.5, 2.6, 2.6, 'MANGA'),
      P('l2_end2', 19.5, 4.2, 18.5, 6, 6),
      SH('shard3d_l2_5', 19.5, 5.8, 16.5),
      GOAL('l2_goal', 18, 5.8, 18.5),
    ],
  },

  // ============ 第3关：线框断层塔（两段世界重排 + 碎裂平台下山） ============
  {
    id: 3,
    name: '第3关：线框断层塔',
    subtitle: '这里没有分镜——只有世界的线框。',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l3_start', 0, 0.7, 0, 7, 7),
      CP('l3_cp0', -2, 1.7, 2),
      // 中央塔柱
      P('l3_tower', 10, 2.8, -6, 4, 4, 'BOTH', 5.6, 0x64748b),
      // 绕塔盘旋（缓坡）
      P('l3_r1', 5.2, 1.2, -1.5, 3.0, 3.0, 'REAL'),
      P('l3_r2', 8.4, 1.7, -0.8, 3.0, 3.0, 'MANGA'),
      P('l3_r3', 11.8, 2.2, -1.4, 3.0, 3.0, 'REAL'),
      SH('shard3d_l3_1', 11.8, 3.6, -1.4),
      P('l3_r4', 14.6, 2.7, -3.8, 3.0, 3.0, 'MANGA'),
      P('l3_r5', 14.9, 3.2, -7.4, 3.0, 3.0, 'REAL'),
      CP('l3_cp1', 14.9, 4.2, -7.4),
      // ---- 世界重排 I：三块踏板初始悬在错误位置 ----
      { id: 'l3_shift_trig', type: 'TRIGGER', x: 14.9, y: 4.2, z: -7.4, w: 4.5, h: 4, d: 4.5, layerMask: 'BOTH', shiftGroup: 1 },
      { ...P('l3_r6', 15.5, 2.4, -13.8, 3.0, 3.0, 'MANGA'), shiftTo: { x: 12.9, y: 3.7, z: -10.4 }, shiftGroup: 1 },
      SH('shard3d_l3_2', 12.9, 5.1, -10.4),
      { ...P('l3_r7', 6.2, 2.8, -14.5, 3.0, 3.0, 'REAL'), shiftTo: { x: 9.2, y: 4.2, z: -10.9 }, shiftGroup: 1 },
      { ...P('l3_r8', 2.4, 3.4, -11.5, 3.0, 3.0, 'MANGA'), shiftTo: { x: 6.0, y: 4.7, z: -8.6 }, shiftGroup: 1 },
      P('l3_r9', 5.8, 5.2, -4.9, 3.0, 3.0, 'REAL'),
      P('l3_r10', 8.6, 5.6, -3.4, 2.8, 2.8, 'MANGA'),
      // 塔顶
      P('l3_top', 10, 5.9, -6, 6, 6),
      CP('l3_cp2', 10, 6.9, -6),
      // 纸条支线：塔顶旁一步
      P('l3_m_page', 10, 6.1, -10.6, 3.0, 3.0, 'MANGA'),
      PAGE('page3d_ch3', 10, 7.4, -10.6),
      P('l3_f1', 13.6, 6.4, -6, 2.8, 2.8, 'MANGA'),
      P('l3_end', 17.6, 6.8, -6, 6, 6),
      SH('shard3d_l3_3', 17.6, 8.4, -6),
      // ---- 加长段：世界重排 II（更高一层） + 碎裂平台下山 ----
      { id: 'l3_shift_trig2', type: 'TRIGGER', x: 17.6, y: 7.9, z: -6, w: 4.5, h: 4, d: 4.5, layerMask: 'BOTH', shiftGroup: 2 },
      { ...P('l3_s1', 22, 5.5, -9.5, 3.0, 3.0, 'REAL'), shiftTo: { x: 21, y: 7.3, z: -6.8 }, shiftGroup: 2 },
      { ...P('l3_s2', 24.5, 5.0, -1.5, 3.0, 3.0, 'MANGA'), shiftTo: { x: 24, y: 7.8, z: -5.2 }, shiftGroup: 2 },
      { ...P('l3_s3', 27, 6.0, -10.5, 3.0, 3.0, 'REAL'), shiftTo: { x: 26.6, y: 8.3, z: -6.6 }, shiftGroup: 2 },
      P('l3_peak', 30, 8.7, -6, 5, 5),
      CP('l3_cp3', 30, 9.7, -6),
      SH('shard3d_l3_4', 26.6, 9.7, -6.6),
      TX('l3_t1', 33.8, 10.2, -6, '碎裂平台踩了会塌！别停下！'),
      CRB('l3_c1', 33.8, 8.0, -6),
      CRB('l3_c2', 36.8, 7.4, -6),
      CRB('l3_c3', 39.8, 6.8, -6),
      SH('shard3d_l3_5', 39.8, 8.5, -6),
      P('l3_end2', 43.5, 6.6, -6, 5, 5),
      GOAL('l3_goal', 45, 8.2, -6),
    ],
  },

  // ============ 第4关：云端跳线（+碎裂云 + 弹跳菇 + 长程移动平台） ============
  {
    id: 4,
    name: '第4关：云端跳线',
    subtitle: '脚下没有地面，只有节奏。',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l4_start', 0, 0.7, 0, 7, 7),
      CP('l4_cp0', -2, 1.7, 2),
      MV('l4_mv1', 6, 1.2, 0, 2.8, 2.8, { x: 11, y: 1.8, z: 0 }, 4.5),
      P('l4_p1', 15, 1.8, 0, 3, 3),
      SH('shard3d_l4_1', 15, 3.2, 0),
      MV('l4_mv2', 19, 2.0, 0, 2.8, 2.8, { x: 19, y: 4.6, z: 0 }, 5),
      P('l4_p2', 23, 4.6, 0, 3.2, 3.2),
      CP('l4_cp1', 23, 5.6, 0),
      MV('l4_mv3', 23, 4.8, -5, 2.8, 2.8, { x: 23, y: 4.8, z: -10.5 }, 5.5),
      P('l4_spikeisle', 23, 4.8, -14.5, 5, 5, 'BOTH', 0.6, 0x94a3b8),
      HZ('l4_hz1', 23, 5.45, -13.2, 4.4, 1.6),
      SH('shard3d_l4_2', 23, 6.4, -15.6),
      // 纸条支线
      P('l4_m1', 27, 5.6, -14.5, 2.4, 2.4, 'MANGA'),
      PAGE('page3d_ch4', 27, 6.9, -14.5),
      MV('l4_mv4', 19, 5.2, -14.5, 2.6, 2.6, { x: 13.5, y: 5.6, z: -14.5 }, 4.5),
      P('l4_p3', 9.5, 5.6, -14.5, 3, 3, 'REAL'),
      P('l4_p4', 5.5, 6.0, -14.5, 3, 3, 'MANGA'),
      P('l4_end', 0, 6.0, -14.5, 7, 7),
      SH('shard3d_l4_3', 0, 7.6, -12),
      // ---- 加长段：碎裂云 + 弹跳菇 + 长程移动平台 ----
      TX('l4_t1', -4.5, 8.2, -14.5, '云也会塌！'),
      CRB('l4_c1', -4.5, 6.0, -14.5),
      CRB('l4_c2', -8, 6.4, -14.5),
      SH('shard3d_l4_4', -8, 7.9, -14.5),
      P('l4_r1', -12, 6.4, -14.5, 3, 3),
      CP('l4_cp2', -12, 7.4, -14.5),
      BN('l4_b1', -15.5, 6.6, -14.5),
      P('l4_high', -18.5, 9.6, -14.5, 3, 3),
      MV('l4_mv5', -22, 9.8, -14.5, 2.6, 2.6, { x: -22, y: 9.8, z: -7 }, 6),
      P('l4_end2', -22, 9.8, -3, 6, 6),
      SH('shard3d_l4_5', -22, 11.4, -4),
      GOAL('l4_goal', -23.5, 11.4, -3),
    ],
  },

  // ============ 第5关：终章 —— 世界的接缝（全机制汇演） ============
  {
    id: 5,
    name: '第5关：世界的接缝',
    subtitle: '世界的尽头没有门，只有一道没补上的裂缝。',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l5_start', 0, 0.7, 0, 8, 8),
      CP('l5_cp0', -2.5, 1.7, 2.5),
      TX('l5_t1', 0, 3.4, -3.4, '最后一段路了。'),
      // 第一段：快速交替踏板
      P('l5_a1', 6, 1.2, 0, 2.4, 2.4, 'REAL'),
      P('l5_a2', 9.4, 1.7, 0, 2.4, 2.4, 'MANGA'),
      P('l5_a3', 12.8, 2.2, 0, 2.4, 2.4, 'REAL'),
      SH('shard3d_l5_1', 12.8, 3.6, 0),
      P('l5_rest1', 17, 2.2, 0, 4, 4),
      CP('l5_cp1', 17, 3.2, 0),
      // 第二段：尖刺走廊 + 移动板
      P('l5_corr', 25, 2.2, 0, 10, 6, 'BOTH', 0.6, 0x94a3b8),
      HZ('l5_hz1', 24, 2.85, -1.6, 7, 2.4),
      HZ('l5_hz2', 26, 2.85, 1.6, 7, 2.4),
      SH('shard3d_l5_2', 29, 3.8, 0),
      MV('l5_mv1', 32.5, 2.6, 0, 2.8, 2.8, { x: 38, y: 3.4, z: 0 }, 5),
      P('l5_rest2', 42, 3.4, 0, 4.5, 4.5),
      CP('l5_cp2', 42, 4.4, 0),
      // 第三段：拐入深度轴，线框螺旋
      P('l5_b1', 42, 4.0, -4.5, 2.4, 2.4, 'MANGA'),
      P('l5_b2', 42, 4.6, -8.5, 2.4, 2.4, 'REAL'),
      P('l5_b3', 45.5, 5.2, -8.5, 2.4, 2.4, 'MANGA'),
      SH('shard3d_l5_3', 45.5, 6.6, -8.5),
      MV('l5_mv2', 49.5, 5.6, -8.5, 2.6, 2.6, { x: 49.5, y: 5.6, z: -2.5 }, 5),
      // 纸条支线 + 返程板
      P('l5_page_p', 53.5, 5.6, -12, 2.6, 2.6),
      PAGE('page3d_ch5', 53.5, 6.9, -12),
      P('l5_page_r', 53.5, 5.6, -7, 2.6, 2.6),
      SH('shard3d_l5_4', 51, 7.2, 0),
      // ---- 加长段：全机制汇演 ----
      FD('l5_f1', 53, 5.6, -2.5, 2.6, 2.6, 2.6, 0),
      FD('l5_f2', 56.5, 5.9, -2.5, 2.6, 2.6, 2.6, Math.PI),
      CRB('l5_c1', 60, 6.2, -2.5),
      BN('l5_b4', 63, 6.0, -2.5),
      P('l5_up', 66, 9.0, -2.5, 3, 3),
      CP('l5_cp3', 66, 10.0, -2.5),
      // 最后一次世界重排：路自己拼出来
      { id: 'l5_trig', type: 'TRIGGER', x: 66, y: 10, z: -2.5, w: 4, h: 4, d: 4, layerMask: 'BOTH', shiftGroup: 3 },
      { ...P('l5_sp1', 70, 7.5, -7, 3.0, 3.0, 'MANGA'), shiftTo: { x: 69.5, y: 9.4, z: -4.2 }, shiftGroup: 3 },
      { ...P('l5_sp2', 72, 7.0, 1, 3.0, 3.0, 'REAL'), shiftTo: { x: 72.5, y: 9.8, z: -2.0 }, shiftGroup: 3 },
      SH('shard3d_l5_5', 72.5, 11.5, -2.0),
      // 终点：裂缝平台
      P('l5_final', 77, 10.2, -2.5, 9, 9),
      TX('l5_t2', 77, 13.2, -2.5, '世界在这里没有对齐——裂缝在轻轻呼吸。'),
      CP('l5_kimo', 78, 11.2, -4.5),
      GOAL('l5_goal', 79.5, 11.8, -2.5),
    ],
  },
];

// 收集品总数（图鉴/全收集判定用）
export const TOTAL_COLLECTIBLES_COUNT = LEVELS3D.reduce(
  (n, lv) => n + lv.entities.filter(e => e.type === 'PAGE' || e.type === 'SHARD').length,
  0
);
