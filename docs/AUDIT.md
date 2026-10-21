# AUDIT · 修改前清单与问题定位（v0.16.0）

- 基线：分支 `v0.14.0-rebuild` @ `a6f499a`（v0.15.3）
- 工作分支：`fix/dialogue-art-ending-polish`（未推送，按 Kan 的要求只交付 zip）
- 执行依据：`docs/implementation-pack/01–04`
- 工具：仓库没有 lint / test 脚本；用 `npx tsc --noEmit` 做类型检查，`npm run build` 构建，`dev/validate2d.ts` 做第一章关卡可达性校验，Playwright + Chromium（swiftshader）截图

## 仓库扫描

| 目录 | 内容 | 与本次相关 |
|---|---|---|
| `story/` | chapter1 / chapter2 / barks / cutscenes / codex / types | 对白导入 |
| `components/` | GameEngine（2D）、GameEngine3D、TrueEnding、Archive3D、MatrixEnding、DialogueSystem… | P0 / P0.5 |
| `game2d/` | levels、physics、props、world（像素绘制） | 弹簧床、2D 房间床 |
| `game3d/` | levels3d、voxworld（地刺等体素件）、voxelChars（角色）、characters3d | 地刺、企鹅 |
| `assets/room-photos/` | 8 张照片墙合影（`dev/photos.html?shot=0..7` 可重拍） | 照片墙 |
| `public/` | 不存在 | — |

## P0（之前版本已修，本次重新验证）

| # | 问题 | 文件 | 结论 | 验证 |
|---|---|---|---|---|
| 1 | 悠亚形态企鹅替换熊猫未生效 | `components/GameEngine3D.tsx`（setYua → setYuaForm）、`game3d/voxelChars.ts` | 已生效。v0.15.0 修复了 `setYuaForm` 只在退出时调用的 bug（v0.14.0 我留下的悬空 `if (!on)`） | 遍历场景图统计 `checkpoint:panda / checkpoint:penguin` 的实际可见性：切换前 熊猫 3 显示 / 企鹅 3 隐藏；悠亚 熊猫 3 隐藏 / 企鹅 3 显示；悠亚中掉落重生后保持企鹅；切回恢复熊猫。截图 `qa/p0-1_penguin_states.jpg`。Kimo熊（世界尽头）、房间熊猫玩偶是独立模型，不受影响 |
| 2 | 真结局房间特殊 CG 闪烁 | `components/TrueEnding.tsx` | 3D：CG 与相邻相框在墙面上不相交，照片平面比背板前 1.5cm，场景只在换外观时重建，无 z-fighting / 重复构建。2D：绘制循环原本依赖父组件传入的回调，父组件重渲染会重启循环 → 本次改为 ref | 固定镜头连续 8 帧取 CG 区域像素差：最大 7/255、平均 < 0.5（来自台灯 / 屏幕光的正常呼吸），`qa/p0-2_cg_still.jpg` |
| 3 | 墙上占位照片 | `assets/room-photos/`、`TrueEnding.tsx` | 已是本地游戏渲染合影 ×8 + 原有特别 CG；无占位、无外部图片 | 见 `UNRESOLVED_ASSETS.md` |
| 4 | 2D 房间书桌没有桌面 | `TrueEnding.tsx` Room2D | v0.15.0 已补独立桌板 | 2D 房间截图 `qa/p05-6-7_room_bed_before_after.jpg` 右下 |

## P0.5（本次修复）

### 5. 隐形致死地刺
- **位置**：第二章 · 第 2 关 `l2_hz1`(x=15,z=-10.4) / `l2_hz2`(x=15,z=-6.6)，第 4 关 `l4_hz1`(x=23,z=-13.2)，第 5 关 `l5_hz1`(x=24,z=-1.6) / `l5_hz2`(x=26,z=1.6)
- **根因**：`game3d/voxworld.ts` 的 `voxSpikes` 从边缘第 2 格（0.1m 体素）起每 5 格放一根尖刺，最后一根落在离 +x / +z 边缘 0.2–0.5m 处；而伤害判定（`GameEngine3D.tsx`，四周各缩 0.1m）一直覆盖到离边 0.1m。地刺区平铺在草地平台上，0.1m 厚的底板被平台草皮盖住，那一条看起来就是普通地面 —— **多出来的是判定，漏掉的是绘制**
- **修复**：尖刺在两侧边缘之间对称均匀分布（间距 ≤ 0.5m），最外一排外沿正好落在判定边界；判定范围不变，未扩大
- **第一章 2D 地刺**：按格绘制、按同一格判定（`game2d/world.ts` / `physics.ts`），一致。三处道具压在地刺上（L3 仙人掌盆栽、L4 传送带、L5 水池）：仙人掌和水池本身就是可见危险，传送带画在地刺下层、地刺照样露出，均非「看着是地面」
- **调试图**：开发模式 `dev/engine3d.html?lv=N&hzdebug` 红框显示伤害判定；`qa/p05-5_spikes_before_after.jpg`（左：修改前，红框内有空白带；右：修改后铺满）
- **数值核对**：五块地刺区修改后尖刺外沿 = 判定边界（x、z 两个方向，见 QA_CHECKLIST）

### 6 / 7. 真结局房间床上的枕头与熊猫玩偶
- **根因**：3D 房间用 10cm 体素一次性堆出整间屋子，枕头是 5×3×3 的白砖斜放在床前角；熊猫玩偶是一个半径 2 格的椭球加 4 个黑点。2D 房间直接复用第一章的 `bed` 道具（只有一个椭圆枕头，没有玩偶）
- **修复**（`components/TrueEnding.tsx`、`game2d/props.ts`）：3D 枕头和玩偶改为单独的细体素网格（2.5cm / 1.8cm），枕头为超椭圆鼓起 + 压痕，熊猫玩偶为完整坐姿公仔 + 蓝丝带；床铺重做（床单、床头板、翻折被子、前侧下垂）。2D 房间改用新道具 `roomBed`
- **与企鹅替换的关系**：房间玩偶是独立模型，不经过 `setYuaForm`，悠亚形态不会替换它
- **截图**：`qa/p05-6-7_room_bed_before_after.jpg`

### 8. 第一章弹簧床
- **位置**：第一章第 1 话，床面第 17 行 x=60–74
- **根因**：只有 x=67 一格是弹簧格（`game2d/levels.ts`），且被前景被子图覆盖，看不出哪里能弹
- **修复**：x=61–73 全部为弹簧格；x=60 床头板、x=74 床尾板为普通实心。床的图画出侧面一圈弹簧圈；弹起时整张床垫从落点起伏（`components/GameEngine.tsx`）
- **物理验证**（物理引擎直接落体，`step()`）：床垫 13 格每格的左 / 中 / 右三个落点全部触发弹跳，vy = -9.4（与原来相同）；完全落在床头板 / 床尾板为普通落地；连续弹跳正常
- **截图**：`qa/p05-8_spring_bed.jpg`

## 对白导入（02）
见 `DIALOGUE_MAPPING.md`。所有场景 id、节点、start、page、mood、choices.next、aff、ng 沿用原代码（程序比对：0 处差异）；02 中每一句都已进入代码（程序比对：0 句遗漏）；c1_l7 未改动（逐字段比对相同）。

## 未执行 / 待确认
- **P1-5 角色模型按 vupfight 低多边形方向重做：未执行。** 与 Kan 在 v0.15.1 / v0.15.2 已确认的方向冲突（第二章角色按立绘做体素小人，参考 arknights-character-console 的建模方法；Kan 明确否定了圆润 / 粘土风）。需要 Kan 拍板后再动
- **P1-6 叙事演出**：本次只做了对白层；新的镜头 / 演出没有加
- **02 未覆盖的选项按钮**：原样保留，其中 3 处与新台词衔接不顺（见 `DIALOGUE_MAPPING.md` 第五节）
- **「接住」说法**：02 让 Kimo熊和两人用「接住 / 接不到」描述存档点。Kan 早先否过「接住」这个说法；本次按 02（执行包）导入，请确认
- **手账 p_panda**：「小室说它是存档点」——新对白里小室没这样说，02 未列入修改，保留
- **移动端 / 不同刷新率**：未在真机测试；CG 稳定性只在 headless Chromium 测过
