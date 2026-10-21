// ============================================================
// 李豆沙的次元冲刺 —— 流程总控
// 菜单 → 章节 → 关卡 → 结算 → 剧情 → 下一关 …… → 结局
// 剧情（对话 / 漫画分镜）以覆盖层播放；关卡中的小剧场会暂停引擎。
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import { LevelResult } from './types';
import { LEVELS2D, pageIdFor, shardIdFor } from './game2d/levels';
import { LEVELS3D } from './game3d/levels3d';
import { CH1_SCENES, CH1_LEVEL_SCENE, CH1_ALWAYS } from './story/chapter1';
import { CH2_SCENES, CH2_LEVEL_SCENE, CH2_ALWAYS } from './story/chapter2';
import { PAGES, CH2_MID_PAGE } from './story/cutscenes';
import { Scene } from './story/types';
import { useSave, getSave, updateSave, markSeen, hasSeen, SkinId } from './core/save';
import { music, sfx, leaveUauaPresence } from './core/audio';
import { score } from './core/score';
import { cheatUnlockAll, effectiveSkin, novusUnlocked, SPECIAL_CG_ID, statKey } from './core/progress';
import { SPECIAL_CG_URL } from './constants';
import GameEngine from './components/GameEngine';
import GameEngine3D from './components/GameEngine3D';
import DialogueSystem, { DialogueResult } from './components/DialogueSystem';
import MangaCutscene from './components/MangaCutscene';
import MainMenu from './components/MainMenu';
import ChapterSelect, { LevelCardInfo } from './components/ChapterSelect';
import SkinSelect from './components/SkinSelect';
import Codex from './components/Codex';
import ResultScreen from './components/ResultScreen';
import TrueEnding from './components/TrueEnding';
import SpecialCG3D from './components/SpecialCG3D';
import MatrixEnding from './components/MatrixEnding';
import Walkman from './components/Walkman';
import AudioNotice from './components/AudioNotice';
import UauaWakeupCutscene from './components/UauaWakeupCutscene';

type Ch = 1 | 2;
type Screen =
  | { k: 'menu' }
  | { k: 'chapter'; ch: Ch }
  | { k: 'skin'; then: 'menu' | { level: number } }
  | { k: 'play'; ch: Ch; idx: number; run: number }
  | { k: 'result'; ch: Ch; idx: number; res: LevelResult; newBest: boolean; story: boolean }
  | { k: 'codex' }
  | { k: 'matrix'; direct?: boolean }
  | { k: 'cg3d' }
  | { k: 'secret' }
  | { k: 'specialcg' }
  | { k: 'wakeup'; replay?: boolean }   // 第二章过场《快醒醒！》
  | { k: 'blank' };

type Story = { kind: 'dlg'; id: string; overlay: boolean } | { kind: 'page'; id: string } | null;

const ALL_SCENES: Record<string, Scene> = { ...CH1_SCENES, ...CH2_SCENES };

const items2D = (idx: number) => {
  const lv = LEVELS2D[idx];
  const ids: string[] = [];
  let n = 0;
  lv.map.forEach(r => r.split('').forEach(c => { if (c === 'p') ids.push(pageIdFor(lv.id)); if (c === 's') ids.push(shardIdFor(lv.id, ++n)); }));
  return ids;
};
const items3D = (idx: number) => LEVELS3D[idx].entities.filter(e => e.type === 'PAGE' || e.type === 'SHARD').map(e => e.id);
const itemsFor = (ch: Ch, idx: number) => (ch === 1 ? items2D(idx) : items3D(idx));

const CARDS: Record<Ch, LevelCardInfo[]> = {
  1: LEVELS2D.map((l, i) => ({ id: l.id, title: l.title, sub: l.sub, items: items2D(i) })),
  2: LEVELS3D.map((l, i) => ({ id: l.id, title: l.name, sub: l.subtitle, items: items3D(i) })),
};

/** 第一章通关后的特别回顾 */
const SpecialCGView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] bg-[#1b1c2a] flex flex-col items-center justify-center p-6 anim-fade">
      <div className="relative border-[6px] border-white bg-white rotate-1 max-w-[92vw]" style={{ boxShadow: '0 0 60px rgba(236,72,153,.45)' }}>
        {err ? (
          <div className="w-[300px] h-[220px] flex items-center justify-center text-ink/50 font-bold">（图片没有加载出来）</div>
        ) : (
          <img src={SPECIAL_CG_URL} alt="特别回顾" onError={() => setErr(true)} className="block max-h-[72vh] w-auto object-contain" style={{ imageRendering: 'pixelated' }} />
        )}
        <span className="absolute bottom-3 right-4 text-white font-bold italic text-sm md:text-lg pointer-events-none" style={{ textShadow: '0 2px 4px rgba(0,0,0,.9)' }}>to be continue......</span>
      </div>
      <p className="mt-6 text-white font-display text-2xl">感谢游玩！室守星沙是真实的！</p>
      <p className="mt-1 text-white/60 text-sm">第一章 · 完。可以在标题画面随时回看这一张。</p>
      <button className="btn btn-pink mt-6 px-6 py-2" onClick={onExit}><Home size={16} />回到标题</button>
    </div>
  );
};

const App: React.FC = () => {
  const save = useSave();
  const [screen, setScreen] = useState<Screen>({ k: 'menu' });
  const [story, setStory] = useState<Story>(null);
  const afterStory = useRef<(() => void) | null>(null);
  const [anomaly, setAnomaly] = useState(false);   // 只存在于本次会话，绝不写进存档
  const [anomalyAcked, setAnomalyAcked] = useState(false);

  // 第一次交互后开始放音乐（浏览器的自动播放限制）
  useEffect(() => {
    const go = () => { music.start(); window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);

  const anomalyVisible = screen.k === 'menu' && anomaly && !anomalyAcked;
  useEffect(() => { music.suppress(screen.k === 'matrix' || anomalyVisible); }, [screen.k, anomalyVisible]);
  // 悠亚只会在关卡里出现：离开关卡画面（结算、菜单、终端……）时一定离场，恢复该画面的配乐
  useEffect(() => { if (screen.k !== 'play') leaveUauaPresence('screen'); }, [screen.k]);

  // 场景配乐：跟着画面走（结算 / 空白 / 关卡中的对话沿用当前的曲子）
  const playCh = screen.k === 'play' ? screen.ch : 0;
  const playIdx = screen.k === 'play' ? screen.idx : -1;
  useEffect(() => {
    let id: string | null | undefined;
    if (story?.kind === 'page') id = story.id.startsWith('c2') ? 'manga3d' : 'manga';
    else if (story?.kind === 'dlg' && story.id === 'c2_end') id = 'ending';
    else if (story) id = undefined;
    else switch (screen.k) {
      case 'menu': case 'chapter': case 'skin': case 'codex': id = 'title'; break;
      case 'play': id = `c${playCh}_${playIdx + 1}`; break;
      case 'cg3d': case 'secret': case 'specialcg': id = 'ending'; break;
      case 'matrix': id = null; break;
      case 'wakeup': id = null; break;   // 过场自己管声音；场景配乐淡出
      default: id = undefined;
    }
    if (id !== undefined) score.scene(id);
  }, [screen.k, playCh, playIdx, story]);

  const skinNow: SkinId = effectiveSkin(save);

  // ---------------- 剧情 ----------------
  const playStory = useCallback((s: Story, then: () => void) => {
    afterStory.current = then;
    setStory(s);
  }, []);
  const endStory = useCallback(() => {
    const f = afterStory.current;
    afterStory.current = null;
    setStory(null);
    f?.();
  }, []);
  const onDialogueEnd = useCallback((id: string) => (r: DialogueResult) => {
    updateSave(d => {
      d.affection = Math.max(0, Math.min(150, d.affection + r.aff));
      if (!d.seenScenes.includes(id)) d.seenScenes.push(id);
    });
    endStory();
  }, [endStory]);

  // ---------------- 关卡 ----------------
  const play = useCallback((ch: Ch, idx: number) => {
    setScreen(prev => ({ k: 'play', ch, idx, run: (prev.k === 'play' ? prev.run : 0) + 1 }));
  }, []);


  const startChapter = useCallback((ch: Ch, idx = 0) => {
    sfx('confirm');
    if (ch === 1) {
      if (idx === 0) {
        setScreen({ k: 'blank' });
        playStory({ kind: 'page', id: 'c1_open' }, () => { markSeen('page:c1_open'); play(1, 0); });
      } else play(1, idx);
    } else {
      setScreen({ k: 'skin', then: { level: idx } });
    }
  }, [play, playStory]);

  const afterSkinForCh2 = useCallback((idx: number) => {
    if (idx === 0) {
      setScreen({ k: 'blank' });
      playStory({ kind: 'page', id: 'c2_open' }, () => {
        markSeen('page:c2_open');
        playStory({ kind: 'dlg', id: 'c2_arrive', overlay: false }, () => play(2, 0));
      });
    } else play(2, idx);
  }, [play, playStory]);

  const openChapter = useCallback((ch: Ch) => {
    const d = getSave();
    const fresh = ch === 1 ? d.reached1 === 0 && !d.stats[statKey(1, 1)] : d.reached2 === 0 && !d.stats[statKey(2, 1)];
    if (fresh) startChapter(ch, 0);
    else setScreen({ k: 'chapter', ch });
  }, [startChapter]);

  const onFinish = useCallback((ch: Ch, idx: number) => (res: LevelResult) => {
    const lvId = ch === 1 ? LEVELS2D[idx].id : LEVELS3D[idx].id;
    const key = statKey(ch, lvId);
    const prev = getSave().stats[key];
    const newBest = !res.skipped && (!prev?.best || res.timeTaken < prev.best);
    updateSave(d => {
      const st = d.stats[key] ?? { clears: 0, got: [] };
      st.clears += 1;
      if (!res.skipped) {
        if (!st.best || res.timeTaken < st.best) st.best = res.timeTaken;
        if (st.minDeaths === undefined || res.deathCount < st.minDeaths) st.minDeaths = res.deathCount;
      }
      st.got = Array.from(new Set([...st.got, ...res.collectedIds]));
      d.stats[key] = st;
      const inv = new Set(d.inventory); res.collectedIds.forEach(i => inv.add(i)); d.inventory = Array.from(inv);
      if (ch === 1) d.reached1 = Math.max(d.reached1, Math.min(idx + 1, LEVELS2D.length - 1));
      else d.reached2 = Math.max(d.reached2, Math.min(idx + 1, LEVELS3D.length - 1));
    });
    const sceneId = ch === 1 ? CH1_LEVEL_SCENE[lvId] : CH2_LEVEL_SCENE[lvId];
    const sc = ALL_SCENES[sceneId];
    const always = ch === 1 ? CH1_ALWAYS.has(lvId) : CH2_ALWAYS.has(lvId);
    const story = !!sc && (always || !sc.page || getSave().inventory.includes(sc.page));
    setScreen({ k: 'result', ch, idx, res, newBest, story: story && !always });
  }, []);

  const wakeupDone = useRef(false);
  const finishChapter = useCallback((ch: Ch) => {
    if (ch === 1) {
      playStory({ kind: 'page', id: 'c1_close' }, () => {
        markSeen('page:c1_close');
        updateSave(d => { d.cleared1 = true; if (!d.inventory.includes(SPECIAL_CG_ID)) d.inventory.push(SPECIAL_CG_ID); });
        setScreen({ k: 'specialcg' });
      });
    } else {
      // 第五关跳进裂缝之后：先放独立过场《快醒醒！》，结束后再接原有 c2_end → 终端结局
      wakeupDone.current = false;
      setScreen({ k: 'wakeup' });
    }
  }, [playStory]);

  // 过场结束（只会接一次）：原有的第二章收束——c2_end → 写通关 → 终端
  const onWakeupEnd = useCallback((replay?: boolean) => {
    if (wakeupDone.current) return;
    wakeupDone.current = true;
    markSeen('cut:c2_wakeup');
    if (replay) { setScreen({ k: 'codex' }); return; }
    setScreen({ k: 'blank' });
    playStory({ kind: 'dlg', id: 'c2_end', overlay: false }, () => {
      updateSave(d => { d.cleared2 = true; });
      setScreen({ k: 'matrix' });
    });
  }, [playStory]);

  const advance = useCallback((ch: Ch, idx: number) => {
    const total = ch === 1 ? LEVELS2D.length : LEVELS3D.length;
    if (idx + 1 < total) {
      // 第二章：关与关之间插一页 3D 分镜（第一次看到时播放，之后可以在图鉴里重看）
      const mid = ch === 2 ? CH2_MID_PAGE[LEVELS3D[idx].id] : undefined;
      if (mid && PAGES[mid] && !hasSeen(`page:${mid}`)) {
        setScreen({ k: 'blank' });
        playStory({ kind: 'page', id: mid }, () => { markSeen(`page:${mid}`); play(ch, idx + 1); });
      } else play(ch, idx + 1);
    }
    else { setScreen({ k: 'blank' }); finishChapter(ch); }
  }, [play, finishChapter, playStory]);

  // 开发 / 验收：直接跳到某一关或回菜单（正式版不存在）
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__app = { play: (ch: Ch, idx: number) => { setStory(null); play(ch, idx); }, menu: () => { setStory(null); setScreen({ k: 'menu' }); }, screen: () => screenRef.current,
      finish2: () => finishChapter(2), advanceLast2: () => advance(2, LEVELS3D.length - 1) };
  }, [play, finishChapter, advance]);
  const screenRef = useRef(screen); screenRef.current = screen;

  const onResultContinue = useCallback(() => {
    if (screen.k !== 'result') return;
    const { ch, idx } = screen;
    const lvId = ch === 1 ? LEVELS2D[idx].id : LEVELS3D[idx].id;
    const sceneId = ch === 1 ? CH1_LEVEL_SCENE[lvId] : CH2_LEVEL_SCENE[lvId];
    const sc = ALL_SCENES[sceneId];
    const always = ch === 1 ? CH1_ALWAYS.has(lvId) : CH2_ALWAYS.has(lvId);
    if (sc && (always || !sc.page || getSave().inventory.includes(sc.page))) {
      setScreen({ k: 'blank' });
      playStory({ kind: 'dlg', id: sceneId, overlay: false }, () => advance(ch, idx));
    } else advance(ch, idx);
  }, [screen, playStory, advance]);

  const onMoment = useCallback((id: string) => {
    if (!ALL_SCENES[id]) return;
    playStory({ kind: 'dlg', id, overlay: true }, () => { /* 回到关卡 */ });
  }, [playStory]);

  const toMenu = useCallback(() => { setStory(null); afterStory.current = null; setScreen({ k: 'menu' }); }, []);

  // ---------------- 渲染 ----------------
  const ngFor = (id: string) => (id.startsWith('c2') ? save.cleared2 : save.cleared1);
  const storyNode = useMemo(() => {
    if (!story) return null;
    if (story.kind === 'page') return <MangaCutscene key={story.id} page={PAGES[story.id]} onEnd={endStory} />;
    const sc = ALL_SCENES[story.id];
    if (!sc) return null;
    return <DialogueSystem key={story.id} scene={sc} ngPlus={ngFor(story.id)} overlay={story.overlay} onEnd={onDialogueEnd(story.id)} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, endStory, onDialogueEnd, save.cleared1, save.cleared2]);

  return (
    <div className="w-full h-[100dvh] bg-ink-black overflow-hidden">
      {screen.k === 'menu' && (
        <MainMenu
          onChapter={openChapter}
          onCodex={() => setScreen({ k: 'codex' })}
          onSkinSelect={() => setScreen({ k: 'skin', then: 'menu' })}
          onSecretEnding={() => setScreen({ k: 'secret' })}
          onSpecialCG3D={() => setScreen({ k: 'cg3d' })}
          onCheatUnlock={cheatUnlockAll}
          systemAnomaly={anomalyVisible}
          onDismissAnomaly={() => setAnomalyAcked(true)}
        />
      )}

      {screen.k === 'chapter' && (
        <ChapterSelect chapter={screen.ch} levels={CARDS[screen.ch]}
          onPlay={i => (screen.ch === 1 ? startChapter(1, i) : startChapter(2, i))}
          onRestart={() => startChapter(screen.ch, 0)}
          onBack={() => setScreen({ k: 'menu' })} />
      )}

      {screen.k === 'skin' && (
        <SkinSelect
          currentSkin={skinNow}
          novusUnlocked={novusUnlocked(save)}
          recommendSkin2={screen.then !== 'menu' && save.cleared2}
          onConfirm={s => {
            updateSave(d => { d.skin = s; });
            const then = screen.then;
            if (then === 'menu') setScreen({ k: 'menu' });
            else afterSkinForCh2(then.level);
          }}
          onBack={() => setScreen({ k: 'menu' })}
        />
      )}

      {screen.k === 'play' && screen.ch === 1 && (
        <GameEngine key={`c1-${screen.idx}-${screen.run}`} level={LEVELS2D[screen.idx]} cleared={save.cleared1} paused={!!story}
          onFinish={onFinish(1, screen.idx)} onExit={toMenu} onMoment={onMoment} />
      )}
      {screen.k === 'play' && screen.ch === 2 && (
        <GameEngine3D key={`c2-${screen.idx}-${screen.run}`} level={LEVELS3D[screen.idx]} skin={skinNow} cleared={save.cleared2} paused={!!story}
          onFinish={onFinish(2, screen.idx)} onExit={toMenu} onMoment={onMoment} />
      )}

      {screen.k === 'result' && (
        <ResultScreen result={screen.res}
          title={screen.ch === 1 ? LEVELS2D[screen.idx].title : LEVELS3D[screen.idx].name}
          allItems={itemsFor(screen.ch, screen.idx)}
          newBest={screen.newBest} storyUnlocked={screen.story}
          onContinue={onResultContinue}
          onRetry={() => play(screen.ch, screen.idx)} />
      )}

      {screen.k === 'codex' && (
        <Codex onBack={() => setScreen({ k: 'menu' })}
          onReplayScene={id => playStory({ kind: 'dlg', id, overlay: false }, () => setScreen({ k: 'codex' }))}
          onReplayPage={id => playStory({ kind: 'page', id }, () => setScreen({ k: 'codex' }))}
          onArchive={() => setScreen({ k: 'matrix', direct: true })}
          onReplayWakeup={() => { wakeupDone.current = false; setScreen({ k: 'wakeup', replay: true }); }} />
      )}

      {screen.k === 'matrix' && (
        <MatrixEnding
          direct={!!screen.direct}
          hackAccess={screen.direct || skinNow === 'skin2'}
          collectedPages={save.inventory.filter(i => i.startsWith('page3d_'))}
          onExit={hacked => {
            if (screen.direct) { setScreen({ k: 'codex' }); return; }
            if (hacked) { setAnomaly(true); setAnomalyAcked(false); }
            setScreen({ k: 'menu' });
          }} />
      )}

      {screen.k === 'wakeup' && (
        <UauaWakeupCutscene key={screen.replay ? 'replay' : 'first'} allowSkip={screen.replay || hasSeen('cut:c2_wakeup')}
          onEnd={() => onWakeupEnd(screen.replay)} />
      )}
      {screen.k === 'cg3d' && <SpecialCG3D skin={skinNow} onExit={() => setScreen({ k: 'menu' })} />}
      {screen.k === 'secret' && <TrueEnding cleared2={save.cleared2} skin={skinNow} onExit={() => setScreen({ k: 'menu' })} />}
      {screen.k === 'specialcg' && <SpecialCGView onExit={() => setScreen({ k: 'menu' })} />}

      {storyNode}
      <Walkman hidden={screen.k === 'matrix' || screen.k === 'wakeup' || anomalyVisible} />
      <AudioNotice />
    </div>
  );
};

export default App;
