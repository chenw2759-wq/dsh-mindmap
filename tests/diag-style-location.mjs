// Diagnose where the style selector currently lives and whether it's visible.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

const dump = await page.evaluate(() => {
  // 1. Style row injected in composer hero row?
  const styleRow = document.querySelector('[data-dsh-mindmap-style-row]')
  let styleRowInfo = null
  if (styleRow) {
    const r = styleRow.getBoundingClientRect()
    styleRowInfo = {
      visible: r.width > 0 && r.height > 0,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      pills: Array.from(styleRow.querySelectorAll('[data-dsh-mindmap-style]')).map((b) => (b.textContent ?? '').trim()),
      parentCls: (styleRow.parentElement?.className ?? '').toString().slice(0, 50),
    }
  }

  // 2. The preset/mode chip row
  const hero = document.querySelector('.wSkVaW_heroWorkspaceRow')
  const heroInfo = hero ? (() => {
    const r = hero.getBoundingClientRect()
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      children: Array.from(hero.children).map((c) => ({
        cls: (c.className ?? '').toString().slice(0, 40),
        text: (c.textContent ?? '').trim().slice(0, 25),
        data: Array.from(c.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(','),
      })),
    }
  })() : null

  // 3. Mode preset chip text
  const presetBtns = Array.from(document.querySelectorAll('button')).filter((b) => /模式/.test((b.textContent ?? '').trim())).map((b) => ({ text: (b.textContent ?? '').trim().slice(0, 20), title: (b.getAttribute('title') ?? '').slice(0, 40) }))

  return { styleRowInfo, heroInfo, presetBtns: presetBtns.slice(0, 8) }
})
console.log(JSON.stringify(dump, null, 1))
await page.screenshot({ path: 'M:/dsh/tmp/style_where.png' })
await browser.close()
