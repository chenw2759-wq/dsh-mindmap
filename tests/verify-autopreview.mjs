// End-to-end auto-preview: call the host generate API (writes an HTML +
// pushes to recent), then in a fresh page the drawer should auto-open and
// load that HTML. Run: node tests/verify-autopreview.mjs
import { readFileSync } from 'node:fs'

const playwrightPath = 'file:///C:/Users/cysja/.dsh/plugins/dsh-web-ui/node_modules/playwright/index.mjs'
const { chromium } = await import(playwrightPath)

// 1. Generate a mindmap via the host API (like a session would).
const doc = {
  title: '自动预览测试',
  course: '测试课件',
  ebook: '测试电子书',
  style: 'creative',
  branches: [
    { id: '一', title: '测试主干', en: 'test', groups: [{ heading: '（一）分组', items: [{ text: '这是自动预览测试条目', subs: ['子条目'] }] }] },
  ],
  quiz: [{ type: 'tf', question: '这是测试题？', answer: true, explanation: '解析' }],
}
const genRes = await fetch('http://127.0.0.1:3080/api/dsh-mindmap/generate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ doc, output: 'D:/dsh_tmp/autopreview_test.html' }),
}).then((r) => r.json())
console.log('generate:', JSON.stringify(genRes))

// 2. Fresh page: the drawer should auto-open and load the HTML.
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(6000)

const state = await page.evaluate(() => {
  const active = document.documentElement.getAttribute('data-dsh-mindmap-active')
  const view = document.querySelector('[data-dsh-mindmap-view]')
  const frame = view ? view.querySelector('iframe') : null
  const frameSrcLen = frame ? (frame.getAttribute('srcdoc') ?? '').length : 0
  const recent = view ? (view.textContent ?? '') : ''
  return { active, drawerOpen: active !== null, framePresent: !!frame, frameSrcLen, recentHasPath: recent.includes('autopreview_test') }
})
console.log('auto-preview state:', JSON.stringify(state))
await page.screenshot({ path: 'M:/dsh/tmp/autopreview_check.png' })
await browser.close()
