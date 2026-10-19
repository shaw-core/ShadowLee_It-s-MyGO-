// ============================================================
// 漫画分镜过场：一格一格地出现，点击/空格推进。
// 结尾特效：tear 撕开 / shatter 碎成三角形 / fade 淡出
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MangaPage, Panel } from '../story/cutscenes';
import { paintPanel } from '../game2d/art';
import { renderShot } from '../game3d/mangaShots';
import { getSave } from '../core/save';
import { SPEAKER_NAME } from '../story/types';
import { sfx } from '../core/audio';

interface Props { page: MangaPage; onEnd: () => void }

const GUTTER = 1.4; // %

const PanelView: React.FC<{ p: Panel; shown: boolean; index: number; is3d: boolean }> = ({ p, shown, index, is3d }) => {
  const [c, r, w, h] = p.at;
  const src = useMemo(() => {
    if (p.shot) return renderShot(p.shot, Math.round(w * 110), Math.round(h * 113), getSave().skin) ?? '';
    return p.art ? paintPanel(p.art, w, h, p.ink).toDataURL() : '';
  }, [p, w, h]);
  const tilt = ((index * 37) % 5 - 2) * 0.25;
  // 第二章：每一格浮在不同的深度上，翻进来而不是滑进来
  const depth = 8 + (index % 3) * 10;
  const transform = is3d
    ? (shown ? `translateZ(${depth}px) rotate(${tilt * 0.6}deg)` : `translateZ(-80px) rotateY(-24deg) rotateX(8deg)`)
    : (shown ? `rotate(${tilt}deg)` : 'translateY(10px) scale(.97)');
  return (
    <div className="absolute" style={{
      left: `calc(${(c / 12) * 100}% + ${GUTTER / 2}%)`, top: `calc(${(r / 8) * 100}% + ${GUTTER / 2}%)`,
      width: `calc(${(w / 12) * 100}% - ${GUTTER}%)`, height: `calc(${(h / 8) * 100}% - ${GUTTER}%)`,
      opacity: shown ? 1 : 0, transform, transformStyle: is3d ? 'preserve-3d' : undefined,
      transition: is3d ? 'opacity .45s ease-out, transform .7s cubic-bezier(.16,1,.3,1)' : 'opacity .35s ease-out, transform .45s cubic-bezier(.2,.9,.3,1.2)',
    }}>
      <div className={`absolute inset-0 overflow-hidden ${is3d ? 'border-[3px] border-[#1d2550] bg-[#cfd8f5] rounded-[3px]' : 'border-[3px] border-ink-black bg-white'}`}
           style={{ boxShadow: is3d ? '0 14px 28px -10px rgba(29,37,80,.55), 0 0 0 1px rgba(255,255,255,.6) inset' : '3px 3px 0 0 rgba(22,24,42,.35)' }}>
        {src && (
          <img src={src} alt="" className={`w-full h-full object-cover ${is3d ? 'kb-img' : ''}`}
               style={is3d
                 ? { animation: shown ? `kb-drift ${9 + (index % 3) * 2}s ease-in-out ${index % 2 ? '-2s' : '0s'} infinite alternate` : undefined }
                 : { imageRendering: 'pixelated' }} />
        )}
      </div>
      {p.caption && (
        <div className={is3d
          ? 'absolute left-0 top-3 max-w-[82%] bg-[#1d2550] text-white pl-3 pr-3 py-1 text-[11px] md:text-sm font-bold leading-snug'
          : 'absolute left-2 top-2 max-w-[80%] bg-paper-2 border-2 border-ink-black px-2 py-1 text-[11px] md:text-sm font-bold text-ink-black leading-snug'}
             style={is3d ? { transform: 'translateZ(14px)', boxShadow: '3px 3px 0 #f472b6' } : undefined}>
          {p.caption}
        </div>
      )}
      {p.bubbles?.map((b, i) => (
        <div key={i} className="absolute"
             style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, transform: `translate(-50%,-50%)${is3d ? ' translateZ(22px)' : ''}`, transitionDelay: `${150 + i * 200}ms`, opacity: shown ? 1 : 0, transition: 'opacity .3s' }}>
          <div className={`relative bg-white border-[2.5px] border-ink-black px-3 py-1.5 text-xs md:text-base font-bold text-ink-black whitespace-pre-line text-center ${b.shout ? 'rounded-none' : 'rounded-[50%]'}`}
               style={{ minWidth: 70 }}>
            <span className="sr-only">{SPEAKER_NAME[b.who]}：</span>{b.t}
            {b.tail && b.tail !== 'none' && (
              <span className="absolute w-3 h-3 bg-white border-ink-black"
                    style={{
                      borderWidth: '0 2.5px 2.5px 0',
                      ...(b.tail === 'down' ? { bottom: -7, left: '45%', transform: 'rotate(45deg)' } :
                        b.tail === 'left' ? { left: -7, top: '45%', transform: 'rotate(135deg)' } :
                          { right: -7, top: '45%', transform: 'rotate(-45deg)' }),
                    }} />
            )}
          </div>
        </div>
      ))}
      {p.sfx?.map((s, i) => (
        <div key={i} className="absolute font-display text-ink-black pointer-events-none"
             style={{
               left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: `translate(-50%,-50%) rotate(${s.rot ?? 0}deg)`,
               fontSize: `clamp(18px, ${3.2 * (s.size ?? 1)}vw, ${46 * (s.size ?? 1)}px)`,
               WebkitTextStroke: '5px white', paintOrder: 'stroke fill', opacity: shown ? 1 : 0, transition: 'opacity .2s .25s',
             }}>{s.t}</div>
      ))}
    </div>
  );
};

const MangaCutscene: React.FC<Props> = ({ page, onEnd }) => {
  const [n, setN] = useState(0);         // 已显示的格数
  const [out, setOut] = useState(false);
  const total = page.panels.length;
  const is3d = page.style === '3d';
  // 3D 页：整页跟着鼠标轻轻倾斜
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (!is3d || reduce) return;
    setTilt({ x: (e.clientY / window.innerHeight - 0.5) * -5, y: (e.clientX / window.innerWidth - 0.5) * 7 });
  }, [is3d, reduce]);

  useEffect(() => { const t = setTimeout(() => setN(1), 250); return () => clearTimeout(t); }, []);

  const next = useCallback(() => {
    if (out) return;
    if (n < total) { setN(n + 1); sfx('page'); return; }
    setOut(true);
    sfx(page.outro === 'shatter' ? 'crumble' : page.outro === 'tear' ? 'whoosh' : 'page');
    setTimeout(onEnd, page.outro === 'fade' ? 600 : 1100);
  }, [n, total, out, onEnd, page.outro]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'KeyE', 'ArrowRight'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) next(); }
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); setN(total); setTimeout(() => { setOut(true); setTimeout(onEnd, 500); }, 50); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [next, total, onEnd]);

  // 碎片：把页面切成三角形
  const shards = useMemo(() => {
    const res: { clip: string; dx: number; dy: number; rot: number }[] = [];
    const C = 6, R = 4;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const x0 = (x / C) * 100, x1 = ((x + 1) / C) * 100, y0 = (y / R) * 100, y1 = ((y + 1) / R) * 100;
      const flip = (x + y) % 2 === 0;
      const a = flip ? `${x0}% ${y0}%, ${x1}% ${y0}%, ${x0}% ${y1}%` : `${x0}% ${y0}%, ${x1}% ${y0}%, ${x1}% ${y1}%`;
      const b = flip ? `${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%` : `${x0}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%`;
      for (const clip of [a, b]) res.push({ clip: `polygon(${clip})`, dx: (x - C / 2 + Math.random() - 0.5) * 60, dy: 200 + Math.random() * 300, rot: (Math.random() - 0.5) * 120 });
    }
    return res;
  }, []);

  const pageBody = (
    <div className="relative w-full h-full" style={{ transformStyle: is3d ? 'preserve-3d' : undefined }}>
      {page.panels.map((p, i) => <PanelView key={i} p={p} shown={i < n} index={i} is3d={is3d} />)}
      {page.pageNo && <div className={`absolute -bottom-6 right-1 text-xs font-bold ${is3d ? 'text-[#4f66d6]' : 'text-ink-black/50'}`}>{page.pageNo}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-hidden select-none"
         style={{
           background: page.outro === 'shatter' && out ? 'linear-gradient(170deg,#c4b5fd,#93c5fd 45%,#fbcfe8)'
             : is3d ? 'radial-gradient(120% 90% at 50% 20%, #34407a 0%, #1a1f3d 60%, #11142a 100%)' : '#2a2c3d',
           transition: 'background .6s', perspective: is3d ? 1600 : undefined,
         }}
         onClick={next} onPointerMove={onMove}>
      <div className="relative" style={{
        width: 'min(94vw, 132vh)', aspectRatio: '12 / 8.6',
        transformStyle: is3d ? 'preserve-3d' : undefined,
        transform: is3d ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
        transition: 'transform .4s ease-out',
      }}>
        {/* 纸张 */}
        {!(out && page.outro === 'shatter') && !(out && page.outro === 'tear') && (
          <div className={`absolute inset-0 p-[2.2%] pb-[4%] ${is3d ? 'bg-[#f3f6ff]' : 'bg-[#fdfcf7]'}`}
               style={{
                 boxShadow: is3d ? '0 30px 80px rgba(5,8,25,.6), 0 0 0 1px rgba(255,255,255,.4) inset' : '0 20px 60px rgba(0,0,0,.5)',
                 backgroundImage: is3d ? 'linear-gradient(#dfe6fb 1px, transparent 1px), linear-gradient(90deg, #dfe6fb 1px, transparent 1px)' : undefined,
                 backgroundSize: is3d ? '22px 22px' : undefined,
                 transformStyle: is3d ? 'preserve-3d' : undefined,
                 opacity: out ? 0 : 1, transform: is3d && out ? 'translateZ(-120px)' : undefined, transition: 'opacity .5s, transform .6s ease-in',
               }}>
            {pageBody}
          </div>
        )}
        {out && page.outro === 'tear' && (['left', 'right'] as const).map(side => (
          <div key={side} className="absolute inset-0 bg-[#fdfcf7] p-[2.2%] pb-[4%]"
               style={{
                 clipPath: side === 'left' ? 'polygon(0 0, 52% 0, 47% 18%, 53% 35%, 46% 52%, 52% 70%, 47% 86%, 51% 100%, 0 100%)'
                   : 'polygon(52% 0, 100% 0, 100% 100%, 51% 100%, 47% 86%, 52% 70%, 46% 52%, 53% 35%, 47% 18%)',
                 animation: `${side === 'left' ? 'tear-l' : 'tear-r'} 1s cubic-bezier(.5,0,.8,.4) forwards`,
               }}>
            {pageBody}
          </div>
        ))}
        {out && page.outro === 'shatter' && shards.map((s, i) => (
          <div key={i} className="absolute inset-0 bg-[#fdfcf7] p-[2.2%] pb-[4%]"
               style={{ clipPath: s.clip, ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, ['--rot' as string]: `${s.rot}deg`, animation: `shard-fly 1s cubic-bezier(.5,0,.9,.5) ${i * 14}ms forwards` } as React.CSSProperties}>
            {pageBody}
          </div>
        ))}
      </div>
      {!out && (
        <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/50">
          {n < total ? '点击 / 空格 翻到下一格' : '点击 / 空格 继续'} · Esc 跳过
        </div>
      )}
    </div>
  );
};

export default MangaCutscene;
