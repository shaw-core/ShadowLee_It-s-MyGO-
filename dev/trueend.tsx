import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import TrueEnding from '../components/TrueEnding';
const c2 = new URLSearchParams(location.search).has('c2');
createRoot(document.getElementById('root')!).render(<TrueEnding cleared2={c2} skin="skin1" onExit={() => ((window as any).__exit = 1)} />);
