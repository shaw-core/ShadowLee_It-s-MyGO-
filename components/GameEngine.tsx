import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Layer, LevelConfig, LevelEntity, EntityType, LevelResult } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, LAYER_COOLDOWN } from '../constants';
import { BookOpen, Diamond, RotateCcw, Home, FastForward } from 'lucide-react';

interface GameEngineProps {
  levelConfig: LevelConfig;
  onFinishLevel: (result: LevelResult) => void;
  onExit: () => void;
  isGameCleared: boolean;
}

const CANVAS_W = 1000;
const CANVAS_H = 600;
// 固定逻辑步长：无论显示器是 60Hz 还是 144Hz，游戏速度都一致
const LOGIC_STEP = 1000 / 60;
const MAX_FRAME_DELTA = 100; // 切后台回来时防止物理"追帧"爆炸

interface RectLike { x: number; y: number; w: number; h: number }

// ---- 纯函数：移到组件外，避免每次渲染重新创建 ----

const checkCollision = (a: RectLike, b: RectLike) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// 预渲染漫画图层的网点背景（原来每帧循环 fillRect ~37500 次）
const createHalftoneCanvas = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = CANVAS_W;
  c.height = CANVAS_H;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < CANVAS_W; i += 4) {
    for (let j = 0; j < CANVAS_H; j += 4) {
      if ((i + j) % 8 === 0) g.fillRect(i, j, 2, 2);
    }
  }
  return c;
};

// 室友姐 2D 像素形象（橘发猫耳，会朝玩家挥手）
const drawNovus = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  frame: number, playerX: number
) => {
  const faceRight = playerX > x + w / 2;
  const bob = Math.sin(frame * 0.06) * 2;
  const cx = x + w / 2;
  ctx.save();
  ctx.translate(cx, y + bob);
  if (!faceRight) ctx.scale(-1, 1);
  ctx.translate(-w / 2, 0);

  // 腿
  ctx.fillStyle = '#ffe9d9';
  ctx.fillRect(w * 0.25, h * 0.72, w * 0.16, h * 0.24);
  ctx.fillRect(w * 0.56, h * 0.72, w * 0.16, h * 0.24);
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(w * 0.22, h * 0.92, w * 0.22, h * 0.08);
  ctx.fillRect(w * 0.53, h * 0.92, w * 0.22, h * 0.08);
  // 奶油色上衣
  ctx.fillStyle = '#fdf3e2';
  ctx.fillRect(w * 0.14, h * 0.4, w * 0.72, h * 0.35);
  // 挥手的手臂
  const wave = Math.sin(frame * 0.25) * 0.5;
  ctx.save();
  ctx.translate(w * 0.82, h * 0.45);
  ctx.rotate(-1.9 + wave);
  ctx.fillStyle = '#fdf3e2';
  ctx.fillRect(-w * 0.07, 0, w * 0.14, h * 0.26);
  ctx.fillStyle = '#ffe9d9';
  ctx.fillRect(-w * 0.06, h * 0.24, w * 0.12, h * 0.09);
  ctx.restore();
  // 头
  ctx.fillStyle = '#ffe9d9';
  ctx.fillRect(w * 0.16, h * 0.06, w * 0.68, h * 0.34);
  // 橘发：刘海 + 侧发
  ctx.fillStyle = '#d97742';
  ctx.fillRect(w * 0.12, h * 0.02, w * 0.76, h * 0.13);
  ctx.fillRect(w * 0.1, h * 0.06, w * 0.14, h * 0.36);
  ctx.fillRect(w * 0.76, h * 0.06, w * 0.14, h * 0.36);
  // 猫耳
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.05); ctx.lineTo(w * 0.3, h * -0.12); ctx.lineTo(w * 0.4, h * 0.03); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h * 0.03); ctx.lineTo(w * 0.7, h * -0.12); ctx.lineTo(w * 0.8, h * 0.05); ctx.fill();
  // 眯眯笑眼 + 腮红
  ctx.strokeStyle = '#5b3a29';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(w * 0.38, h * 0.24, w * 0.07, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(w * 0.66, h * 0.24, w * 0.07, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.fillStyle = '#fda4af';
  ctx.fillRect(w * 0.28, h * 0.3, w * 0.1, h * 0.04);
  ctx.fillRect(w * 0.62, h * 0.3, w * 0.1, h * 0.04);
  // 微笑
  ctx.strokeStyle = '#c2554d';
  ctx.beginPath(); ctx.arc(w * 0.52, h * 0.3, w * 0.06, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.restore();
};

const drawDousha = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facingRight: boolean,
  frame: number,
  vx: number,
  _vy: number,
  isGrounded: boolean
) => {
  ctx.save();

  let animState = 'IDLE';
  if (!isGrounded) animState = 'JUMP';
  else if (Math.abs(vx) > 0.5) animState = 'RUN';

  let bodyY = 0;
  let legL = { x: 0, y: 0 };
  let legR = { x: 0, y: 0 };
  const armOffset = { x: 0, y: 0 };

  const isBlinking = frame % 180 > 174;

  if (animState === 'IDLE') {
    const beat = Math.floor(frame / 30) % 2;
    bodyY = beat === 0 ? 0 : 0.5;
    armOffset.y = beat === 0 ? 0 : 0.5;
  } else if (animState === 'RUN') {
    const runFrame = Math.floor(frame / 6) % 4;

    if (runFrame === 0) { // Leg L forward
      bodyY = 0;
      legL = { x: -1, y: 0 };
      legR = { x: 1, y: 0 };
    } else if (runFrame === 1) { // Mid
      bodyY = 1;
    } else if (runFrame === 2) { // Leg R forward
      bodyY = 0;
      legL = { x: 1, y: 0 };
      legR = { x: -1, y: 0 };
    } else { // Mid/Hop
      bodyY = -1;
      legL = { x: 0, y: -1 };
      legR = { x: 0, y: -1 };
    }
  } else if (animState === 'JUMP') {
    bodyY = -1;
    legL = { x: 0, y: -1.5 };
    legR = { x: 0, y: -0.5 };
    armOffset.y = -2;
  }

  if (!facingRight) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  const pixelScale = w / 12;
  const drawY = y + bodyY * pixelScale;

  const rect = (c: string, gx: number, gy: number, gw: number, gh: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.floor(x + gx * pixelScale),
      Math.floor(drawY + gy * (h / 18)),
      Math.ceil(gw * pixelScale),
      Math.ceil(gh * (h / 18))
    );
  };

  const legRect = (c: string, gx: number, gy: number, gw: number, gh: number, offset: { x: number; y: number }) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.floor(x + (gx + offset.x) * pixelScale),
      Math.floor(drawY + (gy + offset.y) * (h / 18)),
      Math.ceil(gw * pixelScale),
      Math.ceil(gh * (h / 18))
    );
  };

  const C = {
    hair: '#e5e7eb',
    hairShadow: '#9ca3af',
    jacket: '#1d4ed8',
    jacketDark: '#1e3a8a',
    skin: '#ffedd5',
    ears: '#111827',
    glasses: '#374151',
    lens: '#000000',
    shirt: '#ffffff',
    boots: '#271c19',
    socks: '#f3f4f6'
  };

  rect(C.hair, 2, 4, 8, 9);

  legRect(C.skin, 3.5, 14, 2, 2, legL);
  legRect(C.socks, 3.5, 15.5, 2, 1, legL);
  legRect(C.boots, 3, 16.5, 3, 1.5, legL);

  legRect(C.skin, 6.5, 14, 2, 2, legR);
  legRect(C.socks, 6.5, 15.5, 2, 1, legR);
  legRect(C.boots, 6, 16.5, 3, 1.5, legR);

  rect(C.jacket, 2.5, 9, 7, 5);
  rect(C.shirt, 5, 9, 2, 5);
  rect('#fbcfe8', 5.5, 11, 1, 1);

  rect(C.jacket, 1.5, 9.5 + armOffset.y * 0.5, 2, 4);
  rect(C.jacket, 8.5, 9.5 + armOffset.y * 0.5, 2, 4);
  rect(C.skin, 2, 13 + armOffset.y * 0.5, 1.5, 1.5);
  rect(C.skin, 8.5, 13 + armOffset.y * 0.5, 1.5, 1.5);

  rect(C.skin, 2.5, 4, 7, 5);

  if (isBlinking) {
    rect(C.glasses, 3, 6.5, 2, 0.5);
    rect(C.glasses, 7, 6.5, 2, 0.5);
  } else {
    rect('#ffffff', 3, 6, 2, 2);
    rect('#ffffff', 7, 6, 2, 2);
    rect('#2563eb', 4, 6, 1, 2);
    rect('#2563eb', 7, 6, 1, 2);
  }

  rect('#fca5a5', 2.5, 7.5, 1.5, 0.5);
  rect('#fca5a5', 8, 7.5, 1.5, 0.5);
  rect('#be123c', 5.5, 8, 1, 0.5);

  rect(C.hair, 2, 2.5, 8, 2.5);
  rect(C.hair, 1, 4, 2, 6);
  rect(C.hair, 9, 4, 2, 6);

  rect(C.ears, 1.5, 1, 2.5, 2.5);
  rect(C.ears, 8, 1, 2.5, 2.5);
  rect('#374151', 2, 1.5, 1.5, 1.5);

  rect(C.glasses, 2.5, 1.5, 7, 1);
  rect(C.lens, 3, 2, 2.5, 1.5);
  rect(C.lens, 6.5, 2, 2.5, 1.5);
  rect(C.glasses, 5.5, 2, 1, 0.5);

  ctx.restore();
};

// 按图层预分类实体（原来每帧 filter 三次）
interface LayerEntities {
  all: LevelEntity[];        // 当前图层可见（含 BOTH），保持原数组顺序用于绘制
  platforms: LevelEntity[];
  hazards: LevelEntity[];
  pickups: LevelEntity[];
  goals: LevelEntity[];
  ghosts: LevelEntity[];     // 另一图层的实体（虚线提示）
}

const buildLayerEntities = (entities: LevelEntity[], layer: Layer): LayerEntities => {
  const all = entities.filter(e => e.layerMask === 'BOTH' || e.layerMask === layer);
  return {
    all,
    platforms: all.filter(e => e.type === EntityType.PLATFORM),
    hazards: all.filter(e => e.type === EntityType.HAZARD),
    pickups: all.filter(e => e.type === EntityType.COLLECTIBLE_PAGE || e.type === EntityType.COLLECTIBLE_SHARD),
    goals: all.filter(e => e.type === EntityType.GOAL),
    ghosts: entities.filter(e => e.layerMask !== 'BOTH' && e.layerMask !== layer),
  };
};

const GameEngine: React.FC<GameEngineProps> = ({ levelConfig, onFinishLevel, onExit, isGameCleared }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLayer, setCurrentLayer] = useState<Layer>(Layer.REAL);
  const [canSwitch, setCanSwitch] = useState(true);
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());

  const gameStateRef = useRef({
    player: {
      x: levelConfig.playerStart.x,
      y: levelConfig.playerStart.y,
      vx: 0,
      vy: 0,
      w: 40, // Hitbox width
      h: 60, // Hitbox height
      isGrounded: false,
      facingRight: true
    },
    keys: { left: false, right: false },
    camera: { x: 0 },
    collected: new Set<string>(),
    isDead: false,
    lastSwitchTime: 0,
    frame: 0,          // 逻辑帧计数（驱动动画），不再是 React state
    deathCount: 0,     // 用 ref 记录，结算时不会读到过期闭包值
    startTime: Date.now(),
  });

  // 游戏循环内部通过 ref 读取最新值，避免依赖变化导致循环销毁重建
  const layerRef = useRef<Layer>(Layer.REAL);
  const onFinishRef = useRef(onFinishLevel);
  const onExitRef = useRef(onExit);
  useEffect(() => { onFinishRef.current = onFinishLevel; }, [onFinishLevel]);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  // 每关只做一次实体分类；网点背景只生成一次
  const layerEntities = useMemo(() => ({
    [Layer.REAL]: buildLayerEntities(levelConfig.entities, Layer.REAL),
    [Layer.MANGA]: buildLayerEntities(levelConfig.entities, Layer.MANGA),
  }), [levelConfig]);
  const halftoneRef = useRef<HTMLCanvasElement | null>(null);
  if (!halftoneRef.current && typeof document !== 'undefined') {
    halftoneRef.current = createHalftoneCanvas();
  }

  const resetLevel = useCallback(() => {
    const s = gameStateRef.current;
    s.player.x = levelConfig.playerStart.x;
    s.player.y = levelConfig.playerStart.y;
    s.player.vx = 0;
    s.player.vy = 0;
    s.collected.clear();
    s.isDead = false;
    s.frame = 0;
    s.deathCount = 0;
    s.startTime = Date.now();
    layerRef.current = Layer.REAL;
    setCollectedItems(new Set());
    setCurrentLayer(Layer.REAL);
  }, [levelConfig]);

  // Reset state when level changes
  useEffect(() => {
    resetLevel();
  }, [levelConfig, resetLevel]);

  const handleLayerSwitch = useCallback(() => {
    const now = Date.now();
    if (now - gameStateRef.current.lastSwitchTime > LAYER_COOLDOWN) {
      gameStateRef.current.lastSwitchTime = now;
      const next = layerRef.current === Layer.REAL ? Layer.MANGA : Layer.REAL;
      layerRef.current = next;
      setCurrentLayer(next);
      setCanSwitch(false);
      setTimeout(() => setCanSwitch(true), LAYER_COOLDOWN);
    }
  }, []);

  // Handle Input —— 只注册一次，不再随图层切换反复增删监听器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = gameStateRef.current;
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft':
          e.preventDefault();
          if (!s.isDead) s.keys.left = true;
          break;
        case 'KeyD': case 'ArrowRight':
          e.preventDefault();
          if (!s.isDead) s.keys.right = true;
          break;
        case 'Space': case 'KeyW': case 'ArrowUp':
          e.preventDefault();
          if (!s.isDead && s.player.isGrounded) {
            s.player.vy = JUMP_FORCE;
            s.player.isGrounded = false;
          }
          break;
        case 'KeyQ':
          if (!s.isDead) handleLayerSwitch();
          break;
        case 'Escape':
          onExitRef.current();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': gameStateRef.current.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': gameStateRef.current.keys.right = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLayerSwitch]);

  // NEW: Skip Level Function for NG+ (Auto-collect ALL items)
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

  // ---- 主循环：每关只挂载一次，切换图层不会重启循环 ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let animationFrameId = 0;
    let isFinished = false;
    let respawnTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTime = performance.now();
    let accumulator = 0;

    const respawn = () => {
      const s = gameStateRef.current;
      if (s.isDead) return;
      s.isDead = true;
      s.deathCount += 1;
      respawnTimer = setTimeout(() => {
        s.player.x = levelConfig.playerStart.x;
        s.player.y = levelConfig.playerStart.y;
        s.player.vx = 0;
        s.player.vy = 0;
        s.keys.left = false;
        s.keys.right = false;
        s.isDead = false;
      }, 300);
    };

    // 单步逻辑更新（固定 60Hz），返回 true 表示本关结束
    const stepLogic = (): boolean => {
      const state = gameStateRef.current;
      const player = state.player;
      state.frame++;

      if (state.isDead) return false;

      if (state.keys.left) {
        player.vx = -MOVE_SPEED;
        player.facingRight = false;
      } else if (state.keys.right) {
        player.vx = MOVE_SPEED;
        player.facingRight = true;
      } else {
        player.vx = 0;
      }

      const ents = layerEntities[layerRef.current];

      // 水平移动 + 碰撞
      player.vy += GRAVITY;
      player.x += player.vx;
      for (const ent of ents.platforms) {
        if (checkCollision(player, ent)) {
          if (player.vx > 0) player.x = ent.x - player.w;
          else if (player.vx < 0) player.x = ent.x + ent.w;
          player.vx = 0;
        }
      }

      // 垂直移动 + 碰撞
      player.y += player.vy;
      player.isGrounded = false;
      for (const ent of ents.platforms) {
        if (checkCollision(player, ent)) {
          if (player.vy > 0) {
            player.y = ent.y - player.h;
            player.isGrounded = true;
            player.vy = 0;
          } else if (player.vy < 0) {
            player.y = ent.y + ent.h;
            player.vy = 0;
          }
        }
      }

      // 危险物
      for (const ent of ents.hazards) {
        if (checkCollision(player, ent)) {
          respawn();
          return false;
        }
      }

      // 收集品
      for (const ent of ents.pickups) {
        if (!state.collected.has(ent.id) && checkCollision(player, ent)) {
          state.collected.add(ent.id);
          setCollectedItems(new Set(state.collected));
        }
      }

      // 终点
      for (const ent of ents.goals) {
        if (checkCollision(player, ent)) {
          isFinished = true;
          onFinishRef.current({
            levelId: levelConfig.id,
            timeTaken: Date.now() - state.startTime,
            deathCount: state.deathCount,
            collectedIds: Array.from(state.collected)
          });
          return true;
        }
      }

      if (player.y > 800) respawn();
      return false;
    };

    const draw = () => {
      const state = gameStateRef.current;
      const player = state.player;
      const layer = layerRef.current;
      const ents = layerEntities[layer];
      const frame = state.frame;

      state.camera.x = player.x - 400;
      if (state.camera.x < 0) state.camera.x = 0;

      ctx.fillStyle = layer === Layer.REAL ? '#FEF7CD' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (layer === Layer.MANGA && halftoneRef.current) {
        // 预渲染好的网点图，一次 drawImage 搞定
        ctx.drawImage(halftoneRef.current, 0, 0);
      }

      ctx.save();
      ctx.translate(-state.camera.x, 0);

      ents.all.forEach(ent => {
        if (state.collected.has(ent.id)) return;

        if (ent.type === EntityType.PLATFORM) {
          if (layer === Layer.MANGA) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
            ctx.beginPath();
            ctx.moveTo(ent.x + 10, ent.y);
            ctx.lineTo(ent.x + 10, ent.y + ent.h);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#93C5FD';
            ctx.fillRect(ent.x, ent.y, ent.w, ent.h);

            ctx.fillStyle = '#F0ABFC';
            ctx.fillRect(ent.x, ent.y, ent.w, 8);

            ctx.strokeStyle = '#1E3A8A';
            ctx.lineWidth = 2;
            ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
          }
        } else if (ent.type === EntityType.HAZARD) {
          ctx.fillStyle = '#FDA4AF';
          for (let sx = ent.x; sx < ent.x + ent.w; sx += 20) {
            ctx.beginPath();
            ctx.moveTo(sx, ent.y + ent.h);
            ctx.lineTo(sx + 10, ent.y);
            ctx.lineTo(sx + 20, ent.y + ent.h);
            ctx.fill();
          }
        } else if (ent.type === EntityType.GOAL) {
          ctx.fillStyle = '#fbbf24';
          ctx.globalAlpha = 0.6;
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
        } else if (ent.type === EntityType.COLLECTIBLE_PAGE) {
          const floatY = Math.sin(frame * 0.1) * 3;
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(ent.x, ent.y + floatY, ent.w, ent.h);
          ctx.fillStyle = 'white';
          ctx.fillRect(ent.x + 4, ent.y + floatY + 4, ent.w - 8, ent.h - 8);
        } else if (ent.type === EntityType.COLLECTIBLE_SHARD) {
          const floatY = Math.sin(frame * 0.1 + 2) * 3;
          ctx.fillStyle = '#60A5FA';
          ctx.beginPath();
          const cy = ent.y + floatY;
          ctx.moveTo(ent.x + ent.w / 2, cy);
          ctx.lineTo(ent.x + ent.w, cy + ent.h / 2);
          ctx.lineTo(ent.x + ent.w / 2, cy + ent.h);
          ctx.lineTo(ent.x, cy + ent.h / 2);
          ctx.fill();
        } else if (ent.type === EntityType.TEXT) {
          // Render Text Easter Egg
          ctx.font = 'bold 20px "Noto Sans SC"';
          ctx.fillStyle = ent.color || '#000000';
          const floatY = Math.sin(frame * 0.05 + ent.x) * 5;
          ctx.fillText(ent.text || '', ent.x, ent.y + floatY);
        } else if (ent.type === EntityType.NPC) {
          drawNovus(ctx, ent.x, ent.y, ent.w, ent.h, frame, player.x);
        }
      });

      if (!state.isDead) {
        drawDousha(
          ctx,
          player.x,
          player.y,
          player.w,
          player.h,
          player.facingRight,
          frame,
          player.vx,
          player.vy,
          player.isGrounded
        );
      }

      // 另一图层的"幽灵"轮廓提示
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const ent of ents.ghosts) {
        if (state.collected.has(ent.id)) continue;
        if (ent.type === EntityType.PLATFORM) {
          ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
        }
      }
      ctx.setLineDash([]);

      ctx.restore();
    };

    const loop = (now: number) => {
      if (isFinished) return;

      // 固定时间步长 + 累加器：物理与显示刷新率解耦
      accumulator += Math.min(now - lastTime, MAX_FRAME_DELTA);
      lastTime = now;

      while (accumulator >= LOGIC_STEP) {
        accumulator -= LOGIC_STEP;
        if (stepLogic()) return; // 到达终点，停止循环
      }

      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (respawnTimer !== undefined) clearTimeout(respawnTimer);
    };
  }, [levelConfig, layerEntities]);

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
         {/* Collectibles HUD */}
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

         {/* Skip Button for NG+ */}
         {isGameCleared && (
           <button
              onClick={handleSkipLevel}
              title="跳过本关 (二周目特权)"
              className="p-2 bg-pink-500 border-4 border-pink-700 text-white retro-border shadow-lg hover:bg-pink-400 animate-pulse"
           >
               <FastForward size={20} /> <span className="text-xs ml-1 hidden md:inline">跳过</span>
           </button>
         )}

         {/* Control Buttons */}
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
         [WASD/Space] 移动/跳跃 | [Q] 切换次元 | {levelConfig.name}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`border-4 transition-all duration-300 shadow-2xl ${
            currentLayer === Layer.MANGA ? 'border-black bg-white filter grayscale contrast-125' : 'border-blue-900 bg-[#FEF7CD]'
        }`}
      />
    </div>
  );
};

export default GameEngine;
