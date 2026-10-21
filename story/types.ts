// ============================================================
// 剧情脚本格式（v2）
// 一个 Scene = 若干 Node；每个 Node 依次播放若干 Line，
// 播完后若有 choices 则让玩家选择，否则走 next。
// ============================================================

/** 说话人 */
export type Speaker =
  | 'dousha'   // 李豆沙
  | 'novus'    // 室友姐（小室）
  | 'kimo'     // Kimo熊
  | 'narr'     // 旁白 / 内心独白（无头像）
  | 'note'     // 纸条（以纸片卡片呈现）
  | 'danmaku'  // 弹幕（第一章）
  | 'tv';      // 来历不明的蓝色信号（只在隐藏线索里出现）

/** 头像表情 */
export type Face =
  | 'normal' | 'smile' | 'grin' | 'blush' | 'surprised'
  | 'sad' | 'worried' | 'dizzy' | 'pout' | 'closed' | 'serious' | 'tease';

/** 对话框背景气氛 */
export type Mood = 'real' | 'manga' | 'dark' | 'white' | 'poly' | 'wire';

export interface Line {
  s: Speaker;
  t: string;
  f?: Face;
  /** 这一句的气氛（不填沿用场景默认） */
  m?: Mood;
}

export interface Choice {
  t: string;
  next: string | null;
  /** 室友姐好感变化 */
  aff?: number;
  /** 二周目才出现的「直球」选项 */
  ng?: boolean;
}

export interface SceneNode {
  lines: Line[];
  /** 这一段对话背景里要真正画出来的东西（不是台词）。clock7：墙上指着七点整的钟 */
  prop?: 'clock7';
  choices?: Choice[];
  next?: string | null;
}

export interface Scene {
  id: string;
  /** 记忆回放里显示的标题 */
  title: string;
  chapter: 1 | 2;
  /** 需要拾取的页（为空表示无条件播放） */
  page?: string;
  /** 默认气氛 */
  mood: Mood;
  start: string;
  nodes: Record<string, SceneNode>;
}

// ---- 书写辅助：让脚本读起来像剧本 ----
export const D = (t: string, f: Face = 'normal', m?: Mood): Line => ({ s: 'dousha', t, f, m });
export const N = (t: string, f: Face = 'normal', m?: Mood): Line => ({ s: 'novus', t, f, m });
export const K = (t: string, f: Face = 'normal', m?: Mood): Line => ({ s: 'kimo', t, f, m });
export const R = (t: string, m?: Mood): Line => ({ s: 'narr', t, m });
export const NOTE = (t: string): Line => ({ s: 'note', t });
export const DM = (t: string): Line => ({ s: 'danmaku', t });

export const SPEAKER_NAME: Record<Speaker, string> = {
  dousha: '李豆沙',
  novus: '室友姐',
  kimo: 'Kimo熊',
  narr: '',
  note: '纸条',
  danmaku: '弹幕',
  tv: '？？？',
};

export const SPEAKER_COLOR: Record<Speaker, string> = {
  dousha: '#2563eb',
  novus: '#ea580c',
  kimo: '#0f172a',
  narr: '#64748b',
  note: '#92400e',
  danmaku: '#db2777',
  tv: '#3b82f6',
};
