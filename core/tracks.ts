// ============================================================
// 原创配乐曲目表（每个场景一首）
// 旋律写法：每小节 8 个八分音符；「-」延长上一个音，「.」休止，「e5,d5」把一个八分拆成两个十六分
// 第一章：8bit 方波 / 三角波（漫画的世界）
// 第二章：钟琴、拨弦、长音垫和大混响（多出来的一维，空气感）
// ============================================================
import { TrackDef } from './synth';

const T: TrackDef[] = [
  // ---------------- 标题：晚安电台 ----------------
  {
    id: 'title', title: '晚安电台', bpm: 84, swing: 0.16, space: 0.7,
    chords: ['Fmaj7', 'Em7 A7', 'Dm7', 'Cm7 F7', 'Bbmaj7', 'Am7 D7', 'Gm7', 'C7sus4 C7'],
    lead: {
      inst: 'pulse', vol: 0.42, bars: [
        '. a4 c5 e5 - d5 c5 a4',
        'g4 - - . e5 d5 c#5 a4',
        'd5 - f5 - a5 - g5 f5',
        'eb5 - d5 c5 - a4 . .',
        'd5 - c5 a4 - f4 g4 a4',
        'c5 - - e5 - f#5 a5 -',
        'g5 - f5 d5 - bb4 a4 g4',
        'f4 - g4 - - e4 . .',
      ],
    },
    arp: { inst: 'epiano', style: 'off8', vol: 0.34, oct: 0 },
    bass: { inst: 'softbass', style: 'rootFifth', vol: 0.5 },
    drums: { kick2: 'x......x..x.....', rim: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo', crackle: 'x...x...x...x...', vol: 0.5 },
  },

  // ---------------- 第一章 · 1 房间：直播开始前 ----------------
  {
    id: 'c1_1', title: '直播开始前', bpm: 120, space: 0.35,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm7', 'G7', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    lead: {
      inst: 'pulse', vol: 0.5, bars: [
        'e5 . g5 . c6 - b5 g5',
        'a5 - e5 - c5 . e5 .',
        'f5 . a5 . c6 - a5 f5',
        'g5 - - . d5 . b4 .',
        'e5 . g5 . c6 - d6 e6',
        'c6 - a5 - e5 . a5 .',
        'f5 - e5 d5 - c5 a4 .',
        'b4 - d5 - g5 - - .',
        'a5 . a5 g5 a5 - c6 -',
        'b5 . b5 a5 g5 - d5 -',
        'e5 . g5 - b5 - g5 e5',
        'a5 - - . c6 - b5 a5',
        'f5 . a5 . c6 - f6 -',
        'd6 - b5 - g5 - d5 -',
        'e5 . g5 . e5 . c5 .',
        'c5 - - - . . . .',
      ],
    },
    arp: { inst: 'chipArp', style: 'up16', vol: 0.3, oct: 0 },
    bass: { inst: 'tri', style: 'octave', vol: 0.55 },
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', fill: { snare: '....x.....x.xxxx' }, vol: 0.55 },
  },

  // ---------------- 第一章 · 2 黄昏的街：路灯一盏一盏亮起来 ----------------
  {
    id: 'c1_2', title: '黄昏的路灯', bpm: 108, swing: 0.1, space: 0.4,
    chords: ['Ebmaj7', 'Dm7', 'Cm7', 'F7', 'Ebmaj7', 'Dm7 G7', 'Cm7', 'F7sus4 F7',
      'Gm7', 'Cm7 F7', 'Bbmaj7', 'Ebmaj7', 'Am7 D7', 'Gm7', 'Cm7', 'F7'],
    lead: {
      inst: 'pulse', vol: 0.48, bars: [
        'bb4 - d5 - g5 - f5 d5',
        'f5 - - . c5 d5 f5 a5',
        'g5 - - eb5 - c5 bb4 g4',
        'a4 - c5 - eb5 - d5 c5',
        'bb4 - d5 - g5 - bb5 a5',
        'f5 - d5 - b4 - d5 f5',
        'eb5 - d5 c5 - bb4 g4 bb4',
        'c5 - - - bb4 - a4 .',
        'd5 . f5 . bb5 - a5 g5',
        'g5 - eb5 - a5 - f5 eb5',
        'd5 - f5 - a5 - c6 -',
        'bb5 - g5 - - . d5 eb5',
        'e5 - g5 - f#5 - a5 c6',
        'bb5 - - a5 g5 - d5 -',
        'eb5 - g5 - c6 - bb5 g5',
        'a5 - - - f5 - eb5 c5',
      ],
    },
    arp: { inst: 'square', style: 'off8', vol: 0.22, oct: 0 },
    bass: { inst: 'tri', style: 'octave', vol: 0.55 },
    drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', fill: { snare: '....x.......x.xx' }, vol: 0.5 },
  },

  // ---------------- 第一章 · 3 深夜公寓：隔墙的吹风机 ----------------
  {
    id: 'c1_3', title: '隔墙的吹风机', bpm: 92, space: 0.55,
    chords: ['Dm', 'Bbmaj7', 'Gm7', 'A7', 'Dm', 'Bbmaj7', 'Gm7', 'A7sus4 A7'],
    lead: {
      inst: 'pulse', vol: 0.42, bars: [
        'd5 - - . f5 - e5 d5',
        'a4 - - - . . . .',
        'bb4 - d5 - f5 - e5 d5',
        'c#5 - - - e5 - . .',
        'a5 - - g5 f5 - e5 d5',
        'f5 - - - d5 - . .',
        'g5 - f5 e5 d5 - bb4 -',
        'a4 - - - . . c#5 .',
      ],
    },
    arp: { inst: 'chipArp', style: 'up8', vol: 0.22, oct: 1 },
    bass: { inst: 'tri', style: 'half', vol: 0.5 },
    drums: { kick: 'x.........x.....', rim: '....x.......x..o', shaker: '..o...o...o...o.', vol: 0.45 },
  },

  // ---------------- 第一章 · 4 快递站：传送带不停 ----------------
  {
    id: 'c1_4', title: '传送带不停', bpm: 132, space: 0.3,
    chords: ['G', 'F', 'C', 'G', 'G', 'F', 'C', 'D'],
    lead: {
      inst: 'pulse', vol: 0.48, bars: [
        'g5 g5 . d5 g5 . a5 b5',
        'c6 - a5 f5 - c5 . f5',
        'e5 e5 . c5 e5 . g5 a5',
        'b5 - - . d6 - b5 .',
        'g5 g5 . d5 g5 . a5 b5',
        'c6 - a5 f5 - a5 c6 d6',
        'e6 - d6 c6 - g5 . e5',
        'f#5 - a5 - d6 - - .',
      ],
    },
    arp: { inst: 'chipArp', style: 'up16', vol: 0.26, oct: 0 },
    bass: { inst: 'tri', style: 'root8', vol: 0.55 },
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'oxoxoxoxoxoxoxox', fill: { snare: '....x...x.x.xxxx' }, vol: 0.5 },
  },

  // ---------------- 第一章 · 5 回家的路：萤火虫 ----------------
  {
    id: 'c1_5', title: '萤火虫回家', bpm: 98, space: 0.55,
    chords: ['A', 'E/G#', 'F#m', 'E', 'D', 'A/C#', 'Bm7', 'E7sus4 E7'],
    lead: {
      inst: 'pulse', vol: 0.44, bars: [
        'c#5 - e5 - a5 - - g#5',
        'b5 - - - g#5 - e5 -',
        'a5 - c#6 - b5 a5 f#5 -',
        'g#5 - - - . . e5 f#5',
        'f#5 - a5 - d6 - c#6 b5',
        'c#6 - - - a5 - e5 -',
        'd5 - f#5 - a5 - b5 a5',
        'a5 - - g#5 - - . .',
      ],
    },
    arp: { inst: 'chipArp', style: 'updown8', vol: 0.24, oct: 1 },
    bass: { inst: 'tri', style: 'rootFifth', vol: 0.5 },
    drums: { kick: 'x.......x.......', hat: '..x...x...x...x.', shaker: 'o.o.o.o.o.o.o.o.', vol: 0.45 },
  },

  // ---------------- 第一章 · 6 弹幕：流星雨 ----------------
  {
    id: 'c1_6', title: '弹幕流星雨', bpm: 148, space: 0.3,
    chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'],
    lead: {
      inst: 'pulse', vol: 0.48, bars: [
        'e5 . e5 g5 . b5 . e6',
        'd6 . c6 . b5 . g5 .',
        'b5 . b5 d6 . g6 . f#6',
        'e6 - d6 - a5 - f#5 -',
        'e5 . e5 g5 . b5 . e6',
        'g6 - f#6 e6 - d6 c6 -',
        'c6 - b5 a5 - e5 a5 c6',
        'd#6 - - - f#6 - b5 -',
      ],
    },
    arp: { inst: 'chipArp', style: 'up16', vol: 0.28, oct: 0 },
    bass: { inst: 'tri', style: 'octave', vol: 0.58 },
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ohat: '..o...o...o...o.', fill: { snare: '....x.x.x.xxxxxx' }, vol: 0.52 },
  },

  // ---------------- 第一章 · 7 天台：门前的风 ----------------
  {
    id: 'c1_7', title: '门前的风', bpm: 82, space: 0.65,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E7', 'F', 'G', 'Em7', 'Am', 'Dm7', 'G', 'C', 'C'],
    lead: {
      inst: 'pulse', vol: 0.44, bars: [
        'e5 - - - c5 - d5 e5',
        'f5 - - - e5 - c5 a4',
        'g4 - - - c5 - d5 e5',
        'd5 - - - . . . .',
        'e5 - - - c5 - d5 e5',
        'a5 - - - g5 - f5 e5',
        'e5 - - - d5 - c5 d5',
        'b4 - - - g#4 - . .',
        'c5 - f5 - a5 - g5 f5',
        'g5 - - - d5 - e5 f5',
        'g5 - - - b5 - a5 g5',
        'e5 - - - . . c5 d5',
        'f5 - - - a5 - c6 -',
        'b5 - - - g5 - d5 -',
        'c6 - - - b5 - g5 e5',
        'c5 - - - - - . .',
      ],
    },
    arp: { inst: 'piano', style: 'broken8', vol: 0.36, oct: 0 },
    bass: { inst: 'tri', style: 'long', vol: 0.45 },
    drums: { from: 8, kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', vol: 0.45 },
  },

  // ---------------- 第二章 · 1 多出来的一维 ----------------
  {
    id: 'c2_1', title: '多出来的一维', bpm: 100, space: 1,
    chords: ['Dmaj7', 'E/D', 'Bm7', 'Gmaj7', 'Dmaj7', 'E/D', 'F#m7', 'Gmaj7 A'],
    lead: {
      inst: 'bell', vol: 0.5, bars: [
        'f#5 - a5 - c#6 - - a5',
        'g#5 - - - b5 - e5 -',
        'd6 - c#6 - b5 - f#5 -',
        'a5 - - - . . f#5 g5',
        'a5 - f#5 - c#6 - e6 -',
        'd6 - b5 - g#5 - e5 -',
        'a5 - c#6 - e6 - c#6 -',
        'b5 - - - a5 - - .',
      ],
    },
    pad: { inst: 'pad', vol: 0.35 },
    arp: { inst: 'pluck', style: 'updown8', vol: 0.3, oct: -1 },
    bass: { inst: 'sub', style: 'long', vol: 0.5 },
    drums: { kick2: 'x.......x.......', shaker: '..o...o...o...o.', vol: 0.45 },
  },

  // ---------------- 第二章 · 2 空中回廊（远处是那条街） ----------------
  {
    id: 'c2_2', title: '远处的那条街', bpm: 92, swing: 0.12, space: 0.9,
    chords: ['Cmaj7', 'Bm7', 'Am7', 'D', 'Cmaj7', 'Bm7 E7', 'Am7', 'D7sus4'],
    lead: {
      inst: 'flute', vol: 0.5, bars: [
        'e5 - g5 - b5 - - a5',
        'f#5 - - - d5 - b4 -',
        'c5 - e5 - a5 - g5 e5',
        'f#5 - - - . . d5 e5',
        'g5 - e5 - b5 - c6 b5',
        'a5 - f#5 - g#5 - b5 -',
        'c6 - b5 a5 - e5 - g5',
        'g5 - - - f#5 - - .',
      ],
    },
    pad: { inst: 'pad', vol: 0.25 },
    arp: { inst: 'epiano', style: 'broken8', vol: 0.34, oct: 0 },
    bass: { inst: 'softbass', style: 'rootFifth', vol: 0.5 },
    drums: { kick2: 'x.....x...x.....', rim: '....x.......x...', shaker: '..o...o...o...o.', vol: 0.45 },
  },

  // ---------------- 第二章 · 3 线框断层塔 ----------------
  {
    id: 'c2_3', title: '断层塔', bpm: 96, space: 1,
    chords: ['Am9', 'Fmaj7', 'Dm9', 'Em7', 'Am9', 'Fmaj7', 'Dm7', 'E7sus4 E7'],
    lead: {
      inst: 'pluck', vol: 0.55, bars: [
        'e5 . b5 . c6 - b5 .',
        'a5 - - . e5 - c5 .',
        'f5 . e6 . d6 - a5 .',
        'g5 - - - b5 - - .',
        'e5 . b5 . c6 - e6 .',
        'd6 - c6 - a5 - e5 .',
        'f5 - a5 - c6 - d6 c6',
        'b5 - - - g#5 - - .',
      ],
    },
    pad: { inst: 'pad', vol: 0.3 },
    arp: { inst: 'bell', style: 'up16', vol: 0.16, oct: 1 },
    bass: { inst: 'sub', style: 'synco', vol: 0.5 },
    drums: { kick2: 'x.........x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', vol: 0.4 },
  },

  // ---------------- 第二章 · 4 云端跳线（傍晚的风） ----------------
  {
    id: 'c2_4', title: '傍晚的风', bpm: 112, space: 0.8,
    chords: ['Bbmaj7', 'C/Bb', 'Am7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'F7'],
    lead: {
      inst: 'saw', vol: 0.45, bars: [
        'd5 - f5 - a5 - c6 a5',
        'g5 - - - e5 - c5 -',
        'e5 - g5 - c6 - a5 g5',
        'f5 - - - . . a5 c6',
        'bb5 - a5 - g5 - f5 d5',
        'e5 - - - g5 - bb5 -',
        'a5 - c6 - e6 - c6 a5',
        'f5 - - - . . . .',
      ],
    },
    pad: { inst: 'pad', vol: 0.22 },
    arp: { inst: 'pluck', style: 'up16', vol: 0.22, oct: 0 },
    bass: { inst: 'softbass', style: 'synco', vol: 0.55 },
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..o...o...o...o.', shaker: 'oooooooooooooooo', vol: 0.45 },
  },

  // ---------------- 第二章 · 5 世界的接缝 ----------------
  {
    id: 'c2_5', title: '世界的接缝', bpm: 88, space: 1,
    chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D/F#', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'G'],
    lead: {
      inst: 'bell', vol: 0.5, until: 8, bars: [
        'b4 - - - e5 - g5 -',
        'g5 - - - e5 - - -',
        'd5 - - - g5 - b5 -',
        'a5 - - - f#5 - - -',
        'b5 - - - g5 - e5 -',
        'e5 - - - g5 - c6 -',
        'b5 - - - d6 - b5 -',
        'a5 - - - - - . .',
        '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .',
        '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .',
      ],
    },
    lead2: {
      inst: 'saw', vol: 0.48, from: 8, bars: [
        '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .',
        '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .',
        'e6 - - - d6 - c6 -',
        'd6 - - - a5 - f#5 -',
        'd6 - - - f#6 - e6 d6',
        'e6 - - - b5 - - .',
        'c6 - d6 - e6 - g6 -',
        'f#6 - - - e6 - d6 -',
        'd6 - - - b5 - g5 -',
        'g5 - - - - - . .',
      ],
    },
    pad: { inst: 'pad', vol: 0.36 },
    arp: { inst: 'pluck', style: 'up8', vol: 0.24, oct: 0, from: 4 },
    bass: { inst: 'sub', style: 'long', vol: 0.55 },
    drums: { from: 8, kick2: 'x.......x.......', snare: '........x.......', hat: '..o...o...o...o.', vol: 0.5 },
  },

  // ---------------- 漫画分镜（第一章：八音盒） ----------------
  {
    id: 'manga', title: '分镜', bpm: 76, space: 0.8,
    chords: ['C', 'G/B', 'Am', 'Em/G', 'F', 'C/E', 'Dm7', 'G7'],
    lead: {
      inst: 'musicbox', vol: 0.95, bars: [
        'g5 - e5 - c6 - - g5',
        'd6 - - - b5 - g5 -',
        'c6 - a5 - e6 - - c6',
        'b5 - - - g5 - - -',
        'a5 - f5 - c6 - a5 -',
        'g5 - e5 - c6 - - e6',
        'd6 - c6 - a5 - f5 -',
        'g5 - - - b5 - d6 -',
      ],
    },
    pad: { inst: 'pad', vol: 0.34 },
    arp: { inst: 'musicbox', style: 'up8', vol: 0.34, oct: 0 },
  },

  // ---------------- 漫画分镜（第二章：3D 页，钟琴 + 长音） ----------------
  {
    id: 'manga3d', title: '另一面的分镜', bpm: 76, space: 1,
    chords: ['C', 'G/B', 'Am', 'Em/G', 'F', 'C/E', 'Dm7', 'G7'],
    lead: {
      inst: 'bell', vol: 0.45, bars: [
        'g5 - e5 - c6 - - g5',
        'd6 - - - b5 - g5 -',
        'c6 - a5 - e6 - - c6',
        'b5 - - - g5 - - -',
        'a5 - f5 - c6 - a5 -',
        'g5 - e5 - c6 - - e6',
        'd6 - c6 - a5 - f5 -',
        'g5 - - - b5 - d6 -',
      ],
    },
    pad: { inst: 'pad', vol: 0.32 },
    arp: { inst: 'pluck', style: 'updown8', vol: 0.18, oct: -1 },
    bass: { inst: 'sub', style: 'long', vol: 0.35 },
  },

  // ---------------- 尾声：门的另一边 ----------------
  {
    id: 'ending', title: '门的另一边', bpm: 72, space: 0.9,
    chords: ['Fmaj7', 'C/E', 'Dm7', 'Bbmaj7', 'Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
    lead: {
      inst: 'piano', vol: 0.55, bars: [
        'a5 - - - c6 - e6 -',
        'g5 - - - e5 - g5 c6',
        'a5 - - - f5 - d5 -',
        'd5 - f5 - a5 - - -',
        'bb5 - - - a5 - g5 -',
        'e5 - - - g5 - bb5 -',
        'a5 - - - g5 - f5 -',
        'f5 - - - - - . .',
      ],
    },
    pad: { inst: 'pad', vol: 0.3 },
    arp: { inst: 'piano', style: 'broken8', vol: 0.3, oct: -1 },
    bass: { inst: 'sub', style: 'long', vol: 0.35 },
  },
];

export const TRACKS: Record<string, TrackDef> = Object.fromEntries(T.map(t => [t.id, t]));
export const TRACK_LIST = T;
