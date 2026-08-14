// Verify the new tab + zoom drawer UI:
// 1. Seed two generated HTMLs via the host API (→ recent feed).
// 2. Fresh page: drawer auto-opens, tab bar shows both files, canvas is zoomable.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const mkDoc = (title) => ({
  title,
  course: '测试',
  ebook: '测试',
  style: 'classic',
  branches: [{ id: '一', title: '主干', en: 'one', groups: [{ heading: '（一）组', items: [{ text: '条目内容' }] }] }],
})
await fetch('http://127.0.0.1:3080/api/dsh-mindmap/generate', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ doc: mkDoc('思维导图A'), output: 'D:/dsh_tmp/tab_test_a.html' }),
})
await fetch('http://127.0.0.1:3080/api/dsh-mindmap/generate', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ doc: mkDoc('思维导图B'), output: 'D:/dsh_tmp/tab_test_b.html' }),
})
console.log('seeded 2 HTMLs')

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const state = await page.evaluate(() => {
  const view = document.querySelector('[data-dsh-mindmap-view]')
  if (!view) return { found: false }
  const tabs = Array.from(view.querySelectorAll('[role="tab"]')).map((t) => ({
    text: (t.textContent ?? '').trim(),
    active: t.getAttribute('aria-selected'),
  }))
  const zoomBtns = Array.from(view.querySelectorAll('button')).filter((b) => /[−＋⤢]|1:1/.test((b.textContent ?? '').trim())).map((b) => (b.textContent ?? '').trim())
  const zoomPct = Array.from(view.querySelectorAll('span')).find((s) => /%$/.test((s.textContent ?? '').trim()))?.textContent ?? null
  const canvas = view.querySelector('[style*="scale"]')
  const canvasStyle = canvas ? canvas.getAttribute('style') : null
  const iframe = view.querySelector('iframe')
  const srcLen = iframe ? (iframe.getAttribute('srcdoc') ?? '').length : 0
  const hasInput = !!view.querySelector('input')
  const bodyText = (view.textContent ?? '').slice(0, 100)
  return { found: true, tabs, zoomBtns, zoomPct, canvasStyle, srcLen, hasInput, bodyText }
})
console.log('drawer state:', JSON.stringify(state, null, 1))
await page.screenshot({ path: 'M:/dsh/tmp/tab_zoom_check.png' })
await browser.close()
