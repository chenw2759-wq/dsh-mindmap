// Verify: clean flat stage background (no grid), wider drawer, tabs + zoom.
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(5000)

const state = await page.evaluate(() => {
  const view = document.querySelector('[data-dsh-mindmap-view]')
  if (!view) return { found: false }
  const vr = view.getBoundingClientRect()
  const stage = view.querySelector('[class*="stage"]') ?? Array.from(view.querySelectorAll('div')).find((d) => getComputedStyle(d).overflow === 'auto' && d.clientWidth > 300)
  const stageStyle = stage ? getComputedStyle(stage) : null
  const canvas = view.querySelector('[style*="scale"]')
  const zoom = canvas ? /scale\(([\d.]+)\)/.exec(canvas.getAttribute('style'))?.[1] : null
  return {
    found: true,
    drawerW: Math.round(vr.width),
    drawerWpct: Math.round(vr.width / window.innerWidth * 100),
    stageBg: stageStyle ? stageStyle.backgroundImage.slice(0, 60) : null,
    stageBgColor: stageStyle ? stageStyle.backgroundColor : null,
    zoom,
    tabCount: view.querySelectorAll('[role="tab"]').length,
  }
})
console.log('state:', JSON.stringify(state, null, 1))
await page.screenshot({ path: 'M:/dsh/tmp/clean_bg_check.png' })
await browser.close()
