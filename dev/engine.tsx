import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import GameEngine from '../components/GameEngine';
import { LEVELS2D } from '../game2d/levels';
const q = new URLSearchParams(location.search);
const lv = parseInt(q.get('lv') ?? '1', 10);
const App = () => {
  const [moment, setMoment] = useState<string | null>(null);
  (window as any).__log = (window as any).__log ?? [];
  return <>
    <GameEngine level={LEVELS2D[lv - 1]} cleared paused={!!moment}
      onFinish={r => { (window as any).__log.push(['finish', r]); }}
      onExit={() => (window as any).__log.push(['exit'])}
      onMoment={s => { (window as any).__log.push(['moment', s]); if (q.get('mom')) setMoment(s); }} />
    {moment && <div className="fixed bottom-2 left-2 bg-white p-2 z-50" onClick={() => setMoment(null)}>MOMENT {moment}</div>}
  </>;
};
createRoot(document.getElementById('root')!).render(<App />);
(window as any).__ready = true;
