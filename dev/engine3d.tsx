import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import GameEngine3D from '../components/GameEngine3D';
import { LEVELS3D } from '../game3d/levels3d';
import { setSettings } from '../core/save';
const q = new URLSearchParams(location.search);
const lv = parseInt(q.get('lv') ?? '1', 10);
if (q.get('q')) setSettings({ quality: q.get('q') as any });
(window as any).__log = [];
const App = () => {
  const [p, setP] = useState(false);
  return <GameEngine3D level={LEVELS3D[lv - 1]} skin={(q.get('skin') ?? 'skin3') as any} cleared paused={p}
    onFinish={r => (window as any).__log.push(['finish', r])} onExit={() => {}}
    onMoment={s => { (window as any).__log.push(['moment', s]); }} />;
};
createRoot(document.getElementById('root')!).render(<App />);
