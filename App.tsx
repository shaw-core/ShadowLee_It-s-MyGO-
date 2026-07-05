import React, { useState, useEffect, useRef } from 'react';
import { GameState, AffectionState, YuriEvent, LevelResult } from './types';
import { BGM_URL } from './constants';
import { LEVELS3D, TOTAL_COLLECTIBLES_COUNT } from './game3d/levels3d';
import { EVENTS3D } from './game3d/story3d';
import { SkinId } from './game3d/characters3d';
import GameEngine3D from './components/GameEngine3D';
import DialogueSystem from './components/DialogueSystem';
import MainMenu from './components/MainMenu';
import SkinSelect from './components/SkinSelect';
import Gallery from './components/Gallery';
import ResultScreen from './components/ResultScreen';
import SecretEnding from './components/SecretEnding';

// 对话结束后要去哪
type AfterDialogue = 'ENTER_LEVEL' | 'ADVANCE' | 'GALLERY';

const SKIN_STORAGE_KEY = 'dousha3d_skin';
const loadSkin = (): SkinId => {
  try {
    const v = localStorage.getItem(SKIN_STORAGE_KEY);
    if (v === 'skin1' || v === 'skin2' || v === 'skin3' || v === 'skin4') return v;
  } catch { /* 隐私模式等场景下静默降级 */ }
  return 'skin1';
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);

  // 游戏进度
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [inventory, setInventory] = useState<Set<string>>(new Set());
  const [isGameCleared, setIsGameCleared] = useState(false);

  // 外观
  const [skin, setSkin] = useState<SkinId>(loadSkin);

  // 瞬时状态
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [activeEvent, setActiveEvent] = useState<YuriEvent | null>(null);
  const afterDialogueRef = useRef<AfterDialogue>('ADVANCE');

  // 好感度
  const [affection, setAffection] = useState<AffectionState[]>([
    { characterId: 'novus', name: '室友姐', value: 20, color: '#ec4899' },
  ]);

  // BGM
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(BGM_URL);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
  }, []);
  const tryPlayMusic = () => {
    if (audioRef.current && !isMusicPlaying) {
      audioRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(e => console.warn('Audio autoplay blocked, waiting for interaction', e));
    }
  };

  // ---- 主流程 ----
  const handleStartGame = () => {
    tryPlayMusic();
    setCurrentLevelIndex(0);
    setInventory(new Set());
    // 后编开场：先播序章对话，再进第1关
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
    setGameState(GameState.MENU);
  };

  const handleGalleryOpen = () => {
    tryPlayMusic();
    setGameState(GameState.GALLERY);
  };
  const handleSecretEnding = () => {
    tryPlayMusic();
    setGameState(GameState.SECRET_ENDING);
  };

  // 标题连点 5 次：测试用全解锁
  const handleCheatUnlock = () => {
    setIsGameCleared(true);
    const all = new Set<string>();
    LEVELS3D.forEach(lv => lv.entities.forEach(e => {
      if (e.type === 'PAGE' || e.type === 'SHARD') all.add(e.id);
    }));
    setInventory(all);
  };

  const handleLevelFinish = (result: LevelResult) => {
    setLastResult(result);
    const inv = new Set(inventory);
    result.collectedIds.forEach(id => inv.add(id));
    setInventory(inv);
    setGameState(GameState.RESULT);
  };

  const handleResultContinue = () => {
    if (lastResult) {
      const level = LEVELS3D[currentLevelIndex];
      const event = EVENTS3D[`event_level${level.id}`];
      const isFinal = currentLevelIndex === LEVELS3D.length - 1;
      // 终章必看剧情；其余关需要拿到对应漫画页
      if (event && (isFinal || inventory.has(event.requiredPageId) || lastResult.collectedIds.includes(event.requiredPageId))) {
        afterDialogueRef.current = 'ADVANCE';
        setActiveEvent(event);
        setGameState(GameState.DIALOGUE);
        return;
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
    const next = currentLevelIndex + 1;
    if (next < LEVELS3D.length) {
      setCurrentLevelIndex(next);
      setGameState(GameState.PLAYING);
    } else {
      setIsGameCleared(true);
      setGameState(GameState.MENU);
    }
  };

  const handleGalleryReplay = (eventId: string) => {
    const event = EVENTS3D[eventId];
    if (event) {
      afterDialogueRef.current = 'GALLERY';
      setActiveEvent(event);
      setGameState(GameState.DIALOGUE);
    }
  };

  const isFullCompletion = inventory.size >= TOTAL_COLLECTIBLES_COUNT;

  return (
    <div className="w-full min-h-screen bg-zinc-950">
      {gameState === GameState.MENU && (
        <MainMenu
          onStart={handleStartGame}
          onGallery={handleGalleryOpen}
          onSkinSelect={handleSkinSelectOpen}
          onSecretEnding={handleSecretEnding}
          isGameCleared={isGameCleared}
          isFullCompletion={isFullCompletion}
          onCheatUnlock={handleCheatUnlock}
        />
      )}

      {gameState === GameState.SKIN_SELECT && (
        <SkinSelect
          currentSkin={skin}
          onConfirm={handleSkinConfirm}
          onBack={() => setGameState(GameState.MENU)}
        />
      )}

      {gameState === GameState.PLAYING && (
        <GameEngine3D
          levelConfig={LEVELS3D[currentLevelIndex]}
          skin={skin}
          onFinishLevel={handleLevelFinish}
          onExit={() => setGameState(GameState.MENU)}
          isGameCleared={isGameCleared}
        />
      )}

      {gameState === GameState.RESULT && lastResult && (
        <ResultScreen result={lastResult} onContinue={handleResultContinue} />
      )}

      {gameState === GameState.DIALOGUE && activeEvent && (
        <DialogueSystem
          event={activeEvent}
          onEventComplete={handleDialogueComplete}
          isGameCleared={isGameCleared}
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

      {gameState === GameState.SECRET_ENDING && (
        <SecretEnding onExit={() => setGameState(GameState.MENU)} />
      )}
    </div>
  );
};

export default App;
