// 进度与收集统计（两章共用）
import { LEVELS2D, pageIdFor, shardIdFor } from '../game2d/levels';
import { LEVELS3D } from '../game3d/levels3d';
import { SaveData, updateSave } from './save';

export const ALL_2D_ITEMS: string[] = LEVELS2D.flatMap(lv => {
  const ids: string[] = [];
  let n = 0;
  lv.map.forEach(row => row.split('').forEach(c => {
    if (c === 'p') ids.push(pageIdFor(lv.id));
    if (c === 's') ids.push(shardIdFor(lv.id, ++n));
  }));
  return ids;
});
export const ALL_3D_ITEMS: string[] = LEVELS3D.flatMap(lv => lv.entities.filter(e => e.type === 'PAGE' || e.type === 'SHARD').map(e => e.id));
export const SHARDS_3D = ALL_3D_ITEMS.filter(id => id.startsWith('shard3d_'));
export const SPECIAL_CG_ID = 'special_cg';

export const count2D = (d: SaveData) => ALL_2D_ITEMS.filter(i => d.inventory.includes(i)).length;
export const count3D = (d: SaveData) => ALL_3D_ITEMS.filter(i => d.inventory.includes(i)).length;
export const novusUnlocked = (d: SaveData) => SHARDS_3D.every(i => d.inventory.includes(i));
export const isFullCompletion = (d: SaveData) => count2D(d) + count3D(d) >= ALL_2D_ITEMS.length + ALL_3D_ITEMS.length;
export const effectiveSkin = (d: SaveData) => (d.skin === 'skinNovus' && !novusUnlocked(d) ? 'skin1' : d.skin);

/** 第 N 关的本地统计键 */
export const statKey = (chapter: 1 | 2, levelId: number) => `c${chapter}_${levelId}`;

/** 标题连点 5 次：测试用全解锁 */
export const cheatUnlockAll = () => updateSave(d => {
  d.cleared1 = true; d.cleared2 = true;
  d.reached1 = LEVELS2D.length - 1; d.reached2 = LEVELS3D.length - 1;
  const inv = new Set(d.inventory);
  [...ALL_2D_ITEMS, ...ALL_3D_ITEMS, SPECIAL_CG_ID].forEach(i => inv.add(i));
  d.inventory = Array.from(inv);
  LEVELS2D.forEach(lv => { const k = statKey(1, lv.id); d.stats[k] = d.stats[k] ?? { clears: 1, got: [] }; d.stats[k].clears ||= 1; });
  LEVELS3D.forEach(lv => { const k = statKey(2, lv.id); d.stats[k] = d.stats[k] ?? { clears: 1, got: [] }; d.stats[k].clears ||= 1; });
  // 测试用：悠亚直接解锁（关卡里按 Y 或点「悠亚」按钮切换，不用对麦克风喊）
  if (!d.flags.includes('yua')) d.flags.push('yua');
});
