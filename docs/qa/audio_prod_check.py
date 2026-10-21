# 正式构建（GitHub Pages 子路径）里的专属曲：地址解析、HTTP 状态、真实解码播放
# 用法：python3 docs/qa/audio_prod_check.py http://127.0.0.1:8098/ShadowLee_It-s-MyGO-/
import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(); st = {}
        pg.on("response", lambda r: st.__setitem__(r.url, r.status) if "uaua" in r.url else None)
        await pg.goto(URL + "?audiolog"); await pg.wait_for_timeout(2500)
        await pg.mouse.click(640, 700); await pg.wait_for_timeout(500)
        await pg.evaluate("() => window.__uaua.enter('story')"); await pg.wait_for_timeout(4000)
        d = await pg.evaluate("() => window.__uaua.debug()")
        print(json.dumps({"responses": st, "src": d["src"], "paused": d["paused"], "t": d["t"], "dur": d["dur"], "gain": d["gain"], "missing": d["missing"]}, ensure_ascii=False))
        ok = not d["paused"] and d["t"] > 2 and abs(d["dur"] - 220.37) < 0.5 and not d["missing"] and all(v in (200, 206) for v in st.values())
        print("PASS production build plays the track from the Pages sub-path" if ok else "FAIL")
        await b.close()
asyncio.run(main())
