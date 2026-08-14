// Render the generated mindmap HTML in a headless browser and capture PNGs
// per page to verify layout (no overflow, no overlap). Run from the
// dsh-mindmap dir; playwright is resolved from the dsh-web-ui tree.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const htmlPath = process.argv[2] ?? 'M:/dsh/tmp/mm_test.html'
const outPrefix = process.argv[3] ?? 'M:/dsh/tmp/mm_capture'
const html = readFileSync(htmlPath, 'utf8')

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await chromium.launch({ executablePath: edge, headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
await page.setContent(html, { waitUntil: 'networkidle' })

// Count pages
const pageCount = await page.locator('div.page').count()
console.log('pages:', pageCount)

// Per-page metrics: check that each .left content box does not overflow its
// 256mm height (scrollHeight vs clientHeight in mm units)
for (let i = 0; i < pageCount; i++) {
  const metrics = await page.evaluate((idx) => {
    const p = document.querySelectorAll('div.page')[idx]
    const left = p.querySelector('.left')
    const mm = p.querySelector('.mm')
    const quiz = p.querySelector('.quiz')
    const title = p.querySelector('.title')
    const right = p.querySelector('.right')
    const pageRect = p.getBoundingClientRect()
    return {
      pageHmm: pageRect.height * 25.4 / 96,
      leftScrollHmm: left ? left.scrollHeight * 25.4 / 96 : 0,
      leftClientHmm: left ? left.clientHeight * 25.4 / 96 : 0,
      mmScrollHmm: mm ? mm.scrollHeight * 25.4 / 96 : 0,
      mmClientHmm: mm ? mm.clientHeight * 25.4 / 96 : 0,
      quizScrollHmm: quiz ? quiz.scrollHeight * 25.4 / 96 : 0,
      quizClientHmm: quiz ? quiz.clientHeight * 25.4 / 96 : 0,
      titleText: title ? title.textContent.trim().slice(0, 40) : (quiz ? '(quiz)' : '(cover)'),
      rightHmm: right ? right.clientHeight * 25.4 / 96 : 0,
    }
  }, i)
  const leftOverflow = metrics.leftScrollHmm > metrics.leftClientHmm + 1
  const mmOverflow = metrics.mmScrollHmm > metrics.mmClientHmm + 1
  const quizOverflow = metrics.quizScrollHmm > metrics.quizClientHmm + 1
  const kind = metrics.quizScrollHmm > 0 ? 'quiz' : metrics.titleText === '(cover)' ? 'cover' : 'branch'
  const flag = kind === 'branch' && mmOverflow ? ' ⚠OVERFLOW' : kind === 'quiz' && quizOverflow ? ' ⚠OVERFLOW' : ' ok'
  console.log(`page ${i + 1} [${kind}]: ${metrics.titleText} | left ${Math.round(metrics.leftScrollHmm)}/${Math.round(metrics.leftClientHmm)}mm | content ${kind === 'quiz' ? Math.round(metrics.quizScrollHmm) + '/' + Math.round(metrics.quizClientHmm) + 'mm' : Math.round(metrics.mmScrollHmm) + '/' + Math.round(metrics.mmClientHmm) + 'mm'}${flag} | page ${Math.round(metrics.pageHmm)}mm`)
  await page.locator('div.page').nth(i).screenshot({ path: `${outPrefix}_p${i + 1}.png` })
}

await browser.close()
console.log('captures written to', outPrefix + '_p*.png')
