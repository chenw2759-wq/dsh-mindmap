// Verify bigger fonts + full-height fill: measure rendered item font size,
// content height vs available height, and gap distribution.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
import { readFileSync } from 'node:fs'

const html = readFileSync('D:/dsh_tmp/第七讲_技术与趋势_思维导图.html', 'utf8')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
await page.setContent(html, { waitUntil: 'networkidle' })

const report = await page.evaluate(() => {
  const pages = Array.from(document.querySelectorAll('div.page'))
  const out = []
  for (let i = 1; i < Math.min(pages.length, 7); i++) {
    const p = pages[i]
    const mm = p.querySelector('.mm')
    const stack = p.querySelector('.mm-stack')
    const item = p.querySelector('.mm-item')
    const h = p.querySelector('.mm-h')
    const left = p.querySelector('.left')
    out.push({
      page: i,
      itemFont: item ? getComputedStyle(item).fontSize : null,
      headFont: h ? getComputedStyle(h).fontSize : null,
      stackHmm: stack ? Math.round(stack.getBoundingClientRect().height * 25.4 / 96) : null,
      leftHmm: left ? Math.round(left.getBoundingClientRect().height * 25.4 / 96) : null,
      fillPct: stack && left ? Math.round(stack.getBoundingClientRect().height / left.getBoundingClientRect().height * 100) : null,
      mmJustify: mm ? getComputedStyle(mm).justifyContent : null,
      stackJustify: stack ? getComputedStyle(stack).justifyContent : null,
      title: p.querySelector('.title')?.textContent?.slice(0, 25),
    })
  }
  return out
})
for (const r of report) console.log(`p${r.page} ${r.title}: item=${r.itemFont} head=${r.headFont} fill=${r.fillPct}% stack=${r.stackHmm}/${r.leftHmm}mm justify=${r.mmJustify}/${r.stackJustify}`)
await browser.close()
