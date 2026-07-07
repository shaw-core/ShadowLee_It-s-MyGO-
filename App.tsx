import React, { useState, useEffect, useRef } from 'react';
import { GameState, AffectionState, YuriEvent, LevelResult, EntityType } from './types';
import { EVENTS, LEVELS, TOTAL_COLLECTIBLES_COUNT as TOTAL_2D } from './constants';
import { BGM_TRACKS } from './music';
import { LEVELS3D, TOTAL_COLLECTIBLES_COUNT as TOTAL_3D } from './game3d/levels3d';
import { EVENTS3D } from './game3d/story3d';
import { SkinId } from './game3d/characters3d';
import GameEngine from './components/GameEngine';
import GameEngine3D from './components/GameEngine3D';
import DialogueSystem from './components/DialogueSystem';
import MainMenu from './components/MainMenu';
import SkinSelect from './components/SkinSelect';
import Gallery from './components/Gallery';
import ResultScreen from './components/ResultScreen';
import SecretEnding from './components/SecretEnding';
import SpecialCG3D from './components/SpecialCG3D';
import MatrixEnding from './components/MatrixEnding';

type GameMode = '2d' | '3d';
// 对话结束后要去哪
type AfterDialogue = 'ENTER_LEVEL' | 'ADVANCE' | 'GALLERY';

const SKIN_STORAGE_KEY = 'dousha3d_skin';
const BGM_STORAGE_KEY = 'dousha_bgm';
// BGM 选项：0..N-1 单曲循环，N = 顺序播放，N+1 = 关闭
const BGM_SEQ = BGM_TRACKS.length;
const BGM_OFF = BGM_TRACKS.length + 1;
const BGM_OPTION_COUNT = BGM_TRACKS.length + 2;
const bgmOptionName = (sel: number) =>
  sel < BGM_TRACKS.length ? BGM_TRACKS[sel].name : sel === BGM_SEQ ? '顺序播放全部' : '关闭 BGM';
const loadBgmSel = (): number => {
  try {
    const v = parseInt(localStorage.getItem(BGM_STORAGE_KEY) ?? '0', 10);
    if (v >= 0 && v < BGM_OPTION_COUNT) return v;
  } catch { /* ignore */ }
  return 0;
};
const loadSkin = (): SkinId => {
  try {
    const v = localStorage.getItem(SKIN_STORAGE_KEY);
    if (v === 'skin1' || v === 'skin2' || v === 'skin3' || v === 'skin4' || v === 'skinNovus') return v;
  } catch { /* 隐私模式等场景下静默降级 */ }
  return 'skin1';
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);

  // 模式与进度
  const [mode, setMode] = useState<GameMode>('2d');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [inventory, setInventory] = useState<Set<string>>(new Set());
  const [cleared2D, setCleared2D] = useState(false);
  const [cleared3D, setCleared3D] = useState(false);

  // 外观（仅 3D 使用）
  const [skin, setSkin] = useState<SkinId>(loadSkin);

  // 瞬时状态
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [activeEvent, setActiveEvent] = useState<YuriEvent | null>(null);
  const afterDialogueRef = useRef<AfterDialogue>('ADVANCE');

  // 好感度（两篇共用同一套羁绊）
  const [affection, setAffection] = useState<AffectionState[]>([
    { characterId: 'novus', name: '室友姐', value: 20, color: '#ec4899' },
  ]);

  // BGM
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [bgmSel, setBgmSel] = useState<number>(loadBgmSel);
  const bgmSelRef = useRef(bgmSel);
  const seqIndexRef = useRef(0);
  const [matrixHack, setMatrixHack] = useState(false);
  const [sysAnomaly, setSysAnomaly] = useState(false); // 仅在完成隐藏结局后的当次会话出现
  const [anomalyAcked, setAnomalyAcked] = useState(false);
  const [skinFlow, setSkinFlow] = useState<'MENU' | 'START3D'>('MENU');
  useEffect(() => { bgmSelRef.current = bgmSel; }, [bgmSel]);
  useEffect(() => { try { localStorage.removeItem('dousha_sys_anomaly'); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!audioRef.current) {
      const initial = bgmSel < BGM_TRACKS.length ? bgmSel : 0;
      const audio = new Audio(BGM_TRACKS[initial].url);
      audio.loop = bgmSel < BGM_TRACKS.length;
      audio.volume = 0.4;
      // 顺序播放：一曲结束接下一曲
      audio.onended = () => {
        if (bgmSelRef.current !== BGM_SEQ || !audioRef.current) return;
        seqIndexRef.current = (seqIndexRef.current + 1) % BGM_TRACKS.length;
        audioRef.current.src = BGM_TRACKS[seqIndexRef.current].url;
        audioRef.current.loop = false;
        audioRef.current.play().catch(() => {});
      };
      audioRef.current = audio;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selectBgm = (i: number) => {
    const sel = (i + BGM_OPTION_COUNT) % BGM_OPTION_COUNT;
    setBgmSel(sel);
    try { localStorage.setItem(BGM_STORAGE_KEY, String(sel)); } catch { /* ignore */ }
    const audio = audioRef.current;
    if (!audio) return;
    if (sel === BGM_OFF) {
      audio.pause();
      setIsMusicPlaying(false);
      return;
    }
    if (sel === BGM_SEQ) {
      audio.src = BGM_TRACKS[seqIndexRef.current % BGM_TRACKS.length].url;
      audio.loop = false;
    } else {
      audio.src = BGM_TRACKS[sel].url;
      audio.loop = true;
    }
    audio.play().then(() => setIsMusicPlaying(true)).catch(() => {});
  };
  const tryPlayMusic = () => {
    if (bgmSelRef.current === BGM_OFF) return;
    if (audioRef.current && !isMusicPlaying) {
      audioRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(e => console.warn('Audio autoplay blocked, waiting for interaction', e));
    }
  };

  // 当前模式对应的通关标记（决定引擎跳关按钮和直球选项）
  const clearedForMode = mode === '2d' ? cleared2D : cleared3D;
  // 当前对话事件属于哪一篇（图鉴回放时事件与 mode 可能无关）
  const eventCleared = activeEvent
    ? (activeEvent.id.startsWith('event3d') || activeEvent.id === 'event_prologue' ? cleared3D : cleared2D)
    : clearedForMode;

  // ---- 入口 ----
  const handleStart2D = () => {
    tryPlayMusic();
    setMode('2d');
    setCurrentLevelIndex(0);
    setGameState(GameState.PLAYING);
  };

  const handleStart3D = () => {
    tryPlayMusic();
    // 先选角色（防止忘记选），确认后再进序章
    setSkinFlow('START3D');
    setGameState(GameState.SKIN_SELECT);
  };

  const actuallyStart3D = () => {
    setMode('3d');
    setCurrentLevelIndex(0);
    afterDialogueRef.current = 'ENTER_LEVEL';
    setActiveEvent(EVENTS3D['event_prologue']);
    setGameState(GameState.DIALOGUE);
  };

  const handleSkinSelectOpen = () => {
    tryPlayMusic();
    setGameState(GameState.SKIN_SELECT);
  };
  const handleSkinConfirm = (s: SkinId) => {
    setSkin(s);
    try { localStorage.setItem(SKIN_STORAGE_KEY, s); } catch { /* ignore */ }
    if (skinFlow === 'START3D') {
      setSkinFlow('MENU');
      actuallyStart3D();
    } else {
      setGameState(GameState.MENU);
    }
  };

  const handleGalleryOpen = () => {
    tryPlayMusic();
    setGameState(GameState.GALLERY);
  };
  const handleSecretEnding = () => {
    tryPlayMusic();
    setGameState(GameState.SECRET_ENDING);
  };

  // 标题连点 5 次：测试用全解锁（两篇一起）
  const handleCheatUnlock = () => {
    setCleared2D(true);
    setCleared3D(true);
    const all = new Set<string>();
    LEVELS.forEach(level => level.entities.forEach(ent => {
      if (ent.type === EntityType.COLLECTIBLE_PAGE || ent.type === EntityType.COLLECTIBLE_SHARD) all.add(ent.id);
    }));
    LEVELS3D.forEach(lv => lv.entities.forEach(e => {
      if (e.type === 'PAGE' || e.type === 'SHARD') all.add(e.id);
    }));
    setInventory(all);
  };

  // ---- 通用流程 ----
  const handleLevelFinish = (result: LevelResult) => {
    setLastResult(result);
    const inv = new Set(inventory);
    result.collectedIds.forEach(id => inv.add(id));
    setInventory(inv);
    setGameState(GameState.RESULT);
  };

  const handleResultContinue = () => {
    if (lastResult) {
      if (mode === '2d') {
        const level = LEVELS[currentLevelIndex];
        const event = EVENTS[`event_level${level.id}`];
        const isLevel6 = level.id === 6;
        if (event && (isLevel6 || inventory.has(event.requiredPageId))) {
          afterDialogueRef.current = 'ADVANCE';
          setActiveEvent(event);
          setGameState(GameState.DIALOGUE);
          return;
        }
      } else {
        const level = LEVELS3D[currentLevelIndex];
        const event = EVENTS3D[`event3d_level${level.id}`];
        const isFinal = currentLevelIndex === LEVELS3D.length - 1;
        if (event && (isFinal || inventory.has(event.requiredPageId) || lastResult.collectedIds.includes(event.requiredPageId))) {
          afterDialogueRef.current = 'ADVANCE';
          setActiveEvent(event);
          setGameState(GameState.DIALOGUE);
          return;
        }
      }
    }
    advanceLevel();
  };

  const handleDialogueComplete = (changes: { charId: string; amount: number }[]) => {
    setAffection(prev => prev.map(char => {
      const total = changes.filter(c => c.charId === char.characterId).reduce((n, c) => n + c.amount, 0);
      return total !== 0 ? { ...char, value: Math.min(100, Math.max(0, char.value + total)) } : char;
    }));
    setActiveEvent(null);

    switch (afterDialogueRef.current) {
      case 'ENTER_LEVEL':
        setGameState(GameState.PLAYING);
        break;
      case 'GALLERY':
        setGameState(GameState.GALLERY);
        break;
      case 'ADVANCE':
      default:
        advanceLevel();
        break;
    }
  };

  const advanceLevel = () => {
    const total = mode === '2d' ? LEVELS.length : LEVELS3D.length;
    const next = currentLevelIndex + 1;
    if (next < total) {
      setCurrentLevelIndex(next);
      setGameState(GameState.PLAYING);
    } else if (mode === '2d') {
      setCleared2D(true);
      setGameState(GameState.MENU);
    } else {
      // 后编通关：黑屏 → 矩阵终端结局（合影可从主菜单回看）
      setCleared3D(true);
      setMatrixHack(effectiveSkin === 'skin2'); // 电视头小豆：TVHEAD_ADMIN 权限
      audioRef.current?.pause();               // 让位给终端的电子音效
      setGameState(GameState.MATRIX_ENDING);
    }
  };

  const handleGalleryReplay = (eventId: string) => {
    const event = EVENTS[eventId] ?? EVENTS3D[eventId];
    if (event) {
      afterDialogueRef.current = 'GALLERY';
      setActiveEvent(event);
      setGameState(GameState.DIALOGUE);
    }
  };

  const anomalyVisible = gameState === GameState.MENU && sysAnomaly && !anomalyAcked;
  useEffect(() => {
    if (anomalyVisible) {
      audioRef.current?.pause();
    } else if (gameState === GameState.MENU && isMusicPlaying && bgmSelRef.current !== BGM_OFF) {
      audioRef.current?.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomalyVisible, gameState]);

  const isFullCompletion = inventory.size >= TOTAL_2D + TOTAL_3D;
  // 特殊CG：在前编第7关收集到实体后解锁展示
  const hasSpecialCG = inventory.has('special_cg');
  // 隐藏外观：集齐后编全部薄荷糖（碎片）解锁室友姐
  const shard3dTotal = LEVELS3D.reduce((n, lv) => n + lv.entities.filter(e => e.type === 'SHARD').length, 0);
  const shard3dOwned = Array.from(inventory).filter((id: string) => id.startsWith('shard3d_')).length;
  const novusUnlocked = shard3dOwned >= shard3dTotal;
  // 皮肤守卫：未解锁时回退默认外观
  const effectiveSkin: SkinId = skin === 'skinNovus' && !novusUnlocked ? 'skin1' : skin;

  return (
    <div className="w-full min-h-screen bg-zinc-950">
      {gameState === GameState.MENU && (
        <MainMenu
          onStart2D={handleStart2D}
          onStart3D={handleStart3D}
          onGallery={handleGalleryOpen}
          onSkinSelect={handleSkinSelectOpen}
          onSecretEnding={handleSecretEnding}
          isGameCleared={cleared2D}
          is3DCleared={cleared3D}
          isFullCompletion={isFullCompletion}
          hasSpecialCG={hasSpecialCG}
          onSpecialCG3D={() => { tryPlayMusic(); setGameState(GameState.SPECIAL_CG_3D); }}
          onCheatUnlock={handleCheatUnlock}
          bgmName={bgmOptionName(bgmSel)}
          onPrevBgm={() => selectBgm(bgmSel - 1)}
          onNextBgm={() => selectBgm(bgmSel + 1)}
          systemAnomaly={anomalyVisible}
          onDismissAnomaly={() => setAnomalyAcked(true)}
        />
      )}

      {gameState === GameState.SKIN_SELECT && (
        <SkinSelect
          currentSkin={effectiveSkin}
          novusUnlocked={novusUnlocked}
          recommendSkin2={skinFlow === 'START3D' && cleared3D}
          onConfirm={handleSkinConfirm}
          onBack={() => { setSkinFlow('MENU'); setGameState(GameState.MENU); }}
        />
      )}

      {gameState === GameState.PLAYING && mode === '2d' && (
        <GameEngine
          levelConfig={LEVELS[currentLevelIndex]}
          onFinishLevel={handleLevelFinish}
          onExit={() => setGameState(GameState.MENU)}
          isGameCleared={cleared2D}
        />
      )}

      {gameState === GameState.PLAYING && mode === '3d' && (
        <GameEngine3D
          levelConfig={LEVELS3D[currentLevelIndex]}
          skin={effectiveSkin}
          onFinishLevel={handleLevelFinish}
          onExit={() => setGameState(GameState.MENU)}
          isGameCleared={cleared3D}
        />
      )}

      {gameState === GameState.RESULT && lastResult && (
        <ResultScreen result={lastResult} onContinue={handleResultContinue} />
      )}

      {gameState === GameState.DIALOGUE && activeEvent && (
        <DialogueSystem
          event={activeEvent}
          onEventComplete={handleDialogueComplete}
          isGameCleared={eventCleared}
        />
      )}

      {gameState === GameState.GALLERY && (
        <Gallery
          affectionData={affection}
          collectedPages={Array.from(inventory)}
          onBack={() => setGameState(GameState.MENU)}
          onReplayEvent={handleGalleryReplay}
        />
      )}

      {gameState === GameState.MATRIX_ENDING && (
        <MatrixEnding
          hackAccess={matrixHack}
          collectedPages={Array.from(inventory).filter((id: string) => id.startsWith('page3d_'))}
          onExit={(hacked) => {
            if (hacked) {
              setSysAnomaly(true);
              setAnomalyAcked(false);
            }
            if (isMusicPlaying && bgmSelRef.current !== BGM_OFF) audioRef.current?.play().catch(() => {});
            setGameState(GameState.MENU);
          }}
        />
      )}

      {gameState === GameState.SPECIAL_CG_3D && (
        <SpecialCG3D skin={effectiveSkin} onExit={() => setGameState(GameState.MENU)} />
      )}

      {gameState === GameState.SECRET_ENDING && (
        <SecretEnding onExit={() => setGameState(GameState.MENU)} />
      )}
    </div>
  );
};

export default App;
