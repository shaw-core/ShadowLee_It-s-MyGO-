import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layer, LevelConfig, EntityType, LevelResult } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, LAYER_COOLDOWN } from '../constants';
import { BookOpen, Diamond, RotateCcw, Home, FastForward } from 'lucide-react';

interface GameEngineProps {
  levelConfig: LevelConfig;
  onFinishLevel: (result: LevelResult) => void;
  onExit: () => void;
  isGameCleared: boolean;
}

const GameEngine: React.FC<GameEngineProps> = ({ levelConfig, onFinishLevel, onExit, isGameCleared }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLayer, setCurrentLayer] = useState<Layer>(Layer.REAL);
  const [canSwitch, setCanSwitch] = useState(true);
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set());
  const [deathCount, setDeathCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [frameCount, setFrameCount] = useState(0); 
  
  const gameStateRef = useRef({
    player: { 
        x: levelConfig.playerStart.x, 
        y: levelConfig.playerStart.y, 
        vx: 0, 
        vy: 0, 
        w: 40, // Hitbox width
        h: 60, // Hitbox height
        isGrounded: false, 
        facingRight: true 
    },
    keys: { left: false, right: false, jump: false },
    camera: { x: 0 },
    collected: new Set<string>(),
    isDead: false,
    lastSwitchTime: 0
  });

  const resetLevel = useCallback(() => {
     gameStateRef.current.player.x = levelConfig.playerStart.x;
     gameStateRef.current.player.y = levelConfig.playerStart.y;
     gameStateRef.current.player.vx = 0;
     gameStateRef.current.player.vy = 0;
     gameStateRef.current.collected.clear();
     gameStateRef.current.isDead = false;
     setCollectedItems(new Set());
     setDeathCount(0);
     setCurrentLayer(Layer.REAL);
  }, [levelConfig]);

  // Reset state when level changes
  useEffect(() => {
     resetLevel();
  }, [levelConfig, resetLevel]);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current.isDead) return;
      switch(e.code) {
        case 'KeyA': case 'ArrowLeft': gameStateRef.current.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': gameStateRef.current.keys.right = true; break;
        case 'Space': case 'KeyW': case 'ArrowUp': 
          if (gameStateRef.current.player.isGrounded) {
             gameStateRef.current.player.vy = JUMP_FORCE;
             gameStateRef.current.player.isGrounded = false;
          }
          break;
        case 'KeyQ': handleLayerSwitch(); break;
        case 'Escape': onExit(); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyA': case 'ArrowLeft': gameStateRef.current.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': gameStateRef.current.keys.right = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentLayer, onExit]); 

  const handleLayerSwitch = useCallback(() => {
    const now = Date.now();
    if (now - gameStateRef.current.lastSwitchTime > LAYER_COOLDOWN) {
      setCurrentLayer(prev => prev === Layer.REAL ? Layer.MANGA : Layer.REAL);
      gameStateRef.current.lastSwitchTime = now;
      setCanSwitch(false);
      setTimeout(() => setCanSwitch(true), LAYER_COOLDOWN);
    }
  }, []);

  // NEW: Skip Level Function for NG+ (Auto-collect ALL items)
  const handleSkipLevel = () => {
    const finalCollected = new Set(gameStateRef.current.collected);
    
    // Auto-collect all PAGES and SHARDS in this level
    levelConfig.entities.forEach(e => {
        if (e.type === EntityType.COLLECTIBLE_PAGE || e.type === EntityType.COLLECTIBLE_SHARD) {
            finalCollected.add(e.id);
        }
    });

    onFinishLevel({
        levelId: levelConfig.id,
        timeTaken: 0,
        deathCount: 0,
        collectedIds: Array.from(finalCollected)
    });
  };

  const checkCollision = (rect1: any, rect2: any) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  const drawDousha = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      w: number, 
      h: number, 
      facingRight: boolean, 
      frame: number,
      vx: number,
      vy: number,
      isGrounded: boolean
  ) => {
    ctx.save();
    
    let animState = 'IDLE';
    if (!isGrounded) animState = 'JUMP';
    else if (Math.abs(vx) > 0.5) animState = 'RUN';

    let bodyY = 0;
    let legL = { x: 0, y: 0 }; 
    let legR = { x: 0, y: 0 };
    let armOffset = { x: 0, y: 0 };
    
    const isBlinking = frame % 180 > 174;

    if (animState === 'IDLE') {
        const beat = Math.floor(frame / 30) % 2;
        bodyY = beat === 0 ? 0 : 0.5;
        armOffset.y = beat === 0 ? 0 : 0.5;
    } else if (animState === 'RUN') {
        const runFrame = Math.floor(frame / 6) % 4;
        
        if (runFrame === 0) { // Leg L forward
            bodyY = 0;
            legL = { x: -1, y: 0 };
            legR = { x: 1, y: 0 };
        } else if (runFrame === 1) { // Mid
            bodyY = 1; 
            legL = { x: 0, y: 0 };
            legR = { x: 0, y: 0 };
        } else if (runFrame === 2) { // Leg R forward
            bodyY = 0;
            legL = { x: 1, y: 0 };
            legR = { x: -1, y: 0 };
        } else if (runFrame === 3) { // Mid/Hop
            bodyY = -1;
            legL = { x: 0, y: -1 };
            legR = { x: 0, y: -1 };
        }
    } else if (animState === 'JUMP') {
        bodyY = -1;
        legL = { x: 0, y: -1.5 }; 
        legR = { x: 0, y: -0.5 };
        armOffset.y = -2; 
    }

    if (!facingRight) {
        ctx.translate(x + w/2, y + h/2);
        ctx.scale(-1, 1);
        ctx.translate(-(x + w/2), -(y + h/2));
    }

    const pixelScale = w / 12; 
    const drawY = y + bodyY * pixelScale; 

    const rect = (c: string, gx: number, gy: number, gw: number, gh: number) => {
        ctx.fillStyle = c;
        ctx.fillRect(
            Math.floor(x + gx * pixelScale), 
            Math.floor(drawY + gy * (h/18)), 
            Math.ceil(gw * pixelScale), 
            Math.ceil(gh * (h/18))
        );
    };

    const legRect = (c: string, gx: number, gy: number, gw: number, gh: number, offset: {x: number, y: number}) => {
        ctx.fillStyle = c;
        ctx.fillRect(
            Math.floor(x + (gx + offset.x) * pixelScale), 
            Math.floor(drawY + (gy + offset.y) * (h/18)), 
            Math.ceil(gw * pixelScale), 
            Math.ceil(gh * (h/18))
        );
    };

    const C = {
        hair: '#e5e7eb',      
        hairShadow: '#9ca3af',
        jacket: '#1d4ed8',    
        jacketDark: '#1e3a8a',
        skin: '#ffedd5',      
        ears: '#111827',      
        glasses: '#374151',   
        lens: '#000000',      
        shirt: '#ffffff',     
        boots: '#271c19',     
        socks: '#f3f4f6'      
    };

    rect(C.hair, 2, 4, 8, 9);

    legRect(C.skin, 3.5, 14, 2, 2, legL);
    legRect(C.socks, 3.5, 15.5, 2, 1, legL);
    legRect(C.boots, 3, 16.5, 3, 1.5, legL);
    
    legRect(C.skin, 6.5, 14, 2, 2, legR);
    legRect(C.socks, 6.5, 15.5, 2, 1, legR);
    legRect(C.boots, 6, 16.5, 3, 1.5, legR);

    rect(C.jacket, 2.5, 9, 7, 5); 
    rect(C.shirt, 5, 9, 2, 5);
    rect('#fbcfe8', 5.5, 11, 1, 1);

    rect(C.jacket, 1.5, 9.5 + armOffset.y * 0.5, 2, 4);  
    rect(C.jacket, 8.5, 9.5 + armOffset.y * 0.5, 2, 4);  
    rect(C.skin, 2, 13 + armOffset.y * 0.5, 1.5, 1.5);
    rect(C.skin, 8.5, 13 + armOffset.y * 0.5, 1.5, 1.5);

    rect(C.skin, 2.5, 4, 7, 5); 
    
    if (isBlinking) {
        rect(C.glasses, 3, 6.5, 2, 0.5);
        rect(C.glasses, 7, 6.5, 2, 0.5);
    } else {
        rect('#ffffff', 3, 6, 2, 2);
        rect('#ffffff', 7, 6, 2, 2);
        rect('#2563eb', 4, 6, 1, 2); 
        rect('#2563eb', 7, 6, 1, 2);
    }
    
    rect('#fca5a5', 2.5, 7.5, 1.5, 0.5);
    rect('#fca5a5', 8, 7.5, 1.5, 0.5);
    rect('#be123c', 5.5, 8, 1, 0.5);

    rect(C.hair, 2, 2.5, 8, 2.5); 
    rect(C.hair, 1, 4, 2, 6); 
    rect(C.hair, 9, 4, 2, 6);

    rect(C.ears, 1.5, 1, 2.5, 2.5);
    rect(C.ears, 8, 1, 2.5, 2.5);
    rect('#374151', 2, 1.5, 1.5, 1.5); 

    rect(C.glasses, 2.5, 1.5, 7, 1); 
    rect(C.lens, 3, 2, 2.5, 1.5);    
    rect(C.lens, 6.5, 2, 2.5, 1.5);  
    rect(C.glasses, 5.5, 2, 1, 0.5); 

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;
    let isFinished = false;

    const render = () => {
      if (isFinished) return;
      
      setFrameCount(prev => prev + 1);
      const state = gameStateRef.current;
      const player = state.player;

      if (!state.isDead) {
        if (state.keys.left) {
            player.vx = -MOVE_SPEED;
            player.facingRight = false;
        } else if (state.keys.right) {
            player.vx = MOVE_SPEED;
            player.facingRight = true;
        } else {
            player.vx = 0;
        }

        player.vy += GRAVITY;
        player.x += player.vx;
        
        const relevantEntities = levelConfig.entities.filter(e => 
            e.layerMask === 'BOTH' || e.layerMask === currentLayer
        );

        for (const ent of relevantEntities) {
          if (ent.type === EntityType.PLATFORM && checkCollision(player, ent)) {
             if (player.vx > 0) player.x = ent.x - player.w;
             else if (player.vx < 0) player.x = ent.x + ent.w;
             player.vx = 0;
          }
        }

        player.y += player.vy;
        player.isGrounded = false;

        for (const ent of relevantEntities) {
          if (ent.type === EntityType.PLATFORM && checkCollision(player, ent)) {
            if (player.vy > 0) { 
              player.y = ent.y - player.h;
              player.isGrounded = true;
              player.vy = 0;
            } else if (player.vy < 0) { 
              player.y = ent.y + ent.h;
              player.vy = 0;
            }
          }
          if (ent.type === EntityType.HAZARD && checkCollision(player, ent)) {
             respawn();
          }
        }

        for (const ent of relevantEntities) {
            if ((ent.type === EntityType.COLLECTIBLE_PAGE || ent.type === EntityType.COLLECTIBLE_SHARD) && !state.collected.has(ent.id)) {
                if (checkCollision(player, ent)) {
                    state.collected.add(ent.id);
                    setCollectedItems(new Set(state.collected));
                }
            }
            if (ent.type === EntityType.GOAL && checkCollision(player, ent)) {
                isFinished = true;
                onFinishLevel({
                    levelId: levelConfig.id,
                    timeTaken: Date.now() - startTime,
                    deathCount: deathCount,
                    collectedIds: Array.from(state.collected)
                });
                return;
            }
        }

        if (player.y > 800) respawn();
      }

      state.camera.x = player.x - 400; 
      if (state.camera.x < 0) state.camera.x = 0;

      ctx.fillStyle = currentLayer === Layer.REAL ? '#FEF7CD' : '#ffffff'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentLayer === Layer.MANGA) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<canvas.width; i+=4) {
            for(let j=0; j<canvas.height; j+=4) {
                if ((i+j)%8 === 0) ctx.fillRect(i, j, 2, 2);
            }
        }
      }

      ctx.save();
      ctx.translate(-state.camera.x, 0);

      const entitiesToDraw = levelConfig.entities.filter(e => e.layerMask === 'BOTH' || e.layerMask === currentLayer);
      
      entitiesToDraw.forEach(ent => {
         if (state.collected.has(ent.id)) return;

         if (ent.type === EntityType.PLATFORM) {
             if (currentLayer === Layer.MANGA) {
                 ctx.fillStyle = '#ffffff';
                 ctx.strokeStyle = '#000000';
                 ctx.lineWidth = 4;
                 ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
                 ctx.beginPath();
                 ctx.moveTo(ent.x + 10, ent.y);
                 ctx.lineTo(ent.x + 10, ent.y + ent.h);
                 ctx.stroke();
             } else {
                 ctx.fillStyle = '#93C5FD'; 
                 ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
                 
                 ctx.fillStyle = '#F0ABFC'; 
                 ctx.fillRect(ent.x, ent.y, ent.w, 8);

                 ctx.strokeStyle = '#1E3A8A';
                 ctx.lineWidth = 2;
                 ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
             }
         } else if (ent.type === EntityType.HAZARD) {
             ctx.fillStyle = '#FDA4AF';
             for (let sx = ent.x; sx < ent.x + ent.w; sx += 20) {
                 ctx.beginPath();
                 ctx.moveTo(sx, ent.y + ent.h);
                 ctx.lineTo(sx + 10, ent.y);
                 ctx.lineTo(sx + 20, ent.y + ent.h);
                 ctx.fill();
             }
         } else if (ent.type === EntityType.GOAL) {
             ctx.fillStyle = '#fbbf24';
             ctx.globalAlpha = 0.6;
             ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
             ctx.globalAlpha = 1.0;
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 2;
             ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
         } else if (ent.type === EntityType.COLLECTIBLE_PAGE) {
             const floatY = Math.sin(frameCount * 0.1) * 3;
             ctx.fillStyle = '#ec4899';
             ctx.fillRect(ent.x, ent.y + floatY, ent.w, ent.h);
             ctx.fillStyle = 'white';
             ctx.fillRect(ent.x + 4, ent.y + floatY + 4, ent.w - 8, ent.h - 8);
         } else if (ent.type === EntityType.COLLECTIBLE_SHARD) {
             const floatY = Math.sin(frameCount * 0.1 + 2) * 3;
             ctx.fillStyle = '#60A5FA';
             ctx.beginPath();
             const cy = ent.y + floatY;
             ctx.moveTo(ent.x + ent.w/2, cy);
             ctx.lineTo(ent.x + ent.w, cy + ent.h/2);
             ctx.lineTo(ent.x + ent.w/2, cy + ent.h);
             ctx.lineTo(ent.x, cy + ent.h/2);
             ctx.fill();
         } else if (ent.type === EntityType.TEXT) {
             // Render Text Easter Egg
             ctx.font = 'bold 20px "Noto Sans SC"';
             ctx.fillStyle = ent.color || '#000000';
             // Add a float effect
             const floatY = Math.sin(frameCount * 0.05 + ent.x) * 5;
             ctx.fillText(ent.text || '', ent.x, ent.y + floatY);
         }
      });

      if (!state.isDead) {
        drawDousha(
            ctx, 
            player.x, 
            player.y, 
            player.w, 
            player.h, 
            player.facingRight, 
            frameCount,
            player.vx,
            player.vy,
            player.isGrounded
        );
      }

      const ghostEntities = levelConfig.entities.filter(e => e.layerMask !== 'BOTH' && e.layerMask !== currentLayer);
      ghostEntities.forEach(ent => {
         if (state.collected.has(ent.id)) return;
         ctx.strokeStyle = currentLayer === Layer.REAL ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.1)';
         ctx.lineWidth = 2;
         ctx.setLineDash([4, 4]);
         if (ent.type === EntityType.PLATFORM) {
            ctx.strokeRect(ent.x, ent.y, ent.w, ent.h);
         }
         ctx.setLineDash([]);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    const respawn = () => {
        if (gameStateRef.current.isDead) return;
        gameStateRef.current.isDead = true;
        setDeathCount(prev => prev + 1);
        
        setTimeout(() => {
            gameStateRef.current.player.x = levelConfig.playerStart.x;
            gameStateRef.current.player.y = levelConfig.playerStart.y;
            gameStateRef.current.player.vx = 0;
            gameStateRef.current.player.vy = 0;
            gameStateRef.current.isDead = false;
        }, 300);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentLayer, onFinishLevel, levelConfig, startTime, resetLevel, isGameCleared]); 

  const pageCount = Array.from(collectedItems).filter(id => id.startsWith('page')).length;
  const shardCount = Array.from(collectedItems).filter(id => id.startsWith('shard')).length;

  return (
    <div className="relative w-full h-screen bg-[#FEF7CD] overflow-hidden flex flex-col items-center justify-center font-pixel">
      <div className="absolute top-6 left-6 z-10 flex gap-4">
        <div className={`px-4 py-2 border-4 retro-border shadow-lg ${
            currentLayer === Layer.REAL 
            ? 'bg-white border-blue-500 text-blue-900' 
            : 'bg-black border-white text-white'
        }`}>
            {currentLayer === Layer.REAL ? '现实' : '漫画'}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
         {/* Collectibles HUD */}
         <div className="flex gap-2 mr-4">
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-pink-500 flex items-center gap-2 shadow-lg">
                <BookOpen size={18} />
                <span>{pageCount}</span>
             </div>
             <div className="px-3 py-2 bg-white border-4 border-blue-500 retro-border text-blue-500 flex items-center gap-2 shadow-lg">
                <Diamond size={18} />
                <span>{shardCount}</span>
             </div>
         </div>

         {/* Skip Button for NG+ */}
         {isGameCleared && (
           <button 
              onClick={handleSkipLevel} 
              title="跳过本关 (二周目特权)"
              className="p-2 bg-pink-500 border-4 border-pink-700 text-white retro-border shadow-lg hover:bg-pink-400 animate-pulse"
           >
               <FastForward size={20} /> <span className="text-xs ml-1 hidden md:inline">跳过</span>
           </button>
         )}

         {/* Control Buttons */}
         <button 
            onClick={resetLevel} 
            title="重新开始本关"
            className="p-2 bg-yellow-400 border-4 border-yellow-600 text-white retro-border shadow-lg hover:bg-yellow-300"
         >
             <RotateCcw size={20} />
         </button>
         <button 
            onClick={onExit} 
            title="返回标题"
            className="p-2 bg-red-500 border-4 border-red-700 text-white retro-border shadow-lg hover:bg-red-400"
         >
             <Home size={20} />
         </button>
      </div>
      
      {!canSwitch && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-red-500 font-bold animate-pulse text-xl bg-white/80 border-2 border-red-500 px-4 py-1 rounded">
            冷却中...
        </div>
      )}

      <div className="absolute bottom-4 left-4 text-sm text-blue-900 bg-white/50 px-2 rounded">
         [WASD/Space] 移动/跳跃 | [Q] 切换次元 | {levelConfig.name}
      </div>

      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={600}
        className={`border-4 transition-all duration-300 shadow-2xl ${
            currentLayer === Layer.MANGA ? 'border-black bg-white filter grayscale contrast-125' : 'border-blue-900 bg-[#FEF7CD]'
        }`}
      />
    </div>
  );
};

export default GameEngine;