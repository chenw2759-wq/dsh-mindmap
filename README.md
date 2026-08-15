# dsh-mindmap（思维导图模式）

把课件（PPT/PDF/Word）与电子书整理成**打印级复习思维导图 HTML** 的 DSH 插件 + Agent 预设。

## 效果预览（一键生成的输出）

| 模式选择栏（与创造模式并列） | 风格子栏目（选择思维导图风格） |
|---|---|
| ![模式选择](docs/screenshots/ui_preset_picker.png) | ![风格菜单](docs/screenshots/style_menu.png) |

| 封面总览 | 交互式测试题（一键批改） |
|---|---|
| ![封面](docs/screenshots/cover.png) | ![测试题](docs/screenshots/quiz.png) |

### 四种思维导图风格（新建会话选择「思维导图模式」后，在模式下方选择，选中即默认）

| 经典大括号 | 极简商务 |
|---|---|
| ![经典](docs/screenshots/style_classic.png) | ![极简](docs/screenshots/style_minimal.png) |

| 活泼创意 | 学术整理 |
|---|---|
| ![创意](docs/screenshots/style_creative.png) | ![学术](docs/screenshots/style_academic.png) |

> 以上为实际渲染输出（Playwright 截图）：模式选择栏与风格子栏目截自运行中的 DSH Web GUI；
> 思维导图页由 `mm_generate` 依据《证券投资与技术分析·第七讲 技术与趋势》课件真实生成，
> A3 横向、**黑体**、每主干一页、右侧笔记区留白，打印即分页。

- **前端**：新建会话时选择「**思维导图模式**」→ 模式下方弹出**风格选择**（经典大括号 / 极简商务 / 活泼创意 / 学术整理），选中后作为生成默认风格；侧边栏「思维导图」入口打开**右侧预览抽屉**，会话中生成的 HTML **自动打开预览**（JupyterLab 式 tab 栏，可关闭、可缩放）。新建会话的预设选择器中「思维导图模式」与「标准模式 / 创造模式」并列。
- **Agent 能力**：`mm_generate`（一键生成 HTML，含逐页溢出报告 + 风格参数）、`mm_extract`（提取纯文本课件）；`mindmap-builder` skill 固化「大括号式横向思维导图」的完整构建方法。
- **产出规格**（与范例 `组胚思维导图_02_人体发育总论.html` 一致）：
  - A3 横向（420mm×297mm），打印即分页；每页 = 一个主干知识点
  - 大括号式横向布局：根节点在左（渐变盒 + 高光），SVG 大括号，右侧分组堆叠
  - **字体黑体**（Microsoft YaHei / 微软雅黑 / 思源黑体），比宋体更清晰现代
  - **美术美工**：4 种风格 × 每风格多套主题色按页轮换；根节点渐变、分组标题主色胶囊、条目圆点连接线、页眉渐变分隔线、页角装饰；节点圆角、配色克制、布局平衡、留白呼吸感
  - **字号相对大、占满页面**：条目 17pt 起（密集页自动降至 12.5–15pt 保持不溢出），标题/根节点 21pt、分组 19pt、子条目 15pt；内容纵向 `space-evenly` 均匀铺满页面（填充率 60–96%），不留大片空白
  - 防溢出：渲染前按字符量预算，超量自动降字号，仍超则报告需拆分主干页
  - 右侧虚线框笔记区留白，供学生补充
  - 封面页（大标题 + 依据来源 + 目录索引）；可选交互式测试题页（choice/tf/fill/short + 一键批改，题目多时自动紧凑排版）

## 安装

```powershell
# 1. 构建插件（在插件目录）
cd ~/.dsh/plugins/dsh-mindmap
pnpm install --no-frozen-lockfile
pnpm exec tsc -p tsconfig.build.json
pnpm exec tsdown

# 2. 安装到 web profile（依赖 + bundle 均已加入 package.json）
cd ~/.dsh/profiles/web
pnpm install --no-frozen-lockfile

# 3. 清理 pnpm 引入的 harness 嵌套副本（每次 install 后必做）
cd ~/.dsh/profiles/web/node_modules/@deepseek-ai
Remove-Item cordis,cosmokit,dsh-credentials,dsh-home-paths,dsh-tools,schemastery -Recurse -Force -ErrorAction SilentlyContinue

# 4. 重启 dsh web（加载新 bundle 与预设）
```

## 使用

### 方式一：让 Agent 生成（推荐）

新建会话时选择「**思维导图模式**」，然后说：

> 把 `D:\课件\` 下的 PPT 与电子书按 mindmap-builder skill 整理成思维导图，每个主干一页，输出到 `D:\复习\思维导图_01.html`，附带测试题。

Agent 会：用 MinerU 解析资料 → 提取课件与电子书共同重点 → 组织 MindmapDoc JSON → 调 `mm_generate` 生成 → 按溢出报告拆分/压缩直到每页放得下。

### 方式二：侧边栏 + 自动预览

侧边栏「思维导图」→ 点击展开**风格子栏目**（经典大括号 / 极简商务 / 活泼创意 / 学术整理）→ 选中后打开右侧预览抽屉。**会话中每次生成 HTML 都会自动打开抽屉并预览**，无需手动操作。

### MindmapDoc JSON 结构

```json
{
  "title": "人体发育总论",
  "course": "组织胚胎学自学课件",
  "ebook": "组织学与胚胎学（第10版）",
  "branches": [
    {
      "id": "一",
      "title": "概述与胚胎分期",
      "en": "overview",
      "groups": [
        {
          "heading": "（一）人体发生",
          "items": [
            { "text": "从受精卵到胎儿出生，历时约 <span class=\"k\">266 天（38 周）</span>" },
            { "text": "<b>胚（前 8 周）</b>：关键时期，易受环境因素影响致畸",
              "subs": ["细节子条目"] }
          ]
        }
      ]
    }
  ],
  "quiz": [
    { "type": "choice", "question": "…", "options": ["A","B","C","D"], "answer": 1,
      "explanation": "…", "pitfall": "…" }
  ]
}
```

## 目录结构

```
dsh-mindmap/
├── cordis.patch.yml         # bundle patch：注入 mindmap 插件行
├── package.json             # @deepseek-ai/dsh-mindmap（host + client 双面）
├── src/
│   ├── index.ts             # host 入口：路由 + 工具 + prompt 通告
│   ├── host/
│   │   ├── generator.ts     # HTML 生成器（范例样式 + 防溢出预算）
│   │   ├── routes.ts        # /api/dsh-mindmap/{generate,preview,list}
│   │   └── tools.ts         # mm_generate / mm_extract
│   └── client/              # 侧边栏入口 + 思维导图面板
│       ├── index.ts
│       ├── sidebar-entry.ts
│       ├── mount.tsx
│       ├── api.ts
│       ├── locales.ts
│       └── panel/           # MindmapPanel.tsx + controller + css
├── skills/mindmap-builder/  # 思维导图构建方法 skill（方法论固化）
└── tests/smoke.mjs          # 渲染器冒烟测试
```

思维导图模式的 Agent 预设位于 `~/.dsh/.agent-presets/mindmap/`（`agent.cordis.yml` + `preset.yml` + skill 副本），由 dsh-agent-presets roster 自动发现，无需额外注册。

## 限制

- PPT/PDF/DOCX 的内容解析依赖本机 MinerU（`mineru_parse_document`），插件本身只读取纯文本源。
- 生成 HTML 是自包含文件，无外部资源依赖，浏览器 Ctrl+P 即可打印 A3 横向 PDF。
- 溢出报告为估算值（按汉字数/行高预算）；极端字体环境下以实际打印为准，必要时按报告拆分主干页。
