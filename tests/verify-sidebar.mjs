// Interactively verify the sidebar mindmap entry: click it, switch to the
// preview tab, load a generated HTML, confirm the iframe renders.
// Run: node tests/verify-sidebar.mjs
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// 1. Find and click the sidebar 思维导图 entry
const entryInfo = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry], button'))
  for (const el of els) {
    const t = (el.textContent ?? '').trim()
    if (t.includes('思维导图')) {
      const r = el.getBoundingClientRect()
      return { found: true, text: t.slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height }
    }
  }
  return { found: false }
})
console.log('sidebar entry:', JSON.stringify(entryInfo))

if (entryInfo.found) {
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry], button'))
    for (const el of els) {
      const t = (el.textContent ?? '').trim()
      if (t.includes('思维导图')) { el.click(); return }
    }
  })
  await page.waitForTimeout(1500)

  // 2. Check the panel view appeared
  const panelState = await page.evaluate(() => {
    const active = document.documentElement.getAttribute('data-dsh-mindmap-active')
    const view = document.querySelector('[data-dsh-mindmap-view]')
    const tabs = view ? Array.from(view.querySelectorAll('button')).map((b) => (b.textContent ?? '').trim()) : []
    return { active, hasView: !!view, tabs }
  })
  console.log('panel after click:', JSON.stringify(panelState))

  // 3. Click the 预览 tab
  const previewClicked = await page.evaluate(() => {
    const view = document.querySelector('[data-dsh-mindmap-view]')
    if (!view) return false
    const btns = Array.from(view.querySelectorAll('button'))
    const target = btns.find((b) => (b.textContent ?? '').trim() === '预览')
    if (!target) return false
    target.click()
    return true
  })
  console.log('preview tab clicked:', previewClicked)
  await page.waitForTimeout(800)

  // 4. Fill the path input and click 在浏览器打开
  const loadResult = await page.evaluate(async () => {
    const view = document.querySelector('[data-dsh-mindmap-view]')
    if (!view) return { ok: false, reason: 'no view' }
    const inputs = Array.from(view.querySelectorAll('input'))
    const pathInput = inputs.find((i) => (i.placeholder ?? '').includes('D:'))
    if (!pathInput) return { ok: false, reason: 'no path input' }
    // React-controlled input: set via native setter + input event
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(pathInput, 'D:/dsh_tmp/第七讲_技术与趋势_思维导图.html')
    pathInput.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 300))
    const btns = Array.from(view.querySelectorAll('button'))
    const open = btns.find((b) => (b.textContent ?? '').trim() === '在浏览器打开')
    if (!open) return { ok: false, reason: 'no open button' }
    open.click()
    await new Promise((r) => setTimeout(r, 1500))
    const frame = view.querySelector('iframe')
    if (!frame) return { ok: false, reason: 'no iframe' }
    return { ok: true, iframePresent: true, hasSrcDoc: (frame.getAttribute('srcdoc') ?? '').length > 0 }
  })
  console.log('load result:', JSON.stringify(loadResult))

  // screenshot the panel with the mindmap preview
  await page.screenshot({ path: 'M:/dsh/tmp/sidebar_preview_check.png' })
  console.log('screenshot saved')
}

await browser.close()
