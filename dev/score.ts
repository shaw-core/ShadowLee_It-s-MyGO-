// 开发用：把配乐离线渲染成 WAV，检查响度和听感
import { compile, isChip, makeImpulse, Outs, playDrum, playNote, skipOnLoop } from '../core/synth';
import { TRACKS } from '../core/tracks';

const render = async (id: string, secs: number, sr = 32000) => {
  const def = TRACKS[id];
  const comp = compile(def);
  const c = new OfflineAudioContext(2, Math.floor(secs * sr), sr);
  const bus = c.createGain();
  const cmp = c.createDynamicsCompressor(); cmp.threshold.value = -14; cmp.ratio.value = 3; cmp.attack.value = 0.01; cmp.release.value = 0.2;
  const out = c.createGain(); out.gain.value = 0.9 * 0.45 * 1.4;
  bus.connect(cmp); cmp.connect(out); out.connect(c.destination);
  const verbIn = c.createGain(); const verb = c.createConvolver(); verb.buffer = makeImpulse(c, 2.6, 2.8);
  const vo = c.createGain(); vo.gain.value = 0.9; verbIn.connect(verb); verb.connect(vo); vo.connect(bus);
  const delayIn = c.createGain(); const dl = c.createDelay(1.5); dl.delayTime.value = (60 / def.bpm) * 0.75;
  const fb = c.createGain(); fb.gain.value = 0.32; const dlf = c.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
  delayIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(bus);
  const outs: Outs = { dry: bus, verb: verbIn, delay: delayIn };
  const stepDur = 60 / def.bpm / 4;
  const space = def.space ?? 0.6, chip = isChip(def);
  for (let step = 0, t = 0.05; t < secs - 0.5; step++, t += stepDur) {
    const idx = step % comp.steps.length;
    const loop = Math.floor(step / comp.steps.length);
    const sw = (idx % 4 === 2 ? (def.swing ?? 0) : 0) * stepDur;
    for (const e of comp.steps[idx]) {
      if (skipOnLoop(loop, e, comp.bars)) continue;
      if (e.kind === 'note') playNote(c, outs, e.inst as any, e.midi, t + sw, e.dur * stepDur, e.vel, space);
      else playDrum(c, outs, e.inst as any, t + sw, e.vel, chip, space);
    }
  }
  const buf = await c.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0, sum = 0;
  for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); peak = Math.max(peak, v); sum += L[i] * L[i]; }
  const rms = Math.sqrt(sum / L.length);
  // 16-bit WAV
  const n = L.length, data = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, 2, true); data.setUint32(24, sr, true); data.setUint32(28, sr * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  const bytes = new Uint8Array(data.buffer);
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { peak, rms, wav: btoa(bin) };
};
(window as any).__render = render;
