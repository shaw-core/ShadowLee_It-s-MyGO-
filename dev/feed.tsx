import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import ForeshadowFeed, { FeedStage } from '../components/ForeshadowFeed';
// 开发页：首通伏笔的监控画面，?stage=panda|mismatch|tear|off
const stage = (new URLSearchParams(location.search).get('stage') ?? 'panda') as FeedStage;
createRoot(document.getElementById('root')!).render(
  <div style={{ background: '#020604', padding: 16, width: 392 }}><ForeshadowFeed stage={stage} /></div>);
