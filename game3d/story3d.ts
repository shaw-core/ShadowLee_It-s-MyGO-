// ============================================================
// 《李豆沙的次元冲刺·后编》剧情
// 前情提要：前作结尾，两人一起走进了最后那扇发光的门。
// 后编开端：门的另一侧，整个世界变成了 lowpoly 的 3D。
// 角色定位沿用原作：李豆沙（嘴硬心软，容易被拿捏）
//                  室友姐（游刃有余，毒舌但护短）
// ============================================================
import { YuriEvent } from '../types';

export const EVENTS3D: Record<string, YuriEvent> = {
  // ---------- 序章：踏出门的那一刻 ----------
  'event_prologue': {
    id: 'event_prologue',
    requiredPageId: '',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '（推开最后那扇门——刺眼的白光过后）……小室？小室！你看我的手！怎么全是一块一块的多边形？！',
        choices: [{ id: 'c1', text: '（低头看自己）', nextNodeId: 'sis1' }],
      },
      'sis1': {
        id: 'sis1',
        speakerName: '室友姐',
        text: '冷静点。整个世界都变成这样了，不止你。……嗯，立体了。连你摔倒的方向都多了一个。',
        choices: [
          { id: 'c2a', text: '这种时候还调侃我？！', nextNodeId: 'sis2' },
          { id: 'c2b', text: '（抓住她的袖子）别走散了……', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'sis2_soft' },
        ],
      },
      'sis2': {
        id: 'sis2',
        speakerName: '室友姐',
        text: '不调侃你，你腿就不抖了吗？看前面，路还在，只是变宽了。跟紧我。',
        choices: [{ id: 'c3', text: '……哦。', nextNodeId: 'dizzy' }],
      },
      'sis2_soft': {
        id: 'sis2_soft',
        speakerName: '室友姐',
        text: '（顿了一下，反手把袖子换成了手）……行。这样总不会散了。走吧，去看看这个世界的尽头有什么。',
        choices: [{ id: 'c3', text: '（耳朵红了）嗯！', nextNodeId: 'dizzy' }],
      },
      'dizzy': {
        id: 'dizzy',
        speakerName: '李豆沙',
        text: '（走了两步，突然扶住额头）等、等一下……天旋地转的……小室，我好像，晕3D。',
        choices: [{ id: 'cd', text: '（蹲下缓一缓）', nextNodeId: 'candy' }],
      },
      'candy': {
        id: 'candy',
        speakerName: '室友姐',
        text: '我猜到了。你连坐旋转木马都吐。（从口袋里掏出一把薄荷糖，在你眼前晃了晃）我先走一步，沿路把糖放好。头晕了就捡来吃，每个存档点我也会等你。',
        choices: [
          { id: 'cc1', text: '为什么你口袋里会常备薄荷糖啊……', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'candy2' },
        ],
      },
      'candy2': {
        id: 'candy2',
        speakerName: '室友姐',
        text: '因为我的室友是个到哪儿都会晕的笨蛋。（弹了一下你的额头）别掉队了。',
        choices: [{ id: 'cc2', text: '（捂着额头）知、知道了！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（深呼吸）好。既然回不去……那就把这个 3D 世界，也通关给你看！',
        choices: [{ id: 'e', text: '出发！', nextNodeId: null }],
      },
    },
  },

  // ---------- 第1关后：新的身体 ----------
  'event3d_level1': {
    id: 'event3d_level1',
    requiredPageId: 'page3d_ch1',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: '你捡到的这一页……不是漫画。是铅笔稿。画的就是我们刚刚走过的那座浮岛——但只画了一半，剩下的部分还是空白。',
        choices: [{ id: 'c1', text: '（凑过去看）一半？什么意思？', nextNodeId: 'tease' }],
      },
      'tease': {
        id: 'tease',
        speakerName: '室友姐',
        text: '意思是，这个世界可能还没画完。你注意到了吗？远处的树没有背面，太阳从我们进来起就没动过。……我们大概走进了一张还在打草稿的画里。',
        choices: [
          { id: 'c2a', text: '等等等等，那我们脚下的路会不会突然没画？！', nextNodeId: 'deny' },
          { id: 'c2b', text: '（盯着草稿看）……画得很认真啊。线条一点都不敷衍。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'soft' },
          { id: 'c2s', text: '【直球】没画完也不怕。反正走到哪儿，你都会把我捡回来。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'deny': {
        id: 'deny',
        speakerName: '室友姐',
        text: '慌什么。没画的地方不就是悬崖吗，你今天已经掉下去三次了，也没见世界把你怎么样——它还很守规矩地把你放回了出发点。',
        choices: [{ id: 'e', text: '……说得好像也对？这世界意外地温柔？', nextNodeId: 'end' }],
      },
      'soft': {
        id: 'soft',
        speakerName: '室友姐',
        text: '嗯。不管执笔的是谁，先把他画下的东西记牢。（把草稿页折好递给你）收好。多捡几页，说不定能拼出这个世界的全貌——还有画它的人，到底想干什么。',
        choices: [{ id: 'e', text: '（小心地收进口袋）像收集地图碎片一样！', nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（挑眉看了你两秒，然后弹了下你的额头）行啊，学会预支我的温柔了。……不过，说得对。掉几次都捡。',
        choices: [{ id: 'e', text: '（捂着额头笑）嘿嘿。', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（第一页草稿。这个世界还没画完——但愿画它的人，不要停笔。）',
        choices: [{ id: 'e2', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第2关后：坠落与接住 ----------
  'event3d_level2': {
    id: 'event3d_level2',
    requiredPageId: 'page3d_ch2',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '小室，我刚才掉下去的时候看清楚了——云的下面什么都没有。不是黑的，是……淡淡的格子，像还没铺颜料的画布。',
        choices: [{ id: 'c1', text: '（心有余悸地比划）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '画布外面，就是世界的外面。（她往崖边探了探头，又收回来）不过你发现没有——每次你掉出去，这个世界都会把你原样放回存档点。它在接住你。',
        choices: [
          { id: 'c2a', text: '是、是这样吗……那它为什么要接住我们？', nextNodeId: 'reflex' },
          { id: 'c2s', text: '【直球】不对。每次掉下去，先接住我的都是想着你这件事。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'reflex': {
        id: 'reflex',
        speakerName: '室友姐',
        text: '不知道。可能画这个世界的人，不想让走进来的人受伤吧。（顿了顿，揉了揉你的头发）也可能只是运气好。总之在弄清楚之前，别乱试世界的底线。',
        choices: [{ id: 'c3', text: '（头顶被揉乱了也不想躲开）……嗯，跟紧你。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（沉默两秒，然后叹气笑了）……你现在张口就来是吧。那下次掉下去之前，先看好我站的位置。',
        choices: [{ id: 'c3', text: '一言为定！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这页草稿画着世界的边缘：画布的格子上，有一只手正要落笔的影子。）',
        choices: [{ id: 'e', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第3关后：黑白的次元 ----------
  'event3d_level3': {
    id: 'event3d_level3',
    requiredPageId: 'page3d_ch3',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '小室，我确定了。按 Q 切过去的那个黑白世界，不是"漫画次元"——是这个世界的线稿层。刚才在塔里，我看到墙上有改过的痕迹，一条线被擦掉又重画了三次。',
        choices: [{ id: 'c1', text: '（指给她看塔壁上的笔触）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '……真的。这里有橡皮擦的印子。（她伸手贴着那道线，声音放轻）所以，幕后确实有一个人在执笔。我们走过的每一块砖、你捡到的每一颗糖，可能都是被安排好的。',
        choices: [
          { id: 'c2a', text: '那、那如果作者哪天不想要这段了，把我们也擦掉怎么办？！', nextNodeId: 'deny' },
          { id: 'c2b', text: '改了三次……说明作者在很认真地琢磨这里。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'warm' },
        ],
        backgroundStyle: 'MANGA',
      },
      'deny': {
        id: 'deny',
        speakerName: '室友姐',
        text: '会反复修改的人，不舍得擦掉整个世界。擦掉是为了画得更好——你直播剪废片的时候，会把整场直播删了吗？',
        choices: [{ id: 'c3', text: '不会！废片里也有精华！……哦，原来是这个意思。', affectionDelta: { charId: 'novus', amount: 5 }, nextNodeId: 'end' }],
      },
      'warm': {
        id: 'warm',
        speakerName: '室友姐',
        text: '嗯。而且你发现没有，在这个线稿层里，你的轮廓线比别的东西都深。（她看着你，黑白的世界里只有语气是软的）作者画你的时候，下笔很重。',
        choices: [
          { id: 'c3', text: '（切回现实层，脸有点热）是、是吗……', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' },
          { id: 'c3s', text: '【直球】那作者画"我们俩"的时候，一定用的是最舍不得的那支笔。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（黑白的画面里，她低下头，用手背碰了碰你的手背）……嗯。那就别让这一笔白画。',
        choices: [{ id: 'e', text: '（心跳声在线稿层里格外清楚。）', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这页草稿的角落写着一行小字，擦掉了大半，只剩两个字能认出来："——要好好的"。）',
        choices: [{ id: 'e', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第4关后：云上的休息 ----------
  'event3d_level4': {
    id: 'event3d_level4',
    requiredPageId: 'page3d_ch4',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: '（两人坐在云顶的平台边）豆沙，往那边看。世界的尽头——那条竖着的亮线。云和天空在那里对不齐，像两张纸没贴好。',
        choices: [
          { id: 'c1a', text: '（眯眼看）真的有条缝！那是什么？bug吗？！', nextNodeId: 'joke' },
          { id: 'c1b', text: '（顺着她的手指看过去，安静了几秒）……是出口，对吧。', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'why' },
        ],
      },
      'joke': {
        id: 'joke',
        speakerName: '室友姐',
        text: '不是bug。……不，也许恰恰就是bug——画到边界没合上的一道缝，世界的漏洞。这么周到的一位作者，画错了却不补，你不觉得奇怪吗？',
        choices: [{ id: 'c2', text: '（盯着那条线，心情突然复杂起来）找到出口了，怎么反而……', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' }],
      },
      'why': {
        id: 'why',
        speakerName: '室友姐',
        text: '嗯。想从这幅画里出去，恐怕只能走那条缝。（她收回手，声音低了一点）……怎么，表情不像高兴的样子。',
        choices: [
          { id: 'c2a', text: '高兴的！只是……这个世界也开始有点舍不得了。', nextNodeId: 'dodge' },
          { id: 'c2s', text: '【直球】出口在哪都行。我担心的从来只有一件事：门那边，你还在不在我旁边。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'dodge': {
        id: 'dodge',
        speakerName: '室友姐',
        text: '舍不得就记牢。（她把外套脱下来，披在你肩上）风大。到了缝跟前，不管看到什么——先抓住我。',
        choices: [{ id: 'e', text: '（外套上全是她的温度。）', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（很久没有说话。云从脚下飘过去。然后她把外套披在你肩上，手在你肩头停了一秒。）……缝的那头是哪里都一样。我的位置，不归哪位作者管。',
        choices: [{ id: 'e', text: '（攥紧了外套的边角。）', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这页草稿画的是云顶的两个小人。而在画的边缘，有一行没擦干净的铅笔小字："快到了。"——是在对我们说吗？）',
        choices: [{ id: 'e2', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第5关后：终章·接缝之门 ----------
  'event3d_level5': {
    id: 'event3d_level5',
    requiredPageId: 'page3d_ch5',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '（世界的裂缝前。把一路的草稿页拼在一起——地图上根本没有画"门"。最后一角画着的，就是眼前这道裂缝，旁边还有一个小小的箭头。）……小室，作者不是漏画了。他把这个漏洞，画给了我们看。',
        choices: [{ id: 'c1', text: '（回头看她）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '嗯。一个连橡皮印都要留三层的人，不会"不小心"漏一道缝。（裂缝的光落在她脸上，一半像素，一半多边形）是陷阱，还是出口，跳之前没人知道。但留在画里，就永远只能照着别人的剧本走。……跳不跳，你说了算。',
        choices: [
          { id: 'c2a', text: '跳！别人的剧本，翻篇了！', nextNodeId: 'home' },
          { id: 'c2b', text: '（深吸一口气，先握住她的手）……一起，就敢。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'stay' },
          { id: 'c2s', text: '【直球】跳到哪里都行。我要选的从来不是世界，是牵着谁的手往下跳。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'home': {
        id: 'home',
        speakerName: '室友姐',
        text: '好。（她笑了，把拼好的地图折起来塞进你口袋）纪念品带上。数到三——不许闭眼，替我看清楚缝那边是什么。',
        choices: [{ id: 'e', text: '一、二——三！！（两个人同时跳进光里）', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'stay': {
        id: 'stay',
        speakerName: '室友姐',
        text: '（反手扣紧你的手指）那就别松手。不管那边是新的世界，还是作者的书桌。……一、二——',
        choices: [{ id: 'e', text: '三！！（光把两个人一起吞了进去）', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（她安静地看了你很久，然后主动十指相扣，牵着你朝裂缝迈了半步。）……那闭着眼跳也没关系。方向，我来看。',
        choices: [{ id: 'e', text: '（用力回握）嗯！！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（坠落只持续了一瞬。光的尽头，是谁也没见过的、全新的世界——不过，那就是下一个故事了。而在谁也看不见的地方，有人轻轻放下了笔，在那道"漏洞"的旁边，画上了一个小小的对勾。——后编·完）',
        choices: [{ id: 'e2', text: '～未完待续～', nextNodeId: null }],
      },
    },
  },
};
