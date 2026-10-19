// ============================================================
// 第一章物理（纯逻辑，60Hz 固定步长，单位：像素/帧）
// 引擎与关卡验证机器人共用同一份代码。
// ============================================================
import type { Level2D, LayerMask } from './levels';

export const TILE = 16;
export const PH = {
  grav: 0.36, maxFall: 6.2, jumpV: 6.2, cut: 0.5,
  run: 2.0, accG: 0.34, accA: 0.24, fric: 0.45,
  coyote: 6, buffer: 7, spring: 9.4, w: 10, h: 24,
};

export type L = 'R' | 'M';

export interface Mover {
  i: number;
  bx: number; by: number;       // 起点（像素，平台左上角）
  x: number; y: number; px: number; py: number;
  w: number; h: number;
  dx: number; dy: number; period: number; phase: number;
  layer: LayerMask;
}

export interface Body {
  x: number; y: number;          // 碰撞盒左上角
  vx: number; vy: number;
  ground: boolean;
  mover: number;                 // 所站移动平台，-1 无
  coyote: number; buffer: number;
  facing: 1 | -1;
}

export interface Input { l: boolean; r: boolean; jump: boolean; held: boolean; down: boolean }

export interface StepEvents { jumped?: boolean; landed?: number; bounced?: boolean; died?: boolean }

export class World {
  w: number; h: number;
  grid: string[];
  movers: Mover[] = [];
  constructor(lv: Level2D) {
    this.grid = lv.map;
    this.h = lv.map.length;
    this.w = lv.map[0].length;
    lv.ents.forEach((e, i) => {
      if (e.t !== 'mover') return;
      const x = e.x * TILE, y = e.y * TILE;
      this.movers.push({
        i, bx: x, by: y, x, y, px: x, py: y, w: e.w * TILE, h: TILE,
        dx: e.dx * TILE, dy: e.dy * TILE, period: e.period, phase: e.phase ?? 0, layer: e.layer ?? 'B',
      });
    });
  }
  ch(tx: number, ty: number) {
    if (ty < 0 || tx < 0 || tx >= this.w) return '#'; // 左右边界与天花板之外视为墙（天花板放行见下）
    if (ty >= this.h) return '.';
    return this.grid[ty][tx];
  }
  solid(tx: number, ty: number, l: L) {
    if (tx < 0 || tx >= this.w) return true;
    if (ty < 0 || ty >= this.h) return false;
    const c = this.grid[ty][tx];
    return c === '#' || c === 'B' || (c === 'R' && l === 'R') || (c === 'M' && l === 'M');
  }
  oneway(tx: number, ty: number, l: L) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return false;
    const c = this.grid[ty][tx];
    return c === '-' || (c === 'r' && l === 'R') || (c === 'm' && l === 'M');
  }
  spike(tx: number, ty: number, l: L) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return false;
    const c = this.grid[ty][tx];
    return c === '^' || (c === 'x' && l === 'R') || (c === 'X' && l === 'M');
  }
  spring(tx: number, ty: number) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return false;
    return this.grid[ty][tx] === 'B';
  }
  moverActive(m: Mover, l: L) { return m.layer === 'B' || m.layer === l; }
  /** 时间 t（秒）时移动平台的位置 */
  updateMovers(t: number) {
    for (const m of this.movers) {
      m.px = m.x; m.py = m.y;
      const k = (1 - Math.cos(((t / m.period) + m.phase) * Math.PI * 2)) / 2;
      m.x = m.bx + m.dx * k;
      m.y = m.by + m.dy * k;
    }
  }
  /** 盒子是否与某一层的实心重叠 */
  boxSolid(x: number, y: number, w: number, h: number, l: L) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty, l)) return true;
    return false;
  }
}

export const newBody = (x: number, y: number): Body => ({
  x, y, vx: 0, vy: 0, ground: false, mover: -1, coyote: 0, buffer: 0, facing: 1,
});

/** 一帧物理。返回本帧发生的事件。 */
export const step = (b: Body, inp: Input, w: World, l: L): StepEvents => {
  const ev: StepEvents = {};
  // 站在移动平台上：先跟随平台
  if (b.mover >= 0) {
    const m = w.movers[b.mover];
    if (w.moverActive(m, l)) { b.x += m.x - m.px; b.y += m.y - m.py; }
  }

  // 水平
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  if (dir !== 0) b.facing = dir as 1 | -1;
  const target = dir * PH.run;
  const acc = dir === 0 ? PH.fric : (b.ground ? PH.accG : PH.accA);
  if (b.vx < target) b.vx = Math.min(target, b.vx + acc);
  else if (b.vx > target) b.vx = Math.max(target, b.vx - acc);

  // 跳跃（缓冲 + 土狼时间 + 可变高度）
  if (inp.jump) b.buffer = PH.buffer; else b.buffer = Math.max(0, b.buffer - 1);
  b.coyote = b.ground ? PH.coyote : Math.max(0, b.coyote - 1);
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = -PH.jumpV; b.buffer = 0; b.coyote = 0; b.ground = false; b.mover = -1;
    ev.jumped = true;
  }
  if (!inp.held && b.vy < -1.2) b.vy *= PH.cut;

  b.vy = Math.min(PH.maxFall, b.vy + PH.grav);

  // X 轴移动与碰撞
  b.x += b.vx;
  if (b.vx > 0) {
    const tx = Math.floor((b.x + PH.w - 0.001) / TILE);
    for (let ty = Math.floor(b.y / TILE); ty <= Math.floor((b.y + PH.h - 0.001) / TILE); ty++) {
      if (w.solid(tx, ty, l)) { b.x = tx * TILE - PH.w; b.vx = 0; break; }
    }
  } else if (b.vx < 0) {
    const tx = Math.floor(b.x / TILE);
    for (let ty = Math.floor(b.y / TILE); ty <= Math.floor((b.y + PH.h - 0.001) / TILE); ty++) {
      if (w.solid(tx, ty, l)) { b.x = (tx + 1) * TILE; b.vx = 0; break; }
    }
  }

  // Y 轴移动与碰撞
  const prevBottom = b.y + PH.h;
  const wasGround = b.ground;
  b.y += b.vy;
  b.ground = false;
  b.mover = -1;
  const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + PH.w - 0.001) / TILE);
  if (b.vy >= 0) {
    const bottom = b.y + PH.h;
    const ty = Math.floor((bottom - 0.001) / TILE);
    let landed = false, spring = false;
    for (let tx = x0; tx <= x1; tx++) {
      const top = ty * TILE;
      if (w.solid(tx, ty, l) && prevBottom <= top + 6) { landed = true; if (w.spring(tx, ty)) spring = true; }
      else if (w.oneway(tx, ty, l) && prevBottom <= top + 0.5 && !inp.down) landed = true;
    }
    if (landed) {
      const impact = b.vy;
      b.y = ty * TILE - PH.h; b.vy = 0; b.ground = true;
      if (spring) { b.vy = -PH.spring; b.ground = false; ev.bounced = true; }
      else if (!wasGround) ev.landed = impact;
    }
    // 移动平台（单向，从上方落上去）
    if (!b.ground) {
      for (const m of w.movers) {
        if (!w.moverActive(m, l)) continue;
        if (b.x + PH.w <= m.x || b.x >= m.x + m.w) continue;
        const prevTop = m.py;
        if (prevBottom <= prevTop + 2 && b.y + PH.h >= m.y && !inp.down) {
          b.y = m.y - PH.h; b.vy = 0; b.ground = true; b.mover = w.movers.indexOf(m);
          if (!wasGround) ev.landed = 2;
          break;
        }
      }
    }
  } else {
    const ty = Math.floor(b.y / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (ty >= 0 && w.solid(tx, ty, l)) { b.y = (ty + 1) * TILE; b.vy = 0; break; }
    }
  }

  // 尖刺（缩小判定，避免冤死）
  const sx0 = Math.floor((b.x + 2) / TILE), sx1 = Math.floor((b.x + PH.w - 2) / TILE);
  const sy0 = Math.floor((b.y + 6) / TILE), sy1 = Math.floor((b.y + PH.h - 1) / TILE);
  for (let ty = sy0; ty <= sy1; ty++) for (let tx = sx0; tx <= sx1; tx++) {
    if (w.spike(tx, ty, l)) {
      // 尖刺只占格子下半部分
      if (b.y + PH.h > ty * TILE + 7) ev.died = true;
    }
  }
  if (b.y > w.h * TILE + 40) ev.died = true;
  return ev;
};

/** 切换图层时若卡进墙里，向上推出（最多两格），否则拒绝切换 */
export const fitAfterSwitch = (b: Body, w: World, l: L): boolean => {
  if (!w.boxSolid(b.x, b.y, PH.w, PH.h, l)) return true;
  for (let up = 1; up <= 32; up++) {
    if (!w.boxSolid(b.x, b.y - up, PH.w, PH.h, l)) { b.y -= up; return true; }
  }
  return false;
};
