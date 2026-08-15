// Render lecture-7 doc in all 4 styles and capture page-2 (第一主干页) for
// the README style gallery. Run: node tests/lecture7-styles.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { renderMindmap } from '../lib/index.js'

// Reuse the exact lecture-7 MindmapDoc from lecture7.mjs by importing the file
const { readFile } = await import('node:fs/promises')
const src = await readFile(new URL('./lecture7.mjs', import.meta.url), 'utf8')
// The doc is embedded; simplest: rebuild a representative branch doc.
const doc = {
  title: '第七讲 技术与趋势',
  course: '证券投资与技术分析（第七讲 技术与趋势）',
  ebook: '证券投资与技术分析讲义',
  branches: [
    {
      id: '一', title: '技术分析的理论基础', en: 'theoretical basis',
      groups: [
        {
          heading: '（一）格雷厄姆的看法', items: [
            { text: '技术分析不可能是一门科学；过去并未证明是盈利的可靠方法' },
            { text: '理论建立在<em>不完善的逻辑或纯粹武断</em>的基础之上', subs: ['优势随推崇者增加而日益丧失'] },
          ],
        },
        {
          heading: '（二）价格变化涵盖一切信息', items: [
            { text: '市场完全有效时，技术分析无法确定价格方向——与技术分析一样不能赚钱' },
            { text: '信息包含在价格及其变化之中；<span class="k">价格变化有真有假</span>，需交易量佐证', subs: ['真金白银买卖才反映真实想法和诉求'] },
            { text: '专家交易者早知信息价值→慢慢买卖→价格逐步反映→普通交易者知晓→<span class="k">过度反应（超调）</span>' },
          ],
        },
        {
          heading: '（三）技术的核心是判断趋势', items: [
            { text: '判断价格运行趋势决定盈利与否，是技术分析的核心；趋势是技术分析的内核' },
            { text: '小趋势=狭义的技术；大趋势=趋势投资派；趋势与时间级别有关' },
            { text: 'Livermore 最早的趋势投机者：寻找<span class="k">阻力最小的方向</span>' },
            { text: '横盘=无方向的涨跌，无规律、无投机价值；趋势级别越小，持续性越差、幅度越小' },
          ],
        },
      ],
    },
  ],
}

for (const style of ['classic', 'minimal', 'creative', 'academic']) {
  const { html } = renderMindmap({ ...doc, style })
  writeFileSync(`M:/dsh/tmp/lecture7_${style}.html`, html, 'utf8')
}

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
const shots = 'C:/Users/cysja/.dsh/plugins/dsh-mindmap/docs/screenshots'
for (const style of ['classic', 'minimal', 'creative', 'academic']) {
  const html = readFileSync(`M:/dsh/tmp/lecture7_${style}.html`, 'utf8')
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.locator('div.page').nth(1).screenshot({ path: `${shots}/style_${style}.png` })
  console.log('saved style_' + style + '.png')
}
await browser.close()
