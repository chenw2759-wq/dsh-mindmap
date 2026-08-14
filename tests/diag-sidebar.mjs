// Diagnose sidebar entry: dump all injected plugin entries + look for the
// mindmap entry with looser matching. Run: node tests/diag-sidebar.mjs
const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') consoleErrors.push(msg.text().slice(0, 200)) })
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message.slice(0, 200)))

await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

// Dump everything with data-dsh-* attributes + sidebar pane content
const dump = await page.evaluate(() => {
  const entries = Array.from(document.querySelectorAll('[data-dsh-ssh-entry], [data-dsh-mindmap-entry], [data-dsh-task-board-entry]'))
    .map((el) => ({ tag: el.tagName, attr: Array.from(el.attributes).filter((a) => a.name.startsWith('data-dsh')).map((a) => a.name + '=' + a.value), text: (el.textContent ?? '').trim().slice(0, 30) }))
  const panes = Array.from(document.querySelectorAll('[data-pane]')).map((p) => ({ pane: p.getAttribute('data-pane'), children: p.children.length, firstChildTag: p.firstElementChild?.tagName }))
  const sidebarText = (document.querySelector('[data-pane="sidebar"]')?.textContent ?? '').slice(0, 300)
  return { entries: entries.slice(0, 15), panes, sidebarText }
})
console.log('data-dsh entries:', JSON.stringify(dump.entries, null, 1))
console.log('panes:', JSON.stringify(dump.panes))
console.log('sidebar text:', dump.sidebarText)
console.log('console errors:', consoleErrors.slice(0, 5))

await browser.close()
