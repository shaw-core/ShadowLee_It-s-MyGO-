import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Layer, LevelConfig, LevelEntity, EntityType, LevelResult } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, LAYER_COOLDOWN } from '../constants';
import { BookOpen, Diamond, RotateCcw, Home, FastForward } from 'lucide-react';

interface GameEngineProps {
  levelConfig: LevelConfig;
  onFinishLevel: (result: LevelResult) => void;
  onExit: () => void;
  isGameCleared: boolean;
}

// ============ 世界参数 ============
const CANVAS_W = 1000;
const CANVAS_H = 600;
const LOGIC_STEP = 1000 / 60;      // 固定 60Hz 逻辑
const MAX_FRAME_DELTA = 100;

const SCALE = 50;                   // 2D 像素 -> 3D 世界单位换算比例
const PLATFORM_DEPTH = 4;           // 平台厚度（z 轴），玩家可以在深度方向行走/坠落
const KILL_Y = -6;                  // 掉出世界的高度

// 物理参数：直接复用 2D 版常量，按 SCALE 换算，手感一致
const G = GRAVITY / SCALE;
const JUMP_V = -JUMP_FORCE / SCALE; // 世界坐标 y 向上为正
const MOVE_V = MOVE_SPEED / SCALE;

// 2D 屏幕坐标 (y 向下) -> 3D 世界坐标 (y 向上)，取实体中心点
const toWorldY = (y2d: number) => (600 - y2d) / SCALE;

// ============ lowpoly 配色 ============
const REAL_SKY = 0xbfe3ff;
const MANGA_SKY = 0xffffff;
const PLATFORM_COLORS = [0x93c5fd, 0x86efac, 0xfcd34d, 0xf0abfc, 0x7dd3fc];

interface Box3D {
  cx: number; cy: number; cz: number; // 中心
  hw: number; hh: number; hd: number; // 半宽/半高/半深
}

const overlap = (a: Box3D, b: Box3D) =>
  Math.abs(a.cx - b.cx) < a.hw + b.hw &&
  Math.abs(a.cy - b.cy) < a.hh + b.hh &&
  Math.abs(a.cz - b.cz) < a.hd + b.hd;

// 场景中的实体：几何数据 + 三套视觉状态（现实 / 漫画 / 幽灵）
interface Ent3D extends Box3D {
  ent: LevelEntity;
  group: THREE.Group;
  applyLayer: (layer: Layer, active: boolean) => void;
  animate?: (frame: number) => void;
}

// 简单的字符串 hash，让每个平台拿到稳定的颜色
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// 文本彩蛋：画到 canvas 再贴成 Sprite（避免加载 3D 字体）
const makeTextSprite = (text: string, color: string): THREE.Sprite => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.font = 'bold 52px "Noto Sans SC", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(7, 1.75, 1);
  return sprite;
};

// ============ 用方块拼一个 lowpoly 李豆沙 ============
interface DoushaRig {
  group: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  body: THREE.Group;
}

const buildDousha = (): DoushaRig => {
  const group = new THREE.Group();
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
  const box = (w: number, h: number, d: number, c: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.castShadow = true;
    return m;
  };

  const C = {
    hair: 0xe5e7eb, jacket: 0x1d4ed8, skin: 0xffedd5,
    ears: 0x111827, glasses: 0x1f2937, shirt: 0xffffff,
    boots: 0x271c19,
  };

  // 身体锚点在脚底 (y=0)，总高约 1.2（对应 2D 的 60px）
  const body = new THREE.Group();
  group.add(body);

  // 腿（髋部为轴心，方便摆腿动画）
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.5, 0);
    const upper = box(0.14, 0.34, 0.16, C.skin); upper.position.y = -0.17;
    const boot = box(0.17, 0.16, 0.22, C.boots); boot.position.set(0, -0.42, 0.02);
    leg.add(upper, boot);
    body.add(leg);
    return leg;
  };
  const legL = makeLeg(-0.12);
  const legR = makeLeg(0.12);

  // 躯干
  const torso = box(0.46, 0.42, 0.28, C.jacket);
  torso.position.y = 0.72;
  body.add(torso);
  const shirt = box(0.14, 0.42, 0.02, C.shirt);
  shirt.position.set(0, 0.72, 0.15);
  body.add(shirt);

  // 手臂（肩部为轴心）
  const makeArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.9, 0);
    const sleeve = box(0.13, 0.32, 0.15, C.jacket); sleeve.position.y = -0.16;
    const hand = box(0.11, 0.1, 0.12, C.skin); hand.position.y = -0.36;
    arm.add(sleeve, hand);
    body.add(arm);
    return arm;
  };
  const armL = makeArm(-0.3);
  const armR = makeArm(0.3);

  // 头 + 白发
  const head = box(0.42, 0.36, 0.36, C.skin);
  head.position.y = 1.12;
  body.add(head);
  const hairTop = box(0.48, 0.16, 0.42, C.hair);
  hairTop.position.y = 1.32;
  body.add(hairTop);
  const hairBack = box(0.46, 0.34, 0.14, C.hair);
  hairBack.position.set(0, 1.1, -0.16);
  body.add(hairBack);
  const hairSideL = box(0.1, 0.4, 0.3, C.hair);
  hairSideL.position.set(-0.24, 1.06, -0.02);
  body.add(hairSideL);
  const hairSideR = hairSideL.clone();
  hairSideR.position.x = 0.24;
  body.add(hairSideR);

  // 耳机（黑色方块 + 头带）
  const earL = box(0.1, 0.16, 0.16, C.ears);
  earL.position.set(-0.26, 1.14, 0.02);
  body.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.26;
  body.add(earR);
  const band = box(0.56, 0.05, 0.08, C.ears);
  band.position.y = 1.4;
  body.add(band);

  // 眼镜（正脸一条黑框 + 两片镜片）
  const frame = box(0.4, 0.04, 0.02, C.glasses);
  frame.position.set(0, 1.15, 0.19);
  body.add(frame);
  const lens = box(0.13, 0.11, 0.02, 0x0b1220);
  lens.position.set(-0.1, 1.13, 0.19);
  body.add(lens);
  const lens2 = lens.clone();
  lens2.position.x = 0.1;
  body.add(lens2);

  return { group, legL, legR, armL, armR, body };
};

// ============ 组件 ============
const GameEngine: React.FC<GameEngineProps> = ({ levelConfig, onFinishLevel, onExit, isGameCleared }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLayer, setCurrentLayer] = useState<Layer>(Layer.REAL);
  const [canSwitch, setCanSwitch] = useState(true);
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());

  const gameStateRef = useRef({
    player: {
      x: 0, y: 0, z: 0,          // 中心点（世界坐标）
      vx: 0, vy: 0, vz: 0,
      hw: 0.4, hh: 0.6, hd: 0.25,
      isGrounded: false,
    },
    keys: { left: false, right: false, fwd: false, back: false },
    collected: new Set<string>(),
    isDead: false,
    lastSwitchTime: 0,
    frame: 0,
    deathCount: 0,
    startTime: Date.now(),
  });

  const layerRef = useRef<Layer>(Layer.REAL);
  const applyLayerRef = useRef<(layer: Layer) => void>(() => {});
  const onFinishRef = useRef(onFinishLevel);
  const onExitRef = useRef(onExit);
  useEffect(() => { onFinishRef.current = onFinishLevel; }, [onFinishLevel]);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  const spawnPoint = useRef({ x: 0, y: 0 });

  const resetLevel = useCallback(() => {
    const s = gameStateRef.current;
    s.player.x = spawnPoint.current.x;
    s.player.y = spawnPoint.current.y;
    s.player.z = 0;
    s.player.vx = 0; s.player.vy = 0; s.player.vz = 0;
    s.collected.clear();
    s.isDead = false;
    s.frame = 0;
    s.deathCount = 0;
    s.startTime = Date.now();
    layerRef.current = Layer.REAL;
    setCollectedItems(new Set());
    setCurrentLayer(Layer.REAL);
    applyLayerRef.current(Layer.REAL);
  }, []);

  const handleLayerSwitch = useCallback(() => {
    const now = Date.now();
    if (now - gameStateRef.current.lastSwitchTime > LAYER_COOLDOWN) {
      gameStateRef.current.lastSwitchTime = now;
      const next = layerRef.current === Layer.REAL ? Layer.MANGA : Layer.REAL;
      layerRef.current = next;
      setCurrentLayer(next);
      applyLayerRef.current(next);
      setCanSwitch(false);
      setTimeout(() => setCanSwitch(true), LAYER_COOLDOWN);
    }
  }, []);

  // 键盘输入：只注册一次
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = gameStateRef.current;
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft':
          e.preventDefault(); if (!s.isDead) s.keys.left = true; break;
        case 'KeyD': case 'ArrowRight':
          e.preventDefault(); if (!s.isDead) s.keys.right = true; break;
        case 'KeyW': case 'ArrowUp':
          e.preventDefault(); if (!s.isDead) s.keys.fwd = true; break;
        case 'KeyS': case 'ArrowDown':
          e.preventDefault(); if (!s.isDead) s.keys.back = true; break;
        case 'Space':
          e.preventDefault();
          if (!s.isDead && s.player.isGrounded) {
            s.player.vy = JUMP_V;
            s.player.isGrounded = false;
          }
          break;
        case 'KeyQ':
          if (!s.isDead) handleLayerSwitch(); break;
        case 'Escape':
          onExitRef.current(); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = gameStateRef.current.keys;
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': k.left = false; break;
        case 'KeyD': case 'ArrowRight': k.right = false; break;
        case 'KeyW': case 'ArrowUp': k.fwd = false; break;
        case 'KeyS': case 'ArrowDown': k.back = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLayerSwitch]);

  // NG+ 跳关（保留 2D 版逻辑）
  const handleSkipLevel = () => {
    const finalCollected = new Set(gameStateRef.current.collected);
    levelConfig.entities.forEach(e => {
      if (e.type === EntityType.COLLECTIBLE_PAGE || e.type === EntityType.COLLECTIBLE_SHARD) {
        finalCollected.add(e.id);
      }
    });
    onFinishLevel({
      levelId: levelConfig.id,
      timeTaken: 0,
      deathCount: 0,
      collectedIds: Array.from(finalCollected)
    });
  };

  // ============ 3D 场景 + 主循环：每关挂载一次 ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(CANVAS_W, CANVAS_H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(REAL_SKY);
    scene.fog = new THREE.Fog(REAL_SKY, 25, 70);

    const camera = new THREE.PerspectiveCamera(50, CANVAS_W / CANVAS_H, 0.1, 200);

    // 光照：半球光 + 带阴影的太阳光（跟随玩家，保证阴影覆盖）
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd9c9a3, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
    sun.shadow.camera.far = 60;
    scene.add(sun);
    scene.add(sun.target);

    // ---- 把 2D 关卡数据转换成 3D 实体 ----
    const ents3d: Ent3D[] = [];

    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x475569, wireframe: true, transparent: true, opacity: 0.25 });
    const mangaWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });

    for (const ent of levelConfig.entities) {
      const cx = (ent.x + ent.w / 2) / SCALE;
      const cy = toWorldY(ent.y + ent.h / 2);
      const hw = ent.w / 2 / SCALE;
      const hh = ent.h / 2 / SCALE;
      const group = new THREE.Group();
      group.position.set(cx, cy, 0);
      scene.add(group);

      if (ent.type === EntityType.PLATFORM) {
        const hd = PLATFORM_DEPTH / 2;
        const color = PLATFORM_COLORS[hashStr(ent.id) % PLATFORM_COLORS.length];
        const realMat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
        const geo = new THREE.BoxGeometry(hw * 2, hh * 2, hd * 2);
        const mesh = new THREE.Mesh(geo, realMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // 漫画层描边
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        edges.visible = false;
        // 幽灵态（另一图层时的虚影提示）
        const ghost = new THREE.Mesh(geo, ghostMat);
        ghost.visible = false;
        group.add(mesh, edges, ghost);

        ents3d.push({
          ent, cx, cy, cz: 0, hw, hh, hd, group,
          applyLayer: (layer, active) => {
            mesh.visible = active;
            ghost.visible = !active;
            edges.visible = active && layer === Layer.MANGA;
            mesh.material = layer === Layer.MANGA ? mangaWhite : realMat;
          },
        });
      } else if (ent.type === EntityType.HAZARD) {
        const hd = PLATFORM_DEPTH / 2;
        // 一排 lowpoly 尖刺（锥体）
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, flatShading: true, roughness: 0.8 });
        const spikeGeo = new THREE.ConeGeometry(0.22, Math.max(hh * 2, 0.5), 4);
        for (let sx = -hw + 0.25; sx < hw; sx += 0.5) {
          for (let sz = -hd + 0.6; sz < hd; sz += 1.1) {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(sx, 0, sz);
            spike.castShadow = true;
            group.add(spike);
          }
        }
        ents3d.push({
          ent, cx, cy, cz: 0, hw, hh: Math.max(hh, 0.25), hd, group,
          applyLayer: (_layer, active) => { group.visible = active; },
        });
      } else if (ent.type === EntityType.GOAL) {
        // 终点：金色旋转传送门
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(Math.max(hh, 0.9), 0.16, 6, 14),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, flatShading: true })
        );
        torus.castShadow = true;
        group.add(torus);
        ents3d.push({
          ent, cx, cy, cz: 0, hw, hh, hd: PLATFORM_DEPTH / 2, group,
          applyLayer: (_layer, active) => { group.visible = active; },
          animate: (f) => { torus.rotation.y = f * 0.03; },
        });
      } else if (ent.type === EntityType.COLLECTIBLE_PAGE) {
        // 漫画页：粉色小册子
        const page = new THREE.Group();
        const cover = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.75, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0x9d174d, emissiveIntensity: 0.3, flatShading: true })
        );
        const inner = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.6, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true })
        );
        cover.castShadow = true;
        page.add(cover, inner);
        group.add(page);
        ents3d.push({
          ent, cx, cy, cz: 0, hw: Math.max(hw, 0.4), hh: Math.max(hh, 0.5), hd: 1.0, group,
          applyLayer: (_layer, active) => { group.visible = active; },
          animate: (f) => {
            page.rotation.y = f * 0.04;
            page.position.y = Math.sin(f * 0.1) * 0.12;
          },
        });
      } else if (ent.type === EntityType.COLLECTIBLE_SHARD) {
        // 记忆碎片：蓝色八面体
        const shard = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32),
          new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, emissiveIntensity: 0.35, flatShading: true })
        );
        shard.castShadow = true;
        group.add(shard);
        ents3d.push({
          ent, cx, cy, cz: 0, hw: Math.max(hw, 0.35), hh: Math.max(hh, 0.35), hd: 1.0, group,
          applyLayer: (_layer, active) => { group.visible = active; },
          animate: (f) => {
            shard.rotation.y = f * 0.05;
            shard.position.y = Math.sin(f * 0.1 + 2) * 0.12;
          },
        });
      } else if (ent.type === EntityType.TEXT) {
        const sprite = makeTextSprite(ent.text || '', ent.color || '#1e3a8a');
        group.add(sprite);
        ents3d.push({
          ent, cx, cy, cz: 0, hw: 0, hh: 0, hd: 0, group,
          applyLayer: (_layer, active) => { group.visible = active; },
          animate: (f) => { group.position.y = cy + Math.sin(f * 0.05 + cx) * 0.15; },
        });
      }
    }

    // 背景装饰：lowpoly 云朵（不参与碰撞）
    const levelWidth = Math.max(...levelConfig.entities.map(e => e.x + e.w)) / SCALE;
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });
    const clouds: THREE.Mesh[] = [];
    const rng = (seed: number) => { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; };
    const rand = rng(levelConfig.id * 7 + 13);
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + rand() * 1.4, 0), cloudMat);
      cloud.position.set(rand() * (levelWidth + 10) - 3, 8 + rand() * 6, -8 - rand() * 8);
      cloud.scale.y = 0.5;
      scene.add(cloud);
      clouds.push(cloud);
    }

    // ---- 图层切换：更新实体外观 + 天空氛围 ----
    const isActive = (ent: LevelEntity, layer: Layer) => ent.layerMask === 'BOTH' || ent.layerMask === layer;
    const applyLayer = (layer: Layer) => {
      for (const e of ents3d) e.applyLayer(layer, isActive(e.ent, layer));
      const sky = layer === Layer.REAL ? REAL_SKY : MANGA_SKY;
      (scene.background as THREE.Color).setHex(sky);
      scene.fog!.color.setHex(sky);
      hemi.intensity = layer === Layer.REAL ? 0.9 : 1.4;
      sun.intensity = layer === Layer.REAL ? 1.6 : 0.9;
      cloudMat.color.setHex(layer === Layer.REAL ? 0xffffff : 0xe5e5e5);
    };
    applyLayerRef.current = applyLayer;
    layerRef.current = Layer.REAL; // 每关固定从现实层开始（与 2D 版一致）
    applyLayer(Layer.REAL);

    // ---- 玩家 ----
    const dousha = buildDousha();
    scene.add(dousha.group);

    const s = gameStateRef.current;
    // playerStart 是 2D 左上角坐标，转成 3D 中心
    spawnPoint.current = {
      x: (levelConfig.playerStart.x + 20) / SCALE,
      y: toWorldY(levelConfig.playerStart.y + 30),
    };
    s.player.x = spawnPoint.current.x;
    s.player.y = spawnPoint.current.y;
    s.player.z = 0;
    s.player.vx = 0; s.player.vy = 0; s.player.vz = 0;

    // 相机初始位置
    const camTarget = new THREE.Vector3();
    camera.position.set(s.player.x + 3, s.player.y + 4, 13);

    // 按图层预分类（物理用）
    const buildPhysicsLists = (layer: Layer) => {
      const act = ents3d.filter(e => isActive(e.ent, layer));
      return {
        platforms: act.filter(e => e.ent.type === EntityType.PLATFORM),
        hazards: act.filter(e => e.ent.type === EntityType.HAZARD),
        pickups: act.filter(e => e.ent.type === EntityType.COLLECTIBLE_PAGE || e.ent.type === EntityType.COLLECTIBLE_SHARD),
        goals: act.filter(e => e.ent.type === EntityType.GOAL),
      };
    };
    const physics = {
      [Layer.REAL]: buildPhysicsLists(Layer.REAL),
      [Layer.MANGA]: buildPhysicsLists(Layer.MANGA),
    };

    let animationFrameId = 0;
    let isFinished = false;
    let respawnTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTime = performance.now();
    let accumulator = 0;
    let facingAngle = Math.PI / 2; // 初始面朝 +x

    const respawn = () => {
      if (s.isDead) return;
      s.isDead = true;
      s.deathCount += 1;
      dousha.group.visible = false;
      respawnTimer = setTimeout(() => {
        s.player.x = spawnPoint.current.x;
        s.player.y = spawnPoint.current.y;
        s.player.z = 0;
        s.player.vx = 0; s.player.vy = 0; s.player.vz = 0;
        s.keys.left = false; s.keys.right = false; s.keys.fwd = false; s.keys.back = false;
        s.isDead = false;
        dousha.group.visible = true;
      }, 300);
    };

    const playerBox = (): Box3D => ({
      cx: s.player.x, cy: s.player.y, cz: s.player.z,
      hw: s.player.hw, hh: s.player.hh, hd: s.player.hd,
    });

    // 单步逻辑（60Hz），返回 true 表示通关
    const stepLogic = (): boolean => {
      s.frame++;
      const p = s.player;
      if (s.isDead) return false;

      // 输入 -> 速度（x：左右，z：深度）
      p.vx = s.keys.left ? -MOVE_V : s.keys.right ? MOVE_V : 0;
      p.vz = s.keys.fwd ? -MOVE_V : s.keys.back ? MOVE_V : 0;
      // 斜向移动归一化
      if (p.vx !== 0 && p.vz !== 0) { p.vx *= 0.7071; p.vz *= 0.7071; }

      const lists = physics[layerRef.current];

      // 逐轴移动 + 碰撞解析
      p.x += p.vx;
      for (const e of lists.platforms) {
        if (overlap(playerBox(), e)) {
          p.x = p.vx > 0 ? e.cx - e.hw - p.hw : e.cx + e.hw + p.hw;
          p.vx = 0;
        }
      }

      p.z += p.vz;
      for (const e of lists.platforms) {
        if (overlap(playerBox(), e)) {
          p.z = p.vz > 0 ? e.cz - e.hd - p.hd : e.cz + e.hd + p.hd;
          p.vz = 0;
        }
      }

      p.vy -= G;
      p.y += p.vy;
      p.isGrounded = false;
      for (const e of lists.platforms) {
        if (overlap(playerBox(), e)) {
          if (p.vy < 0) {
            p.y = e.cy + e.hh + p.hh;
            p.isGrounded = true;
            p.vy = 0;
          } else if (p.vy > 0) {
            p.y = e.cy - e.hh - p.hh;
            p.vy = 0;
          }
        }
      }

      for (const e of lists.hazards) {
        if (overlap(playerBox(), e)) { respawn(); return false; }
      }

      for (const e of lists.pickups) {
        if (!s.collected.has(e.ent.id) && overlap(playerBox(), e)) {
          s.collected.add(e.ent.id);
          e.group.visible = false;
          setCollectedItems(new Set(s.collected));
        }
      }

      for (const e of lists.goals) {
        if (overlap(playerBox(), e)) {
          isFinished = true;
          onFinishRef.current({
            levelId: levelConfig.id,
            timeTaken: Date.now() - s.startTime,
            deathCount: s.deathCount,
            collectedIds: Array.from(s.collected)
          });
          return true;
        }
      }

      if (p.y < KILL_Y) respawn();
      return false;
    };

    const draw = () => {
      const p = s.player;
      const f = s.frame;

      // 玩家模型：位置（锚点在脚底）+ 朝向 + 动画
      dousha.group.position.set(p.x, p.y - p.hh, p.z);
      const moving = Math.abs(p.vx) > 0.001 || Math.abs(p.vz) > 0.001;
      if (moving) facingAngle = Math.atan2(p.vx, p.vz);
      // 平滑转身
      let da = facingAngle - dousha.group.rotation.y;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      dousha.group.rotation.y += da * 0.25;

      if (!p.isGrounded) {
        // 跳跃姿势
        dousha.legL.rotation.x = -0.7;
        dousha.legR.rotation.x = 0.4;
        dousha.armL.rotation.x = -2.6;
        dousha.armR.rotation.x = -2.6;
      } else if (moving) {
        const sw = Math.sin(f * 0.35);
        dousha.legL.rotation.x = sw * 0.8;
        dousha.legR.rotation.x = -sw * 0.8;
        dousha.armL.rotation.x = -sw * 0.6;
        dousha.armR.rotation.x = sw * 0.6;
        dousha.body.position.y = Math.abs(Math.cos(f * 0.35)) * 0.05;
      } else {
        // 待机呼吸
        dousha.legL.rotation.x = 0;
        dousha.legR.rotation.x = 0;
        dousha.armL.rotation.x = Math.sin(f * 0.05) * 0.08;
        dousha.armR.rotation.x = -Math.sin(f * 0.05) * 0.08;
        dousha.body.position.y = Math.sin(f * 0.1) * 0.02;
      }

      // 实体动画（旋转/浮动）
      for (const e of ents3d) e.animate?.(f);

      // 云朵缓慢漂移
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += 0.004 * ((i % 3) + 1);
        if (clouds[i].position.x > levelWidth + 12) clouds[i].position.x = -6;
      }

      // 相机：略带俯角的跟随视角，平滑插值
      camTarget.set(p.x + 2.5, Math.max(p.y + 3.5, 3.5), 12);
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(p.x, Math.max(p.y + 0.5, 1), p.z);

      // 太阳跟随玩家，保证阴影范围
      sun.position.set(p.x + 8, p.y + 16, 10);
      sun.target.position.set(p.x, p.y, 0);

      renderer.render(scene, camera);
    };

    const loop = (now: number) => {
      if (isFinished) return;
      accumulator += Math.min(now - lastTime, MAX_FRAME_DELTA);
      lastTime = now;
      while (accumulator >= LOGIC_STEP) {
        accumulator -= LOGIC_STEP;
        if (stepLogic()) return;
      }
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (respawnTimer !== undefined) clearTimeout(respawnTimer);
      // 释放 GPU 资源
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    };
  }, [levelConfig]);

  // 关卡切换时重置进度状态
  useEffect(() => {
    gameStateRef.current.collected.clear();
    gameStateRef.current.isDead = false;
    gameStateRef.current.frame = 0;
    gameStateRef.current.deathCount = 0;
    gameStateRef.current.startTime = Date.now();
    layerRef.current = Layer.REAL;
    setCollectedItems(new Set());
    setCurrentLayer(Layer.REAL);
  }, [levelConfig]);

  const pageCount = Array.from(collectedItems).filter((id: string) => id.startsWith('page')).length;
  const shardCount = Array.from(collectedItems).filter((id: string) => id.startsWith('shard')).length;

  return (
    <div className="relative w-full h-screen bg-[#FEF7CD] overflow-hidden flex flex-col items-center justify-center font-pixel">
      <div className="absolute top-6 left-6 z-10 flex gap-4">
        <div className={`px-4 py-2 border-4 retro-border shadow-lg ${
            currentLayer === Layer.REAL
            ? 'bg-white border-blue-500 text-blue-900'
            : 'bg-black border-white text-white'
        }`}>
            {currentLayer === Layer.REAL ? '现实' : '漫画'}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
         <div className="flex gap-2 mr-4">
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-pink-500 flex items-center gap-2 shadow-lg">
                <BookOpen size={18} />
                <span>{pageCount}</span>
             </div>
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-blue-500 flex items-center gap-2 shadow-lg">
                <Diamond size={18} />
                <span>{shardCount}</span>
             </div>
         </div>

         {isGameCleared && (
           <button
              onClick={handleSkipLevel}
              title="跳过本关 (二周目特权)"
              className="p-2 bg-pink-500 border-4 border-pink-700 text-white retro-border shadow-lg hover:bg-pink-400 animate-pulse"
           >
               <FastForward size={20} /> <span className="text-xs ml-1 hidden md:inline">跳过</span>
           </button>
         )}

         <button
            onClick={resetLevel}
            title="重新开始本关"
            className="p-2 bg-yellow-400 border-4 border-yellow-600 text-white retro-border shadow-lg hover:bg-yellow-300"
         >
             <RotateCcw size={20} />
         </button>
         <button
            onClick={onExit}
            title="返回标题"
            className="p-2 bg-red-500 border-4 border-red-700 text-white retro-border shadow-lg hover:bg-red-400"
         >
             <Home size={20} />
         </button>
      </div>

      {!canSwitch && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-red-500 font-bold animate-pulse text-xl bg-white/80 border-2 border-red-500 px-4 py-1 rounded">
            冷却中...
        </div>
      )}

      <div className="absolute bottom-4 left-4 text-sm text-blue-900 bg-white/50 px-2 rounded">
         [AD] 左右 | [WS] 前后 | [Space] 跳跃 | [Q] 切换次元 | {levelConfig.name}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`border-4 transition-all duration-300 shadow-2xl ${
            currentLayer === Layer.MANGA ? 'border-black filter grayscale contrast-125' : 'border-blue-900'
        }`}
      />
    </div>
  );
};

export default GameEngine;
