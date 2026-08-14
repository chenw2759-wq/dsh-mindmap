// Verify the style selector now lives in the composer (preset/mode picker
// row) and the sidebar entry no longer opens a sub-menu.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

// 1. Style row in composer (next to the preset chip)?
const composer = await page.evaluate(() => {
  const row = document.querySelector('[data-dsh-mindmap-style-row]')
  if (!row) return { found: false }
  const hero = row.closest('.wSkVaW_heroWorkspaceRow')
  const pills = Array.from(row.querySelectorAll('[data-dsh-mindmap-style]')).map((b) => (b.textContent ?? '').trim())
  return {
    found: true,
    inHeroRow: !!hero,
    pills,
    label: (row.querySelector('span')?.textContent ?? '').trim(),
    display: getComputedStyle(row).display,
  }
})
console.log('composer style row:', JSON.stringify(composer))

// 2. Sidebar entry: click should open the drawer directly (no sub-menu).
const entry = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry]'))
  return els.length > 0 ? { found: true, text: (els[0].textContent ?? '').trim() } : { found: false }
})
console.log('sidebar entry:', JSON.stringify(entry))

await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry]'))
  if (els[0]) els[0].click()
})
await page.waitForTimeout(1000)
const afterClick = await page.evaluate(() => {
  const menu = document.querySelector('[data-dsh-mindmap-menu]')
  const active = document.documentElement.getAttribute('data-dsh-mindmap-active')
  return { oldMenuPresent: !!menu, drawerActive: active !== null }
})
console.log('after sidebar click:', JSON.stringify(afterClick))

// 3. Pick a style pill in the composer → persists + opens drawer.
if (composer.found) {
  await page.evaluate(() => {
    const row = document.querySelector('[data-dsh-mindmap-style-row]')
    const btn = Array.from(row.querySelectorAll('[data-dsh-mindmap-style]')).find((b) => (b.textContent ?? '').trim() === '学术')
    if (btn) btn.click()
  })
  await page.waitForTimeout(1200)
  const styleRes = await page.evaluate(async () => (await (await fetch('/api/dsh-mindmap/style')).json()))
  const drawerActive = await page.evaluate(() => document.documentElement.getAttribute('data-dsh-mindmap-active'))
  console.log('after pill pick: style=', JSON.stringify(styleRes), 'drawerActive=', drawerActive)
}

await page.screenshot({ path: 'M:/dsh/tmp/composer_style_check.png' })
console.log('screenshot saved')
await browser.close()
