/**
 * dsh-mindmap surface copy: zh is the key source, en mirrors every key.
 */

export const zh = {
  'entry.label': '思维导图',
  'entry.tooltip': '思维导图模式：课件 + 电子书 → 打印级复习思维导图 HTML',
  'panel.title': '思维导图模式',
  'panel.intro': '把课件与电子书整理成「一页一个主干知识点」的打印级思维导图 HTML。构建规范见 mindmap-builder skill；也可直接在会话里让我（agent）用 mm_generate 生成。',
  'tab.sources': '资料',
  'tab.generate': '生成',
  'tab.preview': '预览',
  'source.dir': '资料目录',
  'source.dirPlaceholder': '输入课件/电子书所在目录的绝对路径',
  'source.list': '查找资料',
  'source.none': '（未列出）',
  'gen.docJson': '思维导图 JSON（MindmapDoc）',
  'gen.docJsonPlaceholder': '粘贴 MindmapDoc JSON，或填 JSON 文件绝对路径',
  'gen.output': '输出 HTML 路径',
  'gen.outputPlaceholder': '例如 D:\\复习\\思维导图_01.html',
  'gen.run': '生成 HTML',
  'gen.running': '生成中…',
  'gen.result': '已生成',
  'gen.overflowHint': '⚠ 部分页面溢出，请按 skill 拆分主干页后重新生成',
  'preview.open': '在浏览器打开',
  'preview.path': 'HTML 路径',
  'common.error': '出错',
  'common.close': '关闭',
}

export const en: Record<keyof typeof zh, string> = {
  'entry.label': 'Mindmap',
  'entry.tooltip': 'Mindmap mode: courseware + e-book → printable review mindmap HTML',
  'panel.title': 'Mindmap Mode',
  'panel.intro': 'Turn courseware and e-books into printable mindmaps — one 主干知识点 per page. See the mindmap-builder skill for the spec; or just ask the agent to use mm_generate.',
  'tab.sources': 'Sources',
  'tab.generate': 'Generate',
  'tab.preview': 'Preview',
  'source.dir': 'Source directory',
  'source.dirPlaceholder': 'Absolute path of the folder with courseware/e-books',
  'source.list': 'List sources',
  'source.none': '(none listed)',
  'gen.docJson': 'MindmapDoc JSON',
  'gen.docJsonPlaceholder': 'Paste MindmapDoc JSON, or an absolute path to a .json file',
  'gen.output': 'Output HTML path',
  'gen.outputPlaceholder': 'e.g. D:\\review\\mindmap_01.html',
  'gen.run': 'Generate HTML',
  'gen.running': 'Generating…',
  'gen.result': 'Generated',
  'gen.overflowHint': '⚠ Some pages overflow — split the branch per the skill and regenerate',
  'preview.open': 'Open in browser',
  'preview.path': 'HTML path',
  'common.error': 'Error',
  'common.close': 'Close',
}

/** Tiny interpolation: {name} -> value. */
export function t(dictionary: Record<string, string>, key: string, values?: Record<string, string | number>): string {
  let text = dictionary[key] ?? key
  if (values !== undefined) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

/** Key union for type-safe lookups. */
export type MindmapKey = keyof typeof zh
