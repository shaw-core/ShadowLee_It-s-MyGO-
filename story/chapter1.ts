// ============================================================
// 第一章 · 漫画的世界 —— 剧情脚本
// 表层：直播主李豆沙与室友姐的日常（粉丝梗与甜度原样保留）
// 里层：这个世界其实是一册漫画。越往后，「画」的痕迹越藏不住：
//       黑白的漫画层、停住的钟、写着「原稿」的箱子、
//       每一页都相同的日历、蓝色的陌生弹幕、天台上凭空出现的门。
// 设定纪律：两人只用「漫画、分镜、画格、对白框、网点」这类
//           她们看得见的词，绝不出现系统术语。
// ============================================================
import { Scene, D, N, R, DM } from './types';

export const CH1_SCENES: Record<string, Scene> = {
  // ---------- 第1话 直播事故 ----------
  c1_l1: {
    id: 'c1_l1', chapter: 1, title: '第1话 · 直播事故', page: 'page_ch1', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [
          D('（直播事故现场）那个……刚刚我从平台掉下来的时候，样子是不是很蠢？', 'worried'),
        ],
        choices: [{ t: '假装什么都没发生！', next: 'tease' }],
      },
      tease: {
        lines: [
          N('蠢倒是不蠢。', 'tease', 'manga'),
          N('不过你刚刚摔倒的时候，下意识喊了一声我的名字？', 'tease', 'manga'),
        ],
        choices: [
          { t: '（脸红）我那是……喊大家救命！', next: 'good', aff: 5 },
          { t: '你听错了！幻听！', next: 'deny' },
          { t: '【直球】因为害怕的时候，我只想到了你。', next: 'sp', aff: 50, ng: true },
        ],
      },
      good: {
        lines: [N('嗯，以后遇到危险，记得喊大声点。我会听见的。', 'smile')],
        choices: [{ t: '（心脏漏跳一拍）……哦。', next: 'end' }],
      },
      deny: {
        lines: [N('是吗？那我下次就算听见了，也当作没听见好了。', 'closed')],
        choices: [{ t: '别！小室！我错了！', next: 'end' }],
      },
      sp: {
        lines: [N('（愣住，随后耳根微红）……这种话留到下播再说。笨蛋。', 'blush')],
        choices: [{ t: '嘿嘿……', next: 'end' }],
      },
      end: {
        lines: [
          D('（可恶，完全被她拿捏了……）', 'pout'),
          N('……对了。刚才画面突然变成黑白的那一下，录下来了吗？', 'serious'),
          D('诶？我看看录播……', 'normal'),
          D('……奇怪。录播里，什么都没有。', 'worried'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第2话 查岗时刻 ----------
  c1_l2: {
    id: 'c1_l2', chapter: 1, title: '第2话 · 查岗时刻', page: 'page_ch2', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [N('你最近跟其他女主播联动很频繁啊。弹幕都在刷"李豆沙：我要和uaua结婚"。', 'tease')],
        choices: [{ t: '那是营业！都是为了节目效果！', next: 'pos' }],
      },
      pos: {
        lines: [N('营业啊……（凑近）那你现在脸红，也是营业的一部分吗？', 'tease', 'manga')],
        choices: [{ t: '（眼神躲闪）你、你靠太近了……', next: 'gaze', aff: 15 }],
      },
      gaze: {
        lines: [
          N('我不喜欢你躲着我的眼神。', 'serious'),
          N('看着我，豆沙。告诉我是谁陪你去医院打针还用毛绒玩具哄你？', 'serious'),
        ],
        choices: [
          { t: '……是你。', next: 'rw' },
          { t: '【直球】是你。只有你会把我当小朋友宠。', next: 'rwsp', aff: 50, ng: true },
        ],
      },
      rw: {
        lines: [N('知道就好。下次再怕打针，我可不带玩具了。', 'smile')],
        choices: [{ t: '呜……别没收我的玩具！', next: 'end' }],
      },
      rwsp: {
        lines: [N('（轻笑）因为你本来就是个长不大的小朋友。今晚奖励你多抱一会儿那只玩偶。', 'smile')],
        choices: [{ t: '好耶！', next: 'end' }],
      },
      end: {
        lines: [
          R('回家的路上，豆沙抬头看了一眼街角的钟。'),
          D('（七点整。……来的时候，好像也是七点整。）', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第3话 扁头比格犬 ----------
  c1_l3: {
    id: 'c1_l3', chapter: 1, title: '第3话 · 扁头比格犬', page: 'page_ch3', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [N('（拿着吹风机）坐好。头发乱得像鸡窝一样，你是打算这样开摄像头吗？', 'closed')],
        choices: [{ t: '我自己会吹……', next: 'cmd' }],
      },
      cmd: {
        lines: [N('嘘。别动。', 'serious', 'manga')],
        choices: [{ t: '（立刻不动了）……好。', next: 'touch', aff: 10 }],
      },
      touch: {
        lines: [N('（手指穿过发丝）只有这种时候你才会乖乖听话。像只闯了祸等着被原谅的扁头比格犬。', 'smile')],
        choices: [{ t: '我才不是狗！……那个，再吹一会儿也可以。', next: 'end' }],
      },
      end: {
        lines: [
          D('（其实……还挺舒服的。）', 'blush'),
          D('汪……啊不是！', 'surprised'),
          R('吹风机的声音停了。窗外对面那栋楼，有一台电视还亮着。'),
          D('小室，对面那家的电视……是不是一直没关？', 'normal'),
          N('哪家？……那边的窗户，一直是黑的啊。', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第4话 苦力时刻 ----------
  c1_l4: {
    id: 'c1_l4', chapter: 1, title: '第4话 · 苦力时刻', page: 'page_ch4', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [N('那箱快递有点重，但我现在腾不出手……豆沙，帮我搬一下？', 'normal')],
        choices: [{ t: '不想动……除非有奖励。', next: 'bar' }],
      },
      bar: {
        lines: [N('奖励？（挑眉）允许你买那套绝版的百合漫画全集，外加一句"谢谢李老师"，够吗？', 'tease', 'manga')],
        choices: [{ t: '什么！？那套我在中古店看了好久的……', next: 'deal', aff: 20 }],
      },
      deal: {
        lines: [N('对，就是那套。你不是为了看那个茶饭不思吗？', 'smile')],
        choices: [{ t: '搬！我搬！我这就去！', next: 'end' }],
      },
      end: {
        lines: [
          D('（那是我的精神食粮！为了百合漫，这点苦力算什么！）', 'grin'),
          R('箱子落地。侧面的快递单上，印着一行小字。'),
          D('"第4话 · 原稿 · 请勿折压"……？', 'normal'),
          D('小室，我们这一集……是不是也正好是第四话？', 'worried'),
          N('……别想那么多。是巧合。', 'closed'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第5话 家 ----------
  c1_l5: {
    id: 'c1_l5', chapter: 1, title: '第5话 · 家', page: 'page_ch5', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [D('（关卡尽头）如果……我是说如果，我想一直住在这里，赖着不走呢？', 'blush')],
        choices: [{ t: '试探性地问。', next: 'ans' }],
      },
      ans: {
        lines: [N('我什么时候赶你走过吗？还是说，你在期待我开口留你？', 'tease', 'manga')],
        choices: [
          { t: '我就是想听你说你需要我！', next: 'pull', aff: 30 },
          { t: '【直球】哪怕你赶我走，我也要赖着你一辈子。', next: 'pullsp', aff: 100, ng: true },
        ],
      },
      pull: {
        lines: [N('（轻笑）真坦诚。那就留下来吧。反正除了我，也没人受得了你这种麻烦的小鬼了。', 'smile')],
        choices: [{ t: '这是表白吗？这一定是表白吧！', next: 'home' }],
      },
      pullsp: {
        lines: [N('……（长时间的沉默，随后轻轻抱住）求之不得。笨蛋豆沙。', 'blush')],
        choices: [{ t: '嘿嘿……最喜欢你了。', next: 'home' }],
      },
      home: {
        lines: [N('理解成什么样是你的自由。……欢迎回家，豆沙。', 'smile')],
        choices: [{ t: '我回来了！', next: 'end' }],
      },
      end: {
        lines: [
          R('墙上的日历，翻到了今天。'),
          R('豆沙随手往后翻了一页。下一页，也是今天。'),
          D('（……今天也是这样的一天。明天，大概也是。）', 'normal'),
          D('（这样……好像也不错。）', 'smile'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第6话 Kimo熊的注视（无条件触发） ----------
  c1_l6: {
    id: 'c1_l6', chapter: 1, title: '第6话 · Kimo熊的注视', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [D('（看着满屏的Kimo熊弹幕）"室李嫁"……"我是李室民"……', 'surprised')],
        choices: [{ t: '这群Kimo熊又在乱嗑了！', next: 'fut' }],
      },
      fut: {
        lines: [N('你看那条，"你生气了我不敢说，你原谅我之后更不敢说"。', 'tease')],
        choices: [{ t: '……那是他们乱说的！我有家庭地位的！', next: 'wash' }],
      },
      wash: {
        lines: [N('是吗？那今晚的碗也归有地位的人洗？', 'tease')],
        choices: [{ t: '……洗就洗！为了室守星沙！', next: 'end' }],
      },
      end: {
        lines: [
          D('……不过，刚才有一条弹幕是蓝色的。', 'normal'),
          D('"走到门外去"。……门？哪里的门？', 'worried'),
          N('大概是谁发错地方了吧。', 'normal'),
          N('……今晚天台的风应该很舒服。要不要上去看看？', 'smile'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第7话 门前的天台（无条件触发 · 文本按确认稿原样保留） ----------
  c1_l7: {
    id: 'c1_l7', chapter: 1, title: '第7话 · 门前的天台', mood: 'real', start: 'start',
    nodes: {
      start: {
        lines: [N('（天台的尽头，最后那扇门静静立着，门缝里透出微微发亮的光。她背对着光站着，手里拿着什么）来了？过去之前，有个东西给你。', 'smile')],
        choices: [{ t: '（走过去）什么呀，神神秘秘的……', next: 'gift' }],
      },
      gift: {
        lines: [N('（递过来一张照片——是两个人贴着脸的合照）拿着。谁也不知道门后面是什么地方。带一张在身上，走到哪儿都记得，是和谁一起出发的。', 'smile', 'manga')],
        choices: [
          { t: '（接过来，心口一热）……你什么时候拍的这张？！', next: 'tease' },
          { t: '【直球】照片我收下。但就算什么都不带——不管多久，我都会一直记得你。', next: 'special', aff: 50, ng: true },
        ],
      },
      tease: {
        lines: [N('秘密。（她转头看向那扇门，光落在她侧脸上）收好了就走吧。门后面不管是什么，都得我们亲眼去看。', 'closed')],
        choices: [{ t: '（把照片贴身收好）嗯！', next: 'door', aff: 15 }],
      },
      special: {
        lines: [N('（她愣了一下，然后低下头笑了，把照片轻轻按进你手心）……那这张就当个凭证。哪天你敢忘，我就拿它提醒你。', 'blush')],
        choices: [{ t: '（用力点头）一言为定！', next: 'door' }],
      },
      door: {
        lines: [D('（门的光漫过天台，谁都没有说话。她的手在身侧，很轻地张开了一点。）', 'closed')],
        choices: [{ t: '（装作不经意地把手递过去。两个人一起，推开了门。→ 第二章待续）', next: null }],
      },
    },
  },

  // ================= 关卡内的小剧场（踩到触发点时播放） =================
  c1_m_glitch: {
    id: 'c1_m_glitch', chapter: 1, title: '画面变成黑白的那一下', mood: 'manga', start: 's',
    nodes: {
      s: {
        lines: [
          D('诶？！画面……变成黑白的了？', 'surprised'),
          DM('？？？'),
          DM('画风突变'),
          DM('这是什么新特效'),
          D('直、直播事故！大家先别截图！', 'dizzy'),
          D('……等一下。好像也能走？', 'normal'),
        ],
        next: null,
      },
    },
  },
  c1_m_clock: {
    id: 'c1_m_clock', chapter: 1, title: '街角的钟', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [
          N('慢点跑。又不赶时间。', 'normal'),
          D('可是直播七点开始诶！', 'grin'),
          N('……你哪天不是七点开始。', 'closed'),
        ],
        next: null,
      },
    },
  },
  c1_m_tv: {
    id: 'c1_m_tv', chapter: 1, title: '对面那台电视', mood: 'manga', start: 's',
    nodes: {
      s: {
        lines: [
          R('对面窗户里，电视屏幕亮着蓝光。'),
          R('屏幕上……是一张闭着眼睛的、方方正正的脸。'),
          D('……它刚才，是不是朝我这边看了一下？', 'worried'),
        ],
        next: null,
      },
    },
  },
  c1_m_box: {
    id: 'c1_m_box', chapter: 1, title: '写着原稿的箱子', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [
          D('这些箱子上……都写着"原稿"？', 'normal'),
          D('第1话、第2话、第3话……', 'normal'),
          N('别看了。传送带要开了。', 'serious'),
        ],
        next: null,
      },
    },
  },
  c1_m_door: {
    id: 'c1_m_door', chapter: 1, title: '天台上的门', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [
          D('天台上……什么时候多了一扇门？', 'surprised'),
          D('昨天上来晾衣服的时候，明明还没有。', 'worried'),
          R('门缝里透出的光，像一页还没画完的稿纸那么白。'),
        ],
        next: null,
      },
    },
  },
};

/** 第一章各关结束后播放的剧情 */
export const CH1_LEVEL_SCENE: Record<number, string> = {
  1: 'c1_l1', 2: 'c1_l2', 3: 'c1_l3', 4: 'c1_l4', 5: 'c1_l5', 6: 'c1_l6', 7: 'c1_l7',
};
/** 这些关卡的剧情无条件播放（其余需要拾取对应的百合页） */
export const CH1_ALWAYS = new Set([6, 7]);
