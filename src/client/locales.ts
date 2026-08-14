/**
 * dsh-mindmap surface copy: zh is the key source, en mirrors every key.
 */

export const zh = {
  'entry.label': '思维导图',
  'entry.tooltip': '思维导图模式：课件 + 电子书 → 打印级复习思维导图 HTML',
  'entry.styleHeader': '选择思维导图风格',
  'panel.title': '思维导图模式',
  'panel.intro': '把课件与电子书整理成「一页一个主干知识点」的打印级思维导图 HTML。构建规范见 mindmap-builder skill；也可直接在会话里让我（agent）用 mm_generate 生成。',
  'preview.label': '预览',
  'preview.empty': '暂无生成的思维导图——在会话中生成 HTML 后会自动出现在这里。',
  'preview.loadFailed': '加载失败',
  'common.error': '出错',
  'common.close': '关闭',
}

export const en: Record<keyof typeof zh, string> = {
  'entry.label': 'Mindmap',
  'entry.tooltip': 'Mindmap mode: courseware + e-book → printable review mindmap HTML',
  'entry.styleHeader': 'Choose mindmap style',
  'panel.title': 'Mindmap Mode',
  'panel.intro': 'Turn courseware and e-books into printable mindmaps — one 主干知识点 per page. See the mindmap-builder skill for the spec; or just ask the agent to use mm_generate.',
  'preview.label': 'Preview',
  'preview.empty': 'No mindmaps yet — HTML generated in a session appears here automatically.',
  'preview.loadFailed': 'Load failed',
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
