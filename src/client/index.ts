/**
 * Browser-half entry for the dsh-mindmap plugin — runs inside the dsh web GUI.
 *
 * Mounts the composer style selector: when the selected agent preset/mode is
 * 思维导图模式, a style row (经典大括号 / 极简商务 / 活泼创意 / 学术整理)
 * appears below the mode chip and persists the default style for mm_generate.
 *
 * The generated HTML preview is intentionally NOT part of this plugin — use
 * dsh-IDE's preview for that. Failure policy: DOM mounting problems are
 * logged, never thrown — the web shell fails the whole boot when a plugin
 * apply throws.
 *
 * Export discipline: the /client surface carries what cordis loading needs
 * plus types only — all value exports stay internal.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the LocaleNamespaceMap merge table.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { en, zh } from './locales.ts'
import { mountComposerStyleRow } from './composer-style-entry.ts'

/** Locale namespace this plugin owns. */
const NS = 'dsh-mindmap'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-mindmap surface copy. */
    'dsh-mindmap': typeof zh
  }
}

/** Required services (fiber inject waiting — the runtime must be up first). */
export const inject = ['slots', 'locale']

/** Type-only surface (export discipline: no value exports beyond the plugin contract). */
export type { MindmapKey } from './locales.ts'

/**
 * Mount the mindmap surfaces.
 * @param ctx - client root context (locale service).
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-mindmap: dictionaries')

  const disposers: Array<() => void> = []
  try {
    disposers.push(mountComposerStyleRow())
  } catch (error) {
    // DOM failures degrade the style row, never the GUI.
    console.warn('[dsh-mindmap] mount failed:', error)
  }
  ctx.effect(() => () => {
    for (const dispose of disposers.splice(0)) dispose()
  }, 'dsh-mindmap: ui mounts')
}
