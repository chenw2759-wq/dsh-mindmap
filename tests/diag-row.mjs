// Inspect the heroWorkspaceRow children to find where to inject the style row.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

const dump = await page.evaluate(() => {
  const row = document.querySelector('.wSkVaW_heroWorkspaceRow')
  if (!row) return { found: false }
  const children = Array.from(row.children).map((c) => ({
    tag: c.tagName,
    cls: (c.className ?? '').toString().slice(0, 60),
    text: (c.textContent ?? '').trim().slice(0, 30),
    data: Array.from(c.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(','),
  }))
  const rowRect = row.getBoundingClientRect()
  return { found: true, rowRect: { x: rowRect.x, y: rowRect.y, w: rowRect.width, h: rowRect.height }, children }
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
