// Find robust selectors for the sidebar: full ancestor chain of the
// New Session button + the sidebar column container class.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const dump = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const newBtn = btns.find((b) => (b.textContent ?? '').trim() === '新会话')
  if (!newBtn) return { found: false }
  const chain = []
  let el = newBtn.parentElement
  for (let i = 0; i < 8 && el; i++) {
    chain.push({
      tag: el.tagName,
      cls: (el.className ?? '').toString().slice(0, 100),
      id: el.id || undefined,
      role: el.getAttribute('role'),
      childCount: el.children.length,
      firstChildIsBtn: el.firstElementChild?.tagName === 'BUTTON',
    })
    el = el.parentElement
  }
  return { found: true, chain }
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
