// 剧情结构回归：枚举所有场景的所有分支路线，检查跳转目标存在，并输出结构签名（不含台词文字）
// 用法：npx esbuild docs/qa/routes.ts --bundle --platform=node --outfile=/tmp/routes.cjs && node /tmp/routes.cjs
import { CH1_SCENES } from '../../story/chapter1';
import { CH2_SCENES } from '../../story/chapter2';
const all = { ...CH1_SCENES, ...CH2_SCENES };
let routes = 0, bad: string[] = [];
const sig: string[] = [];
for (const [id, sc] of Object.entries(all)) {
  for (const [nid, n] of Object.entries(sc.nodes)) {
    sig.push(`${id}.${nid} lines=${n.lines.length} next=${n.next ?? '-'} ch=[${(n.choices ?? []).map(c => `${c.next}|${c.aff ?? 0}|${c.ng ? 'ng' : ''}`).join(',')}]`);
    for (const c of n.choices ?? []) if (c.next !== null && !sc.nodes[c.next]) bad.push(`${id}.${nid} -> ${c.next}`);
    if (n.next && !sc.nodes[n.next]) bad.push(`${id}.${nid} -> ${n.next}`);
  }
  for (const ng of [false, true]) {
    const walk = (nid: string | null | undefined, seen: Set<string>) => {
      if (!nid) { routes++; return; }
      if (seen.has(nid)) { bad.push(`${id} loop at ${nid}`); return; }
      const n = sc.nodes[nid]; if (!n) return;
      const s2 = new Set(seen); s2.add(nid);
      const ch = (n.choices ?? []).filter(c => ng || !c.ng);
      if (ch.length) ch.forEach(c => walk(c.next, s2)); else walk(n.next, s2);
    };
    walk(sc.start, new Set());
  }
}
console.log(JSON.stringify({ scenes: Object.keys(all).length, nodes: sig.length, routes, bad }));
if (process.argv[2]) require('fs').writeFileSync(process.argv[2], sig.join('\n') + '\n');
