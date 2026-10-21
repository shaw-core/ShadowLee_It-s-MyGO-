import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import DialogueSystem from '../components/DialogueSystem';
import { CH1_SCENES } from '../story/chapter1';
import { CH2_SCENES } from '../story/chapter2';
const q = new URLSearchParams(location.search);
const id = q.get('s') ?? 'c1_l1';
const base = CH1_SCENES[id] ?? CH2_SCENES[id];
const sc = q.get('n') ? { ...base, start: q.get('n')! } : base;
createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(#bfdbfe,#fbcfe8)' }}>
    <DialogueSystem scene={sc} ngPlus overlay={!!q.get('o')} onEnd={r => ((window as any).__end = r)} />
  </div>);
