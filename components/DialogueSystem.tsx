// ============================================================
// 对话系统：立绘（随表情切换）+ 打字机 + 纸条卡片 + 选项
// 支持：点击/空格/回车推进，Ctrl 按住快进，A 自动，L 回看，1~3 选择
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { History, FastForward, Play, X } from 'lucide-react';
import { Scene, Line, Mood, Choice, SPEAKER_NAME, SPEAKER_COLOR, Face } from '../story/types';
import { portrait } from '../game2d/portraits';
import { sfx, voiceBlip } from '../core/audio';
import { getSave, hasSeen } from '../core/save';

export interface DialogueResult {
  aff: number;
  path: string[];      // 走过的节点
  choices: string[];   // 选过的选项文本
}

interface Props {
  scene: Scene;
  ngPlus: boolean;
  onEnd: (r: DialogueResult) => void;
  /** 叠加在游戏画面上（半透明背景），否则整屏 */
  overlay?: boolean;
}

type Who = 'dousha' | 'novus' | 'kimo';
const isChar = (s: string): s is Who => s === 'dousha' || s === 'novus' || s === 'kimo';

const urlCache = new Map<string, string>();
const portraitUrl = (who: Who, face: Face, ink: boolean) => {
  const k = `${who}:${face}:${ink}`;
  let u = urlCache.get(k);
  if (!u) { u = portrait(who, face, ink).toDataURL(); urlCache.set(k, u); }
  return u;
};

const INK_MOODS: Mood[] = ['manga', 'wire'];

const Backdrop: React.FC<{ mood: Mood; overlay?: boolean }> = ({ mood, overlay }) => {
  const base = 'absolute inset-0 transition-all duration-500';
  switch (mood) {
    case 'manga':
      return <div className={base} style={{ background: '#fff', backgroundImage: 'radial-gradient(rgba(22,24,42,.28) 1px, transparent 1.3px)', backgroundSize: '6px 6px', opacity: overlay ? 0.94 : 1 }}>
        <div className="absolute inset-3 border-[5px] border-ink-black" />
        <div className="absolute inset-0" style={{ background: 'repeating-conic-gradient(from 0deg at 50% 38%, rgba(22,24,42,.07) 0deg 2deg, transparent 2deg 9deg)' }} />
      </div>;
    case 'dark':
      return <div className={base} style={{ background: 'radial-gradient(ellipse at 50% 30%, #1b2140 0%, #07080f 75%)', opacity: overlay ? 0.92 : 1 }} />;
    case 'white':
      return <div className={base} style={{ background: 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f1f3f8 80%)' }} />;
    case 'poly':
      return <div className={base} style={{ background: 'linear-gradient(170deg, rgba(196,181,253,.88) 0%, rgba(147,197,253,.82) 45%, rgba(254,215,226,.86) 100%)', backdropFilter: 'blur(6px)' }} />;
    case 'wire':
      return <div className={base} style={{ background: '#0c0d12', backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: overlay ? 0.95 : 1 }} />;
    default:
      return <div className={base} style={{ background: overlay ? 'linear-gradient(180deg, rgba(254,247,205,.25) 0%, rgba(254,247,205,.75) 55%, rgba(254,247,205,.95) 100%)' : 'linear-gradient(180deg,#fff7d6,#fde7ef)', backdropFilter: overlay ? 'blur(2px)' : undefined }} />;
  }
};

const DialogueSystem: React.FC<Props> = ({ scene, ngPlus, onEnd, overlay }) => {
  const [nodeId, setNodeId] = useState(scene.start);
  const [li, setLi] = useState(0);
  const [shown, setShown] = useState(0);
  const [log, setLog] = useState<Line[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [auto, setAuto] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const affRef = useRef(0);
  const pathRef = useRef<string[]>([scene.start]);
  const choicesRef = useRef<string[]>([]);
  const endedRef = useRef(false);
  const lastChar = useRef<Record<'L' | 'R', { who: Who; face: Face } | null>>({ L: null, R: null });
  const seenBefore = useMemo(() => hasSeen(scene.id), [scene.id]);

  const node = scene.nodes[nodeId];
  const line: Line | undefined = node?.lines[li];
  const mood: Mood = line?.m ?? scene.mood;
  const ink = INK_MOODS.includes(mood);
  const full = line?.t ?? '';
  const typing = shown < full.length;
  const atChoices = !!node && li >= node.lines.length - 1 && !typing && !!node.choices?.length;
  const choices: Choice[] = (node?.choices ?? []).filter(c => !c.ng || ngPlus);

  // 立绘站位：豆沙在左，室友姐 / Kimo熊 在右
  if (line && isChar(line.s)) {
    const side = line.s === 'dousha' ? 'L' : 'R';
    lastChar.current[side] = { who: line.s, face: line.f ?? 'normal' };
  }
  const left = lastChar.current.L, right = lastChar.current.R;

  const end = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd({ aff: affRef.current, path: pathRef.current, choices: choicesRef.current });
  }, [onEnd]);

  // 打字机
  useEffect(() => {
    if (!line) return;
    setShown(0);
    setLog(l => [...l, line]);
  }, [nodeId, li]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!line || shown >= full.length) return;
    const speed = getSave().settings.typeSpeed || 1;
    const ch = full[shown];
    const pause = '，。！？…、'.includes(ch) ? 90 : 0;
    const t = setTimeout(() => {
      setShown(s => Math.min(full.length, s + (skipping ? full.length : 1)));
      if (isChar(line.s) && ch.trim() && shown % 2 === 0) voiceBlip(line.s);
    }, skipping ? 10 : (28 + pause) / speed);
    return () => clearTimeout(t);
  }, [shown, full, line, skipping]);

  const advance = useCallback(() => {
    if (!node || endedRef.current) return;
    if (typing) { setShown(full.length); return; }
    if (li < node.lines.length - 1) { setLi(li + 1); sfx('type'); return; }
    if (choices.length) return; // 等待选择
    if (node.next) { setNodeId(node.next); setLi(0); pathRef.current.push(node.next); sfx('type'); }
    else end();
  }, [node, typing, full, li, choices.length, end]);

  const choose = useCallback((c: Choice) => {
    sfx('confirm');
    affRef.current += c.aff ?? 0;
    choicesRef.current.push(c.t);
    setLog(l => [...l, { s: 'dousha', t: `▶ ${c.t}` }]);
    if (c.next) { setNodeId(c.next); setLi(0); pathRef.current.push(c.next); }
    else end();
  }, [end]);

  // 自动 / 快进
  useEffect(() => {
    if (atChoices || showLog) return;
    if (skipping && !typing) { const t = setTimeout(advance, 60); return () => clearTimeout(t); }
    if (auto && !typing) { const t = setTimeout(advance, 900 + full.length * 45); return () => clearTimeout(t); }
  }, [auto, skipping, typing, advance, atChoices, full.length, showLog]);
  useEffect(() => { if (atChoices) setSkipping(false); }, [atChoices]);

  // 键盘
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (showLog) { if (e.code === 'Escape' || e.code === 'KeyL') { setShowLog(false); e.preventDefault(); } return; }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) advance(); }
      else if (e.code === 'ControlLeft' || e.code === 'ControlRight') setSkipping(true);
      else if (e.code === 'KeyA' && !e.repeat) setAuto(a => !a);
      else if (e.code === 'KeyL') setShowLog(true);
      else if (atChoices && /^Digit[1-4]$/.test(e.code)) {
        const c = choices[parseInt(e.code.slice(5), 10) - 1];
        if (c) choose(c);
      }
      e.stopPropagation();
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'ControlLeft' || e.code === 'ControlRight') setSkipping(false); };
    window.addEventListener('keydown', kd, true);
    window.addEventListener('keyup', ku, true);
    return () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); };
  }, [advance, atChoices, choices, choose, showLog]);

  if (!node || !line) return null;

  const speaking = isChar(line.s) ? line.s : null;
  const name = SPEAKER_NAME[line.s];
  const dark = mood === 'dark' || mood === 'wire';
  const isNote = line.s === 'note';
  const isNarr = line.s === 'narr';
  const isDanmaku = line.s === 'danmaku';
  const isTv = line.s === 'tv';
  const bigNarr = isNarr && (mood === 'white' || mood === 'dark');

  const renderPortrait = (c: { who: Who; face: Face } | null, side: 'L' | 'R') => {
    if (!c) return null;
    const active = speaking === c.who;
    return (
      <div key={side} className={`absolute bottom-[118px] md:bottom-[126px] ${side === 'L' ? 'left-[4%]' : 'right-[4%]'} transition-all duration-200`}
           style={{ transform: `translateY(${active ? 0 : 10}px) scale(${active ? 1 : 0.92})`, filter: active ? 'none' : (dark ? 'brightness(.45)' : 'brightness(.7) saturate(.6)'), transformOrigin: 'bottom center' }}>
        <div className={`relative ${active ? 'anim-pop' : ''}`} key={`${c.who}${c.face}${active}`}>
          {!ink && <div className="absolute inset-x-6 bottom-0 h-6 rounded-full bg-ink-black/15 blur-md" />}
          <img src={portraitUrl(c.who, c.face, ink)} alt={SPEAKER_NAME[c.who]}
               className="pixel w-[180px] h-[180px] md:w-[256px] md:h-[256px] relative"
               style={{ imageRendering: 'pixelated', transform: side === 'R' ? 'scaleX(-1)' : undefined }} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] select-none" onClick={() => !atChoices && !showLog && advance()}>
      <Backdrop mood={mood} overlay={overlay} />

      {/* 场景标题 */}
      <div className={`absolute top-4 left-4 text-xs font-bold px-2 py-1 ${dark ? 'text-white/70 border border-white/30' : 'text-ink/70 bg-white/70 border-2 border-ink/30'}`}>
        {scene.title}
      </div>
      <div className="absolute top-3 right-3 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
        <button className={`btn h-8 px-2 text-xs ${auto ? 'btn-pink' : ''}`} onClick={() => setAuto(a => !a)} title="自动播放 (A)"><Play size={13} />自动</button>
        <button className="btn h-8 px-2 text-xs" onClick={() => setShowLog(true)} title="回看 (L)"><History size={13} />回看</button>
        {seenBefore && <button className={`btn h-8 px-2 text-xs ${skipping ? 'btn-pink' : ''}`} onClick={() => setSkipping(s => !s)} title="快进已读 (按住 Ctrl)"><FastForward size={13} />快进</button>}
      </div>

      {!bigNarr && !isNote && <>{renderPortrait(left, 'L')}{renderPortrait(right, 'R')}</>}

      {/* 弹幕：飘过屏幕上方 */}
      {isDanmaku && (
        <div key={`${nodeId}-${li}`} className="absolute top-[18%] left-0 right-0 overflow-hidden h-16 pointer-events-none">
          <div className="absolute whitespace-nowrap text-2xl md:text-3xl font-bold text-sakura" style={{ animation: 'danmaku-fly 4s linear forwards', WebkitTextStroke: '5px white', paintOrder: 'stroke fill' }}>{full}</div>
        </div>
      )}

      {/* 纸条：手写卡片 */}
      {isNote ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div key={`${nodeId}-${li}`} className="paper-note relative max-w-md w-full px-8 py-9 anim-pop" style={{ transform: 'rotate(-1.5deg)' }}>
            <span className="tape" />
            <p className="font-hand text-[24px] md:text-[27px] leading-[36px] text-[#3b2f2a] whitespace-pre-wrap">{full.slice(0, shown)}<span className="opacity-0">{full.slice(shown)}</span></p>
            {!typing && !atChoices && <span className="absolute bottom-3 right-4 text-xs text-[#92400e]/60 caret">▼</span>}
          </div>
        </div>
      ) : bigNarr ? (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <p key={`${nodeId}-${li}`} className={`max-w-2xl text-center text-xl md:text-2xl leading-loose anim-fade ${mood === 'white' ? 'text-slate-600' : 'text-slate-200'}`}>
            {full.slice(0, shown)}<span className="opacity-0">{full.slice(shown)}</span>
          </p>
        </div>
      ) : (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[min(94%,860px)]">
          {name && !isNarr && (
            <div className="relative z-10 inline-block ml-4 -mb-3 px-4 py-1 font-display text-lg text-white border-[3px] border-ink-black"
                 style={{ background: ink ? '#16182a' : SPEAKER_COLOR[line.s], transform: 'rotate(-2deg)' }}>
              {name}
            </div>
          )}
          <div className={`relative min-h-[118px] px-6 pt-6 pb-5 border-[3px] ${
            dark ? 'bg-[#11131f]/92 border-white/70 text-slate-100' :
            ink ? 'bg-white border-ink-black text-ink-black' :
            isTv ? 'bg-[#0b1530]/95 border-blue-400 text-blue-200' :
            'bg-white/95 border-ink-black text-slate-800'}`}
               style={{ boxShadow: dark ? '0 0 0 1px rgba(255,255,255,.1), 0 10px 30px rgba(0,0,0,.4)' : '6px 6px 0 0 #16182a' }}>
            <p className={`text-lg md:text-xl leading-relaxed ${isNarr ? 'italic opacity-85' : ''} ${isTv ? 'font-mono tracking-wide' : ''}`}>
              {full.slice(0, shown)}<span className="opacity-0">{full.slice(shown)}</span>
            </p>
            {!typing && !atChoices && <span className="absolute bottom-2 right-4 text-sm caret">▼</span>}
          </div>
        </div>
      )}

      {/* 选项 */}
      {atChoices && (
        <div className="absolute inset-x-0 top-[22%] flex flex-col items-center gap-3 px-4" onClick={e => e.stopPropagation()}>
          {choices.map((c, i) => (
            <button key={c.t} onClick={() => choose(c)} onMouseEnter={() => sfx('hover')}
              className={`anim-up w-[min(92%,520px)] text-left px-5 py-3 text-base md:text-lg font-bold border-[3px] transition-transform hover:-translate-y-0.5 ${
                c.ng ? 'bg-sakura text-white border-[#9d174d]' : ink ? 'bg-white text-ink-black border-ink-black' : dark ? 'bg-[#1b1f33] text-white border-white/70' : 'bg-white text-ink border-ink'}`}
              style={{ animationDelay: `${i * 60}ms`, boxShadow: c.ng ? '4px 4px 0 0 #9d174d' : '4px 4px 0 0 #16182a' }}>
              <span className="opacity-50 mr-2 text-sm">{i + 1}</span>{c.t}
            </button>
          ))}
        </div>
      )}

      {/* 回看 */}
      {showLog && (
        <div className="absolute inset-0 z-20 bg-ink-black/70 flex items-center justify-center p-4 anim-fade" onClick={e => { e.stopPropagation(); setShowLog(false); }}>
          <div className="panel w-full max-w-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-ink/20">
              <h3 className="font-display text-xl text-ink">回看</h3>
              <button className="btn w-8 h-8" onClick={() => setShowLog(false)}><X size={16} /></button>
            </div>
            <div className="overflow-y-auto scroll-thin px-5 py-3 space-y-2.5">
              {log.map((l, i) => (
                <div key={i} className="text-sm leading-relaxed">
                  {SPEAKER_NAME[l.s] && l.s !== 'narr' && <span className="font-bold mr-2" style={{ color: SPEAKER_COLOR[l.s] }}>{l.t.startsWith('▶') ? '你的选择' : SPEAKER_NAME[l.s]}</span>}
                  <span className={l.s === 'narr' ? 'italic text-slate-500' : 'text-slate-800'}>{l.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-1 right-3 text-[10px] ${dark ? 'text-white/30' : 'text-ink/35'}`}>空格 / 点击 继续 · 按住 Ctrl 快进 · L 回看</div>
    </div>
  );
};

export default DialogueSystem;
