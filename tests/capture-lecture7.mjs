// Capture the lecture-7 mindmap with the new art styles. Run:
// node tests/capture-lecture7.mjs
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = join(root, 'docs', 'screenshots')
mkdirSync(shotsDir, { recursive: true })

const html = readFileSync('D:/dsh_tmp/第七讲_技术与趋势_思维导图.html', 'utf8')
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
await page.setContent(html, { waitUntil: 'networkidle' })

const pageCount = await page.locator('div.page').count()
console.log('pages:', pageCount)

const names = ['cover', 'b1_theory', 'b2_pattern', 'b3_indicators1', 'b4_indicators2', 'b5_theories', 'b6_system', 'quiz']
for (let i = 0; i < pageCount; i++) {
  const name = names[i] ?? `page${i + 1}`
  const metrics = await page.evaluate((idx) => {
    const p = document.querySelectorAll('div.page')[idx]
    const left = p.querySelector('.left')
    const mm = p.querySelector('.mm')
    const quiz = p.querySelector('.quiz')
    return {
      leftScroll: left ? left.scrollHeight * 25.4 / 96 : 0,
      leftClient: left ? left.clientHeight * 25.4 / 96 : 0,
      mmScroll: mm ? mm.scrollHeight * 25.4 / 96 : 0,
      mmClient: mm ? mm.clientHeight * 25.4 / 96 : 0,
      quizScroll: quiz ? quiz.scrollHeight * 25.4 / 96 : 0,
      quizClient: quiz ? quiz.clientHeight * 25.4 / 96 : 0,
    }
  }, i)
  const kind = metrics.quizScroll > 0 ? 'quiz' : metrics.mmScroll === 0 ? 'cover' : 'branch'
  const content = kind === 'quiz' ? `${Math.round(metrics.quizScroll)}/${Math.round(metrics.quizClient)}` : `${Math.round(metrics.mmScroll)}/${Math.round(metrics.mmClient)}`
  const flag = kind === 'branch' && metrics.mmScroll > metrics.mmClient + 1 ? ' ⚠OVERFLOW' : ' ok'
  console.log(`page ${i + 1} [${kind}] ${name}: content ${content}mm${flag}`)
  await page.locator('div.page').nth(i).screenshot({ path: join(shotsDir, `lecture7_${name}.png`) })
}

await browser.close()
console.log('done — screenshots in', shotsDir)
