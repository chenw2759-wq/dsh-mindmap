// Verify: closable tabs, tab switching, zoom controls, clean bg, wide drawer.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const before = await page.evaluate(() => {
  const view = document.querySelector('[data-dsh-mindmap-view]')
  if (!view) return { found: false }
  const vr = view.getBoundingClientRect()
  const stage = Array.from(view.querySelectorAll('div')).find((d) => getComputedStyle(d).overflow === 'auto' && d.clientWidth > 300)
  const canvas = view.querySelector('[style*="scale"]')
  const iframe = view.querySelector('iframe')
  const closeBtns = Array.from(view.querySelectorAll('[aria-label="close"]'))
  const tabs = Array.from(view.querySelectorAll('[role="tab"]')).map((t) => (t.textContent ?? '').trim())
  return {
    found: true,
    drawerW: Math.round(vr.width),
    drawerPct: Math.round(vr.width / innerWidth * 100),
    stageBgImage: stage ? getComputedStyle(stage).backgroundImage.slice(0, 50) : null,
    stageBgColor: stage ? getComputedStyle(stage).backgroundColor : null,
    hasCanvas: !!canvas,
    canvasTransform: canvas ? (canvas.getAttribute('style') ?? '').slice(0, 80) : null,
    iframeLoaded: iframe ? (iframe.getAttribute('srcdoc') ?? '').length > 0 : false,
    closeBtnCount: closeBtns.length,
    tabs,
  }
})
console.log('before close:', JSON.stringify(before, null, 1))

// Click the first tab's close button; expect tab count to drop by one.
if (before.found && before.closeBtnCount > 0) {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-dsh-mindmap-view] [aria-label="close"]')
    if (btn) btn.click()
  })
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => {
    const view = document.querySelector('[data-dsh-mindmap-view]')
    return {
      tabs: Array.from(view.querySelectorAll('[role="tab"]')).map((t) => (t.textContent ?? '').trim()),
      closeBtnCount: view.querySelectorAll('[aria-label="close"]').length,
      activeCount: Array.from(view.querySelectorAll('[role="tab"]')).filter((t) => t.getAttribute('aria-selected') === 'true').length,
    }
  })
  console.log('after close:', JSON.stringify(after))
}

// Zoom in and check the canvas transform changes.
if (before.found) {
  await page.evaluate(() => {
    const view = document.querySelector('[data-dsh-mindmap-view]')
    const btn = Array.from(view.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === '＋')
    if (btn) btn.click()
  })
  await page.waitForTimeout(400)
  const zoomState = await page.evaluate(() => {
    const view = document.querySelector('[data-dsh-mindmap-view]')
    const canvas = view.querySelector('[style*="scale"]')
    const pct = Array.from(view.querySelectorAll('span')).find((s) => /%$/.test((s.textContent ?? '').trim()))
    return { canvasTransform: canvas ? (canvas.getAttribute('style') ?? '') : null, zoomPct: pct ? pct.textContent : null }
  })
  console.log('after zoom in:', JSON.stringify(zoomState))
}

await page.screenshot({ path: 'M:/dsh/tmp/closable_tabs_check.png' })
await browser.close()
