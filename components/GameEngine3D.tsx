// ============================================================
// 第二章引擎：精致低模 + 柔光
//  · 天空穹顶 / 云海 / 远景浮岛 / 浮空小岛平台（草皮 + 岩块 + 小花）
//  · 角色卡通着色 + 描边；泛光 + 暗角后期（画质可调）
//  · 线框层 = 建模软件视图：深色、白线、物体头上飘着名字；只有室友姐保持彩色
//  · 室友姐保持两三步的距离跟着，会随口说话；R 叫她说话（隔着一段也行），F 摸摸熊猫（悠亚形态下是企鹅），E 是外观技能
//  · 悠亚形态下室友姐不在身边，变回来时她再出现在你旁边
//  · 关卡开场镜头、终章裂缝演出
// 物理与机关逻辑沿用旧版（已验证），只重写了表现层。
// ============================================================
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BookOpen, Candy, Pause, Mic, Headphones } from 'lucide-react';
import { openWalkman } from './Walkman';
import { Layer, LevelResult } from '../types';
import { Level3D, Entity3D } from '../game3d/levels3d';
import { SkinId, buildCharacter, buildPandaWitch, buildCheckpointPanda, buildCheckpointPenguin, buildYua, CharacterRig } from '../game3d/characters3d';
import { WireSkin } from '../game3d/style';
import { THEMES, buildSky, hashStr, rand } from '../game3d/world3d';
import { buildDiorama, birdFlock, LEVEL_SETS, LEVEL_NIGHT } from '../game3d/dioramas';
import { voxIsland, voxSlab, voxCloud, voxFarIsland, voxSpikes, voxCandy, voxPage, voxMushroom, voxRing, voxCookie, voxGlass } from '../game3d/voxworld';
import { BARKS_CH2, BarkEvent } from '../story/barks';
import { getSave, updateSave, addFlag, hasSeen, hasFlag } from '../core/save';
import { sfx, enterUauaPresence, leaveUauaPresence } from '../core/audio';
import { score } from '../core/score';
import { useChant } from '../core/voice';
import PauseMenu from './ui/PauseMenu';

interface Props {
  level: Level3D;
  skin: SkinId;
  cleared: boolean;
  paused: boolean;
  onFinish: (r: LevelResult) => void;
  onExit: () => void;
  onMoment: (scene: string) => void;
}

// ============ 常量 ============
const STEP = 1 / 60;
const MAX_DELTA = 0.1;
const MOVE_SPEED = 5.2;
const ACCEL = 40;
const FRICTION = 30;
const JUMP_V = 9.0;
const GRAVITY = 22;
const COYOTE_TIME = 0.1;
const JUMP_BUFFER = 0.12;
const LAYER_COOLDOWN = 400;
const KILL_Y = -8;
const PLAYER = { hw: 0.32, hh: 0.55, hd: 0.32 };
const PASTEL = [0xffd36e, 0xf5a3cf, 0xb79cff, 0x7fd497, 0xffb38a];

interface AABB { x: number; y: number; z: number; hw: number; hh: number; hd: number }

// ============ 粒子 ============
class Particles {
  points: THREE.Points;
  private pos: Float32Array; private col: Float32Array; private vel: THREE.Vector3[]; private life: Float32Array;
  private n: number; private cursor = 0;
  constructor(n = 320) {
    this.n = n;
    this.pos = new Float32Array(n * 3).fill(-999);
    this.col = new Float32Array(n * 3);
    this.vel = Array.from({ length: n }, () => new THREE.Vector3());
    this.life = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, map: Particles.dot(), alphaTest: 0.05 });
    this.points = new THREE.Points(geo, m);
    this.points.frustumCulled = false;
  }
  static tex: THREE.Texture | null = null;
  static dot() {
    if (Particles.tex) return Particles.tex;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    Particles.tex = new THREE.CanvasTexture(c);
    return Particles.tex;
  }
  burst(p: THREE.Vector3, color: number, count: number, speed = 3, up = 2) {
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.n;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      const a = Math.random() * Math.PI * 2, r = Math.random() * speed;
      this.vel[i].set(Math.cos(a) * r, Math.random() * up + 0.5, Math.sin(a) * r);
      this.life[i] = 0.6 + Math.random() * 0.4;
    }
  }
  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i].y -= 7 * dt;
      this.vel[i].multiplyScalar(0.985);
      this.pos[i * 3] += this.vel[i].x * dt; this.pos[i * 3 + 1] += this.vel[i].y * dt; this.pos[i * 3 + 2] += this.vel[i].z * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ============ 运行时实体 ============
interface RtEnt extends AABB {
  ent: Entity3D;
  group: THREE.Group;
  base: THREE.Vector3;
  prev: THREE.Vector3;
  wire?: WireSkin;
  ghost?: THREE.LineSegments;
  wbox?: THREE.LineSegments;
  decor?: THREE.Object3D;
  label?: CSS2DObject;
  animate?: (t: number, dt: number) => void;
  activated?: boolean;
  fired?: boolean;
  shiftStart?: number;
  shiftDone?: boolean;
  off?: boolean;
  crumbleAt?: number;
  fallAt?: number;
  bounceT?: number;
  growK?: number;          // 第1关：路自己长出来
  setActivated?: () => void;
  resetVisual?: () => void;
  setYuaForm?: (on: boolean) => void;
  patT?: number;
  fadeMat?: THREE.MeshStandardMaterial;
  crMat?: THREE.MeshStandardMaterial;
  pandaNo?: number;
}

// ============ 小工具 ============
const mkLabel = (text: string, cls: string) => {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return new CSS2DObject(d);
};

const noteTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = 128; c.height = 168;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fffdf5'; g.fillRect(0, 0, 128, 168);
    g.fillStyle = '#f9a8d4'; g.fillRect(36, 0, 56, 18);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 3;
    for (let y = 40; y < 150; y += 18) { g.beginPath(); g.moveTo(16, y); g.bezierCurveTo(50, y - 4, 80, y + 4, 112 - (y % 36), y); g.stroke(); }
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, dizzy: { value: 0 }, wire: { value: 0 }, flash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float dizzy; uniform float wire; uniform float flash; varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r = length(d);
      // 晕3D：轻微色差 + 紫色暗角
      float ca = max(0.0, dizzy - 0.5) * 0.008;
      vec4 c;
      c.r = texture2D(tDiffuse, uv + d * ca).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - d * ca).b;
      c.a = 1.0;
      float v = smoothstep(0.35, 0.95, r);
      c.rgb *= 1.0 - v * mix(0.12, 0.4, wire);
      c.rgb = mix(c.rgb, vec3(0.43, 0.16, 0.85), v * dizzy * 0.55);
      c.rgb = mix(c.rgb, vec3(1.0), flash);
      gl_FragColor = c;
    }`,
};

// ============ 组件 ============
const GameEngine3D: React.FC<Props> = ({ level, skin, cleared, paused, onFinish, onExit, onMoment }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [menu, setMenu] = useState(false);
  const [layer, setLayer] = useState<Layer>(Layer.REAL);
  const [items, setItems] = useState<string[]>([]);
  const [dizzy, setDizzy] = useState(0);
  const [stunned, setStunned] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [cacheUsed, setCacheUsed] = useState(false);
  const [pandaMode, setPandaMode] = useState(false);
  const [yuaMode, setYuaMode] = useState(false);
  const [toast, setToast] = useState('');
  const [titleCard, setTitleCard] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [flash, setFlash] = useState(false);

  const pausedRef = useRef(paused); useEffect(() => { pausedRef.current = paused; }, [paused]);
  const menuRef = useRef(menu); useEffect(() => { menuRef.current = menu; }, [menu]);
  const cbRef = useRef({ onFinish, onExit, onMoment });
  useEffect(() => { cbRef.current = { onFinish, onExit, onMoment }; }, [onFinish, onExit, onMoment]);
  const toggleYuaRef = useRef<() => void>(() => {});
  const skipRef = useRef<() => void>(() => {});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string, ms = 2600) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), ms);
  }, []);

  const chant = useChant(() => toggleYuaRef.current());
  useEffect(() => { if (chant.error) showToast(chant.error, 3000); }, [chant.error, showToast]);

  const dizzyEnabled = skin !== 'skinNovus';
  const dizzyMul = skin === 'skin1' ? 0.5 : 1;
  const candyRelief = skin === 'skin1' ? 60 : 40;
  const canCacheAnchor = skin === 'skin2';
  const canDoubleJump = skin === 'skin3';
  const hasBandaid = skin === 'skin4';

  useEffect(() => {
    setTitleCard(true);
    const t = setTimeout(() => setTitleCard(false), 2800);
    return () => clearTimeout(t);
  }, [level, restartKey]);

  // ======================= 场景 + 主循环 =======================
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const settings = getSave().settings;
    const Q = settings.quality;
    const reduce = settings.reduceMotion;
    const th = THEMES[level.id] ?? THEMES[1];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q !== 'low', powerPreference: 'high-performance' });
    renderer.setPixelRatio(Q === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.shadowMap.enabled = Q !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping; // 保色：不像 ACES 那样把粉彩压成灰
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    if (import.meta.env.DEV) (window as any).__scene = scene;
    scene.fog = new THREE.Fog(th.fog, 70, 260);
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 900);

    // 标签层
    const labels = new CSS2DRenderer({ element: labelRef.current! });

    // 后期
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    let vignette: ShaderPass | null = null;
    if (Q !== 'low') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.12, 0.4, 0.96);
      composer.addPass(bloom);
      vignette = new ShaderPass(VignetteShader);
      composer.addPass(vignette);
      composer.addPass(new OutputPass());
    }

    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      labels.setSize(w, h);
      composer?.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ---- 灯光 ----
    const hemi = new THREE.HemisphereLight(th.hemiSky, th.hemiGround, 1.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(th.sunColor, th.sunIntensity);
    sun.castShadow = Q !== 'low';
    sun.shadow.mapSize.set(Q === 'high' ? 2048 : 1024, Q === 'high' ? 2048 : 1024);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0xc7d2fe, 0.55);
    rim.position.set(-10, 6, -12);
    scene.add(rim);

    // ---- 天空 ----
    const sky = buildSky(th);
    scene.add(sky.mesh);

    // ---- 关卡尺寸 ----
    const xs = level.entities.map(e => e.x), zs = level.entities.map(e => e.z), ys = level.entities.map(e => e.y);
    const minX = Math.min(...xs) - 10, maxX = Math.max(...xs) + 10;
    const minZ = Math.min(...zs) - 10, maxZ = Math.max(...zs) + 10;
    const minY = Math.min(...ys);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const R = rand(level.id * 977 + 13);

    // ---- 远景：只留几座远处的小岛和几朵云，脚下保持干净的天空 ----
    const scenery = new THREE.Group();
    if (import.meta.env.DEV) (window as any).__scenery = scenery;
    scene.add(scenery);
    const farIsles: THREE.Object3D[] = [];
    for (let i = 0; i < 6; i++) {
      const isle = voxFarIsland(R, th);
      const a = (i / 6) * Math.PI * 2 + R() * 0.6;
      isle.position.set(cx + Math.cos(a) * (95 + R() * 40), minY - 10 + R() * 18, cz + Math.sin(a) * (80 + R() * 35));
      isle.rotation.y = R() * 3;
      isle.scale.setScalar(0.8 + R() * 0.6);
      scenery.add(isle);
      farIsles.push(isle);
    }
    const clouds: THREE.Object3D[] = [];
    for (let i = 0; i < 9; i++) {
      const c = voxCloud(R, th.cloud, 1 + R() * 1.2);
      const side = i % 2 ? 1 : -1;
      c.position.set(minX - 10 + R() * (maxX - minX + 40), minY + (R() > 0.5 ? 16 + R() * 10 : -12 - R() * 6), cz + side * (45 + R() * 30));
      scenery.add(c);
      clouds.push(c);
    }
    // 第一章那些地方的体素剖面模型，漂在关卡四周
    const sets = LEVEL_SETS[level.id] ?? LEVEL_SETS[1];
    // 沿着路线摆：在路线上取几个点，左右交替放到路的两侧，玩家一路都看得见
    const route = level.entities.filter(e => e.type === 'PLATFORM' || e.type === 'MOVER').map(e => new THREE.Vector3(e.x, e.y, e.z));
    const placed: { x: number; z: number; r: number }[] = [];
    const animDio: ((t: number) => void)[] = [];
    sets.forEach((kind, i) => {
      const d = buildDiorama(kind, level.id * 31 + i * 7, th.grass[i % th.grass.length], LEVEL_NIGHT[level.id] ?? 0.3);
      const bb = new THREE.Box3().setFromObject(d);
      const c = bb.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      d.position.set(-c.x, -bb.min.y - (bb.max.y - bb.min.y) * 0.3, -c.z);
      holder.add(d);
      const f = (i + 0.5) / sets.length;
      const k = Math.min(route.length - 2, Math.floor(f * (route.length - 1)));
      const p0 = route[Math.max(0, k)], p1 = route[Math.min(route.length - 1, k + 2)];
      const dir = new THREE.Vector3().subVectors(p1, p0).setY(0);
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
      dir.normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(i % 2 ? 1 : -1);
      const far = kind === 'book' || kind === 'grove' ? 28 : kind === 'towers' || kind === 'faultTower' || kind === 'needle' ? 46 : 36;
      holder.position.copy(p0).addScaledVector(side, far).addScaledVector(dir, 6);
      // 离整条路线（以及已经摆好的场景）都要留出足够的空间，不然会挡住视线
      const rad = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5;
      const clearOf = () => {
        let worst = Infinity;
        for (const q of route) worst = Math.min(worst, Math.hypot(q.x - holder.position.x, q.z - holder.position.z) - rad - 18);
        for (const o of placed) worst = Math.min(worst, Math.hypot(o.x - holder.position.x, o.z - holder.position.z) - rad - o.r - 4);
        return worst;
      };
      for (let tries = 0; tries < 30 && clearOf() < 0; tries++) holder.position.addScaledVector(side, 3);
      placed.push({ x: holder.position.x, z: holder.position.z, r: rad });
      holder.position.y = p0.y - 6 + (i % 3) * 3;
      holder.lookAt(p0.x, holder.position.y, p0.z);
      if (kind === 'book') holder.rotation.z = 0.25;
      scenery.add(holder);
      farIsles.push(holder);
      if (d.userData.update) animDio.push(d.userData.update);
    });
    const birds = birdFlock(7, level.id * 13);
    scenery.add(birds.group);

    // 天上的裂缝（第4关远远看见，第5关就是终点）
    let skyCrack: THREE.Group | null = null;
    if (level.id >= 4) {
      skyCrack = new THREE.Group();
      const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false });
      const crackShape = (len: number, wdt: number) => {
        const s = new THREE.Shape();
        s.moveTo(0, len / 2); s.lineTo(wdt / 2, len * 0.15); s.lineTo(wdt * 0.2, -len * 0.1); s.lineTo(wdt * 0.45, -len / 2); s.lineTo(-wdt * 0.1, -len * 0.05); s.lineTo(-wdt / 2, len * 0.2);
        return new THREE.ShapeGeometry(s);
      };
      const main = new THREE.Mesh(crackShape(26, 2.4), cm);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 34), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, fog: false }));
      glow.position.z = -0.1;
      skyCrack.add(glow, main);
      const goal = level.entities.find(e => e.type === 'GOAL')!;
      if (level.id === 5) skyCrack.position.set(goal.x + 34, goal.y + 24, goal.z - 36);
      else skyCrack.position.set(minX - 70, minY + 30, -24);
      skyCrack.lookAt(cx, minY, cz);
      scenery.add(skyCrack);
    }

    // 线框层地面网格
    const grid = new THREE.GridHelper(400, 160, 0x3a4060, 0x1d2133);
    grid.position.set(cx, minY - 7, cz);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    grid.visible = false;
    scene.add(grid);

    // ---- 实体 ----
    const ents: RtEnt[] = [];
    const ghostMatReal = new THREE.LineDashedMaterial({ color: 0x6b7a99, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.45 });
    const ghostMatWire = new THREE.LineDashedMaterial({ color: 0x5c6380, dashSize: 0.18, gapSize: 0.22, transparent: true, opacity: 0.55 });
    const mkGhost = (w: number, h: number, d: number) => {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), ghostMatReal);
      l.computeLineDistances();
      l.visible = false;
      return l;
    };
    const wireEdgeMat = new THREE.LineBasicMaterial({ color: 0xeef1ff, transparent: true, opacity: 0.9 });
    const wireEdgeHolo = new THREE.LineBasicMaterial({ color: 0xa8ecff, transparent: true, opacity: 1 });   // 悠亚形态下的线框层边线
    let pandaNo = 0;
    const growLevel = level.id === 1;
    const spawn0 = level.spawn;

    const push = (e: Entity3D, group: THREE.Group, size: { hw: number; hh: number; hd: number }, extra: Partial<RtEnt> = {}) => {
      group.position.set(e.x, e.y, e.z);
      scene.add(group);
      const rt: RtEnt = { ent: e, group, x: e.x, y: e.y, z: e.z, ...size, base: new THREE.Vector3(e.x, e.y, e.z), prev: new THREE.Vector3(e.x, e.y, e.z), ...extra };
      if (!rt.wire) rt.wire = new WireSkin(group);
      ents.push(rt);
      return rt;
    };

    for (const e of level.entities) {
      if (e.ngPlusOnly && !cleared) continue;
      const g = new THREE.Group();
      const seed = hashStr(e.id);

      if (e.type === 'PLATFORM' || e.type === 'MOVER') {
        const w = e.w ?? 2, h = e.h ?? 0.6, d = e.d ?? 2;
        const isMover = e.type === 'MOVER';
        const thin = h <= 0.45 || isMover;
        const body = new THREE.Group();
        g.add(body);
        let decor: THREE.Object3D | undefined;
        if (thin) {
          body.add(voxSlab(w, h, d, e.color ?? PASTEL[seed % PASTEL.length], isMover));
        } else {
          body.add(voxIsland(w, h, d, e.color ?? th.grass[seed % th.grass.length], th, seed, Q !== 'low'));
        }
        const ghost = mkGhost(w, h, d);
        g.add(ghost);
        const wbox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), wireEdgeMat);
        wbox.visible = false;
        body.add(wbox);
        const rt = push(e, g, { hw: w / 2, hh: h / 2, hd: d / 2 }, { ghost, decor, wbox, wire: new WireSkin(body, false, true) });
        if (growLevel && !isMover && e.x > spawn0.x + 7) { rt.growK = 0; body.scale.setScalar(0.001); (rt as any).body = body; }
      } else if (e.type === 'HAZARD') {
        const w = e.w ?? 2, h = e.h ?? 0.7, d = e.d ?? 2;
        g.add(voxSpikes(w, h, d, seed));
        const ghost = mkGhost(w, h, d); g.add(ghost);
        push(e, g, { hw: w / 2 - 0.1, hh: h / 2 - 0.08, hd: d / 2 - 0.1 }, { ghost });
        // 调试：?hzdebug 时用红框画出伤害判定，对照尖刺的实际绘制范围
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('hzdebug')) {
          const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w - 0.2, h - 0.16, d - 0.2)), new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false }));
          box.renderOrder = 10; g.add(box);
        }
      } else if (e.type === 'PAGE') {
        const page = new THREE.Group();
        page.add(voxPage());
        const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 4), new THREE.MeshBasicMaterial({ color: 0xff8fc8, side: THREE.DoubleSide }));
        halo.rotation.x = Math.PI / 2;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8),
          new THREE.MeshBasicMaterial({ color: 0xffc4e1, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
        beam.position.y = 2.4;
        g.add(page, halo, beam);
        push(e, g, { hw: 0.55, hh: 0.65, hd: 0.55 }, {
          animate: t => { page.rotation.y = t * 1.6; page.position.y = Math.sin(t * 2.4) * 0.12; halo.position.y = -0.5 + Math.sin(t * 2.4) * 0.05; halo.rotation.z = t * 0.6; },
        });
      } else if (e.type === 'SHARD') {
        const candy = new THREE.Group();
        candy.add(voxCandy());
        g.add(candy);
        push(e, g, { hw: 0.5, hh: 0.55, hd: 0.5 }, {
          animate: t => { candy.rotation.y = t * 2; candy.rotation.z = Math.sin(t * 1.5) * 0.3; candy.position.y = Math.sin(t * 2.4 + e.x) * 0.12; },
        });
      } else if (e.type === 'CHECKPOINT') {
        const holder = new THREE.Group();
        holder.position.y = -0.55;
        const panda = buildCheckpointPanda();
        const penguin = buildCheckpointPenguin();
        penguin.group.visible = false;
        holder.add(panda.group, penguin.group);
        g.add(holder);
        const no = ++pandaNo;
        const isKimo = e.id === 'l5_kimo';
        const label = mkLabel(isKimo ? 'O3-3' : `PANDA.${String(no).padStart(3, '0')}`, 'wire-label');
        label.position.set(0, 1.35, 0);
        label.visible = false;
        g.add(label);
        // 地面柔光
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: 0xffb6d9, transparent: true, opacity: 0.0, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.y = -0.54;
        g.add(glow);
        const rt = push(e, g, { hw: 0.8, hh: 1.0, hd: 0.8 }, {
          label, pandaNo: no,
          animate: (t) => {
            const pt = rt.patT !== undefined ? t - rt.patT : 99;
            const sq = pt < 0.5 ? Math.sin((pt / 0.5) * Math.PI) * 0.18 : 0;
            holder.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
            holder.rotation.y = Math.sin(t * 0.8) * 0.3;
            holder.position.y = -0.55 + Math.abs(Math.sin(t * 2.4)) * 0.03;
            (glow.material as THREE.MeshBasicMaterial).opacity = rt.activated ? 0.35 + Math.sin(t * 2) * 0.1 : 0;
          },
        });
        rt.setActivated = () => { panda.setActivated(); penguin.setActivated(); };
        rt.resetVisual = () => { panda.reset(); penguin.reset(); };
        rt.setYuaForm = (on: boolean) => { panda.group.visible = !on; penguin.group.visible = on; };
      } else if (e.type === 'GOAL' && level.id === 5) {
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.4), crackMat);
        const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.2), crackMat); c2.rotation.z = 0.18; c2.position.set(0.16, 0.5, 0.01);
        const c3 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.6), crackMat); c3.rotation.z = -0.22; c3.position.set(-0.14, -0.7, 0.01);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 4.6), glowMat); glow.position.z = -0.02;
        const shafts = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 7), new THREE.MeshBasicMaterial({ color: 0xfff7e0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          s.rotation.z = (i / 6) * Math.PI;
          shafts.add(s);
        }
        g.add(shafts, glow, c1, c2, c3);
        push(e, g, { hw: 1.0, hh: 1.7, hd: 0.9 }, {
          animate: t => { glowMat.opacity = 0.26 + Math.sin(t * 1.8) * 0.12; g.scale.set(1, 1 + Math.sin(t * 1.8) * 0.03, 1); shafts.rotation.z = t * 0.15; },
        });
      } else if (e.type === 'GOAL') {
        const ring1 = voxRing();
        const ring2 = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xfff7e0, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
        disc.rotation.z = Math.PI / 4;
        const stars = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          st.position.set(Math.cos(i) * 1.35, Math.sin(i) * 1.35, 0);
          stars.add(st);
        }
        g.add(ring1, ring2, disc, stars);
        push(e, g, { hw: 1.1, hh: 1.1, hd: 0.9 }, {
          animate: t => { ring1.rotation.y = t * 0.8; ring2.rotation.y = -t * 1.3; stars.rotation.z = t * 0.5; g.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04); },
        });
      } else if (e.type === 'BOUNCE') {
        const w = e.w ?? 2.2;
        const cap = voxMushroom(w, seed);
        g.add(cap);
        const ghost = mkGhost(w, e.h ?? 0.4, e.d ?? w); g.add(ghost);
        const rt = push(e, g, { hw: w / 2, hh: (e.h ?? 0.4) / 2, hd: (e.d ?? 2.2) / 2 }, {
          ghost,
          animate: t => {
            const since = rt.bounceT !== undefined ? t - rt.bounceT : 99;
            const squash = since < 0.3 ? 1 - Math.sin((since / 0.3) * Math.PI) * 0.35 : 1;
            cap.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
          },
        });
      } else if (e.type === 'FADE') {
        const w = e.w ?? 2.6, h = e.h ?? 0.5, d = e.d ?? 2.6;
        const fadeMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x38bdf8, emissiveIntensity: 0.2, roughness: 0.2, transparent: true, opacity: 0.85 });
        g.add(voxGlass(w, h, d, fadeMat));
        const ghost = mkGhost(w, h, d); g.add(ghost);
        push(e, g, { hw: w / 2, hh: h / 2, hd: d / 2 }, { fadeMat, ghost });
      } else if (e.type === 'CRUMBLE') {
        const w = e.w ?? 2.6, h = e.h ?? 0.5, d = e.d ?? 2.6;
        const crMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true, opacity: 1 });
        g.add(voxCookie(w, h, d, seed, crMat));
        const ghost = mkGhost(w, h, d); g.add(ghost);
        push(e, g, { hw: w / 2, hh: h / 2, hd: d / 2 }, { crMat, ghost });
      } else if (e.type === 'TRIGGER') {
        push(e, g, { hw: (e.w ?? 3) / 2, hh: (e.h ?? 3) / 2, hd: (e.d ?? 3) / 2 });
      } else if (e.type === 'TEXT') {
        const label = mkLabel(e.text || '', 'note-label');
        g.add(label);
        push(e, g, { hw: 0, hh: 0, hd: 0 }, { label, animate: t => { g.position.y = e.y + Math.sin(t * 1.2 + e.x) * 0.1; } });
      }
    }

    // TVHEAD 留下的淡蓝色光圈（第2关起）
    const blueRings: THREE.Object3D[] = [];
    if (level.id >= 2) {
      const cands = ents.filter(r => r.ent.type === 'PLATFORM' && (r.hw * r.hd * 4) >= 9 && r.growK === undefined && !/start|final|end2/.test(r.ent.id))
        .sort((a, b) => hashStr(a.ent.id + 'tv') - hashStr(b.ent.id + 'tv'));
      cands.slice(0, 2).forEach((r, i) => {
        const ring = new THREE.Group();
        const m1 = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0x7db4ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
        const m2 = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.25, 24), new THREE.MeshBasicMaterial({ color: 0x7db4ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        m1.rotation.x = m2.rotation.x = -Math.PI / 2;
        ring.add(m1, m2);
        const lbl = mkLabel(`cache_${(0x0a + i).toString(16)}.tmp`, 'wire-label wire-label-blue');
        lbl.position.y = 0.4; lbl.visible = false;
        ring.add(lbl);
        ring.position.set(r.x + r.hw * 0.55, r.y + r.hh + 0.02, r.z - r.hd * 0.5);
        (ring as any).lbl = lbl;
        scene.add(ring);
        blueRings.push(ring);
      });
    }

    const particles = new Particles(Q === 'low' ? 180 : 360);
    scene.add(particles.points);

    // ---- 玩家 ----
    const s = {
      p: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: false, groundEnt: null as RtEnt | null },
      pp: { x: 0, y: 0, z: 0 },
      keys: { f: false, b: false, l: false, r: false, up: false, down: false },
      jumpBufferT: 0, coyoteT: 0,
      cam: { yaw: -Math.PI / 2, pitch: 0.42, dist: 9 },
      collected: new Set<string>(),
      isDead: false, dizzy: 0, stunT: 0, airJumpOk: false, shieldOk: true, invulnT: 0,
      panda: false, yua: false, typed: '', shakeT: 0, cacheUsed: false,
      lastSwitch: 0, t: 0, deaths: 0, startTime: performance.now(),
      spawn: { ...level.spawn },
      layer: Layer.REAL as Layer,
      idleT: 0, intro: 0, finishing: -1,
    };

    const rig = buildCharacter(skin);
    const pandaRig = buildPandaWitch(); const yuaRig = buildYua(); pandaRig.group.visible = false; yuaRig.group.visible = false;
    scene.add(rig.group, pandaRig.group, yuaRig.group);
    const rigWire = [new WireSkin(rig.group), new WireSkin(pandaRig.group), new WireSkin(yuaRig.group)];
    rig.group.traverse(o => { o.castShadow = !(o as any).__outline; });
    const playerLabel = mkLabel('A-04', 'wire-label');
    playerLabel.position.set(0, 1.7, 0);
    playerLabel.visible = false;
    scene.add(playerLabel);

    // ---- 室友姐（同伴） ----
    let novus: CharacterRig | null = null;
    const novusMats: THREE.Material[] = [];
    let novusFade = 1;
    const nv = { x: 0, y: 0, z: 0, vy: 0, face: 0, moving: false, idx: 0, follow: false, come: false, lookT: 0 };
    if (import.meta.env.DEV) (window as any).__nv = nv;
    const trail: { x: number; y: number; z: number }[] = [];
    let bubble: CSS2DObject | null = null;
    let novusLabel: CSS2DObject | null = null;
    if (skin !== 'skinNovus') {
      novus = buildCharacter('skinNovus');
      novus.group.traverse(o => {
        o.castShadow = !(o as any).__outline;
        // 材质单独复制一份：要单独给她做半透明，不能影响共享材质
        const m = o as THREE.Mesh;
        if (m.isMesh && !Array.isArray(m.material)) { m.material = m.material.clone(); novusMats.push(m.material); }
      });
      scene.add(novus.group);
      nv.x = level.spawn.x - 1.2; nv.y = level.spawn.y - PLAYER.hh; nv.z = level.spawn.z + 0.8;
      novus.group.position.set(nv.x, nv.y, nv.z);
      const bd = document.createElement('div');
      bd.className = 'bark-bubble';
      bubble = new CSS2DObject(bd);
      bubble.position.set(0, 2.05, 0);
      bubble.visible = false;
      novus.group.add(bubble);
      novusLabel = mkLabel('A-05', 'wire-label wire-label-warm');
      novusLabel.position.set(0, 1.6, 0);
      novusLabel.visible = false;
      novus.group.add(novusLabel);
    }
    let barkHide = 0, barkCd = 0;
    const lastBark: Partial<Record<BarkEvent, number>> = {};
    const bark = (ev: BarkEvent, force = false) => {
      if (!novus || !bubble || s.yua) return;
      if (!force && (barkCd > 0 || (lastBark[ev] ?? -99) > s.t - 12)) return;
      const pool = BARKS_CH2[ev];
      const line = pool[Math.floor(Math.random() * pool.length)];
      (bubble.element as HTMLDivElement).textContent = line;
      bubble.visible = true;
      barkHide = 2.6 + line.length * 0.08;
      barkCd = force ? 1.2 : 5;
      lastBark[ev] = s.t;
    };

    // 电视头：缓存锚点
    const cacheMarker = new THREE.Group();
    const holoCol = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.6, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7db4ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    holoCol.position.y = 0.8;
    const holoCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x9cc6ff }));
    holoCore.position.y = 1.0;
    cacheMarker.add(holoCol, holoCore);
    cacheMarker.visible = false;
    scene.add(cacheMarker);

    // ---- 图层 ----
    const isActive = (e: Entity3D, l: Layer) => e.layerMask === 'BOTH' || e.layerMask === l;
    let wireK = 0, wireTarget = 0;

    const applyLayer = (l: Layer) => {
      // 悠亚：两个世界同时存在——天空和现实层照常，线框层的东西保持建模视图的样子，一眼能分出来
      const wire = l === Layer.MANGA && !s.yua;
      score.setLayer(wire ? 'wire' : 'real');
      wireTarget = wire ? 1 : 0;
      for (const r of ents) {
        if (r.ent.type === 'TRIGGER') { r.group.visible = false; continue; }
        const active = s.yua || isActive(r.ent, l);
        r.group.visible = true;
        // 先把子物体都显示（ghost 除外），再按状态隐藏
        r.group.children.forEach(ch => { if (ch !== r.ghost && !(ch instanceof CSS2DObject)) ch.visible = active; });
        if (r.ghost) {
          r.ghost.visible = !active;
          r.ghost.material = wire ? ghostMatWire : ghostMatReal;
        }
        if (r.ent.type === 'PAGE' || r.ent.type === 'SHARD') r.group.visible = active && !s.collected.has(r.ent.id);
        const look = s.yua ? r.ent.layerMask === Layer.MANGA : wire;
        if (r.wire) r.wire.set(look && active, s.yua);
        if (r.wbox) { r.wbox.visible = look && active; r.wbox.material = s.yua ? wireEdgeHolo : wireEdgeMat; }
        if (r.decor) r.decor.visible = active && !look;
        if (r.label) {
          if (r.ent.type === 'TEXT') {
            r.label.visible = active;
            (r.label.element as HTMLElement).classList.toggle('note-label-wire', look);
          } else r.label.visible = look && active;
        }
      }
      rigWire.forEach(w => w.set(wire));
      playerLabel.visible = wire;
      if (novusLabel) novusLabel.visible = wire;
      scenery.visible = !wire;
      grid.visible = wire;
      blueRings.forEach(b => { ((b as any).lbl as CSS2DObject).visible = wire; });
      (scene.fog as THREE.Fog).color.setHex(wire ? 0x0b0d14 : th.fog);
      (scene.fog as THREE.Fog).near = wire ? 30 : 70;
      hemi.intensity = wire ? 0.9 : 1.0;
      sun.intensity = wire ? 0.9 : th.sunIntensity;
      if (bloom) bloom.strength = wire ? 0.32 : 0.12;
      setLayer(l);
    };

    const setYuaForm = (on: boolean) => ents.forEach(r => r.setYuaForm?.(on));

    // ---- 变身 ----
    const setPanda = (on: boolean) => {
      if (on && s.yua) { s.yua = false; setYuaMode(false); yuaRig.group.visible = false; setYuaForm(false); leaveUauaPresence('form'); }
      s.panda = on;
      if (!s.isDead) { rig.group.visible = !on; pandaRig.group.visible = on; }
      setPandaMode(on);
      if (on) addFlag('shadow');
      showToast(on ? '✨ 变身魔法熊猫！空格上升 · Shift 下降 · 再输入 shadow 变回' : '变回来了！', 2800);
      sfx('transform');
      particles.burst(new THREE.Vector3(s.p.x, s.p.y + 0.5, s.p.z), on ? 0x8db8f5 : 0xf6d76b, 40, 3, 3.5);
      applyLayer(s.layer);
    };
    const setYua = (on: boolean) => {
      if (on && s.panda) { s.panda = false; setPandaMode(false); pandaRig.group.visible = false; }
      s.yua = on;
      if (!s.isDead) { rig.group.visible = !on; yuaRig.group.visible = on; }
      setYuaMode(on);
      if (on) addFlag('yua');
      // 悠亚在场 → 专属曲；离场 → 恢复本关配乐（秘密形态复用剧情入场的同一套音乐逻辑）
      if (on) enterUauaPresence('secret_form'); else leaveUauaPresence('form');
      setYuaForm(on);
      // 悠亚形态时室友姐不在身边；变回来时她出现在你旁边
      if (novus) {
        if (on) {
          particles.burst(new THREE.Vector3(nv.x, nv.y + 0.8, nv.z), 0xffc89a, 14, 1.5, 2);
          novus.group.visible = false;
          if (bubble) bubble.visible = false;
          barkHide = 0;
        } else {
          nv.x = s.p.x - 1.0; nv.y = s.p.y - PLAYER.hh; nv.z = s.p.z + 0.6; nv.vy = 0;
          nv.idx = trail.length; nv.follow = nv.come = false;
          novus.group.position.set(nv.x, nv.y, nv.z);
          novus.group.visible = true;
          particles.burst(new THREE.Vector3(nv.x, nv.y + 0.8, nv.z), 0xffc89a, 14, 1.5, 2);
        }
      }
      applyLayer(s.layer);
      showToast(on ? '所有次元同时存在' : '次元恢复分层', 2800);
      sfx('transform');
      particles.burst(new THREE.Vector3(s.p.x, s.p.y + 0.5, s.p.z), on ? 0xe8e8f0 : 0x93c5fd, 44, 3.2, 3.5);
    };
    toggleYuaRef.current = () => setYua(!s.yua);

    // ---- 剧情触发 ----
    const firedMoments = new Set<string>();
    const moment = (id: string) => {
      if (s.yua || firedMoments.has(id) || hasSeen(id)) return;   // 小剧场要室友姐在场
      firedMoments.add(id);
      s.keys.f = s.keys.b = s.keys.l = s.keys.r = s.keys.up = s.keys.down = false;
      setTimeout(() => cbRef.current.onMoment(id), 250);
    };

    const switchLayer = () => {
      const now = performance.now();
      if (now - s.lastSwitch < LAYER_COOLDOWN || s.stunT > 0 || s.isDead || s.yua || s.finishing >= 0) return;
      s.lastSwitch = now;
      if (dizzyEnabled && !s.panda) s.dizzy = Math.min(100, s.dizzy + 30 * dizzyMul);
      s.layer = s.layer === Layer.REAL ? Layer.MANGA : Layer.REAL;
      applyLayer(s.layer);
      sfx(s.layer === Layer.MANGA ? 'switch' : 'switchBack');
      particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), s.layer === Layer.REAL ? 0x60a5fa : 0xffffff, 26, 2.5, 2.5);
      if (s.layer === Layer.MANGA) moment('c2_m_wire');
      if (Math.random() < 0.25) bark('switch');
    };

    // ---- R：和室友姐说话（不用贴着她）；F：摸熊猫 / 企鹅；E：外观技能 —— 三个键互不抢 ----
    const talk = () => {
      if (s.isDead || s.finishing >= 0 || !novus || s.yua) return;
      const d = Math.hypot(nv.x - s.p.x, nv.z - s.p.z);
      if (d > 30) return;
      bark('talk', true);
      novus.head.rotation.z = 0.25;
      nv.lookT = 1.6;                 // 转过来看你一会儿
      if (d > 4.5) nv.come = true;    // 离得远就小跑过来
      sfx('click');
    };
    const interact = () => {
      if (s.isDead || s.finishing >= 0) return;
      const pd = ents.find(r => r.ent.type === 'CHECKPOINT' && r.group.visible && Math.hypot(r.x - s.p.x, r.z - s.p.z) < 2.0 && Math.abs(r.y - s.p.y) < 1.5);
      if (pd) {
        pd.patT = s.t;
        sfx('pat');
        particles.burst(new THREE.Vector3(pd.x, pd.y + 0.8, pd.z), s.yua ? 0x9cd3ff : 0xff9ccf, 14, 1.2, 2.2);
        updateSave(d => { d.pats += 1; });
        addFlag('pat');
        bark('pat');
      }
    };
    const useSkill = () => {
      if (s.isDead || s.finishing >= 0) return;
      if (canCacheAnchor && s.cacheUsed) { showToast('缓存锚点每关只能部署一次', 1600); return; }
      if (canCacheAnchor && !s.p.grounded) { showToast('站稳了才能部署', 1400); return; }
      if (canCacheAnchor && !s.cacheUsed && s.p.grounded && !s.panda) {
        s.cacheUsed = true;
        s.spawn = { x: s.p.x, y: s.p.y + 0.2, z: s.p.z };
        cacheMarker.position.set(s.p.x, s.p.y - PLAYER.hh, s.p.z);
        cacheMarker.visible = true;
        setCacheUsed(true);
        showToast('⚡ 缓存锚点已部署！倒下后会从这里醒来');
        sfx('checkpoint');
        particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), 0x7db4ff, 28, 2.5, 3);
      }
    };

    // ---- 输入 ----
    const kd = (e: KeyboardEvent) => {
      if (menuRef.current || pausedRef.current) return;
      if (s.intro < 1 && s.intro > 0.05) s.intro = Math.max(s.intro, 0.9); // 任意键跳过开场镜头
      if (/^[a-z]$/i.test(e.key)) {
        s.typed = (s.typed + e.key.toLowerCase()).slice(-6);
        if (s.typed === 'shadow') { s.typed = ''; setPanda(!s.panda); }
      }
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': e.preventDefault(); s.keys.f = true; break;
        case 'KeyS': case 'ArrowDown': e.preventDefault(); s.keys.b = true; break;
        case 'KeyA': case 'ArrowLeft': e.preventDefault(); s.keys.l = true; break;
        case 'KeyD': case 'ArrowRight': e.preventDefault(); s.keys.r = true; break;
        case 'Space': e.preventDefault(); s.jumpBufferT = JUMP_BUFFER; s.keys.up = true; break;
        case 'ShiftLeft': case 'ShiftRight': s.keys.down = true; break;
        case 'KeyE': if (!e.repeat) useSkill(); break;
        case 'KeyF': if (!e.repeat) interact(); break;
        case 'KeyR': if (!e.repeat) talk(); break;
        case 'KeyQ': if (!e.repeat) switchLayer(); break;
        case 'KeyY': if (!e.repeat && hasFlag('yua')) toggleYuaRef.current(); break;
        case 'Escape': e.preventDefault(); setMenu(true); s.keys.f = s.keys.b = s.keys.l = s.keys.r = s.keys.up = s.keys.down = false; break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = s.keys;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': k.f = false; break;
        case 'KeyS': case 'ArrowDown': k.b = false; break;
        case 'KeyA': case 'ArrowLeft': k.l = false; break;
        case 'KeyD': case 'ArrowRight': k.r = false; break;
        case 'Space': k.up = false; break;
        case 'ShiftLeft': case 'ShiftRight': k.down = false; break;
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // ---- 相机拖动 ----
    const sens = settings.camSens || 1;
    let dragging = false, lastPX = 0, lastPY = 0;
    const onPD = (e: PointerEvent) => { dragging = true; lastPX = e.clientX; lastPY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onPM = (e: PointerEvent) => {
      if (!dragging) return;
      s.cam.yaw -= (e.clientX - lastPX) * 0.006 * sens;
      s.cam.pitch = Math.min(1.25, Math.max(0.1, s.cam.pitch + (e.clientY - lastPY) * 0.004 * sens));
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const onPU = (e: PointerEvent) => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ } };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); s.cam.dist = Math.min(15, Math.max(5, s.cam.dist + e.deltaY * 0.008)); };
    canvas.addEventListener('pointerdown', onPD);
    canvas.addEventListener('pointermove', onPM);
    canvas.addEventListener('pointerup', onPU);
    canvas.addEventListener('pointercancel', onPU);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // ---- 物理列表 ----
    const listsFor = (l: Layer) => {
      const act = ents.filter(r => isActive(r.ent, l));
      return {
        solids: act.filter(r => ['PLATFORM', 'MOVER', 'FADE', 'CRUMBLE', 'BOUNCE'].includes(r.ent.type)),
        hazards: act.filter(r => r.ent.type === 'HAZARD'),
        pickups: act.filter(r => r.ent.type === 'PAGE' || r.ent.type === 'SHARD'),
        goals: act.filter(r => r.ent.type === 'GOAL'),
        checkpoints: act.filter(r => r.ent.type === 'CHECKPOINT'),
      };
    };
    const physics = { [Layer.REAL]: listsFor(Layer.REAL), [Layer.MANGA]: listsFor(Layer.MANGA) };
    const uni = <T,>(a: T[], b: T[]) => Array.from(new Set([...a, ...b]));
    const physicsAll = {
      solids: uni(physics[Layer.REAL].solids, physics[Layer.MANGA].solids),
      hazards: uni(physics[Layer.REAL].hazards, physics[Layer.MANGA].hazards),
      pickups: uni(physics[Layer.REAL].pickups, physics[Layer.MANGA].pickups),
      goals: uni(physics[Layer.REAL].goals, physics[Layer.MANGA].goals),
      checkpoints: uni(physics[Layer.REAL].checkpoints, physics[Layer.MANGA].checkpoints),
    };
    const movers = ents.filter(r => r.ent.type === 'MOVER');
    const triggers = ents.filter(r => r.ent.type === 'TRIGGER');
    const shifters = ents.filter(r => r.ent.shiftTo !== undefined);
    const fades = ents.filter(r => r.ent.type === 'FADE');
    const crumbles = ents.filter(r => r.ent.type === 'CRUMBLE');
    const growers = ents.filter(r => r.growK !== undefined);
    const goalEnt = ents.find(r => r.ent.type === 'GOAL');

    const playerBox = (): AABB => ({ x: s.p.x, y: s.p.y, z: s.p.z, ...PLAYER });
    const overlap = (a: AABB, b: AABB) => Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh && Math.abs(a.z - b.z) < a.hd + b.hd;

    // ---- 初始状态 ----
    s.p.x = s.spawn.x; s.p.y = s.spawn.y; s.p.z = s.spawn.z;
    s.pp = { x: s.p.x, y: s.p.y, z: s.p.z };
    applyLayer(Layer.REAL);
    setItems([]); setDizzy(0); setStunned(false); setShieldUsed(false); setCacheUsed(false); setPandaMode(false); setYuaMode(false); setFlash(false);
    // 开场镜头的起点：从关卡深处高空掠过来
    const introFrom = new THREE.Vector3(s.spawn.x + 16, s.spawn.y + 11, s.spawn.z + 14);
    const introLook = new THREE.Vector3(Math.min(maxX - 10, s.spawn.x + 14), s.spawn.y, s.spawn.z);
    camera.position.copy(introFrom);
    camera.lookAt(introLook);
    s.intro = reduce ? 1 : 0.0001;

    let respawnTimer: ReturnType<typeof setTimeout> | undefined;
    if (import.meta.env.DEV) (window as any).__s = s;
    const respawn = () => {
      if (s.isDead) return;
      s.isDead = true;
      s.deaths += 1;
      sfx('death');
      particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), 0xff8fb1, 34, 3.5, 3);
      rig.group.visible = pandaRig.group.visible = yuaRig.group.visible = false;
      respawnTimer = setTimeout(() => {
        s.p.x = s.spawn.x; s.p.y = s.spawn.y; s.p.z = s.spawn.z;
        s.pp = { x: s.p.x, y: s.p.y, z: s.p.z };
        s.p.vx = s.p.vy = s.p.vz = 0;
        s.keys.f = s.keys.b = s.keys.l = s.keys.r = false;
        s.isDead = false;
        s.dizzy = Math.min(s.dizzy, 40);
        s.stunT = 0; s.shieldOk = true;
        setShieldUsed(false); setStunned(false);
        rig.group.visible = !s.panda && !s.yua;
        pandaRig.group.visible = s.panda;
        yuaRig.group.visible = s.yua;
        sfx('respawn');
        particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), 0x93c5fd, 22, 2, 2.5);
        // 室友姐一起回来
        if (novus) {
          trail.length = 0; nv.idx = 0;
          nv.x = s.spawn.x - 1.0; nv.y = s.spawn.y - PLAYER.hh; nv.z = s.spawn.z + 0.7; nv.vy = 0;
          particles.burst(new THREE.Vector3(nv.x, nv.y + 0.8, nv.z), 0xffc89a, 14, 1.5, 2);
          bark('death', true);
        }
      }, 380);
    };

    const resolveAxis = (axis: 'x' | 'y' | 'z', prevVal: number, solids: RtEnt[]) => {
      const half = axis === 'x' ? 'hw' : axis === 'y' ? 'hh' : 'hd';
      let landed: RtEnt | null = null;
      for (const e of solids) {
        if (e.off) continue;
        if (!overlap(playerBox(), e)) continue;
        const sum = (PLAYER as any)[half] + (e as any)[half];
        const prevDelta = prevVal - e[axis];
        if (Math.abs(prevDelta) < sum - 1e-4) continue;
        const dir = prevDelta >= 0 ? 1 : -1;
        s.p[axis] = e[axis] + sum * dir;
        const v = axis === 'x' ? 'vx' : axis === 'y' ? 'vy' : 'vz';
        if ((s.p as any)[v] * dir < 0) (s.p as any)[v] = 0;
        if (axis === 'y' && dir > 0) landed = e;
      }
      return landed;
    };

    const finishLevel = (skipped = false) => {
      if (s.finishing >= 0) return;
      s.finishing = 0;
      sfx('goal');
      bark('goal', true);
      if (goalEnt) particles.burst(new THREE.Vector3(goalEnt.x, goalEnt.y, goalEnt.z), 0xfff1c8, 50, 4, 4);
      const collected = skipped ? level.entities.filter(e => e.type === 'PAGE' || e.type === 'SHARD').map(e => e.id) : Array.from(s.collected);
      const res: LevelResult = { chapter: 2, levelId: level.id, timeTaken: performance.now() - s.startTime, deathCount: s.deaths, collectedIds: collected, skipped };
      const delay = skipped ? 300 : level.id === 5 ? 3200 : 1300;
      if (level.id === 5 && !skipped) setTimeout(() => setFlash(true), 2200);
      setTimeout(() => cbRef.current.onFinish(res), delay);
    };
    skipRef.current = () => finishLevel(true);

    let wasGrounded = false;
    let lastDz = -1;

    const stepLogic = () => {
      s.t += STEP;
      const p = s.p;
      s.pp.x = p.x; s.pp.y = p.y; s.pp.z = p.z;
      barkCd = Math.max(0, barkCd - STEP);
      if (barkHide > 0) { barkHide -= STEP; if (barkHide <= 0 && bubble) bubble.visible = false; }

      for (const m of movers) {
        m.prev.set(m.x, m.y, m.z);
        const to = m.ent.moveTo!;
        const ph = (Math.sin((s.t / (m.ent.period ?? 5)) * Math.PI * 2) + 1) / 2;
        m.x = m.base.x + (to.x - m.base.x) * ph; m.y = m.base.y + (to.y - m.base.y) * ph; m.z = m.base.z + (to.z - m.base.z) * ph;
      }
      for (const tr of triggers) {
        if (tr.fired || !overlap(playerBox(), tr)) continue;
        tr.fired = true;
        s.shakeT = reduce ? 0 : 0.55;
        showToast('咔哒——', 1600);
        sfx('shift');
        for (const sh of shifters) {
          if (sh.ent.shiftGroup !== tr.ent.shiftGroup) continue;
          sh.shiftStart = s.t;
          particles.burst(new THREE.Vector3(sh.x, sh.y + 0.5, sh.z), 0xcbd5e1, 18, 2.5, 2);
        }
        setTimeout(() => moment('c2_m_shift'), 900);
      }
      for (const sh of shifters) {
        if (sh.shiftStart === undefined || sh.shiftDone) continue;
        const k = Math.min(1, (s.t - sh.shiftStart) / 0.7);
        const ease = k * k * (3 - 2 * k);
        const to = sh.ent.shiftTo!;
        sh.x = sh.base.x + (to.x - sh.base.x) * ease; sh.y = sh.base.y + (to.y - sh.base.y) * ease; sh.z = sh.base.z + (to.z - sh.base.z) * ease;
        sh.group.position.set(sh.x, sh.y, sh.z);
        if (k >= 1) { sh.shiftDone = true; particles.burst(new THREE.Vector3(sh.x, sh.y + 0.5, sh.z), 0xffffff, 14, 2, 1.5); }
      }
      s.shakeT = Math.max(0, s.shakeT - STEP);
      for (const f of fades) {
        const ph = Math.sin((s.t / (f.ent.fadePeriod ?? 3)) * Math.PI * 2 + (f.ent.fadeOffset ?? 0));
        f.off = ph <= -0.25;
        if (f.fadeMat) {
          const warn = ph > -0.25 && ph < 0.05;
          const target = f.off ? 0.08 : warn ? (Math.sin(s.t * 24) > 0 ? 0.85 : 0.4) : 0.85;
          f.fadeMat.opacity += (target - f.fadeMat.opacity) * 0.35;
        }
      }
      for (const c of crumbles) {
        if (c.crumbleAt !== undefined && !c.off) {
          const held = s.t - c.crumbleAt;
          c.group.position.set(c.x + (Math.random() - 0.5) * 0.12 * held, c.y, c.z + (Math.random() - 0.5) * 0.12 * held);
          if (held > 0.55) { c.off = true; c.fallAt = s.t; sfx('crumble'); particles.burst(new THREE.Vector3(c.x, c.y, c.z), 0xe0b285, 22, 2.5, 1.5); }
        }
        if (c.off && c.fallAt !== undefined) {
          const fell = s.t - c.fallAt;
          c.group.position.y = c.y - Math.min(3, fell * 4);
          if (c.crMat) c.crMat.opacity = Math.max(0, 1 - fell * 1.6);
          if (fell > 2.6) {
            c.off = false; c.crumbleAt = undefined; c.fallAt = undefined;
            c.group.position.set(c.x, c.y, c.z);
            if (c.crMat) c.crMat.opacity = 1;
            particles.burst(new THREE.Vector3(c.x, c.y + 0.4, c.z), 0xffffff, 10, 1.5, 1.5);
          }
        }
      }
      // 第1关：走近时路才长出来
      for (const gr of growers) {
        if (gr.growK! < 1 && Math.abs(gr.x - p.x) < 13) {
          if (gr.growK === 0) { sfx('whoosh'); if (s.t > 1.5) setTimeout(() => moment('c2_m_grow'), 700); }
          gr.growK = Math.min(1, gr.growK! + STEP * 1.8);
          const k = gr.growK!;
          const e2 = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
          (gr as any).body.scale.setScalar(Math.max(0.001, e2));
        }
      }

      if (s.isDead || s.finishing >= 0) return;
      const locked = s.intro < 0.75;

      if (p.groundEnt && p.groundEnt.ent.type === 'MOVER') {
        p.x += p.groundEnt.x - p.groundEnt.prev.x; p.y += p.groundEnt.y - p.groundEnt.prev.y; p.z += p.groundEnt.z - p.groundEnt.prev.z;
      }
      for (const m of movers) {
        if (m === p.groundEnt) continue;
        if (m.ent.layerMask !== 'BOTH' && m.ent.layerMask !== s.layer && !s.yua) continue;
        if (!overlap(playerBox(), m)) continue;
        const dx = m.x - m.prev.x, dy = m.y - m.prev.y, dz = m.z - m.prev.z;
        const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
        if (ay >= ax && ay >= az && ay > 0) { const dir = dy > 0 ? 1 : -1; p.y = m.y + (m.hh + PLAYER.hh) * dir; if (p.vy * dir < 0) p.vy = 0; }
        else if (ax >= az && ax > 0) p.x = m.x + (m.hw + PLAYER.hw) * (dx > 0 ? 1 : -1);
        else if (az > 0) p.z = m.z + (m.hd + PLAYER.hd) * (dz > 0 ? 1 : -1);
      }

      const fx = -Math.sin(s.cam.yaw), fz = -Math.cos(s.cam.yaw);
      const rx = -fz, rz = fx;
      let ix = 0, iz = 0;
      if (!locked) {
        if (s.keys.f) { ix += fx; iz += fz; }
        if (s.keys.b) { ix -= fx; iz -= fz; }
        if (s.keys.r) { ix += rx; iz += rz; }
        if (s.keys.l) { ix -= rx; iz -= rz; }
      }
      const ilen = Math.hypot(ix, iz);
      if (ilen > 0) { ix /= ilen; iz /= ilen; }
      s.idleT = ilen > 0 || !p.grounded ? 0 : s.idleT + STEP;
      if (s.idleT > 9) { bark('idle'); s.idleT = 0; }

      if (dizzyEnabled) {
        s.dizzy = Math.max(0, s.dizzy - (s.panda ? 8 : (ilen > 0 || !p.grounded ? 1.2 : 5)) * STEP);
        if (s.dizzy >= 100 && s.stunT <= 0) {
          s.stunT = 1.2; setStunned(true); sfx('stun'); bark('stun', true);
          particles.burst(new THREE.Vector3(p.x, p.y + 0.6, p.z), 0xa78bfa, 26, 2, 2.5);
        } else if (s.dizzy > 75) bark('dizzyHigh');
      }
      if (s.stunT > 0) {
        s.stunT -= STEP; ix = 0; iz = 0; s.jumpBufferT = 0;
        if (s.stunT <= 0) { s.dizzy = 55; setStunned(false); }
      }
      s.invulnT = Math.max(0, s.invulnT - STEP);
      const dizzyFactor = (dizzyEnabled && !s.panda) ? 1 - 0.45 * Math.max(0, (s.dizzy - 60) / 40) : 1;
      const spd = s.panda ? MOVE_SPEED * 1.2 : MOVE_SPEED;
      const tvx = ix * spd * dizzyFactor, tvz = iz * spd * dizzyFactor;
      const rate = ilen > 0 ? ACCEL : FRICTION;
      p.vx += Math.min(Math.abs(tvx - p.vx), rate * STEP) * Math.sign(tvx - p.vx);
      p.vz += Math.min(Math.abs(tvz - p.vz), rate * STEP) * Math.sign(tvz - p.vz);

      s.coyoteT = p.grounded ? COYOTE_TIME : Math.max(0, s.coyoteT - STEP);
      s.jumpBufferT = Math.max(0, s.jumpBufferT - STEP);
      if (locked) s.jumpBufferT = 0;
      if (s.panda) {
        const tv = s.keys.up ? 4.8 : s.keys.down ? -4.8 : 0;
        p.vy += (tv - p.vy) * Math.min(1, 12 * STEP);
        s.jumpBufferT = 0;
      } else {
        if (p.grounded) s.airJumpOk = true;
        if (s.jumpBufferT > 0 && s.coyoteT > 0) {
          p.vy = JUMP_V; s.jumpBufferT = 0; s.coyoteT = 0; p.grounded = false;
          sfx('jump');
          particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0xffffff, 10, 1.5, 1);
        } else if (s.jumpBufferT > 0 && canDoubleJump && s.airJumpOk && !p.grounded && s.coyoteT <= 0) {
          p.vy = JUMP_V * 0.92; s.jumpBufferT = 0; s.airJumpOk = false;
          sfx('djump');
          particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0x93e6c8, 16, 2.2, 1.5);
        }
        p.vy -= GRAVITY * STEP;
        if (p.vy < -20) p.vy = -20;
      }

      const lists = s.yua ? physicsAll : physics[s.layer];
      const px0 = p.x; p.x += p.vx * STEP; resolveAxis('x', px0, lists.solids);
      const pz0 = p.z; p.z += p.vz * STEP; resolveAxis('z', pz0, lists.solids);
      const py0 = p.y; const vyImpact = p.vy; p.y += p.vy * STEP;
      const landedOn = resolveAxis('y', py0, lists.solids);
      p.grounded = !!landedOn; p.groundEnt = landedOn;
      if (landedOn) {
        if (landedOn.ent.type === 'BOUNCE') {
          p.vy = 13.5; p.grounded = false; p.groundEnt = null; s.coyoteT = 0; s.airJumpOk = true; landedOn.bounceT = s.t;
          sfx('bounce');
          particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0xff8cc6, 18, 2.5, 2);
        } else if (landedOn.ent.type === 'CRUMBLE' && landedOn.crumbleAt === undefined && !landedOn.off) landedOn.crumbleAt = s.t;
      }
      if (p.grounded && !wasGrounded) {
        if (vyImpact < -6) sfx('land');
        particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0xe2ecf8, 12, 2, 1.2);
        if (dizzyEnabled && !s.panda && vyImpact < -11) s.dizzy = Math.min(100, s.dizzy + Math.min(30, ((-vyImpact - 11) * 2.5 + 12)) * dizzyMul);
      }
      wasGrounded = p.grounded;
      const dz = Math.round(s.dizzy);
      if (Math.abs(dz - lastDz) >= 2 || (dz === 0 && lastDz !== 0)) { lastDz = dz; setDizzy(dz); }

      if (s.invulnT <= 0 && !s.panda) {
        for (const e of lists.hazards) {
          if (!overlap(playerBox(), e)) continue;
          if (hasBandaid && s.shieldOk) {
            s.shieldOk = false; s.invulnT = 1.2; p.vy = 7.5;
            if (dizzyEnabled) s.dizzy = Math.min(100, s.dizzy + 20);
            sfx('shield');
            particles.burst(new THREE.Vector3(p.x, p.y, p.z), 0xf5d7b8, 22, 2.5, 3);
            setShieldUsed(true);
          } else { respawn(); return; }
          break;
        }
      }
      if (p.y < Math.min(KILL_Y, minY - 8)) { respawn(); return; }

      for (const e of lists.checkpoints) {
        if (!e.activated && overlap(playerBox(), e)) {
          e.activated = true; e.setActivated?.();
          s.spawn = { x: e.x, y: e.y + 0.8, z: e.z };
          s.shieldOk = true; setShieldUsed(false);
          sfx('checkpoint');
          particles.burst(new THREE.Vector3(e.x, e.y + 0.5, e.z), 0xf472b6, 28, 2.5, 3);
          showToast(s.yua ? '企鹅记住了你。' : '熊猫记住了你。', 1500);
        }
      }
      // 走近熊猫
      for (const e of physicsAll.checkpoints) {
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < 3 && Math.abs(e.y - p.y) < 2) {
          if (level.id === 1 && s.t > 2.5) moment('c2_firstpanda');
          if (!e.activated) bark('nearPanda');
        }
      }
      for (const e of lists.pickups) {
        if (s.collected.has(e.ent.id) || !overlap(playerBox(), e)) continue;
        s.collected.add(e.ent.id);
        e.group.visible = false;
        const isPage = e.ent.type === 'PAGE';
        if (dizzyEnabled) s.dizzy = Math.max(0, s.dizzy - (isPage ? 15 : candyRelief));
        sfx(isPage ? 'page' : 'candy');
        particles.burst(new THREE.Vector3(e.x, e.y, e.z), isPage ? 0xf472b6 : 0x6ee7b7, 26, 2.5, 3);
        setItems(Array.from(s.collected));
        bark(isPage ? 'page' : 'candy', isPage);
      }
      // 剧情：天上的缝 / 最后一段路
      if (level.id === 4 && p.z < -11 && p.x < 3) moment('c2_m_crack');
      if (level.id === 5 && goalEnt && p.x > goalEnt.x - 15) moment('c2_m_last');
      if (goalEnt && Math.hypot(goalEnt.x - p.x, goalEnt.z - p.z) < 9) bark('goal');

      for (const e of lists.goals) {
        if (overlap(playerBox(), e)) { finishLevel(); return; }
      }

      // 室友姐的足迹
      if (novus) {
        const lastP = trail[trail.length - 1];
        const fy = p.y - PLAYER.hh;
        if (!lastP || Math.hypot(lastP.x - p.x, lastP.y - fy, lastP.z - p.z) > 0.12) {
          trail.push({ x: p.x, y: fy, z: p.z });
          if (trail.length > 900) { trail.splice(0, 300); nv.idx = Math.max(0, nv.idx - 300); }
        }
      }
    };

    // 室友姐跟随（逻辑步之外，每帧）
    const trailTarget = new THREE.Vector3();
    /** 这个点脚下有没有平台（室友姐挪位置前先看一眼，免得站到空中） */
    const standable = (x: number, footY: number, z: number) => {
      const lists = s.yua ? physicsAll : physics[s.layer];
      return lists.solids.some(e => !e.off && Math.abs(x - e.x) < e.hw - 0.25 && Math.abs(z - e.z) < e.hd - 0.25 && Math.abs(footY - (e.y + e.hh)) < 0.3);
    };
    const stepNovus = (dt: number) => {
      if (!novus || s.yua) return;
      const p = s.p;
      const distP = Math.hypot(nv.x - p.x, nv.z - p.z);
      nv.moving = false;
      if (s.finishing >= 0 && goalEnt) {
        // 终点：走到你身边
        const tx = p.x - 0.9, tz = p.z + 0.6;
        const d = Math.hypot(tx - nv.x, tz - nv.z);
        if (d > 0.1) { nv.x += (tx - nv.x) * Math.min(1, dt * 3); nv.z += (tz - nv.z) * Math.min(1, dt * 3); nv.moving = d > 0.3; }
        nv.y += ((p.y - PLAYER.hh) - nv.y) * Math.min(1, dt * 4);
      } else {
        // 跟随：保持两三步的距离，不贴身、不抢路。
        //  · 离你超过 3.6m 才沿着你的脚印走；走到 2.6m 内就停（叫她过来时停在 1.8m）
        //  · 你站着不动一会儿，她才慢慢挪到镜头右后方，免得挡住前面的路
        const stopAt = nv.come ? 1.8 : 2.6;
        if (!nv.follow && distP > 3.6) nv.follow = true;
        if (nv.follow && distP <= stopAt) { nv.follow = false; nv.come = false; }
        const sameFloor = Math.abs(nv.y - (p.y - PLAYER.hh)) < 0.6;
        if (nv.follow && nv.idx < trail.length) {
          let budget = (nv.come || distP > 6 ? 8.5 : 5.6) * dt;
          while (budget > 0 && nv.idx < trail.length) {
            const tp = trail[nv.idx];
            const dx = tp.x - nv.x, dy = tp.y - nv.y, dz = tp.z - nv.z;
            const d = Math.hypot(dx, dy, dz);
            if (d <= budget) { nv.x = tp.x; nv.y = tp.y; nv.z = tp.z; budget -= d; nv.idx++; }
            else { nv.x += dx / d * budget; nv.y += dy / d * budget; nv.z += dz / d * budget; budget = 0; }
            if (Math.hypot(nv.x - p.x, nv.z - p.z) <= stopAt) break;
          }
          nv.moving = true;
        } else if (nv.follow && sameFloor && p.grounded) {
          // 脚印用完了（比如刚复活）：直接朝你走
          const sp = Math.min(distP - stopAt, 5.6 * dt);
          if (sp > 0) { nv.x += (p.x - nv.x) / distP * sp; nv.z += (p.z - nv.z) / distP * sp; nv.moving = true; trailTarget.set(p.x, 0, p.z); }
        } else if (!nv.follow && p.grounded && !s.isDead && sameFloor) {
          if (distP < 1.4) {
            // 太近了：往旁边让一让
            const ax = (nv.x - p.x) / Math.max(0.01, distP), az = (nv.z - p.z) / Math.max(0.01, distP);
            const sp = Math.min(1.4 - distP, 3 * dt);
            if (standable(nv.x + ax * 0.4, nv.y, nv.z + az * 0.4)) { nv.x += ax * sp; nv.z += az * sp; nv.moving = sp > 0.004; }
            trailTarget.set(nv.x + ax, 0, nv.z + az);
          } else if (s.idleT > 1.2 && distP < 6) {
            const rx2 = Math.cos(s.cam.yaw), rz2 = -Math.sin(s.cam.yaw);
            const bx = Math.sin(s.cam.yaw), bz = Math.cos(s.cam.yaw);
            const tx = p.x + rx2 * 1.7 + bx * 0.9, tz = p.z + rz2 * 1.7 + bz * 0.9;
            const dx = tx - nv.x, dz = tz - nv.z;
            const d = Math.hypot(dx, dz);
            // 只在落脚点还在平台上时才挪过去
            if (d > 0.3 && standable(tx, p.y - PLAYER.hh, tz)) {
              const sp = Math.min(d, 2.2 * dt);
              nv.x += dx / d * sp; nv.z += dz / d * sp; nv.moving = true;
              trailTarget.set(tx, 0, tz);
            }
          }
          nv.y += ((p.y - PLAYER.hh) - nv.y) * Math.min(1, dt * 10);
          nv.idx = trail.length;
        }
      }
      // 落后太远：一闪就到你身边
      if (distP > 14 && s.p.grounded && !s.isDead) {
        nv.x = p.x - 1.0; nv.y = p.y - PLAYER.hh; nv.z = p.z + 0.6; nv.idx = trail.length;
        particles.burst(new THREE.Vector3(nv.x, nv.y + 0.8, nv.z), 0xffc89a, 16, 1.5, 2);
      }
      const g = novus.group;
      nv.lookT = Math.max(0, nv.lookT - dt);
      const faceYou = !nv.moving || nv.lookT > 0;
      const tdx = !faceYou ? (nv.idx < trail.length ? trail[nv.idx].x : trailTarget.x) - nv.x : p.x - nv.x;
      const tdz = !faceYou ? (nv.idx < trail.length ? trail[nv.idx].z : trailTarget.z) - nv.z : p.z - nv.z;
      if (Math.hypot(tdx, tdz) > 0.05) {
        let na = Math.atan2(tdx, tdz) - g.rotation.y;
        while (na > Math.PI) na -= Math.PI * 2; while (na < -Math.PI) na += Math.PI * 2;
        g.rotation.y += na * Math.min(1, dt * 8);
      }
      const prevY = g.position.y;
      g.position.set(nv.x, nv.y, nv.z);
      const air = Math.abs(nv.y - prevY) > dt * 1.5;
      const t = s.t;
      if (air) { novus.legL.rotation.x = -0.5; novus.legR.rotation.x = 0.3; novus.armL.rotation.x = -1.2; novus.armR.rotation.x = -1.2; }
      else if (nv.moving) {
        const sw = Math.sin(t * 12);
        novus.legL.rotation.x = sw * 0.8; novus.legR.rotation.x = -sw * 0.8;
        novus.armL.rotation.x = -sw * 0.55; novus.armR.rotation.x = sw * 0.55;
        novus.body.position.y = Math.abs(Math.cos(t * 12)) * 0.05;
      } else {
        novus.legL.rotation.x = novus.legR.rotation.x = 0;
        novus.armL.rotation.x = Math.sin(t * 2.2) * 0.06;
        novus.armR.rotation.x = s.finishing >= 0 ? -2.5 + Math.sin(t * 7) * 0.4 : -Math.sin(t * 2.2) * 0.06;
        novus.body.position.y = Math.sin(t * 2.2) * 0.02;
      }
      novus.head.rotation.z *= 0.92;
    };

    const camPos = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    let facing = Math.PI / 2;
    const animRig = (r: CharacterRig, grounded: boolean, moving: boolean, t: number, free: boolean) => {
      if (s.stunT > 0 && r === rig) {
        r.group.rotation.y += 0.12; r.head.rotation.z = Math.sin(t * 9) * 0.25; r.body.position.y = -0.08;
        r.legL.rotation.x = 0.2; r.legR.rotation.x = -0.2; return;
      }
      if (!grounded) {
        r.legL.rotation.x = -0.65; r.legR.rotation.x = 0.35; r.armR.rotation.x = -2.4;
        if (free) r.armL.rotation.x = -2.4;
        r.head.rotation.x = -0.12;
      } else if (moving) {
        const sw = Math.sin(t * 13);
        r.legL.rotation.x = sw * 0.85; r.legR.rotation.x = -sw * 0.85; r.armR.rotation.x = sw * 0.6;
        if (free) r.armL.rotation.x = -sw * 0.6;
        r.body.position.y = Math.abs(Math.cos(t * 13)) * 0.05; r.head.rotation.x = 0.05;
      } else {
        r.legL.rotation.x = 0; r.legR.rotation.x = 0; r.armR.rotation.x = Math.sin(t * 2.2) * 0.07;
        if (free) r.armL.rotation.x = -Math.sin(t * 2.2) * 0.07;
        r.body.position.y = Math.sin(t * 3) * 0.02; r.head.rotation.x = Math.sin(t * 1.4) * 0.04;
      }
    };

    const draw = (dt: number, alpha: number) => {
      const p = s.p;
      const px = s.pp.x + (p.x - s.pp.x) * alpha, py = s.pp.y + (p.y - s.pp.y) * alpha, pz = s.pp.z + (p.z - s.pp.z) * alpha;
      const t = s.t;
      const moving = Math.hypot(p.vx, p.vz) > 0.4;
      if (moving) facing = Math.atan2(p.vx, p.vz);
      const turn = (g: THREE.Object3D, k: number) => {
        let da = facing - g.rotation.y;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        g.rotation.y += da * k;
      };
      rig.group.position.set(px, py - PLAYER.hh, pz);
      playerLabel.position.set(px, py + 1.25, pz);
      if (s.panda) {
        pandaRig.group.position.set(px, py - PLAYER.hh + 0.1, pz);
        if (!s.isDead) { pandaRig.group.visible = true; rig.group.visible = false; }
        turn(pandaRig.group, 0.18);
        pandaRig.group.rotation.x = THREE.MathUtils.clamp(-p.vy * 0.045, -0.35, 0.3);
        pandaRig.body.position.y = Math.sin(t * 3.2) * 0.06;
        pandaRig.head.rotation.z = Math.sin(t * 2.1) * 0.05;
      } else if (s.yua) {
        yuaRig.group.position.set(px, py - PLAYER.hh, pz);
        if (!s.isDead) { yuaRig.group.visible = s.invulnT > 0 ? Math.sin(t * 30) > -0.3 : true; rig.group.visible = false; }
        turn(yuaRig.group, 0.18);
        animRig(yuaRig, p.grounded, moving, t, true);
      } else if (s.invulnT > 0) rig.group.visible = Math.sin(t * 30) > -0.3;
      else if (!s.isDead) rig.group.visible = true;
      turn(rig.group, 0.22);
      animRig(rig, p.grounded, moving, t, skin !== 'skin1' && skin !== 'skin2');

      for (const m of movers) m.group.position.set(m.prev.x + (m.x - m.prev.x) * alpha, m.prev.y + (m.y - m.prev.y) * alpha, m.prev.z + (m.z - m.prev.z) * alpha);
      for (const r of ents) r.animate?.(t, dt);
      stepNovus(dt);
      clouds.forEach((c, i) => { c.position.x += 0.3 * dt * ((i % 3) + 1); if (c.position.x > maxX + 30) c.position.x = minX - 20; });
      farIsles.forEach((f, i) => { f.position.y += Math.sin(t * 0.4 + i) * 0.002; });
      animDio.forEach(u => u(t));
      birds.update(t, cx, minY + 16, cz, Math.max(maxX - minX, maxZ - minZ) * 0.45);
      blueRings.forEach((b, i) => { b.rotation.y = t * 0.3 * (i % 2 ? 1 : -1); });
      if (cacheMarker.visible) { holoCore.rotation.y += dt * 2.5; holoCore.position.y = 1.0 + Math.sin(t * 2.5) * 0.1; }
      if (skyCrack) skyCrack.scale.setScalar(1 + Math.sin(t * 0.9) * 0.02);
      particles.update(dt);

      // 线框层切换动画
      wireK += (wireTarget - wireK) * Math.min(1, dt * 7);
      sky.uniforms.wire.value = wireK;
      sky.uniforms.time.value = t;

      // 相机
      const cy = s.cam;
      camPos.set(px + Math.sin(cy.yaw) * Math.cos(cy.pitch) * cy.dist, py + Math.sin(cy.pitch) * cy.dist + 0.6, pz + Math.cos(cy.yaw) * Math.cos(cy.pitch) * cy.dist);
      lookAt.set(px, py + 0.7, pz);
      if (s.finishing >= 0) {
        s.finishing += dt;
        if (level.id === 5 && goalEnt) {
          // 终章：侧面拉远，看着两个人和那道裂缝
          const k = Math.min(1, s.finishing / 2.2);
          const e = k * k * (3 - 2 * k);
          camPos.lerp(new THREE.Vector3(goalEnt.x - 6, goalEnt.y + 2.2, goalEnt.z + 9), e);
          lookAt.lerp(new THREE.Vector3(goalEnt.x - 0.5, goalEnt.y + 0.6, goalEnt.z), e);
          if (vignette) vignette.uniforms.flash.value = Math.max(0, (s.finishing - 2.0) / 1.0);
        } else {
          camPos.y += Math.min(1.5, s.finishing * 1.5);
        }
      }
      if (!reduce && s.dizzy > 35) {
        const k = (s.dizzy - 35) / 65;
        camPos.x += Math.sin(t * 1.7) * 0.5 * k; camPos.y += Math.sin(t * 2.3) * 0.3 * k;
      }
      if (s.shakeT > 0) { const k2 = s.shakeT / 0.55; camPos.x += (Math.random() - 0.5) * 0.35 * k2; camPos.y += (Math.random() - 0.5) * 0.28 * k2; }
      if (s.intro < 1) {
        // 开场镜头：从高空掠到身后
        s.intro = Math.min(1, s.intro + dt / 2.6);
        const k = s.intro, e = 1 - Math.pow(1 - k, 3);
        const from = introFrom.clone();
        from.x += Math.sin(k * 1.4) * 4;
        camera.position.copy(from.lerp(camPos, e));
        const look = introLook.clone().lerp(lookAt, e);
        camera.lookAt(look);
      } else if (import.meta.env.DEV && (window as any).__free) {
        const f = (window as any).__free;
        camera.position.set(f[0], f[1], f[2]); camera.lookAt(f[3], f[4], f[5]);
      } else {
        camera.position.lerp(camPos, 0.14);
        camera.lookAt(lookAt);
      }
      if (!reduce && s.dizzy > 35) camera.rotation.z += Math.sin(t * 2.6) * 0.075 * ((s.dizzy - 35) / 65);

      // 室友姐挡在镜头和你之间时变成半透明，不挡视线
      if (novus && novusMats.length) {
        const cp = camera.position;
        const vx = s.p.x - cp.x, vy = s.p.y - cp.y, vz = s.p.z - cp.z;
        const qx = nv.x - cp.x, qy = nv.y + 0.6 - cp.y, qz = nv.z - cp.z;
        const L2 = vx * vx + vy * vy + vz * vz;
        const k = L2 > 0 ? (qx * vx + qy * vy + qz * vz) / L2 : 0;
        const block = k > 0 && k < 1.05 && Math.hypot(qx - vx * k, qy - vy * k, qz - vz * k) < 1.35 || (k > 0 && k < 1 && Math.hypot(qx, qy, qz) < 4.5);
        novusFade += ((block ? 0.38 : 1) - novusFade) * Math.min(1, dt * 10);
        const tr = novusFade < 0.98;
        for (const m of novusMats) {
          if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
          m.opacity = novusFade; m.depthWrite = novusFade > 0.6;
        }
      }

      sun.position.set(px + 10, py + 18, pz + 8);
      sun.target.position.set(px, py, pz);
      sky.mesh.position.copy(camera.position);
      if (vignette) {
        vignette.uniforms.dizzy.value = dizzyEnabled && !s.panda ? Math.max(0, (s.dizzy - 40) / 60) : 0;
        vignette.uniforms.wire.value = wireK;
      }

      // 交互提示
      let pr = '';
      if (!s.isDead && s.finishing < 0) {
        if (ents.some(r => r.ent.type === 'CHECKPOINT' && r.group.visible && Math.hypot(r.x - p.x, r.z - p.z) < 2.0 && Math.abs(r.y - p.y) < 1.5)) pr = s.yua ? 'F 摸摸企鹅' : 'F 摸摸熊猫';
      }
      if (pr !== promptCache) { promptCache = pr; setPrompt(pr); }

      // 远处的提示牌淡出，避免挤在一起
      for (const r of ents) {
        if (!r.label || !r.label.visible) continue;
        const d = Math.hypot(r.x - px, r.y - py, r.z - pz);
        const far = r.ent.type === 'TEXT' ? 15 : 24;
        (r.label.element as HTMLElement).style.opacity = String(Math.max(0, Math.min(1, (far - d) / 5)));
      }
      if (composer) composer.render(); else renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    let promptCache = '';

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      const frozen = pausedRef.current || menuRef.current;
      if (!frozen) {
        acc += dt;
        while (acc >= STEP) { acc -= STEP; stepLogic(); }
      } else {
        acc = 0;
        s.keys.f = s.keys.b = s.keys.l = s.keys.r = s.keys.up = s.keys.down = false;
      }
      draw(frozen ? 0 : dt, frozen ? 1 : acc / STEP);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      leaveUauaPresence('unmount');   // 切关 / 重开 / 回菜单：悠亚一定离场
      if (respawnTimer !== undefined) clearTimeout(respawnTimer);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', onPD);
      canvas.removeEventListener('pointermove', onPM);
      canvas.removeEventListener('pointerup', onPU);
      canvas.removeEventListener('pointercancel', onPU);
      canvas.removeEventListener('wheel', onWheel);
      labelRef.current && (labelRef.current.innerHTML = '');
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(mm => mm.dispose()); else m?.dispose();
      });
      composer?.dispose();
      novusMats.forEach(m => m.dispose());
      score.setLayer('real');
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, skin, cleared, restartKey]);

  const pages = items.filter(i => i.startsWith('page')).length;
  const candies = items.filter(i => !i.startsWith('page')).length;
  const totalPages = level.entities.filter(e => e.type === 'PAGE').length;
  const totalCandies = level.entities.filter(e => e.type === 'SHARD').length;
  const wire = layer === Layer.MANGA;
  const num = level.name.split('：')[0];
  const nm = level.name.split('：')[1] ?? level.name;
  const ability =
    yuaMode ? '⟡ 悠亚 · 所有次元' : pandaMode ? '✨ 魔法熊猫' :
      skin === 'skin1' ? '☁ 安心毛绒' : skin === 'skin2' ? (cacheUsed ? '⚡ 缓存锚点（已用）' : '⚡ 缓存锚点 · E') :
        skin === 'skin3' ? '★ 二段跳' : skin === 'skin4' ? (shieldUsed ? '✕ 创可贴（已用）' : '✚ 创可贴') : '∞ 次元之外';
  const dizzyOn = skin !== 'skinNovus' && !pandaMode;
  const hints = getSave().settings.hints;

  return (
    <div ref={wrapRef} className="fixed inset-0 overflow-hidden select-none" style={{ background: wire ? '#0b0d14' : '#dcecff' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing" />
      <div ref={labelRef} className="absolute inset-0 pointer-events-none" />

      {/* HUD 左上 */}
      <div className="absolute top-3 left-3 flex flex-wrap items-start gap-2 pointer-events-none z-10">
        <div className={`px-3 py-1 text-sm font-display border-2 ${wire ? 'bg-black text-white border-white font-mono' : 'bg-white text-sakura border-[#9d174d]'}`}
             style={{ boxShadow: `3px 3px 0 0 ${wire ? '#fff' : '#9d174d'}` }}>
          {yuaMode ? '重叠' : wire ? 'WIRE' : '现实'}
        </div>
        {dizzyOn && (
          <div className={`px-3 py-1.5 border-2 ${wire ? 'bg-black/80 border-white/60 text-white' : 'bg-white/90 border-[#7c3aed] text-[#6d28d9]'}`}
               title="切换次元和从高处落下会晕，吃薄荷糖缓解，晕满会当场倒下">
            <div className="text-[10px] font-bold leading-none mb-1">晕3D {stunned ? '· 晕倒了' : dizzy >= 80 ? '· 呜…' : ''}</div>
            <div className={`w-28 h-2 border ${wire ? 'border-white/60' : 'border-[#7c3aed]/50 bg-violet-50'}`}>
              <div className={`h-full transition-[width] duration-200 ${dizzy >= 80 || stunned ? 'bg-violet-600 animate-pulse' : 'bg-violet-400'}`} style={{ width: `${dizzy}%` }} />
            </div>
          </div>
        )}
        <div className={`px-3 py-1.5 text-xs font-bold border-2 ${wire ? 'bg-black/80 border-white/60 text-white' : 'bg-white/90 border-emerald-400 text-emerald-700'}`}>{ability}</div>
      </div>

      {/* HUD 右上 */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {totalPages > 0 && (
          <div className={`px-2.5 py-1 text-xs font-bold border-2 flex items-center gap-1 ${wire ? 'bg-black border-white/60 text-white' : 'bg-white border-sakura text-sakura'}`}><BookOpen size={14} />{pages}/{totalPages}</div>
        )}
        <div className={`px-2.5 py-1 text-xs font-bold border-2 flex items-center gap-1 ${wire ? 'bg-black border-white/60 text-white' : 'bg-white border-emerald-400 text-emerald-600'}`} title="小室牌薄荷糖：缓解眩晕"><Candy size={14} />{candies}/{totalCandies}</div>
        <button onClick={(e) => { e.currentTarget.blur(); openWalkman(); }} onPointerDown={e => e.stopPropagation()} className="btn w-9 h-9" aria-label="随身听（M）" title="随身听（M）"><Headphones size={16} /></button>
        <button onClick={() => setMenu(true)} className="btn w-9 h-9" aria-label="暂停"><Pause size={16} /></button>
      </div>

      {/* 标题卡 */}
      {titleCard && (
        <div className="absolute inset-x-0 top-[16%] flex justify-center pointer-events-none z-10">
          <div className="text-center anim-pop">
            <div className="inline-block bg-sakura text-white font-display text-lg px-4 py-0.5 -rotate-2 border-2 border-[#9d174d]">{num}</div>
            <div className="font-display text-4xl md:text-6xl text-[#7c3aed] mt-2" style={{ WebkitTextStroke: '7px white', paintOrder: 'stroke fill', filter: 'drop-shadow(0 4px 12px rgba(124,58,237,.3))' }}>{nm}</div>
            <div className="mt-2 inline-block bg-white/90 px-3 py-0.5 text-sm text-[#6d28d9] border-2 border-[#c4b5fd]">{level.subtitle}</div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`absolute top-[26%] left-1/2 -translate-x-1/2 z-20 px-5 py-2 text-sm md:text-base font-bold border-2 pointer-events-none whitespace-nowrap anim-up ${wire ? 'bg-black text-white border-white' : 'bg-white/95 text-[#6d28d9] border-[#c4b5fd]'}`}>{toast}</div>
      )}
      {stunned && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-[#6d28d9] font-display text-3xl bg-white/90 border-2 border-violet-400 px-6 py-2 pointer-events-none animate-pulse">@_@ 转晕了……</div>
      )}
      {prompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-white border-2 border-ink text-ink text-sm font-bold pointer-events-none">{prompt}</div>
      )}

      {/* 咏唱 */}
      {hasFlag('yua') && (
        <button onClick={(e) => { e.currentTarget.blur(); toggleYuaRef.current(); }} onPointerDown={e => e.stopPropagation()}
          className={`absolute right-24 bottom-12 z-20 text-xs font-bold px-3 py-1.5 border-2 ${yuaMode ? 'bg-pink-100 border-pink-400 text-pink-600' : 'bg-white/85 border-[#c4b5fd] text-[#7c3aed] hover:border-pink-400'}`}
          title="悠亚（Y）">⟡ 悠亚 · Y</button>
      )}
      <button onClick={chant.toggle}
        className={`absolute right-3 bottom-12 z-20 text-xs font-bold px-3 py-1.5 border-2 flex items-center gap-1 ${chant.on ? 'bg-pink-100 border-pink-400 text-pink-600 animate-pulse' : 'bg-white/85 border-[#c4b5fd] text-[#7c3aed] hover:border-pink-400'}`}
        title={chant.on ? '正在聆听…（点击关闭）' : '开启麦克风'}>
        <Mic size={13} />{chant.on ? `聆听中${chant.count > 0 ? ` ${chant.count}/3` : '…'}` : '语音'}
      </button>
      {chant.on && chant.heard && (
        <div className="absolute right-3 bottom-[8.5rem] z-20 max-w-[280px] pointer-events-none text-[11px] text-[#6d28d9] bg-white/90 border-2 border-[#c4b5fd] px-2.5 py-1.5">听到：「{chant.heard}」</div>
      )}
      {chant.on && (
        <div className="absolute right-3 bottom-[5.3rem] z-20 w-[240px] pointer-events-none bg-white/95 border-2 border-[#c4b5fd] px-3 py-2 flex items-start gap-2">
          <span className="text-2xl leading-none">🐧</span>
          <span className="text-[11px] leading-relaxed text-[#6d28d9] font-bold">大喊三声<br />「我要和<span className="inline-block w-10 border-b-2 border-[#a78bfa] mx-0.5" />结婚！」<br />她就会穿越次元，降临这个世界！</span>
        </div>
      )}

      {hints && (
        <div className={`absolute bottom-3 left-3 text-[11px] px-2 py-1 z-10 pointer-events-none ${wire ? 'text-white/60 bg-black/50' : 'text-[#6d28d9] bg-white/70'}`}>
          WASD 移动 · 空格 跳 · {yuaMode ? 'F 摸企鹅 ·' : 'Q 切换线框层 · R 和小室说话 · F 摸熊猫 ·'}{skin === 'skin2' ? ' E 缓存锚点 ·' : ''} 拖动鼠标转视角 · 滚轮缩放 · M 随身听 · Esc 暂停
        </div>
      )}

      {flash && <div className="absolute inset-0 z-40 bg-white anim-fade" />}

      {menu && (
        <PauseMenu chapterLabel="第二章 · 多边形的世界" title={level.name}
          stats={<span>纸页 {pages}/{totalPages} · 薄荷糖 {candies}/{totalCandies}</span>}
          onResume={() => setMenu(false)}
          onRestart={() => { setMenu(false); setRestartKey(k => k + 1); }}
          onExit={() => { setMenu(false); onExit(); }}
          onSkip={cleared ? () => { setMenu(false); skipRef.current(); } : undefined} />
      )}
    </div>
  );
};

export default GameEngine3D;
