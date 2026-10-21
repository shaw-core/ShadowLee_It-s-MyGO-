# v0.16.1 返工 · 验收记录

基线 `c11c78b`（v0.16.0）→ 本版。现状证明见 `RETURNWORK_BASELINE.md`。
测试环境：云端容器，Chromium（Playwright 1194，**真实解码 mp3**），WebGL 走 swiftshader 软件渲染（帧率很低，只影响「多久走完一段路」这类时长，不影响逻辑）。

## 0. 怎么复现

```bash
npm ci
npx vite --port 5173 --host 127.0.0.1                      # 开发服务器（测试钩子只在开发版里有）
npx tsc --noEmit -p .                                        # 类型检查
npx vite build                                               # GitHub Pages 构建（base=/ShadowLee_It-s-MyGO-/）
BUILD_TARGET=standalone npx vite build --outDir /tmp/dist404 # 本地测试版构建（base=./）

# 剧情结构（71 条路线、跳转、aff/ng 与 v0.16.0 逐节点对比）
npx esbuild docs/qa/routes.ts --bundle --platform=node --outfile=/tmp/routes.cjs && node /tmp/routes.cjs

# 悠亚专属曲生命周期（第 3 个参数：本地测试版的静态服务器地址，用来测真正的 404）
(cd /tmp/dist404 && python3 -m http.server 8097 &)
python3 docs/qa/audio_test.py http://127.0.0.1:5173/ShadowLee_It-s-MyGO-/ docs/qa http://127.0.0.1:8097/
# Pages 子路径下的正式构建能不能播
mkdir -p /tmp/pages && cp -r dist /tmp/pages/ShadowLee_It-s-MyGO- && (cd /tmp/pages && python3 -m http.server 8098 &)
python3 docs/qa/audio_prod_check.py http://127.0.0.1:8098/ShadowLee_It-s-MyGO-/

# 隐藏档案馆
python3 docs/qa/archive_reach.py     # 可达性（用游戏里真实的碰撞数据做格子搜索）
python3 docs/qa/archive_regress.py   # 每个记录点用真实按键 F / Esc / 输入密钥走一遍
python3 docs/qa/archive_leak.py      # 反复进出 10 次
python3 docs/qa/archshot.py <spec>   # 截图（固定镜头 / 玩家位置 / 画质）
```

## 1. P0-A 悠亚：事件、专属曲、随身听

### 音频文件
| 项 | 结果 |
|---|---|
| 项目路径 | `public/audio/uaua_kanashibari.mp3` |
| 校验 | 5,290,842 bytes，SHA-256 `1d2f5467…e682`，与返工包一致；`ffprobe`：mp3 / 48 kHz / 2ch / 192 kbps / 220.416 s；`ffmpeg -f null` 全曲解码无错误 |
| 首尾静音 | 开头 0.21 s、结尾 2.39 s（`silencedetect -50dB`）。**没有改动文件**；在场循环时在 217.9 s 跳回 0.2 s。随身听里从头放完整首 |
| 播放地址 | 用 `import.meta.env.BASE_URL` 解析：Pages → `/ShadowLee_It-s-MyGO-/audio/uaua_kanashibari.mp3`；本地测试版 → `./audio/uaua_kanashibari.mp3` |
| HTTP | 开发服务器 206（分段）；Pages 构建静态服务 200，`audio/mpeg`，5,290,842 bytes |

### 自动化结果：`audio_test.py` 27/27 通过，`audio_prod_check.py` 通过
原始数据（每次采样的增益、音量、播放位置、场景配乐让路状态、屏幕上的提示）：`qa/uaua_audio_log.json`。

| 编号 | 验收点 | 结果 |
|---|---|---|
| 自动播放 | 没有过真实输入时入场 → 进入「等待输入」，不报错；第一次点击后开始播放并淡入 | 通过（Playwright 的 evaluate 自带「用户激活」，所以测试里按浏览器规则模拟：没有真实点击/按键前 `play()` 一律拒绝） |
| U03 | 按 Y 变悠亚：专属曲播放、增益到 1、场景配乐让路 | 通过 |
| U03 时长 | 专属曲线性淡入 **1.5 s**；场景配乐时间常数 0.32 s → **0.96 s** 降到 5% | 通过（页面内 50 ms 采样；软件渲染下主线程会卡，所以用曲线斜率/时间常数推算） |
| 音量 | 实际输出增益 = master × bgm（0.9 × 0.45 = 0.405） | 通过 |
| 真的有声音 | `captureStream` 抓专属曲的输出做 RMS：开头 0.24、214 s 处 0.20 | 通过 |
| 循环 | 跨过 217.9 s 后回到 1.1 s 左右 | 通过 |
| U06 | 首遇前随身听 10 首、无 flag；首遇后多且只多 `uaua_kanashibari` 一首（第 11 首），存档 `flags` 写入 `music:uaua_kanashibari`；刷新后仍在 | 通过；截图 `qa/uaua_walkman_before_unlock.png`、`qa/uaua_walkman_after_unlock.png` |
| U04a | 变回原形：专属曲暂停、增益 0、场景配乐恢复（`c2_2`） | 通过 |
| U04b | 在场时切关：离场，专属曲停，新关配乐 `c2_2 → c2_3` | 通过 |
| U04c | 在场时回菜单：离场，标题配乐恢复 | 通过 |
| U05 | 优先级：**玩家主动用随身听时随身听优先**。随身听在放 → 悠亚入场时专属曲保持静音；随身听停 → 专属曲淡入；在场时又开随身听 → 专属曲 0.25 s 让路后暂停。采样中没有两首录音同时以正常音量出声 | 通过 |
| U08 | 快速连按 Y 20 次 / 21 次：最终状态正确，没有残留音乐、没有残留让路；全程只有一个 `<audio>` 元素 | 通过 |
| 魔法熊猫 | 悠亚时输入 shadow：经过离场流程 | 通过 |
| 随身听整首 | 第 11 首可从随身听单独播放，时长 220.37 s，播到结尾按单曲循环回到开头 | 通过 |
| U07 | 404：`?uauaAudio=missing` 指向不存在的文件，静态服务器返回 **真正的 404**；提示「这首曲子的音源还没有安装。」，场景配乐不让路；反复进出 6 次只请求一次，不刷报错 | 通过；截图 `qa/uaua_missing_notice.png` |
| 正式构建 | Pages 子路径下 HTTP 200，`canplay`，播放位置前进，时长 220.37 s | 通过 |

提示截图：`qa/uaua_enter_notice.png`（「⟡ 悠亚来了。」+「随身听新增曲目：《かなしばりに遭ったら》」）。离场提示「她离开了。周围的声音慢慢恢复。」在日志 `notices` 字段里。

### 第二章首通伏笔
- 终端两行锁定文本插在「一只新的熊猫存档点，慢慢亮了起来。」之后、`[SYSTEM] press EXIT` 之前。
- 角落监控画面：存档点亮起 → 影子在比对时变成另一种轮廓（圆脑袋、侧面小嘴、胸口一点反光，没有脸、没有名字）→ 信号撕裂 → 黑屏。只在第一次看到这块终端时播放（`seenScenes: fx:c2_contour`），不放整首歌。
- 截图：`qa/uaua_foreshadow_1_panda.png` … `4_end.png`。开发页 `dev/matrix.html?fx` 可强制重放，`dev/feed.html?stage=panda|mismatch|tear` 看单帧。

### 没做 / 做不到的
- **人耳试听：未完成。** 我没有耳朵，只能证明「文件完整解码、浏览器里真的在出声（RMS）、时间轴在走、淡入淡出曲线和互斥逻辑正确」。音质、循环接缝听感、音量是否合适，需要你在真机上听一遍。
- **录屏：未提供。** 只有截图和状态日志。
- **CH3 正式登场：未实现（按规格只做接口）。** `enterUauaPresence('story')` / `leaveUauaPresence()` 已可调用，也会派发 `uaua:enter` / `uaua:leave` 事件；第三章剧情本身不存在。
- 伏笔在游戏里的「回放」入口：没有新增（终端结局本来没有回放入口），只有开发页可重放。
- 死亡重生：悠亚形态在重生后保持（原有规则），音乐因此继续；按代码确认，没有单独写自动化测试。暂停菜单不改变音乐。

## 2. P0-B 隐藏档案馆重建

### 结构变化（运行时 `scene.traverse` 统计，开发版）
| | v0.16.0 | v0.16.1 高画质 | v0.16.1 低画质 |
|---|---|---|---|
| 普通 Mesh | 271 | 340 | 340 |
| InstancedMesh / 实例 | 3 / 1,592 | 50 / 2,720 | 50 / 2,164 |
| geometry / 纹理 | 225 / 33 | 339 / 45 | 340 / 34 |
| 场地 | 半径 22 的一块圆盘 | 四个分区 + 回环小路，总长约 93 m | 同左 |
| 新增实体 | — | 115 台 CRT（机壳 + 显像管壳 + 旋钮 + 喇叭网 + 屏框 + 屏）、30 台不规则机柜、3 道圆环门洞、7 块拉弯显示器、漂浮椅子/方块/球/碎字、入口碎电视框、线缆 | 漂浮物减半，其余一件不少 |
| 碰撞 | 圆形边界 + 圆形碰撞 | 可走区域并集 + 74 个带朝向方盒 + 圆形 | 同左 |
| 记录点定位 | 极坐标（角度 + 环半径） | 显式世界坐标（`game3d/archiveLayout.ts` 的 `STATIONS`） | 同左 |

代码：`game3d/archiveZones.ts`（新，纯几何组件）、`game3d/archiveLayout.ts`（新，布局）、`game3d/archiveWorld.ts`（删除旧的 40 台环形机柜 `buildServerRoom`；地面和世界树可指定位置，树可逐步显露）、`components/Archive3D.tsx`。

### 四个分区
- **A 入口 / 电视迷宫**：进场时镜头就在入口那台碎电视的「屏幕」里往外看（碎玻璃、火花）；左边一整排高低错落、朝向略有偏差的 CRT 堆（最高 5 层），右边一台歪着的大屏和一圈小电视，前面一道横着的电视墙，要从中间缺口穿过去，上面横架一台。屏幕有 ERROR、色偏 ERROR、雪花、漫画分镜、门、熊猫剪影、两个人影、蓝屏、彩条。离开的门就是这台碎电视（只有这一个出口）。
- **B VHS 网格通道**：不平整的网格板块，越往前越被拉长；三道圆环门洞，后面错开一层网格，下面还有一层斜着的、头顶有一层倒过来的；两侧拉弯的显示器和漂浮的椅子/电视/方块/球/碎字。**回环小路**从通道中段拐出去，沿着一排和入口一样的电视折回入口旁边。
- **C 故障档案机房**：西边一排、中间一个前后两排的岛、东边一簇，高低不一、有的歪倒；岛上和地上错列 CRT 终端；北边一排错层的 ERROR 电视，中间的缝就是去核心的夹道，树的光从后面透过来。九个文件记录点分布在这里和通道里，读取效果（变薄、镜子、平台重排、全息快照……）照旧。
- **D 世界树核心**：两侧高机柜夹出的窄道，走出来才看到整棵树（树随距离逐步显露：入口几乎只有一点光，机房里从电视墙后透出，进夹道后完全显露）。`sealed_truth.enc`、`world_03.plan`、Kimo熊都在这里；Kimo熊的站点 ID、台词、条件没有动。

### 截图（游戏实际运行，1280×720）
| 内容 | 旧 | 新 |
|---|---|---|
| 进场 | `qa/archive_before_1_entry.png` | `qa/archive_after_1_entry.png` |
| CRT 区 | `qa/archive_before_2_crt.png` | `qa/archive_after_2_crt.png` |
| 网格通道 | （旧版没有） | `qa/archive_after_3_grid.png`、`qa/archive_after_6_loop.png` |
| 数据区 | `qa/archive_before_3_data.png` | `qa/archive_after_4_data.png`、`qa/archive_after_4b_errorwall.png` |
| 树 / 出口 | `qa/archive_before_4_tree_exit.png` | `qa/archive_after_5_tree_core.png`、`qa/archive_after_5b_kimo.png` |
| 俯视 | `qa/archive_before_topdown.png` | `qa/archive_after_topdown.png` |
| 并排对照 | `qa/archive_compare_1..4.png`、`qa/archive_compare_topdown.png` | |
| 画质 | 高：`*_1_entry.png` / `*_3_grid.png`；中：`*_medium.png`；低：`*_low.png`（关泛光、漂浮物减半，几何不缺） | |
| 竖屏 + 减少动态 | `qa/archive_after_portrait_reduceMotion.png`（540×960） | |
| 读取 | `qa/archive_read_news_archive.png`、`archive_read_trace_tvhead.png`、`archive_read_sealed.png`、`archive_kimo_talk.png` | |

镜头参数：进场旧版 P=(0,13)、yaw 0 / pitch 0.32 / dist 6.5；新版 P=(0,37.6)、yaw 0 / **pitch 0.20** / dist 6.5——新入口的镜头在碎电视框里，0.32 会顶到框的上沿，所以新版默认俯角改成 0.20。其余新图的玩家位置与镜头写在 `docs/qa/archshot.py` 的调用参数里（见本文件第 0 节）。build：本分支 v0.16.1，开发版。

### 交互与回归
- `archive_reach.py`：从出生点出发的格子搜索覆盖 23,645 格（0.2 m），**12 个文件/出口 + Kimo 全部可达**（到每个交互范围的最近距离 ≤ 0.07 m）。真实键盘：按住 W 前进、往左撞电视堆被挡住。
- `archive_regress.py` **16/16**：九个文件逐个 F 读取 / Esc 关闭；新闻存档「世界变薄」演出出现并复原；`world_03.plan` 仍是 ACCESS DENIED；`sealed_truth.enc` 错误密钥被拒、`22966160` 打开 LOG-SYS-A770；Kimo熊对话；从入口的门离开触发 `onExit(true)`；无页面错误。
- `archive_leak.py`：反复进出 10 次，canvas 数量不变，每次都是新的渲染器。开发模式下 JS 堆每次约 +0.3 MB；同一脚本跑 v0.16.0 是每次约 +0.5 MB，属于原有的开发模式残留，**没有完全归零**，如实记录。

## 3. P0-C 文案
- 逐字替换 13 处（脚本按「原文必须恰好出现一次」执行，任何一处对不上就停）。`grep 接住|接不到` 只剩第一章豆沙抱室友姐的「嘿嘿，接住我啦！」（按要求保留）。
- 客厅的钟：对话场景没有客厅模型，所以在 `c1_l2.end` 这段对话的背景里真的画了一个指着七点整的挂钟（`SceneNode.prop = 'clock7'`），街角的钟和手账「七点整」不变。截图 `qa/uaua_c1_l2_end_clock.png`。
- 选项截图：`qa/uaua_c1_l1_deny_choice.png`、`uaua_c1_l2_rw_choice.png`、`uaua_c1_l5_pull_choice.png`；Kimo熊：`qa/kimo_c2_l2_a.png`、`kimo_c2_l5_a.png`。
- 剧情结构：25 个场景、71 个节点、**71 条路线**，结构签名（节点 / 台词条数 / 跳转 / aff / ng）与 v0.16.0 **完全一致**（`diff` 为空）。
- 第二章游戏内提示：原来的「⟡ 悠亚降临！所有次元同时存在」拆成两处——锁定的「⟡ 悠亚来了。」走新的轻提示，关卡内的玩法提示只留「所有次元同时存在 / 次元恢复分层」。

## 4. 发布与授权
- 专属曲的**公开发布授权待确认**（见 `UNRESOLVED_ASSETS.md`）。仓库推到 GitHub 后，Pages 会把这个文件公开出去。
- 本次没有推送 GitHub。
- 测试用的私人 Artifact **没有放这首歌**（不把音源传到其他地方），那里进悠亚形态会显示「这首曲子的音源还没有安装。」，其余功能相同。
