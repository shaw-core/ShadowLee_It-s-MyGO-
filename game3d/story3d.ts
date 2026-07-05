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
        text: '（推开最后那扇门——刺眼的白光过后）……姐？姐！你看我的手！怎么全是一块一块的多边形？！',
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
        choices: [{ id: 'c3', text: '……哦。', nextNodeId: 'end' }],
      },
      'sis2_soft': {
        id: 'sis2_soft',
        speakerName: '室友姐',
        text: '（顿了一下，反手把袖子换成了手）……行。这样总不会散了。走吧，去看看这个世界的尽头有什么。',
        choices: [{ id: 'c3', text: '（耳朵红了）嗯！', nextNodeId: 'end' }],
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
  'event_level1': {
    id: 'event_level1',
    requiredPageId: 'page_ch1',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: '捡到的这页漫画……画的是以前的我们。扁扁的，走在一条只能往右的路上。',
        choices: [{ id: 'c1', text: '（凑过去看）哇，好怀念……', nextNodeId: 'tease' }],
      },
      'tease': {
        id: 'tease',
        speakerName: '室友姐',
        text: '话说回来，你这个 3D 的样子，圆滚滚的，头身比完全是个团子。刚才跳台阶的背影，我录下来了。',
        choices: [
          { id: 'c2a', text: '删掉！！立刻！！', nextNodeId: 'deny' },
          { id: 'c2b', text: '（小声）……你的样子也很好看啊。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'soft' },
          { id: 'c2s', text: '【直球】那你多录一点。反正这个世界里，你眼里也只有我。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'deny': {
        id: 'deny',
        speakerName: '室友姐',
        text: '不删。以后你不听话，我就一帧一帧放给你看。',
        choices: [{ id: 'e', text: '呜呜，威胁！这是威胁！', nextNodeId: 'end' }],
      },
      'soft': {
        id: 'soft',
        speakerName: '室友姐',
        text: '（愣了半秒，移开视线）……突然说这个干什么。前面还有路，快走。',
        choices: [{ id: 'e', text: '（她耳朵红了！记下来了！）', nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '……你什么时候学会说这种话了。（把镜头转向自己，和你并进一个画面）那就录成合照吧。',
        choices: [{ id: 'e', text: '好耶！！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（3D 世界的第一页回忆，收好了。）',
        choices: [{ id: 'e2', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第2关后：坠落与接住 ----------
  'event_level2': {
    id: 'event_level2',
    requiredPageId: 'page_ch2',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '这个世界最讨厌的一点：以前掉坑只会往一个方向掉，现在我能从四面八方掉下去！刚才那下真的吓死我了……',
        choices: [{ id: 'c1', text: '（心有余悸地拍胸口）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '我看到了。你掉下去之前，又喊我名字了。这次可听得清清楚楚，赖不掉。',
        choices: [
          { id: 'c2a', text: '那、那是条件反射！', nextNodeId: 'reflex' },
          { id: 'c2s', text: '【直球】嗯，我喊了。因为不管从哪个方向掉下去，我都想让你接住我。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'reflex': {
        id: 'reflex',
        speakerName: '室友姐',
        text: '条件反射啊。也就是说，你的身体比嘴诚实多了。（伸手揉了揉你的头发）以后掉下去也没关系，反正有存档点，还有我。',
        choices: [{ id: 'c3', text: '（头顶被揉乱了也不想躲开）……嗯。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（沉默两秒，然后叹气笑了）真是的……那你以后掉下去之前，先看好我站的位置。',
        choices: [{ id: 'c3', text: '一言为定！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这一页漫画上画的，是一只从天上掉下来、被稳稳接住的小团子。）',
        choices: [{ id: 'e', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第3关后：黑白的次元 ----------
  'event_level3': {
    id: 'event_level3',
    requiredPageId: 'page_ch3',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '每次按 Q 切到漫画次元，全世界都变成黑白线条……总觉得像回到了以前，我们俩挤在一张床上看漫画的那个晚上。',
        choices: [{ id: 'c1', text: '（望着黑白的塔发呆）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '你还记得啊。那天你看到一半睡着了，口水流在我肩膀上，第二天死不承认。',
        choices: [
          { id: 'c2a', text: '没有的事！！那是空调水！', nextNodeId: 'deny' },
          { id: 'c2b', text: '……对不起，其实我记得。你肩膀很暖和。', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'warm' },
        ],
        backgroundStyle: 'MANGA',
      },
      'deny': {
        id: 'deny',
        speakerName: '室友姐',
        text: '空调水是吧。行，那今晚在这个世界找地方休息的时候，你离我远点，免得又被"空调"滴到。',
        choices: [{ id: 'c3', text: '别！我错了！是口水！', affectionDelta: { charId: 'novus', amount: 5 }, nextNodeId: 'end' }],
      },
      'warm': {
        id: 'warm',
        speakerName: '室友姐',
        text: '（在黑白的世界里，只有她的轮廓好像亮了一下）……笨蛋。这种话，彩色的时候再说一遍。',
        choices: [
          { id: 'c3', text: '（按 Q 切回现实层）你肩膀很暖和。', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' },
          { id: 'c3s', text: '【直球】不用切回去。任何一个次元里，我说的都算数。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（黑白的画面里，她低下头，用手背碰了碰你的手背）……嗯。算数。',
        choices: [{ id: 'e', text: '（心跳声在黑白世界里格外清楚。）', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这一页画的是两个并排坐着的背影，一个歪着头靠在另一个的肩上。）',
        choices: [{ id: 'e', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第4关后：云上的休息 ----------
  'event_level4': {
    id: 'event_level4',
    requiredPageId: 'page_ch4',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: '（两人坐在云海边的平台上晃着腿）问你个事。如果一直找不到回去的门，要永远留在这个 3D 世界……你会怕吗？',
        choices: [
          { id: 'c1a', text: '怕！我的直播设备还在那边呢！', nextNodeId: 'joke' },
          { id: 'c1b', text: '（想了想，摇头）好像……不怎么怕。', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'why' },
        ],
      },
      'joke': {
        id: 'joke',
        speakerName: '室友姐',
        text: '哈。全世界都变成多边形了，你惦记的是直播设备。……不过也好，你还能开玩笑，说明没被吓坏。',
        choices: [{ id: 'c2', text: '（其实是因为你在旁边啦……才说不出口）', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' }],
      },
      'why': {
        id: 'why',
        speakerName: '室友姐',
        text: '哦？说说看，为什么不怕。',
        choices: [
          { id: 'c2a', text: '因为、因为这里风景不错！', nextNodeId: 'dodge' },
          { id: 'c2s', text: '【直球】因为你在。你在哪个维度，哪个维度就是家。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'dodge': {
        id: 'dodge',
        speakerName: '室友姐',
        text: '风景不错。（她看着你，慢慢地笑了）嗯，我看到的风景，也不错。',
        choices: [{ id: 'e', text: '（她、她在看哪里？！）', affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（很久没有说话。云从脚下飘过去。然后她把外套脱下来，披在你肩上。）……风大。家里人要照顾好。',
        choices: [{ id: 'e', text: '（外套上全是她的温度。）', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（这一页画着一朵云，云上坐着两个小人，中间没有距离。）',
        choices: [{ id: 'e2', text: '……', nextNodeId: null }],
      },
    },
  },

  // ---------- 第5关后：终章·接缝之门 ----------
  'event_level5': {
    id: 'event_level5',
    requiredPageId: 'page_ch5',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: '（世界的接缝处，一扇新的门静静立着。门缝里透出的光，一半是像素的，一半是多边形的。）……姐，这扇门，好像哪边都能去。',
        choices: [{ id: 'c1', text: '（回头看她）', nextNodeId: 'sis' }],
      },
      'sis': {
        id: 'sis',
        speakerName: '室友姐',
        text: '嗯。回 2D 的家，或者在这个新世界继续走下去。……你来选。这次我听你的。',
        choices: [
          { id: 'c2a', text: '回家吧。回我们原来的家。', nextNodeId: 'home' },
          { id: 'c2b', text: '再走走吧。这个世界我们才看了一小半。', nextNodeId: 'stay' },
          { id: 'c2s', text: '【直球】选哪边都行。我要选的从来不是世界，是牵着谁的手进门。', affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special', requiresClear: true },
        ],
        backgroundStyle: 'MANGA',
      },
      'home': {
        id: 'home',
        speakerName: '室友姐',
        text: '好。回去以后，先把你摔下平台的录像整理成合集。（伸出手）……走了，笨蛋。回家。',
        choices: [{ id: 'e', text: '（握住她的手）等等合集是什么！！', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'stay': {
        id: 'stay',
        speakerName: '室友姐',
        text: '行啊。那接下来的路，换我跟着你走。（她把手递过来）队长，请带路。',
        choices: [{ id: 'e', text: '（第一次走在她前面，手心全是汗）包在我身上！', affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'end' }],
      },
      'special': {
        id: 'special',
        speakerName: '室友姐',
        text: '（门前的光落在她脸上。她安静地看了你很久，然后主动握住了你的手，十指相扣。）……那就别松手。哪个次元都别松。',
        choices: [{ id: 'e', text: '（用力回握）嗯！！', nextNodeId: 'end' }],
      },
      'end': {
        id: 'end',
        speakerName: '李豆沙',
        text: '（最后一页漫画自己翻开了。上面画着一扇门，和两个牵着手、一起迈过门槛的身影。——后编·完）',
        choices: [{ id: 'e2', text: '～Fin～', nextNodeId: null }],
      },
    },
  },
};
