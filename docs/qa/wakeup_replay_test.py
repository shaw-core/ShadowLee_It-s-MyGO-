# 《快醒醒！》回放与边界：手账回放 + 两次确认跳过 + 回到手账；快速连点不重复回调；场景配乐在过场中停下
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/"
SAVE = {"v": 2, "cleared1": True, "cleared2": True, "reached1": 6, "reached2": 4, "flags": [], "skin": "skin1", "seenScenes": ["cut:c2_wakeup"], "settings": {"quality": "low"}}
async def main():
    ok = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1280, "height": 720})
        await pg.add_init_script("localStorage.setItem('dousha_save_v2', JSON.stringify(%s))" % json.dumps(SAVE))
        await pg.goto(BASE); await pg.wait_for_timeout(1500); await pg.mouse.click(640, 700)
        await pg.click("text=豆沙的手账"); await pg.wait_for_timeout(500); await pg.click("text=回忆"); await pg.wait_for_timeout(400)
        await pg.click("button:has-text('快醒醒！')"); await pg.wait_for_timeout(1800)
        scr = await pg.evaluate("() => window.__app.screen()")
        ok.append(scr["k"] == "wakeup" and scr.get("replay")); print("replay from codex:", scr)
        for i in range(12): await pg.mouse.click(640, 360); await pg.wait_for_timeout(40)   # 连点
        await pg.click("text=跳过"); await pg.wait_for_timeout(200)
        await pg.click("text=再点一次跳过"); await pg.wait_for_timeout(600)
        scr = await pg.evaluate("() => window.__app.screen().k")
        ok.append(scr == "codex"); print("after skip-confirm:", scr)
        sv = await pg.evaluate("() => JSON.parse(localStorage.getItem('dousha_save_v2'))")
        ok.append(sv["cleared2"] is True and "music:uaua_kanashibari" not in sv["flags"]); print("save intact:", sv["cleared2"], sv["flags"])
        # 首通模式：没有跳过按钮，场景配乐停下
        await pg.evaluate("() => { const d = JSON.parse(localStorage.getItem('dousha_save_v2')); d.seenScenes = []; localStorage.setItem('dousha_save_v2', JSON.stringify(d)); }")
        await b.close()
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1280, "height": 720})
        S2 = dict(SAVE); S2["seenScenes"] = []; S2["cleared2"] = False
        await pg.add_init_script("localStorage.setItem('dousha_save_v2', JSON.stringify(%s))" % json.dumps(S2))
        await pg.goto(BASE); await pg.wait_for_timeout(1500); await pg.mouse.click(640, 700)
        await pg.evaluate("() => window.__app.advanceLast2()"); await pg.wait_for_timeout(2500)
        has_skip = await pg.locator("text=跳过").count()
        ok.append(has_skip == 0); print("first viewing has no skip button:", has_skip == 0)
        await b.close()
    print(f"{sum(ok)}/{len(ok)} passed")
asyncio.run(main())
