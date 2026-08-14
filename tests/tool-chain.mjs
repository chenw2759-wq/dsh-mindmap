// Full-chain test of mm_generate tool logic: load the built tools module,
// build a MindmapDoc JSON file, run the tool's execute, verify the output
// HTML exists and fits. Run: node tests/tool-chain.mjs
import { writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { mmGenerateTool } from '../lib/index.js'

const doc = {
  title: '躯干骨及其连接',
  course: '系统解剖学课件',
  ebook: '系统解剖学（第9版）',
  branches: [
    {
      id: '一', title: '躯干骨的组成', en: 'trunk skeleton',
      groups: [
        {
          heading: '（一）椎骨', items: [
            { text: '24 块椎骨：颈椎 7、胸椎 12、腰椎 5' },
            { text: '椎骨的一般形态：椎体、椎弓、椎孔', subs: ['椎弓由椎弓根与椎弓板构成', '椎孔连成椎管，容纳脊髓'] },
          ],
        },
        {
          heading: '（二）骶骨与尾骨', items: [
            { text: '骶骨由 5 块骶椎融合而成，骶管为椎管延续', subs: ['骶管裂孔两侧有骶角，为骶管麻醉标志'] },
            { text: '尾骨由 4 块尾椎融合而成' },
          ],
        },
        {
          heading: '（三）胸骨与肋骨', items: [
            { text: '胸骨：胸骨柄、胸骨体、剑突' },
            { text: '肋骨 12 对，肋头、肋颈、肋结节', subs: ['第 1～7 对为真肋', '第 8～12 对为假肋'] },
          ],
        },
      ],
    },
  ],
  quiz: [
    { type: 'fill', question: '椎骨总数（不含骶尾骨）为 ____ 块。', answer: '24', explanation: '颈椎 7 + 胸椎 12 + 腰椎 5 = 24。' },
  ],
}

// Write the doc as a JSON file (the tool accepts a path)
const docPath = 'M:/dsh/tmp/mm_doc_test.json'
const outPath = 'M:/dsh/tmp/躯干骨及其连接_思维导图_01.html'
await writeFile(docPath, JSON.stringify(doc, null, 2), 'utf8')

const tool = mmGenerateTool()
const result = await tool.execute({ source: docPath, output: outPath })
console.log('ok:', result.ok)
console.log('outputPath:', result.outputPath)
console.log('pages:')
for (const page of result.pages) {
  console.log(`  ${page.branch} @ ${page.fontSizePt}pt used=${Math.round(page.usedMm)}mm overflow=${page.overflow}`)
}
console.log('warnings:', JSON.stringify(result.warnings))

const html = await readFile(outPath, 'utf8')
console.log('html bytes:', Buffer.byteLength(html))
console.log('has cover:', html.includes('class="cov"'))
console.log('has brace svg:', html.includes('class="mm-brace"'))
console.log('has quiz:', html.includes('章节测试'))
console.log('has note column:', html.includes('笔记区'))
console.log('font SimSun:', html.includes('SimSun'))
