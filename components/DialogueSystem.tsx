import React, { useState, useEffect } from 'react';
import { DialogueNode, YuriEvent } from '../types';

interface DialogueSystemProps {
  event: YuriEvent;
  onEventComplete: (affectionChanges: {charId: string, amount: number}[]) => void;
  isGameCleared: boolean;
}

const DialogueSystem: React.FC<DialogueSystemProps> = ({ event, onEventComplete, isGameCleared }) => {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(event.startNodeId);
  const [history, setHistory] = useState<string[]>([]);
  const [pendingAffection, setPendingAffection] = useState<{charId: string, amount: number}[]>([]);

  if (!currentNodeId) {
    // End of conversation
    setTimeout(() => onEventComplete(pendingAffection), 100);
    return null;
  }

  const node = event.nodes[currentNodeId];

  // Filter choices: hide those requiring clear if game is not cleared
  const availableChoices = node.choices.filter(c => {
      if (c.requiresClear) {
          return isGameCleared;
      }
      return true;
  });

  const handleChoice = (choiceId: string, nextNodeId: string | null, affectionDelta?: { charId: string; amount: number }) => {
    if (affectionDelta) {
      setPendingAffection(prev => [...prev, affectionDelta]);
    }

    setHistory(prev => [...prev, node.text]);
    setCurrentNodeId(nextNodeId);
  };

  const isMangaStyle = node.backgroundStyle === 'MANGA';

  return (
    <div className={`absolute inset-0 z-50 flex flex-col justify-end p-4 md:p-8 font-pixel ${isMangaStyle ? 'bg-white bg-opacity-95' : 'bg-black bg-opacity-50'}`}>
       {/* Character Portrait Placeholder */}
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-90 pointer-events-none">
          {node.speakerImage && (
              <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-8 shadow-[0_0_0_4px_rgba(0,0,0,0.1)] ${isMangaStyle ? 'border-black' : 'border-white'}`}>
                <img src={node.speakerImage} alt="Character" className="w-full h-full object-cover grayscale pixelated" style={{imageRendering: 'pixelated'}} />
              </div>
          )}
       </div>

       {/* RPG Dialogue Box */}
       <div className={`w-full max-w-4xl mx-auto border-4 retro-border shadow-[8px_8px_0_0_rgba(0,0,0,0.2)] p-6 min-h-[220px] flex flex-col justify-between relative ${
           isMangaStyle ? 'bg-white border-black text-black' : 'bg-[#FEF7CD] border-white text-blue-900'
       }`}>
          
          <div>
            <div className={`inline-block px-3 py-1 mb-3 text-lg font-bold border-2 ${
                isMangaStyle ? 'bg-black text-white border-black' : 'bg-blue-500 text-white border-blue-700'
            }`}>
                {node.speakerName}
            </div>
            <p className="text-xl leading-relaxed tracking-wide font-bold">{node.text}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
             {availableChoices.map((choice, idx) => (
                 <button 
                    key={choice.id}
                    onClick={() => handleChoice(choice.id, choice.nextNodeId, choice.affectionDelta)}
                    className={`w-full text-left px-4 py-3 border-4 transition-all hover:translate-x-2 ${
                        isMangaStyle 
                        ? 'border-black hover:bg-black hover:text-white' 
                        : (choice.requiresClear ? 'border-pink-400 bg-pink-50 hover:bg-pink-200 hover:border-pink-500 text-pink-700' : 'border-blue-200 bg-white hover:bg-pink-100 hover:border-pink-300 text-blue-800')
                    }`}
                 >
                    <span className="mr-3 blink text-pink-500">▶</span> 
                    {choice.requiresClear && <span className="bg-pink-500 text-white text-xs px-1 mr-2">[二周目]</span>}
                    {choice.text}
                 </button>
             ))}
          </div>
       </div>
    </div>
  );
};

export default DialogueSystem;
