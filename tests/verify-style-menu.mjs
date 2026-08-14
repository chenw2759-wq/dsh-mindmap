// Verify the style sub-menu + drawer: click the sidebar 思维导图 entry,
// expect a style menu to open, pick 活泼创意, expect the drawer to open and
// style API to persist. Also verify the drawer is a right-hand overlay.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// 1. Sidebar entry present?
const entry = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry]'))
  if (!els[0]) return { found: false }
  const r = els[0].getBoundingClientRect()
  return { found: true, x: r.x, y: r.y, w: r.width, h: r.height, text: (els[0].textContent ?? '').trim() }
})
console.log('entry:', JSON.stringify(entry))

// 2. Click it → style menu should appear
await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry]'))
  if (els[0]) els[0].click()
})
await page.waitForTimeout(800)
const menu = await page.evaluate(() => {
  const m = document.querySelector('[data-dsh-mindmap-menu]')
  if (!m) return { found: false }
  const visible = getComputedStyle(m).display !== 'none'
  const options = Array.from(m.querySelectorAll('[data-dsh-mindmap-style]')).map((b) => (b.textContent ?? '').trim())
  return { found: true, visible, options }
})
console.log('style menu:', JSON.stringify(menu))

// 3. Pick 活泼创意 → drawer should open + style API persists
if (menu.found && menu.visible) {
  await page.evaluate(() => {
    const m = document.querySelector('[data-dsh-mindmap-menu]')
    const btn = Array.from(m.querySelectorAll('[data-dsh-mindmap-style]')).find((b) => (b.textContent ?? '').includes('活泼创意'))
    if (btn) btn.click()
  })
  await page.waitForTimeout(1500)
}
const after = await page.evaluate(() => {
  const active = document.documentElement.getAttribute('data-dsh-mindmap-active')
  const view = document.querySelector('[data-dsh-mindmap-view]')
  const drawer = view ? getComputedStyle(view) : null
  return {
    active,
    drawerPresent: !!view,
    drawerDisplay: drawer ? drawer.display : null,
    drawerPosition: drawer ? drawer.position : null,
    drawerRight: drawer ? drawer.right : null,
    drawerWidth: drawer ? drawer.width : null,
    drawerBodyText: view ? (view.textContent ?? '').slice(0, 80) : null,
  }
})
console.log('after pick:', JSON.stringify(after))

// 4. Verify style API persisted
const styleRes = await page.evaluate(async () => {
  const r = await fetch('/api/dsh-mindmap/style')
  return (await r.json())
})
console.log('style API now:', JSON.stringify(styleRes))

// screenshot
await page.screenshot({ path: 'M:/dsh/tmp/style_menu_check.png' })
console.log('screenshot saved')
await browser.close()
