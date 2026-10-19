// ============================================================
// 存档与设置（localStorage，任何读写失败都静默降级为内存存档）
// 注意：「世界系统异常」警告是一次性的会话事件，绝不写进存档。
// ============================================================
import { useSyncExternalStore } from 'react';

export type SkinId = 'skin1' | 'skin2' | 'skin3' | 'skin4' | 'skinNovus';
export type Quality = 'high' | 'medium' | 'low';

export interface Settings {
  master: number;        // 0~1
  bgm: number;           // 0~1
  sfx: number;           // 0~1
  bgmSel: number;        // 旧版：曲目选择（只用于迁移到随身听）
  player: PlayerState;   // 随身听
  quality: Quality;
  reduceMotion: boolean; // 关掉镜头晃动与眩晕摇摆
  camSens: number;       // 0.4~2
  hints: boolean;        // 操作提示
  typeSpeed: number;     // 对话打字速度 1=正常
}

export interface PlayerState {
  idx: number;                          // 当前曲目
  mode: 'one' | 'seq' | 'shuffle';      // 单曲循环 / 顺序 / 随机
  on: boolean;                          // 上次关游戏时是否在放
}

export interface LevelStat {
  clears: number;
  best?: number;     // ms
  minDeaths?: number;
  got: string[];     // 本关收集过的物品
}

export interface SaveData {
  v: 2;
  cleared1: boolean;
  cleared2: boolean;
  reached1: number;    // 第一章已解锁到第几关（0 起）
  reached2: number;
  inventory: string[];
  affection: number;   // 室友姐羁绊 0~100（显示上可溢出到 ♥♥）
  stats: Record<string, LevelStat>;
  flags: string[];
  skin: SkinId;
  seenScenes: string[];
  pats: number;
  settings: Settings;
}

const KEY = 'dousha_save_v2';

const DEFAULT_SETTINGS: Settings = {
  master: 0.9, bgm: 0.45, sfx: 0.7, bgmSel: 0, player: { idx: 1, mode: 'seq', on: false },
  quality: 'high', reduceMotion: false, camSens: 1, hints: true, typeSpeed: 1,
};

const fresh = (): SaveData => ({
  v: 2, cleared1: false, cleared2: false, reached1: 0, reached2: 0,
  inventory: [], affection: 20, stats: {}, flags: [], skin: 'skin1',
  seenScenes: [], pats: 0, settings: { ...DEFAULT_SETTINGS },
});

const load = (): SaveData => {
  const base = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      const st = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) } as Settings;
      // 旧版的 BGM 选择 → 随身听里的曲目（不自动播放，默认听场景配乐）
      if (!d.settings?.player) st.player = { idx: st.bgmSel >= 0 && st.bgmSel < 10 ? st.bgmSel : 1, mode: 'seq', on: false };
      return { ...base, ...d, settings: st } as SaveData;
    }
    // 迁移旧版本的零散键
    const oldSkin = localStorage.getItem('dousha3d_skin');
    if (oldSkin && ['skin1', 'skin2', 'skin3', 'skin4', 'skinNovus'].includes(oldSkin)) base.skin = oldSkin as SkinId;
    const oldBgm = parseInt(localStorage.getItem('dousha_bgm') ?? '', 10);
    if (!Number.isNaN(oldBgm)) base.settings.bgmSel = oldBgm;
    localStorage.removeItem('dousha_sys_anomaly'); // 旧版遗留，警告不应持久化
  } catch { /* 隐私模式等 */ }
  return base;
};

let state: SaveData = load();
const listeners = new Set<() => void>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

const persist = () => {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, 120);
};

export const getSave = () => state;

export const updateSave = (fn: (d: SaveData) => SaveData | void) => {
  const draft: SaveData = structuredClone(state);
  const out = fn(draft);
  state = (out as SaveData | undefined) ?? draft;
  persist();
  listeners.forEach(l => l());
};

export const useSave = (): SaveData =>
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => state, () => state);

// ---- 便捷操作 ----
export const hasFlag = (f: string) => state.flags.includes(f);
export const addFlag = (f: string) => { if (!hasFlag(f)) updateSave(d => { d.flags.push(f); }); };
export const hasSeen = (id: string) => state.seenScenes.includes(id);
export const markSeen = (id: string) => { if (!hasSeen(id)) updateSave(d => { d.seenScenes.push(id); }); };
export const addItems = (ids: string[]) => updateSave(d => {
  const s = new Set(d.inventory); ids.forEach(i => s.add(i)); d.inventory = Array.from(s);
});
export const setSettings = (patch: Partial<Settings>) => updateSave(d => { d.settings = { ...d.settings, ...patch }; });
export const resetSave = () => {
  const keepSettings = state.settings;
  state = { ...fresh(), settings: keepSettings };
  persist();
  listeners.forEach(l => l());
};

/** 解锁条件检查（手账 / 记忆） */
export const isUnlocked = (cond: string, d: SaveData = state): boolean => {
  if (cond === 'start') return true;
  if (cond === 'clear1') return d.cleared1;
  if (cond === 'clear2') return d.cleared2;
  const m = cond.match(/^c([12]):(\d+)$/);
  if (m) {
    const lv = parseInt(m[2], 10);
    const stat = d.stats[`c${m[1]}_${lv}`];
    return !!stat && stat.clears > 0;
  }
  if (d.flags.includes(cond)) return true;
  return d.inventory.includes(cond);
};
