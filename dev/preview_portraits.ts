import { portrait, ALL_FACES } from '../game2d/portraits';
export default (out: HTMLElement, row: (t: string) => HTMLElement, add: (r: HTMLElement, c: HTMLCanvasElement, s?: number) => void) => {
  for (const who of ['dousha', 'novus', 'kimo'] as const) {
    const r = row(who);
    for (const f of ALL_FACES) add(r, portrait(who, f), 2);
  }
  const r = row('ink');
  for (const who of ['dousha', 'novus', 'kimo'] as const) add(r, portrait(who, 'smile', true), 2);
};
