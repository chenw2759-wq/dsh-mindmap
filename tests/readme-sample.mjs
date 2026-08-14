// Generate the README screenshot set: cover / branch / quiz pages of a
// realistic mindmap, plus a reference-vs-generated side-by-side comparison.
// Run: node tests/readme-shots.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { renderMindmap } from '../lib/index.js'

const doc = {
  title: '躯干骨及其连接',
  course: '系统解剖学（第 2 版）课件',
  ebook: '系统解剖学（第 9 版）',
  branches: [
    {
      id: '一', title: '躯干骨的组成', en: 'trunk skeleton',
      groups: [
        {
          heading: '（一）椎骨（24 块）', items: [
            { text: '颈椎 7、胸椎 12、腰椎 5；椎体、椎弓、椎孔 <span class="k">椎管</span>容纳脊髓' },
            { text: '椎弓 = 椎弓根 + 椎弓板；7 个突起（棘突 1、横突 2、关节突 4）', subs: ['寰椎无椎体；枢椎有齿突', '隆椎棘突长，是计数椎骨的标志'] },
          ],
        },
        {
          heading: '（二）骶骨与尾骨', items: [
            { text: '骶骨：5 块骶椎融合，<b>骶管</b>为椎管延续，骶管裂孔两侧有 <span class="k">骶角</span>（麻醉标志）', subs: ['岬：骶骨底前缘前凸，为产科测量标志'] },
            { text: '尾骨：4 块尾椎融合' },
          ],
        },
        {
          heading: '（三）胸骨与肋骨', items: [
            { text: '胸骨 = 胸骨柄 + 胸骨体 + 剑突；胸骨角平对第 2 肋', subs: ['胸骨角：计数肋的标志'] },
            { text: '肋骨 12 对：真肋 1～7、假肋 8～12（8～10 借软骨连于上位肋）', subs: ['肋头、肋颈、肋结节；肋沟内有血管神经'] },
          ],
        },
      ],
    },
    {
      id: '二', title: '椎骨间的连结', en: 'vertebral joints',
      groups: [
        {
          heading: '（一）椎间盘', items: [
            { text: '纤维环（外）+ 髓核（内）；<span class="k">后纵韧带</span>限制其向后突出', subs: ['腰椎间盘突出：髓核向后外侧突入椎管压迫神经'] },
          ],
        },
        {
          heading: '（二）韧带', items: [
            { text: '前纵韧带：限制脊柱过度后伸；后纵韧带：限制过度前屈' },
            { text: '黄韧带、棘间韧带、棘上韧带、横突间韧带' },
          ],
        },
        {
          heading: '（三）关节', items: [
            { text: '关节突关节（滑膜关节）、寰枢关节、寰枕关节' },
          ],
        },
      ],
    },
    {
      id: '三', title: '胸廓的构成', en: 'thorax',
      groups: [
        {
          heading: '（一）组成', items: [
            { text: '胸椎 + 肋 + 胸骨围成；上口小（胸廓上口），下口大（胸廓下口，被膈封闭）' },
          ],
        },
        {
          heading: '（二）功能', items: [
            { text: '保护心、肺；参与呼吸运动（肋上提 → 胸廓前后径、横径增大）' },
          ],
        },
      ],
    },
  ],
  quiz: [
    {
      type: 'choice', question: '下列哪块骨不属于躯干骨？',
      options: ['胸骨', '骶骨', '肩胛骨', '肋骨'], answer: 2,
      explanation: '肩胛骨属于上肢带骨；躯干骨包括椎骨、骶尾骨、胸骨与肋。',
      pitfall: '注意躯干骨与上肢带的划分边界',
    },
    {
      type: 'choice', question: '胸骨角平对第几肋？',
      options: ['第 1 肋', '第 2 肋', '第 3 肋', '第 4 肋'], answer: 1,
      explanation: '胸骨角两侧平对第 2 肋，是计数肋序数的标志。',
    },
    { type: 'tf', question: '前纵韧带限制脊柱过度前屈。', answer: false, explanation: '前纵韧带限制过度后伸；后纵韧带限制过度前屈。', pitfall: '前后纵韧带功能易记反' },
    { type: 'fill', question: '椎骨由椎体、椎弓与____围成椎孔。', answer: '椎弓', explanation: '椎体与椎弓共同围成椎孔。' },
  ],
}

const { html, pages } = renderMindmap(doc)
writeFileSync('M:/dsh/tmp/README_sample.html', html, 'utf8')
console.log('sample written, pages:')
for (const p of pages) console.log(`  ${p.branch} @ ${p.fontSizePt}pt ${p.overflow ? 'OVERFLOW' : 'ok'}`)
