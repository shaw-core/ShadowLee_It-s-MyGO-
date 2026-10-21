# usage: archshot.py spec.json   spec: {quality, reduce, shots:[{out, P:[x,z,face], cam:[yaw,pitch,dist] | pose:{pos,look}, fog:true, wait}] , stats: true}
import asyncio, sys, json
from playwright.async_api import async_playwright
spec = json.load(open(sys.argv[1]))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width":spec.get("w",1280),"height":spec.get("h",720)})
        logs=[]
        pg.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
        pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
        q = spec.get("quality","high"); rm = spec.get("reduce", False)
        await pg.add_init_script(f"""try{{const k='dousha_save_v2';const d=JSON.parse(localStorage.getItem(k)||'{{}}');d.v=2;d.settings=Object.assign(d.settings||{{}},{{quality:'{q}',reduceMotion:{str(rm).lower()}}});localStorage.setItem(k,JSON.stringify(d));}}catch(e){{}}""")
        await pg.goto(spec.get("url","http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/dev/matrix.html?direct"))
        await pg.wait_for_timeout(5500)
        if spec.get("snap", True): await pg.evaluate("() => { if (window.__arc.devCam) window.__arc.devCam.snap = true; }")
        if spec.get("stats"):
            print(await pg.evaluate("""() => { const a=window.__arc; let meshes=0,inst=0,instCount=0,lines=0,pts=0,tris=0; a.scene.traverse(o=>{ if(o.isInstancedMesh){inst++;instCount+=o.count;} else if(o.isMesh)meshes++; if(o.isLineSegments)lines++; if(o.isPoints)pts++; }); const info=a.renderer.info; return JSON.stringify({meshes,instancedMeshes:inst,instances:instCount,lineSegments:lines,points:pts,stations:a.stations.map(s=>[s.name,+s.pos.x.toFixed(1),+s.pos.z.toFixed(1)]),drawCalls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures}); }"""))
        for s in spec["shots"]:
            P = s.get("P")
            if P: await pg.evaluate(f"() => {{ const a=window.__arc; a.P.x={P[0]}; a.P.z={P[1]}; a.P.face={P[2]}; }}")
            if "pose" in s: await pg.evaluate(f"() => {{ window.__arc.devCam.pose = {json.dumps(s['pose'])}; }}")
            else:
                await pg.evaluate("() => { window.__arc.devCam.pose = null; }")
                c = s.get("cam",[0,0.32,6.5]); await pg.evaluate(f"() => window.__arc.setCam({c[0]},{c[1]},{c[2]})")
            if s.get("fog") is False: await pg.evaluate("() => { window.__arc.scene.userData.fog = window.__arc.scene.fog; window.__arc.scene.fog = null; }")
            if s.get("hidePts"): await pg.evaluate("() => { const v = new window.__arc.camera.position.constructor(); window.__arc.scene.traverse(o => { if (o.isPoints || o.isSprite) o.visible = false; if ((o.isMesh || o.isInstancedMesh) && o.geometry) { o.getWorldPosition(v); if (v.y > 7 && !o.isInstancedMesh) o.visible = false; if (o.isInstancedMesh && o.geometry.boundingSphere === null) o.computeBoundingSphere(); if (o.isInstancedMesh && o.boundingSphere && o.boundingSphere.center.y > 7) o.visible = false; } }); }")
            await pg.wait_for_timeout(s.get("wait", 2200))
            await pg.screenshot(path=s["out"])
            if s.get("fog") is False: await pg.evaluate("() => { window.__arc.scene.fog = window.__arc.scene.userData.fog; }")
            if "eval" in s: print(await pg.evaluate(s["eval"]))
        for l in [x for x in logs if "AudioContext" not in x][-15:]: print(l)
        await b.close()
asyncio.run(main())
