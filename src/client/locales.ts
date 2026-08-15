/**
 * dsh-mindmap surface copy: zh is the key source, en mirrors every key.
 */

export const zh = {
  'entry.styleHeader': '选择思维导图风格',
}

export const en: Record<keyof typeof zh, string> = {
  'entry.styleHeader': 'Choose mindmap style',
}

/** Key union for type-safe lookups. */
export type MindmapKey = keyof typeof zh
