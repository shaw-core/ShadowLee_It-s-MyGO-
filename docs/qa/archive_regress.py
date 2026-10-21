# 隐藏档案馆 · 交互回归：每个记录点用真实按键（F / Esc / 输入密钥）走一遍
# 用法：python3 docs/qa/archive_regress.py [url] [截图目录]
import asyncio, json, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/dev/matrix.html?direct"
OUT = sys.argv[2] if len(sys.argv) > 2 else None
FILES = ["draft_pages.dat", "version.log", "panda_plan.doc", "news_archive.txt", "incident_0x02.log", "level3_shift.src", "snap_L1.txt", "snap_L3.txt", "trace_tvhead.log"]
res = []
def check(n, ok, d=""): res.append((n, ok)); print(("PASS " if ok else "FAIL ") + n, d)
STAND = """(name) => { const a = window.__arc; const s = a.stations.find(x => x.name === name);
  const g = s.group; const fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y);
  for (const k of [0.6, 1.0, 1.6, 2.2]) { for (const side of [0, 0.6, -0.6, 1.2, -1.2]) {
    const c = Math.cos(side), sn = Math.sin(side); const dx = fx * c + fz * sn, dz = -fx * sn + fz * c;
    const x = s.pos.x + dx * (s.radius + k), z = s.pos.z + dz * (s.radius + k);
    if (a.walkable(x, z)) { a.P.x = x; a.P.z = z; a.P.face = Math.atan2(-dx, -dz); return [x, z]; } } }
  return null; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(5500)
        await pg.evaluate("() => { window.__arc.devCam.snap = true; }")
        await pg.mouse.click(640, 400)
        async def go(name, expect=None):
            pos = await pg.evaluate(STAND, name)
            want = expect or name
            prompt = ""
            for i in range(40):   # 软件渲染下一帧可能要好几百毫秒：等提示真的换成这个记录点
                await pg.wait_for_timeout(250)
                prompt = "\n".join(l for l in (await pg.evaluate("() => document.body.innerText")).split("\n") if l.startswith("F "))
                if want in prompt: break
            return pos, prompt
        for f in FILES:
            pos, txt = await go(f)
            ok_prompt = f"F 读取 {f}" in txt
            await pg.keyboard.press("f"); await pg.wait_for_timeout(1200)
            body = await pg.evaluate("() => document.body.innerText")
            ok = f"cat {f}" in body
            if OUT and f in ("news_archive.txt", "trace_tvhead.log"): await pg.screenshot(path=f"{OUT}/archive_read_{f.split('.')[0]}.png")
            check(f"read {f}", ok_prompt and ok, f"stand={pos}" + ("" if ok_prompt and ok else " prompt=" + " | ".join(l for l in txt.split("\n") if l.startswith("F ")) + " body_has_cat=" + str(ok)))
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
            if f == "news_archive.txt":
                # 「世界变薄」演出：整个档案馆被压扁再弹回来；软件渲染帧率低，等它真的弹回来
                thin = 1.0
                for i in range(500):
                    z = await pg.evaluate("() => window.__arc.world.scale.z"); thin = min(thin, z)
                    if z == 1 and thin < 1: break
                    await pg.wait_for_timeout(200)
                check("news_archive thin-world effect plays and restores", thin < 0.9 and await pg.evaluate("() => window.__arc.world.scale.z") == 1, f"scale.z during = {thin:.2f}")
        # world_03.plan：权限不足
        pos, txt = await go("world_03.plan")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(1000)
        body = await pg.evaluate("() => document.body.innerText")
        check("world_03.plan → ACCESS DENIED (no early leak)", "ACCESS DENIED" in body and "（权限不足）" in txt, f"stand={pos}")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
        # sealed_truth.enc：先错密码，再正确密码
        pos, txt = await go("sealed_truth.enc")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(1000)
        await pg.keyboard.type("12345678"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(600)
        body = await pg.evaluate("() => document.body.innerText")
        check("sealed_truth.enc wrong key rejected", "DECRYPT FAILED" in body)
        await pg.fill("input[aria-label=密钥]", ""); await pg.keyboard.type("22966160"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(1500)
        body = await pg.evaluate("() => document.body.innerText")
        check("sealed_truth.enc correct key opens LOG-SYS-A770", "DECRYPT OK" in body and "A770" in body)
        if OUT: await pg.screenshot(path=f"{OUT}/archive_read_sealed.png")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(700)
        # Kimo
        pos, txt = await go("__kimo", "F 和它说话")
        ok_prompt = "F 和它说话" in txt
        await pg.keyboard.press("f"); await pg.wait_for_timeout(900)
        body = await pg.evaluate("() => document.body.innerText")
        check("Kimo talk (after unlock → sealed lines first)", ok_prompt and ("你听到那段录音了。" in body or "……你又来了。" in body), f"stand={pos}")
        if OUT: await pg.screenshot(path=f"{OUT}/archive_kimo_talk.png")
        for i in range(20): await pg.keyboard.press("f"); await pg.wait_for_timeout(120)
        # 出口
        pos, txt = await go("__exit", "F 穿过这扇门")
        await pg.keyboard.press("f"); await pg.wait_for_timeout(1800)
        ex = await pg.evaluate("() => window.__exit")
        check("exit portal → onExit(hacked=true)", "F 穿过这扇门，离开这里" in txt and ex is True, f"stand={pos} exit={ex}")
        check("no page errors", not errs, json.dumps(errs[:3]))
        print(f"{sum(1 for _, o in res if o)}/{len(res)} passed")
        await b.close()
asyncio.run(main())
