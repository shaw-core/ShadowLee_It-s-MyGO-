// 章节内的关卡选择
import React, { useEffect } from 'react';
import { ArrowLeft, Lock, Play, BookOpen, Sparkles, Candy, Clock, RotateCcw } from 'lucide-react';
import { useSave } from '../core/save';
import { sfx } from '../core/audio';

export interface LevelCardInfo {
  id: number;
  title: string;
  sub: string;
  items: string[];
}

interface Props {
  chapter: 1 | 2;
  levels: LevelCardInfo[];
  onPlay: (index: number) => void;
  onRestart: () => void;
  onBack: () => void;
}

const fmt = (ms?: number) => (ms === undefined ? '—' : `${(ms / 1000).toFixed(1)}s`);

const ChapterSelect: React.FC<Props> = ({ chapter, levels, onPlay, onRestart, onBack }) => {
  const save = useSave();
  const reached = chapter === 1 ? save.reached1 : save.reached2;
  const ch2 = chapter === 2;
  const accent = ch2 ? '#be185d' : '#1e3a8a';

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Escape') onBack(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onBack]);

  return (
    <div className="fixed inset-0 overflow-y-auto scroll-thin" style={{ background: ch2 ? 'linear-gradient(165deg,#ede9fe,#dbeafe 45%,#fce7f3)' : '#FEF7CD' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: ch2 ? 'linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px)' : 'radial-gradient(rgba(30,58,138,.09) 1.2px, transparent 1.4px)', backgroundSize: ch2 ? '40px 40px' : '14px 14px' }} />
      <div className="relative max-w-4xl mx-auto px-5 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button className="btn w-10 h-10" onClick={() => { sfx('back'); onBack(); }} aria-label="返回"><ArrowLeft size={18} /></button>
          <div>
            <p className="text-xs font-bold" style={{ color: accent }}>{ch2 ? '第二章' : '第一章'}</p>
            <h1 className="font-display text-3xl md:text-4xl leading-none" style={{ color: accent }}>{ch2 ? '多边形的世界' : '漫画的世界'}</h1>
          </div>
          <button className="btn ml-auto px-3 py-2 text-sm" onClick={() => { sfx('confirm'); onRestart(); }}>
            <RotateCcw size={15} />从头开始
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {levels.map((lv, i) => {
            const st = save.stats[`c${chapter}_${lv.id}`];
            const locked = i > reached;
            const got = lv.items.filter(id => save.inventory.includes(id));
            return (
              <button key={lv.id} disabled={locked} onClick={() => { sfx('confirm'); onPlay(i); }} onMouseEnter={() => !locked && sfx('hover')}
                className={`group relative text-left border-[3px] px-5 py-4 transition-transform ${locked ? 'bg-white/50 border-dashed border-ink/25 cursor-not-allowed' : 'bg-white hover:-translate-y-1'}`}
                style={{ borderColor: locked ? undefined : accent, boxShadow: locked ? 'none' : `5px 5px 0 0 ${accent}`, transform: `rotate(${((i * 7) % 3 - 1) * 0.4}deg)` }}>
                {locked ? (
                  <div className="flex items-center gap-3 text-ink/35 py-3">
                    <Lock size={20} />
                    <span className="font-display text-xl">第 {i + 1} {ch2 ? '关' : '话'}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="font-display text-4xl leading-none opacity-20" style={{ color: accent }}>{String(lv.id).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl leading-tight" style={{ color: accent }}>{lv.title.replace(/^第\d[话关][：·\s]*/, '')}</h3>
                        <p className="text-xs text-ink/60 mt-0.5 truncate">{lv.sub}</p>
                      </div>
                      <Play size={18} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: accent }} fill="currentColor" />
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-ink/60">
                      <span className="flex gap-1">
                        {lv.items.map(id => {
                          const has = got.includes(id);
                          const Icon = id.startsWith('page') ? BookOpen : ch2 ? Candy : Sparkles;
                          return <Icon key={id} size={14} className={has ? (id.startsWith('page') ? 'text-sakura' : 'text-dou') : 'text-ink/20'} />;
                        })}
                      </span>
                      <span className="ml-auto flex items-center gap-1"><Clock size={12} />{fmt(st?.best)}</span>
                      {st && st.clears > 0 && <span className="px-1.5 py-0.5 text-white text-[10px]" style={{ background: accent }}>已通过</span>}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChapterSelect;
