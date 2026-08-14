---
name: mindmap-builder
description: 大括号式横向复习思维导图 HTML 的构建方法。输入课件（PPT/PDF/Word）与电子书，输出符合「组胚思维导图_02」范例规格的打印级 HTML：A3 横向、每主干知识点一页、宋体大字、右侧留白笔记区、附封面总览与交互式测试题。当用户要求「思维导图 / 复习大纲 / 一页一个知识点 / 大括号式 / 留白补充 / 附带测试题」时使用本技能。
---

# 大括号式横向思维导图构建方法（dsh-mindmap）

本技能固化自范例 `组胚思维导图_02_人体发育总论.html`（提示词范例），是把课件 + 电子书整理成
打印级思维导图 HTML 的**唯一权威规范**。任何输出都必须逐条遵守，禁止自创版式。

## 0. 总原则（铁律）

1. **一页 = 一个主干知识点**：每个主干知识点只能占用一页，页内全部内容必须在一页内放得下。
2. **严禁概括过简**：细节知识点尽量保留课件/电子书原文，宁多勿少。
3. **严禁篡改知识点**：内容必须以 ppt 与电子书**共同出现**的知识点为主，原文优先，不得改写意思。
4. **字体宋体、字号相对大**，但必须**不溢出、不重叠**——生成前按字符量预算排版，超量则拆分为多个主干页或压缩措辞到恰好放得下。
5. **左右结构**：知识点横向放页面左侧（大括号式），右侧留出**笔记区**供学生补充。

## 1. 页面规格（打印即 A3 横向）

```css
@page { size: 420mm 297mm; margin: 0 }
* { margin: 0; padding: 0; box-sizing: border-box }
html, body { font-family: "SimSun", "宋体", STSong, serif; background: #f5f5f5; font-size: 15pt; color: #1a1a11 }
.page { width: 420mm; height: 297mm; padding: 8mm 10mm; background: #fff;
        page-break-after: always; break-after: page; position: relative; overflow: hidden }
.page:last-child { page-break-after: auto }
```

- 每页是一个 `.page` 块；**总宽度 420mm、总高度 297mm**，任何内容不得超出。
- `.left`（思维导图区）：`position:absolute; left:10mm; top:30mm; width:285mm; height:256mm;
  border:2px solid #94a3b8; padding:6mm 7mm; background:#fafbfc; overflow:hidden; border-radius:4px`
- `.right`（笔记区）：`position:absolute; right:10mm; top:30mm; width:111mm; height:256mm;
  border:2px dashed #94a3b8; background:#fffef5; border-radius:4px`
  - 内部：`.rh` 标题「笔记区」（16pt 灰色，下虚线分隔）+ `.lines` 横线背景
    （`repeating-linear-gradient(to bottom, transparent, transparent 11mm, #e2e8f0 11mm, #e2e8f0 12mm)`，高 232mm）
- 页标题 `.title`：`font-size:21pt; font-weight:bold; text-align:center; color:#1e293b;
  border-bottom:3px solid #1e3a8a; padding-bottom:2mm; margin-bottom:5mm; letter-spacing:2px`，
  文本形如 `《课程名》思维导图 ｜ 一、主干知识点名`。

## 2. 大括号式横向思维导图（`.mm` 结构，每页一套）

```
<div class="left">
  <div class="mm">
    <div class="mm-row">
      <div class="mm-root"><div class="box">一、主干知识点<span class="en">english</span></div></div>
      <div class="mm-brace"><svg viewBox="0 0 24 240" preserveAspectRatio="none"><path d="M 22,10 C 10,14 4,32 4,62 C 4,86 12,96 2,120 C 12,144 4,154 4,178 C 4,208 10,226 22,230" fill="none" stroke="#1e3a8a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>
      <div class="mm-stack">
        <div class="mm-group">
          <div class="mm-h">（一）分组标题</div>
          <div class="mm-item">条目文本</div>
          <div class="mm-sub">子条目文本</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

- `.mm`：`height:100%; display:flex; flex-direction:column; justify-content:center`
- `.mm-row`：`display:flex; align-items:stretch; width:100%`
- `.mm-root`：`flex:0 0 40mm; display:flex; align-items:center; justify-content:center`
  - `.box`：`background:linear-gradient(to right,#1e3a8a,#3b82f6); color:#fff; padding:10px 14px;
    border-radius:10px; font-size:17pt; font-weight:bold; line-height:1.45; text-align:center;
    letter-spacing:1px; max-width:38mm`
  - `.en`：根节点下方英文小字（`font-size:10.5pt; opacity:.9`）
- `.mm-brace`：`width:14mm; flex:0 0 14mm; display:flex; align-items:stretch`，内嵌上述 SVG 大括号
  （viewBox 0 0 24 240，path 用 `M 22,10 C 10,14 ... 22,230` 三段贝塞尔，stroke #1e3a8a 3.5）
- `.mm-stack`：`flex:1; min-width:0; padding-left:3mm; display:flex; flex-direction:column;
  justify-content:center; overflow:hidden`
- `.mm-group`：`margin:1.6mm 0`（一个分组）
- `.mm-h`：分组标题，`font-size:15pt; font-weight:bold; color:#1e3a8a; background:#eef2ff;
  border-left:6px solid #1e3a8a; padding:3px 12px; margin-bottom:1mm; border-radius:3px; display:inline-block`
- `.mm-item`：`position:relative; font-size:13.5pt; line-height:1.5; margin:0.8mm 0; padding-left:16px`，
  `::before` 画左侧短横线（`content:""; position:absolute; left:0; top:10px; width:11px; border-top:2px solid #64748b`）
- `.mm-sub`：`position:relative; font-size:12.5pt; line-height:1.45; margin:0.5mm 0 0.5mm 16px;
  padding-left:14px; color:#334155`，`::before` 为灰色圆点 `·`
- `.k`（关键词高亮）：`background:#fffde7; padding:0 2px; border-radius:2px; font-weight:bold; color:#000`
- `.b`（加粗）：`font-weight:bold`

## 3. 封面页（第一页）

- `.cov`：`height:100%; display:flex; flex-direction:column; justify-content:center`
- `.big`：`font-size:30pt; font-weight:bold; text-align:center; color:#1e3a8a; letter-spacing:4px; margin-bottom:6mm`（课程/章节总名）
- `.sub`：`font-size:15pt; text-align:center; color:#475569; line-height:1.8; margin-bottom:6mm`，
  必须写明依据：「思维导图（大括号式 · 横向）<br>依据《课件名》与《电子书名》<br>共同重点整理，以两者均出现的知识点为主」
- `.idx`：`font-size:14.5pt; line-height:2.1; padding-left:20mm; color:#1e293b`，
  每行 `<b>一、主干知识点</b>　（括号内一句话概括）`
- `.note-tip`：`position:absolute; bottom:14mm; left:14mm; font-size:11pt; color:#94a3b8`，
  文本「※ 每页右侧虚线框留作补充笔记，本页内容详见后续各页。」
- 封面页同样保留 `.left`（含 cov）/`.right`（笔记区）双栏结构。

## 4. 内容组织规范（生成前的知识整理）

1. 阅读课件（ppt/pptx/pdf/word）与电子书对应章节，**提取两者均出现的知识点**为主；
   电子书补充课件未展开的细节（保留原文表述）。
2. 主干划分：按课件的章节/大节划分主干（如「一、概述与胚胎分期」「二、生殖细胞与减数分裂」…），
   编号一、二、三…（可用罗马序号延续小节，如「十一、鳃器发生（一）」「十一、鳃器发生（二）」）。
3. 每主干一页；页内按（一）（二）（三）… 分组，每组一个 `.mm-h` 标题 + 若干 `.mm-item`；
   与条目同级的补充细节用 `.mm-sub` 缩进；关键词用 `<span class="k">`，术语用 `<b>`。
4. **防溢出预算**：左栏内容高 256mm。粗估：`.mm-h` 约 10mm/个，`.mm-item` 约 9mm/行
   （13.5pt×1.5），`.mm-sub` 约 8mm/行。一条 13.5pt 宋体行宽约容纳 48 个汉字。
   若单页条目行数 × 行高 超过 240mm，必须：① 合并同义条目；② 拆成多个主干页
   （如「胎膜（一）」「胎膜（二）」）；③ 或在不动知识点前提下压缩措辞。**禁止溢出与重叠。**
5. 数学/化学等特殊符号按 HTML 实体书写（`&gt;`、`&lt;`、`&amp;`）。

## 4.5 美术美工规范（视觉设计，让思维导图好看）

**字体**：全文档使用**黑体系**（`Microsoft YaHei / 微软雅黑 / PingFang SC / Noto Sans CJK SC / SimHei`），
比宋体更清晰现代，观感更佳。

**风格选择**：生成器内置 4 种风格（`MindmapDoc.style` 或 `mm_generate` 的 `style` 参数，
也可在 GUI 侧边栏「思维导图」入口的子栏目中切换，切换后作为默认风格）：

| style | 名称 | 特点 |
|---|---|---|
| `classic` | 经典大括号 | 六色轮换（深蓝/翠绿/琥珀/紫罗兰/玫红/青碧）、柔和层次、渐变装饰 |
| `minimal` | 极简商务 | 蓝灰单色系、直角矩形节点、简洁线条、少装饰 |
| `creative` | 活泼创意 | 彩虹渐变、每分支不同色、大圆角、Emoji 图标、曲线感 |
| `academic` | 学术整理 | 低饱和蓝绿色系、结构严谨、圆角克制装饰 |

**通用美化原则**（各风格通用）：

1. **配色**：每页统一使用一组主题色——主色 `--c1`（标题、根节点、分组标题文字）、
   辅色 `--c2`（渐变、连接线、大括号描边）、浅底 `--c3`（分组标题底色、边框）、
   最浅底 `--c4`（页面内容区渐变底）。**禁止一页混入无关色系**、整体颜色不超过
   5 种主色。可用莫兰迪/马卡龙低饱和色系，不同分支用不同颜色区分。
2. **层次对比**：根节点最重（主→辅渐变、白字、圆角、柔投影 + 顶部高光）；
   分组标题次之（主色左竖条 + 浅色胶囊）；条目最轻（主色圆点 + 渐隐短连接线）。
   字号按 21 / 17 / 15 / 13.5 / 12.5pt 递减形成层级。
3. **节点文字精简**：条目优先用关键词/短语，避免长句（长句会撑高页面导致溢出）。
4. **布局平衡**：内容纵向居中、左右分布均匀；大括号连接线不交叉；适当留白保持呼吸感。
5. **细节装饰**：页眉标题下方加主色渐变分隔线；页面左上角色带、右下圆角框装饰，
   增强页面的完成度与归属感。
6. **克制原则**：装饰元素只放页面四角与标题区，绝不进入内容区；内容区始终
   保持留白充足、字不重叠、不溢出（见第 4 节防溢出预算）。**避免**：颜色超过 5 种、
   文字过长、层级过深、线条交叉、字体不统一、过度装饰、图标滥用。

## 5. 测试题（可选，随思维导图附赠）

在思维导图之后追加一页「章节测试」，复用 ExamPass-Assistant 出题规范：

- 题型按学科选择：choice（4 选项，正确答案均匀分布）、tf（判断，answer 用布尔值）、fill（填空）、short（简答）。
- 每题带 `kc_id`（对应主干知识点）、认知层次（remember/understand/apply/analyze）、难度（basic/medium/hard）、解析 `explanation`、易错点 `pitfall`。
- 呈现：题目列表 + 「显示答案/一键批改」按钮（原生 JS，无外部依赖）。
- 交互批改规则：choice 比对下标，tf 比对布尔值，fill 做规范化文本比对（去空白/全半角），
  short 显示参考答案由学生自评。

## 6. 产出

- 每个课件（或每章）输出一个独立 HTML 文件，文件名如 `思维导图_<序号>_<主干名>.html`。
- 所有样式内联在 `<style>` 中，**不引用任何外部资源**（离线可打印）。
- 浏览器中直接 Ctrl+P 打印为 A3 横向 PDF，即得一页一知识点的复习大图。
