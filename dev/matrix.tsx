import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MatrixEnding from '../components/MatrixEnding';
const direct = new URLSearchParams(location.search).has('direct');
createRoot(document.getElementById('root')!).render(
  <MatrixEnding direct={direct} hackAccess collectedPages={['page3d_ch1', 'page3d_ch2', 'page3d_ch5']} onExit={h => ((window as any).__exit = h)} />);
