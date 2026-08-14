// Verify the theme system: each branch page should use a distinct color
// theme (CSS vars) and the rendered art elements should exist.
// Run: node tests/verify-theme.mjs
import { readFileSync } from 'node:fs'

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const html = readFileSync('D:/dsh_tmp/第七讲_技术与趋势_思维导图.html', 'utf8')
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
await page.setContent(html, { waitUntil: 'networkidle' })

const report = await page.evaluate(() => {
  const pages = Array.from(document.querySelectorAll('div.page'))
  return pages.map((p, i) => {
    const cs = getComputedStyle(p)
    const c1 = cs.getPropertyValue('--c1').trim()
    const rootBox = p.querySelector('.mm-root .box')
    const h = p.querySelector('.mm-h')
    const brace = p.querySelector('.mm-brace path')
    const deco = getComputedStyle(p, '::before').backgroundImage
    const left = p.querySelector('.left')
    const leftBg = left ? getComputedStyle(left).backgroundImage : null
    return {
      page: i + 1,
      c1,
      rootBoxGradient: rootBox ? getComputedStyle(rootBox).backgroundImage.slice(0, 60) : null,
      groupHeadColor: h ? getComputedStyle(h).color : null,
      braceStroke: brace ? brace.getAttribute('stroke') : null,
      cornerDeco: deco ? deco.slice(0, 50) : null,
      leftBg: leftBg ? leftBg.slice(0, 60) : null,
    }
  })
})
for (const r of report) {
  console.log(`page ${r.page}: c1=${r.c1} | root=${r.rootBoxGradient} | head=${r.groupHeadColor} | brace=${r.braceStroke} | deco=${r.cornerDeco}`)
}

// Distinct theme count
const themes = new Set(report.map((r) => r.c1).filter(Boolean))
console.log('distinct themes used:', themes.size)

await browser.close()
