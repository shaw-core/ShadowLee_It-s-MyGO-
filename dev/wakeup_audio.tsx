// 开发 / 试听：把《快醒醒！》的背景声按真实时间轴离线渲染成 WAV（不含歌曲片段）
import { WakeupSound } from '../components/wakeupAudio';
import { WAKEUP_LINES, WAKEUP_TOTAL } from '../components/UauaWakeupCutscene';
const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const SR = 44100, TOTAL = WAKEUP_TOTAL, FADE_OUT_AT = TOTAL - 1.6, SNIP_AT = 15.2, SNIP_LEN = 3.6, vol = 0.9 * 0.45;
(async () => {
  const c = new OfflineAudioContext(2, Math.ceil(SR * (TOTAL + 2)), SR);
  const out = c.createGain(); out.connect(c.destination);
  // 镜头 A（与组件里相同）
  const o = c.createOscillator(); o.frequency.setValueAtTime(120, 0); o.frequency.exponentialRampToValueAtTime(42, 3.6);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.18 * vol, 0.6); g.gain.exponentialRampToValueAtTime(0.0001, 4.2);
  o.connect(g); g.connect(out); o.start(0); o.stop(4.4);
  const snd = new WakeupSound(c, out, vol);
  snd.startDream(TOTAL + 2);
  let called = -1;
  for (let t = 0; t < TOTAL; t += 0.25) {
    const li = WAKEUP_LINES.findIndex(l => t >= l.at && t < l.at + l.dur);
    if (li > called) { called = li; if (WAKEUP_LINES[li].who === '？？？') snd.call(WAKEUP_LINES[li].t, WAKEUP_LINES[li].at); }
    const speaking = li >= 0 && WAKEUP_LINES[li].who === '？？？';
    const snip = t > SNIP_AT && t < SNIP_AT + SNIP_LEN + 0.5;
    const k = smooth(2.8, 7.5, t) * (1 + 0.3 * smooth(43.8, 46.6, t) * (1 - smooth(47, 49, t)) + 0.25 * smooth(58.4, 60.8, t)) * (speaking ? 0.7 : 1) * (snip ? 0.6 : 1) * (1 - smooth(FADE_OUT_AT, TOTAL, t));
    snd.setDream(k, t);
  }
  const buf = await c.startRendering();
  // 16-bit WAV
  const n = buf.length, ch = 2, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, SR, true); data.setUint32(28, SR * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); ws(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1); let peak = 0;
  for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const v = (k ? R : L)[i]; peak = Math.max(peak, Math.abs(v)); data.setInt16(44 + (i * 2 + k) * 2, Math.max(-1, Math.min(1, v)) * 32767, true); }
  const bytes = new Uint8Array(data.buffer); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  (window as any).__wav = btoa(bin); (window as any).__peak = peak; (window as any).__calls = snd.calls;
  document.body.textContent = `done peak=${peak.toFixed(3)} calls=${snd.calls}`;
})();
