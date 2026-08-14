/**
 * dsh-mindmap HTML generator — the mindmap-building methodology from the
 * reference sample (`组胚思维导图_02_人体发育总论.html`) as a pure renderer.
 *
 * Input is a structured `MindmapDoc`; output is a self-contained printable
 * HTML document (A3 landscape pages): cover page + one page per branch
 * (brace-style horizontal mindmap, right-hand note column) + an optional
 * interactive quiz page. All styles are inlined; no external resources.
 *
 * Overflow safety: every branch page is rendered at the reference font size
 * and measured against the 256mm content budget. If the branch overflows,
 * the renderer scales the item font down in 0.5pt steps (floor 11pt) and
 * reports each page that still exceeds the budget so the caller can split it.
 */

/** A mindmap branch = one page = one 主干知识点. */
export interface MindmapBranch {
  /** Ordinal label shown in the root box, e.g. 「一」. */
  readonly id: string
  /** Branch title, e.g. 「概述与胚胎分期」. */
  readonly title: string
  /** Optional English subtitle under the root box. */
  readonly en?: string
  /** Groups of items under the brace. */
  readonly groups: readonly MindmapGroup[]
}

/** One 分组 under a branch (（一）（二）…). */
export interface MindmapGroup {
  /** Group heading, e.g. 「（一）人体发生」. */
  readonly heading: string
  /** Knowledge-point items; each may contain inline HTML (<b>, <span class="k">). */
  readonly items: readonly MindmapItem[]
}

/** One knowledge point (and optional sub-bullets). */
export interface MindmapItem {
  /** Item text; inline HTML allowed. */
  readonly text: string
  /** Optional sub-bullets (· 缩进细节). */
  readonly subs?: readonly string[]
}

/** A quiz question (ExamPass-Assistant style). */
export interface QuizQuestion {
  readonly type: 'choice' | 'tf' | 'fill' | 'short'
  /** Points awarded. */
  readonly points?: number
  /** Branch id this question targets (kc_id). */
  readonly kcId?: string
  readonly question: string
  /** choice: 4 option strings. */
  readonly options?: readonly string[]
  /** choice: index of correct option; tf: boolean; fill: expected text. */
  readonly answer: number | boolean | string
  readonly explanation?: string
  readonly pitfall?: string
}

/** The document model the generator renders. */
export interface MindmapDoc {
  /** Cover big title, e.g. 「人体发育总论」. */
  readonly title: string
  /** Courseware name shown on the cover source line. */
  readonly course: string
  /** E-book name shown on the cover source line. */
  readonly ebook: string
  /** Optional one-line summary under the big title. */
  readonly subtitle?: string
  /** Branches; each becomes one page. */
  readonly branches: readonly MindmapBranch[]
  /** Optional quiz appended as a final page. */
  readonly quiz?: readonly QuizQuestion[]
  /** Quiz page title (default 「章节测试」). */
  readonly quizTitle?: string
}

/** Per-page overflow measurement. */
export interface PageReport {
  readonly branch: string
  /** Rendered item font size actually used (pt). */
  readonly fontSizePt: number
  /** Estimated used height (mm) vs the 243mm content budget. */
  readonly usedMm: number
  readonly budgetMm: number
  /** True when even the smallest font still overflows — split this branch. */
  readonly overflow: boolean
}

/** Renderer result. */
export interface RenderResult {
  readonly html: string
  readonly pages: readonly PageReport[]
}

/* ── budget math (mirrors the reference typography) ─────────────────────── */

/** Reference item font sizes (pt). */
const BASE_ITEM_PT = 13.5
const BASE_SUB_PT = 12.5
const MIN_ITEM_PT = 11
/** Content column usable height: 256mm page minus 6mm+7mm padding. */
const CONTENT_BUDGET_MM = 243
/** A 13.5pt SimSun line holds roughly this many CJK glyphs in 271mm. */
const GLYPHS_PER_LINE = 48

/** Estimate the rendered height (mm) of one group at a given item pt. */
function measureGroup(group: MindmapGroup, itemPt: number): number {
  const scale = itemPt / BASE_ITEM_PT
  const lineHeight = itemPt * 1.5 * 0.3528 // pt → mm
  const subLineHeight = Math.max(BASE_SUB_PT * scale, 9) * 1.45 * 0.3528
  const head = 10 * scale // .mm-h block
  let total = head
  for (const item of group.items) {
    const text = item.text.replace(/<[^>]*>/g, '')
    const lines = Math.max(1, Math.ceil(text.length / GLYPHS_PER_LINE))
    total += lines * lineHeight + 2.8 * scale // item margin 0.8mm × 2 + line-height slack
    for (const sub of item.subs ?? []) {
      const subLines = Math.max(1, Math.ceil(sub.length / (GLYPHS_PER_LINE - 6)))
      total += subLines * subLineHeight + 1.8 * scale
    }
  }
  return total
}

/** Measure all groups of one branch at a given item font size (mm). */
function measureBranch(branch: MindmapBranch, itemPt: number): number {
  let total = 0
  for (const group of branch.groups) total += measureGroup(group, itemPt)
  return total + (branch.groups.length - 1) * 5.6 // .mm-group margins
}

/** Pick the largest item font ≤ 13.5pt that fits, or the floor. */
function fitFont(branch: MindmapBranch): { pt: number; usedMm: number; overflow: boolean } {
  let pt = BASE_ITEM_PT
  let used = measureBranch(branch, pt)
  while (used > CONTENT_BUDGET_MM && pt > MIN_ITEM_PT) {
    pt = Math.max(MIN_ITEM_PT, pt - 0.5)
    used = measureBranch(branch, pt)
  }
  return { pt, usedMm: used, overflow: used > CONTENT_BUDGET_MM }
}

/* ── HTML escaping / helpers ────────────────────────────────────────────── */

/** Escape text so user content can never break the document structure. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render item text: escape raw text but allow the known inline markers. */
function renderInline(text: string): string {
  // Permit <b>…</b>, <em>…</em> and <span class="k">…</span>; escape everything else.
  const escaped = escapeHtml(text)
  return escaped
    .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, '<b>$1</b>')
    .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/g, '<em>$1</em>')
    .replace(/&lt;span class="k"&gt;(.*?)&lt;\/span&gt;/g, '<span class="k">$1</span>')
}

/* ── static template parts (from the reference sample) ──────────────────── */

/**
 * Visual design system (美术美工规范):
 * - Each page carries its own theme via CSS variables --c1 (主色) / --c2 (辅色)
 *   / --c3 (浅底) / --c4 (最浅底); branches rotate through THEMES below so
 *   相邻主干页配色不同、整体有节奏感.
 * - 根节点: 主色→辅色渐变 + 高光 + 柔和投影; 分组标题: 主色左竖条 + 浅色胶囊;
 *   条目: 主色圆点 + 短连接线; 子条目: 圆点缩进.
 * - 页眉标题: 主色渐变分隔线; 页面四角有装饰(左上色带 + 右下圆角框);
 *   右侧笔记区保留虚线框 + 横线留白.
 */
const THEMES = [
  { c1: '#1e3a8a', c2: '#3b82f6', c3: '#dbeafe', c4: '#eff6ff' }, // 深蓝
  { c1: '#065f46', c2: '#10b981', c3: '#d1fae5', c4: '#ecfdf5' }, // 翠绿
  { c1: '#92400e', c2: '#f59e0b', c3: '#fef3c7', c4: '#fffbeb' }, // 琥珀
  { c1: '#5b21b6', c2: '#8b5cf6', c3: '#ede9fe', c4: '#f5f3ff' }, // 紫罗兰
  { c1: '#9f1239', c2: '#f43f5e', c3: '#ffe4e6', c4: '#fff1f2' }, // 玫红
  { c1: '#155e75', c2: '#06b6d4', c3: '#cffafe', c4: '#ecfeff' }, // 青碧
]

const STYLE = `@page{size:420mm 297mm;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:"SimSun","宋体",STSong,serif;background:#eef2f7;font-size:15pt;color:#1a1a11}
.page{width:420mm;height:297mm;padding:8mm 10mm;background:#fff;page-break-after:always;break-after:page;position:relative;overflow:hidden;--c1:#1e3a8a;--c2:#3b82f6;--c3:#dbeafe;--c4:#eff6ff}
.page:last-child{page-break-after:auto}
.page::before{content:"";position:absolute;top:0;left:0;width:30mm;height:5mm;background:linear-gradient(90deg,var(--c1),var(--c2));border-radius:0 0 5mm 0}
.page::after{content:"";position:absolute;bottom:3mm;right:3mm;width:11mm;height:11mm;border:1.4mm solid var(--c3);border-left:none;border-top:none;border-radius:0 0 3mm 0;opacity:.9}
.title{font-size:21pt;font-weight:bold;text-align:center;color:#0f172a;letter-spacing:2px;padding:1mm 0 2.5mm;margin:0 0 5mm;position:relative}
.title::after{content:"";position:absolute;left:20mm;right:20mm;bottom:0;height:1.6mm;background:linear-gradient(90deg,var(--c1),var(--c2) 50%,var(--c1));border-radius:1mm}
.left{position:absolute;left:10mm;top:30mm;width:285mm;height:256mm;border:1.6px solid #cbd5e1;padding:6mm 7mm;background:linear-gradient(180deg,#ffffff,var(--c4));overflow:hidden;border-radius:5px;box-shadow:0 1px 4px rgba(15,23,42,.06)}
.right{position:absolute;right:10mm;top:30mm;width:111mm;height:256mm;border:2px dashed var(--c2);padding:4px 6px;border-radius:5px;background:#fffef5}
.rh{font-size:16pt;color:var(--c1);border-bottom:2px dashed var(--c3);padding:4px 0 3px;text-align:center;font-weight:bold;letter-spacing:4px}
.lines{height:232mm;background:repeating-linear-gradient(to bottom,transparent,transparent 11mm,#e2e8f0 11mm,#e2e8f0 12mm)}
.mm{height:100%;display:flex;flex-direction:column;justify-content:center}
.mm-row{display:flex;align-items:stretch;width:100%}
.mm-root{flex:0 0 40mm;width:40mm;display:flex;align-items:center;justify-content:center;padding-right:2mm}
.mm-root .box{background:linear-gradient(160deg,var(--c1),var(--c2));color:#fff;padding:12px 14px;border-radius:14px;font-weight:bold;line-height:1.5;text-align:center;letter-spacing:1px;box-shadow:0 3px 10px color-mix(in srgb,var(--c1) 40%,transparent),inset 0 1px 0 rgba(255,255,255,.35);max-width:38mm;border:1px solid rgba(255,255,255,.25)}
.mm-root .en{display:block;font-weight:normal;opacity:.92;margin-top:3px;letter-spacing:0;line-height:1.3}
.mm-brace{width:14mm;flex:0 0 14mm;display:flex;align-items:stretch}
.mm-brace svg{width:100%;height:100%;display:block}
.mm-stack{flex:1;min-width:0;padding-left:3mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.mm-group{margin:1.6mm 0}
.mm-h{font-weight:bold;color:var(--c1);background:linear-gradient(90deg,var(--c3),var(--c4));border-left:6px solid var(--c1);padding:3px 12px;margin-bottom:1mm;border-radius:0 12px 12px 0;display:inline-block;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.mm-item{position:relative;line-height:1.5;margin:0.8mm 0;padding-left:16px}
.mm-item::before{content:"";position:absolute;left:0;top:11px;width:11px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--c2),transparent)}
.mm-item::after{content:"";position:absolute;left:0;top:9.5px;width:3.5px;height:3.5px;border-radius:50%;background:var(--c1)}
.mm-sub{position:relative;line-height:1.45;margin:0.5mm 0 0.5mm 16px;padding-left:14px;color:#334155}
.mm-sub::before{content:"·";position:absolute;left:2px;top:0;color:var(--c2);font-weight:bold}
.k{background:#fffde7;padding:0 2px;border-radius:2px;font-weight:bold;color:#000;box-shadow:0 1px 0 rgba(250,204,21,.5)}
.b{font-weight:bold}
.cov{height:100%;display:flex;flex-direction:column;justify-content:center;position:relative}
.cov .big{font-size:32pt;font-weight:bold;text-align:center;color:var(--c1);letter-spacing:5px;margin-bottom:4mm;text-shadow:0 1px 0 rgba(255,255,255,.8)}
.cov .big::after{content:"";display:block;width:120mm;height:1.8mm;margin:4mm auto 0;background:linear-gradient(90deg,transparent,var(--c2) 30%,var(--c1) 70%,transparent);border-radius:1mm}
.cov .sub{font-size:15pt;text-align:center;color:#475569;line-height:1.9;margin-bottom:6mm}
.cov .idx{font-size:14.5pt;line-height:2.05;padding-left:20mm;color:#1e293b}
.cov .idx b{color:var(--c1);background:var(--c3);padding:0 4px;border-radius:4px}
.note-tip{position:absolute;bottom:14mm;left:14mm;font-size:11pt;color:#94a3b8}
.quiz{height:100%;display:flex;flex-direction:column}
.quiz h2{font-size:21pt;color:var(--c1);border-bottom:3px solid var(--c1);padding-bottom:2mm;margin-bottom:4mm;letter-spacing:2px}
.q-item{font-size:12pt;line-height:1.45;margin:1.8mm 0;padding:2mm 3mm;border:1px solid var(--c3);border-left:5px solid var(--c1);border-radius:5px;background:var(--c4)}
.q-item .q-text{font-weight:bold;margin-bottom:0.8mm}
.q-item .q-opts{margin:0.8mm 0}
.q-item label{display:block;margin:0.4mm 0}
.q-item .q-exp{display:none;margin-top:1mm;padding:1.2mm 2mm;background:#f0fdf4;border-left:4px solid #16a34a;font-size:11pt}
.q-item .q-pit{display:none;margin-top:1mm;padding:1.2mm 2mm;background:#fef2f2;border-left:4px solid #dc2626;font-size:11pt}
.q-item input[type=text]{font-family:inherit;font-size:11.5pt;width:65%;padding:0.8mm 1.5mm}
.q-item textarea{font-family:inherit;font-size:11.5pt;width:88%;padding:0.8mm 1.5mm}
.quiz-btns{margin:2mm 0;display:flex;gap:4mm}
.quiz-btns button{font-family:inherit;font-size:12pt;padding:2mm 5mm;border-radius:8px;border:1px solid var(--c1);background:linear-gradient(160deg,var(--c1),var(--c2));color:#fff;cursor:pointer;box-shadow:0 2px 6px color-mix(in srgb,var(--c1) 35%,transparent)}
.quiz-btns button.ghost{background:#fff;color:var(--c1)}
.quiz-result{font-size:13.5pt;margin-top:2mm;color:#166534;display:none}
@media print{.quiz-btns button{display:none}}
`

const BRACE_SVG = '<svg viewBox="0 0 24 240" preserveAspectRatio="none"><path d="M 22,10 C 10,14 4,32 4,62 C 4,86 12,96 2,120 C 12,144 4,154 4,178 C 4,208 10,226 22,230" fill="none" stroke="var(--c1)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.9"/></svg>'

/* ── page renderers ─────────────────────────────────────────────────────── */

/** Emit the CSS-variable theme for one page. */
function themeStyle(index: number): string {
  const theme = THEMES[index % THEMES.length]
  return `style="--c1:${theme.c1};--c2:${theme.c2};--c3:${theme.c3};--c4:${theme.c4}"`
}

function noteColumn(): string {
  return '<div class="right"><div class="rh">笔记区</div><div class="lines"></div></div>'
}

function coverPage(doc: MindmapDoc): string {
  const idx = doc.branches
    .map((branch) => {
      const firstGroup = branch.groups[0]
      const hint = firstGroup === undefined ? '' : firstGroup.items[0]?.text.replace(/<[^>]*>/g, '').slice(0, 26)
      return `<b>${escapeHtml(branch.id)}、${escapeHtml(branch.title)}</b>${hint ? `　（${escapeHtml(hint)}${hint.length >= 26 ? '…' : ''}）` : ''}<br>`
    })
    .join('')
  const subtitle = doc.subtitle === undefined
    ? '思维导图（大括号式 · 横向）<br>依据《' + escapeHtml(doc.course) + '》与《' + escapeHtml(doc.ebook) + '》<br>共同重点整理，以两者均出现的知识点为主'
    : escapeHtml(doc.subtitle).replace(/\n/g, '<br>')
  return `<div class="page" ${themeStyle(0)}>
  <div class="left">
    <div class="cov">
      <div class="big">${escapeHtml(doc.title)}</div>
      <div class="sub">${subtitle}</div>
      <div class="idx">${idx}</div>
    </div>
    <div class="note-tip">※ 每页右侧虚线框留作补充笔记，本页内容详见后续各页。</div>
  </div>
  ${noteColumn()}
</div>`
}

function branchPage(doc: MindmapDoc, branch: MindmapBranch, index: number, itemPt: number): string {
  const rootSize = Math.max(15, Math.round(17 * itemPt / BASE_ITEM_PT))
  const headSize = Math.max(13, Math.round(15 * itemPt / BASE_ITEM_PT))
  const subSize = Math.max(10, Math.round(12.5 * itemPt / BASE_ITEM_PT))
  const groups = branch.groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          const subs = (item.subs ?? []).map((sub) => `<div class="mm-sub" style="font-size:${subSize}pt">${renderInline(sub)}</div>`).join('')
          return `<div class="mm-item" style="font-size:${itemPt}pt">${renderInline(item.text)}${subs}</div>`
        })
        .join('')
      return `<div class="mm-group"><div class="mm-h" style="font-size:${headSize}pt">${renderInline(group.heading)}</div>${items}</div>`
    })
    .join('')
  const en = branch.en === undefined ? '' : `<span class="en" style="font-size:${Math.max(9, Math.round(10.5 * itemPt / BASE_ITEM_PT))}pt">${escapeHtml(branch.en)}</span>`
  return `<div class="page" ${themeStyle(index + 1)}>
  <div class="title">${escapeHtml(doc.title)} 思维导图 ｜ ${escapeHtml(branch.id)}、${escapeHtml(branch.title)}</div>
  <div class="left">
    <div class="mm">
      <div class="mm-row">
        <div class="mm-root"><div class="box" style="font-size:${rootSize}pt">${escapeHtml(branch.id)}、${escapeHtml(branch.title)}${en}</div></div>
        <div class="mm-brace">${BRACE_SVG}</div>
        <div class="mm-stack">${groups}</div>
      </div>
    </div>
  </div>
  ${noteColumn()}
</div>`
}

/* ── quiz page ──────────────────────────────────────────────────────────── */

function quizScript(questions: readonly QuizQuestion[]): string {
  const model = questions.map((q, i) => {
    const answer = typeof q.answer === 'string' ? JSON.stringify(q.answer) : JSON.stringify(q.answer)
    return `{i:${i},type:${JSON.stringify(q.type)},answer:${answer}}`
  }).join(',')
  return `function norm(s){return String(s??'').replace(/\\s+/g,'').replace(/[（(]/g,'(').replace(/[）)]/g,')').toLowerCase()}
function grade(){
  var qs=[${model}];var score=0,max=0;
  for(var k=0;k<qs.length;k++){var q=qs[k];var el=document.querySelectorAll('.q-item')[q.i];var pts=parseInt(el.dataset.points||'2',10);max+=pts;var ok=false;
    if(q.type==='choice'){var sel=el.querySelector('input[type=radio]:checked');ok=sel!==null&&parseInt(sel.value,10)===q.answer;}
    else if(q.type==='tf'){var sel2=el.querySelector('input[type=radio]:checked');ok=sel2!==null&&(sel2.value==='1')===q.answer;}
    else if(q.type==='fill'){var inp=el.querySelector('input[type=text]');ok=inp!==null&&norm(inp.value)===norm(q.answer);}
    else{ok=false;}
    if(ok)score+=pts;
    var badge=el.querySelector('.q-verdict');if(badge){badge.textContent=ok?'✓ 正确':'✗ 错误';badge.style.color=ok?'#166534':'#b91c1c';}
  }
  var r=document.getElementById('quiz-result');r.style.display='block';r.textContent='得分：'+score+' / '+max+(max?'（'+(score*100/max).toFixed(0)+'%）':'');
}
function reveal(){var items=document.querySelectorAll('.q-item');for(var k=0;k<items.length;k++){var e=items[k].querySelector('.q-exp');if(e)e.style.display='block';var p=items[k].querySelector('.q-pit');if(p)p.style.display='block';}}`
}

function quizPage(doc: MindmapDoc): string {
  const questions = doc.quiz ?? []
  // Compact sizing: more questions → smaller item font so the quiz fits one page.
  const itemPt = questions.length >= 8 ? 11 : questions.length >= 6 ? 12 : 13
  const bodyPt = Math.max(10, itemPt - 1)
  const items = questions
    .map((q, i) => {
      const points = q.points ?? 2
      const body = q.type === 'choice'
        ? `<div class="q-opts">${(q.options ?? []).map((opt, oi) => `<label><input type="radio" name="q${i}" value="${oi}"> ${escapeHtml(opt)}</label>`).join('')}</div>`
        : q.type === 'tf'
          ? `<div class="q-opts"><label><input type="radio" name="q${i}" value="1"> 正确</label><label><input type="radio" name="q${i}" value="0"> 错误</label></div>`
          : q.type === 'fill'
            ? `<div class="q-opts"><input type="text" style="font-family:inherit;font-size:${bodyPt}pt;width:65%;padding:0.8mm 1.5mm" placeholder="填写答案"></div>`
            : `<div class="q-opts"><textarea rows="2" style="font-family:inherit;font-size:${bodyPt}pt;width:88%;padding:0.8mm 1.5mm" placeholder="作答…"></textarea></div>`
      const pitfall = q.pitfall === undefined ? '' : `<div class="q-pit">⚠ 易错：${escapeHtml(q.pitfall)}</div>`
      return `<div class="q-item" data-points="${points}" style="font-size:${itemPt}pt">
  <div class="q-text">${i + 1}. [${q.type.toUpperCase()}] ${escapeHtml(q.question)} <span class="q-verdict" style="font-weight:bold"></span></div>
  ${body}
  ${q.explanation === undefined ? '' : `<div class="q-exp">✅ 解析：${escapeHtml(q.explanation)}</div>`}
  ${pitfall}
</div>`
    })
    .join('')
  return `<div class="page" ${themeStyle(0)}>
  <div class="quiz">
    <h2>${escapeHtml(doc.quizTitle ?? '章节测试')}</h2>
    ${items}
    <div class="quiz-btns">
      <button type="button" onclick="grade()">一键批改</button>
      <button type="button" class="ghost" onclick="reveal()">显示答案与解析</button>
    </div>
    <div class="quiz-result" id="quiz-result"></div>
  </div>
  <script>${quizScript(questions)}</script>
</div>`
}

/* ── public renderer ────────────────────────────────────────────────────── */

/**
 * Render a MindmapDoc to a complete self-contained HTML document.
 * @param doc - the structured mindmap model.
 * @returns the HTML string plus a per-page fit report.
 */
export function renderMindmap(doc: MindmapDoc): RenderResult {
  const pages: PageReport[] = []
  const branchPages = doc.branches.map((branch, index) => {
    const { pt, usedMm, overflow } = fitFont(branch)
    pages.push({ branch: `${branch.id}、${branch.title}`, fontSizePt: pt, usedMm, budgetMm: CONTENT_BUDGET_MM, overflow })
    return branchPage(doc, branch, index, pt)
  })
  const body = [coverPage(doc), ...branchPages, ...(doc.quiz !== undefined && doc.quiz.length > 0 ? [quizPage(doc)] : [])].join('\n')
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title)} 思维导图</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`
  return { html, pages }
}
