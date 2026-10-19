import React, { useEffect } from 'react';
import { Clock, Skull, ArrowRight, RotateCcw, BookOpen, Sparkles, Candy } from 'lucide-react';
import { LevelResult } from '../types';
import { sfx } from '../core/audio';

interface Props {
  result: LevelResult;
  title: string;
  /** 本关所有收集品 id（用来画空槽） */
  allItems: string[];
  newBest?: boolean;
  storyUnlocked: boolean;
  onContinue: () => void;
  onRetry: () => void;
}

const fmt = (ms: number) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${(s % 60).toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`;
};

const ResultScreen: React.FC<Props> = ({ result, title, allItems, newBest, storyUnlocked, onContinue, onRetry }) => {
  const ch2 = result.chapter === 2;
  const accent = ch2 ? '#db2777' : '#1e3a8a';
  const got = new Set(result.collectedIds);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onContinue(); }
      if (e.code === 'KeyR') onRetry();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onContinue, onRetry]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade"
         style={{ background: ch2 ? 'linear-gradient(160deg,#c4b5fd,#93c5fd 50%,#fbcfe8)' : '#2a2c3d' }}>
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.35) 1.2px, transparent 1.4px)', backgroundSize: '12px 12px' }} />
      <div className="relative w-full max-w-md bg-paper-2 border-[3px] border-ink-black px-7 pt-8 pb-6 anim-pop" style={{ boxShadow: `8px 8px 0 0 ${accent}` }}>
        {/* 印章 */}
        <div className="absolute -top-7 right-5 rotate-[10deg] border-[4px] px-3 py-1 font-display text-3xl bg-white"
             style={{ color: accent, borderColor: accent, animation: 'pop-in .4s .15s cubic-bezier(.2,.9,.3,1.4) both' }}>
          完成！
        </div>
        <p className="text-xs font-bold opacity-60" style={{ color: accent }}>{ch2 ? '第二章 · 多边形的世界' : '第一章 · 漫画的世界'}</p>
        <h2 className="font-display text-3xl leading-tight" style={{ color: accent }}>{title}</h2>
        {result.skipped && <p className="text-xs text-ink/60 mt-1">（二周目跳过）</p>}

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white border-2 border-ink/20 px-3 py-2">
            <div className="text-[11px] font-bold text-ink/60 flex items-center gap-1"><Clock size={12} />用时</div>
            <div className="font-display text-2xl text-ink tabular-nums">{fmt(result.timeTaken)}</div>
            {newBest && !result.skipped && <div className="text-[10px] font-bold text-sakura">最快纪录！</div>}
          </div>
          <div className="bg-white border-2 border-ink/20 px-3 py-2">
            <div className="text-[11px] font-bold text-ink/60 flex items-center gap-1"><Skull size={12} />{ch2 ? '回到熊猫身边' : '重来'}</div>
            <div className="font-display text-2xl text-ink tabular-nums">{result.deathCount} 次</div>
            {result.deathCount === 0 && !result.skipped && <div className="text-[10px] font-bold text-sakura">一次都没掉下去</div>}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-bold text-ink/60 mb-1.5">收集</div>
          <div className="flex flex-wrap gap-2">
            {allItems.map((id, i) => {
              const has = got.has(id);
              const page = id.startsWith('page');
              return (
                <div key={id} title={page ? '纸页' : ch2 ? '薄荷糖' : '碎片'}
                     className={`w-10 h-10 flex items-center justify-center border-2 ${has ? (page ? 'bg-sakura-soft border-sakura text-sakura' : 'bg-sky/40 border-dou text-dou') : 'border-dashed border-ink/25 text-ink/20'}`}
                     style={{ animation: has ? `pop-in .3s ${0.25 + i * 0.08}s both` : undefined }}>
                  {page ? <BookOpen size={18} /> : ch2 ? <Candy size={18} /> : <Sparkles size={18} />}
                </div>
              );
            })}
          </div>
        </div>

        {storyUnlocked && (
          <div className="mt-4 px-3 py-2 bg-white border-2 border-sakura text-sakura text-sm font-bold flex items-center gap-2">
            <BookOpen size={16} /> 捡到的纸页上，写着一段新的故事。
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button className="btn px-3 py-3" onClick={() => { sfx('click'); onRetry(); }} title="再来一次 (R)"><RotateCcw size={18} /></button>
          <button autoFocus className={`btn flex-1 py-3 text-lg ${ch2 ? 'btn-pink' : 'btn-blue'}`} onClick={() => { sfx('confirm'); onContinue(); }}>
            继续 <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
