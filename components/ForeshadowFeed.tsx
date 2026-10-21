// ============================================================
// 第二章首通 · 终端角落里的一小块「监控画面」
//  · 新的熊猫存档点慢慢亮起来，灯从上面打下来，地上拖出一条影子
//  · 「轮廓比对」那一行出现时，影子短暂变成另一种轮廓：圆脑袋、没有熊猫耳朵、
//    胸口一点反光——只给轮廓，不给脸、不给名字
//  · 「下一帧记录丢失」：信号撕开，画面黑掉
// 纯 2D canvas 现场绘制，不用任何外部图片。只在第一次通关时播放。
// ============================================================
import React, { useEffect, useRef } from 'react';

export type FeedStage = 'panda' | 'mismatch' | 'tear' | 'off';

const W = 360, H = 220;
const FEET = { x: 118, y: 176 };
const WALL_Y = 150;  // 墙和地面的交界

// ---- 形状 ----
const pandaShape = (x: CanvasRenderingContext2D) => {
  x.beginPath();
  x.ellipse(0, -24, 22, 25, 0, 0, Math.PI * 2);           // 身体
  x.moveTo(19, -62); x.arc(0, -62, 19, 0, Math.PI * 2);   // 头
  x.moveTo(-6, -79); x.arc(-13, -79, 7, 0, Math.PI * 2);  // 耳
  x.moveTo(20, -79); x.arc(13, -79, 7, 0, Math.PI * 2);
};
const penguinShape = (x: CanvasRenderingContext2D) => {
  x.beginPath();
  // 一体的水滴形身体 + 圆脑袋，没有耳朵
  x.moveTo(0, -86);
  x.bezierCurveTo(17, -86, 22, -70, 20, -56);
  x.bezierCurveTo(30, -40, 28, -10, 18, 0);
  x.lineTo(-18, 0);
  x.bezierCurveTo(-28, -10, -30, -40, -20, -56);
  x.bezierCurveTo(-22, -70, -17, -86, 0, -86);
  x.closePath();
  // 侧面的小嘴
  x.moveTo(19, -66); x.lineTo(29, -62); x.lineTo(19, -59); x.closePath();
  // 鳍
  x.moveTo(23, -42); x.quadraticCurveTo(36, -28, 30, -14); x.quadraticCurveTo(25, -26, 22, -32); x.closePath();
  // 头顶一小撮
  x.moveTo(-3, -85); x.quadraticCurveTo(2, -95, 8, -92); x.quadraticCurveTo(3, -88, 3, -85); x.closePath();
};

const drawPanda = (x: CanvasRenderingContext2D, lit: number) => {
  x.save(); x.translate(FEET.x, FEET.y);
  const w = (v: number) => `rgba(${Math.round(200 + 55 * lit)},${Math.round(210 + 45 * lit)},${Math.round(205 + 40 * lit)},${0.25 + lit * 0.75})`;
  const k = `rgba(14,20,18,${0.4 + lit * 0.6})`;
  x.fillStyle = w(0); x.beginPath(); x.ellipse(0, -24, 22, 25, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = k; x.beginPath(); x.ellipse(-17, -26, 7, 13, 0.3, 0, Math.PI * 2); x.ellipse(17, -26, 7, 13, -0.3, 0, Math.PI * 2); x.fill();
  x.fillStyle = w(0); x.beginPath(); x.arc(0, -62, 19, 0, Math.PI * 2); x.fill();
  x.fillStyle = k; x.beginPath(); x.arc(-13, -79, 7, 0, Math.PI * 2); x.arc(13, -79, 7, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(-7, -63, 5, 6, 0.4, 0, Math.PI * 2); x.ellipse(7, -63, 5, 6, -0.4, 0, Math.PI * 2); x.fill();
  // 一点小围巾
  x.fillStyle = `rgba(120,200,255,${0.2 + lit * 0.6})`; x.fillRect(-14, -45, 28, 5);
  x.restore();
};

/** 影子：灯从左前方低处打过来，影子放大投在身后的墙上 */
const SHADOW = { x: 238, y: 128, s: 1.35, skew: -0.12 };
const shadowXf = (x: CanvasRenderingContext2D) => { x.translate(SHADOW.x, SHADOW.y); x.transform(SHADOW.s, 0, SHADOW.skew, SHADOW.s, 0, 0); };
const drawShadow = (x: CanvasRenderingContext2D, shape: 'panda' | 'penguin', alpha: number) => {
  x.save();
  shadowXf(x);
  x.fillStyle = `rgba(0,0,0,${alpha})`;
  (shape === 'panda' ? pandaShape : penguinShape)(x);
  x.fill();
  if (shape === 'penguin') {
    // 胸口的一点反光（别针）
    x.fillStyle = `rgba(150,230,255,${alpha * 0.95})`;
    x.beginPath(); x.arc(8, -48, 2.4, 0, Math.PI * 2); x.fill();
  }
  x.restore();
};

/** 轮廓比对：把熊猫的轮廓投到影子上，用虚线框出来 */
const drawCompare = (x: CanvasRenderingContext2D, a: number) => {
  x.save(); shadowXf(x);
  x.setLineDash([4, 3]); x.lineWidth = 1.2;
  x.strokeStyle = `rgba(54,224,122,${a * 0.85})`; pandaShape(x); x.stroke();
  x.strokeStyle = `rgba(255,93,108,${a})`; penguinShape(x); x.stroke();
  x.restore();
};

const ForeshadowFeed: React.FC<{ stage: FeedStage; reduce?: boolean }> = ({ stage, reduce }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  const since = useRef(performance.now());
  useEffect(() => { if (stageRef.current !== stage) { stageRef.current = stage; since.current = performance.now(); } }, [stage]);

  useEffect(() => {
    const c = ref.current!; const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d')!;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d')!;
    const t0 = performance.now();
    let raf = 0;
    const scene = (now: number) => {
      const st = stageRef.current; const k = (now - since.current) / 1000; const t = (now - t0) / 1000;
      // 墙 + 地面
      o.fillStyle = '#030a0c'; o.fillRect(0, 0, W, WALL_Y);
      const fl = o.createLinearGradient(0, WALL_Y, 0, H); fl.addColorStop(0, '#04120c'); fl.addColorStop(1, '#071a10');
      o.fillStyle = fl; o.fillRect(0, WALL_Y, W, H - WALL_Y);
      o.strokeStyle = 'rgba(54,224,122,.10)'; o.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const y = WALL_Y + 4 + i * i * 3; o.beginPath(); o.moveTo(0, y); o.lineTo(W, y); o.stroke(); }
      for (let i = -9; i <= 9; i++) { o.beginPath(); o.moveTo(W / 2 + i * 22, WALL_Y); o.lineTo(W / 2 + i * 60, H); o.stroke(); }
      o.strokeStyle = 'rgba(54,224,122,.05)';
      for (let i = 1; i < 6; i++) { o.beginPath(); o.moveTo(0, i * 26); o.lineTo(W, i * 26); o.stroke(); }
      // 灯慢慢亮起来：左前方打过来，在墙上照出一块亮斑
      const lit = st === 'panda' ? Math.min(1, k / 1.1) : 1;
      const spot = o.createRadialGradient(SHADOW.x - 10, SHADOW.y - 50, 6, SHADOW.x - 10, SHADOW.y - 50, 150);
      spot.addColorStop(0, `rgba(190,255,225,${0.38 * lit})`); spot.addColorStop(0.55, `rgba(120,220,180,${0.16 * lit})`); spot.addColorStop(1, 'rgba(120,220,180,0)');
      o.fillStyle = spot; o.fillRect(0, 0, W, WALL_Y);
      const pool = o.createRadialGradient(FEET.x + 30, FEET.y, 4, FEET.x + 30, FEET.y, 110);
      pool.addColorStop(0, `rgba(170,255,210,${0.3 * lit})`); pool.addColorStop(1, 'rgba(170,255,210,0)');
      o.fillStyle = pool; o.fillRect(0, WALL_Y, W, H - WALL_Y);
      // 影子：比对时先闪两下，再停在另一种轮廓上
      let shape: 'panda' | 'penguin' = 'panda';
      if (st === 'mismatch' || st === 'tear') {
        const flick = !reduce && k < 0.35 && Math.floor(k * 14) % 2 === 0;
        shape = flick ? 'panda' : 'penguin';
      }
      drawShadow(o, shape, 0.55 + 0.3 * lit);
      if (st === 'mismatch') drawCompare(o, Math.min(1, k / 0.4) * (0.75 + 0.25 * Math.sin(t * 12)));
      drawPanda(o, lit);
      // 颗粒
      for (let i = 0; i < 160; i++) { o.fillStyle = `rgba(200,255,220,${Math.random() * 0.06})`; o.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    };
    const loop = (now: number) => {
      const st = stageRef.current; const k = (now - since.current) / 1000;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (st === 'off') {
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
        const a = Math.max(0, 1 - k / 0.5);
        if (a > 0) { x.fillStyle = `rgba(230,255,240,${a})`; x.fillRect(W * (0.5 - 0.5 * a), H / 2 - 1, W * a, 2); }
        raf = requestAnimationFrame(loop); return;
      }
      scene(now);
      if (st === 'tear') {
        // 信号撕裂：横向切片错位 + 色偏 + 噪声带，越来越碎
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
        const amt = Math.min(1, k / 0.6) * (reduce ? 0.4 : 1);
        let y = 0;
        while (y < H) {
          const h = 3 + Math.floor(Math.random() * 18);
          const dx = (Math.random() - 0.5) * 90 * amt * (Math.random() < 0.3 ? 2 : 1);
          x.drawImage(off, 0, y, W, h, dx, y, W, h);
          y += h;
        }
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 0.35 * amt; x.drawImage(off, 6 * amt, 0); x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) { const yy = Math.random() * H; x.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.4 * amt})`; x.fillRect(0, yy, W, 1 + Math.random() * 4); }
        x.fillStyle = `rgba(0,0,0,${Math.max(0, (k - 0.5) / 0.4)})`; x.fillRect(0, 0, W, H);
      } else {
        x.drawImage(off, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div className="relative overflow-hidden" style={{ border: '1px solid rgba(54,224,122,.45)', boxShadow: '0 0 18px rgba(54,224,122,.15)', animation: 'line-in .5s ease-out both' }}
         aria-hidden>
      <canvas ref={ref} className="block w-full h-auto" style={{ aspectRatio: `${W} / ${H}`, imageRendering: 'pixelated' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 1px, transparent 1px 3px)' }} />
    </div>
  );
};

export default ForeshadowFeed;
