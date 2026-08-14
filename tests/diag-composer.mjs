// Locate the preset/mode picker area in the composer (新建会话界面), where
// the style selector should be injected. Run: node tests/diag-composer.mjs
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

const dump = await page.evaluate(() => {
  // The preset chip (思维导图模式 / 标准模式 etc.)
  const btns = Array.from(document.querySelectorAll('button'))
  const presetChip = btns.find((b) => /思维导图模式|标准模式|极简模式/.test((b.textContent ?? '').trim()) && (b.getAttribute('title') ?? '').includes('预设'))
  if (!presetChip) return { found: false, buttons: btns.map((b) => (b.textContent ?? '').trim().slice(0, 20)).filter(Boolean).slice(0, 25) }
  const chain = []
  let el = presetChip.parentElement
  for (let i = 0; i < 6 && el; i++) {
    chain.push({
      tag: el.tagName,
      cls: (el.className ?? '').toString().slice(0, 90),
      data: Array.from(el.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(','),
      childCount: el.children.length,
    })
    el = el.parentElement
  }
  const chipRect = presetChip.getBoundingClientRect()
  return { found: true, chipText: (presetChip.textContent ?? '').trim(), chipRect: { x: chipRect.x, y: chipRect.y, w: chipRect.width, h: chipRect.height }, chain }
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
