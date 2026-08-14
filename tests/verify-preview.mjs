// Deep-verify the in-panel preview: open sidebar entry, preview tab, load the
// lecture-7 HTML, and measure the iframe's rendered content (page count,
// fonts, colors) to confirm it renders fully inside the panel.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// open sidebar entry
await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-dsh-mindmap-entry]'))
  if (els[0]) els[0].click()
})
await page.waitForTimeout(1000)

// click 预览 tab
await page.evaluate(() => {
  const view = document.querySelector('[data-dsh-mindmap-view]')
  const btns = Array.from(view.querySelectorAll('button'))
  const t = btns.find((b) => (b.textContent ?? '').trim() === '预览')
  if (t) t.click()
})
await page.waitForTimeout(600)

// fill path + click open
await page.evaluate(async () => {
  const view = document.querySelector('[data-dsh-mindmap-view]')
  const input = Array.from(view.querySelectorAll('input')).find((i) => (i.placeholder ?? '').includes('D:'))
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, 'D:/dsh_tmp/第七讲_技术与趋势_思维导图.html')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 300))
  const open = Array.from(view.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === '在浏览器打开')
  open.click()
  await new Promise((r) => setTimeout(r, 2000))
})
await page.waitForTimeout(1500)

// inspect iframe content
const frameInfo = await page.evaluate(() => {
  const frame = document.querySelector('[data-dsh-mindmap-view] iframe')
  if (!frame) return { found: false }
  const doc = frame.contentDocument
  if (!doc) return { found: true, crossOrigin: true }
  const pages = doc.querySelectorAll('div.page').length
  const hasBrace = !!doc.querySelector('.mm-brace svg path')
  const hasSimSun = (doc.querySelector('style')?.textContent ?? '').includes('SimSun')
  const themes = new Set(Array.from(doc.querySelectorAll('div.page')).map((p) => getComputedStyle(p).getPropertyValue('--c1').trim()).filter(Boolean))
  const title = doc.querySelector('.cov .big')?.textContent ?? ''
  return { found: true, pages, hasBrace, hasSimSun, themeCount: themes.size, title }
})
console.log('iframe:', JSON.stringify(frameInfo))

// screenshot the panel
await page.screenshot({ path: 'M:/dsh/tmp/sidebar_preview_deep.png' })
console.log('screenshot saved')
await browser.close()
