import { EntityType, LevelConfig, YuriEvent } from './types';

export const GRAVITY = 0.6;
export const JUMP_FORCE = -14.5; 
export const MOVE_SPEED = 5;
export const LAYER_COOLDOWN = 400; 

// 使用稳定的 Google CDN 8-bit 音乐链接
export const BGM_URL = "https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3"; 

// 【重要】GitHub Pages 部署适配：使用相对路径 "./special_cg.png"
// 这样无论项目部署在根域名还是子目录下（如 username.github.io/repo/），都能正确找到文件
export const SPECIAL_CG_URL = "https://github.com/shaw-core/ShadowLee_It-s-MyGO-/components/special_cg.png"; 

// --- Level Design ---

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "第1关：直播事故",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'g1', type: EntityType.PLATFORM, x: 0, y: 500, w: 900, h: 100, layerMask: 'BOTH' },
      
      // Tutorial
      { id: 't1_step1', type: EntityType.PLATFORM, x: 250, y: 440, w: 80, h: 20, layerMask: 'BOTH' },
      { id: 't1_step2', type: EntityType.PLATFORM, x: 350, y: 380, w: 80, h: 20, layerMask: 'BOTH' },
      
      // Layer Switch Logic
      { id: 'w1', type: EntityType.PLATFORM, x: 500, y: 250, w: 40, h: 250, layerMask: 'REAL' }, 
      { id: 'm1', type: EntityType.PLATFORM, x: 450, y: 300, w: 140, h: 20, layerMask: 'MANGA' },
      
      { id: 'p_high_1', type: EntityType.PLATFORM, x: 620, y: 240, w: 100, h: 20, layerMask: 'BOTH' },
      { id: 'p_high_2', type: EntityType.PLATFORM, x: 740, y: 170, w: 100, h: 20, layerMask: 'MANGA' },
      
      { id: 'page_ch1', type: EntityType.COLLECTIBLE_PAGE, x: 770, y: 120, w: 30, h: 40, layerMask: 'MANGA' },
      
      { id: 'g2', type: EntityType.PLATFORM, x: 800, y: 450, w: 300, h: 150, layerMask: 'BOTH' },
      { id: 'goal', type: EntityType.GOAL, x: 1000, y: 350, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  },
  {
    id: 2,
    name: "第2关：查岗时刻",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'g1', type: EntityType.PLATFORM, x: 0, y: 500, w: 250, h: 100, layerMask: 'BOTH' },
      { id: 'pit_haz', type: EntityType.HAZARD, x: 250, y: 580, w: 500, h: 20, layerMask: 'REAL' }, 
      { id: 'love_bridge_main', type: EntityType.PLATFORM, x: 240, y: 450, w: 450, h: 20, layerMask: 'MANGA' },
      
      { id: 'ruin_1', type: EntityType.PLATFORM, x: 320, y: 520, w: 40, h: 60, layerMask: 'REAL' },
      { id: 'ruin_2', type: EntityType.PLATFORM, x: 500, y: 550, w: 40, h: 30, layerMask: 'REAL' },

      { id: 'secret_p1', type: EntityType.PLATFORM, x: 380, y: 500, w: 60, h: 10, layerMask: 'REAL' },
      { id: 'shard_1', type: EntityType.COLLECTIBLE_SHARD, x: 400, y: 470, w: 20, h: 20, layerMask: 'REAL' },
      
      { id: 'p_cloud', type: EntityType.PLATFORM, x: 500, y: 350, w: 60, h: 10, layerMask: 'MANGA' },
      { id: 'page_ch2', type: EntityType.COLLECTIBLE_PAGE, x: 515, y: 300, w: 30, h: 40, layerMask: 'MANGA' },

      { id: 'g2', type: EntityType.PLATFORM, x: 680, y: 400, w: 400, h: 200, layerMask: 'BOTH' },
      { id: 'goal', type: EntityType.GOAL, x: 1000, y: 300, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  },
  {
    id: 3,
    name: "第3关：扁头比格犬",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'start', type: EntityType.PLATFORM, x: 0, y: 500, w: 150, h: 100, layerMask: 'BOTH' },
      
      // Sequence 1: Safer jumping
      { id: 'b1_real', type: EntityType.PLATFORM, x: 160, y: 450, w: 100, h: 20, layerMask: 'REAL' }, 
      { id: 'b2_manga', type: EntityType.PLATFORM, x: 260, y: 400, w: 100, h: 20, layerMask: 'MANGA' }, 
      { id: 'b3_real', type: EntityType.PLATFORM, x: 360, y: 350, w: 100, h: 20, layerMask: 'REAL' }, 
      
      // Safety Net 
      { id: 'safety_net', type: EntityType.PLATFORM, x: 100, y: 550, w: 700, h: 20, layerMask: 'BOTH' },
      
      // Recovery Path
      { id: 'rec_1', type: EntityType.PLATFORM, x: 500, y: 480, w: 80, h: 20, layerMask: 'BOTH' },
      { id: 'rec_2', type: EntityType.PLATFORM, x: 600, y: 410, w: 80, h: 20, layerMask: 'BOTH' },
      { id: 'rec_3', type: EntityType.PLATFORM, x: 700, y: 340, w: 80, h: 20, layerMask: 'BOTH' },

      { id: 'bed_area', type: EntityType.PLATFORM, x: 450, y: 300, w: 350, h: 20, layerMask: 'BOTH' },
      { id: 'page_ch3', type: EntityType.COLLECTIBLE_PAGE, x: 600, y: 250, w: 30, h: 40, layerMask: 'MANGA' },

      { id: 'end_g', type: EntityType.PLATFORM, x: 850, y: 350, w: 200, h: 150, layerMask: 'BOTH' },
      { id: 'goal', type: EntityType.GOAL, x: 950, y: 250, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  },
  {
    id: 4,
    name: "第4关：苦力时刻",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'start', type: EntityType.PLATFORM, x: 0, y: 500, w: 150, h: 100, layerMask: 'BOTH' },
      
      { id: 'wall_1', type: EntityType.PLATFORM, x: 250, y: 300, w: 40, h: 200, layerMask: 'REAL' },
      { id: 'plat_1', type: EntityType.PLATFORM, x: 200, y: 350, w: 140, h: 20, layerMask: 'MANGA' },
      
      { id: 'wall_2', type: EntityType.PLATFORM, x: 450, y: 200, w: 40, h: 300, layerMask: 'REAL' },
      { id: 'plat_2', type: EntityType.PLATFORM, x: 400, y: 250, w: 140, h: 20, layerMask: 'MANGA' },

      { id: 'page_ch4', type: EntityType.COLLECTIBLE_PAGE, x: 455, y: 400, w: 30, h: 40, layerMask: 'MANGA' },

      { id: 'shard_2', type: EntityType.COLLECTIBLE_SHARD, x: 550, y: 150, w: 20, h: 20, layerMask: 'BOTH' },
      { id: 'shard_plat', type: EntityType.PLATFORM, x: 530, y: 180, w: 60, h: 20, layerMask: 'BOTH' },

      { id: 'end_g', type: EntityType.PLATFORM, x: 700, y: 500, w: 400, h: 100, layerMask: 'BOTH' },
      { id: 'goal', type: EntityType.GOAL, x: 900, y: 400, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  },
  {
    id: 5,
    name: "第5关：家",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'start', type: EntityType.PLATFORM, x: 0, y: 500, w: 900, h: 100, layerMask: 'BOTH' },
      
      { id: 'step_1', type: EntityType.PLATFORM, x: 200, y: 450, w: 100, h: 20, layerMask: 'BOTH' },
      { id: 'step_2', type: EntityType.PLATFORM, x: 350, y: 400, w: 100, h: 20, layerMask: 'BOTH' },
      { id: 'step_3', type: EntityType.PLATFORM, x: 500, y: 350, w: 100, h: 20, layerMask: 'BOTH' },
      
      { id: 'page_ch5', type: EntityType.COLLECTIBLE_PAGE, x: 650, y: 300, w: 30, h: 40, layerMask: 'MANGA' },
      
      { id: 'house_plat', type: EntityType.PLATFORM, x: 700, y: 400, w: 300, h: 200, layerMask: 'BOTH' },
      { id: 'goal', type: EntityType.GOAL, x: 850, y: 300, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  },
  {
    id: 6,
    name: "终章：Kimo熊的注视",
    playerStart: { x: 50, y: 400 },
    entities: [
      { id: 'floor', type: EntityType.PLATFORM, x: 0, y: 500, w: 2000, h: 100, layerMask: 'BOTH' },
      
      // Easter Egg Texts
      { id: 'txt1', type: EntityType.TEXT, x: 100, y: 350, w: 0, h: 0, layerMask: 'BOTH', text: "【Kimo熊】室李嫁！室李嫁！", color: '#ec4899' },
      { id: 'txt2', type: EntityType.TEXT, x: 450, y: 300, w: 0, h: 0, layerMask: 'MANGA', text: "【Kimo熊】李豆沙：我要和uaua结婚", color: '#60a5fa' },
      { id: 'txt3', type: EntityType.TEXT, x: 950, y: 380, w: 0, h: 0, layerMask: 'REAL', text: "【Kimo熊】我是李室民！", color: '#9ca3af' },
      
      { id: 'txt4', type: EntityType.TEXT, x: 1200, y: 250, w: 0, h: 0, layerMask: 'BOTH', text: "【SC】9999CNY: 请原地结婚", color: '#fbbf24' },

      { id: 'deco1', type: EntityType.PLATFORM, x: 400, y: 450, w: 50, h: 50, layerMask: 'REAL' },
      { id: 'deco2', type: EntityType.PLATFORM, x: 800, y: 400, w: 50, h: 100, layerMask: 'MANGA' },
      
      { id: 'goal', type: EntityType.GOAL, x: 1400, y: 400, w: 60, h: 100, layerMask: 'BOTH' },
    ]
  }
];

// Calculated total of all Page and Shard entities across all levels
export const TOTAL_COLLECTIBLES_COUNT = LEVELS.reduce((total, level) => {
  const levelCount = level.entities.filter(e => 
    e.type === EntityType.COLLECTIBLE_PAGE || 
    e.type === EntityType.COLLECTIBLE_SHARD
  ).length;
  return total + levelCount;
}, 0);

// --- Dialogue Data (Refined with New Game+ "Straightforward" Options) ---
export const EVENTS: Record<string, YuriEvent> = {
  'event_level1': {
    id: 'event_level1',
    requiredPageId: 'page_ch1',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: "（直播事故现场）那个……刚刚我从平台掉下来的时候，样子是不是很蠢？",
        choices: [
          { id: 'c1', text: "假装什么都没发生！", nextNodeId: 'tease' }
        ]
      },
      'tease': {
        id: 'tease',
        speakerName: '室友姐',
        speakerImage: 'https://picsum.photos/seed/novus/200/200?grayscale',
        text: "蠢倒是不蠢。不过你刚刚摔倒的时候，下意识喊了一声我的名字？",
        choices: [
          { id: 'c2_a', text: "（脸红）我那是……喊大家救命！", affectionDelta: { charId: 'novus', amount: 5 }, nextNodeId: 'good_girl' },
          { id: 'c2_b', text: "你听错了！幻听！", affectionDelta: { charId: 'novus', amount: 0 }, nextNodeId: 'deny' },
          // New Game+ Straightforward Option
          { id: 'c2_special', text: "【直球】因为害怕的时候，我只想到了你。", affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'special_reaction_1', requiresClear: true }
        ],
        backgroundStyle: 'MANGA'
      },
      'good_girl': {
        id: 'good_girl',
        speakerName: '室友姐',
        text: "嗯，以后遇到危险，记得喊大声点。我会听见的。",
        choices: [{ id: 'end', text: "（心脏漏跳一拍）……哦。", nextNodeId: 'end_part' }]
      },
      'deny': {
        id: 'deny',
        speakerName: '室友姐',
        text: "是吗？那我下次就算听见了，也当作没听见好了。",
        choices: [{ id: 'end', text: "别！姐！我错了！", nextNodeId: 'end_part' }]
      },
      'special_reaction_1': {
        id: 'special_reaction_1',
        speakerName: '室友姐',
        text: "（愣住，随后耳根微红）……这种话留到下播再说。笨蛋。",
        choices: [{ id: 'end', text: "嘿嘿……", nextNodeId: 'end_part' }]
      },
      'end_part': {
        id: 'end_part',
        speakerName: '李豆沙',
        text: "（可恶，完全被她拿捏了……）",
        choices: [{ id: 'end', text: "……", nextNodeId: null }]
      }
    }
  },
  'event_level2': {
    id: 'event_level2',
    requiredPageId: 'page_ch2',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: "你最近跟其他女主播联动很频繁啊。弹幕都在刷“李豆沙：我要和uaua结婚”。",
        choices: [
          { id: 'c1', text: "那是营业！都是为了节目效果！", nextNodeId: 'possessive' }
        ]
      },
      'possessive': {
        id: 'possessive',
        speakerName: '室友姐',
        text: "营业啊……（凑近）那你现在脸红，也是营业的一部分吗？",
        choices: [
          { id: 'c2', text: "（眼神躲闪）你、你靠太近了……", affectionDelta: { charId: 'novus', amount: 15 }, nextNodeId: 'gaze' }
        ],
        backgroundStyle: 'MANGA'
      },
      'gaze': {
        id: 'gaze',
        speakerName: '室友姐',
        text: "我不喜欢你躲着我的眼神。看着我，豆沙。告诉我是谁陪你去医院打针还用毛绒玩具哄你？",
        choices: [
          { id: 'c3', text: "……是你。", nextNodeId: 'reward' },
          { id: 'c3_special', text: "【直球】是你。只有你会把我当小朋友宠。", affectionDelta: { charId: 'novus', amount: 50 }, nextNodeId: 'reward_special', requiresClear: true }
        ]
      },
      'reward': {
        id: 'reward',
        speakerName: '室友姐',
        text: "知道就好。下次再怕打针，我可不带玩具了。",
        choices: [{ id: 'end', text: "呜……别没收我的玩具！", nextNodeId: null }]
      },
      'reward_special': {
        id: 'reward_special',
        speakerName: '室友姐',
        text: "（轻笑）因为你本来就是个长不大的小朋友。今晚奖励你多抱一会儿那只玩偶。",
        choices: [{ id: 'end', text: "好耶！", nextNodeId: null }]
      }
    }
  },
  'event_level3': {
    id: 'event_level3',
    requiredPageId: 'page_ch3',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: "（拿着吹风机）坐好。头发乱得像鸡窝一样，你是打算这样开摄像头吗？",
        choices: [
          { id: 'c1', text: "我自己会吹……", nextNodeId: 'command' }
        ]
      },
      'command': {
        id: 'command',
        speakerName: '室友姐',
        text: "嘘。别动。",
        choices: [
          { id: 'c2', text: "（立刻不动了）……好。", affectionDelta: { charId: 'novus', amount: 10 }, nextNodeId: 'touch' }
        ],
        backgroundStyle: 'MANGA'
      },
      'touch': {
        id: 'touch',
        speakerName: '室友姐',
        text: "（手指穿过发丝）只有这种时候你才会乖乖听话。像只闯了祸等着被原谅的扁头比格犬。",
        choices: [{ id: 'end', text: "我才不是狗！……那个，再吹一会儿也可以。", nextNodeId: 'end_part' }]
      },
      'end_part': {
        id: 'end_part',
        speakerName: '李豆沙',
        text: "（其实……还挺舒服的。）",
        choices: [{ id: 'end', text: "汪……啊不是！", nextNodeId: null }]
      }
    }
  },
  'event_level4': {
    id: 'event_level4',
    requiredPageId: 'page_ch4',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '室友姐',
        text: "那箱快递有点重，但我现在腾不出手……豆沙，帮我搬一下？",
        choices: [
          { id: 'c1', text: "不想动……除非有奖励。", nextNodeId: 'bargain' }
        ]
      },
      'bargain': {
        id: 'bargain',
        speakerName: '室友姐',
        text: "奖励？（挑眉）允许你买那套绝版的百合漫画全集，外加一句“谢谢李老师”，够吗？",
        choices: [
          { id: 'c2', text: "什么！？那套我在中古店看了好久的……", affectionDelta: { charId: 'novus', amount: 20 }, nextNodeId: 'deal' }
        ],
        backgroundStyle: 'MANGA'
      },
      'deal': {
        id: 'deal',
        speakerName: '室友姐',
        text: "对，就是那套。你不是为了看那个茶饭不思吗？",
        choices: [
          { id: 'end', text: "搬！我搬！我这就去！", nextNodeId: 'end_part' }
        ]
      },
      'end_part': {
        id: 'end_part',
        speakerName: '李豆沙',
        text: "（那是我的精神食粮！为了百合漫，这点苦力算什么！）",
        choices: [{ id: 'end', text: "充满力量！", nextNodeId: null }]
      }
    }
  },
  'event_level5': {
    id: 'event_level5',
    requiredPageId: 'page_ch5',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: "（关卡尽头）如果……我是说如果，我想一直住在这里，赖着不走呢？",
        choices: [
          { id: 'c1', text: "试探性地问。", nextNodeId: 'answer' }
        ]
      },
      'answer': {
        id: 'answer',
        speakerName: '室友姐',
        text: "我什么时候赶你走过吗？还是说，你在期待我开口留你？",
        choices: [
          { id: 'c2', text: "我就是想听你说你需要我！", affectionDelta: { charId: 'novus', amount: 30 }, nextNodeId: 'pull' },
          { id: 'c2_special', text: "【直球】哪怕你赶我走，我也要赖着你一辈子。", affectionDelta: { charId: 'novus', amount: 100 }, nextNodeId: 'pull_special', requiresClear: true }
        ],
        backgroundStyle: 'MANGA'
      },
      'pull': {
        id: 'pull',
        speakerName: '室友姐',
        text: "（轻笑）真坦诚。那就留下来吧。反正除了我，也没人受得了你这种麻烦的小鬼了。",
        choices: [
          { id: 'c3', text: "这是表白吗？这一定是表白吧！", nextNodeId: 'end_game' }
        ]
      },
      'pull_special': {
        id: 'pull_special',
        speakerName: '室友姐',
        text: "……（长时间的沉默，随后轻轻抱住）求之不得。笨蛋豆沙。",
        choices: [
          { id: 'c3', text: "嘿嘿……最喜欢你了。", nextNodeId: 'end_game' }
        ]
      },
      'end_game': {
        id: 'end_game',
        speakerName: '室友姐',
        text: "理解成什么样是你的自由。……欢迎回家，豆沙。",
        choices: [{ id: 'end', text: "我回来了！", nextNodeId: null }]
      }
    }
  },
  'event_level6': {
    id: 'event_level6',
    requiredPageId: 'none',
    startNodeId: 'start',
    nodes: {
      'start': {
        id: 'start',
        speakerName: '李豆沙',
        text: "（看着满屏的Kimo熊弹幕）“室李嫁”……“我是李室民”……",
        choices: [
          { id: 'c1', text: "这群Kimo熊又在乱嗑了！", nextNodeId: 'future' }
        ]
      },
      'future': {
        id: 'future',
        speakerName: '室友姐',
        text: "你看那条，“你生气了我不敢说，你原谅我之后更不敢说”。",
        choices: [
          { id: 'c1', text: "……那是他们乱说的！我有家庭地位的！", nextNodeId: 'end' }
        ]
      },
      'end': {
        id: 'end',
        speakerName: '室友姐',
        text: "是吗？那今晚的碗也归有地位的人洗？",
        choices: [{ id: 'fin', text: "……洗就洗！为了室守星沙！", nextNodeId: null }]
      }
    }
  }
};
