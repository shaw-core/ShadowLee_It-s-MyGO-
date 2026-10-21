// ============================================================
// 隐藏档案馆 · 布局（v0.16.1）
//  从南往北走（-z 是前方）：
//   A 入侵入口 / 电视迷宫   z  24 → 39   碎掉的大电视框（也是离开的门）、左边高高的 CRT 堆、右边歪着的大屏、前面一道要从缺口穿过去的电视墙
//   B VHS 网格通道          z   0 → 24   不平整的网格走道、三道圆环门洞、错开的第二层网格、漂浮的椅子和电视
//     回环小路              x 4 → 9      从通道中段拐出去、折回入口旁边
//   C 故障档案机房          z -17 → 0    不规则的机柜簇、错列的 CRT 终端、北边一排 ERROR 电视（后面透出树的光）
//   D 世界树 / 密文核心     狭窄的夹道 z -25 → -17，然后是半径 12 的圆台（中心 0,-37）
//  所有坐标都是显式的世界坐标；记录点的位置也在这里。
// ============================================================
import * as THREE from 'three';
import type { Collider } from './archiveWorld';
import { buildFloor, buildWorldTree } from './archiveWorld';
import {
  BoxCollider, ZoneOpts, Updater, ScreenBank, ScreenKind, CRTSpec,
  buildCRTStack, buildCables, buildVHSGridPath, buildGridSheet, buildRings, buildDistortedScreens, buildFloatingDebris, buildRackClusters, buildBrokenFrame,
} from './archiveZones';

const rnd = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------- 可以走的地方 ----------------
type Walk = { kind: 'rect'; x0: number; x1: number; z0: number; z1: number } | { kind: 'circle'; x: number; z: number; r: number };
export const WALK: Walk[] = [
  { kind: 'rect', x0: -4.2, x1: 4.2, z0: 24, z1: 41.6 },     // A
  { kind: 'rect', x0: -3.2, x1: 3.2, z0: -0.5, z1: 24.5 },   // B
  { kind: 'rect', x0: 4.0, x1: 9.2, z0: 29, z1: 32.5 },      // 回环：入口旁的接口
  { kind: 'rect', x0: 6.0, x1: 9.2, z0: 8, z1: 32.5 },       // 回环：小路
  { kind: 'rect', x0: 3.0, x1: 9.2, z0: 8, z1: 11 },         // 回环：接回通道
  { kind: 'rect', x0: -14, x1: 11, z0: -17, z1: 0 },         // C
  { kind: 'rect', x0: -1.6, x1: 1.6, z0: -25.5, z1: -16.5 }, // D 夹道
  { kind: 'circle', x: 0, z: -37, r: 12 },                   // D 圆台
];
const PR = 0.32;   // 人物半径
const inUnion = (x: number, z: number) => WALK.some(w => w.kind === 'rect'
  ? x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1
  : Math.hypot(x - w.x, z - w.z) <= w.r - 0.5);
/** 人物（半径 PR）整个站在地面上：前后左右四个点都在可走区域的并集里（区域接缝处不会卡住） */
export const walkable = (x: number, z: number) => inUnion(x, z) && inUnion(x + PR, z) && inUnion(x - PR, z) && inUnion(x, z + PR) && inUnion(x, z - PR);

export const SPAWN = { x: 0, z: 37.6, face: Math.PI };
export const TREE = { x: 0, z: -37 };
export const KIMO_POS = { x: -8.6, z: -39.5 };
export const CRACK_POS = new THREE.Vector3(-62, 32, -96);
/** 地上那串蓝色锚点走的路线（从入口一直到 Kimo 熊看着的方向） */
export const TRAIL: [number, number][] = [[0.6, 37], [0, 24], [0.5, 0], [-1, -12], [0, -20], [-3, -30], [-7, -38]];

/** 记录点：位置 + 朝向（本地 +z 对着 face 那个点） */
export const STATIONS: Record<string, { x: number; z: number; face: [number, number] }> = {
  'draft_pages.dat':   { x: 2.25, z: 16.4, face: [-1, 16.4] },
  'version.log':       { x: -1.6, z: -3.4, face: [0, 2] },
  'panda_plan.doc':    { x: -8.4, z: -2.8, face: [-3, -6] },
  'news_archive.txt':  { x: -13.2, z: -10, face: [0, -10] },
  'incident_0x02.log': { x: -8.6, z: -13.4, face: [-3, -9] },
  'level3_shift.src':  { x: 6.2, z: -4.4, face: [2, -3] },
  'snap_L1.txt':       { x: 4.6, z: -13.5, face: [0.5, -11] },
  'snap_L3.txt':       { x: 7.6, z: -9.2, face: [2, -8] },
  'trace_tvhead.log':  { x: 10.3, z: -2.6, face: [5, -2.6] },
  'sealed_truth.enc':  { x: 0, z: -30.6, face: [0, -20] },
  'world_03.plan':     { x: 0, z: -48.3, face: [0, -37] },
  '__exit':            { x: 0, z: 42.35, face: [0, 30] },
};

export interface ZoneWorld {
  boxes: BoxCollider[];
  colliders: Collider[];
  update: Updater;
  /** 按玩家位置让世界树慢慢显露 */
  revealFor: (x: number, z: number, dt: number) => number;
  stats: { crts: number; racks: number; rings: number; warped: number; debris: string; gridTiles: number };
  /** 入口碎框：出口光幕挂在这里 */
  frame: ReturnType<typeof buildBrokenFrame>;
}

export const buildArchiveZones = (world: THREE.Group, opts: ZoneOpts): ZoneWorld => {
  const boxes: BoxCollider[] = [];
  const colliders: Collider[] = [];
  const ups: Updater[] = [];
  const bank = new ScreenBank(opts);
  ups.push(t => bank.update(t));
  const r = rnd(2024);
  const crts: CRTSpec[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const CASE = [0xd9d5c8, 0xe6e3da, 0xbdb8aa, 0xcfd6dc, 0x9aa1aa, 0x3a3f4a];
  /** 一列往上摞的电视：每台大小不一、略微错开、略微转一点 */
  const column = (x: number, z: number, yaw: number, levels: number, screens: ScreenKind[], scale = 1, collide = true) => {
    let y = 0;
    for (let i = 0; i < levels; i++) {
      const w = (1.0 + r() * 0.9) * scale * (i === 0 ? 1.1 : 1), h = w * (0.72 + r() * 0.12), d = w * (0.75 + r() * 0.25);
      const off = (r() - 0.5) * 0.35 * scale;
      crts.push({ x: x + Math.cos(yaw) * off, y, z: z - Math.sin(yaw) * off, w, h, d, yaw: yaw + (r() - 0.5) * 0.28, roll: (r() - 0.5) * 0.06, screen: pick(screens), color: pick(CASE), collide: collide && i === 0 });
      y += h * 0.97;
    }
    return y;
  };
  const E1: ScreenKind[] = ['error', 'error', 'error2', 'static', 'manga', 'door', 'panda', 'pair', 'dark', 'bsod', 'bars'];

  // ================= A 入侵入口 / 电视迷宫 =================
  // 开口朝北，正对着出生点；进场时镜头就在这台碎电视的「屏幕」里往外看
  const frame = buildBrokenFrame(world, 0, 43.65, Math.PI, opts);
  ups.push(frame.update);
  boxes.push({ x: -2.03, z: 43.65, hw: 0.3, hd: 1.35, yaw: 0 }, { x: 2.03, z: 43.65, hw: 0.3, hd: 1.35, yaw: 0 });
  // 左边：一整排高高摞起来的电视（朝东，对着走道）
  for (const [z, lv] of [[39.6, 2], [37.6, 3], [35.8, 4], [34.0, 3], [32.1, 5], [30.3, 3], [28.5, 4]] as const) column(-5.4 + (r() - 0.5) * 0.4, z, Math.PI / 2, lv, E1);
  // 右边：一台歪着的大屏 + 底下一圈小的
  crts.push({ x: 5.6, y: 0, z: 36.0, w: 3.5, h: 2.6, d: 2.4, yaw: -Math.PI / 2 + 0.12, roll: 0.2, pitch: -0.06, screen: 'error2', color: 0xe6e3da, collide: true });
  crts.push({ x: 4.95, y: 0, z: 38.6, w: 1.2, h: 0.9, d: 1.0, yaw: -Math.PI / 2 - 0.3, screen: 'bars', color: 0x3a3f4a, collide: true });
  crts.push({ x: 5.1, y: 0, z: 40.6, w: 1.4, h: 1.05, d: 1.1, yaw: -Math.PI / 2 + 0.2, screen: 'static', color: 0xbdb8aa, collide: true });
  crts.push({ x: 4.9, y: 0, z: 33.6, w: 1.0, h: 0.75, d: 0.9, yaw: -Math.PI / 2 + 0.4, screen: 'static', color: 0xd9d5c8, collide: true });
  column(5.2, 26.6, -Math.PI / 2, 3, E1);
  column(5.0, 28.1, -Math.PI / 2 - 0.2, 2, E1, 0.9);
  // 前面：一道横着的电视墙，中间留一个缺口，上面横架一台
  for (const x of [-3.6, -2.3]) column(x, 25.8, 0, 3, E1, 0.95);
  for (const x of [2.3, 3.6]) column(x, 25.8, 0, 3, E1, 0.95);
  crts.push({ x: 0, y: 2.25, z: 25.85, w: 3.0, h: 1.15, d: 1.2, yaw: 0, roll: 0.05, screen: 'manga', color: 0xcfd6dc });
  crts.push({ x: 0.2, y: 3.4, z: 25.7, w: 1.4, h: 1.05, d: 1.1, yaw: 0.25, roll: -0.08, screen: 'panda', color: 0xd9d5c8 });
  // 走道正中的地上：一台小电视（不挡路，放在边上）
  crts.push({ x: -3.2, y: 0, z: 30.8, w: 0.8, h: 0.6, d: 0.7, yaw: 0.9, screen: 'bars', color: 0x3a3f4a, collide: true });
  ups.push(buildVHSGridPath(world, [{ x0: -4.2, x1: 4.2, z0: 24, z1: 42.4, tile: 1.4, jitter: 0.6 }], opts, [0x081230, 0x7fc3ff], 11).update);
  // 线缆：从左边堆顶上垂过走道，挂到右边
  buildCables(world, [
    [new THREE.Vector3(-4.9, 3.6, 33.6), new THREE.Vector3(4.6, 2.7, 35.2), 1.6],
    [new THREE.Vector3(-4.9, 4.4, 31.8), new THREE.Vector3(4.8, 2.2, 28.0), 2.2],
    [new THREE.Vector3(-4.8, 2.6, 36.8), new THREE.Vector3(-2.2, 0.02, 40.6), 0.4],
    [new THREE.Vector3(3.0, 2.9, 25.6), new THREE.Vector3(5.0, 1.8, 26.4), 0.6],
    [new THREE.Vector3(-3.0, 2.8, 25.6), new THREE.Vector3(-4.9, 3.0, 28.5), 0.9],
    [new THREE.Vector3(1.3, 2.2, 26.4), new THREE.Vector3(2.6, 0.02, 27.6), 0.3],
  ], opts);

  // ================= B VHS 网格通道 =================
  const gB = buildVHSGridPath(world, [{ x0: -3.2, x1: 3.2, z0: -0.5, z1: 24, tile: 1.5, stretch: 1, jitter: 1.4 }], opts, [0x0a1636, 0x9fd8ff], 21);
  ups.push(gB.update);
  ups.push(buildRings(world, [{ x: 0, z: 20.5, R: 3.7, y: 1.0 }, { x: 0, z: 12.6, R: 3.9, y: 0.8, tilt: 0.1, yaw: 0.05 }, { x: 0, z: 4.6, R: 3.6, y: 1.1, yaw: -0.06 }], opts));
  // 圆环后面错开的第二层网格（还有一层倒过来的「天花板」）
  ups.push(buildGridSheet(world, new THREE.Vector3(3.5, -3.4, 8), new THREE.Euler(0.1, 0.32, 0.06), 16, 22, opts));
  ups.push(buildGridSheet(world, new THREE.Vector3(-6, -6.5, 15), new THREE.Euler(-0.08, -0.25, -0.1), 20, 20, opts, 0x5a8cff));
  ups.push(buildGridSheet(world, new THREE.Vector3(0.5, 9.5, 12), new THREE.Euler(Math.PI - 0.05, 0.08, 0.04), 12, 26, opts, 0x7aa8ff));
  // 头顶的灯条
  {
    const m = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, toneMapped: false });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 0.12), m, 9);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < 9; i++) { q.setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.5, (r() - 0.5) * 0.08)); M.compose(new THREE.Vector3((r() - 0.5) * 4, 6.2 + r() * 0.8, 22 - i * 2.6), q, new THREE.Vector3(1.4 + r(), 1, 1)); im.setMatrixAt(i, M); }
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); world.add(im);
  }
  // 两侧被拉弯的显示器
  ups.push(buildDistortedScreens(world, [
    { x: -5.6, y: 2.6, z: 21, w: 3.2, h: 2.2, yaw: Math.PI / 2 + 0.25, bend: 0.5, screen: 'dark' },
    { x: -6.4, y: 3.6, z: 15.5, w: 4.0, h: 2.6, yaw: Math.PI / 2 + 0.1, bend: 0.7, screen: 'error' },
    { x: -5.4, y: 1.9, z: 9.8, w: 2.6, h: 1.8, yaw: Math.PI / 2 - 0.15, bend: 0.4, screen: 'static' },
    { x: -6.8, y: 3.2, z: 3.2, w: 3.6, h: 2.4, yaw: Math.PI / 2 + 0.3, bend: 0.6, screen: 'dark' },
    { x: 10.9, y: 2.8, z: 24, w: 3.4, h: 2.3, yaw: -Math.PI / 2 - 0.2, bend: 0.55, screen: 'dark' },
    { x: 11.2, y: 2.3, z: 16, w: 3.0, h: 2.0, yaw: -Math.PI / 2 + 0.15, bend: 0.45, screen: 'door' },
    { x: 4.6, y: 4.4, z: 2.0, w: 2.2, h: 1.5, yaw: -Math.PI / 2 - 0.4, bend: 0.3, screen: 'bsod' },
  ], bank, opts));
  // 漂浮的椅子 / 小电视 / 方块 / 球 / 碎字
  const offPath = (x: number, z: number) => walkable(x, z) || walkable(x + 1, z) || walkable(x - 1, z);
  ups.push(buildFloatingDebris(world, { x0: -13, x1: -3.8, z0: 0, z1: 24, y0: 1.2, y1: 6.5, avoid: offPath }, { chairs: 5, cubes: 10, spheres: 6, glyphs: 16 }, opts, 7));
  ups.push(buildFloatingDebris(world, { x0: 3.6, x1: 16, z0: -1, z1: 30, y0: 1.5, y1: 7, avoid: offPath }, { chairs: 4, cubes: 9, spheres: 5, glyphs: 12 }, opts, 9));
  // 通道边上飘着的几台小电视（不落地、不挡路）
  for (const [x, y, z, yaw] of [[-4.6, 2.2, 18, 1.2], [4.4, 3.1, 14.5, -1.9], [-4.2, 4.0, 6.5, 0.8], [4.2, 1.6, 3.2, -1.1], [-4.9, 1.4, 12.2, 2.0]] as const)
    crts.push({ x, y, z, w: 0.9 + r() * 0.4, h: 0.68, d: 0.8, yaw, pitch: (r() - 0.5) * 0.6, roll: (r() - 0.5) * 0.5, screen: pick(['dark', 'static', 'error', 'bsod'] as ScreenKind[]), color: pick(CASE) });

  // ---- 回环小路：从通道中段拐出去，一直折回入口旁边（路上的电视和入口那几台一样） ----
  ups.push(buildVHSGridPath(world, [
    { x0: 3.2, x1: 9.2, z0: 8, z1: 11, tile: 1.5, jitter: 1.6 },
    { x0: 6.0, x1: 9.2, z0: 11, z1: 29, tile: 1.6, jitter: 2.0 },
    { x0: 4.2, x1: 9.2, z0: 29, z1: 32.5, tile: 1.5, jitter: 1.6 },
  ], opts, [0x0b1430, 0x86b8ff], 33).update);
  for (const [z, lv] of [[13.5, 2], [17.5, 3], [22, 2], [26, 3]] as const) column(10.2, z, -Math.PI / 2, lv, ['door', 'panda', 'manga', 'error'], 0.9);
  for (const [z, lv] of [[15.5, 1], [20, 2], [24.5, 1]] as const) column(5.0, z, Math.PI / 2, lv, ['door', 'error', 'static'], 0.8);

  // ================= C 故障档案机房 =================
  ups.push(buildVHSGridPath(world, [{ x0: -14, x1: 11, z0: -17.5, z1: -0.5, tile: 2.0, jitter: 0.5 }], opts, [0x070c1a, 0x4f86c8], 41).update);
  ups.push(buildRackClusters(world, [
    // 西边：一排面朝东的柜子，有高有矮，最后一台歪倒
    { x: -13.4, z: -2.0, w: 1.1, h: 3.2, d: 1.1, yaw: Math.PI / 2 + 0.05 }, { x: -13.5, z: -3.3, w: 1.1, h: 2.4, d: 1.1, yaw: Math.PI / 2 - 0.1 },
    { x: -13.3, z: -4.6, w: 1.2, h: 3.6, d: 1.1, yaw: Math.PI / 2 }, { x: -13.4, z: -14.4, w: 1.1, h: 2.8, d: 1.1, yaw: Math.PI / 2 + 0.15 },
    { x: -12.0, z: -6.9, w: 1.1, h: 2.2, d: 1.1, yaw: 0.6 }, { x: -11.2, z: -5.9, w: 1.0, h: 3.0, d: 1.0, yaw: 0.4 },
    { x: -5.6, z: -7.6, w: 1.0, h: 3.1, d: 1.0, yaw: 0.2, lean: 0.38 },
    // 中间的岛：前后两排，高低错开，中间一条缝
    { x: -2.9, z: -7.2, w: 1.1, h: 3.4, d: 1.1, yaw: 0.18 }, { x: -1.7, z: -7.0, w: 1.0, h: 2.4, d: 1.1, yaw: 0.05 },
    { x: -0.5, z: -7.4, w: 1.1, h: 3.0, d: 1.1, yaw: -0.1 }, { x: 0.8, z: -7.0, w: 1.0, h: 2.0, d: 1.0, yaw: 0 },
    { x: 2.0, z: -7.6, w: 1.1, h: 3.7, d: 1.1, yaw: -0.3 },
    { x: -2.4, z: -10.3, w: 1.1, h: 2.8, d: 1.1, yaw: Math.PI }, { x: -0.9, z: -10.6, w: 1.1, h: 3.5, d: 1.1, yaw: Math.PI + 0.15 },
    { x: 0.7, z: -10.2, w: 1.0, h: 2.3, d: 1.1, yaw: Math.PI - 0.1 }, { x: 2.2, z: -10.5, w: 1.1, h: 3.1, d: 1.1, yaw: Math.PI + 0.2 },
    // 东边：靠墙的一簇
    { x: 10.4, z: -6.0, w: 1.1, h: 3.4, d: 1.1, yaw: -Math.PI / 2 }, { x: 10.5, z: -11.2, w: 1.1, h: 2.6, d: 1.1, yaw: -Math.PI / 2 - 0.1 },
    { x: 10.3, z: -12.5, w: 1.1, h: 3.8, d: 1.1, yaw: -Math.PI / 2 + 0.1 }, { x: 9.0, z: -5.0, w: 0.9, h: 2.0, d: 0.9, yaw: -1.2 },
    { x: 7.6, z: -15.4, w: 1.1, h: 2.9, d: 1.1, yaw: -0.4, lean: -0.32 },
    // 夹道两侧：把世界树挡在后面
    { x: -2.5, z: -19.0, w: 1.2, h: 4.2, d: 1.2, yaw: Math.PI / 2 }, { x: -2.6, z: -20.6, w: 1.2, h: 3.6, d: 1.2, yaw: Math.PI / 2 + 0.08 },
    { x: -2.4, z: -22.2, w: 1.1, h: 4.6, d: 1.2, yaw: Math.PI / 2 - 0.06 }, { x: -2.6, z: -23.8, w: 1.2, h: 3.2, d: 1.2, yaw: Math.PI / 2 },
    { x: 2.5, z: -19.2, w: 1.2, h: 3.8, d: 1.2, yaw: -Math.PI / 2 }, { x: 2.6, z: -20.8, w: 1.2, h: 4.4, d: 1.2, yaw: -Math.PI / 2 - 0.1 },
    { x: 2.4, z: -22.4, w: 1.1, h: 3.3, d: 1.2, yaw: -Math.PI / 2 + 0.05 }, { x: 2.6, z: -24.0, w: 1.2, h: 4.0, d: 1.2, yaw: -Math.PI / 2 },
  ], boxes, opts));
  // 岛上和岛前错列的 CRT 终端
  crts.push({ x: -1.7, y: 2.4, z: -6.9, w: 1.0, h: 0.75, d: 0.9, yaw: 0.25, screen: 'bsod', color: 0xcfd6dc });
  crts.push({ x: 0.8, y: 2.0, z: -6.9, w: 1.2, h: 0.9, d: 1.0, yaw: -0.2, roll: 0.05, screen: 'error', color: 0xd9d5c8 });
  crts.push({ x: 0.75, y: 2.3, z: -10.2, w: 1.1, h: 0.8, d: 0.9, yaw: Math.PI - 0.3, screen: 'static', color: 0x9aa1aa });
  crts.push({ x: 3.4, y: 0, z: -6.4, w: 0.9, h: 0.7, d: 0.8, yaw: -0.5, screen: 'pair', color: 0xe6e3da, collide: true });
  crts.push({ x: -4.2, y: 0, z: -6.2, w: 1.0, h: 0.75, d: 0.9, yaw: 0.6, screen: 'error2', color: 0xbdb8aa, collide: true });
  crts.push({ x: -12.2, y: 0, z: -12.2, w: 1.1, h: 0.85, d: 1.0, yaw: 0.9, screen: 'bars', color: 0x3a3f4a, collide: true });
  crts.push({ x: 9.4, y: 2.0, z: -5.0, w: 1.0, h: 0.75, d: 0.9, yaw: -1.3, screen: 'door', color: 0xd9d5c8 });
  column(-10.6, -0.9, Math.PI + 0.5, 2, E1, 0.9);
  column(8.9, -0.9, Math.PI - 0.6, 3, E1, 0.9);
  // 北边：一排错层的 ERROR 电视，中间的缝就是去核心的夹道；树的光从后面透过来
  for (let i = 0; i < 9; i++) {
    const x = -12 + i * 1.32;
    column(x, -17.4 + (i % 2) * 0.35, (r() - 0.5) * 0.2, 2 + (i % 3 === 1 ? 1 : 0), ['error', 'error', 'error2', 'static', 'bsod'], 1.0);
  }
  for (let i = 0; i < 6; i++) {
    const x = 2.6 + i * 1.32;
    column(x, -17.4 + ((i + 1) % 2) * 0.35, (r() - 0.5) * 0.2, 2 + (i % 3 === 0 ? 1 : 0), ['error', 'error2', 'error', 'static', 'bars'], 1.0);
  }
  crts.push({ x: 0, y: 3.6, z: -17.6, w: 2.4, h: 1.1, d: 1.1, yaw: 0, roll: -0.06, screen: 'error2', color: 0xe6e3da });
  buildCables(world, [
    [new THREE.Vector3(-1.7, 3.4, -7.0), new THREE.Vector3(-4.2, 0.02, -5.4), 0.5],
    [new THREE.Vector3(2.0, 3.7, -7.6), new THREE.Vector3(3.4, 0.02, -5.8), 0.4],
    [new THREE.Vector3(-13.3, 3.6, -4.6), new THREE.Vector3(-11.2, 3.0, -5.9), 0.6],
    [new THREE.Vector3(-1.2, 3.0, -17.3), new THREE.Vector3(1.4, 3.1, -17.3), 0.8],
    [new THREE.Vector3(10.3, 3.8, -12.5), new THREE.Vector3(7.6, 2.6, -15.4), 0.7],
    [new THREE.Vector3(-0.9, 3.5, -10.6), new THREE.Vector3(-2.5, 4.2, -19.0), 1.4],
  ], opts);

  // ================= D 夹道 + 世界树核心 =================
  ups.push(buildVHSGridPath(world, [{ x0: -1.6, x1: 1.6, z0: -25.2, z1: -17.5, tile: 1.1, jitter: 0.8 }], opts, [0x061026, 0x7ff5ff], 51).update);
  const updFloor = buildFloor(world, 12, TREE.x, TREE.z);
  const tree = buildWorldTree(world, colliders, TREE.x, TREE.z);
  ups.push(t => { updFloor(t); tree.update(t); });

  // ---- 灯：只照几何，不改「颜色」——让 CRT 机壳的体积看得出来 ----
  if (!opts.low) {
    for (const [x, y, z, c, i] of [[-2.6, 3.2, 33, 0x9fd0ff, 7], [2.8, 2.8, 28.5, 0x9fd0ff, 6], [0, 4.2, 12.5, 0xb8ccff, 6], [-6, 4, -8, 0x8fb8ff, 7], [5.5, 4, -9, 0x8fb8ff, 7]] as const) {
      const L = new THREE.PointLight(c, i, 14, 1.5); L.position.set(x, y, z); world.add(L);
    }
  }

  const stack = buildCRTStack(world, crts, bank, boxes, opts);
  const reveal = (x: number, z: number) => {
    // 入口几乎看不见；机房里从电视墙后面透出来；进了夹道才完全显露
    const k = z > 0 ? 0.06 : z > -17 ? 0.06 + (-z / 17) * 0.34 : z > -25.5 ? 0.4 + ((-17 - z) / 8.5) * 0.6 : 1;
    return Math.max(0, Math.min(1, k + (Math.hypot(x - TREE.x, z - TREE.z) < 13 ? 1 : 0)));
  };
  let lastK = -1;
  const update: Updater = (t, dt) => { for (const u of ups) u(t, dt); };
  return {
    boxes, colliders, update, frame,
    revealFor: (x, z, dt) => { const k = reveal(x, z); lastK = lastK < 0 ? k : lastK + (k - lastK) * Math.min(1, dt * 1.5); tree.setReveal(lastK); return lastK; },
    stats: { crts: stack.count, racks: 30, rings: 3, warped: 7, debris: opts.low ? 'half' : 'full', gridTiles: gB.mesh.count },
  };
};
