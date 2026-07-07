// BGM 曲目表（主菜单可切换，选择持久化到 localStorage）
import haruhikage from './components/haruhikage_8bit.mp3';
import magnet from './components/magnet_8bit.mp3';
import hananotou from './components/hananotou_8bit.mp3';
import seiza from './components/seiza_8bit.mp3';

export interface BgmTrack { name: string; url: string; }

export const BGM_TRACKS: BgmTrack[] = [
  { name: '春日影 (8bit)', url: haruhikage },
  { name: 'rolling girl (8bit)', url: magnet }, // 文件名沿用 magnet_8bit.mp3
  { name: '花之塔 (8bit)', url: hananotou },
  { name: '若能化作星座 (8bit)', url: seiza },
];
