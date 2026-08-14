// Find all sidebar-ish buttons by text; look for 思维导图 / SSH / 任务看板.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const result = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, [role="button"], a'))
  const interesting = all
    .map((el, i) => ({ i, tag: el.tagName, text: (el.textContent ?? '').trim().slice(0, 20), title: (el.getAttribute('title') ?? '').slice(0, 40), aria: el.getAttribute('aria-label') ?? '' }))
    .filter((x) => /思维导图|SSH|任务看板|新会话|工作区|记忆|设置/.test(x.text + x.title + x.aria))
  return interesting.slice(0, 30)
})
console.log(JSON.stringify(result, null, 1))
await browser.close()
