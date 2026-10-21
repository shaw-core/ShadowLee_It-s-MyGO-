// BGM 曲目表（主菜单可切换，选择持久化到 localStorage）
import haruhikage from './components/haruhikage_8bit.mp3';
import magnet from './components/magnet_8bit.mp3';
import hananotou from './components/hananotou_8bit.mp3';
import seiza from './components/seiza_8bit.mp3';
import magnetTrue from './components/magnet_8bit_2.mp3';
import goose from './components/goose_8bit.mp3';
import tsugihagi from './components/tsugihagi_8bit.mp3';
import shinkai from './components/shinkai_8bit.mp3';
import roshin from './components/roshin_8bit.mp3';
import kumoito from './components/kumoito_8bit.mp3';

export interface BgmTrack {
  id: string;
  name: string;
  url: string;
  /** 需要这个存档 flag 才会出现在随身听里；没有就是一开始就有 */
  unlockFlag?: string;
}

// 注意：前 10 首的顺序就是存档里 player.idx 的下标，不能改顺序、不能往中间插。
export const BGM_TRACKS: BgmTrack[] = [
  { id: 'haruhikage', name: '春日影 (8bit)', url: haruhikage },
  { id: 'rolling_girl', name: 'rolling girl (8bit)', url: magnet }, // 文件名沿用 magnet_8bit.mp3
  { id: 'hananotou', name: '花之塔 (8bit)', url: hananotou },
  { id: 'seiza', name: '若能化作星座 (8bit)', url: seiza },
  { id: 'magnet', name: 'magnet (8bit)', url: magnetTrue },
  { id: 'goose', name: '不为人知的鹅妈妈童谣 (8bit)', url: goose },
  { id: 'tsugihagi', name: '拼凑的断音 (8bit)', url: tsugihagi },
  { id: 'shinkai', name: '深海少女 (8bit)', url: shinkai },
  { id: 'roshin', name: '炉心融解 (8bit)', url: roshin },
  { id: 'kumoito', name: '蜘蛛糸モノポリー (8bit)', url: kumoito },
];

/** public/ 下的静态文件：按部署子路径解析（Pages 是 /ShadowLee_It-s-MyGO-/，本地测试版是 ./） */
export const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

// 开发 / 验收用：?uauaAudio=missing 把音源地址换成一个不存在的文件，测试加载失败时的回退
const missingTest = typeof location !== 'undefined' && new URLSearchParams(location.search).get('uauaAudio') === 'missing';

/** 悠亚的专属曲。原曲实录，不做任何改编；公开发布的授权尚待确认（见 docs/UNRESOLVED_ASSETS.md） */
export const UAUA_TRACK: BgmTrack = {
  id: 'uaua_kanashibari',
  name: 'かなしばりに遭ったら · 如若遭遇梦魇',
  url: publicUrl(missingTest ? 'audio/__missing__.mp3' : 'audio/uaua_kanashibari.mp3'),
  unlockFlag: 'music:uaua_kanashibari',
};
/** 循环点：去掉文件开头 0.2 秒和结尾约 2.4 秒的静音（只在悠亚在场循环时用；随身听从头放完整首） */
export const UAUA_LOOP = { start: 0.2, end: 217.9 };

/** 解锁后才追加到随身听末尾的曲目（追加在后面，前面的下标不会漂移） */
export const EXTRA_TRACKS: BgmTrack[] = [UAUA_TRACK];
