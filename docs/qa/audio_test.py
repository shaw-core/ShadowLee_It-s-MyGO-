# 悠亚专属曲 · 生命周期自动化测试（真实 Chromium，真实解码 mp3）
# 用法：先起开发服务器（npx vite --port 5173），然后 python3 docs/qa/audio_test.py [base_url] [out_dir]
import asyncio, json, sys, time
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "docs/qa"
SAVE = {"v": 2, "cleared1": True, "cleared2": True, "reached1": 6, "reached2": 4, "inventory": [], "affection": 20, "stats": {}, "flags": ["yua"], "skin": "skin3", "seenScenes": ["page:c2_open", "c2_arrive", "page:c1_open"], "pats": 0,
        "settings": {"master": 0.9, "bgm": 0.45, "sfx": 0.7, "bgmSel": 0, "player": {"idx": 1, "mode": "seq", "on": False}, "quality": "low", "reduceMotion": True, "camSens": 1, "hints": True, "typeSpeed": 1}}
results = []; samples = []
def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": detail}); print(("PASS " if ok else "FAIL ") + name, detail)

ST = "() => window.__uaua.debug()"
async def sample(pg, label, secs, every=0.25):
    out = []
    t0 = time.time()
    while time.time() - t0 < secs:
        d = await pg.evaluate("() => { const u = window.__uaua.debug(); return { ...u, notices: [...document.querySelectorAll('[role=status] div')].map(e => e.textContent) }; }")
        d["label"] = label; d["wall"] = round(time.time() - t0, 2); out.append(d); samples.append(d)
        await asyncio.sleep(every)
    return out

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=user-gesture-required"])
        ctx = await b.new_context(viewport={"width": 1280, "height": 720})
        await ctx.add_init_script("if (!sessionStorage.getItem('seeded')) { localStorage.setItem('dousha_save_v2', JSON.stringify(%s)); sessionStorage.setItem('seeded', '1'); }" % json.dumps(SAVE))
        # 自动播放策略：Playwright 的 evaluate 会带上「用户激活」，无头 Chromium 也不严格执行策略；
        # 这里按浏览器规则模拟——页面还没有过真实的点击/按键时，play() 一律以 NotAllowedError 拒绝
        await ctx.add_init_script("""(() => { const orig = HTMLMediaElement.prototype.play;
          let real = false; const mark = (e) => { if (e.isTrusted) real = true; };
          addEventListener('pointerdown', mark, true); addEventListener('keydown', mark, true);
          HTMLMediaElement.prototype.play = function () { if (!real) return Promise.reject(new DOMException('autoplay blocked (emulated)', 'NotAllowedError')); return orig.call(this); }; })()""")
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        reqs = {}
        pg.on("response", lambda r: reqs.__setitem__(r.url, r.status) if "uaua_kanashibari" in r.url or "__missing__" in r.url else None)
        await pg.goto(BASE)
        await pg.wait_for_timeout(2500)

        # ---- U-autoplay：没有用户输入时入场 → 等待输入，不报错；点击后真正开始播放 ----
        await pg.evaluate("() => window.__app.play(2, 0)")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("() => window.__uaua.enter('story')")
        await pg.wait_for_timeout(1200)
        d = await pg.evaluate(ST)
        check("autoplay blocked → waiting for input", d["waitingForInput"] and d["paused"], json.dumps({k: d[k] for k in ("waitingForInput", "paused")}))
        await pg.mouse.click(640, 360)   # 第一次真实输入（同时启动场景配乐）
        s = await sample(pg, "after-first-input", 3.0)
        d = s[-1]
        check("after input: playing, faded in, scene ducked", (not d["paused"]) and d["gain"] > 0.95 and d["score"]["duckGain"] < 0.05 and "uaua" in d["score"]["reasons"], json.dumps({k: d[k] for k in ("paused", "gain", "t")}) + " duck=" + str(d["score"]["duckGain"]))
        await pg.evaluate("() => window.__uaua.leave('form')")
        await pg.wait_for_timeout(1800)

        # ---- U06 曲单：首遇前（重新载入一个干净存档） ----
        await pg.evaluate("() => { sessionStorage.clear(); }")
        await pg.goto(BASE); await pg.wait_for_timeout(2000)
        await pg.mouse.click(640, 360); await pg.wait_for_timeout(300)
        n0 = await pg.evaluate("() => window.__walkman.tracks.length")
        flags0 = await pg.evaluate("() => JSON.parse(localStorage.getItem('dousha_save_v2')).flags")
        check("before first encounter: walkman has 10 tracks, no unlock flag", n0 == 10 and "music:uaua_kanashibari" not in flags0, f"tracks={n0} flags={flags0}")
        await pg.keyboard.press("m"); await pg.wait_for_timeout(300)
        if not await pg.locator("[role=dialog] .scroll-thin").count(): await pg.click("[aria-label=曲目列表]")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/uaua_walkman_before_unlock.png")
        await pg.keyboard.press("m"); await pg.wait_for_timeout(300)

        # ---- U03 进入悠亚形态（按 Y） ----
        await pg.evaluate("() => window.__app.play(2, 1)")
        await pg.wait_for_timeout(3500)
        await pg.mouse.click(900, 500); await pg.wait_for_timeout(300)
        # 页面内采样（每 50 ms，用页面自己的时钟），避免自动化往返的延迟影响时长测量
        await pg.evaluate("""() => { window.__fadeTrace = []; const t0 = performance.now(); const id = setInterval(() => {
            const d = window.__uaua.debug(); window.__fadeTrace.push({ ms: Math.round(performance.now() - t0), gain: d.gain, duck: d.score.duckGain });
            if (performance.now() - t0 > 3500) clearInterval(id); }, 50); }""")
        await pg.keyboard.press("y")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{OUT}/uaua_enter_notice.png")
        s = await sample(pg, "enter(secret_form)", 1.2, every=0.1)
        await pg.wait_for_timeout(800)
        trace = await pg.evaluate("() => window.__fadeTrace")
        samples.append({"label": "enter(secret_form) in-page 50ms trace", "trace": trace})
        d = s[-1]
        check("U03 enter: uaua track playing at full gain, scene BGM ducked", (not d["paused"]) and d["gain"] > 0.95 and d["score"]["duckGain"] < 0.05, f"gain={d['gain']} vol={d['volume']} duck={d['score']['duckGain']} t={d['t']}")
        import math
        start = next((x["ms"] / 1000 for x in trace if x["gain"] > 0.01), None)
        fade_in = next((x["ms"] / 1000 for x in trace if x["gain"] >= 0.99), None)
        # 软件渲染下主线程偶尔会被 3D 卡住一两秒（换装时编译新材质），所以用卡顿前的采样推算曲线：
        #   专属曲音量是线性淡入 → 斜率推出总时长；场景配乐是指数衰减 → 时间常数推出降到 5% 的时间
        lin = [x for x in trace if 0.02 < x["gain"] < 0.9]
        rate = (lin[-1]["gain"] - lin[0]["gain"]) / ((lin[-1]["ms"] - lin[0]["ms"]) / 1000) if len(lin) > 1 and lin[-1]["ms"] > lin[0]["ms"] else None
        ex = [x for x in trace if x["duck"] is not None and 0.01 < x["duck"] < 0.95]
        tau = ((ex[-1]["ms"] - ex[0]["ms"]) / 1000) / math.log(ex[0]["duck"] / ex[-1]["duck"]) if len(ex) > 1 and ex[-1]["duck"] < ex[0]["duck"] else None
        fade_len = round(1 / rate, 2) if rate else None
        duck95 = round(3 * tau, 2) if tau else None
        check("U03 fade-in ~1–2 s, scene BGM fade-out ~0.8–1.5 s", fade_len and 1.0 <= fade_len <= 2.0 and duck95 and 0.8 <= duck95 <= 1.5,
              f"(in-page trace every 50 ms) uaua fade-in slope → {fade_len}s total; scene BGM time-constant {round(tau, 3) if tau else None}s → 95% down in {duck95}s; first audible at {start}s, gain=1 at {fade_in}s (includes main-thread stalls)")
        vol_expected = round(0.9 * 0.45, 3)
        check("volume follows master×bgm", abs(d["volume"] - vol_expected) < 0.01, f"volume={d['volume']} expected={vol_expected}")
        t_a = d["t"]; await pg.wait_for_timeout(2000); t_b = (await pg.evaluate(ST))["t"]
        check("playback time advances (real decode)", t_b - t_a > 1.5, f"{t_a} → {t_b}")
        # 真的有声音：从专属曲的 <audio> 抓一路流量做 RMS（captureStream 不改变正常输出）
        rms = await pg.evaluate("""async () => {
            const el = window.__uaua['el']; const st = el.captureStream(); const ctx = new AudioContext(); await ctx.resume();
            const an = ctx.createAnalyser(); an.fftSize = 2048; ctx.createMediaStreamSource(st).connect(an);
            const buf = new Float32Array(2048); const read = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); };
            const out = {}; await new Promise(r => setTimeout(r, 600)); out.head = read();
            el.currentTime = 214; await new Promise(r => setTimeout(r, 900)); out.tail = read(); out.tailT = el.currentTime;
            el.currentTime = 217.5; await new Promise(r => setTimeout(r, 1500)); out.afterLoopT = el.currentTime;
            ctx.close(); return out; }""")
        check("signal is audible near the start and near the end (RMS from captureStream)", rms["head"] > 0.01 and rms["tail"] > 0.01, json.dumps(rms))
        check("presence loop skips the 2.4 s tail silence and wraps to the music start", rms["afterLoopT"] < 3, f"t after crossing 217.9 → {rms['afterLoopT']:.2f}")
        flags1 = await pg.evaluate("() => JSON.parse(localStorage.getItem('dousha_save_v2')).flags")
        n1 = await pg.evaluate("() => ((m) => m.walkman.tracks.map(t => t.id))({walkman: window.__walkman})")
        check("U06 first encounter unlocks exactly one new walkman track", "music:uaua_kanashibari" in flags1 and len(n1) == 11 and n1[10] == "uaua_kanashibari", f"tracks={len(n1)} last={n1[-1]}")
        # 唱片：曲单截图
        await pg.keyboard.press("m"); await pg.wait_for_timeout(300)
        if not await pg.locator("[role=dialog] .scroll-thin").count(): await pg.click("[aria-label=曲目列表]")
        await pg.wait_for_timeout(400)
        await pg.evaluate("() => { const l = document.querySelector('[role=dialog] .scroll-thin'); if (l) l.scrollTop = l.scrollHeight; }")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/uaua_walkman_after_unlock.png")
        await pg.keyboard.press("m"); await pg.wait_for_timeout(300)

        # ---- U04a 变回原形 ----
        await pg.keyboard.press("y")
        s = await sample(pg, "leave(form)", 2.4)
        d = s[-1]
        check("U04a leave form: uaua paused, gain 0, scene BGM restored", d["paused"] and d["gain"] < 0.01 and d["score"]["duckGain"] > 0.9 and not d["score"]["reasons"], f"paused={d['paused']} duck={d['score']['duckGain']} scene={d['score']['scene']}")

        # ---- U04b 在场时切关 ----
        await pg.keyboard.press("y"); await pg.wait_for_timeout(2500)
        scene_before = (await pg.evaluate(ST))["score"]["scene"]
        await pg.evaluate("() => window.__app.play(2, 2)")
        s = await sample(pg, "switch level while present", 4.5)
        d = s[-1]
        check("U04b level switch: presence ends, uaua silent, new level BGM restored", d["origin"] is None and d["paused"] and d["score"]["duckGain"] > 0.9 and d["score"]["scene"] != scene_before, f"scene {scene_before} → {d['score']['scene']} " + json.dumps({k: d[k] for k in ('origin', 'paused', 'gain')}) + f" duck={d['score']['duckGain']}")

        # ---- U04c 在场时回菜单 ----
        await pg.wait_for_timeout(1500)
        await pg.mouse.click(900, 500); await pg.keyboard.press("y"); await pg.wait_for_timeout(2500)
        await pg.evaluate("() => window.__app.menu()")
        s = await sample(pg, "menu while present", 2.6)
        d = s[-1]
        check("U04c back to menu: presence ends, title BGM restored", d["origin"] is None and d["paused"] and d["score"]["duckGain"] > 0.9, f"scene={d['score']['scene']}")

        # ---- U05 随身听优先 ----
        await pg.evaluate("() => window.__app.play(2, 0)"); await pg.wait_for_timeout(3000)
        await pg.evaluate("() => ((m) => m.walkman.play(0))({walkman: window.__walkman})")
        await pg.wait_for_timeout(800)
        await pg.mouse.click(900, 500); await pg.keyboard.press("y")
        s = await sample(pg, "walkman playing, then uaua enters", 2.5)
        both = [x for x in s if x["walkmanPlaying"] and x["volume"] and x["volume"] > 0.02 and not x["paused"]]
        check("U05 walkman active → uaua stays silent (player first)", not both and s[-1]["paused"], f"overlap samples={len(both)}")
        await pg.evaluate("() => ((m) => m.walkman.pause())({walkman: window.__walkman})")
        s = await sample(pg, "walkman stopped while present", 2.6)
        d = s[-1]
        check("U05 walkman stops → uaua fades in", (not d["paused"]) and d["gain"] > 0.95, f"gain={d['gain']}")
        await pg.evaluate("() => ((m) => m.walkman.play(3))({walkman: window.__walkman})")
        s = await sample(pg, "walkman resumes while present", 2.2)
        both = [x for x in s if x["wall"] > 1.0 and x["walkmanPlaying"] and not x["paused"] and x["volume"] > 0.02]
        check("U05 walkman resumes → uaua fades out, never two recordings at normal volume", s[-1]["paused"] and not both, f"late overlap samples={len(both)} final paused={s[-1]['paused']}")
        await pg.evaluate("() => ((m) => m.walkman.pause())({walkman: window.__walkman})")
        await pg.keyboard.press("y"); await pg.wait_for_timeout(2000)

        # ---- U08 快速进出 20 次 ----
        for i in range(20):
            await pg.keyboard.press("y"); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(2500)
        d = await pg.evaluate(ST)
        n_audio = await pg.evaluate("() => performance.getEntriesByType('resource').filter(e => e.name.includes('uaua_kanashibari')).length")
        check("U08 20 rapid toggles (even) → not present, silent, no duck left", d["origin"] is None and d["paused"] and d["gain"] < 0.01 and not d["score"]["reasons"], json.dumps({k: d[k] for k in ('origin', 'paused', 'gain')}))
        for i in range(21):
            await pg.keyboard.press("y"); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(2500)
        d = await pg.evaluate(ST)
        check("U08 21 rapid toggles (odd) → present and playing at full gain", d["origin"] == "secret_form" and not d["paused"] and d["gain"] > 0.95, json.dumps({k: d[k] for k in ('origin', 'paused', 'gain')}))
        await pg.keyboard.press("y"); await pg.wait_for_timeout(1800)

        # ---- 魔法熊猫顶掉悠亚（setPanda 经过离场流程） ----
        await pg.keyboard.press("y"); await pg.wait_for_timeout(2000)
        await pg.keyboard.type("shadow"); 
        s = await sample(pg, "panda replaces yua", 2.2)
        check("setPanda clears Yua through leave()", s[-1]["origin"] is None and s[-1]["paused"], f"origin={s[-1]['origin']}")
        await pg.keyboard.type("shadow"); await pg.wait_for_timeout(500)

        # ---- 随身听整首播放（8 倍速跑完全曲，确认能到结尾、没有报错） ----
        await pg.evaluate("() => ((m) => { m.walkman.setMode('one'); m.walkman.play(10); })({walkman: window.__walkman})")
        await pg.wait_for_timeout(1500)
        wm0 = await pg.evaluate("() => ((m) => ({ ...m.walkman.getSnapshot(), name: m.walkman.tracks[m.walkman.getSnapshot().idx].name }))({walkman: window.__walkman})")
        check("walkman plays the unlocked track from its own entry", wm0["playing"] and wm0["idx"] == 10 and abs(wm0["dur"] - 220.37) < 0.5, json.dumps(wm0, ensure_ascii=False))
        await pg.evaluate("() => ((m) => m.walkman.seek(0.985))({walkman: window.__walkman})")
        await pg.wait_for_timeout(4500)
        wm1 = await pg.evaluate("() => ((m) => m.walkman.getSnapshot())({walkman: window.__walkman})")
        check("walkman reaches the end of the full track and loops (single-repeat mode)", wm1["playing"] and wm1["t"] < 4, f"t after end = {wm1['t']}")
        await pg.evaluate("() => ((m) => { m.walkman.pause(); m.walkman.setMode('seq'); })({walkman: window.__walkman})")

        # ---- 存档持久化：刷新后仍解锁 ----
        await pg.goto(BASE); await pg.wait_for_timeout(2000)
        n2 = await pg.evaluate("() => window.__walkman.tracks.length")
        check("unlock persists after reload", n2 == 11, f"tracks={n2}")

        # ---- HTTP ----
        st = [v for k, v in reqs.items() if "uaua_kanashibari" in k]
        check("audio URL served with HTTP 200/206", st and all(v in (200, 206) for v in st), json.dumps(reqs))
        errs2 = [e for e in errors if "AudioContext" not in e and "ERR_TUNNEL_CONNECTION_FAILED" not in e]   # 后者是沙箱代理拦了外网字体，与本功能无关
        check("no page errors / console errors", not errs2, json.dumps(errs2[:5], ensure_ascii=False))
        await ctx.close()

        # ---- U07 404 回退 ----
        # 开发服务器对不存在的文件会回退成 index.html（200），所以这一项用正式构建 + 普通静态服务器测（真正的 404）：
        #   BUILD_TARGET=standalone npx vite build --outDir /tmp/dist404 && python3 -m http.server 8099 -d /tmp/dist404
        MISSING_BASE = (sys.argv[3] if len(sys.argv) > 3 else None)
        if MISSING_BASE:
            ctx = await b.new_context(viewport={"width": 1280, "height": 720})
            pg = await ctx.new_page(); errs = []; reqs.clear()
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("response", lambda r: reqs.__setitem__(r.url, r.status) if "audio/" in r.url else None)
            await pg.goto(MISSING_BASE + "?uauaAudio=missing&audiolog"); await pg.wait_for_timeout(2500)
            await pg.mouse.click(640, 700); await pg.wait_for_timeout(800)
            await pg.evaluate("() => window.__uaua.enter('story')")
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f"{OUT}/uaua_missing_notice.png")
            s = await sample(pg, "404 source (production build)", 2.0)
            d = s[-1]
            check("U07 404: missing flagged, scene BGM keeps playing (not ducked)", d["missing"] and d["score"]["duckGain"] > 0.9 and not d["score"]["reasons"], f"missing={d['missing']} duck={d['score']['duckGain']}")
            seen = [x for x in samples if "这首曲子的音源还没有安装。" in (x.get("notices") or [])]
            check("U07 404: shows '这首曲子的音源还没有安装。'", bool(seen), f"{len(seen)} samples show the notice")
            for i in range(6):
                await pg.evaluate("() => window.__uaua.leave('form')"); await pg.wait_for_timeout(150)
                await pg.evaluate("() => window.__uaua.enter('story')"); await pg.wait_for_timeout(150)
            await pg.wait_for_timeout(1500)
            check("U07 404: real HTTP 404, requested once, no error spam", list(reqs.values()) == [404] and len([e for e in errs if "TUNNEL" not in e]) <= 1, f"responses={reqs} console errors={errs}")
            await ctx.close()
        else:
            print("SKIP U07 (pass a production build URL as 3rd argument)")
        await ctx.close(); await b.close()
    json.dump({"results": results, "samples": samples}, open(f"{OUT}/uaua_audio_log.json", "w"), ensure_ascii=False, indent=1)
    print(f"{sum(r['ok'] for r in results)}/{len(results)} passed")
asyncio.run(main())
