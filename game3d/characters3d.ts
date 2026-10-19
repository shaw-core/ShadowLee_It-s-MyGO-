// 第二章角色：体素小人与吉祥物（模型在 voxelChars.ts），这里只放外观表和统一的骨骼接口。
import * as THREE from 'three';
import { buildVoxelCharacter, buildVoxelMascot } from './voxelChars';

export type SkinId = 'skin1' | 'skin2' | 'skin3' | 'skin4' | 'skinNovus';

export interface SkinMeta {
  id: SkinId;
  name: string;
  vibe: string;
  features: string[];
}

export const SKINS: SkinMeta[] = [
  { id: 'skin1', name: '毛绒小豆', vibe: '软萌 · 安静 · 治愈', features: ['戴着白色猫耳毛线帽、披着浅蓝色宽袖外套，怀里总抱着那只穿蓝斗篷的熊猫玩偶——这是小豆最放松的样子。', '跑起来袖子会一甩一甩的；头晕的时候，把玩偶抱紧一点就好。', '能力「安心毛绒」：眩晕增长减半，薄荷糖效果更强'] },
  { id: 'skin2', name: '电视头小豆', vibe: 'AI · 机器人 · 电子吉祥物', features: ['和毛绒小豆穿着同一身衣服，脑袋却换成了一台白色小电视：屏幕上永远是一张没睡醒的猫猫脸，顶上两只圆耳朵亮着蓝光。', '没人知道这台电视从哪儿来。它好像记得你走过的每一步。', '能力「缓存锚点」：按 E 在脚下部署一次性临时存档点'] },
  { id: 'skin3', name: '大墨镜小李', vibe: '活泼 · 外向 · 冒险感', features: ['银白长发编了一条细辫子，大墨镜推到两只熊猫耳中间，套着一件大一号的蓝色外套，围巾上印着粉色小爪印。', '斜挎的熊猫小包已经收拾好了——随时可以出发去下一个地方。', '能力「冒险家」：可以二段跳！'] },
  { id: 'skin4', name: '眼罩小豆', vibe: '安静 · 病弱 · 神秘', features: ['一只眼睛藏在白色眼罩下面，头顶一对熊猫耳，穿着荷叶边白衬衫和灯笼短裤，腿上贴着好几处绷带和创可贴。', '看起来总是有点累，却从来不说哪里疼。', '能力「创可贴」：每个存档点区间可抵挡一次尖刺'] },
  { id: 'skinNovus', name: '？号 · 室友姐', vibe: '可靠 · 从容 · 温柔', features: ['橘色长发 + 猫耳', '奶油色家居服', '口袋里永远有薄荷糖', '能力「次元之外」：完全不会晕3D'] },
];

export interface CharacterRig {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legL: THREE.Group; legR: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
}

// 所有场景（关卡、换装、终端、真结局房间、合影）都用同一套模型
export const buildCharacter = (skin: SkinId): CharacterRig => buildVoxelCharacter(skin);
export const buildYua = (): CharacterRig => buildVoxelCharacter('yua');
export const buildPandaWitch = (): CharacterRig => buildVoxelMascot('witch');
export const buildCheckpointPanda = () => buildVoxelMascot('panda');
export const buildCheckpointPenguin = () => buildVoxelMascot('penguin');
