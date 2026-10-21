// ============================================================
// 第二章 · 多边形的世界 —— 剧情脚本
// 核心：路上的存档点熊猫，有一部分是 Kimo熊放的（另一部分它也不知道是谁放的——隐藏档案的伏笔）。
// Kimo熊不是幕后黑手，是引路人和守护者：改不了规则，
// 小李摔下去时，小熊猫会把她「送回来」（送回最近的小熊猫旁边）；过了最后那道缝，就没办法送回来了。
// 主题：Kimo熊能把豆沙一次次送回来，但不能替她走出这个世界。
//       真正陪豆沙跳进未知的，是室友姐。
// 设定纪律：两人和 Kimo熊都不说「回档 / 锚点 / 数据」这类词，只说看得见的事。
// 对白来源：docs/implementation-pack/02_正式对白替换稿.md（编剧锁定稿，按 scene/node 转写）。
// ============================================================
import { Scene, D, N, K, R, NOTE } from './types';

export const CH2_SCENES: Record<string, Scene> = {
  // ---------- 序章 A：落地（开场运镜后播放） ----------
  c2_arrive: {
    id: 'c2_arrive', chapter: 2, title: '序章 · 第二层', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('……小室？我们到了吗？', 'worried'),
          N('应该……到了吧。', 'normal'),
          D('太好了！我们出来——', 'grin'),
          D('啊啊啊啊！我的手怎么变方块了！', 'surprised'),
          N('别动，我看看。', 'normal'),
          D('你也变了！树也变了！天也变了！', 'grin'),
          N('看来门后面不是我们家。', 'normal'),
          D('那我们到底出来了没有嘛！', 'smile'),
          N('至少离开刚才那本漫画了。', 'normal'),
          D('这算哪门子好消息啊！', 'grin'),
          R('豆沙往前走了两步，扶住额头。'),
          D('不行……这个视角……我有点晕……', 'dizzy'),
          N('先别走了，含一颗。', 'serious'),
          D('薄荷糖？你怎么还有这个！', 'grin'),
          N('你上次说过，晕的时候含这个舒服点。', 'normal'),
          D('……你还记得呀。', 'worried'),
          N('当然记得。别嚼，慢慢含。', 'smile'),
          D('好嘛……小室你拉着我走。', 'normal'),
          N('来，手给我。', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 序章 B：第一只熊猫（走到第一个存档点旁触发） ----------
  c2_firstpanda: {
    id: 'c2_firstpanda', chapter: 2, title: '序章 · 路边的熊猫', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('哇！小熊猫！', 'surprised'),
          N('它旁边有个发光的标记。', 'normal'),
          D('好可爱！小室你快看！', 'grin'),
          N('看到了。', 'normal'),
          D('你说它可爱，还是我可爱？', 'normal'),
          N('……你这也要比？', 'tease'),
          D('要！', 'grin'),
          N('都可爱，行了吧。', 'smile'),
          D('嘿嘿，那我先摸摸它。', 'grin'),
          R('熊猫头顶亮起一颗小星星。'),
          D('诶？它是不是记住我了？', 'surprised'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第1关后：第二层 · 第一张纸条 ----------
  c2_l1: {
    id: 'c2_l1', chapter: 2, title: '第1关 · 多出来的一维', page: 'page3d_ch1', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('小室，这次捡到的不是漫画页了。', 'normal'),
          N('嗯。你看，画的是刚才那座桥。', 'normal'),
          D('可我们走过的路比这长呀。', 'normal'),
          N('这里后半段是空白的。', 'normal'),
          D('……不会是我们走过去以后，它才出现的吧？', 'worried'),
          N('有可能。先把这张收好。', 'smile'),
          R('纸背面有一行歪歪扭扭的小字。'),
          NOTE('小李小李！欢迎来到第二层哦！\n——Kimo熊'),
          D('Kimo熊？！怎么是 Kimo熊！', 'surprised'),
          N('你认识？', 'normal'),
          D('名字当然认识！可是……它怎么会在这里留纸条？', 'grin'),
          N('我也想知道。', 'smile'),
          D('小室，我们不会还在别的什么故事里吧？', 'normal'),
          N('不知道。不过你抓着我衣服干嘛？', 'normal'),
          D('……怕你走丢！', 'worried'),
          N('好，那你负责看好我。', 'smile'),
        ],
        choices: [
          { t: '我才没有害怕！我是怕你走丢！', next: 'ra' },
          { t: '那你把手给我嘛。', next: 'rb', aff: 15 },
          { t: '【直球】哪一层都行，我要跟你一起走。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: {
        lines: [
          N('嗯嗯，是我容易走丢。', 'normal'),
          D('你笑什么啦！', 'pout'),
        ],
        next: 'end',
      },
      rb: {
        lines: [
          N('给你。', 'smile'),
          D('嘿嘿，这样就不会丢了。', 'grin'),
        ],
        next: 'end',
      },
      rc: {
        lines: [
          N('……好。', 'blush'),
          D('你怎么不说话？', 'normal'),
          N('在牵你的手。', 'normal'),
        ],
        next: 'end',
      },
      end: {
        lines: [
          D('（纸条边上还印着两个很小的字母。先记下来。）', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第2关后：不是世界在复活你 · 第二张纸条 ----------
  c2_l2: {
    id: 'c2_l2', chapter: 2, title: '第2关 · 空中回廊', page: 'page3d_ch2', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('小室！我刚刚是不是掉下去了？！', 'surprised'),
          N('嗯，吓我一跳。', 'normal'),
          D('可是我又回到小熊猫旁边了！', 'grin'),
          N('我看到它亮了一下，然后你就回来了。', 'normal'),
          D('那它真的不是普通装饰！', 'grin'),
          N('看起来，是它把你送回来的。', 'normal'),
          D('我刚才还以为我要一直掉下去……', 'normal'),
          N('先坐一下，缓缓。', 'normal'),
          R('熊猫脚边压着一张纸条。'),
          NOTE('小李小李，别随便相信路上的出口哦。\n要是摔下去了，小熊猫会把小李送回这里的！\n——Kimo熊'),
          D('它真的在等我……', 'normal'),
          N('嗯。我们先谢谢它。', 'normal'),
          D('谢谢你呀，Kimo熊！', 'smile'),
          R('熊猫头上的小星星轻轻闪了一下。'),
        ],
        choices: [
          { t: '那我以后摔下去之前先喊一声 Kimo熊！', next: 'ra' },
          { t: '我还以为是你把我抱回来的呢。', next: 'rb', aff: 15 },
          { t: '【直球】我醒过来的时候，你也要在我旁边哦。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: {
        lines: [
          N('最好是别摔。', 'normal'),
          D('知道啦！', 'grin'),
        ],
        next: 'end',
      },
      rb: {
        lines: [
          N('我倒是想，可刚才根本够不着你。', 'normal'),
          D('那你是不是很担心？', 'normal'),
          N('你说呢？', 'normal'),
        ],
        next: 'end',
      },
      rc: {
        lines: [
          N('我刚才一直就在这儿。', 'normal'),
          D('那以后也要！', 'grin'),
          N('好。', 'smile'),
        ],
        next: 'end',
      },
      end: {
        lines: [
          D('（原来不是世界自己让我回来的。是有人在这里等我。）', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第3关后：线框层与会重排的世界 · 第三张纸条 ----------
  c2_l3: {
    id: 'c2_l3', chapter: 2, title: '第3关 · 线框断层塔', page: 'page3d_ch3', mood: 'wire', start: 'a',
    nodes: {
      a: {
        lines: [
          D('小室！我刚刚切到黑白那一层了！', 'grin'),
          N('然后呢？', 'normal'),
          D('这里没有漫画格子，全部都是线！像建模软件！', 'grin'),
          N('我也看到了。', 'smile'),
          D('那我们是不是被做成模型了啊？', 'normal'),
          N('……先别急着下结论。', 'serious'),
          R('远处的平台‘咔哒’一声，突然挪了位置。', 'wire'),
          D('啊？！路动了！', 'surprised'),
          N('先站稳，别跳。', 'serious'),
          D('可是刚刚那里明明能走！', 'grin'),
          N('我知道。我们等它停下来。', 'normal'),
          R('熊猫旁边的纸条被风吹得翻了个角。', 'wire'),
          NOTE('小李小李，对不起呀。\n路变来变去，Kimo熊也没办法让它停下。\nKimo熊只能在小李摔下来的时候，接小李回来。\n——Kimo熊'),
          D('……原来你也没办法呀。', 'worried'),
          N('至少它一直在尽力帮我们。', 'normal'),
          D('它一个人在这里等，会不会很无聊？', 'worried'),
          N('那下次见到它，你自己问问。', 'normal'),
          D('我要给它摸摸头！', 'grin'),
        ],
        choices: [
          { t: '那我一定要去谢谢它！', next: 'ra' },
          { t: '我们能不能把 Kimo熊一起带出去？', next: 'rb', aff: 15 },
          { t: '【直球】小室，我们也要一起出去，好不好？', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: {
        lines: [
          N('好，记着。', 'smile'),
          D('不会忘的！', 'grin'),
        ],
        next: 'end',
      },
      rb: {
        lines: [
          N('等见到它，我们问问它愿不愿意。', 'normal'),
          D('说好了哦！', 'grin'),
        ],
        next: 'end',
      },
      rc: {
        lines: [
          N('好。先过这一关。', 'smile', 'wire'),
          D('你不许偷偷走太快！', 'pout', 'wire'),
          N('那你也别松手。', 'normal', 'wire'),
        ],
        next: 'end',
      },
      end: {
        lines: [
          D('（第三张纸条。Kimo熊也不是无所不能的。）', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第4关后：世界边缘的裂缝 · 第四张纸条 ----------
  c2_l4: {
    id: 'c2_l4', chapter: 2, title: '第4关 · 云端跳线', page: 'page3d_ch4', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          R('云端尽头，天空像没有拼好的模型，裂开一条亮缝。'),
          D('小室你看！天裂开了！', 'grin'),
          N('看到了。先别靠太近。', 'serious'),
          D('那里会不会就是出口？', 'worried'),
          N('有可能。但之前的纸条不是让我们小心吗？', 'serious'),
          D('嗯……Kimo熊说过的。', 'normal'),
          R('身边的小熊猫轻轻亮了一下。'),
          D('它是不是在提醒我们？', 'normal'),
          N('脚边还有张纸。', 'normal'),
          NOTE('小李小李！再往前走，就能见到 Kimo熊啦！\n天上的缝会动，别跟丢了哦！\n——Kimo熊'),
          D('诶！终于能见到它了！', 'grin'),
          N('那我们先去找它。', 'normal'),
          D('可是……如果那个缝后面还是回不了家呢？', 'normal'),
          N('那就到时候再想办法。', 'normal'),
          D('你说得好轻松。', 'pout'),
          N('一点也不轻松。', 'smile'),
          D('那你怎么还笑？', 'normal'),
          N('因为你刚才说要带 Kimo熊一起走的时候，特别有精神。', 'normal'),
          D('……那当然啦！', 'worried'),
        ],
        choices: [
          { t: '你居然在这种时候笑我！', next: 'ra' },
          { t: '那你可要跟紧我哦！', next: 'rb', aff: 15 },
          { t: '【直球】就算还要走很远，我也想和你一起走。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: {
        lines: [
          N('没笑你。我觉得挺好的。', 'smile'),
          D('哼，那还差不多。', 'pout'),
        ],
        next: 'end',
      },
      rb: {
        lines: [
          N('好，今天你带路。', 'smile'),
          D('诶？真的啊？', 'surprised'),
        ],
        next: 'end',
      },
      rc: {
        lines: [
          N('……我也是。', 'blush'),
          D('那说好了，不许反悔！', 'pout'),
        ],
        next: 'end',
      },
      end: {
        lines: [
          D('（第四张纸条。再往前，就能见到 Kimo熊了。）', 'normal'),
        ],
        next: null,
      },
    },
  },

  // ---------- 第5关后：Kimo熊现身 · 最后的跳跃 ----------
  c2_l5: {
    id: 'c2_l5', chapter: 2, title: '第5关 · 世界的接缝', page: 'page3d_ch5', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          R('世界的接缝前，最后一只熊猫坐在光里。'),
          D('Kimo熊——？是你吗？', 'normal'),
          K('小李小李！终于来啦！', 'grin'),
          D('啊啊啊！真的会说话！', 'surprised'),
          K('是 Kimo熊哦！', 'grin'),
          D('你怎么一直躲在这里嘛！', 'smile'),
          K('呜……Kimo熊也想早点见小李呀。', 'sad'),
          K('可是 Kimo熊走不了那么远嘛……', 'sad'),
          D('所以路上那些小熊猫，真的是你放的？', 'normal'),
          K('有一些是 Kimo熊放的哦。', 'normal'),
          K('小李掉下去的时候，它们就能把小李送回来！', 'grin'),
          D('那还有一些呢？', 'normal'),
          K('……那一些，Kimo熊也想知道是谁放的。', 'closed'),
          N('你一直在这里等我们？', 'normal'),
          K('嗯！等小李，等了好久好久。', 'grin'),
          D('那现在我们终于见到了！你跟我们一起走嘛！', 'smile'),
          K('……', 'closed'),
          K('小李小李，前面那个地方，Kimo熊去不了。', 'sad'),
          D('诶？为什么？', 'surprised'),
          K('小李掉下去的话，Kimo熊只能把小李送回这些小熊猫旁边。', 'normal'),
          K('可要是过了那道缝……Kimo熊就没办法把小李送回来了。', 'sad'),
          N('也就是说，再掉下去就回不来了？', 'serious'),
          K('……嗯。', 'closed'),
          D('一次都不行？', 'normal'),
          K('一次都不行哦。', 'normal'),
          D('那我们不跳的话呢？', 'normal'),
          K('那就可以一直留在这里呀。小李掉下去，小熊猫还会把小李送回来的。', 'normal'),
          K('可是……就再也走不出去啦。', 'normal'),
          R('豆沙蹲下来，轻轻摸了摸 Kimo熊的头。'),
          D('谢谢你一直等我们。', 'smile'),
          K('……小李。', 'closed'),
          D('可是我还是想回家。还想带小室一起回去。', 'normal'),
          N('我也想回去。', 'smile'),
          D('小室，你怕不怕？', 'normal'),
          N('怕。', 'serious'),
          D('那你手给我。', 'normal'),
          N('给你。', 'smile'),
          D('Kimo熊，我们要走啦。', 'normal'),
          K('……嗯！小李小李，要小心哦！', 'closed'),
        ],
        choices: [
          { t: '走！这次也要通关！', next: 'jump' },
          { t: '小室，牵紧我！', next: 'jump', aff: 15 },
          { t: '【直球】不知道前面是什么，但我想和你一起去。', next: 'jumpS', aff: 50, ng: true },
        ],
      },
      jump: {
        lines: [
          R('豆沙回过头，用力朝 Kimo熊挥手。'),
          D('下次见！Kimo熊！', 'grin'),
          K('小李小李……一路顺风哦！', 'grin'),
        ],
        next: null,
      },
      jumpS: {
        lines: [
          N('好。一起。', 'smile'),
          R('两个人十指相扣。豆沙回过头，朝 Kimo熊挥手。'),
          D('Kimo熊，我们走啦！', 'grin'),
          K('……嗯！Kimo熊会记得小李的！', 'closed'),
        ],
        next: null,
      },
    },
  },

  // ---------- 普通结局：跳进裂缝之后 ----------
  c2_end: {
    id: 'c2_end', chapter: 2, title: '终章 · 没有存档点的地方', mood: 'white', start: 'a',
    nodes: {
      a: {
        lines: [
          R('她们跳进了那道缝。', 'white'),
          R('身后的小熊猫，终于看不见了。', 'white'),
          R('前面是什么地方，谁也不知道。', 'white'),
          R('豆沙下意识握紧了身边的手。', 'white'),
          D('小室……', 'normal', 'white'),
          D('这次如果掉下去，真的没有存档点了。', 'worried', 'white'),
          N('嗯。', 'normal', 'white'),
          D('你害怕吗？', 'worried', 'white'),
          N('有一点。', 'closed', 'white'),
          D('那你刚才还说得那么帅。', 'pout', 'white'),
          N('因为你比我更怕。', 'smile', 'white'),
          D('……小室。', 'blush', 'white'),
          N('嗯？', 'normal', 'white'),
          D('牵紧点。', 'blush', 'white'),
          N('早就牵紧了。', 'smile', 'white'),
          R('（黑屏。）', 'dark'),
        ],
        next: null,
      },
    },
  },

  // ================= 关卡内的小剧场 =================
  c2_m_wire: {
    id: 'c2_m_wire', chapter: 2, title: '第一次切到线框层', mood: 'wire', start: 'a',
    nodes: {
      a: {
        lines: [
          D('哇！这里怎么全是线啊！', 'surprised', 'wire'),
          N('先别转太快，你又要晕了。', 'serious', 'wire'),
          D('小室？你怎么还是彩色的？', 'normal', 'wire'),
          N('你在我眼里也没变啊。', 'tease', 'wire'),
        ],
        next: null,
      },
    },
  },
  c2_m_grow: {
    id: 'c2_m_grow', chapter: 2, title: '自己长出来的路', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('诶？刚才那儿有路吗？', 'surprised'),
          N('我们走近以后才出现的。', 'normal'),
          D('……它能不能一次长完啊！', 'worried'),
          N('你先走慢点。', 'normal'),
        ],
        next: null,
      },
    },
  },
  c2_m_shift: {
    id: 'c2_m_shift', chapter: 2, title: '咔哒', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('啊啊啊！地板在动！', 'surprised'),
          N('过来！抓住我！', 'normal'),
          R('平台一块块滑回原位，发出清脆的咔哒声。'),
        ],
        next: null,
      },
    },
  },
  c2_m_crack: {
    id: 'c2_m_crack', chapter: 2, title: '天上的缝', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('小室！天上是不是裂了！', 'grin'),
          N('嗯，先到高一点的地方看看。', 'smile'),
        ],
        next: null,
      },
    },
  },
  c2_m_last: {
    id: 'c2_m_last', chapter: 2, title: '最后一段路', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('那道缝就在前面了。', 'normal'),
          N('看见了。', 'normal'),
          D('小室，我突然有点紧张。', 'worried'),
          N('那我们走慢一点。', 'smile'),
        ],
        next: null,
      },
    },
  },
};

export const CH2_LEVEL_SCENE: Record<number, string> = {
  1: 'c2_l1', 2: 'c2_l2', 3: 'c2_l3', 4: 'c2_l4', 5: 'c2_l5',
};
/** 第五关剧情无条件播放 */
export const CH2_ALWAYS = new Set([5]);
