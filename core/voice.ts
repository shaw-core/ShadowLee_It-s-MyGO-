// ============================================================
// 悠亚咏唱识别（Web Speech API）
// "悠亚"是名字，识别引擎常转写成同音词（优雅/幽雅/有啊/呦亚…），
// 因此用同音字类模糊匹配：同一句里出现 you-ya 音节对 且 含"结婚"即算一次咏唱。
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';

const YOUYA = /[悠优幽呦游由油有右又哟幼柚佑youYU][亚雅呀压鸭丫哑娅芽阿啊吖噢哦aA]/g;

/** 返回本句计入的咏唱次数（0~3） */
export const matchChant = (raw: string): number => {
  const txt = raw.replace(/[\s，,。.！!？?、~～]/g, '');
  const pairs = (txt.match(YOUYA) ?? []).length;
  if (!/结婚|皆婚|结昏/.test(txt) || pairs < 1) return 0;
  return Math.max(1, Math.min(3, Math.floor(pairs / 2)));
};

export const speechSupported = () =>
  typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export interface ChantState {
  on: boolean;
  count: number;
  heard: string;
  error: string;
  toggle: () => void;
  stop: () => void;
}

/** 喊满三声时调用 onComplete；计数随即归零 */
export const useChant = (onComplete: () => void): ChantState => {
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const onRef = useRef(false);
  const recRef = useRef<any>(null);
  const countRef = useRef(0);
  const cbRef = useRef(onComplete);
  const heardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { cbRef.current = onComplete; }, [onComplete]);

  const stop = useCallback(() => {
    onRef.current = false;
    setOn(false);
    try { recRef.current?.stop(); } catch { /* ignore */ }
    recRef.current = null;
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('当前浏览器不支持语音识别（推荐 Chrome / Edge）'); return; }
    try {
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev: any) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (!r.isFinal) continue;
          const txt = String(r[0]?.transcript ?? '').trim();
          if (txt) {
            setHeard(txt.slice(-24));
            if (heardTimer.current) clearTimeout(heardTimer.current);
            heardTimer.current = setTimeout(() => setHeard(''), 3000);
          }
          const hits = matchChant(txt);
          if (hits > 0) {
            countRef.current += hits;
            setCount(Math.min(3, countRef.current));
            if (countRef.current >= 3) {
              countRef.current = 0;
              setCount(0);
              cbRef.current();
            }
          }
        }
      };
      rec.onend = () => { if (onRef.current) { try { rec.start(); } catch { /* ignore */ } } };
      rec.onerror = (ev: any) => {
        if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
          setError('麦克风权限被拒绝，无法咏唱');
          onRef.current = false; setOn(false);
        }
      };
      rec.start();
      recRef.current = rec;
      onRef.current = true;
      setOn(true);
      setError('');
    } catch { setError('麦克风启动失败'); }
  }, []);

  const toggle = useCallback(() => { if (onRef.current) stop(); else start(); }, [start, stop]);

  useEffect(() => () => {
    onRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { on, count, heard, error, toggle, stop };
};
