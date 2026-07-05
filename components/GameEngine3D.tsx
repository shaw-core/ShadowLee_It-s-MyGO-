import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Layer, LevelResult } from '../types';
import { Level3D, Entity3D } from '../game3d/levels3d';
import { SkinId, buildCharacter } from '../game3d/characters3d';
import { BookOpen, Candy, RotateCcw, Home, FastForward, Flag } from 'lucide-react';

interface GameEngineProps {
  levelConfig: Level3D;
  skin: SkinId;
  onFinishLevel: (result: LevelResult) => void;
  onExit: () => void;
  isGameCleared: boolean;
}

// ============ 常量 ============
const CANVAS_W = 1000;
const CANVAS_H = 600;
const STEP = 1 / 60;                 // 固定逻辑步长（秒）
const MAX_DELTA = 0.1;

// 手感参数（单位：米、秒）
const MOVE_SPEED = 5.2;
const ACCEL = 40;
const FRICTION = 30;
const JUMP_V = 9.0;
const GRAVITY = 22;
const COYOTE_TIME = 0.1;             // 离开平台后仍可起跳的宽限
const JUMP_BUFFER = 0.12;            // 提前按跳的缓冲
const LAYER_COOLDOWN = 400;
const KILL_Y = -8;

const PLAYER = { hw: 0.32, hh: 0.55, hd: 0.32 };

const REAL_SKY = 0xaed6ff;
const REAL_FOG = 0xcfe8ff;
const PALETTE = [0x8fc7f2, 0x9be3b0, 0xffd97a, 0xf3b0e0, 0x9ad6e8, 0xc4b5fd];

interface AABB { x: number; y: number; z: number; hw: number; hh: number; hd: number }

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// 提示文字 Sprite
const makeTextSprite = (text: string, color = '#1e3a8a'): THREE.Sprite => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.font = 'bold 52px "Noto Sans SC", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 10; g.lineJoin = 'round';
  g.strokeText(text, 512, 66);
  g.fillStyle = color;
  g.fillText(text, 512, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(9, 1.125, 1);
  return sp;
};

// ============ 简易粒子系统 ============
class Particles {
  points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private vel: THREE.Vector3[];
  private life: Float32Array;
  private n: number;
  private cursor = 0;

  constructor(n = 220) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.vel = Array.from({ length: n }, () => new THREE.Vector3());
    this.life = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, depthWrite: false });
    this.points = new THREE.Points(geo, m);
    this.points.frustumCulled = false;
  }

  burst(p: THREE.Vector3, color: number, count: number, speed = 3, up = 2) {
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.vel[i].set(Math.cos(a) * r, Math.random() * up + 0.5, Math.sin(a) * r);
      this.life[i] = 0.6 + Math.random() * 0.3;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i].y -= 9 * dt;
      this.pos[i * 3] += this.vel[i].x * dt;
      this.pos[i * 3 + 1] += this.vel[i].y * dt;
      this.pos[i * 3 + 2] += this.vel[i].z * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// 运行时实体
interface RtEnt extends AABB {
  ent: Entity3D;
  group: THREE.Group;
  base: THREE.Vector3;        // MOVER 起点
  prev: THREE.Vector3;        // 上一步位置（算平台位移）
  applyLayer: (layer: Layer, active: boolean) => void;
  animate?: (t: number) => void;
  activated?: boolean;        // CHECKPOINT 用
}

const GameEngine3D: React.FC<GameEngineProps> = ({ levelConfig, skin, onFinishLevel, onExit, isGameCleared }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLayer, setCurrentLayer] = useState<Layer>(Layer.REAL);
  const [canSwitch, setCanSwitch] = useState(true);
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());
  const [checkpointHit, setCheckpointHit] = useState(false);
  const [dizzyLevel, setDizzyLevel] = useState(0);
  const [showTitle, setShowTitle] = useState(true);

  const stateRef = useRef({
    p: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: false, groundEnt: null as RtEnt | null },
    keys: { f: false, b: false, l: false, r: false },
    jumpBufferT: 0,
    coyoteT: 0,
    cam: { yaw: -Math.PI / 2, pitch: 0.42, dist: 9 },
    collected: new Set<string>(),
    isDead: false,
    dizzy: 0,
    lastSwitch: 0,
    t: 0,
    deaths: 0,
    startTime: Date.now(),
    spawn: { x: 0, y: 0, z: 0 },
  });

  const layerRef = useRef<Layer>(Layer.REAL);
  const applyLayerRef = useRef<(l: Layer) => void>(() => {});
  const onFinishRef = useRef(onFinishLevel);
  const onExitRef = useRef(onExit);
  useEffect(() => { onFinishRef.current = onFinishLevel; }, [onFinishLevel]);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  // 关卡标题横幅
  useEffect(() => {
    setShowTitle(true);
    const t = setTimeout(() => setShowTitle(false), 2600);
    return () => clearTimeout(t);
  }, [levelConfig]);

  const resetLevel = useCallback(() => {
    const s = stateRef.current;
    s.spawn = { ...levelConfig.spawn };
    s.p.x = s.spawn.x; s.p.y = s.spawn.y; s.p.z = s.spawn.z;
    s.p.vx = 0; s.p.vy = 0; s.p.vz = 0;
    s.collected.clear();
    s.isDead = false;
    s.dizzy = 0;
    s.t = 0; s.deaths = 0;
    s.startTime = Date.now();
    layerRef.current = Layer.REAL;
    setCollectedItems(new Set());
    setDizzyLevel(0);
    setCheckpointHit(false);
    setCurrentLayer(Layer.REAL);
    applyLayerRef.current(Layer.REAL);
  }, [levelConfig]);

  const handleLayerSwitch = useCallback(() => {
    const now = Date.now();
    const s = stateRef.current;
    if (now - s.lastSwitch > LAYER_COOLDOWN) {
      s.lastSwitch = now;
      s.dizzy = Math.min(100, s.dizzy + 16);
      const next = layerRef.current === Layer.REAL ? Layer.MANGA : Layer.REAL;
      layerRef.current = next;
      setCurrentLayer(next);
      applyLayerRef.current(next);
      setCanSwitch(false);
      setTimeout(() => setCanSwitch(true), LAYER_COOLDOWN);
    }
  }, []);

  // ---- 键盘 ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = stateRef.current;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': e.preventDefault(); s.keys.f = true; break;
        case 'KeyS': case 'ArrowDown': e.preventDefault(); s.keys.b = true; break;
        case 'KeyA': case 'ArrowLeft': e.preventDefault(); s.keys.l = true; break;
        case 'KeyD': case 'ArrowRight': e.preventDefault(); s.keys.r = true; break;
        case 'Space': e.preventDefault(); s.jumpBufferT = JUMP_BUFFER; break;
        case 'KeyQ': if (!s.isDead) handleLayerSwitch(); break;
        case 'Escape': onExitRef.current(); break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': k.f = false; break;
        case 'KeyS': case 'ArrowDown': k.b = false; break;
        case 'KeyA': case 'ArrowLeft': k.l = false; break;
        case 'KeyD': case 'ArrowRight': k.r = false; break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [handleLayerSwitch]);

  const handleSkipLevel = () => {
    const done = new Set(stateRef.current.collected);
    levelConfig.entities.forEach(e => {
      if (e.type === 'PAGE' || e.type === 'SHARD') done.add(e.id);
    });
    onFinishLevel({
      levelId: levelConfig.id, timeTaken: 0, deathCount: 0,
      collectedIds: Array.from(done),
    });
  };

  // ============ 场景 + 主循环 ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(CANVAS_W, CANVAS_H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(REAL_SKY);
    scene.fog = new THREE.Fog(REAL_FOG, 30, 90);

    const camera = new THREE.PerspectiveCamera(55, CANVAS_W / CANVAS_H, 0.1, 300);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd8c0, 0.85);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d9, 1.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);

    // ---- 构建实体 ----
    const ents: RtEnt[] = [];
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.22 });
    const mangaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });

    const push = (e: Entity3D, group: THREE.Group, size: { hw: number; hh: number; hd: number },
                  applyLayer: RtEnt['applyLayer'], animate?: RtEnt['animate']) => {
      group.position.set(e.x, e.y, e.z);
      scene.add(group);
      ents.push({
        ent: e, group,
        x: e.x, y: e.y, z: e.z, ...size,
        base: new THREE.Vector3(e.x, e.y, e.z),
        prev: new THREE.Vector3(e.x, e.y, e.z),
        applyLayer, animate,
      });
    };

    for (const e of levelConfig.entities) {
      const g = new THREE.Group();

      if (e.type === 'PLATFORM' || e.type === 'MOVER') {
        const w = e.w ?? 2, h = e.h ?? 0.6, d = e.d ?? 2;
        const color = e.color ?? PALETTE[hashStr(e.id) % PALETTE.length];
        const realMat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, realMat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        // 顶面草皮/亮边
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.35 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), topMat);
        top.position.y = h / 2 + 0.031;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000 }));
        edges.visible = false;
        const ghost = new THREE.Mesh(geo, ghostMat);
        ghost.visible = false;
        g.add(mesh, top, edges, ghost);
        const isMover = e.type === 'MOVER';
        push(e, g, { hw: w / 2, hh: h / 2, hd: d / 2 }, (layer, active) => {
          mesh.visible = active; top.visible = active && layer === Layer.REAL;
          ghost.visible = !active;
          edges.visible = active && layer === Layer.MANGA;
          mesh.material = layer === Layer.MANGA ? mangaMat : realMat;
        }, isMover ? undefined : undefined);
      } else if (e.type === 'HAZARD') {
        const w = e.w ?? 2, h = e.h ?? 0.7, d = e.d ?? 2;
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xf87171, flatShading: true, roughness: 0.8 });
        const spikeGeo = new THREE.ConeGeometry(0.2, h, 4);
        for (let sx = -w / 2 + 0.25; sx < w / 2; sx += 0.55) {
          for (let sz = -d / 2 + 0.25; sz < d / 2; sz += 0.55) {
            const sp = new THREE.Mesh(spikeGeo, spikeMat);
            sp.position.set(sx, 0, sz);
            sp.castShadow = true;
            g.add(sp);
          }
        }
        push(e, g, { hw: w / 2 - 0.1, hh: h / 2 - 0.08, hd: d / 2 - 0.1 },
          (_l, active) => { g.visible = active; });
      } else if (e.type === 'PAGE') {
        const page = new THREE.Group();
        const cover = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0x9d174d, emissiveIntensity: 0.35, flatShading: true }));
        const inner = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
        cover.castShadow = true;
        page.add(cover, inner);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 20),
          new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.7 }));
        halo.rotation.x = Math.PI / 2;
        g.add(page, halo);
        push(e, g, { hw: 0.55, hh: 0.65, hd: 0.55 },
          (_l, active) => { g.visible = active && !stateRef.current.collected.has(e.id); },
          (t) => { page.rotation.y = t * 1.6; page.position.y = Math.sin(t * 2.4) * 0.12; halo.position.y = -0.5 + Math.sin(t * 2.4) * 0.05; });
      } else if (e.type === 'SHARD') {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
          new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x047857, emissiveIntensity: 0.5, flatShading: true }));
        shard.castShadow = true;
        g.add(shard);
        push(e, g, { hw: 0.5, hh: 0.55, hd: 0.5 },
          (_l, active) => { g.visible = active && !stateRef.current.collected.has(e.id); },
          (t) => { shard.rotation.y = t * 2; shard.position.y = Math.sin(t * 2.4 + e.x) * 0.12; });
      } else if (e.type === 'CHECKPOINT') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true }));
        pole.position.y = 0.2;
        const flagMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, flatShading: true, side: THREE.DoubleSide });
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.03), flagMat);
        flag.position.set(0.32, 0.72, 0);
        pole.castShadow = true; flag.castShadow = true;
        g.add(pole, flag);
        const rt: RtEnt = {
          ent: e, group: g,
          x: e.x, y: e.y, z: e.z, hw: 0.8, hh: 1.0, hd: 0.8,
          base: new THREE.Vector3(e.x, e.y, e.z), prev: new THREE.Vector3(e.x, e.y, e.z),
          applyLayer: (_l, active) => { g.visible = active; },
          animate: (t) => { flag.rotation.y = Math.sin(t * 3) * 0.15; },
        };
        g.position.set(e.x, e.y, e.z);
        scene.add(g);
        ents.push(rt);
        (rt as any).setActivated = () => { flagMat.color.setHex(0xf472b6); };
      } else if (e.type === 'GOAL') {
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.13, 6, 18),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.5, flatShading: true }));
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 6, 16),
          new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xd97706, emissiveIntensity: 0.5, flatShading: true }));
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20),
          new THREE.MeshBasicMaterial({ color: 0xfff7e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
        ring1.castShadow = true;
        g.add(ring1, ring2, disc);
        push(e, g, { hw: 1.1, hh: 1.1, hd: 0.9 },
          (_l, active) => { g.visible = active; },
          (t) => {
            ring1.rotation.y = t * 0.8; ring2.rotation.y = -t * 1.3;
            const s = 1 + Math.sin(t * 2.2) * 0.04;
            g.scale.set(s, s, s);
          });
      } else if (e.type === 'TEXT') {
        const sp = makeTextSprite(e.text || '');
        g.add(sp);
        push(e, g, { hw: 0, hh: 0, hd: 0 },
          (_l, active) => { g.visible = active; },
          (t) => { g.position.y = e.y + Math.sin(t * 1.2 + e.x) * 0.12; });
      }
    }

    // ---- 装饰：远景浮岛 + 云 ----
    const rng = (seed: number) => { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; };
    const rand = rng(levelConfig.id * 131 + 7);
    const maxX = Math.max(...levelConfig.entities.map(e => e.x)) + 10;
    const minZ = Math.min(...levelConfig.entities.map(e => e.z)) - 6;
    const decoMats: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.MeshStandardMaterial({ color: 0x86b7a2, flatShading: true, roughness: 1 });
      decoMats.push(m);
      const isle = new THREE.Mesh(new THREE.ConeGeometry(1.4 + rand() * 1.8, 2 + rand() * 2, 5), m);
      isle.rotation.x = Math.PI;
      isle.position.set(rand() * maxX - 4, -3 - rand() * 3, minZ - 8 - rand() * 14);
      scene.add(isle);
    }
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + rand() * 1.6, 0), cloudMat);
      c.position.set(rand() * maxX - 4, 7 + rand() * 8, minZ - 6 - rand() * 16);
      c.scale.y = 0.45;
      scene.add(c);
      clouds.push(c);
    }

    const particles = new Particles();
    scene.add(particles.points);

    // ---- 图层切换 ----
    const isActive = (e: Entity3D, layer: Layer) => e.layerMask === 'BOTH' || e.layerMask === layer;
    const applyLayer = (layer: Layer) => {
      for (const r of ents) r.applyLayer(layer, isActive(r.ent, layer));
      const sky = layer === Layer.REAL ? REAL_SKY : 0xffffff;
      (scene.background as THREE.Color).setHex(sky);
      scene.fog!.color.setHex(layer === Layer.REAL ? REAL_FOG : 0xffffff);
      hemi.intensity = layer === Layer.REAL ? 0.85 : 1.35;
      sun.intensity = layer === Layer.REAL ? 1.7 : 0.9;
      cloudMat.color.setHex(layer === Layer.REAL ? 0xffffff : 0xf1f1f1);
      decoMats.forEach(m => m.color.setHex(layer === Layer.REAL ? 0x86b7a2 : 0xdddddd));
      // 切换脉冲
      particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), layer === Layer.REAL ? 0x60a5fa : 0x111111, 24, 2.5, 2.5);
    };
    applyLayerRef.current = applyLayer;

    // ---- 玩家 ----
    const rig = buildCharacter(skin);
    scene.add(rig.group);

    // ---- 室友姐 NPC：先走一步，在终点门旁等你（她不受次元影响，始终是彩色的） ----
    const goalEnt = levelConfig.entities.find(en => en.type === 'GOAL');
    let novus: ReturnType<typeof buildCharacter> | null = null;
    let novusHeartT = 0;
    if (goalEnt && skin !== 'skinNovus') {
      novus = buildCharacter('skinNovus');
      novus.group.position.set(goalEnt.x, goalEnt.y - 1.3, goalEnt.z + 1.6);
      scene.add(novus.group);
    }

    const s = stateRef.current;
    s.spawn = { ...levelConfig.spawn };
    s.p.x = s.spawn.x; s.p.y = s.spawn.y; s.p.z = s.spawn.z;
    s.p.vx = 0; s.p.vy = 0; s.p.vz = 0;
    s.collected.clear();
    s.isDead = false;
    s.dizzy = 0;
    s.t = 0; s.deaths = 0;
    s.startTime = Date.now();
    layerRef.current = Layer.REAL;
    applyLayer(Layer.REAL);

    // 物理分层列表
    const listsFor = (layer: Layer) => {
      const act = ents.filter(r => isActive(r.ent, layer));
      return {
        solids: act.filter(r => r.ent.type === 'PLATFORM' || r.ent.type === 'MOVER'),
        hazards: act.filter(r => r.ent.type === 'HAZARD'),
        pickups: act.filter(r => r.ent.type === 'PAGE' || r.ent.type === 'SHARD'),
        goals: act.filter(r => r.ent.type === 'GOAL'),
        checkpoints: act.filter(r => r.ent.type === 'CHECKPOINT'),
      };
    };
    const physics = { [Layer.REAL]: listsFor(Layer.REAL), [Layer.MANGA]: listsFor(Layer.MANGA) };
    const movers = ents.filter(r => r.ent.type === 'MOVER');

    // ---- 相机操控（拖动环绕 / 滚轮缩放） ----
    let dragging = false;
    let lastPX = 0, lastPY = 0;
    const onPointerDown = (e: PointerEvent) => { dragging = true; lastPX = e.clientX; lastPY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      s.cam.yaw -= (e.clientX - lastPX) * 0.006;
      s.cam.pitch = Math.min(1.25, Math.max(0.12, s.cam.pitch + (e.clientY - lastPY) * 0.004));
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch {} };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.cam.dist = Math.min(15, Math.max(5, s.cam.dist + e.deltaY * 0.008));
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    let finished = false;
    let respawnTimer: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    let acc = 0;
    let facing = Math.PI / 2;
    let wasGrounded = false;

    const playerBox = (): AABB => ({ x: s.p.x, y: s.p.y, z: s.p.z, ...PLAYER });

    const overlap = (a: AABB, b: AABB) =>
      Math.abs(a.x - b.x) < a.hw + b.hw &&
      Math.abs(a.y - b.y) < a.hh + b.hh &&
      Math.abs(a.z - b.z) < a.hd + b.hd;

    const respawn = () => {
      if (s.isDead) return;
      s.isDead = true;
      s.deaths += 1;
      particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), 0xf87171, 30, 3.5, 3);
      rig.group.visible = false;
      respawnTimer = setTimeout(() => {
        s.p.x = s.spawn.x; s.p.y = s.spawn.y; s.p.z = s.spawn.z;
        s.p.vx = 0; s.p.vy = 0; s.p.vz = 0;
        s.keys.f = s.keys.b = s.keys.l = s.keys.r = false;
        s.isDead = false;
        rig.group.visible = true;
        particles.burst(new THREE.Vector3(s.p.x, s.p.y, s.p.z), 0x93c5fd, 20, 2, 2.5);
      }, 350);
    };

    // ---- 单步物理：逐轴解析 + "本轴原先在外侧"判定 ----
    // 只有当玩家在本轴上原本位于实体外侧时才在本轴解析（重叠确实由本轴运动造成），
    // 否则交给其他轴处理。这同时修复了静止瞬移和跳上移动平台被侧推的问题。
    const resolveAxis = (axis: 'x' | 'y' | 'z', prevVal: number, solids: RtEnt[]) => {
      const half = axis === 'x' ? 'hw' : axis === 'y' ? 'hh' : 'hd';
      let landed: RtEnt | null = null;
      for (const e of solids) {
        if (!overlap(playerBox(), e)) continue;
        const sum = (PLAYER as any)[half] + (e as any)[half];
        const prevDelta = prevVal - e[axis];
        if (Math.abs(prevDelta) < sum - 1e-4) continue; // 本轴原本就重叠 → 不是本轴造成的
        const dir = prevDelta >= 0 ? 1 : -1;
        s.p[axis] = e[axis] + sum * dir;
        const v = axis === 'x' ? 'vx' : axis === 'y' ? 'vy' : 'vz';
        // 只在速度朝向实体时清零，避免离开时被"粘住"
        if ((s.p as any)[v] * dir < 0) (s.p as any)[v] = 0;
        if (axis === 'y' && dir > 0) landed = e;
      }
      return landed;
    };

    const stepLogic = (): boolean => {
      s.t += STEP;
      const p = s.p;

      // 移动平台先走一步
      for (const m of movers) {
        m.prev.set(m.x, m.y, m.z);
        const to = m.ent.moveTo!;
        const period = m.ent.period ?? 5;
        const phase = (Math.sin((s.t / period) * Math.PI * 2) + 1) / 2;
        m.x = m.base.x + (to.x - m.base.x) * phase;
        m.y = m.base.y + (to.y - m.base.y) * phase;
        m.z = m.base.z + (to.z - m.base.z) * phase;
        m.group.position.set(m.x, m.y, m.z);
      }

      if (s.isDead) return false;

      // 站在移动平台上：跟随平台位移
      if (p.groundEnt && p.groundEnt.ent.type === 'MOVER') {
        p.x += p.groundEnt.x - p.groundEnt.prev.x;
        p.y += p.groundEnt.y - p.groundEnt.prev.y;
        p.z += p.groundEnt.z - p.groundEnt.prev.z;
      }
      // 平台移动撞进玩家：沿平台移动的主轴把玩家平推出去（不瞬移到另一侧）
      for (const m of movers) {
        if (m === p.groundEnt) continue;
        if (m.ent.layerMask !== 'BOTH' && m.ent.layerMask !== layerRef.current) continue;
        if (!overlap(playerBox(), m)) continue;
        const dx = m.x - m.prev.x, dy = m.y - m.prev.y, dz = m.z - m.prev.z;
        const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
        if (ay >= ax && ay >= az && ay > 0) {
          const dir = dy > 0 ? 1 : -1;
          p.y = m.y + (m.hh + PLAYER.hh) * dir;
          if (p.vy * dir < 0) p.vy = 0;
        } else if (ax >= az && ax > 0) {
          p.x = m.x + (m.hw + PLAYER.hw) * (dx > 0 ? 1 : -1);
        } else if (az > 0) {
          p.z = m.z + (m.hd + PLAYER.hd) * (dz > 0 ? 1 : -1);
        }
      }

      // 相机相对方向的输入
      const fx = -Math.sin(s.cam.yaw), fz = -Math.cos(s.cam.yaw);   // 前
      const rx = -fz, rz = fx;                                       // 右 = forward × up
      let ix = 0, iz = 0;
      if (s.keys.f) { ix += fx; iz += fz; }
      if (s.keys.b) { ix -= fx; iz -= fz; }
      if (s.keys.r) { ix += rx; iz += rz; }
      if (s.keys.l) { ix -= rx; iz -= rz; }
      const ilen = Math.hypot(ix, iz);
      if (ilen > 0) { ix /= ilen; iz /= ilen; }

      // 晕3D：随时间恢复（静止恢复更快），高眩晕时脚步发飘
      s.dizzy = Math.max(0, s.dizzy - (ilen > 0 || !p.grounded ? 3.5 : 9) * STEP);
      const dizzyFactor = s.dizzy > 85 ? 0.72 : 1;
      // 加速度 + 摩擦
      const targetVx = ix * MOVE_SPEED * dizzyFactor, targetVz = iz * MOVE_SPEED * dizzyFactor;
      const rate = ilen > 0 ? ACCEL : FRICTION;
      p.vx += Math.min(Math.abs(targetVx - p.vx), rate * STEP) * Math.sign(targetVx - p.vx);
      p.vz += Math.min(Math.abs(targetVz - p.vz), rate * STEP) * Math.sign(targetVz - p.vz);

      // 土狼时间 + 跳跃缓冲
      s.coyoteT = p.grounded ? COYOTE_TIME : Math.max(0, s.coyoteT - STEP);
      s.jumpBufferT = Math.max(0, s.jumpBufferT - STEP);
      if (s.jumpBufferT > 0 && s.coyoteT > 0) {
        p.vy = JUMP_V;
        s.jumpBufferT = 0; s.coyoteT = 0;
        p.grounded = false;
        particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0xffffff, 10, 1.5, 1);
      }

      p.vy -= GRAVITY * STEP;
      if (p.vy < -20) p.vy = -20;

      const lists = physics[layerRef.current];

      // 逐轴移动 + 解析（记录本轴移动前的位置用于方向判定）
      const px0 = p.x;
      p.x += p.vx * STEP;
      resolveAxis('x', px0, lists.solids);
      const pz0 = p.z;
      p.z += p.vz * STEP;
      resolveAxis('z', pz0, lists.solids);
      const py0 = p.y;
      const vyImpact = p.vy;
      p.y += p.vy * STEP;
      const landedOn = resolveAxis('y', py0, lists.solids);
      p.grounded = !!landedOn;
      p.groundEnt = landedOn;

      if (p.grounded && !wasGrounded) {
        particles.burst(new THREE.Vector3(p.x, p.y - PLAYER.hh, p.z), 0xd6e4f5, 12, 2, 1.2);
        if (vyImpact < -13) s.dizzy = Math.min(100, s.dizzy + Math.min(20, (-vyImpact - 13) * 2 + 8));
      }
      wasGrounded = p.grounded;
      // 眩晕值同步到 HUD（避免每帧 setState）
      const dz = Math.round(s.dizzy);
      setDizzyLevel(prev => (Math.abs(prev - dz) >= 3 || (dz === 0 && prev !== 0) ? dz : prev));

      // 危险物 / 掉落
      for (const e of lists.hazards) {
        if (overlap(playerBox(), e)) { respawn(); return false; }
      }
      if (p.y < KILL_Y) { respawn(); return false; }

      // 存档点
      for (const e of lists.checkpoints) {
        if (!e.activated && overlap(playerBox(), e)) {
          e.activated = true;
          (e as any).setActivated?.();
          s.spawn = { x: e.x, y: e.y + 0.8, z: e.z };
          particles.burst(new THREE.Vector3(e.x, e.y + 0.5, e.z), 0xf472b6, 26, 2.5, 3);
          setCheckpointHit(true);
          setTimeout(() => setCheckpointHit(false), 1500);
        }
      }

      // 收集
      for (const e of lists.pickups) {
        if (!s.collected.has(e.ent.id) && overlap(playerBox(), e)) {
          s.collected.add(e.ent.id);
          e.group.visible = false;
          s.dizzy = Math.max(0, s.dizzy - (e.ent.type === 'SHARD' ? 35 : 15));
          particles.burst(new THREE.Vector3(e.x, e.y, e.z),
            e.ent.type === 'PAGE' ? 0xf472b6 : 0x6ee7b7, 24, 2.5, 3);
          setCollectedItems(new Set(s.collected));
        }
      }

      // 终点
      for (const e of lists.goals) {
        if (overlap(playerBox(), e)) {
          finished = true;
          onFinishRef.current({
            levelId: levelConfig.id,
            timeTaken: Date.now() - s.startTime,
            deathCount: s.deaths,
            collectedIds: Array.from(s.collected),
          });
          return true;
        }
      }
      return false;
    };

    const camPos = new THREE.Vector3();
    const draw = (dt: number) => {
      const p = s.p;

      // 角色姿态
      rig.group.position.set(p.x, p.y - PLAYER.hh, p.z);
      const moving = Math.hypot(p.vx, p.vz) > 0.4;
      if (moving) facing = Math.atan2(p.vx, p.vz);
      let da = facing - rig.group.rotation.y;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      rig.group.rotation.y += da * 0.22;

      const t = s.t;
      if (!p.grounded) {
        rig.legL.rotation.x = -0.65; rig.legR.rotation.x = 0.35;
        rig.armR.rotation.x = -2.4;
        if (skin !== 'skin1' && skin !== 'skin2') rig.armL.rotation.x = -2.4;
        rig.head.rotation.x = -0.12;
      } else if (moving) {
        const sw = Math.sin(t * 13);
        rig.legL.rotation.x = sw * 0.85;
        rig.legR.rotation.x = -sw * 0.85;
        rig.armR.rotation.x = sw * 0.6;
        if (skin !== 'skin1' && skin !== 'skin2') rig.armL.rotation.x = -sw * 0.6;
        rig.body.position.y = Math.abs(Math.cos(t * 13)) * 0.05;
        rig.head.rotation.x = 0.05;
      } else {
        rig.legL.rotation.x = 0; rig.legR.rotation.x = 0;
        rig.armR.rotation.x = Math.sin(t * 2.2) * 0.07;
        if (skin !== 'skin1' && skin !== 'skin2') rig.armL.rotation.x = -Math.sin(t * 2.2) * 0.07;
        rig.body.position.y = Math.sin(t * 3) * 0.02;
        rig.head.rotation.x = Math.sin(t * 1.4) * 0.04;
      }

      for (const r of ents) r.animate?.(t);
      // 室友姐 NPC：望向你，靠近时挥手 + 爱心粒子
      if (novus) {
        const nx = novus.group.position.x, nz = novus.group.position.z;
        const dxp = p.x - nx, dzp = p.z - nz;
        const distN = Math.hypot(dxp, dzp);
        let na = Math.atan2(dxp, dzp) - novus.group.rotation.y;
        while (na > Math.PI) na -= Math.PI * 2;
        while (na < -Math.PI) na += Math.PI * 2;
        novus.group.rotation.y += na * 0.08;
        novus.body.position.y = Math.sin(t * 2.2) * 0.03;
        if (distN < 5) {
          novus.armR.rotation.x = -2.5 + Math.sin(t * 7) * 0.45;
          novus.head.rotation.z = Math.sin(t * 3) * 0.06;
          novusHeartT += dt;
          if (novusHeartT > 1.4) {
            novusHeartT = 0;
            particles.burst(new THREE.Vector3(nx, novus.group.position.y + 1.7, nz), 0xf472b6, 6, 1, 1.6);
          }
        } else {
          novus.armR.rotation.x = Math.sin(t * 2.2) * 0.07;
        }
      }
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += 0.25 * dt * ((i % 3) + 1);
        if (clouds[i].position.x > maxX + 14) clouds[i].position.x = -8;
      }
      particles.update(dt);

      // 第三人称环绕相机
      const cy = s.cam;
      camPos.set(
        p.x + Math.sin(cy.yaw) * Math.cos(cy.pitch) * cy.dist,
        p.y + Math.sin(cy.pitch) * cy.dist + 0.6,
        p.z + Math.cos(cy.yaw) * Math.cos(cy.pitch) * cy.dist,
      );
      if (s.dizzy > 50) {
        const k = (s.dizzy - 50) / 50;
        camPos.x += Math.sin(s.t * 1.7) * 0.35 * k;
        camPos.y += Math.sin(s.t * 2.3) * 0.2 * k;
      }
      camera.position.lerp(camPos, 0.14);
      camera.lookAt(p.x, p.y + 0.7, p.z);
      if (s.dizzy > 50) {
        camera.rotation.z += Math.sin(s.t * 2.6) * 0.05 * ((s.dizzy - 50) / 50);
      }

      sun.position.set(p.x + 10, p.y + 18, p.z + 8);
      sun.target.position.set(p.x, p.y, p.z);

      renderer.render(scene, camera);
    };

    const loop = (now: number) => {
      if (finished) return;
      const dt = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        if (stepLogic()) return;
      }
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (respawnTimer !== undefined) clearTimeout(respawnTimer);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(mm => mm.dispose());
        else m?.dispose();
      });
      renderer.dispose();
    };
  }, [levelConfig, skin]);

  const pageCount = Array.from(collectedItems).filter((id: string) => id.startsWith('page')).length;
  const shardCount = Array.from(collectedItems).filter((id: string) => !id.startsWith('page')).length;

  return (
    <div className="relative w-full h-screen bg-[#FEF7CD] overflow-hidden flex flex-col items-center justify-center font-pixel">
      {/* 关卡标题横幅 */}
      {showTitle && (
        <div className="absolute top-24 z-20 text-center pointer-events-none animate-pulse">
          <div className="text-3xl font-bold text-blue-900 drop-shadow-[2px_2px_0_#fff]">{levelConfig.name}</div>
          <div className="text-sm text-blue-700 mt-1 bg-white/70 inline-block px-3 py-1 rounded">{levelConfig.subtitle}</div>
        </div>
      )}

      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <div className={`px-4 py-2 border-4 retro-border shadow-lg ${
            currentLayer === Layer.REAL
            ? 'bg-white border-blue-500 text-blue-900'
            : 'bg-black border-white text-white'
        }`}>
            {currentLayer === Layer.REAL ? '现实' : '漫画'}
        </div>
        {/* 晕3D 值：豆沙的老毛病 */}
        <div className="flex flex-col gap-1 bg-white/85 border-4 border-purple-300 retro-border px-3 py-2 shadow-lg" title="李豆沙晕3D！切换次元和高处落地会加重，吃薄荷糖缓解">
          <div className="text-[10px] font-bold text-purple-500 leading-none">晕3D {dizzyLevel >= 85 ? '呜…好晕…' : ''}</div>
          <div className="w-24 h-2.5 bg-purple-100 border border-purple-300">
            <div className={`h-full transition-all duration-200 ${dizzyLevel >= 85 ? 'bg-purple-600 animate-pulse' : dizzyLevel > 50 ? 'bg-purple-400' : 'bg-purple-300'}`}
                 style={{ width: `${dizzyLevel}%` }} />
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
         <div className="flex gap-2 mr-4">
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-pink-500 flex items-center gap-2 shadow-lg">
                <BookOpen size={18} />
                <span>{pageCount}</span>
             </div>
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-emerald-500 flex items-center gap-2 shadow-lg" title="姐姐牌薄荷糖：清除眩晕">
                <Candy size={18} />
                <span>{shardCount}</span>
             </div>
         </div>

         {isGameCleared && (
           <button onClick={handleSkipLevel} title="跳过本关 (二周目特权)"
              className="p-2 bg-pink-500 border-4 border-pink-700 text-white retro-border shadow-lg hover:bg-pink-400 animate-pulse">
               <FastForward size={20} /> <span className="text-xs ml-1 hidden md:inline">跳过</span>
           </button>
         )}
         <button onClick={resetLevel} title="重新开始本关"
            className="p-2 bg-yellow-400 border-4 border-yellow-600 text-white retro-border shadow-lg hover:bg-yellow-300">
             <RotateCcw size={20} />
         </button>
         <button onClick={onExit} title="返回标题"
            className="p-2 bg-red-500 border-4 border-red-700 text-white retro-border shadow-lg hover:bg-red-400">
             <Home size={20} />
         </button>
      </div>

      {checkpointHit && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-pink-500 font-bold bg-white/90 border-2 border-pink-400 px-4 py-1 rounded shadow pointer-events-none">
          <Flag size={16} /> 存档点已激活！
        </div>
      )}

      {!canSwitch && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-red-500 font-bold animate-pulse text-xl bg-white/80 border-2 border-red-500 px-4 py-1 rounded">
            冷却中...
        </div>
      )}

      <div className="absolute bottom-4 left-4 text-xs md:text-sm text-blue-900 bg-white/60 px-2 py-1 rounded">
         [WASD] 移动 | [空格] 跳跃 | [Q] 切换次元 | [鼠标拖动] 转视角 | [滚轮] 缩放
      </div>

      <div className="relative w-[min(96vw,1000px)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={`block w-full h-auto border-4 transition-all duration-300 shadow-2xl cursor-grab active:cursor-grabbing ${
              currentLayer === Layer.MANGA ? 'border-black filter grayscale contrast-125' : 'border-blue-900'
          }`}
        />
        {/* 晕3D 视觉：紫色暗角随眩晕加深 */}
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
             style={{
               opacity: Math.max(0, (dizzyLevel - 45) / 55) * 0.6,
               background: 'radial-gradient(ellipse at center, transparent 42%, rgba(109,40,217,0.55) 100%)',
             }} />
      </div>
    </div>
  );
};

export default GameEngine3D;
