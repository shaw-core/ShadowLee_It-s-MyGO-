# 反复进出隐藏档案馆 10 次：检查 canvas / WebGL 上下文 / JS 堆是否持续增长
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/dev/matrix.html?direct"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--js-flags=--expose-gc", "--enable-precise-memory-info"])
        pg = await b.new_page(viewport={"width": 640, "height": 360})
        await pg.goto(URL); await pg.wait_for_timeout(5000)
        heap = []
        for i in range(10):
            await pg.evaluate("() => { window.__prevR = window.__arc && window.__arc.renderer; return window.__remount(); }"); await pg.wait_for_timeout(2500)
            fresh = await pg.evaluate("() => !!window.__arc && window.__arc.renderer !== window.__prevR && window.__prevR.getContext().isContextLost() === false")
            h = await pg.evaluate("() => { window.gc && window.gc(); return [performance.memory.usedJSHeapSize, document.querySelectorAll('canvas').length, (window.__arc && window.__arc.renderer.info.memory.geometries) || 0]; }")
            heap.append(h); print(f"cycle {i+1}: remounted={fresh} heap={h[0]/1e6:.1f} MB canvases={h[1]} geometries(live renderer)={h[2]}")
        growth = (heap[-1][0] - heap[2][0]) / 1e6
        print(f"heap growth cycles 3→10: {growth:+.1f} MB; canvases stay {set(x[1] for x in heap)}")
        await b.close()
asyncio.run(main())
