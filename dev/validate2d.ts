// 关卡验证机器人：用真实物理在所有关卡里做广度搜索，
// 确认终点、每张百合页、每个碎片都能拿到。
// 用法：npx esbuild dev/validate2d.ts --bundle --platform=node --outfile=/tmp/v2d.cjs && node /tmp/v2d.cjs
import { LEVELS2D } from '../game2d/levels';
import { World, newBody, step, PH, TILE, fitAfterSwitch, L, Body } from '../game2d/physics';

type State = { x: number; y: number; layer: L; t: number; mover: number };

let nearMover: (x: number, y: number) => boolean = () => false;
const key = (s: State) => `${Math.round(s.x / 4)},${Math.round(s.y)},${s.layer},${s.mover},${(s.mover >= 0 || nearMover(s.x, s.y)) ? Math.floor(s.t * 2) % 48 : ''}`;

for (const lv of LEVELS2D) {
  const w = new World(lv);
  nearMover = (x: number, y: number) => w.movers.some(m => {
    const x0 = Math.min(m.bx, m.bx + m.dx) - 7 * TILE, x1 = Math.max(m.bx, m.bx + m.dx) + m.w + 7 * TILE;
    const y0 = Math.min(m.by, m.by + m.dy) - 9 * TILE, y1 = Math.max(m.by, m.by + m.dy) + 6 * TILE;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });
  const find = (ch: string) => {
    const out: [number, number][] = [];
    lv.map.forEach((row, y) => row.split('').forEach((c, x) => { if (c === ch) out.push([x, y]); }));
    return out;
  };
  const [px, py] = find('P')[0];
  const items = [...find('p'), ...find('s')].map(([x, y]) => ({ x, y, got: false, ch: lv.map[y][x] }));
  const goals = find('G');
  let goalReached = false;

  const start: State = { x: px * TILE + 3, y: (py + 1) * TILE - PH.h, layer: 'R', t: 0, mover: -1 };
  const seen = new Set<string>();
  const queue: State[] = [start];
  seen.add(key(start));
  let expanded = 0;
  let maxX = 0;

  const touch = (b: Body) => {
    const cx0 = Math.floor(b.x / TILE), cx1 = Math.floor((b.x + PH.w) / TILE);
    const cy0 = Math.floor(b.y / TILE), cy1 = Math.floor((b.y + PH.h) / TILE);
    for (const it of items) if (!it.got && it.x >= cx0 - 0 && it.x <= cx1 && it.y >= cy0 && it.y <= cy1) it.got = true;
    for (const [gx, gy] of goals) if (gx >= cx0 - 1 && gx <= cx1 + 1 && gy >= cy0 - 1 && gy <= cy1) goalReached = true;
  };

  while (queue.length && expanded < 120000) {
    const s = queue.shift()!;
    expanded++;
    if (s.mover < 0 && nearMover(s.x, s.y)) {
      const ws: State = { ...s, t: s.t + 0.5 };
      const kw = key(ws);
      if (!seen.has(kw)) { seen.add(kw); queue.push(ws); }
    }
    const layers: L[] = [s.layer, s.layer === 'R' ? 'M' : 'R'];
    for (const startLayer of layers) {
      for (const dir of [-1, 0, 1]) for (const runup of [0, 6, 14]) for (const hold of [0, 6, 30]) for (const sw of [-1, 8, 18]) {
        if (dir === 0 && runup > 0) continue;
        const b = newBody(s.x, s.y);
        b.ground = true; b.mover = s.mover; b.coyote = PH.coyote;
        let layer = startLayer;
        if (layer !== s.layer && !fitAfterSwitch(b, w, layer)) continue;
        let t = s.t;
        w.updateMovers(t); w.updateMovers(t);
        let f = 0;
        let left = false;
        let died = false;
        for (; f < 200; f++) {
          t += 1 / 60;
          w.updateMovers(t);
          if (f === runup + sw && sw >= 0) {
            const nl: L = layer === 'R' ? 'M' : 'R';
            if (fitAfterSwitch(b, w, nl)) layer = nl;
          }
          const jumping = f >= runup && hold > 0;
          const ev = step(b, { l: dir < 0, r: dir > 0, jump: f === runup && hold > 0, held: jumping && f < runup + hold, down: false }, w, layer);
          touch(b);
          if (ev.died) { died = true; break; }
          if (!b.ground) left = true;
          if (hold === 0 && f >= runup + 8) break;
          if (left && b.ground && f > runup + 2) break;
        }
        if (died || !b.ground) continue;
        const ns: State = { x: b.x, y: b.y, layer, t, mover: b.mover };
        const k = key(ns);
        if (!seen.has(k)) { seen.add(k); queue.push(ns); }
        // 站在移动平台上可以等待：加入若干相位
        if (b.mover >= 0) {
          const mi = b.mover;
          w.updateMovers(t);
          const rel = b.x - w.movers[mi].x;
          for (let ph = 1; ph <= 8; ph++) {
            const tt = t + (w.movers[mi].period * ph) / 8;
            w.updateMovers(tt);
            const m = w.movers[mi];
            const ws: State = { x: m.x + rel, y: m.y - PH.h, layer, t: tt, mover: mi };
            const k2 = key(ws);
            if (!seen.has(k2)) { seen.add(k2); queue.push(ws); }
          }
        }
      }
    }
    maxX = Math.max(maxX, s.x);
  }
  const missing = items.filter(i => !i.got).map(i => `${i.ch}@${i.x},${i.y}`);
  console.log(`L${lv.id} ${lv.title}: states=${seen.size} goal=${goalReached ? 'OK' : 'FAIL'} items=${items.length - missing.length}/${items.length} maxTile=${Math.floor(maxX/TILE)}${missing.length ? ' MISSING ' + missing.join(' ') : ''}`);
}
