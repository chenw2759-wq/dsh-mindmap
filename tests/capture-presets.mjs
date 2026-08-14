// Verify the preset menu items shown in the live GUI (text-level check) and
// capture a focused screenshot of the preset picker area.
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
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// Click the preset chip (标准模式 / 极简模式 / whatever is present)
const clicked = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button'))
  for (const el of els) {
    const t = (el.textContent ?? '').trim()
    if (/标准模式|极简模式|PTC|创造模式|思维导图/.test(t)) {
      el.click()
      return t.slice(0, 50)
    }
  }
  return null
})
console.log('clicked:', clicked)
await page.waitForTimeout(1200)

// Dump ALL visible text that looks like preset entries (menu items)
const menuTexts = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('[role="menuitem"], li, button'))
  const out = []
  for (const el of items) {
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (t.length > 0 && t.length < 120 && /模式|标准|创造|极简|思维导图|Preset/.test(t)) {
      out.push({ tag: el.tagName, role: el.getAttribute('role'), text: t })
    }
  }
  return out.slice(0, 25)
})
console.log('menu items:')
for (const m of menuTexts) console.log(`  [${m.tag}/${m.role}] ${m.text}`)

// Focused capture: crop around the chip + menu. Use bounding boxes.
const box = await page.evaluate(() => {
  // find the chip button (the one we clicked) and any open menu
  const els = Array.from(document.querySelectorAll('button'))
  let chip = null
  for (const el of els) {
    const t = (el.textContent ?? '').trim()
    if (/标准模式|极简模式|PTC|创造模式/.test(t)) { chip = el.getBoundingClientRect(); break }
  }
  const menus = Array.from(document.querySelectorAll('[role="menu"], [role="listbox"]'))
  let menu = null
  for (const m of menus) {
    const r = m.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) { menu = r; break }
  }
  return {
    chip: chip ? { x: chip.x, y: chip.y, w: chip.width, h: chip.height } : null,
    menu: menu ? { x: menu.x, y: menu.y, w: menu.width, h: menu.height } : null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
})
console.log('geometry:', JSON.stringify(box))

// Screenshot whole page + clip around chip/menu
await page.screenshot({ path: join(shotsDir, 'ui_preset_menu.png'), fullPage: true })
console.log('saved ui_preset_menu.png (fullPage)')

if (box.chip) {
  const x = Math.max(0, Math.floor(box.chip.x - 8))
  const y = Math.max(0, Math.floor(box.chip.y - 8))
  const w = Math.min(box.viewport.w - x, Math.ceil(box.chip.w) + 300)
  const h = Math.min(box.viewport.h - y, Math.ceil(box.chip.h) + (box.menu ? box.menu.h + 320 : 260))
  await page.screenshot({ path: join(shotsDir, 'ui_preset_picker.png'), clip: { x, y, width: w, height: h } })
  console.log('saved ui_preset_picker.png (clip)')
}

await browser.close()
