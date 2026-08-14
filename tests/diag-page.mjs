// Dump page state: URL, title, body text length, key markers.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)
const state = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  bodyLen: document.body ? document.body.innerText.length : -1,
  bodyHead: document.body ? document.body.innerText.slice(0, 200) : null,
  hasRoot: !!document.querySelector('#root, [data-dsh-root], .app'),
  scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => s.src).slice(0, 5),
}))
console.log(JSON.stringify(state, null, 1))
await browser.close()
