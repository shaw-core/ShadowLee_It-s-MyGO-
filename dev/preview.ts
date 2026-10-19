import { getSprites } from '../game2d/sprites';
const out = document.getElementById('out')!;
const row = (title: string) => { const d = document.createElement('div'); d.className='row'; d.innerHTML=`<b style="width:80px">${title}</b>`; out.appendChild(d); return d; };
const add = (r: HTMLElement, c: HTMLCanvasElement, s = 5) => { const x = document.createElement('canvas'); x.width=c.width*s; x.height=c.height*s; const g=x.getContext('2d')!; g.imageSmoothingEnabled=false; g.drawImage(c,0,0,x.width,x.height); r.appendChild(x); };
const mode = new URLSearchParams(location.search).get('m') ?? 'sprites';
(async () => {
  if (mode === 'sprites') {
    for (const who of ['dousha','novus'] as const) for (const ink of [false,true]) {
      const s = getSprites(who, ink); const r = row(who+(ink?' ink':''));
      for (const a of ['idle','run','jump','fall','land','blink'] as const) s.frames[a].forEach(f => add(r, f[0]));
      add(r, s.frames.run[0][1]);
    }
  } else {
    const mod = await import('./preview_' + mode + '.ts');
    mod.default(out, row, add);
  }
  (window as any).__ready = true;
})();
