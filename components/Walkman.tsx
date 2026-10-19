// ============================================================
// 随身听：一个可以随时掏出来的小道具
//  · 主菜单、暂停菜单里的按钮，或者任何时候按 M 打开
//  · 放歌时场景配乐会安静下来；按 ■ 收起耳机，回到场景配乐
//  · 收起面板后，如果还在放歌，左下角留一个小标签
// ============================================================
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Square, X, ListMusic } from 'lucide-react';
import { walkman, sfx } from '../core/audio';
import { score } from '../core/score';
import { TRACKS } from '../core/tracks';

export const openWalkman = () => window.dispatchEvent(new Event('walkman:open'));

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const Eq: React.FC<{ on: boolean; light?: boolean }> = ({ on, light }) => (
  <span className="inline-flex items-end gap-[2px] h-3" aria-hidden>
    {[0, 1, 2, 3].map(i => (
      <span key={i} className={`w-[3px] ${light ? 'bg-paper' : 'bg-sakura'}`}
            style={{ height: on ? undefined : 3, animation: on ? `eq-bar ${0.5 + i * 0.13}s ease-in-out ${i * 0.07}s infinite alternate` : 'none' }} />
    ))}
  </span>
);

const MODES = [
  { id: 'seq', label: '顺序播放', Icon: Repeat },
  { id: 'one', label: '单曲循环', Icon: Repeat1 },
  { id: 'shuffle', label: '随机播放', Icon: Shuffle },
] as const;

const Walkman: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const st = useSyncExternalStore(walkman.subscribe, walkman.getSnapshot);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const [sceneId, setSceneId] = useState<string | null>(score.current);

  useEffect(() => {
    const o = () => { setOpen(v => !v); sfx('click'); };
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      o();
    };
    window.addEventListener('walkman:open', o);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('walkman:open', o); window.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setSceneId(score.current), 700);
    return () => clearInterval(t);
  }, [open]);

  if (hidden) return null;
  const track = walkman.tracks[st.idx];
  const mode = MODES.find(m => m.id === st.mode) ?? MODES[0];
  const sceneTitle = sceneId && TRACKS[sceneId] ? TRACKS[sceneId].title : '';
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  // 收起状态：只在放歌时留一个小标签
  if (!open) {
    if (!st.playing) return null;
    return (
      <button onClick={(e) => { e.currentTarget.blur(); setOpen(true); sfx('click'); }} onPointerDown={stop}
              className="fixed left-3 bottom-3 z-[95] flex items-center gap-2 pl-2 pr-3 py-1.5 bg-ink text-paper border-2 border-paper rounded-full text-xs font-bold shadow-lg max-w-[60vw]"
              aria-label="打开随身听">
        <Eq on light />
        <span className="truncate">{track.name}</span>
      </button>
    );
  }

  return (
    <div className="fixed left-3 bottom-3 z-[95] w-[300px] max-w-[calc(100vw-24px)] select-none" onPointerDown={stop} onClick={stop} onWheel={stop}
         onMouseUp={() => setTimeout(() => (document.activeElement as HTMLElement | null)?.blur?.(), 0)}
         role="dialog" aria-label="随身听">
      {/* 曲目列表（从机身上方抽出来） */}
      {list && (
        <div className="mb-2 bg-paper border-[3px] border-ink rounded-xl overflow-hidden" style={{ boxShadow: '4px 4px 0 0 #1e3a8a' }}>
          <div className="max-h-[38vh] overflow-y-auto scroll-thin py-1">
            {walkman.tracks.map((t, i) => (
              <button key={t.url} onClick={() => { walkman.play(i); sfx('click'); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm ${i === st.idx ? 'bg-sakura-soft/60 font-bold text-ink' : 'text-ink/80 hover:bg-ink/5'}`}>
                <span className="w-5 text-right text-[11px] text-ink/45 tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate">{t.name}</span>
                {i === st.idx && <Eq on={st.playing} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 机身 */}
      <div className="relative bg-paper border-[3px] border-ink rounded-[18px] px-3 pt-2 pb-3" style={{ boxShadow: '4px 4px 0 0 #1e3a8a' }}>
        <div className="flex items-center justify-between text-[10px] font-bold text-ink/60">
          <span>豆沙的随身听</span>
          <button onClick={() => { setOpen(false); sfx('back'); }} className="p-1 -mr-1 hover:text-ink" aria-label="收起"><X size={14} /></button>
        </div>

        {/* 屏幕 */}
        <div className="mt-1 bg-ink text-paper rounded-lg px-3 py-2 border-2 border-ink" style={{ boxShadow: 'inset 0 0 0 2px rgba(254,247,205,.12)' }}>
          {st.playing || st.t > 0 ? (
            <>
              <div className="flex items-center justify-between text-[10px] text-paper/60 tabular-nums">
                <span>{String(st.idx + 1).padStart(2, '0')} / {String(walkman.tracks.length).padStart(2, '0')}</span>
                <Eq on={st.playing} light />
              </div>
              <div className="overflow-hidden whitespace-nowrap text-sm font-bold mt-0.5">
                <span className="inline-block" style={{ animation: track.name.length > 16 ? 'marquee-x 9s linear infinite' : undefined }}>{track.name}</span>
              </div>
              <div className="mt-2 h-1.5 bg-paper/20 rounded-full cursor-pointer" role="slider" aria-label="进度" aria-valuenow={Math.round(st.t)}
                   onClick={e => { const r = e.currentTarget.getBoundingClientRect(); walkman.seek((e.clientX - r.left) / r.width); }}>
                <div className="h-full bg-sakura rounded-full" style={{ width: `${st.dur ? (st.t / st.dur) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-paper/60 mt-1 tabular-nums">
                <span>{fmt(st.t)}</span><span>{st.dur ? fmt(st.dur) : '--:--'}</span>
              </div>
            </>
          ) : (
            <div className="py-1">
              <div className="text-[10px] text-paper/60">耳机没戴上 · 正在听这里的声音</div>
              <div className="text-sm font-bold mt-0.5 truncate">{sceneTitle ? `♪ ${sceneTitle}` : '……'}</div>
              <div className="text-[10px] text-paper/60 mt-1">按 ▶ 放随身听里的歌</div>
            </div>
          )}
        </div>

        {/* 按键 */}
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => { walkman.setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length].id); sfx('click'); }}
                  className="w-9 h-9 grid place-items-center rounded-full border-2 border-ink text-ink hover:bg-ink/5" title={mode.label} aria-label={mode.label}>
            <mode.Icon size={16} />
          </button>
          <button onClick={() => { walkman.prev(); sfx('click'); }} className="w-9 h-9 grid place-items-center rounded-full border-2 border-ink text-ink hover:bg-ink/5" aria-label="上一首"><SkipBack size={16} /></button>
          <button onClick={() => { walkman.toggle(); sfx('click'); }}
                  className="w-12 h-12 grid place-items-center rounded-full border-[3px] border-ink bg-sakura-soft text-ink active:translate-y-[1px]"
                  style={{ boxShadow: '2px 2px 0 0 #1e3a8a' }} aria-label={st.playing ? '暂停' : '播放'}>
            {st.playing ? <Pause size={20} /> : <Play size={20} className="translate-x-[1px]" />}
          </button>
          <button onClick={() => { walkman.next(); sfx('click'); }} className="w-9 h-9 grid place-items-center rounded-full border-2 border-ink text-ink hover:bg-ink/5" aria-label="下一首"><SkipForward size={16} /></button>
          <button onClick={() => { setList(v => !v); sfx('click'); }}
                  className={`w-9 h-9 grid place-items-center rounded-full border-2 border-ink ${list ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/5'}`} aria-label="曲目列表"><ListMusic size={16} /></button>
        </div>
        {(st.playing || st.t > 0) && (
          <button onClick={() => { walkman.pause(); walkman.seek(0); sfx('back'); }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-ink/60 hover:text-ink">
            <Square size={10} /> 摘下耳机，听这里的声音
          </button>
        )}
      </div>
    </div>
  );
};

export default Walkman;
