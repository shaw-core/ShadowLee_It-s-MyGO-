// ============================================================
// 第二章场景的体素版：和角色同一套「堆方块」做法
//  · 浮岛：草皮顶面（深浅不一 + 偶尔冒出的小草和花）、往下滴的草边、土层、
//          底下一圈圈收窄的阶梯岩块
//  · 云、远景小岛、薄荷糖、纸页、弹跳菇、尖刺、终点圆环、碎裂饼干、玻璃板
// 只生成外壳（内部看不见的方块不建），保证一关几十个平台也很快。
// ============================================================
import * as THREE from 'three';
import { Vox, voxMaterial } from './voxel';
import { Theme3D, rand } from './world3d';

const mat = () => voxMaterial();
const mesh = (v: Vox, s: number, pivot: [number, number, number], m?: THREE.Material) => {
  const me = new THREE.Mesh(v.geometry(s, pivot, 0.06), m ?? mat());
  me.castShadow = true; me.receiveShadow = true;
  return me;
};
const shade = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();
const pick = (r: () => number, cs: number[]) => cs[Math.floor(r() * cs.length)];

/** 草皮平台（尺寸单位：米，中心在原点） */
export const voxIsland = (w: number, h: number, d: number, grass: number, th: Theme3D, seed: number, decorate = true) => {
  const g = new THREE.Group();
  const S = 0.2;
  const nx = Math.max(2, Math.round(w / S)), ny = Math.max(2, Math.round(h / S)), nz = Math.max(2, Math.round(d / S));
  const r = rand(seed);
  const v = new Vox();
  const gr = [grass, grass, shade(grass, 0.96), shade(grass, 1.03)];
  const earth = [th.earth, shade(th.earth, 0.92), shade(th.earth, 0.85)];
  for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
    const edge = x === 0 || z === 0 || x === nx - 1 || z === nz - 1;
    for (let y = 0; y < ny; y++) {
      const top = y === ny - 1;
      if (!top && !edge && y !== 0) continue; // 只建外壳
      // 草边往下滴：边缘的最上一两层是草
      const drip = edge && (y === ny - 2 ? r() < 0.55 : y === ny - 3 ? r() < 0.18 : false);
      const c = top || drip ? pick(r, gr) : y === 0 ? shade(th.earth, 0.8) : earth[(x * 7 + y * 3 + z * 5) % 3];
      v.set(x, y, z, c);
    }
    // 顶面的小草和花
    if (decorate && !edge && r() < 0.003) v.set(x, ny, z, pick(r, th.flower));
  }
  // 四个角缺一块，更像手堆的
  for (const [x, z] of [[0, 0], [nx - 1, 0], [0, nz - 1], [nx - 1, nz - 1]]) v.del(x, ny - 1, z);
  const slab = mesh(v, S, [nx / 2, ny / 2, nz / 2]);
  slab.name = 'slab'; g.add(slab);

  // 底部阶梯岩块（每块 0.25m）
  const R = 0.25;
  const foot = Math.min(w, d);
  const radius = foot * 0.42 / R;
  const depth = Math.max(3, Math.round((foot * 0.55 + 0.8) / R));
  const rock = new Vox();
  const rk = [th.rock, shade(th.rock, 0.9), shade(th.rock, 0.8)];
  const wobble = Array.from({ length: 8 }, () => 0.85 + r() * 0.3);
  const offs = w * d > 30 ? [[-0.2, -0.15], [0.22, 0.18]] : [[0, 0]];
  for (const [ox, oz] of offs) {
    const cx = (ox * w) / R, cz = (oz * d) / R;
    const rad = offs.length > 1 ? radius * 0.75 : radius;
    for (let k = 0; k < depth; k++) {
      const rr = rad * Math.pow(1 - k / depth, 0.85);
      if (rr < 0.6 && k < depth - 1) continue;
      const lim = Math.ceil(rr + 1);
      for (let x = -lim; x <= lim; x++) for (let z = -lim; z <= lim; z++) {
        const a = Math.atan2(z, x);
        const wv = wobble[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 8];
        const dd = Math.hypot(x, z);
        if (dd > rr * wv) continue;
        rock.set(Math.round(cx) + x, -k, Math.round(cz) + z, k < 1 ? shade(th.earth, 0.78) : rk[(((x + z + k) % 3) + 3) % 3]);
      }
    }
  }
  const rm = mesh(rock, R, [0, 0, 0]);
  rm.position.y = -h / 2 - R * 0.5;
  rm.castShadow = false;
  rm.receiveShadow = false; rm.name = 'rock';
  g.add(rm);
  return g;
};

/** 细平台 / 移动平台：一整块彩色方砖，顶边一圈亮色 */
export const voxSlab = (w: number, h: number, d: number, color: number, mover: boolean) => {
  const S = 0.2;
  const nx = Math.max(2, Math.round(w / S)), ny = Math.max(1, Math.round(h / S)), nz = Math.max(2, Math.round(d / S));
  const v = new Vox();
  const light = shade(color, 1.12), dark = shade(color, 0.86);
  for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) {
    const edge = x === 0 || z === 0 || x === nx - 1 || z === nz - 1;
    if (!edge && y !== 0 && y !== ny - 1) continue;
    v.set(x, y, z, y === ny - 1 && edge ? light : y === 0 ? dark : ((x + z) % 4 === 0 && y === ny - 1 ? shade(color, 0.96) : color));
  }
  if (mover) for (let x = 1; x < nx - 1; x++) { v.set(x, -1, Math.floor(nz / 2), 0x7dd3fc); }
  return mesh(v, S, [nx / 2, ny / 2, nz / 2]);
};

/** 方块云 */
export const voxCloud = (r: () => number, color: number, scale = 1) => {
  const v = new Vox();
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const cx = (i - n / 2) * 3 + r() * 2, cz = (r() - 0.5) * 3;
    const w = 2 + Math.floor(r() * 3), hgt = 1 + Math.floor(r() * 2);
    v.box(Math.round(cx - w), 0, Math.round(cz - 2), Math.round(cx + w), hgt, Math.round(cz + 2), (x, y) => (y === 0 ? shade(color, 0.93) : color));
  }
  const me = mesh(v, 0.6 * scale, [0, 0, 0]);
  me.castShadow = false;
  (me.material as THREE.MeshStandardMaterial).emissive?.setHex?.(0x000000);
  return me;
};

/** 远处的小浮岛（带一棵方块树） */
export const voxFarIsland = (r: () => number, th: Theme3D) => {
  const g = voxIsland(4 + r() * 6, 1.2, 3 + r() * 5, th.grass[Math.floor(r() * th.grass.length)], th, Math.floor(r() * 1e6), false);
  if (r() > 0.35) {
    const t = new Vox();
    t.box(0, 0, 0, 0, 4, 0, 0xa07850);
    t.box(-2, 4, -2, 2, 6, 2, th.grass[2] ?? th.grass[0]);
    t.box(-1, 7, -1, 1, 7, 1, th.grass[2] ?? th.grass[0]);
    const tm = mesh(t, 0.4, [0, 0, 0]);
    tm.position.y = 0.6;
    g.add(tm);
  }
  g.traverse(o => { (o as THREE.Mesh).castShadow = false; });
  return g;
};

/** 尖刺：一片小晶体柱 */
export const voxSpikes = (w: number, h: number, d: number, seed: number) => {
  const S = 0.1;
  const r = rand(seed);
  const v = new Vox();
  const nx = Math.round(w / S), nz = Math.round(d / S), nh = Math.round(h / S);
  v.box(0, 0, 0, nx - 1, 0, nz - 1, 0x6b4a6e);
  // 尖刺从两侧边缘对称铺满：最外一排的外沿离边 0.1m，正好对上伤害判定（四周各缩 0.1m），
  // 不留「看起来是地面、碰到却会死」的空白带。间距不超过 5 格（0.5m）。
  const spread = (n: number) => {
    const a = 2, b = n - 3;
    if (b <= a) return [Math.floor((n - 1) / 2)];
    const k = Math.ceil((b - a) / 5);
    return Array.from({ length: k + 1 }, (_, i) => Math.round(a + (i * (b - a)) / k));
  };
  for (const x of spread(nx)) for (const z of spread(nz)) {
    const top = nh - Math.floor(r() * 2);
    for (let y = 1; y <= top; y++) {
      const half = y < top * 0.45 ? 1 : 0;
      const c = y > top - 2 ? 0xffd1dc : y > top * 0.5 ? 0xff7a9a : 0xe11d48;
      v.box(x - half, y, z - half, x + half, y, z + half, c);
    }
  }
  return mesh(v, S, [nx / 2, nh / 2 + 0.5, nz / 2]);
};

/** 薄荷糖：带包装纸的方块糖 */
export const voxCandy = () => {
  const v = new Vox();
  v.box(-3, -3, -3, 2, 2, 2, (x, y) => ((x + y) % 3 === 0 ? 0xffffff : 0x86efc4));
  v.box(-6, -2, -2, -4, 1, 1, (x) => (x === -6 ? 0xc7f7e3 : 0xe0fff4));
  v.box(3, -2, -2, 5, 1, 1, (x) => (x === 5 ? 0xc7f7e3 : 0xe0fff4));
  v.set(-1, 2, 2, 0xffffff);
  return mesh(v, 0.06, [-0.5, -0.5, -0.5]);
};

/** 纸页：白纸 + 粉色胶带 + 字迹 */
export const voxPage = () => {
  const v = new Vox();
  v.box(-4, -6, 0, 4, 6, 0, 0xfffdf5);
  v.box(-2, 6, 0, 2, 7, 0, 0xf9a8d4);
  for (const y of [3, 1, -1, -3]) v.box(-3, y, 1, 2 - ((y + 9) % 3), y, 1, 0x94a3b8);
  return mesh(v, 0.06, [0, 0, 0.5]);
};

/** 弹跳菇 */
export const voxMushroom = (w: number, seed: number) => {
  const S = 0.1;
  const r = rand(seed);
  const v = new Vox();
  const R = Math.round(w / S / 2);
  v.box(-Math.round(R * 0.3), -5, -Math.round(R * 0.3), Math.round(R * 0.3), -1, Math.round(R * 0.3), 0xfff4e6);
  for (let y = 0; y <= Math.round(R * 0.55); y++) {
    const rr = R * Math.sqrt(1 - (y / (R * 0.6)) ** 2);
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      if (Math.hypot(x, z) > rr) continue;
      v.set(x, y, z, r() < 0.06 ? 0xffffff : y === 0 ? 0xe06aa6 : 0xff8cc6);
    }
  }
  return mesh(v, S, [0, 0, 0]);
};

/** 终点圆环 */
export const voxRing = () => {
  const v = new Vox();
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 10), y = Math.round(Math.sin(t) * 10);
    v.box(x - 1, y - 1, -1, x, y, 0, a % 8 < 4 ? 0xfde68a : 0xfbbf24);
  }
  return mesh(v, 0.1, [0, 0, 0], new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0xf59e0b, emissiveIntensity: 0.35 }));
};

/** 碎裂饼干平台 */
export const voxCookie = (w: number, h: number, d: number, seed: number, material: THREE.Material) => {
  const S = 0.2;
  const r = rand(seed);
  const nx = Math.round(w / S), ny = Math.max(2, Math.round(h / S)), nz = Math.round(d / S);
  const v = new Vox();
  v.box(0, 0, 0, nx - 1, ny - 1, nz - 1, (x, y, z) => (y === ny - 1 && r() < 0.12 ? 0x8a5a3b : (x + z) % 5 === 0 ? 0xd2a070 : 0xe0b285));
  const me = new THREE.Mesh(v.geometry(S, [nx / 2, ny / 2, nz / 2], 0.06), material);
  me.castShadow = true; me.receiveShadow = true;
  return me;
};

/** 闪烁玻璃板 */
export const voxGlass = (w: number, h: number, d: number, material: THREE.Material) => {
  const S = 0.2;
  const nx = Math.round(w / S), ny = Math.max(2, Math.round(h / S)), nz = Math.round(d / S);
  const v = new Vox();
  v.box(0, 0, 0, nx - 1, ny - 1, nz - 1, (x, y, z) => ((x === 0 || z === 0 || x === nx - 1 || z === nz - 1) ? 0xe0f7ff : (x + z) % 6 === 0 ? 0xd4f1ff : 0xa5e8ff));
  const me = new THREE.Mesh(v.geometry(S, [nx / 2, ny / 2, nz / 2], 0.03), material);
  me.receiveShadow = true;
  return me;
};
