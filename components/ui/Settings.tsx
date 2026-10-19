import React, { useState } from 'react';
import { X, Music, Volume2, Monitor, Hand, Trash2, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import { useSave, setSettings, resetSave, Quality } from '../../core/save';
import { music, sfx } from '../../core/audio';
import { openWalkman } from '../Walkman';

interface Props { onClose: () => void; inGame?: boolean }

const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void; icon?: React.ReactNode }> = ({ label, value, onChange, icon }) => (
  <label className="flex items-center gap-3 py-2">
    <span className="w-24 shrink-0 flex items-center gap-1.5 text-sm font-bold">{icon}{label}</span>
    <input type="range" min={0} max={100} value={Math.round(value * 100)}
      onChange={e => onChange(parseInt(e.target.value, 10) / 100)}
      className="flex-1 accent-pink-500 h-2" />
    <span className="w-9 text-right text-xs tabular-nums">{Math.round(value * 100)}</span>
  </label>
);

const Toggle: React.FC<{ label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, desc, on, onChange }) => (
  <button onClick={() => { onChange(!on); sfx('click'); }} className="w-full flex items-center justify-between py-2 text-left group">
    <span>
      <span className="text-sm font-bold block">{label}</span>
      {desc && <span className="text-xs opacity-60">{desc}</span>}
    </span>
    <span className={`w-12 h-6 border-2 border-ink relative transition-colors ${on ? 'bg-sakura' : 'bg-white'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white border-2 border-ink transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </span>
  </button>
);

const Settings: React.FC<Props> = ({ onClose, inGame }) => {
  const save = useSave();
  const s = save.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const setVol = (patch: Partial<typeof s>) => { setSettings(patch); music.applyVolume(); };

  return (
    <div className="fixed inset-0 z-[120] bg-ink-black/60 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div className="panel w-full max-w-md max-h-[90vh] overflow-y-auto scroll-thin p-6 text-ink anim-pop" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl">设置</h2>
          <button className="btn w-9 h-9" onClick={() => { sfx('back'); onClose(); }} aria-label="关闭"><X size={18} /></button>
        </div>

        <section className="mb-4">
          <h3 className="text-xs font-bold opacity-60 mb-1">声音</h3>
          <Slider label="总音量" value={s.master} onChange={v => setVol({ master: v })} icon={<Volume2 size={14} />} />
          <Slider label="音乐" value={s.bgm} onChange={v => setVol({ bgm: v })} icon={<Music size={14} />} />
          <Slider label="音效" value={s.sfx} onChange={v => { setSettings({ sfx: v }); sfx('pat'); }} />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-bold">随身听</span>
            <button className="btn px-3 py-1 text-xs" onClick={() => { openWalkman(); }}><Headphones size={14} />打开（M）</button>
          </div>
          <p className="text-[11px] opacity-60 -mt-1">每个场景都有自己的配乐；想听别的歌，就掏出随身听。</p>
        </section>

        <section className="mb-4 border-t-2 border-dashed border-ink/20 pt-3">
          <h3 className="text-xs font-bold opacity-60 mb-1">画面与操作</h3>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-bold flex items-center gap-1.5"><Monitor size={14} />第二章画质</span>
            <div className="flex">
              {(['low', 'medium', 'high'] as Quality[]).map(q => (
                <button key={q} onClick={() => { setSettings({ quality: q }); sfx('click'); }}
                  className={`px-3 py-1 text-xs font-bold border-2 border-ink -ml-0.5 ${s.quality === q ? 'bg-ink text-white' : 'bg-white'}`}>
                  {q === 'low' ? '流畅' : q === 'medium' ? '均衡' : '精致'}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="减少晃动" desc="关闭镜头震动和晕3D时的画面摇晃" on={s.reduceMotion} onChange={v => setSettings({ reduceMotion: v })} />
          <Toggle label="操作提示" desc="在关卡里显示按键提示" on={s.hints} onChange={v => setSettings({ hints: v })} />
          <label className="flex items-center gap-3 py-2">
            <span className="w-24 shrink-0 flex items-center gap-1.5 text-sm font-bold"><Hand size={14} />视角灵敏度</span>
            <input type="range" min={40} max={200} value={Math.round(s.camSens * 100)} onChange={e => setSettings({ camSens: parseInt(e.target.value, 10) / 100 })} className="flex-1 accent-pink-500" />
          </label>
          <label className="flex items-center gap-3 py-2">
            <span className="w-24 shrink-0 text-sm font-bold">对话速度</span>
            <input type="range" min={50} max={300} value={Math.round(s.typeSpeed * 100)} onChange={e => setSettings({ typeSpeed: parseInt(e.target.value, 10) / 100 })} className="flex-1 accent-pink-500" />
          </label>
        </section>

        {!inGame && (
          <section className="border-t-2 border-dashed border-ink/20 pt-3">
            {!confirmReset ? (
              <button className="text-sm text-red-600 font-bold flex items-center gap-1.5 hover:underline" onClick={() => setConfirmReset(true)}>
                <Trash2 size={14} /> 清除存档
              </button>
            ) : (
              <div className="bg-red-50 border-2 border-red-400 p-3 text-sm">
                <p className="font-bold text-red-700 mb-2">清除后，两章的进度、收集品和手账都会回到最开始。设置会保留。</p>
                <div className="flex gap-2">
                  <button className="btn btn-pink px-3 py-1 text-xs" onClick={() => { resetSave(); setConfirmReset(false); sfx('back'); }}>确认清除</button>
                  <button className="btn px-3 py-1 text-xs" onClick={() => setConfirmReset(false)}>取消</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
