// README screenshot capture: render the sample mindmap and save one PNG per
// page into docs/screenshots/. Run: node tests/readme-shots.mjs
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = join(root, 'docs', 'screenshots')
mkdirSync(shotsDir, { recursive: true })

const html = readFileSync('M:/dsh/tmp/README_sample.html', 'utf8')
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1600, height: 1131 } })
await page.setContent(html, { waitUntil: 'networkidle' })

const pageCount = await page.locator('div.page').count()
console.log('pages:', pageCount)

const names = ['cover', 'branch1', 'branch2', 'branch3', 'quiz']
for (let i = 0; i < pageCount; i++) {
  const name = names[i] ?? `page${i + 1}`
  const out = join(shotsDir, `${name}.png`)
  await page.locator('div.page').nth(i).screenshot({ path: out })
  console.log('saved', out)
}

await browser.close()
