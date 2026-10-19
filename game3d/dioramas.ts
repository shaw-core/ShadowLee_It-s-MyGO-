// ============================================================
// 第二章的背景小场景（只借鉴参考游戏的「建模精细度与氛围」，内容全部按我们自己的剧情来）
//  · 每格 0.2m 的细体素、道具密集、发光处叠柔光、浮在天上的整块布景
//  · 每一关一个主题，跟关卡名和剧情走：
//    1 多出来的一维：漫画页立起来、漫画书堆成的城、正在「长出来」的岛（还有她们的房间）
//    2 空中回廊：绕来绕去的廊桥、方向错乱的楼梯、熊猫驿站（还有「我们住的那条街」）
//    3 线框断层塔：错位断开的塔、建模软件的坐标轴手柄、搭到一半的脚手架（还有亮着蓝光电视的公寓）
//    4 云端跳线：云之间跳来跳去的彩色跳线、跟着节拍跳动的音柱、插满线的配线板（还有快递站）
//    5 世界的接缝：纸和方块被缝在一起的岛、穿着金线的大针、天台那扇门（还有回家路上的公园）
//  · 第一章那些地方是从漫画世界「撕下来」的：底下是一层层纸页，边缘翘起、垂下来
// ============================================================
import * as THREE from 'three';
import { Vox } from './voxel';
import { rand } from './world3d';

const S = 0.2; // 每格 0.2m
const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const wireMat = new THREE.LineBasicMaterial({ color: 0x232737 });
const sh = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

// 柔光贴片
let glowTex: THREE.Texture | null = null;
const getGlowTex = () => {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
};

/** 一个场景的「工地」：普通方块 + 发光方块 + 额外的线和光晕 */
class Kit {
  v = new Vox();
  g = new Vox();
  extras: THREE.Object3D[] = [];
  constructor(public r: () => number, public night: number) {}
  glow(x: number, y: number, z: number, color: number, size: number, alpha = 1) {
    const m = new THREE.SpriteMaterial({ map: getGlowTex(), color, transparent: true, opacity: Math.min(1, (0.12 + 0.75 * this.night) * alpha), depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m);
    sp.position.set((x + 0.5) * S, (y + 0.5) * S, (z + 0.5) * S);
    sp.scale.setScalar(size);
    this.extras.push(sp);
  }
  /** 两点之间下垂的电线 */
  wire(a: [number, number, number], b: [number, number, number], sag = 0.5) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector3(
        (a[0] + (b[0] - a[0]) * t + 0.5) * S, (a[1] + (b[1] - a[1]) * t + 0.5) * S - Math.sin(t * Math.PI) * sag, (a[2] + (b[2] - a[2]) * t + 0.5) * S));
    }
    this.extras.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  pack(update?: (t: number) => void) {
    const grp = new THREE.Group();
    if (update) grp.userData.update = update;
    grp.add(new THREE.Mesh(this.v.geometry(S, [0, 0, 0], 0.045), solid));
    if (this.g.size) grp.add(new THREE.Mesh(this.g.geometry(S, [0, 0, 0], 0.02), glowMat));
    this.extras.forEach(e => grp.add(e));
    return grp;
  }
}

// ============ 道具 ============
const C = {
  asphalt: 0x4c5269, asphalt2: 0x565c75, lane: 0xe6eaf3, walk: 0xb9bdcb, walk2: 0xaab0c1, curb: 0xd8dce6,
  wall: 0x8e94aa, wall2: 0x7f869e, iron: 0x2e3346, pole: 0x5f6579, poleD: 0x4b5064,
  bark: 0x6b4a3a, leaf: 0x3f6f5b, leaf2: 0x4f8a6c, leaf3: 0x5f9c78, sakura: 0xf2a7c8, sakura2: 0xe88bb5, sakura3: 0xf9c9de,
  warm: 0xffd98a, warm2: 0xffeec4, dark: 0x2a3050,
};
type P3 = [number, number, number];

const lamp = (k: Kit, x: number, z: number, h: number, base = 1, dir = 1) => {
  k.v.box(x, base, z, x, base + h, z, C.poleD);
  k.v.box(x, base + h, z, x, base + h, z + dir * 3, C.poleD);
  k.g.set(x, base + h - 1, z + dir * 3, C.warm2);
  k.glow(x, base + h - 1, z + dir * 3, 0xffc77a, 4.2);
  k.glow(x, base, z + dir * 3, 0xffb867, 2.6, 0.7); // 地上的一圈暖光
};
const vending = (k: Kit, x: number, z: number, body: number, base = 1) => {
  k.v.box(x, base, z, x + 5, base + 9, z + 3, body);
  k.v.box(x, base + 10, z, x + 5, base + 10, z + 3, sh(body, 0.8));
  const drinks = [0xff9fbf, 0xffd36e, 0x9be3ff, 0xc4b5fd, 0xffffff];
  for (let yy = base + 4; yy <= base + 8; yy++) for (let xx = x + 1; xx <= x + 3; xx++)
    k.g.set(xx, yy, z + 4, (yy - base) % 2 === 0 ? drinks[(xx + yy) % drinks.length] : 0xe6fbff);
  k.v.box(x + 1, base + 1, z + 4, x + 3, base + 2, z + 4, 0x1f2433);
  k.g.set(x + 4, base + 5, z + 4, 0xff6b6b); k.g.set(x + 4, base + 6, z + 4, 0x6dffb0);
  k.glow(x + 2, base + 6, z + 5, 0xbdf1ff, 3.2);
};
const bench = (k: Kit, x: number, z: number, len = 6, base = 1) => {
  k.v.box(x, base, z, x, base + 1, z, C.iron); k.v.box(x + len - 1, base, z, x + len - 1, base + 1, z, C.iron);
  k.v.box(x, base + 2, z, x + len - 1, base + 2, z + 1, 0xa0744e);
  k.v.box(x, base + 3, z, x + len - 1, base + 4, z, 0xa0744e);
};
const fence = (k: Kit, x0: number, x1: number, z: number, h = 7, base = 1) => {
  for (let x = x0; x <= x1; x++) {
    if (x % 2 === 0) k.v.box(x, base, z, x, base + h, z, C.iron);
    k.v.set(x, base + h, z, C.iron);
    k.v.set(x, base + 2, z, C.iron);
  }
};
const tree = (k: Kit, x: number, z: number, h: number, kind: 'round' | 'sakura', base = 1) => {
  const r = k.r;
  k.v.box(x, base, z, x + 1, base + h, z + 1, C.bark);
  k.v.box(x + 2, base + h - 3, z, x + 3, base + h - 2, z, C.bark);
  const cols = kind === 'sakura' ? [C.sakura, C.sakura2, C.sakura3] : [C.leaf, C.leaf2, C.leaf3];
  const blobs = kind === 'sakura' ? 5 : 4;
  for (let i = 0; i < blobs; i++) {
    const R = (kind === 'sakura' ? 4 : 3.5) + r() * 2.5;
    const cx = x + 1 + (r() - 0.5) * 8, cy = base + h + 2 + r() * 4, cz = z + 1 + (r() - 0.5) * 6;
    k.v.ellipsoid(cx, cy, cz, R, R * 0.8, R, (xx, yy) => (r() < 0.12 ? null : yy > cy + R * 0.3 ? cols[2] : r() < 0.45 ? cols[1] : cols[0]));
  }
  if (kind === 'sakura') for (let i = 0; i < 10; i++) k.v.set(x + Math.floor((r() - 0.5) * 12), base, z + Math.floor((r() - 0.5) * 8), C.sakura3);
};
/** 窗户格子：亮灯 / 暗窗；可以有一扇亮着电视的蓝光 */
const windows = (k: Kit, x0: number, x1: number, y0: number, y1: number, z: number, lit = 0.4, tv = false) => {
  let tvDone = !tv;
  for (let y = y0; y <= y1; y += 4) for (let x = x0; x <= x1 - 1; x += 3) {
    if (!tvDone && y > (y0 + y1) / 2 && k.r() < 0.2) {
      k.g.box(x, y, z, x + 1, y + 1, z, 0x7db4ff); k.glow(x, y, z + 1, 0x7db4ff, 1.6); tvDone = true; continue;
    }
    if (k.r() < lit) k.g.box(x, y, z, x + 1, y + 1, z, k.r() < 0.75 ? C.warm : C.warm2);
    else k.v.box(x, y, z, x + 1, y + 1, z, C.dark);
  }
};

/** 底部：一层层纸页（这块地方是从漫画世界撕下来的）——往下收窄，边缘有几页翘起、垂下来 */
const paperStrata = (k: Kit, x0: number, x1: number, z0: number, z1: number) => {
  const r = k.r;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2 + 0.5, rz = (z1 - z0) / 2 + 0.5;
  const depth = Math.round(Math.min(rx, rz) * 0.7) + 6;
  const pageCols = [0xfdfcf7, 0xf4efe1, 0xebe4d1];
  for (let kk = 1; kk <= depth; kk++) {
    const t = Math.pow(1 - (kk - 1) / depth, 0.7);
    const ax = rx * t, az = rz * t;
    const ink = kk % 5 === 0;
    for (let x = Math.floor(cx - ax); x <= Math.ceil(cx + ax); x++) for (let z = Math.floor(cz - az); z <= Math.ceil(cz + az); z++) {
      // 撕开的纸边：方形轮廓上加一点锯齿
      const ex = Math.abs(x - cx) / ax, ez = Math.abs(z - cz) / az;
      if (Math.max(ex, ez) > 1 - (r() < 0.25 ? 0.08 : 0)) continue;
      const edge = Math.max(ex, ez) > 0.9;
      k.v.set(x, -kk, z, ink && edge ? 0x2a2a35 : edge && (x + z + kk) % 4 === 0 ? 0xd9d0b8 : pageCols[kk % 3]);
    }
  }
  // 垂下来的几页纸（带一点漫画分格的黑线）
  for (let i = 0; i < Math.max(3, (x1 - x0) / 8); i++) {
    const side = r() < 0.5;
    const x = Math.floor(x0 + r() * (x1 - x0)), z = side ? z1 : z0;
    const w = 3 + Math.floor(r() * 4), len = 4 + Math.floor(r() * 8);
    for (let yy = 0; yy < len; yy++) for (let xx = 0; xx < w; xx++) {
      const zz = z + (side ? 1 : -1) * Math.floor(yy * 0.35);
      k.v.set(x + xx, -1 - yy, zz, yy % 4 === 3 || xx === 0 ? 0x2a2a35 : 0xfdfcf7);
    }
  }
};

// ============ 各个场景 ============

/** 「我们住的那条街」：第一章第 2 话的黄昏街道——两家店、路口七点整的钟、路灯、售货机 */
export const dStreet = (seed = 5, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const W = 64, D = 26;
  k.v.box(0, 0, 0, W - 1, 1, 12, (x, y, z) => (y === 1 ? ((x + z) % 4 === 0 ? 0xd8cbb4 : 0xe9dcc4) : 0xc9b79a)); // 石板人行道
  k.v.box(0, 0, 13, W - 1, 0, D - 1, (x, y, z) => (z === 19 && x % 5 < 2 ? 0xf3e7c9 : (x * 5 + z) % 9 === 0 ? 0x6e6a7e : 0x7a7590));
  // 店铺：参照第一章的小店（遮阳棚条纹、橱窗暖光、二楼窗、屋顶烟囱和天线）
  const shop = (x0: number, w: number, h: number, wall: number, aw: [number, number], sign: number) => {
    k.v.box(x0, 2, 0, x0 + w - 1, h, 7, wall);
    k.v.box(x0 - 1, h + 1, 0, x0 + w, h + 1, 8, sh(wall, 0.78));
    for (let x = x0; x < x0 + w; x++) k.v.box(x, 11, 8, x, 11, 10, Math.floor(x / 2) % 2 ? aw[0] : aw[1]);
    for (let x = x0; x < x0 + w; x++) k.v.set(x, 10, 10, Math.floor(x / 2) % 2 ? aw[0] : aw[1]);
    k.g.box(x0 + 1, 3, 8, x0 + w - 5, 8, 8, 0xffe2a8);
    k.v.box(x0 + w - 4, 2, 8, x0 + w - 2, 9, 8, 0x8a5a3b);
    k.g.box(x0 + 2, 13, 8, x0 + w - 3, 14, 8, sign);
    for (let x = x0 + 2; x < x0 + w - 2; x += 4) (k.r() < 0.6 ? k.g : k.v).box(x, 17, 8, x + 1, 19, 8, k.r() < 0.6 ? C.warm : 0x5a6488);
    k.v.box(x0 + 2, h + 2, 2, x0 + 3, h + 7, 3, 0xa8754f);                 // 烟囱
    k.v.box(x0 + w - 3, h + 2, 4, x0 + w - 3, h + 9, 4, 0x8b90a8); k.v.box(x0 + w - 5, h + 8, 4, x0 + w - 1, h + 8, 4, 0x8b90a8); // 天线
    k.glow(x0 + w / 2, 6, 10, 0xffd59a, 4.5);
  };
  shop(2, 18, 24, 0xf3dfc8, [0xf472b6, 0xffffff], 0xff9fbf);
  shop(24, 16, 28, 0xd9cdf2, [0x22c55e, 0xffffff], 0x9be3b0);
  // 路口的钟：七点整
  k.v.box(46, 2, 9, 46, 20, 9, 0x3c4258);
  k.v.ellipsoid(46.5, 23, 9.5, 3.2, 3.2, 1, 0xffffff); k.v.ellipsoid(46.5, 23, 9.5, 3.6, 3.6, 0.6, 0x3c4258);
  k.v.box(46, 23, 10, 46, 25, 10, 0x1f2230); k.v.box(46, 21, 10, 46, 22, 10, 0x1f2230);  // 时针朝下、分针朝上：7 点
  k.v.set(45, 21, 10, 0x1f2230);
  lamp(k, 54, 10, 22, 2, 1);
  vending(k, 57, 3, 0xe5484d, 2);
  bench(k, 42, 4, 8, 2);
  tree(k, 50, 2, 14, 'sakura', 2);
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 豆沙的房间（剖面：后墙 + 左墙） */
export const dRoom = (seed = 3, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const W = 46, D = 36, H = 30;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, (x, y, z) => ((x + (z >> 2)) % 6 === 0 ? 0xc48f63 : 0xd8a473));
  k.v.box(0, 1, 0, W - 1, H, 1, (x, y) => (y <= 2 ? 0xc9b08a : (x >> 1) % 3 ? 0xd3e2ff : 0xe4edff));
  k.v.box(0, 1, 0, 1, H, D - 1, (x, y, z) => (y <= 2 ? 0xc9b08a : (z >> 1) % 3 ? 0xcfdcf7 : 0xdde7fb));
  for (let x = 6; x <= 19; x++) for (let y = 12; y <= 24; y++) { k.v.del(x, y, 1); k.g.set(x, y, 1, y < 15 && (x * 7 + y) % 5 === 0 ? C.warm : 0x1c2a5c); }
  k.g.box(16, 21, 1, 17, 22, 1, 0xfff4c8);
  k.v.box(5, 11, 2, 5, 25, 2, 0x93c5fd); k.v.box(20, 11, 2, 20, 25, 2, 0x93c5fd); k.v.box(5, 25, 2, 20, 25, 2, 0xc9a27a);
  k.v.box(3, 11, 2, 4, 26, 3, 0xbcd4f6); k.v.box(21, 11, 2, 22, 26, 3, 0xbcd4f6);
  for (let x = 2; x < W; x += 3) k.g.set(x, H - 3 - (x % 6 === 2 ? 1 : 0), 2, [0xfde68a, 0xfbcfe8, 0xbfdbfe][Math.floor(x / 3) % 3]);
  k.glow(W / 2, H - 4, 3, 0xffe2b0, 5, 0.6);
  k.v.box(25, 16, 2, 30, 24, 2, 0xfbcfe8); k.v.box(26, 22, 2, 29, 23, 2, 0x2563eb); k.v.box(27, 18, 2, 28, 20, 2, 0xef4444);
  k.v.box(24, 1, 2, 42, 8, 9, (x, y) => (y === 8 ? 0xb07a4c : x === 24 || x === 42 ? 0x8a5a3b : null));
  k.v.box(26, 9, 3, 33, 15, 3, 0x2a2f45); k.v.box(35, 9, 3, 41, 14, 3, 0x2a2f45);
  k.g.box(27, 10, 4, 32, 13, 4, 0xbfe0ff); k.g.box(27, 14, 4, 32, 14, 4, 0x9be3b0); k.g.box(36, 10, 4, 40, 13, 4, 0xffd1e8);
  k.glow(30, 12, 6, 0xbfe0ff, 4);
  k.v.box(29, 9, 6, 38, 9, 7, 0xe5e7eb);
  k.v.box(30, 1, 12, 36, 5, 17, 0xf472b6); k.v.box(30, 6, 17, 36, 13, 18, 0xec4899);
  k.v.box(2, 1, 18, 18, 4, D - 3, 0x8a6a4a);
  k.v.box(2, 5, 18, 18, 6, D - 3, (x, y, z) => (z < 22 ? 0xffffff : (x + z) % 4 === 0 ? 0x86b4ee : 0x9cc4f5));
  k.v.box(4, 7, 24, 8, 11, 28, 0xffffff); k.v.box(4, 12, 25, 5, 13, 25, 0x2a2a3a); k.v.box(7, 12, 25, 8, 13, 25, 0x2a2a3a);
  k.v.set(5, 10, 29, 0x2a2a3a); k.v.set(7, 10, 29, 0x2a2a3a);
  k.v.box(20, 1, 22, 32, 1, 32, (x, y, z) => ((x + z) % 2 ? 0xf9c9de : 0xfbd8e8));
  k.v.box(2, 1, 4, 5, 18, 12, 0x9a6b45);
  for (const y of [6, 11, 16]) for (let z = 5; z <= 11; z++) k.v.set(6, y, z, [0xef4444, 0x3b82f6, 0xfbbf24, 0x10b981, 0xf472b6][z % 5]);
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 公寓楼群（某一扇窗里，电视亮着蓝光） */
export const dTowers = (seed = 7, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const blocks = [[0, 18, 70], [20, 20, 52], [42, 16, 84], [60, 18, 46]];
  let tvLeft = true;
  for (const [x0, w, h] of blocks) {
    const wall = [0x5b5f86, 0x6a6496, 0x4f5a80, 0x726fa0][Math.floor(k.r() * 4)];
    k.v.box(x0, 0, 0, x0 + w - 1, h, 14, wall);
    windows(k, x0 + 2, x0 + w - 2, 10, h - 4, 15, 0.45, tvLeft && h > 60);
    if (h > 60) tvLeft = false;
    k.v.box(x0 + 2, h + 1, 4, x0 + 6, h + 6, 9, 0x8b90a8);
    if (k.r() < 0.7) { k.v.box(x0 + w - 3, h + 1, 6, x0 + w - 3, h + 12, 6, 0xaab0c4); k.g.set(x0 + w - 3, h + 13, 6, 0xff6b6b); k.glow(x0 + w - 3, h + 13, 6, 0xff6b6b, 1.2); }
    for (let y = 8; y < h; y += 12) k.v.box(x0 + w, y, 4, x0 + w + 1, y + 2, 7, 0xc9cede);
    k.v.box(x0 + 2, 1, 15, x0 + 5, 7, 15, 0x8a5a3b);
    k.g.box(x0 + 3, 8, 15, x0 + 4, 8, 15, C.warm2);
  }
  k.v.box(0, 0, 15, 77, 0, 22, (x, y, z) => (((x >> 1) + (z >> 1)) % 2 ? C.walk : C.walk2));
  lamp(k, 30, 21, 22, 1, -1);
  paperStrata(k, 0, 77, 0, 22);
  return k.pack();
};

/** 快递站 */
export const dWarehouse = (seed = 9, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const W = 60, D = 40;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, (x, y, z) => ((x + z) % 9 === 0 ? 0x9aa0ae : (z === 20 && x % 4 < 2) ? 0xf2c94c : 0xaeb3bf));
  k.v.box(0, 1, 0, W - 1, 30, 1, 0x8d93a6);
  k.v.box(38, 1, 2, 55, 20, 2, (x, y) => (y % 2 ? 0xb4bac8 : 0x9ea5b6));       // 卷帘门
  k.g.box(40, 22, 2, 53, 23, 2, 0xffe08a);
  for (const x0 of [2, 19]) {
    k.v.box(x0, 1, 2, x0, 26, 7, 0x4b5675); k.v.box(x0 + 15, 1, 2, x0 + 15, 26, 7, 0x4b5675);
    for (const y of [1, 9, 17, 25]) k.v.box(x0, y, 2, x0 + 15, y, 7, 0x4b5675);
    for (const y of [2, 10, 18]) for (let x = x0 + 1; x < x0 + 14; x += 4) if (k.r() < 0.85) {
      const hh = 3 + Math.floor(k.r() * 4);
      k.v.box(x, y, 3, x + 2 + Math.floor(k.r() * 2), y + hh, 6, k.r() < 0.5 ? 0xd6a565 : 0xc8955a);
      k.v.box(x, y + hh, 4, x + 2, y + hh, 4, 0xf3dfb8);
    }
  }
  k.v.box(4, 1, 20, 56, 4, 25, (x, y) => (y === 4 ? (x % 2 ? 0x2b2f42 : 0x3a3f55) : y === 1 ? 0x5a6070 : null));
  for (let x = 4; x <= 56; x += 8) k.v.box(x, 1, 20, x, 3, 25, 0x5a6070);
  for (let x = 8; x < 52; x += 11) { k.v.box(x, 5, 21, x + 4, 8, 24, 0xd6a565); k.v.box(x, 8, 22, x + 4, 8, 22, 0xf3dfb8); }
  for (let i = 0; i < 9; i++) { const x = 42 + (i % 3) * 4, y = 1 + Math.floor(i / 3) * 4; k.v.box(x, y, 30, x + 3, y + 3, 33, i % 2 ? 0xd6a565 : 0xc8955a); }
  k.v.box(30, 1, 30, 36, 2, 35, 0x3b82f6); k.v.box(36, 3, 30, 36, 9, 35, 0x2a51a8);
  for (const x of [10, 28, 46]) { k.v.box(x, 28, 16, x, 34, 16, 0x3c4258); k.v.box(x - 2, 27, 15, x + 2, 27, 17, 0x3c4258); k.g.box(x - 1, 26, 16, x + 1, 26, 16, 0xfff1c8); k.glow(x, 25, 16, 0xfff1c8, 4); }
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 回家路上的公园 */
export const dPark = (seed = 11, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const W = 56, D = 40;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, (x, y, z) => (Math.abs(z - 20 + Math.sin(x / 6) * 3) < 3 ? ((x + z) % 3 ? 0xe9d9b8 : 0xddcca8) : (x * 3 + z) % 7 === 0 ? 0x6fbf7e : 0x7fcf8c));
  tree(k, 6, 6, 16, 'sakura'); tree(k, 44, 32, 13, 'round'); tree(k, 48, 6, 18, 'sakura'); tree(k, 24, 33, 12, 'round');
  bench(k, 20, 12, 8); bench(k, 34, 27, 8);
  lamp(k, 32, 14, 22, 1, 1); lamp(k, 14, 26, 22, 1, -1);
  vending(k, 3, 26, 0x2fb8b0);
  k.v.ellipsoid(16, 0.5, 30, 7, 0.6, 4.5, 0x7db4ff);
  k.v.ellipsoid(16, 0.6, 30, 6, 0.5, 3.5, 0x9cc9ff);
  fence(k, 0, W - 1, 0, 5);
  for (let i = 0; i < 14; i++) { const x = 3 + Math.floor(k.r() * 50), y = 4 + Math.floor(k.r() * 10), z = 3 + Math.floor(k.r() * 34); k.g.set(x, y, z, 0xfff3a0); if (i % 3 === 0) k.glow(x, y, z, 0xfff3a0, 0.9); }
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 天台和那扇门 */
export const dRooftop = (seed = 13, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const W = 44, D = 32;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, (x, y, z) => (((x >> 2) + (z >> 2)) % 2 ? 0x8d93a6 : 0xa3a8b6));
  fence(k, 0, W - 1, 0, 9); fence(k, 0, W - 1, D - 1, 9);
  for (let z = 0; z < D; z++) { if (z % 2 === 0) { k.v.box(0, 1, z, 0, 9, z, C.iron); k.v.box(W - 1, 1, z, W - 1, 9, z, C.iron); } k.v.set(0, 9, z, C.iron); k.v.set(W - 1, 9, z, C.iron); }
  k.v.box(14, 1, 4, 30, 24, 14, 0xc9cede);
  k.v.box(13, 25, 3, 31, 25, 15, 0x8b90a8);
  k.v.box(18, 1, 15, 18, 18, 15, 0xe2e8f0); k.v.box(26, 1, 15, 26, 18, 15, 0xe2e8f0); k.v.box(18, 18, 15, 26, 18, 15, 0xe2e8f0);
  for (let x = 19; x <= 25; x++) for (let y = 1; y <= 17; y++) k.g.set(x, y, 15, x === 22 ? 0xffffff : 0xfff7dc);
  k.glow(22, 9, 17, 0xfff3d0, 7, 1.2);
  k.glow(22, 1, 19, 0xfff3d0, 4, 0.8);
  k.v.box(3, 1, 22, 3, 12, 22, 0x8b90a8); k.v.box(40, 1, 22, 40, 12, 22, 0x8b90a8);
  k.wire([3, 12, 22], [40, 12, 22], 0.35);
  k.v.box(12, 6, 22, 15, 10, 22, 0x93c5fd); k.v.box(24, 6, 22, 27, 10, 22, 0xfbcfe8);
  k.v.box(34, 1, 4, 41, 10, 11, 0x8b90a8); k.v.box(35, 11, 5, 40, 11, 10, 0x7a7f96);
  for (const x of [4, 9]) { k.v.box(x, 1, 4, x + 3, 4, 6, 0xd6dae4); k.v.box(x + 1, 2, 7, x + 2, 3, 7, 0x6b7182); }
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 摊开的漫画书 */
export const dBook = (seed = 17) => {
  const v = new Vox();
  const r = rand(seed);
  const page = (x0: number, dir: number) => {
    for (let i = 0; i < 24; i++) {
      const x = x0 + dir * i;
      const y = Math.round(Math.sin((i / 24) * Math.PI * 0.5) * 4);
      for (let z = 0; z < 32; z++) {
        v.set(x, y, z, 0xfffdf3);
        v.set(x, y - 1, z, i === 23 ? 0x3b6fd8 : 0xeee6d2);
        if (z === 10 || z === 21 || i === 11) v.set(x, y + 1, z, 0x1f2230);
        else if (r() < 0.06) v.set(x, y + 1, z, 0x94a3b8);
      }
    }
  };
  page(0, -1); page(1, 1);
  v.box(0, -3, 0, 1, -1, 31, 0x2a51a8);
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(v.geometry(0.22, [0, 0, 0], 0.04), solid));
  return grp;
};

/** 小树林浮岛（自然的土台，不是城市） */
export const dGrove = (seed = 19, grass = 0x7fcf8c, night = 0.5) => {
  const k = new Kit(rand(seed), night);
  const r = k.r;
  const W = 26 + Math.floor(r() * 12), D = 22 + Math.floor(r() * 8);
  const cx = W / 2, cz = D / 2;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (((x - cx) / (W / 2)) ** 2 + ((z - cz) / (D / 2)) ** 2 > 1) continue;
    k.v.set(x, 0, z, (x + z) % 5 === 0 ? sh(grass, 0.9) : grass);
  }
  const depth = Math.round(Math.min(W, D) * 0.55) + 4;
  for (let kk = 1; kk < depth; kk++) {
    const t = Math.pow(1 - kk / depth, 0.9);
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      if (((x - cx) / (W / 2 * t * (0.9 + r() * 0.1) + 0.5)) ** 2 + ((z - cz) / (D / 2 * t + 0.5)) ** 2 > 1) continue;
      k.v.set(x, -kk, z, kk < 3 ? 0xd8b48a : (x + z + kk) % 3 === 0 ? 0x978070 : 0xa98d78);
    }
  }
  for (let i = 0; i < 3; i++) tree(k, Math.floor(cx - 8 + r() * 14), Math.floor(cz - 5 + r() * 8), 9 + Math.floor(r() * 6), i === 1 ? 'sakura' : 'round');
  return k.pack();
};

// ============================================================
// 第 1 关 · 多出来的一维
// ============================================================
const INK = 0x1f2230, PAPER = 0xfdfcf7;

/** 摊开的漫画页，分格里的东西正一格格地「立起来」 */
export const dPageWorld = (seed = 31, night = 0.1) => {
  const k = new Kit(rand(seed), night);
  const W = 64, D = 44;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, PAPER);
  // 分格线
  for (let x = 0; x < W; x++) { k.v.set(x, 1, 0, INK); k.v.set(x, 1, D - 1, INK); k.v.set(x, 1, 21, INK); }
  for (let z = 0; z < D; z++) { k.v.set(0, 1, z, INK); k.v.set(W - 1, 1, z, INK); if (z < 21) k.v.set(30, 1, z, INK); else k.v.set(40, 1, z, INK); }
  // 左上格：一座小山——越往格子中间越「厚」
  for (let x = 2; x < 29; x++) for (let z = 2; z < 20; z++) {
    const d = Math.hypot((x - 15) / 13, (z - 11) / 9);
    const h = Math.max(0, Math.round((1 - d) * 9));
    for (let y = 1; y <= h; y++) k.v.set(x, y, z, y === h ? (d < 0.3 ? 0x8fd8a0 : 0x7fd497) : 0xd8c3a0);
    if (h === 0 && (x + z) % 3 === 0) k.v.set(x, 1, z, 0x9aa3b8);             // 还没立起来的地方：只有网点
  }
  tree(k, 14, 10, 8, 'round', 10);
  // 右上格：第一章的房间一角，一半还是平的线稿
  k.v.box(33, 1, 3, 61, 1, 19, 0xd8a473);
  k.v.box(33, 2, 3, 61, 14, 3, (x, y) => (x < 47 ? (y % 3 ? 0xd3e2ff : 0xe4edff) : null));
  for (let x = 47; x <= 61; x++) for (const y of [2, 14]) k.v.set(x, y, 3, INK);            // 右半边：只有轮廓线
  for (let y = 2; y <= 14; y++) k.v.set(61, y, 3, INK);
  k.v.box(36, 2, 12, 44, 4, 18, 0x8a6a4a); k.v.box(36, 5, 12, 44, 5, 18, 0x9cc4f5);           // 床（已经立体）
  for (let x = 50; x <= 58; x++) { k.v.set(x, 2, 6, INK); k.v.set(x, 2, 10, INK); }          // 书桌（还是线稿）
  for (let z = 6; z <= 10; z++) { k.v.set(50, 2, z, INK); k.v.set(58, 2, z, INK); }
  // 下方长格：一行字正在变成方块
  for (let i = 0; i < 9; i++) {
    const x = 4 + i * 6, hgt = Math.max(1, 5 - Math.abs(i - 4));
    k.v.box(x, 1, 28, x + 3, hgt, 31, i % 2 ? 0x93c5fd : 0xf9a8d4);
    k.v.box(x, 1, 34, x + 3, 1, 35, INK);
  }
  // 墨水瓶 + 铅笔
  k.v.box(44, 1, 24, 50, 7, 30, 0x2a2f45); k.v.box(45, 8, 25, 49, 9, 29, 0x111827); k.g.box(46, 7, 26, 48, 7, 28, 0x3b82f6);
  for (let i = 0; i < 18; i++) k.v.box(52 + Math.floor(i * 0.5), 1 + Math.floor(i * 0.35), 34 - i, 53 + Math.floor(i * 0.5), 2 + Math.floor(i * 0.35), 34 - i, i < 3 ? 0x2a2a35 : i < 5 ? 0xf5d0a9 : i > 15 ? 0xf472b6 : 0xfbbf24);
  paperStrata(k, 0, W - 1, 0, D - 1);
  return k.pack();
};

/** 漫画单行本摞成的城（书脊上有颜色条，顶上插着熊猫小旗） */
export const dBookCity = (seed = 33, night = 0.1) => {
  const k = new Kit(rand(seed), night);
  const r = k.r;
  const spines = [0x3b82f6, 0xf472b6, 0xfbbf24, 0x22c55e, 0xa78bfa, 0xef4444, 0x60a5fa];
  k.v.box(0, 0, 0, 55, 0, 33, 0xe9dcc4);
  let tallest = { x: 0, y: 0, z: 0 };
  for (let s2 = 0; s2 < 6; s2++) {
    const bx = 3 + (s2 % 3) * 17, bz = 3 + Math.floor(s2 / 3) * 15;
    let y = 1; const n = 6 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const w = 11 + Math.floor(r() * 3), d = 8, hh = 2;
      const ox = Math.round((r() - 0.5) * 2), oz = Math.round((r() - 0.5) * 2);
      const col = spines[Math.floor(r() * spines.length)];
      k.v.box(bx + ox, y, bz + oz, bx + ox + w - 1, y + hh - 1, bz + oz + d - 1, (x, yy, z) => (z === bz + oz + d - 1 ? col : x === bx + ox + w - 1 ? 0xfdfcf7 : (yy === y ? sh(col, 0.8) : col)));
      k.v.set(bx + ox + 2, y, bz + oz + d, PAPER);                                           // 书脊上的小标签
      y += hh;
      if (r() < 0.12) { k.v.box(bx + ox + 4, y - 1, bz + oz + d, bx + ox + 4, y - 7, bz + oz + d, 0xf472b6); } // 垂下来的书签带
    }
    if (y > tallest.y) tallest = { x: bx + 6, y, z: bz + 4 };
  }
  // 最高那摞上插一面熊猫小旗
  k.v.box(tallest.x, tallest.y, tallest.z, tallest.x, tallest.y + 9, tallest.z, 0x8a8f99);
  k.v.box(tallest.x + 1, tallest.y + 6, tallest.z, tallest.x + 5, tallest.y + 9, tallest.z, 0xffffff);
  k.v.set(tallest.x + 2, tallest.y + 8, tallest.z, INK); k.v.set(tallest.x + 4, tallest.y + 8, tallest.z, INK);
  // 一把靠着书堆的梯子
  for (let y = 1; y < 18; y++) { k.v.set(36, y, 1, 0xa8754f); k.v.set(39, y, 1, 0xa8754f); if (y % 3 === 0) k.v.box(36, y, 1, 39, y, 1, 0xc48f63); }
  paperStrata(k, 0, 55, 0, 33);
  return k.pack();
};

/** 正在「长出来」的岛：一半已经是草地和树，另一半只有线框，方块一块块地补上去 */
export const dGrowing = (seed = 35, grass = 0x7fcf8c, night = 0.1) => {
  const k = new Kit(rand(seed), night);
  const W = 40, D = 28;
  const solidPart = new Vox();
  for (let x = 0; x < 22; x++) for (let z = 0; z < D; z++) { solidPart.set(x, 0, z, (x + z) % 5 ? grass : sh(grass, 0.9)); for (let y = -1; y >= -4 + Math.floor(x / 8); y--) solidPart.set(x, y, z, y > -2 ? 0xd8b48a : 0xa98d78); }
  k.v.merge(solidPart);
  tree(k, 8, 10, 10, 'round');
  // 线框部分
  const lines: number[] = [];
  const box = (x: number, y: number, z: number) => {
    const a = [x * S, y * S, z * S], b = [(x + 1) * S, (y + 1) * S, (z + 1) * S];
    const e = [[a[0], a[1], a[2], b[0], a[1], a[2]], [a[0], a[1], a[2], a[0], a[1], b[2]], [b[0], a[1], a[2], b[0], a[1], b[2]], [a[0], a[1], b[2], b[0], a[1], b[2]],
      [a[0], b[1], a[2], b[0], b[1], a[2]], [a[0], b[1], a[2], a[0], b[1], b[2]], [b[0], b[1], a[2], b[0], b[1], b[2]], [a[0], b[1], b[2], b[0], b[1], b[2]],
      [a[0], a[1], a[2], a[0], b[1], a[2]], [b[0], a[1], a[2], b[0], b[1], a[2]], [a[0], a[1], b[2], a[0], b[1], b[2]], [b[0], a[1], b[2], b[0], b[1], b[2]]];
    e.forEach(l => lines.push(...l));
  };
  for (let x = 22; x < W; x += 2) for (let z = 0; z < D; z += 2) if ((x - 22) / 18 < 0.5 + Math.sin(z * 0.4) * 0.3 + 0.3) box(x / 2 * 2, 0, z);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  k.extras.push(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x6ee7f2, transparent: true, opacity: 0.6 })));
  // 正在补上的方块（会一块块冒出来）
  const pop: THREE.Mesh[] = [];
  const popMat = new THREE.MeshStandardMaterial({ color: grass, emissive: 0x2a6a4a, emissiveIntensity: 0.4 });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), popMat);
    m.position.set((22 + Math.floor(k.r() * 6) + 0.5) * S, 0.5 * S, (Math.floor(k.r() * D) + 0.5) * S);
    pop.push(m); k.extras.push(m);
  }
  return k.pack(t => pop.forEach((m, i) => { const p = ((t * 0.5 + i * 0.37) % 1); m.scale.setScalar(Math.min(1, p * 3)); m.visible = p < 0.95; }));
};

// ============================================================
// 第 2 关 · 空中回廊
// ============================================================
const LANTERN = 0xffd59a;

/** 一段悬空的廊桥：木地板、拱形顶棚、每个拱下挂着灯笼，尽头拐了个弯竖着往上走 */
export const dArcade = (seed = 41, night = 0.15) => {
  const k = new Kit(rand(seed), night);
  const L = 66, Wd = 9;
  k.v.box(0, 0, 0, L - 1, 0, Wd - 1, (x, y, z) => (z === 0 || z === Wd - 1 ? 0x8a5a3b : x % 3 === 0 ? 0xc48f63 : 0xd8a473));
  for (let x = 0; x < L; x += 6) {
    for (const z of [0, Wd - 1]) k.v.box(x, 1, z, x, 12, z, 0xf3e7d3);
    // 拱：半圆
    for (let a = 0; a <= 10; a++) { const ang = (a / 10) * Math.PI; const zz = Math.round(Wd / 2 - 0.5 + Math.cos(ang) * (Wd / 2)); const yy = 12 + Math.round(Math.sin(ang) * 4); k.v.box(x, yy, zz, x, yy, zz, 0x5b7fc4); }
    if (x + 6 < L) for (let xx = x; xx <= x + 6; xx++) for (let a = 0; a <= 10; a++) { const ang = (a / 10) * Math.PI; const zz = Math.round(Wd / 2 - 0.5 + Math.cos(ang) * (Wd / 2)); const yy = 13 + Math.round(Math.sin(ang) * 4); k.v.set(xx, yy, zz, xx % 2 ? 0x6b8fd4 : 0x5b7fc4); }
    // 灯笼
    k.v.box(x + 3, 13, 4, x + 3, 14, 4, 0x8a5a3b); k.g.box(x + 2, 10, 3, x + 4, 12, 5, 0xff9f7a); k.glow(x + 3, 11, 4, LANTERN, 2.4);
    // 栏杆
    if (x + 6 < L) for (const z of [0, Wd - 1]) k.v.box(x, 4, z, x + 6, 4, z, 0xa8754f);
  }
  // 尽头：廊桥拐个弯，竖着往上（路不再只通向前方）
  for (let y = 1; y < 30; y++) { k.v.box(L, y, 0, L + 1, y, Wd - 1, (x, yy, z) => (z === 0 || z === Wd - 1 ? 0x8a5a3b : yy % 3 === 0 ? 0xc48f63 : 0xd8a473)); }
  for (let y = 4; y < 30; y += 6) { k.g.box(L - 3, y, 3, L - 2, y + 1, 5, 0xff9f7a); k.glow(L - 3, y, 4, LANTERN, 2); }
  // 底下：几根垂到云里的石柱
  for (const x of [8, 30, 52]) k.v.box(x, -24, 3, x + 2, -1, 5, (xx, y) => (y % 5 === 0 ? 0xc9c2b0 : 0xe2dccb));
  return k.pack();
};

/** 方向错乱的楼梯：顶上往上走、侧面横着走、底下倒着走 */
export const dEscher = (seed = 43, night = 0.15) => {
  const k = new Kit(rand(seed), night);
  const N = 22;
  k.v.box(0, 0, 0, N - 1, N - 1, N - 1, (x, y, z) => ((x + y + z) % 7 === 0 ? 0xb9aee6 : (Math.floor(x / 4) + Math.floor(y / 4) + Math.floor(z / 4)) % 2 ? 0xcfc6f2 : 0xc4baee));
  const step = 0xf9a8d4, rail = 0x7c5cd6;
  for (let i = 0; i < 10; i++) {
    k.v.box(2 + i * 2, N, 4, 3 + i * 2, N + i, 9, step);                    // 顶面：往上
    k.v.box(N, 2 + i * 2, 12, N + i, 3 + i * 2, 17, step);                  // 侧面：横着
    k.v.box(4 + i * 2, -1 - i, 12, 5 + i * 2, -1, 17, step);                // 底面：倒着
  }
  for (let i = 0; i < 20; i++) { k.v.set(2 + i, N + Math.floor(i / 2) + 3, 3, rail); k.v.set(N + Math.floor(i / 2) + 3, 2 + i, 11, rail); }
  // 每段楼梯的尽头都有一扇小门
  k.v.box(22, N + 9, 5, 22, N + 15, 8, 0xc48f63); k.g.box(22, N + 10, 6, 22, N + 14, 7, 0xfff3d0);
  k.v.box(N + 9, 22, 13, N + 15, 22, 16, 0xc48f63); k.g.box(N + 10, 22, 14, N + 14, 22, 15, 0xfff3d0);
  k.glow(22, N + 12, 7, 0xfff3d0, 3); k.glow(N + 12, 22, 15, 0xfff3d0, 3);
  return k.pack();
};

/** 熊猫驿站：一座小亭子，里面睡着一只很大的熊猫；告示板上钉着几张纸条 */
export const dPandaShrine = (seed = 45, night = 0.15) => {
  const k = new Kit(rand(seed), night);
  const W = 40, D = 30;
  k.v.box(0, 0, 0, W - 1, 0, D - 1, (x, y, z) => (Math.abs(x - 20) < 4 && z > 18 ? 0xe9dcc4 : (x + z) % 5 === 0 ? 0x6fbf7e : 0x7fd497));
  k.v.box(6, 1, 4, 33, 1, 20, 0xd8cbb4);
  for (const [x, z] of [[7, 5], [32, 5], [7, 19], [32, 19]]) k.v.box(x, 2, z, x, 16, z, 0xc2410c);
  for (let i = 0; i < 5; i++) k.v.box(4 - i, 17 + i, 2 - i + i, 35 + i, 17 + i, 22 - i + i, i === 0 ? 0x7c2d12 : i % 2 ? 0x3b6fd8 : 0x2a51a8); // 屋檐一层层收上去
  for (let i = 0; i < 5; i++) k.v.box(4 + i * 2, 22 + i, 2 + i * 2, 35 - i * 2, 22 + i, 22 - i * 2, i % 2 ? 0x3b6fd8 : 0x2a51a8);
  // 睡着的大熊猫
  k.v.ellipsoid(20, 6, 12, 8, 5, 5.5, (x, y) => (y < 4 ? 0x2a2a35 : 0xffffff));
  k.v.ellipsoid(12, 7, 12, 4, 3.6, 3.8, 0xffffff);
  k.v.ellipsoid(10.5, 10.5, 9.8, 1.4, 1.4, 1, 0x2a2a35); k.v.ellipsoid(10.5, 10.5, 14.2, 1.4, 1.4, 1, 0x2a2a35);
  k.v.box(9, 7, 10, 9, 7, 11, 0x2a2a35); k.v.box(9, 7, 13, 9, 7, 14, 0x2a2a35);           // 闭着的眼睛
  k.v.ellipsoid(25, 3, 16.5, 2.5, 2, 2, 0x2a2a35); k.v.ellipsoid(25, 3, 7.5, 2.5, 2, 2, 0x2a2a35);
  // 灯笼
  for (const x of [7, 32]) { k.g.box(x, 13, 3, x, 15, 3, 0xff9f7a); k.glow(x, 14, 3, LANTERN, 2.6); }
  // 告示板 + 纸条
  k.v.box(36, 1, 24, 36, 10, 24, 0x8a5a3b); k.v.box(30, 7, 24, 38, 12, 24, 0xa8754f);
  for (const [x, y] of [[31, 8], [34, 10], [37, 8]]) { k.v.box(x, y, 25, x + 1, y + 1, 25, PAPER); k.v.set(x, y + 1, 25, 0xf472b6); }
  for (let kk = 1; kk < 14; kk++) { const t = 1 - kk / 14; for (let x = Math.floor(20 - 19 * t); x <= Math.ceil(20 + 19 * t); x++) for (let z = Math.floor(15 - 14 * t); z <= Math.ceil(15 + 14 * t); z++) if (k.r() > 0.04) k.v.set(x, -kk, z, kk < 3 ? 0xd8b48a : (x + z) % 4 ? 0xa98d78 : 0x978070); }
  return k.pack();
};

// ============================================================
// 第 3 关 · 线框断层塔
// ============================================================
const WIRE = 0x9fe8ff;
const edgeBox = (k: Kit, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color = WIRE) => {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry((x1 - x0 + 1) * S, (y1 - y0 + 1) * S, (z1 - z0 + 1) * S));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  l.position.set(((x0 + x1 + 1) / 2) * S, ((y0 + y1 + 1) / 2) * S, ((z0 + z1 + 1) / 2) * S);
  k.extras.push(l);
};

/** 断层塔：一座塔被切成几段、每段往旁边错开；切口发着光，越往上越只剩线框 */
export const dFaultTower = (seed = 51, night = 0.9) => {
  const k = new Kit(rand(seed), night);
  const segs = 6, H = 14, Wd = 16;
  let ox = 0, oz = 0;
  for (let i = 0; i < segs; i++) {
    const y0 = i * (H + 2);
    if (i < 4) {
      const wall = [0x5b5f86, 0x6a6496, 0x4f5a80, 0x726fa0][i % 4];
      k.v.box(ox, y0, oz, ox + Wd - 1, y0 + H - 1, oz + Wd - 1, wall);
      windows(k, ox + 2, ox + Wd - 2, y0 + 2, y0 + H - 3, oz + Wd, 0.45, i === 2);
      k.g.box(ox, y0 + H - 1, oz, ox + Wd - 1, y0 + H - 1, oz + Wd - 1, 0x9fe8ff);   // 切口
      k.glow(ox + Wd / 2, y0 + H, oz + Wd / 2, 0x9fe8ff, 4, 0.6);
    } else {
      edgeBox(k, ox, y0, oz, ox + Wd - 1, y0 + H - 1, oz + Wd - 1);
      for (let y = y0 + 3; y < y0 + H; y += 4) edgeBox(k, ox + 1, y, oz + Wd - 1, ox + Wd - 2, y, oz + Wd - 1, 0x6ee7f2);
    }
    ox += Math.round((k.r() - 0.5) * 8); oz += Math.round((k.r() - 0.5) * 6);
  }
  // 底下：碎开的几块
  for (let i = 0; i < 8; i++) { const x = Math.floor(k.r() * Wd), z = Math.floor(k.r() * Wd), s2 = 2 + Math.floor(k.r() * 3); k.v.box(x, -3 - i * 2, z, x + s2, -2 - i * 2, z + s2, 0x4f5a80); }
  return k.pack();
};

/** 建模软件的坐标轴手柄：一块网格地板、一个白色立方体（角上亮着顶点）、红绿蓝三根箭头和旋转环 */
export const dGizmo = (seed = 53, night = 0.9) => {
  const k = new Kit(rand(seed), night);
  k.v.box(0, 0, 0, 39, 0, 39, (x, y, z) => (x % 5 === 0 || z % 5 === 0 ? 0x4a5384 : 0x2c3360));
  k.v.box(12, 1, 12, 25, 14, 25, (x, y, z) => ((x + y + z) % 2 ? 0xe9edf7 : 0xdfe4f0));
  for (const x of [12, 25]) for (const y of [1, 14]) for (const z of [12, 25]) { k.g.box(x, y, z, x, y, z, 0xffb347); k.glow(x, y, z, 0xffb347, 0.9); }
  const arrow = (dir: 'x' | 'y' | 'z', color: number) => {
    for (let i = 0; i < 16; i++) { const p: [number, number, number] = dir === 'x' ? [26 + i, 8, 19] : dir === 'y' ? [19, 15 + i, 19] : [19, 8, 26 + i]; k.g.set(p[0], p[1], p[2], color); }
    const tip: [number, number, number] = dir === 'x' ? [42, 8, 19] : dir === 'y' ? [19, 31, 19] : [19, 8, 42];
    k.g.box(tip[0] - 1, tip[1] - 1, tip[2] - 1, tip[0] + 1, tip[1] + 1, tip[2] + 1, color);
    k.glow(tip[0], tip[1], tip[2], color, 2);
  };
  arrow('x', 0xff5d6c); arrow('y', 0x5ef08a); arrow('z', 0x5ea8ff);
  // 旋转环
  for (const [c, rot] of [[0xff5d6c, [0, Math.PI / 2, 0]], [0x5ef08a, [Math.PI / 2, 0, 0]], [0x5ea8ff, [0, 0, 0]]] as const) {
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * Math.PI * 2) * 2.4, Math.sin(i / 64 * Math.PI * 2) * 2.4, 0))), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.7 }));
    ring.position.set(19.5 * S, 8 * S, 19.5 * S); ring.rotation.set(rot[0], rot[1], rot[2]); k.extras.push(ring);
  }
  for (let kk = 1; kk < 6; kk++) k.v.box(kk, -kk, kk, 39 - kk, -kk, 39 - kk, kk % 2 ? 0x2c3360 : 0x232a52);
  return k.pack();
};

/** 搭到一半的楼：脚手架、吊臂上挂着一块方块 */
export const dScaffold = (seed = 55, night = 0.9) => {
  const k = new Kit(rand(seed), night);
  k.v.box(0, 0, 0, 33, 0, 25, 0x6b7182);
  k.v.box(4, 1, 4, 21, 18, 17, (x, y, z) => (y < 10 || x < 10 ? 0x8b90a8 : null));       // 半截墙
  for (let x = 2; x <= 23; x += 3) for (let y = 1; y <= 30; y++) { k.v.set(x, y, 2, 0xfbbf24); k.v.set(x, y, 19, 0xfbbf24); }
  for (let y = 5; y <= 30; y += 5) { k.v.box(2, y, 2, 23, y, 2, 0xd97706); k.v.box(2, y, 19, 23, y, 19, 0xd97706); k.v.box(2, y, 2, 2, y, 19, 0xd97706); k.v.box(23, y, 2, 23, y, 19, 0xd97706); }
  edgeBox(k, 4, 19, 4, 21, 30, 17);                                                        // 还没搭的部分：线框
  // 吊车
  k.v.box(28, 1, 10, 29, 44, 11, 0xfbbf24);
  k.v.box(6, 44, 10, 33, 45, 11, 0xfbbf24);
  k.v.box(31, 40, 9, 33, 43, 12, 0x6b7182);
  k.wire([12, 44, 10.5], [12, 34, 10.5], 0);
  k.v.box(10, 30, 9, 14, 33, 12, 0x8b90a8);                                                 // 吊着的方块
  k.g.set(28, 46, 10, 0xff5d6c); k.glow(28, 46, 10, 0xff5d6c, 1.4);
  for (let i = 0; i < 6; i++) { const x = Math.floor(k.r() * 30), z = Math.floor(k.r() * 22); k.v.box(x, -2 - i * 2, z, x + 3, -1 - i * 2, z + 3, 0x6b7182); }
  return k.pack();
};

// ============================================================
// 第 4 关 · 云端跳线
// ============================================================
const cloudBlob = (k: Kit, cx: number, cy: number, cz: number, rx: number, rz: number, col = 0xfff7f2) => {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.v.ellipsoid(cx + Math.cos(a) * rx * 0.55, cy + (i % 2), cz + Math.sin(a) * rz * 0.55, rx * 0.55, 3.2, rz * 0.55, (x, y) => (y < cy - 1 ? sh(col, 0.92) : col));
  }
  k.v.ellipsoid(cx, cy + 1, cz, rx * 0.7, 3.5, rz * 0.7, col);
};
const tube = (k: Kit, pts: [number, number, number][], color: number, r = 0.12) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] * S, p[1] * S, p[2] * S)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.15 }));
  k.extras.push(m);
  const plug = (p: [number, number, number]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2f45 })); b.position.set(p[0] * S, p[1] * S, p[2] * S); k.extras.push(b); };
  plug(pts[0]); plug(pts[pts.length - 1]);
};

/** 云和云之间搭着粗粗的彩色跳线（像插在两朵云上的接线），线上的光点往前跳 */
export const dPatchClouds = (seed = 61, night = 0.45) => {
  const k = new Kit(rand(seed), night);
  cloudBlob(k, 12, 0, 12, 14, 12); cloudBlob(k, 52, 6, 16, 11, 9); cloudBlob(k, 34, -10, 40, 9, 8, 0xffe9e0);
  const cols = [0xff7aa8, 0x6ec8ff, 0xffd36e];
  tube(k, [[16, 4, 12], [32, 26, 12], [50, 9, 16]], cols[0], 0.15);
  tube(k, [[10, 4, 16], [24, 14, 30], [34, -6, 40]], cols[1], 0.12);
  tube(k, [[54, 9, 18], [46, 6, 32], [36, -6, 40]], cols[2], 0.12);
  // 跳动的光点
  const dots: { m: THREE.Mesh; c: THREE.CatmullRomCurve3; o: number }[] = [];
  [[[16, 4, 12], [32, 26, 12], [50, 9, 16]], [[10, 4, 16], [24, 14, 30], [34, -6, 40]]].forEach((pts, i) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] * S, p[1] * S, p[2] * S)));
    for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); dots.push({ m, c, o: j / 3 + i * 0.1 }); k.extras.push(m); }
  });
  return k.pack(t => dots.forEach(d => { const p = (t * 0.25 + d.o) % 1; d.m.position.copy(d.c.getPoint(p)); d.m.position.y += Math.abs(Math.sin(p * Math.PI * 6)) * 0.25; }));
};

/** 云上的音柱：一排跟着节拍上下跳的方块柱，旁边一只大音箱 */
export const dEqBars = (seed = 63, night = 0.45) => {
  const k = new Kit(rand(seed), night);
  cloudBlob(k, 20, 0, 12, 20, 12);
  k.v.box(30, 3, 4, 40, 18, 12, 0x2a2f45);
  for (const [y, r] of [[8, 3], [15, 2]] as const) { k.v.ellipsoid(35.5, y, 13, r, r, 0.8, 0x111827); k.v.ellipsoid(35.5, y, 13.3, r * 0.5, r * 0.5, 0.6, 0x4b5563); }
  const bars: THREE.Mesh[] = [];
  const cols = [0xff7aa8, 0xffb36e, 0xffe36e, 0x7fe0a0, 0x6ec8ff, 0xb79cff, 0xff7aa8];
  cols.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    m.position.set((6 + i * 3.2) * S, 4 * S, 12 * S); bars.push(m); k.extras.push(m);
  });
  // 音符
  const note = (x: number, y: number) => { k.v.box(x, y, 8, x + 1, y + 1, 8, INK); k.v.box(x + 1, y + 2, 8, x + 1, y + 6, 8, INK); k.v.box(x + 2, y + 5, 8, x + 3, y + 6, 8, INK); };
  note(8, 16); note(18, 20);
  return k.pack(t => bars.forEach((m, i) => { const h = 1.2 + Math.abs(Math.sin(t * 3.2 + i * 0.9)) * 3 + Math.abs(Math.sin(t * 1.6 + i)) * 1.2; m.scale.y = h; m.position.y = 4 * S + h / 2; }));
};

/** 浮在云上的配线板：一面插满插孔的板子，一束束跳线垂下去，指示灯在闪 */
export const dSwitchboard = (seed = 65, night = 0.45) => {
  const k = new Kit(rand(seed), night);
  cloudBlob(k, 20, -2, 8, 22, 9);
  k.v.box(4, 2, 4, 36, 26, 7, 0x3c4258);
  k.v.box(3, 27, 3, 37, 27, 8, 0x2a2f45);
  for (let y = 5; y <= 24; y += 3) for (let x = 6; x <= 34; x += 2) k.v.set(x, y, 8, (x + y) % 6 === 0 ? 0x111827 : 0x9ca3af);
  const lights: { x: number; y: number }[] = [];
  for (let x = 6; x <= 34; x += 4) { k.g.set(x, 26, 8, 0x5ef08a); lights.push({ x, y: 26 }); }
  const cols = [0xff7aa8, 0x6ec8ff, 0xffd36e, 0x7fe0a0, 0xb79cff];
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.floor(k.r() * 14) * 2, y = 5 + Math.floor(k.r() * 7) * 3, x2 = 6 + Math.floor(k.r() * 14) * 2, y2 = 5 + Math.floor(k.r() * 7) * 3;
    tube(k, [[x, y, 9], [(x + x2) / 2, Math.min(y, y2) - 6 - k.r() * 8, 12], [x2, y2, 9]], cols[i % cols.length], 0.07);
  }
  return k.pack();
};

// ============================================================
// 第 5 关 · 世界的接缝
// ============================================================
/** 被缝起来的岛：左边还是漫画纸（墨线画的树和草），右边是方块草地和真正的树，中间一道发光的缝线 */
export const dStitched = (seed = 71, grass = 0x8fd8d2, night = 0.6) => {
  const k = new Kit(rand(seed), night);
  const W = 50, D = 30, gap = 25;
  // 纸的一半
  k.v.box(0, 0, 0, gap - 2, 0, D - 1, PAPER);
  for (let x = 0; x < gap - 1; x++) for (let z = 0; z < D; z++) if ((x * 3 + z * 5) % 11 === 0) k.v.set(x, 1, z, 0x9aa3b8);   // 网点
  // 墨线画的树（只有一层薄薄的线）
  for (let y = 1; y < 14; y++) k.v.set(10, y, 14, INK);
  for (let a = 0; a < 28; a++) { const ang = a / 28 * Math.PI * 2; k.v.set(10 + Math.round(Math.cos(ang) * 5), 17 + Math.round(Math.sin(ang) * 4), 14, INK); }
  for (let x = 3; x < 20; x += 3) { k.v.set(x, 1, 6, INK); k.v.set(x + 1, 2, 6, INK); }
  // 方块的一半
  for (let x = gap + 1; x < W; x++) for (let z = 0; z < D; z++) { k.v.set(x, 0, z, (x + z) % 5 ? grass : sh(grass, 0.9)); k.v.set(x, -1, z, 0xd8b48a); }
  tree(k, 38, 14, 10, 'sakura');
  // 缝线：一道发光的缝，大大的交叉针脚
  for (let z = 0; z < D; z += 4) {
    for (let i = -3; i <= 3; i++) { k.g.set(gap + i, 1, z + Math.round((i + 3) / 2), 0xffd889); k.g.set(gap + i, 1, z + 3 - Math.round((i + 3) / 2), 0xffd889); }
  }
  k.glow(gap, 1, D / 2, 0xffd889, 8, 0.8);
  paperStrata(k, 0, gap - 2, 0, D - 1);
  for (let kk = 2; kk < 12; kk++) { const t = 1 - kk / 12; for (let x = gap + 1; x < W; x++) for (let z = Math.floor(D / 2 - 15 * t); z <= Math.ceil(D / 2 + 15 * t); z++) if (Math.abs(x - (gap + W) / 2) < 13 * t + 1) k.v.set(x, -kk, z, kk % 3 ? 0xa98d78 : 0x978070); }
  return k.pack();
};

/** 一根很大的针，穿着金线，斜斜地把一块撕开的天空缝回去 */
export const dNeedle = (seed = 73, night = 0.6) => {
  const k = new Kit(rand(seed), night);
  // 针（斜着）
  for (let i = 0; i < 70; i++) {
    const x = i, y = Math.round(i * 0.45);
    const r2 = i < 6 ? 0 : i < 12 ? 1 : i > 58 ? 3 : 2;
    k.v.box(x, y - r2, -r2, x, y + r2, r2, i % 7 === 0 ? 0xe5e7eb : 0xcbd5e1);
    if (i > 61 && i < 68) { k.v.del(x, y, 0); k.v.del(x, y + 1, 0); }                                                    // 针眼
  }
  // 撕开的一块天空（一片带锯齿边的面片）
  const sky = new Vox();
  for (let x = -40; x < -2; x++) for (let y = -14; y < 30; y++) if (Math.abs(x + 21) + Math.abs(y - 8) * 0.7 < 22 - ((x * 7 + y * 3) % 4)) sky.set(x, y, -6, y > 12 ? 0xf0a3c0 : y > 4 ? 0xf6b48b : 0xb58aa8);
  k.v.merge(sky);
  // 金线：从针眼出来，穿过那块天空，再绕回来
  const thread = new THREE.CatmullRomCurve3([[66, 30, 0], [80, 40, 6], [40, 50, 10], [0, 30, 0], [-12, 16, -6], [-20, 6, -6], [-8, -4, -2]].map(p => new THREE.Vector3(p[0] * S, p[1] * S, p[2] * S)));
  const tm = new THREE.Mesh(new THREE.TubeGeometry(thread, 100, 0.06, 6, false), new THREE.MeshBasicMaterial({ color: 0xffd889, toneMapped: false }));
  k.extras.push(tm);
  k.glow(-12, 16, -6, 0xffd889, 3);
  return k.pack(t => { (tm.material as THREE.MeshBasicMaterial).color.setHSL(0.11, 0.9, 0.62 + Math.sin(t * 2) * 0.08); });
};

// ============ 鸟群 ============
export const birdFlock = (n = 7, seed = 23) => {
  const r = rand(seed);
  const g = new THREE.Group();
  const mk = () => {
    const b = new Vox();
    b.box(0, 0, 0, 0, 0, 1, 0xffffff); b.set(-1, 1, 0, 0xffffff); b.set(1, 1, 0, 0xffffff); b.set(-2, 2, 0, 0xf1f5f9); b.set(2, 2, 0, 0xf1f5f9);
    return new THREE.Mesh(b.geometry(0.18, [0, 0, 0], 0.03), solid);
  };
  const birds: { m: THREE.Mesh; off: THREE.Vector3; ph: number }[] = [];
  for (let i = 0; i < n; i++) {
    const m = mk();
    const off = new THREE.Vector3((r() - 0.5) * 6, (r() - 0.5) * 2, (r() - 0.5) * 6);
    birds.push({ m, off, ph: r() * 6 });
    g.add(m);
  }
  const update = (t: number, cx: number, cy: number, cz: number, R: number) => {
    const a = t * 0.12;
    const hx = cx + Math.cos(a) * R, hz = cz + Math.sin(a) * R;
    for (const b of birds) {
      b.m.position.set(hx + b.off.x, cy + b.off.y + Math.sin(t * 1.3 + b.ph) * 0.5, hz + b.off.z);
      b.m.rotation.y = -a;
      b.m.scale.y = 0.6 + Math.abs(Math.sin(t * 6 + b.ph)) * 0.6;
    }
  };
  return { group: g, update };
};

/** 每一关周围摆哪些场景（沿着路线左右交替摆开） */
export type DioramaKind = 'room' | 'street' | 'towers' | 'warehouse' | 'park' | 'rooftop' | 'book' | 'grove'
  | 'pageWorld' | 'bookCity' | 'growing' | 'arcade' | 'escher' | 'pandaShrine' | 'faultTower' | 'gizmo' | 'scaffold'
  | 'patchClouds' | 'eqBars' | 'switchboard' | 'stitched' | 'needle';
export const LEVEL_SETS: Record<number, DioramaKind[]> = {
  1: ['pageWorld', 'grove', 'bookCity', 'room', 'growing', 'book', 'grove'],
  2: ['arcade', 'pandaShrine', 'grove', 'street', 'escher', 'arcade'],
  3: ['faultTower', 'gizmo', 'towers', 'scaffold', 'faultTower', 'grove'],
  4: ['patchClouds', 'eqBars', 'switchboard', 'warehouse', 'patchClouds', 'grove'],
  5: ['stitched', 'needle', 'rooftop', 'park', 'stitched', 'book'],
};

/** 每关的夜色（影响光晕的强弱） */
export const LEVEL_NIGHT: Record<number, number> = { 1: 0.1, 2: 0.15, 3: 0.9, 4: 0.45, 5: 0.6 };

export const buildDiorama = (kind: string, seed: number, grass = 0x7fcf8c, night = 0.5): THREE.Group => {
  switch (kind) {
    case 'room': return dRoom(seed, night);
    case 'street': return dStreet(seed, night);
    case 'towers': return dTowers(seed, night);
    case 'warehouse': return dWarehouse(seed, night);
    case 'park': return dPark(seed, night);
    case 'rooftop': return dRooftop(seed, night);
    case 'book': return dBook(seed);
    case 'pageWorld': return dPageWorld(seed, night);
    case 'bookCity': return dBookCity(seed, night);
    case 'growing': return dGrowing(seed, grass, night);
    case 'arcade': return dArcade(seed, night);
    case 'escher': return dEscher(seed, night);
    case 'pandaShrine': return dPandaShrine(seed, night);
    case 'faultTower': return dFaultTower(seed, night);
    case 'gizmo': return dGizmo(seed, night);
    case 'scaffold': return dScaffold(seed, night);
    case 'patchClouds': return dPatchClouds(seed, night);
    case 'eqBars': return dEqBars(seed, night);
    case 'switchboard': return dSwitchboard(seed, night);
    case 'stitched': return dStitched(seed, grass, night);
    case 'needle': return dNeedle(seed, night);
    default: return dGrove(seed, grass, night);
  }
};
