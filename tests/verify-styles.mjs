// Verify each style's visual identity renders: distinct theme palettes,
// black font, style classes. Run: node tests/verify-styles.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { renderMindmap, MINDMAP_STYLES } from '../lib/index.js'

const base = {
  title: '风格演示',
  course: '证券投资与技术分析',
  ebook: '讲义',
  branches: [
    { id: '一', title: '技术分析的理论基础', en: 'basis', groups: [
      { heading: '（一）核心', items: [{ text: '判断价格运行趋势是技术分析的核心' }, { text: '趋势是技术分析的内核', subs: ['小趋势=狭义技术', '大趋势=趋势投资派'] }] },
      { heading: '（二）有效性', items: [{ text: '历史不断重复', subs: ['人性不变是心理学基础'] }] },
    ] },
    { id: '二', title: '形态分析', en: 'pattern', groups: [
      { heading: '（一）通道', items: [{ text: '上升通道与下降通道', subs: ['间距/量能/指标/突破分析'] }] },
    ] },
  ],
  quiz: [{ type: 'choice', question: '技术分析的核心是？', options: ['趋势', '点位', '成交量'], answer: 0, explanation: '判断趋势' }],
}

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })

for (const style of MINDMAP_STYLES) {
  const { html, pages } = renderMindmap({ ...base, style: style.id })
  writeFileSync(`M:/dsh/tmp/style_${style.id}.html`, html, 'utf8')
  await page.setContent(html, { waitUntil: 'networkidle' })
  const metrics = await page.evaluate(() => {
    const p = document.querySelectorAll('div.page')[1]
    const cs = getComputedStyle(p)
    const bodyFont = getComputedStyle(document.body).fontFamily
    const rootBox = p.querySelector('.mm-root .box')
    const rootRadius = rootBox ? getComputedStyle(rootBox).borderRadius : null
    const h = p.querySelector('.mm-h')
    const hRadius = h ? getComputedStyle(h).borderRadius : null
    return {
      c1: cs.getPropertyValue('--c1').trim(),
      bodyFont: bodyFont.split(',')[0],
      rootRadius,
      hRadius,
      cls: p.className,
    }
  })
  console.log(`${style.id}: font=${metrics.bodyFont} c1=${metrics.c1} rootRadius=${metrics.rootRadius} hRadius=${metrics.hRadius} cls=${metrics.cls}`)
  await page.locator('div.page').nth(1).screenshot({ path: `M:/dsh/tmp/style_${style.id}_p2.png` })
}
await browser.close()
console.log('done')
