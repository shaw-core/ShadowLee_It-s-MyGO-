import React, { useState, useEffect, useRef } from 'react';
import { GameState, AffectionState, YuriEvent, LevelResult, EntityType } from './types';
import { EVENTS, LEVELS, BGM_URL, TOTAL_COLLECTIBLES_COUNT } from './constants';
import GameEngine from './components/GameEngine';
import DialogueSystem from './components/DialogueSystem';
import MainMenu from './components/MainMenu';
import Gallery from './components/Gallery';
import ResultScreen from './components/ResultScreen';
import SecretEnding from './components/SecretEnding';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [prevGameState, setPrevGameState] = useState<GameState>(GameState.MENU);
  
  // Game Progress
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [inventory, setInventory] = useState<Set<string>>(new Set());
  const [isGameCleared, setIsGameCleared] = useState(false);
  
  // Transient State
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [activeEvent, setActiveEvent] = useState<YuriEvent | null>(null);
  
  // Persisted Stats
  const [affection, setAffection] = useState<AffectionState[]>([
    { characterId: 'novus', name: '室友姐', value: 20, color: '#ec4899' },
  ]);

  // Audio Logic
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    // Initialize Audio Object only once
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
            .catch(e => console.warn("Audio autoplay blocked, waiting for interaction", e));
    }
  };

  const handleStartGame = () => {
    tryPlayMusic(); // Trigger music on user interaction
    setCurrentLevelIndex(0);
    setInventory(new Set());
    setGameState(GameState.PLAYING);
  };

  const handleGalleryOpen = () => {
    tryPlayMusic(); // Also trigger here in case they go to gallery first
    setGameState(GameState.GALLERY);
  };

  const handleSecretEnding = () => {
    tryPlayMusic();
    setGameState(GameState.SECRET_ENDING);
  };

  // Cheat to unlock all content for testing
  const handleCheatUnlock = () => {
      setIsGameCleared(true);
      const allCollectibles = new Set<string>();
      LEVELS.forEach(level => {
          level.entities.forEach(ent => {
             if (ent.type === EntityType.COLLECTIBLE_PAGE || ent.type === EntityType.COLLECTIBLE_SHARD) {
                 allCollectibles.add(ent.id);
             }
          });
      });
      setInventory(allCollectibles);
  };

  const handleLevelFinish = (result: LevelResult) => {
    setLastResult(result);
    // Add items to inventory
    const newInventory = new Set(inventory);
    result.collectedIds.forEach(id => newInventory.add(id));
    setInventory(newInventory);
    
    setGameState(GameState.RESULT);
  };

  const handleResultContinue = () => {
    // Determine if we should trigger a dialogue event or go to next level
    if (lastResult) {
        const potentialEventKey = `event_level${LEVELS[currentLevelIndex].id}`;
        const event = EVENTS[potentialEventKey];

        const isLevel6 = LEVELS[currentLevelIndex].id === 6;
        // In New Game+, we assume they might want to see the event even if they skipped the collectible logic, 
        // OR we enforce the collectible rule. Let's enforce rule but allow skipping gameplay to get it.
        if (event && (isLevel6 || inventory.has(event.requiredPageId))) {
            setActiveEvent(event);
            setPrevGameState(GameState.PLAYING); 
            setGameState(GameState.DIALOGUE);
            return;
        }
    }

    advanceLevel();
  };

  const handleDialogueComplete = (changes: {charId: string, amount: number}[]) => {
     setAffection(prev => prev.map(char => {
         const change = changes.find(c => c.charId === char.characterId);
         return change ? { ...char, value: Math.min(100, Math.max(0, char.value + change.amount)) } : char;
     }));
     
     setActiveEvent(null);

     if (prevGameState === GameState.GALLERY) {
         setGameState(GameState.GALLERY);
     } else {
         advanceLevel();
     }
  };

  const advanceLevel = () => {
      const nextIdx = currentLevelIndex + 1;
      if (nextIdx < LEVELS.length) {
          setCurrentLevelIndex(nextIdx);
          setGameState(GameState.PLAYING);
      } else {
          // All levels done -> Game Clear
          setIsGameCleared(true);
          setGameState(GameState.MENU);
      }
  };

  const handleGalleryReplay = (eventId: string) => {
      const event = EVENTS[eventId];
      if (event) {
          setActiveEvent(event);
          setPrevGameState(GameState.GALLERY);
          setGameState(GameState.DIALOGUE);
      }
  };

  // Check if all collectibles are found
  const isFullCompletion = inventory.size >= TOTAL_COLLECTIBLES_COUNT;

  return (
    <div className="w-full min-h-screen bg-zinc-950">
      {gameState === GameState.MENU && (
        <MainMenu 
            onStart={handleStartGame} 
            onGallery={handleGalleryOpen}
            onSecretEnding={handleSecretEnding}
            isGameCleared={isGameCleared}
            isFullCompletion={isFullCompletion}
            onCheatUnlock={handleCheatUnlock}
        />
      )}

      {gameState === GameState.PLAYING && (
        <GameEngine 
            levelConfig={LEVELS[currentLevelIndex]}
            onFinishLevel={handleLevelFinish} 
            onExit={() => setGameState(GameState.MENU)}
            isGameCleared={isGameCleared} // Pass this prop for the Skip button
        />
      )}

      {gameState === GameState.RESULT && lastResult && (
          <ResultScreen 
             result={lastResult} 
             onContinue={handleResultContinue} 
          />
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
          <SecretEnding 
            onExit={() => setGameState(GameState.MENU)} 
          />
      )}
    </div>
  );
};

export default App;