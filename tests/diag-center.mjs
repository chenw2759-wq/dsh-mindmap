// Find the conversation/center column container class in the live DOM.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const dump = await page.evaluate(() => {
  // The composer textarea / conversation area
  const textarea = document.querySelector('textarea[placeholder], [contenteditable="true"]')
  let chain = []
  let el = textarea ? textarea.parentElement : null
  for (let i = 0; i < 10 && el; i++) {
    chain.push({ tag: el.tagName, cls: (el.className ?? '').toString().slice(0, 90), data: Array.from(el.attributes).filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(',') })
    el = el.parentElement
  }
  // Also find panes by class fragments
  const cols = Array.from(document.querySelectorAll('[class*="centerCol"], [class*="conversation"], [class*="mainCol"], [class*="contentCol"]')).map((c) => ({ cls: (c.className ?? '').toString().slice(0, 80), children: c.children.length }))
  return { textareaFound: !!textarea, composerChain: chain, cols: cols.slice(0, 6) }
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
