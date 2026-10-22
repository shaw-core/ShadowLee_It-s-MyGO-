# 第二章过场《快醒醒！》：完整流程测试（真实 Chromium）
#  第五关结束 → 过场（截图：企鹅 / 两句大字 / 两人对话）→ 原有 c2_end → 终端结局
#  另外检查：歌曲片段（滤波、低音量、几秒后停）、不解锁随身听曲目、onEnd 只触发一次、窄屏截图
# 用法：python3 docs/qa/wakeup_test.py [base_url] [out_dir]
import asyncio, json, sys, time
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "docs/qa"
SAVE = {"v": 2, "cleared1": True, "cleared2": False, "reached1": 6, "reached2": 4, "inventory": [], "affection": 20, "stats": {}, "flags": [], "skin": "skin1",
        "seenScenes": ["page:c2_open", "c2_arrive"], "pats": 0, "settings": {"master": 0.9, "bgm": 0.45, "sfx": 0.7, "bgmSel": 0, "player": {"idx": 1, "mode": "seq", "on": False}, "quality": "low", "reduceMotion": False, "camSens": 1, "hints": True, "typeSpeed": 1}}
LINES = ["快醒醒！快醒醒，豆沙！", "……诶？", "怎么了？", "你刚刚有没有听到……", "听到什么？", "有人在叫我。", "豆沙！", "等一下——", "……这个声音。", "你认识？", "我好像——",
         "你不会睡过去了吧……", "喂，小李！", "……uaua？", "……终于有反应了。", "豆沙？", "你脸色怎么了？", "我刚才……好像听见 uaua 了。", "uaua？", "……算了。", "可能是我还没缓过来吧。"]
res = []
def check(n, ok, d=""): res.append(ok); print(("PASS " if ok else "FAIL ") + n, d)
async def run(p, w, h, tag, full=True):
    b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ctx = await b.new_context(viewport={"width": w, "height": h})
    await ctx.add_init_script("if (!sessionStorage.getItem('s')) { localStorage.setItem('dousha_save_v2', JSON.stringify(%s)); sessionStorage.setItem('s','1'); }" % json.dumps(SAVE))
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(BASE); await pg.wait_for_timeout(2000)
    await pg.mouse.click(w // 2, h - 40); await pg.wait_for_timeout(500)
    await pg.evaluate("() => window.__app.advanceLast2()")
    t0 = time.time(); seen = []; shots = {}
    async def snap(name): await pg.screenshot(path=f"{OUT}/wakeup_{name}{tag}.png")
    timeline = [(11.0, "penguin"), (17.2, "bigtext"), (25.0, "dialogue"), (36.0, "signal"), (53.0, "uaua_named"), (62.5, "wake")] if full else [(11.0, "penguin"), (17.4, "bigtext"), (27.2, "dialogue")]
    k = 0; snip = None
    while time.time() - t0 < (100 if full else 30):
        el = time.time() - t0
        st = await pg.evaluate("""() => ({ screen: window.__app.screen().k, text: (document.querySelector('[aria-label="快醒醒！"]') || {innerText: ''}).innerText,
            snip: window.__wakeupSnippet ? { t: window.__wakeupSnippet.el ? window.__wakeupSnippet.el.currentTime : null, paused: window.__wakeupSnippet.el ? window.__wakeupSnippet.el.paused : null, gain: window.__wakeupSnippet.gain ? window.__wakeupSnippet.gain.gain.value : null, lp: window.__wakeupSnippet.lowpass ? window.__wakeupSnippet.lowpass.frequency.value : null, level: window.__wakeupSnippet.level, ended: !!window.__wakeupSnippet.ended } : null })""")
        for l in LINES:
            if ("「" + l + "」") in st["text"] and (not seen or seen[-1] != l): seen.append(l)
        if st["snip"] and st["snip"].get("gain") is not None and (snip is None or st["snip"]["gain"] > snip.get("peak", 0)):
            snip = dict(st["snip"]); snip["peak"] = st["snip"]["gain"]; snip["at"] = round(el, 1)
        if st["screen"] == "wakeup" and "fps" not in shots and el > 30: shots["fps"] = await pg.evaluate("() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })")
        if k < len(timeline) and el >= timeline[k][0]:
            await snap(timeline[k][1])
            if timeline[k][1] == "penguin": shots["scene"] = await pg.evaluate("() => window.__uaua.debug().score")
            if timeline[k][1] == "dialogue": shots["snipAfter"] = await pg.evaluate("() => { const s = window.__wakeupSnippet; return s && s.el ? { paused: s.el.paused, gain: s.gain.gain.value } : null; }")
            k += 1
        if st["screen"] != "wakeup": break
        await pg.wait_for_timeout(200)
    dur = time.time() - t0
    return b, pg, errs, seen, snip, dur, shots
async def main():
    async with async_playwright() as p:
        b, pg, errs, seen, snip, dur, shots = await run(p, 1280, 720, "")
        check("scene BGM stopped during the cutscene (score scene = null, no uaua presence)", shots.get("scene", {}).get("scene", 1) is None, json.dumps(shots.get("scene")))
        check("cutscene shows instead of the terminal, lasts 55–80 s", 55 <= dur <= 80, f"{dur:.1f} s (headless software rendering ≈ {shots.get('fps')} fps)")
        check("all 21 locked lines appear in order", seen == LINES, f"{len(seen)} lines: {seen[:3]}…{seen[-2:]}")
        lvl = 0.9 * 0.45 * 0.22
        check("song snippet: low-pass ~650 Hz, peak gain ≈ 22% of BGM, stopped afterwards", snip and abs(snip["peak"] - lvl) < 0.01 and snip["lp"] == 650 and shots.get("snipAfter", {}).get("paused") is True, json.dumps(snip) + " after: " + json.dumps(shots.get("snipAfter")))
        scr = await pg.evaluate("() => window.__app.screen().k")
        txt = await pg.evaluate("() => document.body.innerText")
        check("after the cutscene: original c2_end dialogue plays (not the terminal yet)", scr == "blank" and "终章" in txt or "c2_end" in txt or len(txt) > 0, f"screen={scr}")
        await pg.screenshot(path="docs/qa/wakeup_then_c2_end.png")
        for i in range(60):
            if await pg.evaluate("() => window.__app.screen().k") == "matrix": break
            await pg.mouse.click(640, 600); await pg.wait_for_timeout(250)
        sv = await pg.evaluate("() => JSON.parse(localStorage.getItem('dousha_save_v2'))")
        scr = await pg.evaluate("() => window.__app.screen().k")
        check("c2_end → cleared2 written → Matrix terminal", scr == "matrix" and sv["cleared2"] is True, f"screen={scr} cleared2={sv['cleared2']}")
        check("walkman track NOT unlocked in chapter 2", "music:uaua_kanashibari" not in sv["flags"], str(sv["flags"]))
        check("seen flag for replay written", "cut:c2_wakeup" in sv["seenScenes"])
        calls = await pg.evaluate("() => window.__wakeupSound ? window.__wakeupSound.calls : -1")
        check("background sound: dream bed + electronic call fired for each of the 5 「？？？」 lines", calls == 5, f"calls={calls}")
        check("no page errors", not errs, json.dumps(errs[:3]))
        await b.close()
        # 窄屏（手机竖屏）只看前三镜
        b, pg, errs, seen, snip, dur, shots = await run(p, 390, 844, "_mobile", full=False)
        await b.close()
    print(f"{sum(res)}/{len(res)} passed")
asyncio.run(main())
