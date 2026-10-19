// ============================================================
// 第二章 · 多边形的世界 —— 剧情脚本
// 核心：存档点熊猫 = Kimo熊留在这个世界的「锚点」。
// Kimo熊不是幕后黑手，是引路人和守护者：改不了规则，
// 只能在规则允许的地方放下熊猫，把坠落的两人接回来。
// 主题：Kimo熊能接住豆沙的失败，但不能替她走出这个世界。
//       真正陪豆沙跳进未知的，是室友姐。
// 设定纪律：终章 Kimo熊开口之前，两人不说「回档 / 锚点 / 数据」；
//           「锚点」「回档」由 Kimo熊第一次说出，两人之后只是复述。
// ============================================================
import { Scene, D, N, K, R, NOTE } from './types';

export const CH2_SCENES: Record<string, Scene> = {
  // ---------- 序章 A：落地（开场运镜后播放） ----------
  c2_arrive: {
    id: 'c2_arrive', chapter: 2, title: '序章 · 第二层', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('……到了？', 'closed'),
          D('小室？我们是不是出来了？', 'normal'),
          N('先别高兴太早。你低头看看自己的手。', 'serious'),
          D('……啊啊啊啊我的手怎么变成方块了？！', 'surprised'),
          N('不只是手。地面、天空、远处的树，全都变成了多边形。', 'normal'),
          D('所以……我们不是回到现实了？', 'worried'),
          N('看起来不是。', 'normal'),
          D('那刚才那扇门到底是什么？出口？还是另一个入口？', 'worried'),
          N('至少可以确定一件事。', 'serious'),
          D('什么？', 'normal'),
          N('我们逃出了漫画世界。', 'serious'),
          N('但没有逃出"世界"。', 'serious'),
          D('……这句话一点都不让人安心。', 'pout'),
          D('（走了几步，突然扶住额头）等一下……这个视角……这个深度……我好像有点晕3D……', 'dizzy'),
          N('我猜到了。', 'closed'),
          N('（掏出一把薄荷糖）拿着，先含一颗。你要是一路晕到出口，我还得拖着一只方块熊猫跑完全程。', 'smile'),
          D('你怎么连这种东西都准备了啊……', 'pout'),
          N('因为我室友是个在什么世界都会晕的笨蛋。', 'tease'),
          D('我才不是笨蛋。', 'pout'),
          N('嗯，方块笨蛋。', 'tease'),
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
          D('这是……熊猫？', 'surprised'),
          N('看起来像存档点。', 'normal'),
          D('为什么存档点会长成熊猫？', 'normal'),
          N('也许这个世界的审美还不错。', 'smile'),
          D('你是在说它可爱，还是在说我可爱？', 'grin'),
          N('我说存档点。', 'closed'),
          D('……哦。', 'pout'),
          N('走吧。先记住这里。万一你又摔下去，至少知道会从哪儿醒来。', 'smile'),
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
          D('小室，这个不是漫画页。', 'normal'),
          N('嗯。没有分镜，也没有对白框。', 'normal'),
          D('上面画的是我们刚才走过的路？', 'normal'),
          N('不完全是。你看这里，这座桥我们刚才走过，但纸上只记录了一半。', 'serious'),
          D('所以这个世界也在被画？', 'worried'),
          N('不一定是画。更像是……边走边长出来的。我们往前走，它才把后面的路补出来。像是这个世界只在我们看见的地方存在。', 'serious'),
          D('……听起来更可怕了。（翻到纸的背面）', 'worried'),
          NOTE('欢迎来到第二层。\n\n——Kimo熊'),
          D('……第二层？', 'surprised'),
          N('也就是说，漫画世界是第一层。', 'normal'),
          D('那现实是第几层？这个 Kimo 熊又是谁？', 'worried'),
          N('不知道。但至少，它知道我们从哪里来。', 'normal'),
          D('它在帮我们？', 'normal'),
          N('也可能是在观察我们。', 'serious'),
          D('你能不能说点安心的话？', 'pout'),
          N('可以。', 'smile'),
          N('——不管第几层，你先别松手。', 'smile'),
        ],
        choices: [
          { t: '我才没有怕到要牵手！', next: 'ra' },
          { t: '那你牵紧一点。', next: 'rb', aff: 15 },
          { t: '【直球】第几层都没关系，只要你还在我旁边。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: { lines: [N('嗯。那就当是我要牵的。（不由分说握住）', 'smile'), D('（……也没有甩开就是了。）', 'blush')], next: 'end' },
      rb: { lines: [N('（收紧手指）……嗯。', 'blush'), D('（掌心很暖。）', 'blush')], next: 'end' },
      rc: { lines: [N('（愣了一下，别开视线）……笨蛋。走了。', 'blush'), D('（她的耳朵红了。记下来了。）', 'grin')], next: 'end' },
      end: { lines: [D('（第一张纸条，收好了。第二层的路，还很长。……纸条的边角上，还印着两个小小的字母。）', 'normal')], next: null },
    },
  },

  // ---------- 第2关后：不是世界在复活你 · 第二张纸条 ----------
  c2_l2: {
    id: 'c2_l2', chapter: 2, title: '第2关 · 空中回廊', page: 'page3d_ch2', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          D('（刚从熊猫旁边醒来）刚才我掉下去了。', 'worried'),
          N('嗯。', 'normal'),
          D('掉了很久。', 'worried'),
          N('嗯。', 'normal'),
          D('然后我又回来了。', 'surprised'),
          N('我看见了。', 'normal'),
          D('你就不能表现得震惊一点吗？', 'pout'),
          N('你已经替我们两个震惊完了。', 'tease'),
          D('小室！', 'pout'),
          N('不过，这件事确实奇怪。', 'serious'),
          D('哪里奇怪？', 'normal'),
          N('你不是随机回来的。每次掉下去，你都会从最近的熊猫存档点旁边醒来。', 'serious'),
          D('所以它不是装饰？', 'surprised'),
          N('不是。', 'serious'),
          D('那它到底是在存档，还是在救我？', 'worried'),
          N('也许两者都是。至少，它把你完好无损地送了回来。', 'normal'),
          D('那这个熊猫就是 Kimo 熊？', 'normal'),
          N('还不能确定。但名字对得上。', 'normal'),
          R('豆沙在熊猫的脚边，摸到了第二张纸条。'),
          NOTE('不要相信眼前所有的出口。\n\n但如果掉下去，\n我会在这里等你。\n\n——Kimo熊'),
          D('……它真的在等我们。', 'sad'),
          N('嗯。它是不是这个世界的人，不知道。但至少——它不是想把我们困在这里的人。', 'smile'),
        ],
        choices: [
          { t: '那我以后掉下去之前先跟它打个招呼。', next: 'ra' },
          { t: '我还以为每次都是你把我捡回来的。', next: 'rb', aff: 15 },
          { t: '【直球】如果我总会回到 Kimo 熊这里，那你也一定要在这里等我。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: { lines: [N('打招呼之前，先练练别掉下去。', 'tease'), D('呜……努力。', 'pout')], next: 'end' },
      rb: { lines: [N('（顿了一下）……它负责把你送回来。我负责在你睁开眼的时候，第一个被看到。', 'blush'), D('（心跳漏了一拍。）', 'blush')], next: 'end' },
      rc: { lines: [N('（很轻地叹了口气，蹲下来和你平视）说什么呢。你醒来的每一次，我哪次不在？', 'smile'), D('（……好像，确实每次都在。）', 'blush')], next: 'end' },
      end: { lines: [D('（第二张纸条。原来每一次醒来，都是有谁在半路把我捞了回来。）', 'normal')], next: null },
    },
  },

  // ---------- 第3关后：线框层与会重排的世界 · 第三张纸条 ----------
  c2_l3: {
    id: 'c2_l3', chapter: 2, title: '第3关 · 线框断层塔', page: 'page3d_ch3', mood: 'wire', start: 'a',
    nodes: {
      a: {
        lines: [
          D('小室，我刚才切到黑白层的时候看清楚了。', 'serious'),
          N('嗯？', 'normal'),
          D('那不是漫画层。', 'serious'),
          N('我也注意到了。没有分镜，没有网点，也没有对白框。', 'normal'),
          D('全都是线。', 'normal'),
          N('更像建模软件里的线框视图。', 'serious'),
          D('所以这个世界不是被画出来的。', 'worried'),
          N('是被搭出来的。', 'serious'),
          D('之前的漫画世界是一本漫画。这里是一个模型？', 'worried'),
          N('可能是。', 'normal'),
          D('那我们到底掉进了什么东西里啊……', 'sad'),
          R('远处的平台突然"咔哒"一声，重新排列了。', 'wire'),
          D('等等！那条路刚才不是那样的！', 'surprised'),
          N('它改了。', 'serious'),
          D('谁改的？', 'worried'),
          N('不一定是"谁"。', 'serious'),
          D('什么意思？', 'normal'),
          N('也许这个世界自己会修正错误。', 'serious'),
          D('错误？', 'worried'),
          N('比如我们走到了不该知道的地方。', 'serious'),
          R('熊猫的身边，压着第三张纸条。'),
          NOTE('我不能改路。\n\n也不能阻止世界重排。\n\n我只能在你们掉下去的时候，\n把你们带回还能继续走的地方。\n\n——Kimo熊'),
          D('所以之前每次复活，都是它……', 'sad'),
          N('嗯。不是这个世界的规矩，也不是它的温柔。', 'normal'),
          N('是有人一直守在什么地方，在你坠落的瞬间把你带回来。', 'smile'),
          D('那它自己呢？', 'worried'),
          N('它大概一直留在原地。', 'normal'),
          D('等下一个掉下来的人？', 'sad'),
          N('等你。', 'smile'),
        ],
        choices: [
          { t: '听起来好寂寞。', next: 'ra' },
          { t: '如果它也被困着，那我们出去以后能不能带它一起走？', next: 'rb', aff: 15 },
          { t: '【直球】那你也要看着我。不是控制，是看着我走出去。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: { lines: [N('嗯。所以路过它的时候，记得摸摸头。', 'smile'), D('（下次一定！）', 'grin')], next: 'end' },
      rb: { lines: [N('（看了你两秒，眼神软下来）……你这个人啊。好。到时候问问它愿不愿意。', 'smile'), D('（一言为定！）', 'grin')], next: 'end' },
      rc: { lines: [N('（黑白的线框世界里，只有她的声音是有温度的）……一直都在看。从第一层就在看。', 'blush', 'wire'), D('（心跳声在线框层里格外清楚。）', 'blush', 'wire')], next: 'end' },
      end: { lines: [D('（第三张纸条。它改不了这个世界的规矩——但它一直在规矩的缝隙里，一次一次地把我送回原地。）', 'normal')], next: null },
    },
  },

  // ---------- 第4关后：世界边缘的裂缝 · 第四张纸条 ----------
  c2_l4: {
    id: 'c2_l4', chapter: 2, title: '第4关 · 云端跳线', page: 'page3d_ch4', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          R('云端平台。远处的天空像模型面片没接好，露出一道细长的亮缝。'),
          N('豆沙，看那边。', 'serious'),
          D('那条亮线？', 'normal'),
          N('嗯。天空在那里没有接上。', 'serious'),
          D('像模型穿模了。', 'normal'),
          N('对。也像世界的边界漏了一条缝。', 'serious'),
          D('那会不会是出口？', 'surprised'),
          N('有可能。', 'normal'),
          D('可是 Kimo 熊说不要相信所有出口。', 'worried'),
          N('所以问题不是"它是不是出口"。', 'serious'),
          D('那是什么？', 'normal'),
          N('是谁让我们看到它。', 'serious'),
          R('附近的熊猫，轻轻亮了一下。'),
          D('刚才……它是不是亮了？', 'surprised'),
          N('嗯。像是在回应。', 'normal'),
          R('豆沙从熊猫的脚边，摸出了第四张纸条。'),
          NOTE('下一次就能见面。\n\n裂缝会移动。\n\n别跟丢。\n\n——Kimo熊'),
          D('下一次就能见面？', 'surprised'),
          N('说明现在这些熊猫，都只是它留在路上的分身。', 'serious'),
          D('那真正的 Kimo 熊在哪里？', 'normal'),
          N('也许就在最后一个存档点。', 'normal'),
          D('最后一个……', 'worried'),
          N('嗯。世界尽头的那个。', 'serious'),
          D('如果下一条缝也不是回家的路呢？', 'sad'),
          N('那就继续走。', 'normal'),
          D('你说得好轻松。', 'pout'),
          N('不轻松。', 'serious'),
          N('只是你在旁边的话，就没那么难。', 'smile'),
        ],
        choices: [
          { t: '这种时候突然说这种话也太狡猾了。', next: 'ra' },
          { t: '那我也会一直在你旁边。', next: 'rb', aff: 15 },
          { t: '【直球】如果出口每次都会换地方，那我的方向就只剩你了。', next: 'rc', aff: 50, ng: true },
        ],
      },
      ra: { lines: [N('狡猾的是这个世界。我只是实话实说。', 'tease'), D('（把脸埋进外套里掩饰表情）', 'blush')], next: 'end' },
      rb: { lines: [N('（把外套披在你肩上）嗯。那就互相看好对方，别跟丢。', 'smile'), D('（外套上全是她的温度。）', 'blush')], next: 'end' },
      rc: { lines: [N('（很久没有说话。云从脚下飘过去。然后她伸出手，把你的手攥进掌心）……那这个方向，以后不会再换地方了。', 'blush'), D('（用力点头。）', 'smile')], next: 'end' },
      end: { lines: [D('（第四张纸条。下一次，就能见到一直在原地等我的那个家伙了。）', 'normal')], next: null },
    },
  },

  // ---------- 第5关后：Kimo熊现身 · 最后的跳跃 ----------
  c2_l5: {
    id: 'c2_l5', chapter: 2, title: '第5关 · 世界的接缝', page: 'page3d_ch5', mood: 'poly', start: 'a',
    nodes: {
      a: {
        lines: [
          R('世界的接缝前。裂缝像一道呼吸的光。旁边——又蹲着一只熊猫。'),
          D('又是熊猫存档点……', 'normal'),
          R('熊猫轻轻亮了起来。'),
          K('终于到了。', 'normal'),
          D('……你会说话？！', 'surprised'),
          N('看来这不是普通存档点。', 'serious'),
          D('Kimo 熊？', 'normal'),
          K('嗯。', 'normal'),
          D('原来每个存档点都是你？', 'surprised'),
          K('不是全部。', 'normal'),
          K('那些是我留下的锚点。', 'normal'),
          K('这里，才是我。', 'smile'),
          N('每次她掉下去，也是你把她送回来的？', 'serious'),
          K('嗯。', 'normal'),
          D('那你为什么不早点出来！', 'pout'),
          K('因为我不能离开锚点太远。', 'sad'),
          N('所以你不是不想见我们。', 'normal'),
          K('我在等你们走到最后一个存档点。', 'normal'),
          D('最后一个？', 'normal'),
          K('这里。', 'serious'),
          R('Kimo熊看向裂缝。'),
          K('过了这里，就超出我锚点能触及的范围了。', 'serious'),
          D('……什么意思？', 'worried'),
          K('跳进去以后，你们不会再回到我这里。没有回档，没有重来。', 'serious'),
          K('也可能，不会落在任何地方。', 'sad'),
          N('所以这是不能重来的跳跃。', 'serious'),
          K('嗯。', 'normal'),
          D('那你还让我们跳？', 'worried'),
          K('因为留在这里，你们会永远回到存档点。', 'serious'),
          K('永远安全。', 'normal'),
          K('也永远出不去。', 'sad'),
          R('沉默。裂缝的光在两个人脸上明明灭灭。'),
          N('豆沙。', 'serious'),
          D('嗯。', 'normal'),
          N('这次如果掉下去，没有人能再把你回档了。', 'serious'),
          D('那你来当我的存档点。', 'serious'),
          N('好。', 'smile'),
          D('那就跳。', 'grin'),
        ],
        choices: [
          { t: '走！这次也把它通关！', next: 'jump' },
          { t: '牵紧我。不要又被世界分开。', next: 'jump', aff: 15 },
          { t: '【直球】我不确定哪里是家。但现在，我想把有你的地方先当成方向。', next: 'jumpS', aff: 50, ng: true },
        ],
      },
      jump: { lines: [D('（回头朝 Kimo熊 用力挥了挥手。）', 'grin'), K('……去吧。', 'smile')], next: null },
      jumpS: { lines: [N('（她安静地看了你几秒，然后十指相扣，扣得很紧。）……那就跳吧。方向由你定，手由我牵。', 'blush'), K('……去吧。', 'smile')], next: null },
    },
  },

  // ---------- 普通结局：跳进裂缝之后 ----------
  c2_end: {
    id: 'c2_end', chapter: 2, title: '终章 · 没有存档点的地方', mood: 'white', start: 'a',
    nodes: {
      a: {
        lines: [
          R('她们离开了最后一个 Kimo熊 存档点。', 'white'),
          R('也离开了那个永远会把她们接回来的安全位置。', 'white'),
          R('裂缝的另一边，不一定是现实。', 'white'),
          R('但至少，那是没有被这个世界记录过的地方。', 'white'),
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
          D('哇！世界……全变成线了？', 'surprised', 'wire'),
          N('别一直盯着看。你会晕的。', 'serious', 'wire'),
          D('……小室，你怎么还是彩色的？', 'normal', 'wire'),
          N('嗯？我看你也还是你啊。', 'normal', 'wire'),
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
          D('等等……前面的路，刚才是不是还没有？', 'surprised'),
          N('嗯。我们走近了，它才出现。', 'serious'),
          D('……我决定不去想它。', 'dizzy'),
          N('明智。跟紧我。', 'smile'),
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
          D('诶？！路……自己在动！', 'surprised'),
          N('站稳。抓着我。', 'serious'),
          R('平台一块一块滑回了原位，像是有人把拼错的积木重新摆好。'),
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
          D('……那是什么？天上……有一道缝？', 'surprised'),
          N('先别停。到高处去看。', 'serious'),
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
          D('裂缝……就在前面了。', 'serious'),
          N('嗯。', 'normal'),
          D('小室，你说它后面是什么？', 'worried'),
          N('不知道。所以才要亲眼去看。', 'smile'),
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
