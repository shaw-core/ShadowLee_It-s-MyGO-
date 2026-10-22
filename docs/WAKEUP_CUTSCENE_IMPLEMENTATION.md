# 第二章独立过场《快醒醒！》· 实现说明（v0.16.2 – v0.16.4）

依据：《ShadowLee_Claude_CH2_快醒醒_最终执行文稿.md》。对白、两句大字、镜头顺序按文稿逐字实现，没有改写或添加台词。

## 1. 修改 / 新增文件

| 文件 | 内容 |
|---|---|
| `components/UauaWakeupCutscene.tsx`（新） | 全屏过场组件：时间轴（镜头 A–G）、像素大字、字幕、画外音标记、声音、跳过 |
| `components/UauaPixelSprites.tsx`（新） | 手画像素精灵：企鹅两帧（32×32）、外星人头像（32×32）、两人低对比剪影（40×34），SVG 方格渲染 |
| `App.tsx` | 新增画面状态 `{ k: 'wakeup'; replay? }`；`finishChapter(2)` 先进过场，`onWakeupEnd` 再接原有 `c2_end` → `cleared2` → `matrix`；过场时场景配乐为 null、随身听面板隐藏；手账回放入口 |
| `components/Codex.tsx` | 手账「回忆 · 漫画分镜」里，看过之后多一个「快醒醒！」回放按钮 |
| `docs/qa/wakeup_test.py`、`docs/qa/wakeup_replay_test.py`（新） | 自动化测试 |
| `docs/qa/wakeup_*.png` | 实机截图 |

**没有改动**：`MatrixEnding.tsx`、`story/chapter2.ts`（含 `c2_end`）、`c1_l7`、真结局、隐藏档案、密码、结局判定、存档点外形、悠亚在场事件与随身听解锁逻辑。

## 2. 流程

```
第五关 onFinish → 结算 → c2_l5 对话 → advance(2, 最后一关) → finishChapter(2)
  → setScreen({k:'wakeup'})  ── 全屏《快醒醒！》（约 74 秒）
  → onWakeupEnd()  （ref 保护，只执行一次）
      markSeen('cut:c2_wakeup')
      setScreen({k:'blank'}) → playStory(c2_end)  ── 原有终章旁白，配乐 ending
      → updateSave(cleared2 = true) → setScreen({k:'matrix'})  ── 原有终端结局
```

- 每次通关第二章都会播放；第一次没有跳过按钮，看过以后右上角有「跳过」，要再点一次「再点一次跳过」才生效。
- 手账回放：`{k:'wakeup', replay:true}`，结束或跳过后回到手账，不写任何通关存档。
- 时间轴用 rAF 推进，页面切到后台时暂停；点击 / 空格 / 回车 / F 只会把当前这句字幕提前结束，不会跳过镜头。
- 支持 `prefers-reduced-motion` 和游戏设置里的「减少动态」：关掉错位叠闪、企鹅摆动、重影、漂浮动画、扫描线滚动，保留淡入淡出。

## 3. 镜头与时间（秒）

| 镜头 | 时间 | 画面 | 字幕 |
|---|---|---|---|
| A | 0–4.5 | 几道蓝线收拢、深色褪去，白光铺满；低频下沉 + 一层气声 | 无 |
| B | 5–12 | 外星人头像出现，7.0 / 8.1 两次蓝色错位叠闪，企鹅盖过它并稳定，两帧轻摆 + 淡蓝光晕 | 无 |
| C | 12–20 | 企鹅上移；13.0「快醒醒！」跳出，14.9「快醒醒，豆沙！」；各至少完整停留 ~5 秒 | ？？？「快醒醒！快醒醒，豆沙！」 |
| D | 20–34 | 白雾里两人的低对比剪影（戴熊猫耳帽的豆沙、长发的室友姐，牵着手） | 5 句 |
| E | 34–47 | 企鹅放大一小格、蓝色像素点扩散；末尾雾光变亮、图案重影 | 5 句 |
| F | 47–59 | 企鹅轮廓再清晰一次，随后从上往下溶解 | 4 句 |
| G | 59–74 | 企鹅缩小淡去，蓝光过渡；最后淡出到白 | 6 句 |

画外音一律标「？？？」，不出现悠亚的名字牌、立绘或正脸；「uaua」只出现在李豆沙自己的台词里。没有配音，只有字幕。

## 4. 声音

- 进入过场：`App.tsx` 把场景配乐设为 null，原关卡配乐按 `score` 原有方式淡出，不叠音。
- 镜头 A：组件自己的 AudioContext 里一声低频下沉（120→42 Hz）加一层带通噪声，4 秒内淡出。
- 镜头 C（15.2 秒起，按时间轴触发）：`public/audio/uaua_kanashibari.mp3` 从第 62 秒处取一段，经过 120 Hz 高通 + 650 Hz 低通，音量为正常 BGM 的 22%（master×bgm×0.22），0.7 秒淡入、约 3.6 秒后淡出并暂停。不循环、不调用悠亚在场事件、不解锁随身听曲目。
- 随身听正在放歌时（玩家主动），不放这一小段，遵循原有「随身听优先」。
- 卸载时：取消计时器，暂停并清空 `<audio>`，关闭 AudioContext。之后 `c2_end` 的 `ending` 配乐按原规则播放。
- 播放失败（自动播放限制、音源缺失）时静默跳过，字幕和流程不受影响。

## 4a. 画面（v0.16.4，按 Kan 的新要求）
- **半梦半醒**：椭圆形的「眼皮」视野——沉沉半合，在 25.4 / 30.6 / 41.8 / 55.6 秒慢慢合上又睁开；每次「？？？」开口时一惊、睁开一点；镜头 G 醒来时完全睁开。
- **失焦与对焦**：梦境层（雾、漂浮像素、外星人）整体模糊并随呼吸轻轻起伏；每声呼唤的瞬间猛地对焦、企鹅短暂红蓝色偏、从企鹅处荡开三圈波纹。呼唤一次比一次清楚：基础模糊从 2.4 px 降到 0.9 px，波纹越来越大、越来越亮——和声音里「睡意低通一次比一次打开」对应。
- **电视头小豆结尾的质感**：老电视玻璃那样的圆角暗角、扫描纹、慢慢下滚的干扰亮带。
- **电子企鹅**：企鹅和外星人画在点阵电子屏上（`LedSprite`）：深色小屏、发光圆灯珠、没亮的灯珠隐约可见、扫描线、高光。企鹅仍可分辨圆头、两只眼睛、小嘴、深色背、浅色肚皮、两侧短翅、两只脚（截图见下）。
- **终端风格的字**：两句大字改为和后面终端同一套等宽字体，逐字打出、方块光标闪烁、字身扫描线 + 蓝色辉光（仍是蓝色，文字不变）；字幕改为深蓝终端面板、等宽字、逐字打出时带光标。
- 「减少动态」/ `prefers-reduced-motion`：不眨眼、不摆动、不色偏、不滚动干扰带，只保留淡入淡出和很轻的眼皮暗角。

## 4b. 背景声（v0.16.3，`components/wakeupAudio.ts`）

方向：像电视头小豆结尾那段演出的氛围，但不是「代码」的声音，而是半梦半醒之间听到有人在喊自己。全部 WebAudio 现场合成，没有用录音素材。

- **梦境底**（2.8 秒起淡入，跟着画面起伏）：
  - 和终端结尾同一种底：54 / 54.7 Hz 两支失谐锯齿波，低通 220 Hz 慢慢扫动（更轻、更远）
  - 每 8 秒慢慢换一个柔和和弦（D–B–G–A 一组循环），带 ±9 音分的「磁带晃动」
  - 高处若有若无的闪光音、一个很细的耳鸣似的高音、呼吸一样起伏的空气声
  - 全部泡在 5.5 秒的暗混响里，整体低通慢慢开合——时而清楚时而模糊
  - 「？？？」开口时、歌曲片段漏进来时让一点路；镜头 E 末尾和镜头 G 的蓝光时略微涌起；结尾和画面一起淡出
- **电子呼唤**（每句「？？？」台词触发一次，共 5 次）：
  - 开口前一口很轻的气声涌上来
  - 锯齿 + 三角波声源 → 按字给元音共振峰 → 轻微降位数（7 bit）→ 一点环形调制 → 「睡意」低通 → 远近两条回声 + 长混响
  - 一次比一次清楚：第一声低通 850 Hz（闷在被子里），到第五声开到约 2550 Hz、混响减少
  - 喊的句子（带「！」）音高更高、最后一个字往上挑
  - 不是配音，听不出具体字词
- **没有**打字声、数据蜂鸣、终端提示音。
- 页面切到后台时暂停；过场结束 / 跳过时全部停止并关闭音频上下文。
- 试听样本：`dev/wakeup_audio.html` 用和游戏相同的时间轴、相同代码离线渲染（不含歌曲片段）。频谱图：`docs/qa/wakeup_sound_spectrogram.png`。整段峰值 −10 dBFS，没有削波。

## 5. 测试

### `npm run build`
```
dist/assets/special_cg-DqbI4pNI.png       1,566.76 kB
dist/assets/kumoito_8bit-vEX1KwLM.mp3     2,316.42 kB
dist/assets/haruhikage_8bit-B6iOyBdI.mp3  2,720.94 kB
dist/assets/index-MTcEQVE0.css               62.04 kB │ gzip:  12.34 kB
dist/assets/index-CPxAqEuP.js             1,373.96 kB │ gzip: 424.83 kB
✓ built in 8.87s
```
`npx tsc --noEmit -p .` 通过。剧情结构检查：25 个场景、71 个节点、71 条路线，没有坏链接（`c2_end` 未改动）。

### `python3 docs/qa/wakeup_test.py`（真实 Chromium，真实解码 mp3）
```
PASS scene BGM stopped during the cutscene (score scene = null, no uaua presence) {"reasons": [], "suppressed": false, "duckGain": 1, "scene": null}
PASS cutscene shows instead of the terminal, lasts 55–80 s 76.8 s
PASS all 21 locked lines appear in order 21 lines: ['快醒醒！快醒醒，豆沙！', '……诶？', '怎么了？']…['……算了。', '可能是我还没缓过来吧。']
PASS song snippet: low-pass ~650 Hz, peak gain ≈ 22% of BGM, stopped afterwards {"t": 62.797333, "paused": false, "gain": 0.08910000324249268, "lp": 650, "level": 0.08910000000000001, "ended": false, "peak": 0.08910000324249268, "at": 16.1} after: {"paused": true, "gain": 0}
PASS after the cutscene: original c2_end dialogue plays (not the terminal yet) screen=blank
PASS c2_end → cleared2 written → Matrix terminal screen=matrix cleared2=True
PASS walkman track NOT unlocked in chapter 2 []
PASS seen flag for replay written 
PASS no page errors []
9/9 passed
```
说明：时长是测试脚本看到的墙上时间（含轮询开销），组件时间轴总长约 74 秒。

### `python3 docs/qa/wakeup_replay_test.py`
- 手账「回忆」里点「快醒醒！」→ 进入回放 ✔
- 回放中连点 12 次画面不出错；「跳过」→「再点一次跳过」→ 回到手账 ✔
- 存档不变（cleared2 不被改写、随身听曲目未解锁）✔
- 首次观看没有跳过按钮 ✔

### 其他回归
- `docs/qa/audio_test.py`（悠亚在场事件 / 随身听）：24/24 通过（404 一项需要另起静态服务器，本次未重跑）。

## 6. 截图（游戏实际运行）
- `docs/qa/wakeup_penguin.png`：企鹅单独画面（镜头 B 末）
- `docs/qa/wakeup_bigtext.png`：两句蓝色大字 + 画外呼唤
- `docs/qa/wakeup_dialogue.png`：白雾中两人对话
- `docs/qa/wakeup_signal.png`、`wakeup_uaua_named.png`、`wakeup_wake.png`：镜头 E / F / G
- `docs/qa/wakeup_*_mobile.png`：390×844 竖屏前三镜
- `docs/qa/wakeup_then_c2_end.png`：过场结束后接上原有 c2_end

## 7. 未完成 / 需要你确认
- **人耳试听未完成**：歌曲片段的位置（第 62 秒起）和音量是按数值设定的，我听不到，请真机听一下是否合适，需要调的话改 `SNIP_FROM` / 22% 两个数。
- 没有配音，画外音只有字幕（按文稿要求，不冒充配音）。
- 歌曲的公开发布授权仍待确认（同 v0.16.1）。
- 没有推送到 GitHub。
