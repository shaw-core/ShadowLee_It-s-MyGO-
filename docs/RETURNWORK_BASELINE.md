# v0.16.1 返工 · 现状证明（以 v0.16.0 为基线）

基线：分支 `fix/dialogue-art-ending-polish`，提交 `c11c78b`（v0.16.0）。下面每一条都可以在该提交的源码里直接核对。

## 1. 悠亚：现在有什么

| 位置 | 现状 |
|---|---|
| `components/GameEngine3D.tsx` `setYua(on)` | 隐藏变身。切换角色模型（`yuaRig`），把全部存档熊猫换成企鹅（`setYuaForm`），室友姐隐身、变回时出现在身边，两个次元同时生效，提示「⟡ 悠亚降临！所有次元同时存在」，`sfx('transform')`，首次写入 `flags: 'yua'`。 |
| `setPanda(on)` | 变成魔法熊猫时会直接把 `s.yua` 置为 false（不经过任何离场流程）。 |
| `game3d/characters3d.ts` | `buildYua`、`buildCheckpointPenguin`（体素版，v0.15.2）。 |
| `components/SkinSelect.tsx` | 悠亚预览、语音咒语提示。 |
| `story/chapter1.ts` `c1_l2.s` | 「跟 uaua 结婚」日常联动梗。 |
| `story/codex.ts` `p_yua` | 手账条目，靠 `yua` flag 解锁。 |

## 2. 三项缺失的闭环

1. **出现事件 → 专属音乐**：`setYua` 只调用 `sfx('transform')`。`App.tsx` 只按画面调用 `score.scene(id)`；`core/audio.ts` 的 `music` 门面只有 `start / suppress / applyVolume`。没有任何「悠亚在场」状态，也没有专属曲目或淡入淡出。**未实现。**
2. **离场 → 恢复本关配乐**：既然没有专属曲，也就没有恢复逻辑；`setPanda` 清掉 `s.yua`、切关卸载组件、回菜单都不会通知音频层。**未实现。**
3. **首遇 → 随身听收藏**：`music.ts` 的 `BGM_TRACKS` 是固定 10 首；`Walkman.tracks` 直接返回这个数组，`load/next/prev` 都按 `BGM_TRACKS.length` 取模；存档里只有 `player.idx`。没有曲目 id、解锁 flag 或过滤。**未实现。**

此外：
- **CH2 首通伏笔**：`components/MatrixEnding.tsx` 的 `TERMINAL_LINES` 只到「一只新的熊猫存档点，慢慢亮了起来。」，没有轮廓比对的两行，也没有任何影子/轮廓演出。**未实现。**
- **音源**：仓库里没有这首歌；本次返工包提供了 `uaua_kanashibari.mp3`（SHA-256 `1d2f5467…e682`，已核对一致）。

## 3. 隐藏档案馆（`Archive3D.tsx` + `game3d/archiveWorld.ts`）现状

- 一块半径 22 的圆形浮台（`buildFloor`），中心是世界树（`buildWorldTree`，碰撞半径 2.2），外圈是 **40 个等间距机柜**（`buildServerRoom`，环半径 18.2，在 0°/90°/180°/270° 留缺口，实际 32 个）。
- 记录点全部用 `addStation(name, angleDeg, radius, ringR, …)` 的**极坐标**摆在环带上：13 个站点（11 份文件 + `__exit` + `__kimo`）。坐标：

| 站点 | x | z |
|---|---|---|
| draft_pages.dat | -3.1 | 8.5 |
| news_archive.txt | -11.8 | 5.5 |
| panda_plan.doc | -12.2 | -4.4 |
| incident_0x02.log | -5.5 | -11.8 |
| trace_tvhead.log | 4.4 | -12.2 |
| level3_shift.src | 11.8 | -5.5 |
| snap_L1.txt | 12.2 | 4.4 |
| snap_L3.txt | 5.5 | 11.8 |
| version.log | 2.7 | 7.5 |
| sealed_truth.enc | 0 | -5 |
| world_03.plan | -5.2 | -19.3 |
| __exit | 0 | 19 |
| __kimo | -20.4 | 0 |

- 出生点 (0, 13)，朝向中心：**一进来就看到整棵世界树和所有站点**，没有分区、没有路线，玩家在一块圆盘上绕圈读档。
- 移动限制：`hypot(x,z) < R-0.8` 的圆；相机钳在半径 16.6 内。
- 场景统计（开发版运行时 `scene.traverse`）：271 个普通 Mesh，3 个 InstancedMesh（共 1592 个实例），103 组 LineSegments，4 组 Points；225 个 geometry，33 张纹理。
- 没有 CRT 机壳、没有网格走道、没有门洞/圆环、没有漂浮杂物；画质设置只影响像素比。

### 旧版截图（游戏实际运行，开发版 `dev/matrix.html?direct`，1280×720，swiftshader）

| 文件 | 内容 | 玩家位置 / 镜头 |
|---|---|---|
| `qa/archive_before_1_entry.png` | 进场 | P=(0,13) 朝北，默认跟随镜头 yaw 0 / pitch 0.32 / dist 6.5 |
| `qa/archive_before_2_crt.png` | 「CRT 区」（旧版只有新闻墙那几块平面屏） | P=(-8.5,4)，yaw 1.2 |
| `qa/archive_before_3_data.png` | 数据区（快照全息台与机柜） | P=(8,4)，yaw -1.4 |
| `qa/archive_before_4_tree_exit.png` | 树 / 出口 | P=(0,15.5)，yaw 0 / pitch 0.35 / dist 7 |
| `qa/archive_before_topdown.png` | 俯视全图（隐藏粒子） | 相机 (0,62,0) 看向原点 |

截图脚本：`docs/qa/archshot.py`（见 `RETURNWORK_QA.md`）。为截图，在 `Archive3D.tsx` 的开发钩子 `window.__arc` 里加了 `devCam`（固定镜头）、`scene`、`renderer`，仅 `import.meta.env.DEV` 时存在，不影响正式版。
