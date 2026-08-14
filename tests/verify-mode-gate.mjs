// Verify the style row is gated by mode: hidden for standard mode, visible
// for 思维导图模式. Run: node tests/verify-mode-gate.mjs
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

const initial = await page.evaluate(() => {
  const row = document.querySelector('[data-dsh-mindmap-style-row]')
  const modeText = (() => {
    const hero = document.querySelector('.wSkVaW_heroWorkspaceRow')
    for (const slot of hero.querySelectorAll('[data-slot]')) {
      const t = (slot.textContent ?? '').trim()
      if (t.includes('模式')) return t
    }
    return ''
  })()
  return { modeText, rowExists: !!row, rowDisplay: row ? getComputedStyle(row).display : null }
})
console.log('initial (default mode):', JSON.stringify(initial))

// Open the preset menu and pick 思维导图模式
await page.evaluate(() => {
  const hero = document.querySelector('.wSkVaW_heroWorkspaceRow')
  const slot = Array.from(hero.querySelectorAll('[data-slot]')).find((s) => ((s.textContent ?? '').trim().includes('模式')))
  const btn = slot?.querySelector('button')
  if (btn) btn.click()
})
await page.waitForTimeout(800)

const menuItems = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[role="menuitem"], [role="menu"] button, [role="menuitemradio"]')).map((b) => (b.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 20)).filter(Boolean)
})
console.log('menu items:', JSON.stringify(menuItems))

// Click 思维导图模式 in the open menu
const clicked = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button, [role="menuitem"]'))
  const target = els.find((b) => (b.textContent ?? '').trim().replace(/\s+/g, ' ').startsWith('思维导图模式'))
  if (target) { target.click(); return true }
  return false
})
console.log('clicked 思维导图模式:', clicked)
await page.waitForTimeout(1200)

const after = await page.evaluate(() => {
  const row = document.querySelector('[data-dsh-mindmap-style-row]')
  const hero = document.querySelector('.wSkVaW_heroWorkspaceRow')
  let modeText = ''
  for (const slot of hero.querySelectorAll('[data-slot]')) {
    const t = (slot.textContent ?? '').trim()
    if (t.includes('模式')) { modeText = t; break }
  }
  return { modeText, rowDisplay: row ? getComputedStyle(row).display : null, rowVisible: row ? row.getBoundingClientRect().height > 0 : false }
})
console.log('after picking 思维导图模式:', JSON.stringify(after))

await page.screenshot({ path: 'M:/dsh/tmp/mode_gate_check.png' })
await browser.close()
