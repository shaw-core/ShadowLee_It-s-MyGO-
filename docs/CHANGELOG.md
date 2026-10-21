# CHANGELOG

## v0.16.1 · uaua 专属曲与在场事件 / 隐藏档案馆重建 / 文案更正（分支 fix/dialogue-art-ending-polish）

### P0-A 悠亚
- `core/audio.ts`：`enterUauaPresence(origin)` / `leaveUauaPresence(reason)`，幂等；专属曲走 WebAudio 增益（淡入 1.5 s，淡出 1.0 s，给随身听让路 0.25 s）；场景配乐 `score.duckBy('uaua')` 约 1 s 淡出；循环跳过首尾静音（0.2 s / 217.9 s）；自动播放受限时等下一次输入；音源加载失败提示「这首曲子的音源还没有安装。」并保持场景配乐
- 秘密悠亚形态（Y / 咒语）复用同一套事件；变魔法熊猫、切关、重开、回菜单都会离场
- 随身听：曲目加 `id`，前 10 首下标不变；`uaua_kanashibari` 在 `flags: music:uaua_kanashibari` 后追加到末尾；首遇提示「随身听新增曲目：《かなしばりに遭ったら》」；悠亚在场时随身听屏幕显示这首歌
- 轻提示组件 `components/AudioNotice.tsx`
- 第二章首通终端：两行锁定文本 + 监控画面伏笔（`components/ForeshadowFeed.tsx`），只在第一次播放

### P0-B 隐藏档案馆
- 新增 `game3d/archiveZones.ts`（CRT / 碎框 / 网格走道 / 圆环 / 拉弯显示器 / 漂浮物 / 机柜簇）与 `game3d/archiveLayout.ts`（四个分区、可走区域、显式记录点坐标）
- `Archive3D.tsx`：记录点改显式坐标；可走区域 + 带朝向方盒碰撞；镜头防钻进电视堆；世界树随距离显露；低画质关泛光、减半漂浮物；减少动态时漂浮/圆环/雪花屏放慢；卸载时释放几何/材质/贴图
- 删除旧的一圈 40 台等距机柜（`buildServerRoom`）

### P0-C 文案（按编剧锁定稿逐字）
- `c1_l1.deny`、`c1_l2.rw`、`c1_l5.pull` 选项；`c1_l2.end` 四句 + 对话背景里画出七点整的钟（`SceneNode.prop = 'clock7'`）
- 第二章 Kimo熊「接住」→「送回来」（c2_l2.a、NOTE、c2_l5.a 三句、文件头注释）；手账 p_kimo2 / w_crack / w_end

## v0.16.0 · 对白重写与关卡 / 房间细节修复（分支 fix/dialogue-art-ending-polish）

### 对白（按 `docs/implementation-pack/02_正式对白替换稿.md` 导入）
- 第一章第 1–6 话与五个小剧场、第二章序章 / 熊猫 / 五关 / 终章旁白 / 五个小剧场
- 漫画分镜气泡（c1_open、c2_mid1–4）、室友姐随口话（替换重复句）、手账四页（室友姐、Kimo熊 · 熊猫、世界的接缝、没有存档点的地方）
- 第一章第 7 话、真结局原文、隐藏档案 / 终端 / Kimo熊与电视头的对话保持原样
- 对照表：`docs/DIALOGUE_MAPPING.md`

### 修复
- 第二章地刺：尖刺铺满整块伤害区，去掉「看起来是地面却会死」的边缘带（第 2、4、5 关）
- 第一章第 1 话：整张床垫都是弹簧，床头板 / 床尾板不弹；弹起时整张床垫起伏
- 真结局房间：3D 软枕头和熊猫玩偶重做，床铺重做；2D 房间用单独的床（枕头 + 玩偶，无弹簧圈）；2D 房间绘制循环不再因父组件重渲染而重启

### 验证
- `docs/AUDIT.md`（根因与修改位置）、`docs/QA_CHECKLIST.md`（逐项结果）、`docs/qa/`（截图）、`docs/UNRESOLVED_ASSETS.md`

### 未执行
- 执行包 P1-5「按 vupfight 低多边形方向重做角色模型」：与已确认的体素方向冲突，待确认
