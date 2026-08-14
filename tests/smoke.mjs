// Quick smoke test for the mindmap renderer (run: node tests/smoke.mjs)
import { readFile, writeFile } from 'node:fs/promises'
import { renderMindmap } from '../lib/index.js'

const doc = {
  title: '人体发育总论',
  course: '组织胚胎学自学课件',
  ebook: '组织学与胚胎学（第10版）',
  branches: [
    {
      id: '一', title: '概述与胚胎分期', en: 'overview',
      groups: [
        {
          heading: '（一）人体发生', items: [
            { text: '从受精卵到胎儿出生，历时约 <span class="k">266 天（38 周）</span>' },
            { text: '受精 → 卵裂 → 桑椹胚 → 胚泡 → 植入 → 胚层分化 → 胚体形成' },
          ],
        },
        {
          heading: '（二）胚与胎', items: [
            { text: '<b>胚（前 8 周）</b>：关键时期，易受环境因素影响致畸' },
            { text: '<b>胎（后 30 周）</b>：继续生长发育至成熟' },
          ],
        },
      ],
    },
    {
      id: '二', title: '生殖细胞与减数分裂', en: 'germ cell',
      groups: [
        {
          heading: '（一）体细胞', items: [
            { text: '二倍体：男子 <span class="k">46, XY</span>；女子 <span class="k">46, XX</span>' },
          ],
        },
        {
          heading: '（二）生殖细胞', items: [
            { text: '配子为单倍体：23, X 或 23, Y' },
            { text: '起源：卵黄囊原始生殖细胞 → 迁移至生殖嵴', subs: ['经减数分裂形成配子'] },
          ],
        },
      ],
    },
  ],
  quiz: [
    {
      type: 'choice', question: '人体发育总历时约多少周？',
      options: ['36 周', '38 周', '40 周', '42 周'], answer: 1,
      explanation: '从受精到出生约 266 天即 38 周。', pitfall: '勿与月经龄 40 周混淆',
    },
    { type: 'tf', question: '胚期指受精后第 3 周至第 8 周末。', answer: true, explanation: '胚期从第 3 周至第 8 周末。' },
  ],
}

const { html, pages } = renderMindmap(doc)
console.log('PAGES:')
for (const page of pages) {
  console.log(`  ${page.branch} @ ${page.fontSizePt}pt used=${Math.round(page.usedMm)}mm budget=${page.budgetMm}mm overflow=${page.overflow}`)
}
await writeFile('M:/dsh/tmp/mm_test.html', html, 'utf8')
console.log('html bytes:', Buffer.byteLength(html))
