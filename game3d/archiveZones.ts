// ============================================================
// 隐藏档案馆 · 分区几何（v0.16.1 重建）
//  纯几何组件：只负责「造东西 + 每帧更新 + 报告碰撞」，不含任何剧情文字。
//  · buildCRTStack      老式 CRT：机壳 / 4:3 屏 / 背后凸出的显像管壳 / 旋钮 / 喇叭网 / 线缆
//  · buildBrokenFrame   入口那台碎掉的大电视框（出口光幕装在它里面）
//  · buildVHSGridPath   不平整的网格走道：近处整齐，越远越被拉长
//  · buildRings         立着的圆环门洞（后面错开一层网格）
//  · buildDistortedScreens  被拉弯的显示器
//  · buildFloatingDebris    漂着的椅子 / 小电视 / 方块 / 球 / 碎字块
//  · buildRackClusters  不规则的机柜簇（代替旧版一圈 40 个等距机柜）
// 设计语言参考了用户提供的图（CRT 错位堆叠、蓝色透视网格、圆环、悬浮物），
// 所有模型、贴图都是这里现场生成的，没有使用参考图本身。
// 性能：同类零件用 InstancedMesh + 共享材质；每帧更新不 new 几何、不编译 shader。
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Collider } from './archiveWorld';

export interface BoxCollider { x: number; z: number; hw: number; hd: number; yaw: number }
export interface ZoneOpts { low: boolean; reduce: boolean }
export type Updater = (t: number, dt: number) => void;

const rnd = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------------- 屏幕贴图（共享，按种类） ----------------
export type ScreenKind = 'error' | 'error2' | 'static' | 'manga' | 'door' | 'panda' | 'pair' | 'bsod' | 'bars' | 'dark';
const TEXW = 160, TEXH = 120;
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = TEXW; c.height = TEXH; return c; };

/** 像素点阵字：先画到小画布，再把每个亮像素画成一个圆点 */
const dotText = (x: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string, dot = 1.6) => {
  const m = document.createElement('canvas'); m.width = 64; m.height = 16;
  const mx = m.getContext('2d')!; mx.fillStyle = '#fff'; mx.font = 'bold 12px monospace'; mx.textBaseline = 'middle'; mx.textAlign = 'center';
  mx.fillText(text, 32, 8);
  const d = mx.getImageData(0, 0, 64, 16).data;
  x.fillStyle = color;
  const step = size / 16;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 64; i++) if (d[(j * 64 + i) * 4 + 3] > 120) {
    x.beginPath(); x.arc(cx + (i - 32) * step, cy + (j - 8) * step, dot * step * 0.5, 0, Math.PI * 2); x.fill();
  }
};
const glowBg = (x: CanvasRenderingContext2D, a: string, b: string) => {
  const g = x.createRadialGradient(TEXW / 2, TEXH / 2, 10, TEXW / 2, TEXH / 2, TEXW * 0.7);
  g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, TEXW, TEXH);
};
const scan = (x: CanvasRenderingContext2D, a = 0.12) => { x.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < TEXH; y += 3) x.fillRect(0, y, TEXW, 1); };

const drawScreen = (kind: ScreenKind, x: CanvasRenderingContext2D, r: () => number) => {
  switch (kind) {
    case 'error':
      glowBg(x, '#e9f6ff', '#8cc3ec');
      dotText(x, 'ERROR', TEXW / 2, TEXH / 2, 150, '#4f86c6', 1.5); scan(x, 0.06); break;
    case 'error2':
      glowBg(x, '#d9efff', '#7fb4e4');
      dotText(x, 'ERROR', TEXW / 2 + 3, TEXH / 2, 150, 'rgba(255,90,110,.55)', 1.5);
      dotText(x, 'ERROR', TEXW / 2 - 3, TEXH / 2, 150, 'rgba(60,110,255,.6)', 1.5);
      dotText(x, 'ERROR', TEXW / 2, TEXH / 2, 150, '#f4fbff', 1.2); scan(x, 0.08); break;
    case 'static': {
      const img = x.createImageData(TEXW, TEXH);
      for (let i = 0; i < img.data.length; i += 4) { const v = 70 + r() * 150; img.data[i] = v * 0.85; img.data[i + 1] = v * 0.92; img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); scan(x, 0.18); break;
    }
    case 'manga':
      x.fillStyle = '#f7f9ff'; x.fillRect(0, 0, TEXW, TEXH);
      x.strokeStyle = '#1a2340'; x.lineWidth = 4; x.strokeRect(8, 8, TEXW - 16, TEXH - 16);
      x.beginPath(); x.moveTo(8, 56); x.lineTo(TEXW - 8, 48); x.moveTo(70, 52); x.lineTo(62, TEXH - 8); x.moveTo(108, 50); x.lineTo(112, 8); x.stroke();
      x.lineWidth = 1; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(110 + i * 3, 60); x.lineTo(TEXW - 8, 60 + i * 4); x.stroke(); }
      scan(x, 0.05); break;
    case 'door':
      glowBg(x, '#cfe6ff', '#6f9fd8');
      x.fillStyle = 'rgba(14,24,52,.85)'; x.fillRect(64, 26, 34, 70); x.fillStyle = '#f4fbff'; x.fillRect(70, 32, 22, 64);
      x.fillStyle = 'rgba(14,24,52,.6)'; x.fillRect(0, 96, TEXW, 24); scan(x, 0.1); break;
    case 'panda':
      glowBg(x, '#e3f1ff', '#86b6e2');
      x.fillStyle = 'rgba(16,26,52,.82)';
      x.beginPath(); x.arc(80, 66, 26, 0, Math.PI * 2); x.arc(60, 42, 10, 0, Math.PI * 2); x.arc(100, 42, 10, 0, Math.PI * 2); x.fill(); scan(x, 0.1); break;
    case 'pair':
      glowBg(x, '#dbeeff', '#7aa9dc');
      x.fillStyle = 'rgba(16,26,52,.8)';
      for (const cx of [66, 94]) { x.beginPath(); x.arc(cx, 46, 9, 0, Math.PI * 2); x.fill(); x.fillRect(cx - 9, 56, 18, 34); }
      x.fillRect(74, 64, 12, 4); scan(x, 0.1); break;
    case 'bsod':
      x.fillStyle = '#1f3fa8'; x.fillRect(0, 0, TEXW, TEXH);
      x.fillStyle = '#dfe8ff'; x.fillRect(58, 18, 44, 10);
      x.fillStyle = 'rgba(223,232,255,.8)'; for (let i = 0; i < 7; i++) x.fillRect(16, 40 + i * 9, 60 + ((i * 37) % 70), 3);
      scan(x, 0.12); break;
    case 'bars': {
      const cols = ['#e8e8e8', '#e8e83a', '#3ae8e8', '#3ae83a', '#e83ae8', '#e83a3a', '#3a3ae8'];
      cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(i * TEXW / 7, 0, TEXW / 7 + 1, TEXH * 0.7); });
      x.fillStyle = '#111'; x.fillRect(0, TEXH * 0.7, TEXW, TEXH * 0.3); dotText(x, 'ERROR', TEXW / 2, TEXH * 0.85, 90, '#f4f4f4', 1.2); break;
    }
    case 'dark':
      x.fillStyle = '#05080f'; x.fillRect(0, 0, TEXW, TEXH);
      { const g = x.createLinearGradient(0, 0, TEXW, TEXH); g.addColorStop(0, 'rgba(160,200,255,.18)'); g.addColorStop(0.4, 'rgba(160,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, TEXW, TEXH); }
      break;
  }
};

export class ScreenBank {
  readonly mats = new Map<ScreenKind, THREE.MeshBasicMaterial>();
  private statics: { c: HTMLCanvasElement; x: CanvasRenderingContext2D; tex: THREE.CanvasTexture }[] = [];
  private r = rnd(99);
  private last = 0;
  constructor(private opts: ZoneOpts) {}
  get(kind: ScreenKind) {
    let m = this.mats.get(kind);
    if (m) return m;
    const c = mkCanvas(); const x = c.getContext('2d')!;
    drawScreen(kind, x, this.r);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const bright = kind === 'dark' ? 1 : kind === 'static' ? 0.62 : kind === 'bars' ? 0.6 : 0.72;
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(bright, bright, bright), toneMapped: false });
    if (kind === 'static') this.statics.push({ c, x, tex });
    this.mats.set(kind, m);
    return m;
  }
  /** 雪花屏每隔一会儿换一帧（低画质 / 减少动态时更慢） */
  update(t: number) {
    const every = this.opts.low || this.opts.reduce ? 0.5 : 0.11;
    if (t - this.last < every) return;
    this.last = t;
    for (const s of this.statics) { drawScreen('static', s.x, this.r); s.tex.needsUpdate = true; }
  }
}

// ---------------- CRT ----------------
export interface CRTSpec {
  x: number; y: number; z: number;     // 机壳底面中心
  w: number; h: number; d: number;     // 机壳尺寸
  yaw: number;                          // 屏幕朝向（0 = 朝 +z）
  pitch?: number; roll?: number;        // 歪斜
  screen: ScreenKind;
  color?: number;                       // 机壳颜色
  collide?: boolean;                    // 落地的那台要挡路
}

// 单位零件（共享几何）
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const tubeGeo = (() => {
  // 截头四棱锥：前面大、后面小；前面在 z=0，往 -z 伸出去
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { if (p.getZ(i) < 0) { p.setX(i, p.getX(i) * 0.42); p.setY(i, p.getY(i) * 0.46); } }
  g.translate(0, 0, -0.5); g.computeVertexNormals();
  return g;
})();
const knobGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2);
const planeGeo = new THREE.PlaneGeometry(1, 1);

/**
 * 一批 CRT。所有机壳是一个 InstancedMesh，显像管壳、旋钮、喇叭网、屏框各一个，
 * 屏幕按画面种类分组各一个 InstancedMesh。
 */
export const buildCRTStack = (parent: THREE.Object3D, specs: CRTSpec[], bank: ScreenBank, boxes: BoxCollider[], opts: ZoneOpts) => {
  const n = specs.length;
  const caseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.08 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.5, metalness: 0.2 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.9 });
  const cases = new THREE.InstancedMesh(unitBox, caseMat, n);
  const tubes = new THREE.InstancedMesh(tubeGeo, caseMat, n);
  const bezels = new THREE.InstancedMesh(planeGeo, darkMat, n);
  const knobs = new THREE.InstancedMesh(knobGeo, darkMat, n * 2);
  const grilles = new THREE.InstancedMesh(planeGeo, grilleMat, n);
  const byKind = new Map<ScreenKind, number[]>();
  specs.forEach((s, i) => { const a = byKind.get(s.screen) ?? []; a.push(i); byKind.set(s.screen, a); });
  const screens = new Map<ScreenKind, THREE.InstancedMesh>();
  byKind.forEach((idx, kind) => screens.set(kind, new THREE.InstancedMesh(planeGeo, bank.get(kind), idx.length)));

  const base = new THREE.Matrix4(), m = new THREE.Matrix4(), part = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const P = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => part.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  const counters = new Map<ScreenKind, number>();
  specs.forEach((s, i) => {
    e.set(s.pitch ?? 0, s.yaw, s.roll ?? 0, 'YXZ'); q.setFromEuler(e);
    base.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(1, 1, 1));
    const { w, h, d } = s;
    cases.setMatrixAt(i, m.multiplyMatrices(base, P(0, h / 2, 0, w, h, d)));
    col.setHex(s.color ?? 0xd9d5c8); cases.setColorAt(i, col);
    tubes.setMatrixAt(i, m.multiplyMatrices(base, P(0, h * 0.52, -d / 2, w * 0.86, h * 0.8, d * 0.72)));
    col.multiplyScalar(0.82); tubes.setColorAt(i, col);
    const sw = w * 0.7, sh = h * 0.68, sx = -w * 0.1, sy = h * 0.54;
    bezels.setMatrixAt(i, m.multiplyMatrices(base, P(sx, sy, d / 2 + 0.003, sw * 1.1, sh * 1.12, 1)));
    const k = counters.get(s.screen) ?? 0; counters.set(s.screen, k + 1);
    screens.get(s.screen)!.setMatrixAt(k, m.multiplyMatrices(base, P(sx, sy, d / 2 + 0.008, sw, sh, 1)));
    const kx = w * 0.4, kr = Math.min(w, h) * 0.08;
    knobs.setMatrixAt(i * 2, m.multiplyMatrices(base, P(kx, h * 0.66, d / 2 + 0.02, kr, kr, 0.05)));
    knobs.setMatrixAt(i * 2 + 1, m.multiplyMatrices(base, P(kx, h * 0.46, d / 2 + 0.02, kr * 0.8, kr * 0.8, 0.05)));
    grilles.setMatrixAt(i, m.multiplyMatrices(base, P(kx, h * 0.2, d / 2 + 0.004, w * 0.12, h * 0.18, 1)));
    if (s.collide) boxes.push({ x: s.x, z: s.z, hw: w / 2 + 0.05, hd: d / 2 + d * 0.36, yaw: s.yaw });
  });
  const all: THREE.InstancedMesh[] = [cases, tubes, bezels, knobs, grilles, ...screens.values()];
  all.forEach(im => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); parent.add(im); });
  return { meshes: all, count: n };
};

// ---------------- 垂下来的线缆 ----------------
export const buildCables = (parent: THREE.Object3D, list: [THREE.Vector3, THREE.Vector3, number][], opts: ZoneOpts) => {
  const geos: THREE.BufferGeometry[] = [];
  for (const [a, b, sag] of list) {
    const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
    const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y - sag * 0.7), mid, b.clone().lerp(mid, 0.5).setY(b.y - sag * 0.6), b]);
    geos.push(new THREE.TubeGeometry(c, opts.low ? 16 : 28, 0.028, 5, false));
  }
  if (!geos.length) return;
  const g = mergeGeometries(geos); geos.forEach(x => x.dispose());
  parent.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 0.7 })));
};

// ---------------- 网格地面 ----------------
const gridMat = (base: number, line: number, opts: ZoneOpts) => new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, base: { value: new THREE.Color(base) }, line: { value: new THREE.Color(line) }, motion: { value: opts.reduce ? 0.2 : 1 } },
  vertexShader: `
    varying vec3 vW; varying vec3 vL;
    void main(){
      vL = position;
      vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform float time; uniform vec3 base; uniform vec3 line; uniform float motion;
    varying vec3 vW; varying vec3 vL;
    float grid(vec2 p, float k){ vec2 g = abs(fract(p * k - 0.5) - 0.5) / max(fwidth(p * k), vec2(1e-3)); return 1.0 - min(min(g.x, g.y), 1.0); }
    void main(){
      vec2 p = vW.xz;
      float g1 = grid(p, 1.0);
      float g2 = grid(p, 4.0) * 0.25;
      // 板块接缝
      float seam = step(0.485, max(abs(vL.x), abs(vL.z)));
      // 沿 z 往前跑的一道扫描亮带
      float sweep = smoothstep(1.2, 0.0, abs(fract((p.y + time * 3.0 * motion) / 26.0) - 0.5) * 26.0) * 0.5;
      float d = length(cameraPosition - vW);
      float fade = exp(-d * 0.03);
      vec3 c = base + line * (g1 * 0.85 + g2 + seam * 0.5) * (0.55 + sweep) * fade;
      // 顶面以外（侧面）暗一些
      c *= mix(0.35, 1.0, step(0.49, vL.y));
      gl_FragColor = vec4(c, 1.0);
    }`,
});

export interface GridRect { x0: number; x1: number; z0: number; z1: number; tile?: number; stretch?: number; jitter?: number }

/**
 * 网格走道：把每个矩形切成小板块，每块稍微高低、倾斜不一。
 * stretch>0 时，沿 -z 越往前板块越长（近处整齐、远处被拉长）。
 */
export const buildVHSGridPath = (parent: THREE.Object3D, rects: GridRect[], opts: ZoneOpts, colors: [number, number] = [0x0a1636, 0x8fd2ff], seed = 5) => {
  const r = rnd(seed);
  const tiles: { x: number; z: number; w: number; d: number; dy: number; rx: number; rz: number }[] = [];
  for (const R of rects) {
    const t = R.tile ?? 1.6, jit = R.jitter ?? 1;
    const nx = Math.max(1, Math.round((R.x1 - R.x0) / t));
    let z = R.z1; let k = 0;
    while (z > R.z0 + 0.01) {
      const len = Math.min(z - R.z0, t * (1 + (R.stretch ?? 0) * k * 0.12));
      for (let i = 0; i < nx; i++) {
        const w = (R.x1 - R.x0) / nx;
        tiles.push({ x: R.x0 + w * (i + 0.5), z: z - len / 2, w: w - 0.04, d: len - 0.04, dy: (r() - 0.5) * 0.05 * jit, rx: (r() - 0.5) * 0.018 * jit, rz: (r() - 0.5) * 0.018 * jit });
      }
      z -= len; k++;
    }
  }
  const mat = gridMat(colors[0], colors[1], opts);
  const im = new THREE.InstancedMesh(unitBox, mat, tiles.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  tiles.forEach((tl, i) => { e.set(tl.rx, 0, tl.rz); q.setFromEuler(e); m.compose(new THREE.Vector3(tl.x, -0.06 + tl.dy, tl.z), q, new THREE.Vector3(tl.w, 0.12, tl.d)); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  parent.add(im);
  return { mesh: im, update: (t: number) => { mat.uniforms.time.value = t; } };
};

/** 一大块斜着的网格面（错开的第二层空间） */
export const buildGridSheet = (parent: THREE.Object3D, pos: THREE.Vector3, rot: THREE.Euler, w: number, d: number, opts: ZoneOpts, color = 0x6fb6ff) => {
  const mat = gridMat(0x050b1e, color, opts);
  const im = new THREE.InstancedMesh(unitBox, mat, 1);
  im.setMatrixAt(0, new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(w, 0.05, d)));
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  parent.add(im);
  return (t: number) => { mat.uniforms.time.value = t; };
};

// ---------------- 圆环门洞 ----------------
export interface RingSpec { x: number; z: number; R: number; yaw?: number; tilt?: number; y?: number }
export const buildRings = (parent: THREE.Object3D, list: RingSpec[], opts: ZoneOpts) => {
  const matA = new THREE.MeshBasicMaterial({ color: 0xcfe3ff, toneMapped: false });
  const matB = new THREE.MeshBasicMaterial({ color: 0x6f9cff, transparent: true, opacity: 0.55, toneMapped: false });
  const rings: { g: THREE.Group; base: number; i: number }[] = [];
  list.forEach((s, i) => {
    const g = new THREE.Group(); g.position.set(s.x, s.y ?? 0.6, s.z); g.rotation.set(s.tilt ?? 0, s.yaw ?? 0, 0);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(s.R, 0.13, 10, opts.low ? 48 : 96), matA));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(s.R * 1.16, 0.05, 8, opts.low ? 48 : 96), matB));
    const inner = new THREE.Mesh(new THREE.TorusGeometry(s.R * 0.82, 0.03, 6, 64, Math.PI * 1.3), matB); inner.rotation.z = i * 1.3; g.add(inner);
    parent.add(g); rings.push({ g, base: s.yaw ?? 0, i });
  });
  return (t: number) => { if (opts.reduce) return; rings.forEach(r => { (r.g.children[2] as THREE.Mesh).rotation.z = t * 0.15 * (r.i % 2 ? -1 : 1) + r.i; }); };
};

// ---------------- 被拉弯的显示器 ----------------
export interface WarpSpec { x: number; y: number; z: number; w: number; h: number; yaw: number; bend: number; screen: ScreenKind }
export const buildDistortedScreens = (parent: THREE.Object3D, list: WarpSpec[], bank: ScreenBank, opts: ZoneOpts) => {
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, toneMapped: false, side: THREE.DoubleSide });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x0b1226, roughness: 0.6, side: THREE.DoubleSide });
  const items: { g: THREE.Group; s: WarpSpec }[] = [];
  const warp = (g: THREE.BufferGeometry, s: WarpSpec, ph: number) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin(x / s.w * Math.PI) * s.bend * 0.6 + Math.sin(y * 2.2 + ph) * s.bend * 0.25);
      p.setX(i, x + Math.sin(y * 3 + ph) * s.bend * 0.18);
    }
    p.needsUpdate = true; g.computeVertexNormals();
  };
  for (const s of list) {
    const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); g.rotation.y = s.yaw;
    const seg = opts.low ? 6 : 14;
    const fr = new THREE.PlaneGeometry(s.w * 1.08, s.h * 1.1, seg, seg); warp(fr, s, 0);
    const back = new THREE.PlaneGeometry(s.w * 1.08, s.h * 1.1, seg, seg); warp(back, s, 0);
    const scr = new THREE.PlaneGeometry(s.w, s.h, seg, seg); warp(scr, s, 0);
    const fm = new THREE.Mesh(fr, frameMat); fm.position.z = -0.02; g.add(fm);
    const bm = new THREE.Mesh(back, backMat); bm.position.z = -0.12; g.add(bm);
    const sm = new THREE.Mesh(scr, bank.get(s.screen)); g.add(sm);
    // 底座的小脚
    const foot = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.25, 0.08, 0.5), backMat); foot.position.set(0, -s.h * 0.6, -0.15); g.add(foot);
    parent.add(g);
    items.push({ g, s });
  }
  return (t: number) => {
    if (opts.reduce) return;
    items.forEach((it, i) => { it.g.position.y = it.s.y + Math.sin(t * 0.5 + i) * 0.08; });
  };
};

// ---------------- 漂浮物 ----------------
const chairGeo = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const b = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); parts.push(g); };
  b(0.9, 0.07, 0.8, 0, 0.9, 0);                                     // 座面
  for (const [x, z] of [[-0.38, -0.32], [0.38, -0.32], [-0.38, 0.32], [0.38, 0.32]]) b(0.06, 0.9, 0.06, x, 0.45, z); // 腿
  for (let i = 0; i < 5; i++) b(0.045, 0.85, 0.045, -0.32 + i * 0.16, 1.35, -0.36, -0.08); // 背后的竖条
  b(0.95, 0.08, 0.08, 0, 1.8, -0.4);                               // 靠背顶梁
  const g = mergeGeometries(parts); parts.forEach(p => p.dispose()); g.translate(0, -0.9, 0);
  return g;
})();
const glyphTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d')!;
    x.fillStyle = '#e8f1ff'; x.font = 'bold 44px monospace'; x.textBaseline = 'middle';
    ['E', 'R', '0', '?', '_', '#', '%', 'x'].forEach((ch, i) => x.fillText(ch, i * 32 + 4, 34));
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
})();

export interface DebrisArea { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; avoid?: (x: number, z: number) => boolean }
export const buildFloatingDebris = (parent: THREE.Object3D, area: DebrisArea, count: { chairs: number; cubes: number; spheres: number; glyphs: number }, opts: ZoneOpts, seed = 17) => {
  const r = rnd(seed);
  const place = () => { for (let k = 0; k < 30; k++) { const x = area.x0 + r() * (area.x1 - area.x0), z = area.z0 + r() * (area.z1 - area.z0); if (!area.avoid || !area.avoid(x, z)) return [x, z]; } return [area.x0, area.z0]; };
  const scale = opts.low ? 0.5 : 1;
  type It = { im: THREE.InstancedMesh; i: number; p: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; s: number; ph: number };
  const items: It[] = [];
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number, size: () => number) => {
    n = Math.max(1, Math.round(n * scale));
    const im = new THREE.InstancedMesh(geo, mat, n); parent.add(im);
    for (let i = 0; i < n; i++) {
      const [x, z] = place();
      items.push({ im, i, p: new THREE.Vector3(x, area.y0 + r() * (area.y1 - area.y0), z), rot: new THREE.Euler(r() * 6, r() * 6, r() * 6), spin: new THREE.Vector3((r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.2), s: size(), ph: r() * 6 });
    }
    return im;
  };
  mk(chairGeo, new THREE.MeshStandardMaterial({ color: 0x1b2440, roughness: 0.6, emissive: 0x0a1230, emissiveIntensity: 0.6 }), count.chairs, () => 0.8 + r() * 0.5);
  mk(unitBox, new THREE.MeshStandardMaterial({ color: 0xdfe8ff, roughness: 0.4, emissive: 0x405080, emissiveIntensity: 0.35 }), count.cubes, () => 0.25 + r() * 0.5);
  mk(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe6ecff, roughness: 0.3, emissive: 0x3a4a80, emissiveIntensity: 0.4 }), count.spheres, () => 0.2 + r() * 0.45);
  const gm = new THREE.MeshBasicMaterial({ map: glyphTex(), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  const gg = new THREE.PlaneGeometry(1, 1);
  // 每块碎字只显示贴图里的一个字：用 8 份不同 UV 的几何
  const glyphGeos = Array.from({ length: 8 }, (_, k) => { const g = gg.clone(); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 8); return g; });
  const ng = Math.max(1, Math.round(count.glyphs * scale));
  for (let k = 0; k < 8; k++) mk(glyphGeos[k], gm, ng / 8, () => 0.6 + r() * 0.6);
  gg.dispose();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const amp = opts.reduce ? 0.25 : 1;
  const apply = (t: number) => {
    for (const it of items) {
      e.set(it.rot.x + t * it.spin.x * amp, it.rot.y + t * it.spin.y * amp, it.rot.z + t * it.spin.z * amp); q.setFromEuler(e);
      v.copy(it.p); v.y += Math.sin(t * 0.4 + it.ph) * 0.25 * amp;
      sc.setScalar(it.s); m.compose(v, q, sc); it.im.setMatrixAt(it.i, m);
    }
  };
  const ims = Array.from(new Set(items.map(i => i.im)));
  apply(0);
  for (const im of ims) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  let last = -1;
  return (t: number) => {
    if (t - last < (opts.low ? 0.066 : 0.033)) return;
    last = t; apply(t);
    for (const im of ims) im.instanceMatrix.needsUpdate = true;
  };
};

// ---------------- 不规则机柜簇 ----------------
export interface RackSpec { x: number; z: number; w: number; h: number; d: number; yaw: number; lean?: number }
export const buildRackClusters = (parent: THREE.Object3D, racks: RackSpec[], boxes: BoxCollider[], opts: ZoneOpts) => {
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, metalness: 0.6, roughness: 0.4 });
  const trimMat = new THREE.MeshBasicMaterial({ color: 0x2f6fb0, toneMapped: false });
  const body = new THREE.InstancedMesh(unitBox, rackMat, racks.length);
  const trims = new THREE.InstancedMesh(unitBox, trimMat, racks.length * 2);
  const ROWS = opts.low ? 8 : 14, COLS = 3;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.035, 0.02), new THREE.MeshBasicMaterial({ toneMapped: false }), racks.length * ROWS * COLS);
  const r = rnd(31);
  const m = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  let li = 0;
  racks.forEach((k, i) => {
    e.set(0, k.yaw, k.lean ?? 0, 'YXZ'); q.setFromEuler(e);
    base.compose(new THREE.Vector3(k.x, 0, k.z), q, new THREE.Vector3(1, 1, 1));
    body.setMatrixAt(i, m.multiplyMatrices(base, part.compose(new THREE.Vector3(0, k.h / 2, 0), new THREE.Quaternion(), new THREE.Vector3(k.w, k.h, k.d))));
    trims.setMatrixAt(i * 2, m.multiplyMatrices(base, part.compose(new THREE.Vector3(-k.w / 2 + 0.03, k.h / 2, k.d / 2 + 0.01), new THREE.Quaternion(), new THREE.Vector3(0.03, k.h * 0.96, 0.02))));
    trims.setMatrixAt(i * 2 + 1, m.multiplyMatrices(base, part.compose(new THREE.Vector3(k.w / 2 - 0.03, k.h / 2, k.d / 2 + 0.01), new THREE.Quaternion(), new THREE.Vector3(0.03, k.h * 0.96, 0.02))));
    for (let row = 0; row < ROWS; row++) for (let c = 0; c < COLS; c++) {
      const y = 0.35 + row * ((k.h - 0.6) / ROWS);
      leds.setMatrixAt(li, m.multiplyMatrices(base, part.compose(new THREE.Vector3(-0.25 + c * 0.12 + (row % 2) * 0.02, y, k.d / 2 + 0.012), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))));
      col.setHex(r() < 0.75 ? 0x55e6ff : r() < 0.8 ? 0x36e07a : 0xffc46b).multiplyScalar(0.3 + r() * 0.9); leds.setColorAt(li, col); li++;
    }
    if (!k.lean || Math.abs(k.lean) < 0.3) boxes.push({ x: k.x, z: k.z, hw: k.w / 2 + 0.05, hd: k.d / 2 + 0.05, yaw: k.yaw });
  });
  [body, trims, leds].forEach(im => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); parent.add(im); });
  let last = 0;
  return (t: number) => {
    if (t - last < (opts.low ? 0.3 : 0.12)) return;
    last = t;
    for (let k = 0; k < 30; k++) {
      const i = Math.floor(r() * li);
      col.setHex(r() < 0.75 ? 0x55e6ff : r() < 0.85 ? 0x36e07a : r() < 0.97 ? 0xffc46b : 0xff5d6c).multiplyScalar(r() < 0.3 ? 0.15 : 0.5 + r() * 0.8);
      leds.setColorAt(i, col);
    }
    leds.instanceColor!.needsUpdate = true;
  };
};

// ---------------- 入口：碎掉的大电视框 ----------------
/** 返回 group（可以把出口光幕挂进去）和 updater。框的「屏幕」开口朝 +z（本地） */
export const buildBrokenFrame = (parent: THREE.Object3D, x: number, z: number, yaw: number, opts: ZoneOpts) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; parent.add(g);
  const W = 4.6, H = 3.6, D = 2.6, T = 0.55;   // 外框宽高、机身深、边框厚
  const shell = new THREE.MeshStandardMaterial({ color: 0xcfcabb, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.5 });
  const box = (w: number, h: number, d: number, px: number, py: number, pz: number, m: THREE.Material, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.rotation.z = rz; g.add(o); return o; };
  // 四条边框（右上角崩掉一块）
  box(W, T, D, 0, T / 2, 0, shell);
  box(T, H, D, -W / 2 + T / 2, H / 2, 0, shell);
  box(T, H * 0.72, D, W / 2 - T / 2, H * 0.36, 0, shell);
  box(W * 0.62, T, D, -W * 0.19, H - T / 2, 0, shell);
  box(0.9, 0.3, D * 0.9, W / 2 - 0.55, H * 0.82, 0.1, shell, 0.5);     // 歪着挂下来的一截
  // 机身后半截（显像管壳）
  // （显像管壳已经碎没了：镜头会从框后面看过来，这里只留一圈后沿）
  box(W * 0.9, 0.18, 0.3, 0, H * 0.92, -D / 2 + 0.15, shell); box(0.18, H * 0.8, 0.3, -W * 0.44, H * 0.5, -D / 2 + 0.15, shell);
  // 内框暗边
  box(W - T * 2 + 0.1, 0.06, 0.1, 0, T, D / 2 - 0.02, dark); box(0.06, H - T * 2, 0.1, -W / 2 + T, H / 2, D / 2 - 0.02, dark);
  // 碎玻璃：沿开口边缘一圈尖片
  const r = rnd(4);
  const shardMat = new THREE.MeshBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  const shards: THREE.Mesh[] = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Shape(); const l = 0.15 + r() * 0.35, w = 0.06 + r() * 0.12;
    s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w * 0.3, l); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), shardMat);
    const side = i % 4, k = r();
    const ix = -W / 2 + T, iw = W - 2 * T, iy = T, ih = H - 2 * T;
    if (side === 0) { m.position.set(ix + k * iw, iy, D / 2); m.rotation.z = (r() - 0.5) * 0.6; }
    else if (side === 1) { m.position.set(ix + k * iw * 0.6, iy + ih, D / 2); m.rotation.z = Math.PI + (r() - 0.5) * 0.6; }
    else if (side === 2) { m.position.set(ix, iy + k * ih, D / 2); m.rotation.z = -Math.PI / 2 + (r() - 0.5) * 0.6; }
    else { m.position.set(ix + iw, iy + k * ih * 0.7, D / 2); m.rotation.z = Math.PI / 2 + (r() - 0.5) * 0.6; }
    m.rotation.y = (r() - 0.5) * 0.8;
    g.add(m); shards.push(m);
  }
  // 火花
  const sparkMat = new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.09, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const N = opts.low ? 18 : 48;
  const sp = new Float32Array(N * 3); const seeds = Array.from({ length: N }, () => ({ a: r() * 6.28, sp: 0.6 + r() * 1.4, o: r() }));
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, sparkMat); sparks.position.set(W / 2 - T, H * 0.72, D / 2 + 0.1); g.add(sparks);
  const cut = new THREE.PointLight(0x9fd8ff, 3, 6, 1.6); cut.position.set(W / 2 - T, H * 0.72, D / 2 + 0.4); g.add(cut);
  return {
    group: g, inner: { w: W - 2 * T, h: H - 2 * T, y: T, z: D / 2 },
    update: (t: number) => {
      const burst = opts.reduce ? 0.3 : (Math.sin(t * 7.3) > 0.6 || Math.sin(t * 2.1 + 1) > 0.95 ? 1 : 0.15);
      for (let i = 0; i < N; i++) {
        const s = seeds[i]; const k = (t * s.sp * 0.8 + s.o) % 1;
        sp[i * 3] = Math.cos(s.a) * k * 0.9; sp[i * 3 + 1] = -k * k * 1.6 + Math.sin(s.a) * k * 0.3; sp[i * 3 + 2] = Math.sin(s.a * 2) * k * 0.4;
      }
      (sg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      sparkMat.opacity = 0.85 * burst; cut.intensity = 1 + 3 * burst;
    },
  };
};
