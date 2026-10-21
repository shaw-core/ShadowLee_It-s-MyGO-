# 隐藏档案馆 · 可达性检查：用游戏里真正的碰撞数据（可走区域 + 方盒 + 圆形碰撞 + 记录点）
# 在 0.2 m 的格子上做广度优先搜索，确认从出生点能走到每一个记录点的交互范围，没有死路。
# 另外用真实键盘输入走几段路，确认移动和碰撞代码本身工作正常。
# 用法：python3 docs/qa/archive_reach.py [url]
import asyncio, json, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/dev/matrix.html?direct"
BFS = """() => {
  const a = window.__arc; const H = 0.2, PR = 0.3;
  const blocked = (x, z) => {
    if (!a.walkable(x, z)) return true;
    for (const s of a.stations) if (Math.hypot(x - s.pos.x, z - s.pos.z) < s.radius) return true;
    for (const c of a.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
    for (const b of a.boxes) { const c = Math.cos(b.yaw), sn = Math.sin(b.yaw), dx = x - b.x, dz = z - b.z;
      if (Math.abs(dx * c - dz * sn) < b.hw + PR && Math.abs(dx * sn + dz * c) < b.hd + PR) return true; }
    return false;
  };
  const x0 = -16, x1 = 13, z0 = -52, z1 = 45, W = Math.round((x1 - x0) / H), D = Math.round((z1 - z0) / H);
  const seen = new Uint8Array(W * D); const q = [];
  const sx = Math.round((a.P.x - x0) / H), sz = Math.round((a.P.z - z0) / H);
  seen[sz * W + sx] = 1; q.push(sx, sz); let n = 0;
  while (q.length) { const z = q.pop(), x = q.pop(); n++;
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      const k = nz * W + nx; if (seen[k]) continue; if (blocked(x0 + nx * H, z0 + nz * H)) continue; seen[k] = 1; q.push(nx, nz); } }
  const out = {};
  for (const s of a.stations) { let best = 1e9;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (seen[z * W + x]) { const d = Math.hypot(x0 + x * H - s.pos.x, z0 + z * H - s.pos.z) - s.radius; if (d < best) best = d; }
    out[s.name] = +best.toFixed(2); }
  return JSON.stringify({ reachableCells: n, nearestDistanceToEachStation: out });
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        await pg.goto(URL); await pg.wait_for_timeout(5500)
        r = json.loads(await pg.evaluate(BFS))
        bad = {k: v for k, v in r["nearestDistanceToEachStation"].items() if v >= 3.2}
        print(json.dumps(r, ensure_ascii=False))
        print("ALL STATIONS REACHABLE (interaction range < 3.2 m)" if not bad else f"UNREACHABLE: {bad}")
        # 真实键盘：按住 W 走 3 秒，确认人往前走了、没有穿出地面
        z0 = await pg.evaluate("() => window.__arc.P.z")
        await pg.mouse.click(640, 400); await pg.keyboard.down("w"); await pg.wait_for_timeout(3000); await pg.keyboard.up("w")
        pz = await pg.evaluate("() => [window.__arc.P.x, window.__arc.P.z, window.__arc.walkable(window.__arc.P.x, window.__arc.P.z)]")
        print(f"keyboard W 3s: z {z0:.2f} → {pz[1]:.2f}, still on walkable floor: {pz[2]}")
        # 站到左边电视堆前面，往左一直走：应该被挡住
        await pg.evaluate("() => { window.__arc.P.x = -2.5; window.__arc.P.z = 33; }")
        pz = [-2.5, 33, True]
        await pg.keyboard.down("a"); await pg.wait_for_timeout(3000); await pg.keyboard.up("a")
        pz2 = await pg.evaluate("() => [window.__arc.P.x, window.__arc.P.z]")
        print(f"keyboard A 3s into the left CRT stack: x {pz[0]:.2f} → {pz2[0]:.2f} (wall at about x=-4.5)")
        await b.close()
asyncio.run(main())
