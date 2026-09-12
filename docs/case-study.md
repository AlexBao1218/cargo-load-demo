# Cargo Load Planner — Case Study

English first, 中文在后半部分。Items marked `[TO FILL]` are facts the owner has to confirm before publishing; nothing there has been invented.

---

## Context

The Cathay Cargo Hackathon 2025 asked how AI, computer vision and emerging technologies could make cargo handling more efficient and more sustainable. Our team of HKU Industrial Engineering students reached the final, a 24-hour build at Cathay City. We came in with preliminary-round work on predictive maintenance applied to cargo logistics — an idea carried over from an IGC internship — extended with IoT sensors on high-value shipments (pharmaceuticals, special declarations) to flag anomalies early. On the final day we went off-prompt and built something narrower and more concrete: a ULD load planner.

Team size: `[TO FILL]`. Final result: finalist; placing and judges' feedback `[TO FILL]`.

## Problem

Where the containers (ULDs) go on a freighter decides where its centre of gravity (CG) sits, and CG has a large effect on fuel burn. The load planning we saw during the hackathon was surprisingly informal for a decision with that much money behind it. That made it a real pain point rather than a hackathon-shaped one: a planner needs to see the aircraft, move things around by hand, and have a machine handle the arithmetic of "where should the rest go so the CG lands on target".

## What we built in 24 hours

A 2D load-planning tool that plays like a packing game. The left panel showed a top-down view of the empty aircraft with its ULD positions; the right panel listed the weighed, packed cargo. You dragged items from right to left and a bar at the top showed the live CG.

Behind it was a MILP (mixed-integer linear programme) based on academic load-planning literature: binary variables for "this ULD in that position", each ULD placed exactly once, each position used at most once, and an objective that minimised the distance between the resulting CG and the target. It ran server-side with a hosted database behind it.

The pitch was explicitly human-in-the-loop: irregular operations and multi-leg journeys need a person's judgement, and that was the direction we named for future work.

## What the rebuild changed (2026)

The portfolio version is a clean-room rewrite in a separate repository. The point was to make the demo feel like an airline app instead of a hackathon prototype, and to make the optimisation story honest and verifiable in the browser.

| | Hackathon (2025) | Rebuild (2026) |
|---|---|---|
| Aircraft view | 34 position cards in a vertical list | Horizontally scrollable top-down fuselage with section tabs (Nose · Fwd · Mid · Aft · Tail) |
| Placing a ULD | Drag only | Drag-and-drop on desktop, tap-to-place on mobile, invalid targets flagged before you drop |
| Human-in-the-loop | Manual placement, then optimise everything | Lock / pin any position; the solver treats it as fixed and plans around it |
| Feedback | CG number in a top bar | Sticky CG gauge with target band and tolerance, 0–100 score, solve time, per-tile capacity bar |
| Model | Assignment + CG deviation | Assignment + CG deviation, **plus** position weight limits, ULD-type compatibility (nose positions take AKE only), lateral left–right balance penalty, user locks |
| Solver | GLPK on a server, database in the loop | GLPK compiled to WebAssembly (glpk.js) in a Web Worker — nothing leaves the browser |
| Scenarios | Hackathon JSON | Same synthetic data, three loads: CX2025 full (34 ULDs), CX1234 partial (24), CX5678 light (16) |
| Explainability | Slides | "How it works" drawer showing the variables, constraints and objective, and the last solve's size and time |
| Stack | Web app with hosted backend | Vite + React 19 + TypeScript, zustand, dnd-kit, Tailwind v4; static SPA, no backend |

The model in one paragraph: every ULD–position pair that fits (weight under the position limit, type allowed) gets a binary variable `x[i,j]`. Each ULD sums to exactly one; each position sums to at most one; locked pairs are fixed at one. The longitudinal CG is `Σ w_i a_j x[i,j] / W`, which is linear because total weight `W` is a constant. Deviation from the target and the absolute lateral moment are linearised with two inequalities each, and the objective is `minimise deviation + 0.05 × |lateral moment| / W`. Score is `100 × max(0, 1 − deviation / tolerance)`. The full 34-ULD case has at most 34 × 34 binaries and solves in under two seconds in the browser. The derivation, the original hackathon formulation and a comparison with the load-planning literature are in [`algorithm.md`](algorithm.md).

Disclosure: the data is the hackathon's synthetic scenario data, re-scaled to plausible freighter magnitudes. It is not real airline data. The Cathay Cargo logo was removed; the flight numbers `CX2025 / CX1234 / CX5678` were kept as scenario labels by the owner's decision. Attribution is the text line "Alex Bao · Cathay Cargo Hackathon 2025 Finalist".

## Results

- Hackathon: finalist. Placing, prize and judges' comments `[TO FILL]`.
- Team size and roles `[TO FILL]`.
- Rebuild: all three scenarios solve to `optimal` in 40–360 ms in the browser; typecheck, lint, tests and build clean; verified at 1280 px and 375 px.

## Lessons

Going off-prompt on the final day was a risky call, made on the strength of our preliminary-round work. It cost us hours of discussion and left us without a dedicated cargo judge to give feedback on the pitch. Next time: time-box the decision and prepare parallel pitch decks.

In a 24-hour hackathon, presentation prep has to happen during the build, not after it. We vibe-coded right up to the deadline and had too little time to polish the story. Even good work needs a good story.

The rebuild added a third lesson: the hackathon model was smaller than the pitch implied — no weight limits, no lateral balance, no locks. Making the demo honest meant putting those constraints in and showing the formulation on screen, not just saying "MILP".

---

# 货机配载规划 — 案例

## 背景

Cathay Cargo Hackathon 2025 的题目是：如何利用 AI、计算机视觉和新兴技术提升货运处理的效率与可持续性。我们团队由港大工业工程学生组成，进入决赛——在国泰城进行的 24 小时开发。我们带着初赛的方案进场：把 IGC 实习中接触过的预测性维护思路延伸到货运物流，对高价值货物（医药、特殊报备货物）加装 IoT 传感器，实时检测异常、提前预警。决赛当天我们跳出题目，做了一个更窄也更具体的东西：ULD 配载规划工具。

队伍人数：`[TO FILL]`。结果：决赛入围；名次与评审反馈 `[TO FILL]`。

## 问题

集装设备（ULD）放在货机的哪个位置，决定了飞机重心（CG）的位置，而重心对燃油消耗影响巨大。我们在黑客松期间看到的配载流程，相对于它背后的金额来说出人意料地随意。这让它成为一个真实的痛点，而不是为黑客松量身定做的题目：配载员需要看到飞机，需要手动挪动货物，也需要机器来算"剩下的放哪里才能让重心落在目标上"。

## 24 小时里做出来的东西

一个玩起来像装箱游戏的 2D 配载工具。左侧是空货机的俯视图，标注了 ULD 仓位；右侧是称重打包后的货物列表。把货物从右拖到左，顶部的数据栏实时显示重心。

背后是基于配载学术文献的 MILP（混合整数线性规划）：用二元变量表示"这个 ULD 放在那个仓位"，每个 ULD 恰好放一次，每个仓位最多用一次，目标函数是最小化结果重心与目标重心的距离。它在服务端运行，后面挂着托管数据库。

Pitch 里明确强调人机协作：突发事件和多航段运输需要人的判断，这也是我们提出的未来方向。

## 重制版改了什么（2026）

作品集版本是在独立仓库里从零重写的。目的有两个：让 demo 像航空公司的应用而不是黑客松原型；让优化的故事在浏览器里就能被验证。

| | 黑客松版（2025） | 重制版（2026） |
|---|---|---|
| 飞机视图 | 34 张仓位卡片竖排列表 | 可横向滚动的机身俯视图，带分区标签（机头 · 前 · 中 · 后 · 机尾） |
| 放置 ULD | 只能拖拽 | 桌面端拖拽，手机端点选放置；放下之前就标出不可用的仓位 |
| 人机协作 | 手动放完再整体优化 | 任意仓位可锁定；求解器把它当作固定条件，围绕它规划 |
| 反馈 | 顶部一个重心数字 | 底部常驻重心仪表（目标区间、容差）、0–100 分数、求解耗时、每个仓位的载重条 |
| 模型 | 指派 + 重心偏差 | 指派 + 重心偏差，**加上**仓位载重上限、ULD 类型兼容（机头仓位只收 AKE）、左右横向平衡惩罚项、用户锁定 |
| 求解器 | 服务端 GLPK，数据库参与 | GLPK 编译成 WebAssembly（glpk.js），在 Web Worker 里跑——数据不离开浏览器 |
| 场景 | 黑客松 JSON | 同一套合成数据，三种载荷：CX2025 满载（34 个 ULD）、CX1234 部分（24）、CX5678 轻载（16） |
| 可解释性 | 幻灯片 | "How it works" 抽屉，显示变量、约束、目标函数，以及上一次求解的规模和耗时 |
| 技术栈 | 带托管后端的 web 应用 | Vite + React 19 + TypeScript、zustand、dnd-kit、Tailwind v4；静态 SPA，无后端 |

模型一段话说完：每一对放得下的 ULD–仓位（重量不超上限、类型允许）对应一个二元变量 `x[i,j]`。每个 ULD 的变量之和恰好为 1；每个仓位的变量之和至多为 1；锁定的配对固定为 1。纵向重心是 `Σ w_i a_j x[i,j] / W`，因为总重 `W` 是常数，所以它是线性的。与目标的偏差和横向力矩的绝对值各用两条不等式线性化，目标函数是 `最小化 偏差 + 0.05 × |横向力矩| / W`。分数是 `100 × max(0, 1 − 偏差 / 容差)`。满载 34 个 ULD 的情形最多 34 × 34 个二元变量，在浏览器里两秒内求解。完整推导、黑客松原始模型以及与配载文献的比较见 [`algorithm.md`](algorithm.md)。

披露说明：数据是黑客松的合成场景数据，按货机的合理量级重新缩放，不是真实航空数据。国泰货运 logo 已去除；航班号 `CX2025 / CX1234 / CX5678` 经作者决定保留为场景标签。署名为文字一行："Alex Bao · Cathay Cargo Hackathon 2025 Finalist"。

## 结果

- 黑客松：决赛入围。名次、奖项、评审意见 `[TO FILL]`。
- 队伍人数与分工 `[TO FILL]`。
- 重制版：三个场景都在浏览器里两秒内求得 `optimal`；typecheck、lint、测试、构建全部通过；在 1280 px 和 375 px 下验证。

## 经验教训

决赛日跳出题目是一个冒险的决定，底气来自初赛的方案。它消耗了大量讨论时间，也让我们没有专门的货运评审来对 pitch 给反馈。下次：给决策设定时间限制，准备多套方案。

在 24 小时黑客松里，演示文稿必须在开发过程中同步准备，而不是等开发完成后。我们 vibe coding 直冲到最后一刻，留给打磨故事的时间太少。再好的作品也需要讲好故事。

重制版带来第三条：黑客松的模型比 pitch 里说的要小——没有载重上限、没有横向平衡、没有锁定。要让 demo 诚实，就得把这些约束真的加进去，并把公式放到屏幕上，而不是只说一句"MILP"。
