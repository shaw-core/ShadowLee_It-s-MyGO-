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

export interface BgmTrack { name: string; url: string; }

export const BGM_TRACKS: BgmTrack[] = [
  { name: '春日影 (8bit)', url: haruhikage },
  { name: 'rolling girl (8bit)', url: magnet }, // 文件名沿用 magnet_8bit.mp3
  { name: '花之塔 (8bit)', url: hananotou },
  { name: '若能化作星座 (8bit)', url: seiza },
  { name: 'magnet (8bit)', url: magnetTrue },
  { name: '不为人知的鹅妈妈童谣 (8bit)', url: goose },
  { name: '拼凑的断音 (8bit)', url: tsugihagi },
  { name: '深海少女 (8bit)', url: shinkai },
  { name: '炉心融解 (8bit)', url: roshin },
  { name: '蜘蛛糸モノポリー (8bit)', url: kumoito },
];
