import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MainMenu from '../components/MainMenu';
const App = () => {
  const [on, setOn] = useState(true);
  return <MainMenu onChapter={() => {}} onCodex={() => {}} onSkinSelect={() => {}} onSecretEnding={() => {}} onSpecialCG3D={() => {}} onCheatUnlock={() => {}}
    systemAnomaly={on} onDismissAnomaly={() => setOn(false)} />;
};
createRoot(document.getElementById('root')!).render(<App />);
