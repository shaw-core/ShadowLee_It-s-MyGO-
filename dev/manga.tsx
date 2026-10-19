import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MangaCutscene from '../components/MangaCutscene';
import { PAGES } from '../story/cutscenes';
const id = new URLSearchParams(location.search).get('p') ?? 'c1_open';
createRoot(document.getElementById('root')!).render(<MangaCutscene page={PAGES[id]} onEnd={() => ((window as any).__end = 1)} />);
