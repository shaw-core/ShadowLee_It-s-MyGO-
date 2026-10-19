// ============================================================
// 第二章的漫画分镜：用真正的 3D 场景「拍」出来
//  · 同一套体素角色 / 浮岛 / 背景小场景，摆好姿势、架好镜头，离屏渲染成一张图
//  · 再在 2D 画布上叠一层漫画手法：集中线、网点、速度线、暗角
// 和第一章的黑白像素漫画区分开：全彩、有景深、有光。
// ============================================================
import * as THREE from 'three';
import { buildCharacter, buildCheckpointPanda, CharacterRig, SkinId } from './characters3d';
import { buildDiorama } from './dioramas';
import { voxIsland, voxCandy, voxCloud } from './voxworld';
import { THEMES, buildSky, rand } from './world3d';
import { WireSkin } from './style';
import { buildCosmos, buildFloor, buildWorldTree } from './archiveWorld';
import { Vox } from './voxel';

type V3 = [number, number, number];
type Pose = 'stand' | 'dizzy' | 'offer' | 'lookup' | 'holdR' | 'holdL' | 'walk' | 'turn' | 'fall';
interface Actor { who: 'dousha' | 'roomie' | 'panda' | 'tvhead'; at: V3; rot?: number; pose?: Pose; mint?: boolean }

export interface Shot {
  theme: 1 | 2 | 3 | 4 | 5;
  cam: { at: V3; look: V3; fov?: number };
  actors: Actor[];
  /** 脚下的浮岛（尺寸） */
  ground?: { at: V3; size: V3; grass?: number };
  /** 远景浮岛 */
  isles?: { at: V3; size: V3; grass?: number }[];
  set?: { kind: string; at: V3; rot?: number; scale?: number; raw?: boolean };
  clouds?: V3[];
  crack?: { at: V3; scale?: number };
  /** 线框层：除了 keep 里的角色，全部变成线框 */
  wire?: { keep: Actor['who'][] };
  fx?: ('focus' | 'speed' | 'tone' | 'warm' | 'dark' | 'bloom')[];
  /** 不要天空：纯色背景（深色场景用），灯光也调暗 */
  bg?: number;
  /** 除了电视头以外全部褪成灰色（已经归档的那条线） */
  grey?: boolean;
  /** 自定义布景 */
  custom?: (scene: THREE.Scene, world: THREE.Group) => void;
  /** 时间：改一下太阳方向 */
  sunDir?: V3;
}

// ---------------- 分镜表 ----------------
export const SHOTS: Record<string, Shot> = {
  // ===== 第一关 → 第二关：薄荷糖 =====
  m1_wide: {
    theme: 1, cam: { at: [4.2, 2.4, 5.2], look: [-0.3, 0.6, -3], fov: 40 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    isles: [{ at: [-2, 0.2, -9], size: [3, 1, 3] }, { at: [3.5, 1.2, -14], size: [3, 1, 3] }, { at: [-1, 2.2, -20], size: [4, 1, 3] }, { at: [-12, -4, -10], size: [5, 1.2, 4] }],
    clouds: [[10, -6, -20], [-14, 3, -26]],
    actors: [{ who: 'dousha', at: [-0.4, 0, 0.2], rot: -0.4, pose: 'dizzy' }, { who: 'roomie', at: [0.8, 0, 0.6], rot: -0.6, pose: 'turn' }],
  },
  m1_dizzy: {
    theme: 1, cam: { at: [1.0, 1.15, 2.4], look: [0, 0.88, 0], fov: 30 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'dousha', at: [0, 0, 0], rot: 0.25, pose: 'dizzy' }],
    fx: ['speed', 'tone'],
  },
  m1_offer: {
    theme: 1, cam: { at: [-0.6, 1.0, 2.1], look: [0.12, 0.82, 0], fov: 32 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'roomie', at: [0, 0, 0], rot: -0.35, pose: 'offer', mint: true }],
    fx: ['warm'],
  },
  m1_mint: {
    theme: 1, cam: { at: [0.2, 0.95, 2.6], look: [0.2, 0.75, 0], fov: 34 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'dousha', at: [-0.42, 0, 0], rot: 0.5, pose: 'stand' }, { who: 'roomie', at: [0.52, 0, 0.1], rot: -0.55, pose: 'offer', mint: true }],
    fx: ['focus', 'bloom'],
  },

  // ===== 第二关 → 第三关：那条街 =====
  m2_street: {
    theme: 2, cam: { at: [0.75, 1.0, 1.9], look: [-1.4, 2.5, -12], fov: 46 },
    ground: { at: [0, -0.6, 0], size: [4, 1.2, 4] },
    set: { kind: 'street', at: [-4, 0.5, -24], rot: 0.15, scale: 1 },
    clouds: [[12, -2, -30], [-16, 6, -34]],
    actors: [{ who: 'dousha', at: [-0.45, 0, -1.2], rot: Math.PI - 0.15, pose: 'stand' }, { who: 'roomie', at: [0.5, 0, -1.0], rot: Math.PI + 0.1, pose: 'stand' }],
    sunDir: [0.3, 0.25, -0.9],
  },
  m2_hold: {
    theme: 2, cam: { at: [0.75, 1.2, 1.7], look: [0.05, 0.95, 0], fov: 32 },
    ground: { at: [0, -0.6, 0], size: [4, 1.2, 4] },
    actors: [{ who: 'roomie', at: [0.15, 0, 0], rot: 0.55, pose: 'holdL' }, { who: 'dousha', at: [-0.65, 0, -0.5], rot: Math.PI - 0.4, pose: 'stand' }],
    fx: ['tone'],
  },
  m2_panda: {
    theme: 2, cam: { at: [0.3, 0.8, 1.6], look: [-0.6, 0.6, -5], fov: 38 },
    ground: { at: [0, -0.6, -2.5], size: [4, 1.2, 8] },
    isles: [{ at: [-1.5, 0.2, -11], size: [3, 1, 3] }],
    actors: [{ who: 'panda', at: [0.78, 0, 0], rot: Math.PI - 0.35 }, { who: 'dousha', at: [-1.35, 0, -5.4], rot: Math.PI - 0.2, pose: 'walk' }, { who: 'roomie', at: [-0.7, 0, -5.2], rot: Math.PI + 0.1, pose: 'walk' }],
    fx: ['dark'],
  },

  // ===== 第三关 → 第四关：线框里的颜色 =====
  m3_wire: {
    theme: 3, cam: { at: [1.6, 2.8, 4.4], look: [0, 0.8, 0], fov: 36 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    isles: [{ at: [-4, -1, -6], size: [3, 1, 3] }, { at: [3, 1.5, -9], size: [3, 1, 3] }],
    set: { kind: 'towers', at: [10, -6, -28], rot: -0.4 },
    actors: [{ who: 'dousha', at: [-0.34, 0, 0], rot: 0.2, pose: 'holdR' }, { who: 'roomie', at: [0.36, 0, 0.04], rot: -0.25, pose: 'holdL' }],
    wire: { keep: ['roomie'] },
  },
  m3_hands: {
    theme: 3, cam: { at: [0.05, 0.5, 2.2], look: [0.02, 0.4, 0], fov: 30 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'dousha', at: [-0.34, 0, 0], rot: 0.2, pose: 'holdR' }, { who: 'roomie', at: [0.36, 0, 0.04], rot: -0.25, pose: 'holdL' }],
    wire: { keep: ['roomie'] },
    fx: ['focus'],
  },
  m3_smile: {
    theme: 3, cam: { at: [-0.45, 1.05, 2.25], look: [0.3, 0.88, 0], fov: 30 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'dousha', at: [-0.34, 0, 0], rot: 0.2, pose: 'holdR' }, { who: 'roomie', at: [0.36, 0, 0.04], rot: -0.6, pose: 'holdL' }],
    wire: { keep: ['roomie'] },
    fx: ['warm', 'bloom'],
  },

  // ===== 第四关 → 第五关：天上的裂缝 =====
  m4_crack: {
    theme: 4, cam: { at: [2.2, 0.6, 6.5], look: [-1, 5, -10], fov: 48 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    isles: [{ at: [-6, 1, -8], size: [3, 1, 3] }, { at: [5, 3, -14], size: [3, 1, 3] }],
    crack: { at: [-4, 16, -40], scale: 1 },
    clouds: [[-14, 4, -30], [12, 8, -36]],
    actors: [{ who: 'dousha', at: [-0.35, 0, 0], rot: Math.PI + 0.2, pose: 'lookup' }, { who: 'roomie', at: [0.45, 0, 0.15], rot: Math.PI - 0.15, pose: 'lookup' }],
  },
  m4_dousha: {
    theme: 4, cam: { at: [0.3, 0.8, 1.85], look: [0, 0.86, 0], fov: 32 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    crack: { at: [-2, 14, -30], scale: 0.7 },
    actors: [{ who: 'dousha', at: [0, 0, 0], rot: 0.15, pose: 'lookup' }],
    fx: ['tone'],
  },
  m4_roomie: {
    theme: 4, cam: { at: [-0.35, 1.05, 1.8], look: [0, 0.92, 0], fov: 32 },
    ground: { at: [0, -0.6, 0], size: [5, 1.2, 4] },
    actors: [{ who: 'roomie', at: [0, 0, 0], rot: -0.3, pose: 'stand' }],
    fx: ['warm', 'bloom'],
  },
};

// ---- 隐藏系统 · 序：电视头小豆穿过世界线 ----
const comicPlane = (w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = 192; c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = '#fdfcf7'; x.fillRect(0, 0, 192, 256); x.strokeStyle = '#16182a'; x.lineWidth = 6;
  x.strokeRect(8, 8, 176, 240); x.beginPath(); x.moveTo(8, 100); x.lineTo(184, 100); x.moveTo(96, 100); x.lineTo(96, 248); x.moveTo(8, 180); x.lineTo(96, 180); x.stroke();
  x.fillStyle = '#16182a'; x.beginPath(); x.arc(52, 140, 14, 0, 7); x.fill(); x.beginPath(); x.arc(140, 160, 14, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
};
Object.assign(SHOTS, {
  x1_archived: {
    theme: 2, grey: true, bg: 0xa4a8b2,
    cam: { at: [1.4, 1.5, 4.0], look: [-0.4, 1.2, -6], fov: 42 },
    ground: { at: [0, -0.6, 0], size: [4, 1.2, 4] },
    set: { kind: 'rooftop', at: [-0.6, -0.4, -9.5], rot: 0, raw: true },
    actors: [{ who: 'tvhead', at: [0.4, 0, 0.6], rot: Math.PI + 0.15, pose: 'stand' }],
    fx: ['tone'],
  },
  x2_face: {
    theme: 3, bg: 0x04060f,
    cam: { at: [0.45, 1.12, 1.45], look: [0, 1.0, 0], fov: 30 },
    actors: [{ who: 'tvhead', at: [0, 0, 0], rot: 0.25, pose: 'stand' }],
    custom: (sc: THREE.Scene) => { const l = new THREE.PointLight(0x7db4ff, 8, 5); l.position.set(-0.8, 1.6, 0.6); sc.add(l); },
    fx: ['dark'],
  },
  x3_layers: {
    theme: 3, bg: 0x060918,
    cam: { at: [3.6, 3.0, 5.2], look: [0, -2.3, -0.8], fov: 52 },
    actors: [{ who: 'tvhead', at: [0, 0, 0], rot: 0.6, pose: 'fall' }],
    custom: (sc: THREE.Scene, w: THREE.Group) => {
      buildCosmos(sc);
      const p1 = comicPlane(3.2, 4.2); p1.position.set(-0.6, -2.4, -0.6); p1.rotation.set(-1.2, 0.2, 0.3); w.add(p1);
      const v = new Vox(); v.box(-10, 0, -8, 10, 0, 8, 0x7fd497); v.ellipsoid(0, -1, 0, 10, 6, 8, (x, y) => (y < 0 ? 0xa98d78 : null));
      v.box(-3, 1, -1, -3, 6, -1, 0x8a6a4a); v.ellipsoid(-2.5, 8, -0.5, 3.5, 2.6, 3.5, 0x5fae7a);
      const isl = new THREE.Mesh(v.geometry(0.15, [0, 0, 0], 0.04), new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x1a2a1a }));
      isl.position.set(0.8, -5.5, -1.5); isl.rotation.set(0.3, 0.6, 0); w.add(isl);
      const grid = new THREE.GridHelper(8, 16, 0x6ee7f2, 0x2a5d8a); grid.position.set(0, -8.5, -1); grid.rotation.set(0.25, 0, 0.2); w.add(grid);
      const l = new THREE.PointLight(0x9fd8ff, 10, 12); l.position.set(1, 1, 2); sc.add(l);
    },
    fx: ['speed'],
  },
  x4_tree: {
    theme: 3, bg: 0x03040b,
    cam: { at: [1.6, 0.7, 16.2], look: [0, 6.2, 0], fov: 58 },
    actors: [{ who: 'tvhead', at: [0.2, 0, 11.5], rot: Math.PI, pose: 'stand' }],
    custom: (sc: THREE.Scene, w: THREE.Group) => { buildCosmos(sc); buildFloor(w, 22); buildWorldTree(w, []); },
    fx: ['bloom'],
  },
} as Record<string, Shot>);

// ---------------- 摆姿势 ----------------
const posed = (rig: CharacterRig, pose: Pose, hugging: boolean) => {
  switch (pose) {
    case 'dizzy':
      rig.head.rotation.z = 0.22; rig.head.rotation.x = 0.08;
      rig.body.rotation.z = -0.06;
      if (!hugging) { rig.armR.rotation.x = -2.5; rig.armR.rotation.z = 0.35; }
      break;
    case 'offer':
      rig.armR.rotation.x = -1.35; rig.armR.rotation.z = 0.15;
      rig.head.rotation.x = 0.1; rig.head.rotation.z = -0.06;
      break;
    case 'lookup':
      rig.head.rotation.x = -0.38;
      break;
    case 'holdR':
      rig.armR.rotation.z = 0.62; rig.armR.rotation.x = -0.25;
      rig.head.rotation.y = -0.25;
      break;
    case 'holdL':
      rig.armL.rotation.z = -0.62; rig.armL.rotation.x = -0.25;
      rig.head.rotation.y = 0.25;
      break;
    case 'walk':
      rig.legL.rotation.x = 0.35; rig.legR.rotation.x = -0.35;
      if (!hugging) { rig.armL.rotation.x = -0.3; rig.armR.rotation.x = 0.3; }
      break;
    case 'fall':
      rig.armL.rotation.x = -2.6; rig.armR.rotation.x = -2.4; rig.armL.rotation.z = -0.3; rig.armR.rotation.z = 0.3;
      rig.legL.rotation.x = -0.5; rig.legR.rotation.x = 0.3; rig.head.rotation.x = 0.25;
      break;
    case 'turn':
      rig.head.rotation.y = 0.45;
      break;
    default: break;
  }
};

// ---------------- 天上的裂缝 ----------------
const crackMesh = (scale = 1) => {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const len = 26 * scale, w = 2.4 * scale;
  s.moveTo(0, len / 2); s.lineTo(w / 2, len * 0.15); s.lineTo(w * 0.2, -len * 0.1); s.lineTo(w * 0.45, -len / 2); s.lineTo(-w * 0.1, -len * 0.05); s.lineTo(-w / 2, len * 0.2);
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(9 * scale, 34 * scale), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.28, depthWrite: false, fog: false, toneMapped: false })));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
  m.position.z = 0.1;
  g.add(m);
  return g;
};

// ---------------- 离屏渲染 ----------------
let renderer: THREE.WebGLRenderer | null = null;
const getRenderer = () => {
  if (renderer) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  } catch { return null; }
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
};

const cache = new Map<string, string>();

const buildScene = (shot: Shot, skin: SkinId) => {
  const th = THEMES[shot.theme];
  const scene = new THREE.Scene();
  const sky = buildSky(th);
  if (shot.bg !== undefined) {
    scene.background = new THREE.Color(shot.bg);
    scene.fog = new THREE.Fog(shot.bg, 18, 120);
  } else {
    scene.fog = new THREE.Fog(th.fog, 30, 140);
    if (shot.wire) sky.uniforms.wire.value = 1;
    scene.add(sky.mesh);
  }
  const dimK = shot.bg !== undefined && !shot.grey ? 0.4 : 1;
  scene.add(new THREE.HemisphereLight(th.hemiSky, th.hemiGround, 1.05 * dimK));
  const sun = new THREE.DirectionalLight(th.sunColor, th.sunIntensity * dimK);
  const sd = shot.sunDir ?? [0.5, 0.8, 0.45];
  sun.position.set(sd[0] * 20, sd[1] * 20, sd[2] * 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc7d2fe, 0.6);
  rim.position.set(-6, 4, -8);
  scene.add(rim);

  const r = rand(shot.theme * 97 + shot.actors.length);
  const world = new THREE.Group();
  scene.add(world);
  const isle = (at: V3, size: V3, grass: number | undefined, i: number) => {
    const g = voxIsland(size[0], size[1], size[2], grass ?? th.grass[i % th.grass.length], th, 1000 + i * 17, true);
    g.position.set(at[0], at[1], at[2]);
    world.add(g);
  };
  if (shot.ground) isle(shot.ground.at, shot.ground.size, shot.ground.grass ?? th.grass[0], 0);
  shot.isles?.forEach((s, i) => isle(s.at, s.size, s.grass, i + 1));
  shot.clouds?.forEach(c => { const m = voxCloud(r, th.cloud, 1.4); m.position.set(c[0], c[1], c[2]); world.add(m); });
  if (shot.set) {
    const d = buildDiorama(shot.set.kind, 77, th.grass[0]);
    const bb = new THREE.Box3().setFromObject(d); const c = bb.getCenter(new THREE.Vector3());
    d.position.set(-c.x, shot.set.raw ? 0 : -bb.min.y, -c.z);
    const h = new THREE.Group(); h.add(d);
    h.position.set(shot.set.at[0], shot.set.at[1], shot.set.at[2]);
    h.rotation.y = shot.set.rot ?? 0;
    h.scale.setScalar(shot.set.scale ?? 1);
    world.add(h);
  }
  if (shot.crack) {
    const c = crackMesh(shot.crack.scale);
    c.position.set(shot.crack.at[0], shot.crack.at[1], shot.crack.at[2]);
    c.lookAt(shot.cam.at[0], shot.crack.at[1], shot.cam.at[2]);
    scene.add(c);
  }

  const keep: THREE.Object3D[] = [];
  const doushaSkin: SkinId = skin === 'skinNovus' ? 'skin1' : skin;
  const hugging = doushaSkin === 'skin1' || doushaSkin === 'skin2';
  for (const a of shot.actors) {
    let obj: THREE.Object3D;
    if (a.who === 'panda') obj = buildCheckpointPanda().group;
    else {
      const rig = buildCharacter(a.who === 'tvhead' ? 'skin2' : a.who === 'dousha' ? doushaSkin : 'skinNovus');
      if (a.who === 'tvhead') { const l = new THREE.PointLight(0x7db4ff, 3, 4); l.position.set(0, 1.2, 0.5); rig.group.add(l); obj = rig.group; obj.name = 'tvhead'; }
      posed(rig, a.pose ?? 'stand', a.who === 'dousha' && hugging);
      if (a.mint) {
        const m = voxCandy();
        m.scale.setScalar(0.4);
        m.position.set(0, -0.3, 0.05);
        m.rotation.z = 0.4;
        rig.armR.add(m);
      }
      obj = rig.group;
    }
    obj.position.set(a.at[0], a.at[1], a.at[2]);
    obj.rotation.y = a.rot ?? 0;
    obj.traverse(o => { o.castShadow = true; });
    scene.add(obj);
    if (shot.wire?.keep.includes(a.who)) keep.push(obj);
  }
  if (shot.wire) {
    scene.fog = new THREE.Fog(0x0b0d16, 12, 60);
    const skins: WireSkin[] = [];
    scene.children.forEach(o => { if (o !== sky.mesh && !keep.includes(o) && !(o as THREE.Light).isLight) skins.push(new WireSkin(o)); });
    skins.forEach(s => s.set(true));
    const grid = new THREE.GridHelper(120, 80, 0x3a4060, 0x1d2133);
    grid.position.y = -4;
    scene.add(grid);
    // 留下的那个人：在黑暗里打一盏暖光
    const warm = new THREE.PointLight(0xffd2a6, 3, 4);
    const k = shot.actors.find(a => shot.wire!.keep.includes(a.who));
    if (k) warm.position.set(k.at[0] + 0.3, 1.4, k.at[2] + 0.8);
    scene.add(warm);
  }
  shot.custom?.(scene, world);
  if (shot.grey) {
    // 已经归档的那条线：除了电视头，全部褪色
    scene.traverse(o => {
      if ((o as THREE.Sprite).isSprite) { o.visible = false; return; }
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      let p: THREE.Object3D | null = m; let keep = false;
      while (p) { if (p.name === 'tvhead') { keep = true; break; } p = p.parent; }
      if (keep) return;
      const col = m.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
      const basic = (m.material as THREE.Material).type === 'MeshBasicMaterial' ? 0.4 : 1; // 发光的东西（门缝、窗）也熄掉
      if (col) for (let i = 0; i < col.count; i++) { const l = (col.getX(i) * 0.3 + col.getY(i) * 0.59 + col.getZ(i) * 0.11) * basic; col.setXYZ(i, l * 0.95, l * 0.97, l); }
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && !Array.isArray(mat) && (mat as any).color && !col) { const c = mat.color; const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; m.material = mat.clone(); (m.material as THREE.MeshStandardMaterial).color.setRGB(l, l, l); }
    });
  }
  return scene;
};

// ---------------- 漫画手法叠层 ----------------
const overlay = (ctx: CanvasRenderingContext2D, w: number, h: number, fx: Shot['fx'], seed: number) => {
  const r = rand(seed);
  for (const f of fx ?? []) {
    if (f === 'focus') {
      // 集中线：从四周往中间收的细三角
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) * 0.6;
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2 + r() * 0.05;
        const inner = R * (0.42 + r() * 0.18);
        const da = 0.006 + r() * 0.01;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a - da) * R, cy + Math.sin(a - da) * R);
        ctx.lineTo(cx + Math.cos(a + da) * R, cy + Math.sin(a + da) * R);
        ctx.fill();
      }
      ctx.restore();
    } else if (f === 'speed') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 26; i++) {
        const y = r() * h, x = r() * w * 0.4, len = w * (0.15 + r() * 0.3);
        ctx.lineWidth = 1 + r() * 2.5;
        ctx.beginPath(); ctx.moveTo(i % 2 ? x : w - x, y); ctx.lineTo(i % 2 ? x + len : w - x - len, y + (r() - 0.5) * 6); ctx.stroke();
      }
      ctx.restore();
    } else if (f === 'tone') {
      // 网点：右下角一片淡淡的彩色圆点
      ctx.save();
      const step = 9;
      for (let y = 0; y < h; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) {
        const k = Math.max(0, ((x / w) + (y / h)) - 1.15);
        if (k <= 0) continue;
        ctx.fillStyle = `rgba(244,114,182,${Math.min(0.38, k * 0.7)})`;
        ctx.beginPath(); ctx.arc(x, y, Math.min(3.4, 0.8 + k * 5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (f === 'warm') {
      const g = ctx.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(255,214,170,0.28)'); g.addColorStop(1, 'rgba(255,214,170,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (f === 'dark') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(30,34,70,0)'); g.addColorStop(1, 'rgba(30,34,70,0.35)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (f === 'bloom') {
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const x = r() * w, y = r() * h * 0.7, s = 2 + r() * 5;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`;
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.3, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.3, y); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.3); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.3); ctx.fill();
      }
      ctx.restore();
    }
  }
  // 暗角：让每一格的视线集中到中间
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(20,22,40,0)'); v.addColorStop(1, 'rgba(20,22,40,0.28)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
};

/** 把一格分镜渲染成图片（dataURL）。w/h 是像素尺寸。失败返回 null（没有 WebGL 时回退到纯色） */
export const renderShot = (id: string, w: number, h: number, skin: SkinId): string | null => {
  const key = `${id}|${w}x${h}|${skin}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const shot = SHOTS[id];
  const rd = getRenderer();
  if (!shot || !rd) return null;
  rd.setSize(w, h, false);
  const scene = buildScene(shot, skin);
  const cam = new THREE.PerspectiveCamera(shot.cam.fov ?? 38, w / h, 0.05, 600);
  cam.position.set(...shot.cam.at);
  cam.lookAt(...shot.cam.look);
  rd.render(scene, cam);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(rd.domElement, 0, 0, w, h);
  overlay(ctx, w, h, shot.fx, id.length * 31 + w);
  const url = out.toDataURL('image/jpeg', 0.9);
  // 只释放几何体：材质是全局共享的
  scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) m.geometry.dispose(); });
  cache.set(key, url);
  return url;
};
