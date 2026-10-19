// ============================================================
// 豆沙的手账：人物 / 世界 / 回忆（剧情回放）/ 未授权附录
// ============================================================
import React, { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Heart, Play, BookOpen, Film, TerminalSquare } from 'lucide-react';
import { CODEX, CodexCat } from '../story/codex';
import { CH1_SCENES, CH1_LEVEL_SCENE } from '../story/chapter1';
import { CH2_SCENES, CH2_LEVEL_SCENE } from '../story/chapter2';
import { PAGES } from '../story/cutscenes';
import { useSave, isUnlocked, hasFlag } from '../core/save';
import { sfx } from '../core/audio';
import { HIDDEN_FILES, SEALED_CONTENT, buildDraftPagesFile } from './MatrixEnding';

type Tab = CodexCat | 'memory';

interface Props {
  onBack: () => void;
  onReplayScene: (id: string) => void;
  onReplayPage: (id: string) => void;
  /** 重新接入 3D 档案馆（只有电视头小豆进去） */
  onArchive?: () => void;
}

const UNLOCK_HINT = (u: string) => {
  const m = u.match(/^c([12]):(\d+)$/);
  if (m) return `通过第${m[1] === '1' ? '一' : '二'}章 第${m[2]}关`;
  if (u === 'clear1') return '通关第一章';
  if (u === 'clear2') return '通关第二章';
  if (u === 'pat') return '在第二章里，摸摸熊猫的头';
  if (u.startsWith('page')) return '捡到某一页';
  return '？？？';
};

const PAGE_TITLES: Record<string, string> = { c1_open: '开场 · 某个晚上', c1_close: '第一章 · 终页', c2_open: '第二章 · 第零页', c2_mid1: '第二章 · 薄荷糖', c2_mid2: '第二章 · 那条街', c2_mid3: '第二章 · 彩色的手', c2_mid4: '第二章 · 天上的缝', arc_open: '附录 · 另一条线' };

const Codex: React.FC<Props> = ({ onBack, onReplayScene, onReplayPage, onArchive }) => {
  const save = useSave();
  const hacked = hasFlag('hack');
  const [tab, setTab] = useState<Tab>('people');
  const [sel, setSel] = useState<string | null>('p_dousha');

  const entries = useMemo(() => CODEX.filter(e => e.cat === tab), [tab]);
  const memScenes = useMemo(() => {
    const lv1 = Object.values(CH1_LEVEL_SCENE).map(id => CH1_SCENES[id]);
    const lv2 = ['c2_arrive', 'c2_firstpanda', ...Object.values(CH2_LEVEL_SCENE), 'c2_end'].map(id => CH2_SCENES[id]).filter(Boolean);
    const mom1 = Object.values(CH1_SCENES).filter(s => s.id.startsWith('c1_m_'));
    const mom2 = Object.values(CH2_SCENES).filter(s => s.id.startsWith('c2_m_'));
    return [
      { label: '第一章 · 漫画的世界', list: [...lv1, ...mom1] },
      { label: '第二章 · 多边形的世界', list: [...lv2, ...mom2] },
    ];
  }, []);

  const cur = CODEX.find(e => e.id === sel);
  const curOpen = cur ? isUnlocked(cur.unlock, save) : false;
  const totalOpen = CODEX.filter(e => e.cat !== 'appendix' && isUnlocked(e.unlock, save)).length;
  const totalAll = CODEX.filter(e => e.cat !== 'appendix').length;

  const cached = useMemo(() => {
    if (!hacked) return [];
    const list: { name: string; content: string }[] = [];
    if (hasFlag('read:draft_pages.dat')) list.push({ name: 'draft_pages.dat', content: buildDraftPagesFile(save.inventory) });
    HIDDEN_FILES.forEach(f => { if (f.content && f.content !== 'ENCRYPTED' && hasFlag(`read:${f.name}`)) list.push({ name: f.name, content: f.content }); });
    if (hasFlag('read:sealed')) list.push({ name: 'sealed.enc → 已解密', content: SEALED_CONTENT });
    return list;
  }, [hacked, save]);
  const [file, setFile] = useState<number | null>(null);

  const aff = save.affection;
  const hearts = Math.min(5, Math.floor(aff / 20));

  const TabBtn: React.FC<{ id: Tab; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <button onClick={() => { sfx('page'); setTab(id); setSel(id === 'memory' ? null : CODEX.find(e => e.cat === id)?.id ?? null); setFile(null); }}
      className={`flex items-center gap-1.5 px-4 py-2 font-bold text-sm border-[3px] border-b-0 -mb-[3px] ${tab === id ? 'bg-paper-2 border-ink text-ink z-10' : 'bg-white/60 border-ink/30 text-ink/50 hover:text-ink'} ${id === 'appendix' ? '!border-[#20c25e] !text-[#20c25e] !bg-black' : ''}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-paper overflow-y-auto scroll-thin">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(30,58,138,.08) 1.2px, transparent 1.4px)', backgroundSize: '14px 14px' }} />
      <div className="relative max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-5">
          <button className="btn w-10 h-10" onClick={() => { sfx('back'); onBack(); }} aria-label="返回"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-none">豆沙的手账</h1>
            <p className="text-xs text-ink/60 mt-1">已经写下 {totalOpen}/{totalAll} 页</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-white border-2 border-ink px-3 py-1.5" title="和室友姐的羁绊">
            <span className="text-xs font-bold text-orange-novus">小室</span>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map(i => <Heart key={i} size={16} className={i < hearts ? 'text-sakura' : 'text-ink/20'} fill={i < hearts ? 'currentColor' : 'none'} />)}
            </div>
            {aff > 100 && <span className="text-[10px] font-bold text-sakura">+{aff - 100}</span>}
          </div>
        </div>

        <div className="flex gap-1 pl-2 relative">
          <TabBtn id="people" label="人物" icon={<BookOpen size={15} />} />
          <TabBtn id="world" label="世界" icon={<BookOpen size={15} />} />
          <TabBtn id="memory" label="回忆" icon={<Film size={15} />} />
          {hacked && <TabBtn id="appendix" label="附录" icon={<TerminalSquare size={15} />} />}
        </div>

        <div className={`border-[3px] min-h-[60vh] ${tab === 'appendix' ? 'bg-black border-[#20c25e]' : 'bg-paper-2 border-ink'}`} style={{ boxShadow: tab === 'appendix' ? '0 0 30px rgba(32,194,94,.25)' : '6px 6px 0 0 #1e3a8a' }}>
          {tab === 'memory' ? (
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-bold text-ink mb-2">漫画分镜</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PAGES).filter(id => id !== 'arc_open' || save.seenScenes.includes('page:arc_open')).map(id => {
                    const open = save.seenScenes.includes(`page:${id}`);
                    return (
                      <button key={id} disabled={!open} onClick={() => { sfx('confirm'); onReplayPage(id); }}
                        className="btn px-3 py-2 text-sm">{open ? <><Play size={14} />{PAGE_TITLES[id] ?? id}</> : <><Lock size={14} />？？？</>}</button>
                    );
                  })}
                </div>
              </div>
              {memScenes.map(g => (
                <div key={g.label}>
                  <h3 className="font-bold text-ink mb-2">{g.label}</h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {g.list.map(s => {
                      const open = save.seenScenes.includes(s.id);
                      return (
                        <button key={s.id} disabled={!open} onClick={() => { sfx('confirm'); onReplayScene(s.id); }}
                          className={`text-left px-3 py-2 border-2 text-sm font-bold flex items-center gap-2 ${open ? 'bg-white border-ink text-ink hover:bg-sakura-soft' : 'bg-white/40 border-dashed border-ink/25 text-ink/30 cursor-not-allowed'}`}>
                          {open ? <Play size={13} className="shrink-0 text-sakura" /> : <Lock size={13} className="shrink-0" />}
                          <span className="truncate">{open ? s.title : '还没有读到这一段'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'appendix' ? (
            <div className="p-5 font-mono text-[#20c25e] text-sm">
              <pre className="whitespace-pre-wrap opacity-80 mb-4">{CODEX.find(e => e.id === 'x_note')?.body}</pre>
              {onArchive && (
                <button className="mb-5 border border-[#20c25e] px-3 py-1.5 hover:bg-[#20c25e] hover:text-black" onClick={() => { sfx('confirm'); onArchive(); }}>
                  {'> 接入 /SYSTEM_HIDDEN（TVHEAD）'}
                </button>
              )}
              {file === null ? (
                <div className="space-y-1">
                  {cached.length === 0 && <p className="opacity-50">（缓存为空。）</p>}
                  {cached.map((f, i) => (
                    <button key={f.name} className="block hover:bg-[#20c25e] hover:text-black px-1" onClick={() => { sfx('click'); setFile(i); }}>&gt; {f.name}</button>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="text-yellow-300 mb-2">$ cat {cached[file].name}</div>
                  <pre className="whitespace-pre-wrap leading-relaxed">{cached[file].content}</pre>
                  <button className="mt-4 border border-[#20c25e] px-3 py-1 hover:bg-[#20c25e] hover:text-black" onClick={() => setFile(null)}>[ 返回 ]</button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-[240px_1fr]">
              <div className="border-b-[3px] md:border-b-0 md:border-r-[3px] border-dashed border-ink/25 p-3 max-h-[40vh] md:max-h-none overflow-y-auto scroll-thin">
                {entries.map(e => {
                  const open = isUnlocked(e.unlock, save);
                  return (
                    <button key={e.id} onClick={() => { sfx('click'); setSel(e.id); }}
                      className={`w-full text-left px-3 py-2 mb-1 flex items-center gap-2 text-sm font-bold border-2 ${sel === e.id ? 'bg-white border-ink text-ink' : 'border-transparent hover:bg-white/60'} ${open ? 'text-ink' : 'text-ink/35'}`}>
                      {!open && <Lock size={12} className="shrink-0" />}
                      <span className="truncate">{open ? e.title : '？？？'}</span>
                      {open && e.tag && <span className="ml-auto text-[10px] font-normal text-sakura shrink-0">{e.tag}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="p-6 md:p-10 flex items-start justify-center">
                {cur && (
                  <div key={cur.id} className="paper-note relative w-full max-w-lg px-8 py-8 anim-pop" style={{ transform: `rotate(${(cur.id.length % 3 - 1) * 0.6}deg)` }}>
                    <span className="tape" />
                    {curOpen ? (
                      <>
                        <h2 className="font-display text-2xl text-[#3b2f2a] mb-1">{cur.title}</h2>
                        {cur.tag && <p className="text-xs text-sakura font-bold mb-4">{cur.tag}</p>}
                        <p className="font-hand text-[21px] md:text-[23px] leading-[36px] text-[#3b2f2a] whitespace-pre-line">{cur.body}</p>
                        {cur.id === 'p_pat' && <p className="mt-4 text-sm font-bold text-[#92400e]">已经摸了 {save.pats} 次。</p>}
                      </>
                    ) : (
                      <div className="text-center py-10 text-[#92400e]/60">
                        <Lock size={28} className="mx-auto mb-3" />
                        <p className="font-hand text-2xl">这一页还是空白的。</p>
                        <p className="text-xs mt-2">{UNLOCK_HINT(cur.unlock)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Codex;
