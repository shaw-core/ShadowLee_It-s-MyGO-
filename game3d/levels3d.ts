// ============================================================
// 《李豆沙的次元冲刺·后编：多出来的一维》 —— 原生 3D 关卡设计
// 坐标系：y 向上，单位约等于 1 米。玩家身高 1.1，跳跃最高 ~1.8，
// 最远跳距 ~4.2。设计约束：台阶高差 ≤1.5，跳跃缺口 ≤3.2。
// ============================================================

export type LayerMask3D = 'REAL' | 'MANGA' | 'BOTH';

export type EntityType3D =
  | 'PLATFORM'
  | 'MOVER'       // 往返移动平台
  | 'HAZARD'      // 尖刺
  | 'PAGE'        // 漫画页（剧情钥匙）
  | 'SHARD'       // 记忆碎片
  | 'CHECKPOINT'  // 存档旗
  | 'GOAL'        // 传送门
  | 'TEXT';       // 提示文字

export interface Entity3D {
  id: string;
  type: EntityType3D;
  x: number; y: number; z: number;      // 中心点
  w?: number; h?: number; d?: number;   // 尺寸（默认见引擎）
  layerMask: LayerMask3D;
  color?: number;                        // 平台自定义颜色
  text?: string;
  // MOVER 专用：
  moveTo?: { x: number; y: number; z: number };
  period?: number;                       // 一个来回的秒数
}

export interface Level3D {
  id: number;
  name: string;
  subtitle: string;
  spawn: { x: number; y: number; z: number };
  entities: Entity3D[];
}

// 简写工具
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

export const LEVELS3D: Level3D[] = [
  // ============ 第1关：教学 —— 认识第三个轴 ============
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
      // Q 切换教学：现实层是断崖，漫画层有桥
      TX('l1_t2', 13, 4.2, 0, '按 Q 切换到线框层！'),
      P('l1_bridge', 14.5, 1.6, 0, 5, 2.4, 'MANGA', 0.4),
      P('l1_isle', 20, 1.6, 0, 7, 7),
      CP('l1_cp1', 20, 2.6, 0),
      // 深度轴支线：往 z 方向跳两块板拿漫画页
      TX('l1_t3', 20, 4.4, 3.2, '侧面好像有什么东西……'),
      TX('l1_t4', 10, 3.4, 0, '头晕的话，吃小室放的薄荷糖！'),
      P('l1_side1', 20, 2.1, 6.5, 2.4, 2.4),
      P('l1_side2', 20, 2.7, 10, 2.4, 2.4),
      PAGE('page3d_ch1', 20, 4.0, 10),
      // 尾段：现实/漫画交替踏板
      P('l1_a1', 25.5, 2.0, 0, 2.6, 2.6, 'REAL'),
      P('l1_a2', 29, 2.4, 0, 2.6, 2.6, 'MANGA'),
      SH('shard3d_l1_2', 29, 3.8, 0),
      P('l1_end', 34, 2.4, 0, 8, 8),
      SH('shard3d_l1_3', 34, 4.0, 2.5),
      GOAL('l1_goal', 36, 4.0, 0),
    ],
  },

  // ============ 第2关：深度轴上的回廊 ============
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
      // 漫画支线拿页：现实层没有路
      P('l2_m1', 21, 2.4, -13, 2.6, 2.6, 'MANGA'),
      P('l2_m2', 21, 2.9, -17, 2.6, 2.6, 'MANGA'),
      PAGE('page3d_ch2', 21, 4.2, -17),
      // 移动平台横渡
      MV('l2_mv1', 25.5, 2.2, -8.5, 3, 3, { x: 31.5, y: 2.6, z: -8.5 }, 5),
      P('l2_p5', 35.5, 2.6, -8.5, 3.4, 3.4),
      SH('shard3d_l2_2', 35.5, 4.0, -8.5),
      // 回拐向 +z 的终点岛
      P('l2_p6', 35.5, 3.0, -4, 3, 3, 'REAL'),
      P('l2_p7', 35.5, 3.4, 0, 3, 3, 'MANGA'),
      P('l2_end', 35.5, 3.4, 5.5, 7, 7),
      SH('shard3d_l2_3', 35.5, 5.0, 8),
      GOAL('l2_goal', 35.5, 5.0, 5.5),
    ],
  },

  // ============ 第3关：绕塔盘旋而上（缓坡版） ============
  {
    id: 3,
    name: '第3关：线框断层塔',
    subtitle: '这里没有分镜——只有世界的线框。',
    spawn: { x: 0, y: 1.8, z: 0 },
    entities: [
      P('l3_start', 0, 0.7, 0, 7, 7),
      CP('l3_cp0', -2, 1.7, 2),
      // 中央塔柱（顶面正好托住塔顶平台）
      P('l3_tower', 10, 2.8, -6, 4, 4, 'BOTH', 5.6, 0x64748b),
      // 绕塔盘旋：高差 0.5、踏板 3.0，节奏切换
      P('l3_r1', 5.2, 1.2, -1.5, 3.0, 3.0, 'REAL'),
      P('l3_r2', 8.4, 1.7, -0.8, 3.0, 3.0, 'MANGA'),
      P('l3_r3', 11.8, 2.2, -1.4, 3.0, 3.0, 'REAL'),
      SH('shard3d_l3_1', 11.8, 3.6, -1.4),
      P('l3_r4', 14.6, 2.7, -3.8, 3.0, 3.0, 'MANGA'),
      P('l3_r5', 14.9, 3.2, -7.4, 3.0, 3.0, 'REAL'),
      CP('l3_cp1', 14.9, 4.2, -7.4),
      P('l3_r6', 12.9, 3.7, -10.4, 3.0, 3.0, 'MANGA'),
      SH('shard3d_l3_2', 12.9, 5.1, -10.4),
      P('l3_r7', 9.2, 4.2, -10.9, 3.0, 3.0, 'REAL'),
      P('l3_r8', 6.0, 4.7, -8.6, 3.0, 3.0, 'MANGA'),
      P('l3_r9', 5.8, 5.2, -4.9, 3.0, 3.0, 'REAL'),
      P('l3_r10', 8.6, 5.6, -3.4, 2.8, 2.8, 'MANGA'),
      // 塔顶大平台
      P('l3_top', 10, 5.9, -6, 6, 6),
      CP('l3_cp2', 10, 6.9, -6),
      // 页支线：塔顶旁一步就到的漫画悬板
      P('l3_m_page', 10, 6.1, -10.6, 3.0, 3.0, 'MANGA'),
      PAGE('page3d_ch3', 10, 7.4, -10.6),
      // 终点段
      P('l3_f1', 13.6, 6.4, -6, 2.8, 2.8, 'MANGA'),
      P('l3_end', 17.6, 6.8, -6, 6, 6),
      SH('shard3d_l3_3', 17.6, 8.4, -6),
      GOAL('l3_goal', 19, 8.4, -6),
    ],
  },

  // ============ 第4关：云海上的移动平台 ============
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
      // 上下电梯板
      MV('l4_mv2', 19, 2.0, 0, 2.8, 2.8, { x: 19, y: 4.6, z: 0 }, 5),
      P('l4_p2', 23, 4.6, 0, 3.2, 3.2),
      CP('l4_cp1', 23, 5.6, 0),
      // 深度方向的横移板 + 尖刺岛
      MV('l4_mv3', 23, 4.8, -5, 2.8, 2.8, { x: 23, y: 4.8, z: -10.5 }, 5.5),
      P('l4_spikeisle', 23, 4.8, -14.5, 5, 5, 'BOTH', 0.6, 0x94a3b8),
      HZ('l4_hz1', 23, 5.45, -13.2, 4.4, 1.6),
      SH('shard3d_l4_2', 23, 6.4, -15.6),
      // 页支线：现实层隐形（漫画层专属板）悬在尖刺岛上空
      P('l4_m1', 27, 5.6, -14.5, 2.4, 2.4, 'MANGA'),
      PAGE('page3d_ch4', 27, 6.9, -14.5),
      // 双板接力回到主线
      MV('l4_mv4', 19, 5.2, -14.5, 2.6, 2.6, { x: 13.5, y: 5.6, z: -14.5 }, 4.5),
      P('l4_p3', 9.5, 5.6, -14.5, 3, 3, 'REAL'),
      P('l4_p4', 5.5, 6.0, -14.5, 3, 3, 'MANGA'),
      P('l4_end', 0, 6.0, -14.5, 7, 7),
      SH('shard3d_l4_3', 0, 7.6, -12),
      GOAL('l4_goal', -1.5, 7.6, -14.5),
    ],
  },

  // ============ 第5关：终章 —— 世界的接缝 ============
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
      // 第三段：拐入深度轴，漫画螺旋上升
      P('l5_b1', 42, 4.0, -4.5, 2.4, 2.4, 'MANGA'),
      P('l5_b2', 42, 4.6, -8.5, 2.4, 2.4, 'REAL'),
      P('l5_b3', 45.5, 5.2, -8.5, 2.4, 2.4, 'MANGA'),
      SH('shard3d_l5_3', 45.5, 6.6, -8.5),
      MV('l5_mv2', 49.5, 5.6, -8.5, 2.6, 2.6, { x: 49.5, y: 5.6, z: -2.5 }, 5),
      // 页支线：接缝边缘的一块石板
      P('l5_page_p', 53.5, 5.6, -12, 2.6, 2.6),
      PAGE('page3d_ch5', 53.5, 6.9, -12),
      // 终点：接缝之门
      P('l5_final', 54, 5.6, -2.5, 9, 9),
      TX('l5_t2', 54, 8.6, -2.5, '世界在这里没有对齐——裂缝在轻轻呼吸。'),
      SH('shard3d_l5_4', 51, 7.2, 0),
      CP('l5_kimo', 55, 6.6, -5),
      GOAL('l5_goal', 56.5, 7.2, -2.5),
    ],
  },
];

// 收集品总数（图鉴/全收集判定用）
export const TOTAL_COLLECTIBLES_COUNT = LEVELS3D.reduce(
  (n, lv) => n + lv.entities.filter(e => e.type === 'PAGE' || e.type === 'SHARD').length,
  0
);
