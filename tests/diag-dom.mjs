// Dump the real sidebar DOM structure of the current web build.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const dump = await page.evaluate(() => {
  // Walk top-level DOM to find the app root and its panes
  const root = document.querySelector('#root') ?? document.body.firstElementChild
  const info = []
  const walk = (el, depth) => {
    if (!el || depth > 3) return
    const cls = (el.className ?? '').toString()
    const dattrs = Array.from(el.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name)
    if (depth <= 2 && (cls.includes('sidebar') || cls.includes('pane') || dattrs.length > 0 || /grid|frame|col/.test(cls))) {
      info.push({ depth, tag: el.tagName, cls: cls.slice(0, 80), data: dattrs.join(','), children: el.children.length, firstText: (el.textContent ?? '').slice(0, 40) })
    }
    for (const child of el.children) walk(child, depth + 1)
  }
  walk(document.body, 0)
  // Also find where 新会话 button lives and its ancestors
  const btns = Array.from(document.querySelectorAll('button'))
  const newBtn = btns.find((b) => (b.getAttribute('aria-label') ?? '') === '新建会话' || (b.textContent ?? '').trim() === '新会话')
  const ancestorPath = []
  if (newBtn) {
    let el = newBtn
    for (let i = 0; i < 5 && el; i++) {
      ancestorPath.push({ tag: el.tagName, cls: (el.className ?? '').toString().slice(0, 70), data: Array.from(el.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(',') })
      el = el.parentElement
    }
  }
  return { layout: info.slice(0, 25), newBtnAncestors: ancestorPath }
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
