// ============================================================
// 第一章引擎：640×360 像素画布，整数倍放大。
// 现实层 / 漫画层切换时，新图层以「墨水圆」从豆沙身上扩散开。
// 文字（弹幕、拟声词、提示、气泡）走 DOM 叠加层，保证清晰。
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Sparkles, Pause, Headphones } from 'lucide-react';
import { openWalkman } from './Walkman';
import { Level2D, pageIdFor, shardIdFor } from '../game2d/levels';
import { World, Body, newBody, step, fitAfterSwitch, PH, TILE, L } from '../game2d/physics';
import { buildStatic, getBackground, SPR, moverSprite, VIEW_W, VIEW_H, StaticLayers } from '../game2d/world';
import { getSprites, novusWave, SPR_W, SPR_H, Anim } from '../game2d/sprites';
import { TALKS_CH1 } from '../story/barks';
import { LevelResult } from '../types';
import { sfx } from '../core/audio';
import { score } from '../core/score';
import { getSave, hasSeen } from '../core/save';
import PauseMenu from './ui/PauseMenu';

interface Props {
  level: Level2D;
  cleared: boolean;                 // 第一章已通关（二周目）
  paused: boolean;                  // 外部剧情覆盖时暂停
  onFinish: (r: LevelResult) => void;
  onExit: () => void;
  onMoment: (scene: string) => void;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; grav: number }

const LAYER_CD = 380;

const GameEngine: React.FC<Props> = ({ level, cleared, paused, onFinish, onExit, onMoment }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  const [layer, setLayer] = useState<L>('R');
  useEffect(() => { score.setLayer(layer === 'M' ? 'manga' : 'real'); return () => score.setLayer('real'); }, [layer]);
  const [got, setGot] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [titleCard, setTitleCard] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const pausedRef = useRef(paused);
  const menuRef = useRef(menu);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { menuRef.current = menu; }, [menu]);
  const cbRef = useRef({ onFinish, onExit, onMoment });
  useEffect(() => { cbRef.current = { onFinish, onExit, onMoment }; }, [onFinish, onExit, onMoment]);

  // 适配窗口：尽量整数倍放大
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const raw = Math.min(w / VIEW_W, h / VIEW_H);
      // 够大时取整数倍（像素更干净），小屏直接按比例
      setScale(raw >= 2 ? Math.floor(raw) + (raw % 1 > 0.5 ? 0.5 : 0) : raw);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    setTitleCard(true);
    const t = setTimeout(() => setTitleCard(false), 2600);
    return () => clearTimeout(t);
  }, [level, restartKey]);

  // ======================= 主循环 =======================
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const prev = document.createElement('canvas');
    prev.width = VIEW_W; prev.height = VIEW_H;
    const pctx = prev.getContext('2d')!;
    pctx.imageSmoothingEnabled = false;

    const world = new World(level);
    const statics: StaticLayers = buildStatic(level);
    const bg = getBackground(level.theme);
    const LW = world.w * TILE, LH = world.h * TILE;

    // ---- 关卡物件 ----
    const items: { id: string; kind: 'p' | 's'; x: number; y: number; got: boolean }[] = [];
    const checkpoints: { x: number; y: number; on: boolean }[] = [];
    let start = { x: 0, y: 0 }, goal = { x: 0, y: 0 }, npc: { x: number; y: number } | null = null;
    let shardN = 0;
    level.map.forEach((row, ty) => row.split('').forEach((c, tx) => {
      if (c === 'P') start = { x: tx * TILE + 3, y: (ty + 1) * TILE - PH.h };
      if (c === 'G') goal = { x: tx * TILE, y: (ty + 1) * TILE };
      if (c === 'N') npc = { x: tx * TILE + 8, y: (ty + 1) * TILE };
      if (c === 'C') checkpoints.push({ x: tx * TILE + 8, y: (ty + 1) * TILE, on: false });
      if (c === 'p') items.push({ id: pageIdFor(level.id), kind: 'p', x: tx * TILE + 8, y: ty * TILE + 8, got: false });
      if (c === 's') items.push({ id: shardIdFor(level.id, ++shardN), kind: 's', x: tx * TILE + 8, y: ty * TILE + 8, got: false });
    }));
    const signs = level.ents.flatMap((e, i) => e.t === 'sign' ? [{ ...e, i }] : []);
    const hints = level.ents.flatMap(e => e.t === 'hint' ? [e] : []);
    const moments = level.ents.flatMap(e => e.t === 'moment' ? [e] : []);
    const isDoor = level.theme === 'rooftop';

    // ---- 状态 ----
    let body: Body = newBody(start.x, start.y);
    let spawn = { ...start };
    let lay: L = 'R';
    let t = 0, frame = 0;
    let deaths = 0;
    let dead = 0;               // 死亡倒计时（帧）
    let landT = 0;              // 落地压缩
    let switchT = 1;            // 图层切换过场 0→1
    let lastSwitch = 0;
    let switchedOnce = false;
    let finished = false;
    let blinkT = 120;
    let npcTalkI = 0;
    const camera = { x: 0, y: 0 };
    const keys = { l: false, r: false, held: false, down: false };
    let jumpPressed = false;
    const particles: Particle[] = [];
    const startTime = performance.now();
    const seenMoments = new Set<string>();
    setLayer('R'); setGot([]); setFinishing(false);

    // ---- DOM 叠加层 ----
    const overlay = overlayRef.current!;
    overlay.innerHTML = '';
    const mkEl = (cls: string, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; overlay.appendChild(d); return d; };
    const promptEl = mkEl('absolute pointer-events-none px-2 py-0.5 text-[11px] font-bold bg-white border-2 border-ink text-ink whitespace-nowrap hidden');
    const bubbleEl = mkEl('absolute pointer-events-none max-w-[220px] px-3 py-1.5 text-sm font-bold bg-white border-2 border-ink-black text-ink-black rounded-xl hidden');
    const hintEls = hints.map(h => mkEl('absolute pointer-events-none px-2 py-1 text-xs font-bold text-white bg-ink/80 rounded hidden', h.text));
    const moverLabels = world.movers.map(m => {
      const e = level.ents[m.i] as any;
      if (!e.text) return null;
      const el = mkEl('absolute pointer-events-none whitespace-nowrap font-bold', e.text);
      return el;
    });
    let bubbleTimer = 0;
    const say = (text: string, frames = 200) => { bubbleEl.textContent = text; bubbleTimer = frames; };

    const sfxText = (text: string, wx: number, wy: number, size = 18) => {
      if (lay !== 'M') return;
      const el = mkEl('absolute pointer-events-none font-display text-ink-black', text);
      el.style.fontSize = `${size * Math.max(0.7, scaleRef.current / 2)}px`;
      el.style.webkitTextStroke = '3px white';
      el.style.paintOrder = 'stroke fill';
      el.style.transform = `rotate(${(Math.random() - 0.5) * 24}deg)`;
      el.style.left = `${(wx - camera.x) * scaleRef.current}px`;
      el.style.top = `${(wy - camera.y) * scaleRef.current}px`;
      el.animate([{ opacity: 0, translate: '0 6px', scale: '0.6' }, { opacity: 1, translate: '0 0', scale: '1.1', offset: 0.2 }, { opacity: 1, scale: '1', offset: 0.7 }, { opacity: 0, translate: '0 -10px' }], { duration: 700, easing: 'ease-out' });
      setTimeout(() => el.remove(), 720);
    };

    // 氛围弹幕（屏幕坐标）
    let danmakuTimer = 60;
    const spawnDanmaku = () => {
      const pool = level.ambientDanmaku!;
      const text = pool[Math.floor(Math.random() * pool.length)];
      const el = mkEl('absolute pointer-events-none whitespace-nowrap font-bold', text);
      el.style.top = `${(8 + Math.random() * 30)}%`;
      el.style.left = '100%';
      el.style.fontSize = `${Math.max(12, scaleRef.current * 7)}px`;
      el.style.color = lay === 'M' ? '#16182a' : '#ffffff';
      el.style.textShadow = lay === 'M' ? '0 0 2px #fff, 0 0 2px #fff' : '0 1px 2px rgba(0,0,0,.6)';
      const dur = 6000 + Math.random() * 3000;
      el.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${VIEW_W * scaleRef.current + 400}px)` }], { duration: dur, easing: 'linear' });
      setTimeout(() => el.remove(), dur);
    };

    const burst = (x: number, y: number, col: string, n: number, spd = 1.6, grav = 0.08) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * spd;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.6, life: 30 + Math.random() * 20, max: 50, col, size: Math.random() > 0.7 ? 2 : 1, grav });
      }
    };

    const doSwitch = () => {
      const now = performance.now();
      if (now - lastSwitch < LAYER_CD || dead) return;
      const nl: L = lay === 'R' ? 'M' : 'R';
      if (!fitAfterSwitch(body, world, nl)) { sfx('back'); return; }
      // 记下旧画面，用于墨水扩散过场
      pctx.drawImage(canvas, 0, 0);
      lastSwitch = now;
      lay = nl;
      setLayer(nl);
      switchT = 0;
      sfx(nl === 'M' ? 'switch' : 'switchBack');
      if (nl === 'M') {
        sfxText('唰——', body.x + 10, body.y - 6, 20);
        if (!switchedOnce && level.firstSwitchScene && !hasSeen(level.firstSwitchScene)) {
          setTimeout(() => cbRef.current.onMoment(level.firstSwitchScene!), 450);
        }
        switchedOnce = true;
      }
    };

    const die = () => {
      if (dead) return;
      dead = 46;
      deaths++;
      sfx('death');
      burst(body.x + 5, body.y + 12, lay === 'M' ? '#16182a' : '#f472b6', 26, 2.4, 0.1);
      sfxText('啪！', body.x, body.y, 22);
    };
    const respawn = () => {
      body = newBody(spawn.x, spawn.y);
      dead = 0;
      sfx('respawn');
      burst(body.x + 5, body.y + 12, lay === 'M' ? '#16182a' : '#93c5fd', 14, 1.2);
    };

    const finish = (skipped = false) => {
      if (finished) return;
      finished = true;
      sfx('goal');
      setFinishing(true);
      const collected = items.filter(i => i.got).map(i => i.id);
      setTimeout(() => cbRef.current.onFinish({
        chapter: 1, levelId: level.id, timeTaken: performance.now() - startTime, deathCount: deaths,
        collectedIds: skipped ? items.map(i => i.id) : collected, skipped,
      }), 700);
    };
    skipRef.current = () => finish(true);
    if (import.meta.env.DEV) (window as any).__g2 = { tp: (x: number, y: number) => { body.x = x; body.y = y; body.vx = body.vy = 0; }, goal, items };

    // ---- 输入 ----
    const kd = (e: KeyboardEvent) => {
      if (menuRef.current || pausedRef.current) return;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.l = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keys.r = true; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': keys.down = true; e.preventDefault(); break;
        case 'Space': case 'ArrowUp': case 'KeyW': case 'KeyK':
          e.preventDefault();
          if (!e.repeat) jumpPressed = true;
          keys.held = true; break;
        case 'KeyQ': case 'KeyJ': if (!e.repeat) doSwitch(); break;
        case 'KeyE': case 'Enter': if (!e.repeat) interact(); break;
        case 'Escape': e.preventDefault(); setMenu(true); keys.l = keys.r = keys.held = keys.down = false; break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': keys.l = false; break;
        case 'ArrowRight': case 'KeyD': keys.r = false; break;
        case 'ArrowDown': case 'KeyS': keys.down = false; break;
        case 'Space': case 'ArrowUp': case 'KeyW': case 'KeyK': keys.held = false; break;
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // 互动：说明牌 / 室友姐
    let nearSign: (typeof signs)[number] | null = null;
    let nearNpc = false;
    const interact = () => {
      if (nearNpc && npc) {
        const lines = TALKS_CH1[level.id] ?? ['……'];
        say(lines[npcTalkI % lines.length], 220);
        npcTalkI++;
        sfx('click');
        return;
      }
      if (nearSign) {
        const text = lay === 'M' && nearSign.manga ? nearSign.manga : nearSign.text;
        setCaption(text);
        sfx('page');
        if (captionTimer) clearTimeout(captionTimer);
        captionTimer = setTimeout(() => setCaption(null), 4200);
      }
    };
    let captionTimer: ReturnType<typeof setTimeout> | null = null;

    // ======================= 逻辑步 =======================
    const logic = () => {
      t += 1 / 60; frame++;
      world.updateMovers(t);
      if (dead) { dead--; if (dead === 0) respawn(); return; }
      if (finished) return;
      const ev = step(body, { l: keys.l, r: keys.r, jump: jumpPressed, held: keys.held, down: keys.down }, world, lay);
      jumpPressed = false;
      if (ev.jumped) { sfx('jump'); sfxText('跳！', body.x - 6, body.y - 4, 16); }
      if (ev.bounced) { sfx('bounce'); sfxText('嘭——！', body.x - 4, body.y + 10, 22); burst(body.x + 5, body.y + PH.h, '#fbcfe8', 12, 1.5); }
      if (ev.landed !== undefined) {
        landT = 6;
        if (ev.landed > 4) { sfx('land'); sfxText('咚', body.x + 4, body.y + 10, 14); burst(body.x + 5, body.y + PH.h, lay === 'M' ? '#9a9aa6' : '#e2e8f0', 6, 0.8, 0.02); }
      }
      if (ev.died) { die(); return; }

      // 收集
      const cx = body.x + PH.w / 2, cy = body.y + PH.h / 2;
      for (const it of items) {
        if (it.got) continue;
        if (Math.abs(it.x - cx) < 12 && Math.abs(it.y - cy) < 16) {
          it.got = true;
          setGot(items.filter(i => i.got).map(i => i.id));
          if (it.kind === 'p') { sfx('page'); burst(it.x, it.y, lay === 'M' ? '#16182a' : '#f472b6', 22, 1.8); sfxText('哗啦', it.x, it.y - 10, 18); }
          else { sfx('candy'); burst(it.x, it.y, lay === 'M' ? '#16182a' : '#93c5fd', 14, 1.4); sfxText('叮！', it.x, it.y - 10, 16); }
        }
      }
      // 书签存档
      for (const c of checkpoints) {
        if (c.on) continue;
        if (Math.abs(c.x - cx) < 12 && Math.abs((c.y - 14) - cy) < 22) {
          checkpoints.forEach(o => { o.on = o === c ? true : o.on; });
          c.on = true;
          spawn = { x: c.x - PH.w / 2, y: c.y - PH.h };
          sfx('checkpoint');
          burst(c.x, c.y - 24, lay === 'M' ? '#16182a' : '#f472b6', 16, 1.4);
        }
      }
      // 剧情触发区
      for (const m of moments) {
        if (seenMoments.has(m.scene)) continue;
        if (m.layer && m.layer !== 'B' && m.layer !== lay) continue;
        const inZone = cx > m.x * TILE && cx < (m.x + m.w) * TILE && cy > m.y * TILE && cy < (m.y + m.h) * TILE;
        if (inZone) {
          seenMoments.add(m.scene);
          if (!hasSeen(m.scene)) { cbRef.current.onMoment(m.scene); keys.l = keys.r = false; }
        }
      }
      // 终点
      if (Math.abs(cx - (goal.x + 8)) < 16 && cy > goal.y - 52 && cy < goal.y) finish();

      // 附近可互动
      nearSign = null; nearNpc = false;
      for (const s of signs) {
        const sx = s.x * TILE + 12, sy = (s.y + 1) * TILE - 16;
        if (Math.abs(sx - cx) < 22 && Math.abs(sy - cy) < 30) nearSign = s;
      }
      if (npc && Math.abs(npc.x - cx) < 26 && Math.abs(npc.y - 14 - cy) < 26) nearNpc = true;

      if (level.ambientDanmaku && --danmakuTimer <= 0) { spawnDanmaku(); danmakuTimer = 70 + Math.random() * 90; }
      if (bubbleTimer > 0) bubbleTimer--;
      if (landT > 0) landT--;
      if (--blinkT < 0) blinkT = 150 + Math.random() * 120;
    };

    // ======================= 绘制 =======================
    const ambient = (c: CanvasRenderingContext2D, kind: string) => {
      if (kind === 'stars') {
        for (let i = 0; i < 40; i++) {
          const sx = ((i * 97 + 13) % VIEW_W + VIEW_W - (camera.x * 0.05) % VIEW_W) % VIEW_W;
          const sy = (i * 53) % 150;
          const tw = Math.sin(t * 2 + i) > 0.6;
          c.fillStyle = tw ? '#fff8d6' : '#c9d2ff';
          c.fillRect(Math.round(sx), sy, tw ? 2 : 1, tw ? 2 : 1);
        }
      } else if (kind === 'fireflies') {
        for (let i = 0; i < 18; i++) {
          const fx = ((i * 211) % (LW) + Math.sin(t * 0.6 + i) * 30) - camera.x;
          const fy = 200 + (i * 37) % 120 + Math.sin(t * 0.9 + i * 2) * 14 - camera.y;
          if (fx < -10 || fx > VIEW_W + 10) continue;
          const a = 0.5 + 0.5 * Math.sin(t * 3 + i);
          c.fillStyle = `rgba(255,240,140,${0.25 * a})`; c.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 5, 5);
          c.fillStyle = `rgba(255,250,200,${a})`; c.fillRect(Math.round(fx), Math.round(fy), 1, 1);
        }
      } else if (kind === 'dust') {
        for (let i = 0; i < 24; i++) {
          const dx = ((i * 131 + t * 6 * (1 + i % 3)) % VIEW_W);
          const dy = (i * 71 + Math.sin(t + i) * 10) % VIEW_H;
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(Math.round(dx), Math.round(dy), 1, 1);
        }
      } else if (kind === 'hearts') {
        for (let i = 0; i < 10; i++) {
          const hx = (i * 173 + 40) % VIEW_W;
          const hy = VIEW_H - ((t * 14 + i * 47) % (VIEW_H + 20));
          c.fillStyle = lay === 'M' ? 'rgba(22,24,42,0.35)' : 'rgba(244,114,182,0.45)';
          c.fillRect(hx, hy, 2, 2); c.fillRect(hx + 3, hy, 2, 2); c.fillRect(hx - 1, hy + 1, 7, 2); c.fillRect(hx, hy + 3, 5, 1); c.fillRect(hx + 1, hy + 4, 3, 1); c.fillRect(hx + 2, hy + 5, 1, 1);
        }
      }
    };

    const drawScene = (c: CanvasRenderingContext2D, L_: L) => {
      const ink = L_ === 'M';
      const B = ink ? bg.ink : bg.real;
      c.drawImage(B.sky, 0, 0);
      if (!ink) ambient(c, B.ambient === 'stars' ? 'stars' : 'none');
      for (const l of B.layers) {
        const w = l.img.width;
        let ox = -((camera.x * l.factor) % w);
        if (ox > 0) ox -= w;
        const oy = Math.round(l.y - (camera.y * l.factor * 0.5));
        for (let x = Math.round(ox); x < VIEW_W; x += w) c.drawImage(l.img, x, oy);
      }
      // 现实层灯光
      if (!ink) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (const g of statics.glows) {
          const gx = g.x - camera.x, gy = g.y - camera.y;
          if (gx < -g.r || gx > VIEW_W + g.r) continue;
          const grd = c.createRadialGradient(gx, gy, 0, gx, gy, g.r);
          grd.addColorStop(0, g.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = grd; c.fillRect(gx - g.r, gy - g.r, g.r * 2, g.r * 2);
        }
        c.restore();
      }
      const sx = Math.round(camera.x), sy = Math.round(camera.y);
      const src = ink ? statics.manga : statics.real;
      c.drawImage(src, Math.max(0, sx), Math.max(0, sy), VIEW_W, VIEW_H, Math.max(0, -sx), Math.max(0, -sy), VIEW_W, VIEW_H);
      c.drawImage(ink ? statics.ghostManga : statics.ghostReal, Math.max(0, sx), Math.max(0, sy), VIEW_W, VIEW_H, Math.max(0, -sx), Math.max(0, -sy), VIEW_W, VIEW_H);

      // 移动平台
      world.movers.forEach((m, k) => {
        const active = world.moverActive(m, L_);
        const e = level.ents[m.i] as any;
        const sp = moverSprite(e.style ?? 'box', e.w, e.color);
        c.globalAlpha = active ? 1 : 0.25;
        c.drawImage(ink ? sp.ink : sp.col, Math.round(m.x - camera.x), Math.round(m.y - camera.y));
        c.globalAlpha = 1;
        const lbl = moverLabels[k];
        if (lbl && L_ === lay) {
          lbl.style.left = `${(m.x - camera.x + 4) * scaleRef.current}px`;
          lbl.style.top = `${(m.y - camera.y - (e.style === 'danmaku' ? 2 : 0)) * scaleRef.current}px`;
          lbl.style.fontSize = `${Math.max(11, scaleRef.current * 6.5)}px`;
          lbl.style.opacity = active ? '1' : '0.3';
          if (e.style === 'danmaku') {
            lbl.style.color = ink ? '#16182a' : (e.color ?? '#fff');
            lbl.style.textShadow = ink ? '0 0 3px #fff, 0 0 3px #fff' : '0 1px 2px rgba(0,0,0,.7)';
          } else { lbl.style.color = ink ? '#16182a' : '#1e3a8a'; lbl.style.fontSize = `${Math.max(9, scaleRef.current * 4.5)}px`; }
        }
      });

      // 收集品
      for (const it of items) {
        if (it.got) continue;
        const bob = Math.sin(t * 3 + it.x) * 2;
        if (it.kind === 'p') c.drawImage(ink ? SPR.page.ink : SPR.page.col, Math.round(it.x - 7 - camera.x), Math.round(it.y - 9 + bob - camera.y));
        else {
          const f = SPR.shard[Math.floor(t * 8 + it.x) % 4];
          c.drawImage(ink ? f.ink : f.col, Math.round(it.x - 6 - camera.x), Math.round(it.y - 6 + bob - camera.y));
        }
      }
      // 书签
      for (const cp of checkpoints) {
        const s = cp.on ? SPR.bookmarkOn : SPR.bookmarkOff;
        c.drawImage(ink ? s.ink : s.col, Math.round(cp.x - 7 - camera.x), Math.round(cp.y - 30 - camera.y + (cp.on ? Math.sin(t * 2) : 0)));
      }
      // 终点
      {
        const s = isDoor ? SPR.door : SPR.pageCurl;
        const gx = Math.round(goal.x + 8 - s.col.width / 2 - camera.x), gy = Math.round(goal.y - s.col.height - camera.y);
        if (!ink) {
          c.save(); c.globalCompositeOperation = 'lighter';
          const grd = c.createRadialGradient(gx + s.col.width / 2, gy + s.col.height / 2, 0, gx + s.col.width / 2, gy + s.col.height / 2, 60);
          grd.addColorStop(0, `rgba(255,240,180,${0.35 + Math.sin(t * 2) * 0.1})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = grd; c.fillRect(gx - 40, gy - 40, s.col.width + 80, s.col.height + 80);
          c.restore();
        }
        c.drawImage(ink ? s.ink : s.col, gx, gy);
      }
      // 室友姐
      if (npc) {
        const nx = npc.x, ny = npc.y;
        const near = Math.abs(body.x - nx) < 90;
        const img = near ? novusWave(ink, Math.floor(t * 4) % 2) : getSprites('novus', ink).frames.idle[Math.floor(t * 1.6) % 2][body.x < nx ? 1 : 0];
        c.drawImage(img, Math.round(nx - SPR_W / 2 - camera.x), Math.round(ny - SPR_H + 1 - camera.y));
      }
      // 豆沙
      if (!dead) {
        const set = getSprites('dousha', ink);
        let anim: Anim = 'idle', fi = 0;
        if (!body.ground) anim = body.vy < 0 ? 'jump' : 'fall';
        else if (landT > 3) anim = 'land';
        else if (Math.abs(body.vx) > 0.3) { anim = 'run'; fi = Math.floor(frame / 5) % 6; }
        else { anim = blinkT < 8 ? 'blink' : 'idle'; fi = anim === 'idle' ? Math.floor(frame / 32) % 2 : 0; }
        const fr = set.frames[anim][fi][body.facing > 0 ? 0 : 1];
        c.drawImage(fr, Math.round(body.x + PH.w / 2 - SPR_W / 2 - camera.x), Math.round(body.y + PH.h - (SPR_H - 1) - camera.y));
      }
      // 粒子
      for (const p of particles) {
        c.globalAlpha = Math.max(0, p.life / p.max);
        c.fillStyle = p.col;
        c.fillRect(Math.round(p.x - camera.x), Math.round(p.y - camera.y), p.size, p.size);
      }
      c.globalAlpha = 1;
      if (!ink) ambient(c, B.ambient === 'stars' ? 'none' : B.ambient);
      else ambient(c, B.ambient);

      // 漫画层：分镜框
      if (ink) {
        c.fillStyle = '#16182a';
        c.fillRect(0, 0, VIEW_W, 4); c.fillRect(0, VIEW_H - 4, VIEW_W, 4);
        c.fillRect(0, 0, 4, VIEW_H); c.fillRect(VIEW_W - 4, 0, 4, VIEW_H);
        c.fillStyle = '#ffffff';
        c.fillRect(4, 4, VIEW_W - 8, 2); c.fillRect(4, VIEW_H - 6, VIEW_W - 8, 2);
        c.fillRect(4, 4, 2, VIEW_H - 8); c.fillRect(VIEW_W - 6, 4, 2, VIEW_H - 8);
      }
    };

    const updateOverlay = () => {
      const s = scaleRef.current;
      const cx = body.x + PH.w / 2;
      // 提示
      hints.forEach((h, k) => {
        const el = hintEls[k];
        const show = getSave().settings.hints && Math.abs(h.x * TILE - cx) < 140;
        el.classList.toggle('hidden', !show);
        if (show) { el.style.left = `${(h.x * TILE - camera.x) * s}px`; el.style.top = `${(h.y * TILE - camera.y) * s}px`; }
      });
      // 互动提示
      const target = nearNpc && npc ? { x: npc.x, y: npc.y - 46, t: 'E  说话' } : nearSign ? { x: nearSign.x * TILE + 12, y: (nearSign.y + 1) * TILE - 52, t: 'E  查看' } : null;
      promptEl.classList.toggle('hidden', !target || dead > 0);
      if (target) { promptEl.textContent = target.t; promptEl.style.left = `${(target.x - camera.x) * s - 22}px`; promptEl.style.top = `${(target.y - camera.y) * s}px`; }
      // 室友姐的气泡
      bubbleEl.classList.toggle('hidden', bubbleTimer <= 0 || !npc);
      if (npc && bubbleTimer > 0) {
        bubbleEl.style.left = `${(npc.x - camera.x) * s - 60}px`;
        bubbleEl.style.top = `${(npc.y - 64 - camera.y) * s - 10}px`;
      }
    };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!pausedRef.current && !menuRef.current) {
        acc += dt;
        while (acc >= 1000 / 60) {
          acc -= 1000 / 60;
          logic();
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.97; p.life--;
            if (p.life <= 0) particles.splice(i, 1);
          }
        }
      } else acc = 0;
      // 相机
      const tx = body.x + PH.w / 2 - VIEW_W * 0.42 + body.facing * 30;
      const ty = body.y - VIEW_H * 0.55;
      camera.x += (tx - camera.x) * 0.12;
      camera.y += (ty - camera.y) * 0.1;
      camera.x = Math.max(0, Math.min(LW - VIEW_W, camera.x));
      camera.y = Math.max(Math.min(0, LH - VIEW_H), Math.min(LH - VIEW_H, camera.y));

      drawScene(ctx, lay);
      if (switchT < 1) {
        switchT = Math.min(1, switchT + dt / 320);
        const r = switchT * Math.hypot(VIEW_W, VIEW_H);
        const ox = body.x + PH.w / 2 - camera.x, oy = body.y + PH.h / 2 - camera.y;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.arc(ox, oy, r, 0, Math.PI * 2, true);
        ctx.clip('evenodd');
        ctx.drawImage(prev, 0, 0);
        ctx.restore();
        // 墨水边缘的网点
        ctx.fillStyle = '#16182a';
        for (let a = 0; a < Math.PI * 2; a += 0.06) {
          const rr = r + (Math.sin(a * 7 + switchT * 9) * 4);
          ctx.fillRect(Math.round(ox + Math.cos(a) * rr), Math.round(oy + Math.sin(a) * rr), 2, 2);
        }
      }
      updateOverlay();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      if (captionTimer) clearTimeout(captionTimer);
      overlay.innerHTML = '';
    };
  }, [level, restartKey]);

  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  const skipRef = useRef<() => void>(() => {});

  const pages = got.filter(g => g.startsWith('page')).length;
  const shards = got.filter(g => g.startsWith('shard')).length;
  const totalShards = level.map.join('').split('').filter(c => c === 's').length;
  const hasPage = level.map.some(r => r.includes('p'));
  const W = VIEW_W * scale, H = VIEW_H * scale;
  const num = level.title.split(' · ')[0];
  const name = level.title.split(' · ')[1] ?? level.title;

  return (
    <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${layer === 'M' ? 'bg-white' : 'bg-ink-black'}`}>
      <div ref={wrapRef} className="relative" style={{ width: W, height: H }}>
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="pixel block" style={{ width: W, height: H }} />
        <div ref={overlayRef} className="absolute inset-0 overflow-hidden pointer-events-none" />

        {/* HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <div className={`px-3 py-1 text-sm font-display border-2 ${layer === 'M' ? 'bg-ink-black text-white border-white' : 'bg-white text-ink border-ink'}`}
               style={{ boxShadow: `3px 3px 0 0 ${layer === 'M' ? '#fff' : '#1e3a8a'}` }}>
            {layer === 'M' ? '漫画' : '现实'}
          </div>
          {hasPage && (
            <div className="px-2 py-1 bg-white border-2 border-ink text-sakura text-xs font-bold flex items-center gap-1">
              <BookOpen size={13} /> {pages}/1
            </div>
          )}
          <div className="px-2 py-1 bg-white border-2 border-ink text-dou text-xs font-bold flex items-center gap-1">
            <Sparkles size={13} /> {shards}/{totalShards}
          </div>
        </div>
        <button onClick={(e) => { e.currentTarget.blur(); openWalkman(); }} className="btn absolute top-3 right-14 w-9 h-9 pointer-events-auto" aria-label="随身听（M）" title="随身听（M）">
          <Headphones size={16} />
        </button>
        <button onClick={() => setMenu(true)} className="btn absolute top-3 right-3 w-9 h-9 pointer-events-auto" aria-label="暂停">
          <Pause size={16} />
        </button>

        {/* 关卡标题卡 */}
        {titleCard && (
          <div className="absolute left-0 right-0 top-[18%] flex justify-center pointer-events-none">
            <div className="anim-pop text-center">
              <div className="inline-block bg-ink-black text-white font-display text-xl px-4 py-1 -rotate-2">{num}</div>
              <div className="font-display text-4xl md:text-5xl text-ink mt-2" style={{ WebkitTextStroke: '6px white', paintOrder: 'stroke fill' }}>{name}</div>
              <div className="mt-2 inline-block bg-white/90 border-2 border-ink px-3 py-0.5 text-sm text-ink">{level.sub}</div>
            </div>
          </div>
        )}

        {/* 说明牌字幕 */}
        {caption && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[min(90%,560px)] pointer-events-none anim-up">
            <div className={`px-4 py-3 border-[3px] text-base font-bold ${layer === 'M' ? 'bg-white border-ink-black text-ink-black' : 'bg-paper-2 border-ink text-ink'}`}
                 style={{ boxShadow: '4px 4px 0 0 #16182a' }}>
              {caption}
            </div>
          </div>
        )}

        {/* 翻页过场 */}
        {finishing && (
          <div className="absolute inset-0 bg-paper pointer-events-none" style={{ animation: 'ink-wipe .7s ease-in forwards' }} />
        )}
      </div>

      {menu && (
        <PauseMenu
          chapterLabel="第一章 · 漫画的世界"
          title={level.title}
          stats={<span>百合页 {pages}/{hasPage ? 1 : 0} · 碎片 {shards}/{totalShards}</span>}
          onResume={() => setMenu(false)}
          onRestart={() => { setMenu(false); setRestartKey(k => k + 1); }}
          onExit={() => { setMenu(false); onExit(); }}
          onSkip={cleared ? () => { setMenu(false); skipRef.current(); } : undefined}
        />
      )}
    </div>
  );
};

export default GameEngine;
