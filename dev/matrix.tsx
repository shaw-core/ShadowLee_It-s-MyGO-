import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MatrixEnding from '../components/MatrixEnding';
const direct = new URLSearchParams(location.search).has('direct');
// 开发：window.__remount() 卸载再装上一遍（测反复进出时的资源释放）
const Dev = () => {
  const [k, setK] = useState(0);
  const [on, setOn] = useState(true);
  (window as any).__remount = () => new Promise<void>(res => { setOn(false); setTimeout(() => { setK(x => x + 1); setOn(true); setTimeout(res, 50); }, 300); });
  return on ? <MatrixEnding key={k} direct={direct} hackAccess collectedPages={['page3d_ch1', 'page3d_ch2', 'page3d_ch5']} onExit={h => ((window as any).__exit = h)} /> : null;
};
createRoot(document.getElementById('root')!).render(<Dev />);
