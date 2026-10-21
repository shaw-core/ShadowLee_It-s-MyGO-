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
          D('等一下等一下！刚刚那个掉下去的镜头，不许剪出来！', 'pout'),
        ],
        choices: [{ t: '假装什么都没发生！', next: 'tease' }],
      },
      tease: {
        lines: [
          N('已经有人录屏了。', 'tease', 'manga'),
          D('啊？！谁啊！', 'surprised'),
          N('而且你掉下去的时候，好像喊了我的名字。', 'tease', 'manga'),
          D('……有吗？', 'worried'),
          N('有，喊得可大声了。', 'tease', 'manga'),
        ],
        choices: [
          { t: '我喊的是‘救命’！你听错啦！', next: 'good', aff: 5 },
          { t: '不许再说了！这段删掉！', next: 'deny' },
          { t: '【直球】因为当时第一反应就是找你呀。', next: 'sp', aff: 50, ng: true },
        ],
      },
      good: {
        lines: [
          N('好好好，是我听错了。', 'smile'),
          N('不过下次要是害怕，还是可以喊我。', 'normal'),
        ],
        choices: [{ t: '（心脏漏跳一拍）……哦。', next: 'end' }],
      },
      deny: {
        lines: [
          N('好，我不说。', 'smile'),
          D('……你怎么答应得这么快？', 'worried'),
          N('那我再说一遍？', 'tease'),
          D('不许！', 'pout'),
        ],
        choices: [{ t: '好啦好啦，这个真的不许再说了！', next: 'end' }],
      },
      sp: {
        lines: [
          N('……你这话怎么突然说得这么认真。', 'blush'),
          D('你问我的嘛！', 'smile'),
          N('嗯。听到了。', 'smile'),
        ],
        choices: [{ t: '嘿嘿……', next: 'end' }],
      },
      end: {
        lines: [
          D('哼，下次我一定跳得特别漂亮。', 'pout'),
          N('先把录播关了再说。你看这里。', 'normal'),
          D('嗯？刚才明明闪成黑白的……', 'normal'),
          D('怎么回放里没有啊？', 'worried'),
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
        lines: [
          R('下播以后，室友姐把一杯水放在桌上。豆沙还在刷手机。'),
          N('今天直播挺热闹啊。', 'normal'),
          D('对呀，怎么啦？', 'normal'),
          N('听说有人又说要跟 uaua 结婚了？', 'normal'),
          D('啊啊啊！那是开玩笑的嘛！', 'surprised'),
        ],
        choices: [{ t: '那是节目效果！你别跟着弹幕起哄！', next: 'pos' }],
      },
      pos: {
        lines: [
          N('哦——节目效果。', 'tease', 'manga'),
          D('你干嘛学我说话！', 'grin'),
          N('我哪有。', 'tease', 'manga'),
          D('小室——', 'normal'),
          N('嗯？', 'normal', 'manga'),
          D('你是不是不高兴了？', 'normal'),
          N('你觉得呢？', 'tease', 'manga'),
          D('……那我哄哄你嘛。', 'pout'),
        ],
        choices: [{ t: '（伸手拽住她的袖子）那你过来一下嘛。', next: 'gaze', aff: 15 }],
      },
      gaze: {
        lines: [
          N('怎么哄？', 'tease'),
          D('先抱一下！', 'smile'),
          N('刚刚不是还要跟别人结婚？', 'tease'),
          D('哎呀！你怎么还记着这个！', 'pout'),
          N('我记性好。', 'tease'),
          D('那你记不记得我今天想吃什么？', 'normal'),
          N('冰淇淋。冰箱里有。', 'normal'),
          D('……你怎么连这个都记得。', 'blush'),
          N('所以，还抱不抱了？', 'tease'),
        ],
        choices: [
          { t: '抱！现在就抱！', next: 'rw' },
          { t: '【直球】因为最想抱的人一直是你呀。', next: 'rwsp', aff: 50, ng: true },
        ],
      },
      rw: {
        lines: [
          R('豆沙扑过去，差点碰倒桌上的水。'),
          N('慢点！杯子！', 'surprised'),
          D('嘿嘿，接住我啦！', 'grin'),
        ],
        choices: [{ t: '（抱着不撒手）再抱一会儿嘛！', next: 'end' }],
      },
      rwsp: {
        lines: [
          N('……你这是专门挑我没防备的时候说？', 'blush'),
          D('有效果吗？', 'normal'),
          N('有一点。', 'smile'),
          D('那我要再说一次！', 'grin'),
          N('先把杯子放远点。', 'normal'),
        ],
        choices: [{ t: '好耶！', next: 'end' }],
      },
      end: {
        lines: [
          R('豆沙总算松开室友姐，伸手去够茶几上的冰淇淋。'),
          D('……诶？客厅的钟怎么还是七点？', 'surprised'),
          N('你是不是又盯着钟发呆了？', 'normal'),
          D('不是啦……我记得刚才就已经七点了。', 'worried'),
        ],
        prop: 'clock7',
        next: null,
      },
    },
  },

  // ---------- 第3话 扁头比格犬 ----------
  c1_l3: {
    id: 'c1_l3', chapter: 1, title: '第3话 · 扁头比格犬', page: 'page_ch3', mood: 'real', start: 's',
    nodes: {
      s: {
        lines: [
          N('你头发还没吹干呢。', 'normal'),
          D('我知道啦，等一下嘛。', 'normal'),
          N('吹风机在这儿。过来。', 'normal'),
        ],
        choices: [{ t: '那你帮我吹嘛！', next: 'cmd' }],
      },
      cmd: {
        lines: [
          N('好，坐下。', 'smile', 'manga'),
          D('嘿嘿。', 'grin'),
          N('别乱晃，吹不到后面了。', 'normal', 'manga'),
          D('那你轻一点哦。', 'normal'),
        ],
        choices: [{ t: '（乖乖坐好）好——', next: 'touch', aff: 10 }],
      },
      touch: {
        lines: [
          N('现在倒是挺乖的。', 'normal'),
          D('我平时也很乖！', 'grin'),
          N('嗯，扁头比格犬也这么觉得。', 'tease'),
          D('谁是扁头比格犬啊！', 'grin'),
        ],
        choices: [{ t: '那……再吹一小会儿嘛。', next: 'end' }],
      },
      end: {
        lines: [
          D('（其实还挺舒服的。）', 'closed'),
          N('好啦，吹干了。', 'normal'),
          D('……小室，对面那栋楼是不是有电视亮着？', 'worried'),
          N('哪栋？', 'normal'),
          D('就那边，蓝蓝的那个。', 'normal'),
          N('那边窗户不是一直黑的吗？', 'normal'),
          D('……诶？', 'worried'),
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
        lines: [
          N('豆沙，帮我搬一下这个箱子？我这边拿不开。', 'normal'),
          D('好重的样子……', 'normal'),
        ],
        choices: [{ t: '那我搬完有奖励吗？', next: 'bar' }],
      },
      bar: {
        lines: [
          N('你想要什么奖励？', 'normal', 'manga'),
          D('上次那套绝版百合漫画！', 'grin'),
          N('你不是说已经绝版了吗？', 'normal', 'manga'),
          D('中古店有！我看了好久的！', 'grin'),
          N('好吧，搬完我们一起去看看。', 'normal', 'manga'),
        ],
        choices: [{ t: '真的吗！那我现在就搬！', next: 'deal', aff: 20 }],
      },
      deal: {
        lines: [
          N('小心点，别砸到脚。', 'serious'),
          D('放心！李老师今天力大无穷！', 'grin'),
        ],
        choices: [{ t: '为了漫画，冲呀！', next: 'end' }],
      },
      end: {
        lines: [
          R('箱子落地，快递单露了出来。'),
          D('‘第4话·原稿·请勿折压’……这是什么？', 'normal'),
          N('原稿？', 'serious'),
          D('小室，我们刚刚是不是也在第四话？', 'normal'),
          N('……先把箱子放稳。', 'serious'),
          D('你也觉得奇怪，对不对？', 'worried'),
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
        lines: [
          D('小室——', 'normal'),
          N('怎么啦？', 'normal'),
          D('我有一个特别重要的问题。', 'normal'),
          N('说吧。', 'normal'),
          D('要是我一直赖在这里不走，你怎么办？', 'normal'),
        ],
        choices: [{ t: '（偷偷观察她的表情）', next: 'ans' }],
      },
      ans: {
        lines: [
          N('那我得先问问，谁天天说房间太乱？', 'tease', 'manga'),
          D('那是两回事！', 'grin'),
          N('哦，那你到底想住多久？', 'normal', 'manga'),
          D('很久很久！', 'grin'),
          N('有多久？', 'tease', 'manga'),
          D('……就是，明天也想跟你一起吃饭的那种很久。', 'worried'),
        ],
        choices: [
          { t: '你就说让不让我住嘛！', next: 'pull', aff: 30 },
          { t: '【直球】我就是想一直和你住在一起。', next: 'pullsp', aff: 100, ng: true },
        ],
      },
      pull: {
        lines: [
          N('你不是一直住着吗？', 'normal'),
          D('那不一样！我想听你说嘛！', 'smile'),
          N('好。明天也一起吃饭。', 'smile'),
          D('后天呢？', 'normal'),
          N('后天也行。', 'normal'),
        ],
        choices: [{ t: '那说好了哦！后天的后天也要一起吃！', next: 'home' }],
      },
      pullsp: {
        lines: [
          N('……怎么突然这么认真。', 'blush'),
          D('因为我真的很喜欢这里呀。', 'normal'),
          N('那就别急着走。', 'normal'),
          D('嘿嘿，好！', 'grin'),
        ],
        choices: [{ t: '嘿嘿……最喜欢你了。', next: 'home' }],
      },
      home: {
        lines: [
          N('欢迎回家，豆沙。', 'smile'),
        ],
        choices: [{ t: '我回来啦！', next: 'end' }],
      },
      end: {
        lines: [
          R('豆沙翻开墙上的日历。下一页，还是同一个日期。'),
          D('……奇怪。', 'worried'),
          D('（可是今天真的很好。）', 'normal'),
          D('（如果明天也是今天……）', 'normal'),
          D('（不对，我在想什么呀。）', 'closed'),
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
        lines: [
          D('你看你看！又在刷‘室李嫁’！', 'grin'),
          N('还有‘我是李室民’。', 'normal'),
          D('这群 Kimo熊！一天到晚都在想什么呀！', 'grin'),
        ],
        choices: [{ t: '（偷偷看一眼小室的反应）', next: 'fut' }],
      },
      fut: {
        lines: [
          N('那你怎么笑得这么开心？', 'normal'),
          D('我哪有！', 'grin'),
          N('嘴角都快翘到天上了。', 'tease'),
          D('那……他们说得也不是完全没有道理嘛。', 'normal'),
        ],
        choices: [{ t: '（小声）反正我在家里很有地位的！', next: 'wash' }],
      },
      wash: {
        lines: [
          N('有地位的人今天洗碗？', 'tease'),
          D('……为什么话题突然变成洗碗了！', 'worried'),
          N('因为碗还在水池里。', 'tease'),
        ],
        choices: [{ t: '好嘛！我洗！你陪我！', next: 'end' }],
      },
      end: {
        lines: [
          D('等一下，刚才那条弹幕怎么是蓝色的？', 'normal'),
          D('‘走到门外去’……什么门？', 'normal'),
          N('我没看到。是不是刷太快了？', 'normal'),
          D('可它刚才就停在那里……', 'normal'),
          N('要不去天台透透气？你今天盯屏幕太久了。', 'normal'),
          D('好！你跟我一起去！', 'smile'),
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
          D('诶诶诶？！怎么突然变黑白了！', 'surprised'),
          DM('？？？'),
          DM('画风突变'),
          DM('直播事故？'),
          D('先别截图啦！等我看看……', 'grin'),
          D('奇怪，还能走？', 'worried'),
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
          N('慢点跑，等我一下。', 'normal'),
          D('不行不行，直播要迟到啦！', 'grin'),
          N('你不是说七点开始吗？', 'normal'),
          D('对呀！', 'grin'),
          N('那你看看现在几点。', 'normal'),
          D('……七点？刚刚也是七点啊。', 'worried'),
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
          D('……它刚才是不是看了我一眼？', 'worried'),
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
          D('第1话、第2话……怎么每个箱子都写着原稿？', 'normal'),
          N('豆沙，先别站传送带上。', 'serious'),
          D('等一下！这不是我们刚才经历过的事吗？', 'grin'),
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
          D('小室！天台什么时候有这扇门了？', 'grin'),
          D('昨天我来晾衣服的时候明明没有！', 'grin'),
          R('门缝透出的白光，像一页还没画完的稿纸。'),
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
