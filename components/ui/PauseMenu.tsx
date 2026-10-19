import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Settings as Cog, Home, FastForward, Headphones } from 'lucide-react';
import Settings from './Settings';
import { sfx } from '../../core/audio';
import { openWalkman } from '../Walkman';

interface Props {
  chapterLabel: string;
  title: string;
  stats?: React.ReactNode;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onSkip?: () => void;
  dark?: boolean;
}

const PauseMenu: React.FC<Props> = ({ chapterLabel, title, stats, onResume, onRestart, onExit, onSkip, dark }) => {
  const [settings, setSettings] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (settings) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); onResume(); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onResume, settings]);

  const Item: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; pink?: boolean; autoFocus?: boolean }> = ({ icon, label, onClick, pink, autoFocus }) => (
    <button autoFocus={autoFocus} onMouseEnter={() => sfx('hover')} onClick={() => { sfx('click'); onClick(); }}
      className={`btn w-full justify-start px-4 py-2.5 text-base ${pink ? 'btn-pink' : ''}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className={`absolute inset-0 z-[90] flex items-center justify-center p-4 anim-fade ${dark ? 'bg-black/60' : 'bg-ink-black/45'}`}>
      <div className="panel w-full max-w-xs p-5 anim-pop">
        <p className="text-xs font-bold text-sakura">{chapterLabel}</p>
        <h2 className="font-display text-2xl text-ink mb-1 leading-tight">{title}</h2>
        {stats && <div className="text-xs text-ink/70 mb-4">{stats}</div>}
        {!confirmExit ? (
          <div className="flex flex-col gap-2.5 mt-3">
            <Item autoFocus icon={<Play size={16} />} label="继续" onClick={onResume} pink />
            <Item icon={<RotateCcw size={16} />} label="重新开始本关" onClick={onRestart} />
            {onSkip && <Item icon={<FastForward size={16} />} label="跳过本关（二周目）" onClick={onSkip} />}
            <Item icon={<Headphones size={16} />} label="随身听（M）" onClick={() => openWalkman()} />
            <Item icon={<Cog size={16} />} label="设置" onClick={() => setSettings(true)} />
            <Item icon={<Home size={16} />} label="返回标题" onClick={() => setConfirmExit(true)} />
          </div>
        ) : (
          <div className="mt-3 text-sm text-ink">
            <p className="mb-3 font-bold">回到标题后，本关进度不会保留（已通过的关卡和收集品不受影响）。</p>
            <div className="flex gap-2">
              <button className="btn btn-pink px-4 py-2 flex-1" onClick={() => { sfx('back'); onExit(); }}>返回标题</button>
              <button className="btn px-4 py-2 flex-1" onClick={() => setConfirmExit(false)}>再想想</button>
            </div>
          </div>
        )}
        <p className="text-[11px] text-ink/50 mt-4">按 Esc 继续游戏</p>
      </div>
      {settings && <Settings inGame onClose={() => setSettings(false)} />}
    </div>
  );
};

export default PauseMenu;
