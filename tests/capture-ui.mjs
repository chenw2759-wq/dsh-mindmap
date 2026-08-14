// Capture the new-session preset picker (模式选择栏) from the live dsh web
// GUI. Navigates to the web root, waits for the frame, screenshots the
// sidebar + composer area. Run: node tests/capture-ui.mjs
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = join(root, 'docs', 'screenshots')
mkdirSync(shotsDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

console.log('navigating to dsh web…')
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// Find the preset picker chip: search for text "标准模式"/"创造模式"/"思维导图模式"
const candidates = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, [role="button"], span, div'))
  const hits = all
    .filter((el) => /创造模式|标准模式|思维导图模式|极简模式|PTC 模式|Agent 预设/.test(el.textContent ?? ''))
    .map((el) => ({
      tag: el.tagName,
      text: (el.textContent ?? '').trim().slice(0, 60),
      cls: (el.className ?? '').toString().slice(0, 60),
    }))
  return hits.slice(0, 20)
})
console.log('preset-related elements found:', JSON.stringify(candidates, null, 1))

// Full-page screenshot first
await page.screenshot({ path: join(shotsDir, 'ui_home.png'), fullPage: true })
console.log('saved ui_home.png')

// Try to open the preset picker menu: click the seat chip if visible
const clicked = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button'))
  for (const el of els) {
    const t = (el.textContent ?? '').trim()
    if (t.includes('标准模式') || t.includes('创造模式') || t.includes('思维导图模式') || t.includes('极简模式')) {
      el.click()
      return t.slice(0, 60)
    }
  }
  return null
})
console.log('clicked preset chip:', clicked)

await page.waitForTimeout(1200)

// Screenshot the opened menu region
await page.screenshot({ path: join(shotsDir, 'ui_preset_menu.png') })
console.log('saved ui_preset_menu.png')

// Also grab the sidebar region
const sidebar = await page.locator('[data-pane="sidebar"]').first().screenshot({ path: join(shotsDir, 'ui_sidebar.png') }).catch(() => null)
console.log('sidebar shot:', sidebar !== null ? 'ok' : 'not found')

await browser.close()
