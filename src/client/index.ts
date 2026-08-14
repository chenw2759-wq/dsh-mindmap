/**
 * Browser-half entry for the dsh-mindmap plugin — runs inside the dsh web GUI.
 *
 * Registers the locale dictionaries and mounts the two DOM surfaces: the
 * sidebar entry row (toggles the panel) and the mindmap workspace panel in
 * the center column. Failure policy: DOM mounting problems are logged, never
 * thrown — the web shell fails the whole boot when a plugin apply throws.
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
import { mountPanel } from './mount.tsx'
import { PanelController } from './panel/controller.ts'
import { mountSidebarEntry } from './sidebar-entry.ts'

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
export type { PanelControllerSnapshot } from './panel/controller.ts'
export type { MindmapKey } from './locales.ts'

/**
 * Mount the mindmap workspace.
 * @param ctx - client root context (locale service).
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-mindmap: dictionaries')

  const controller = new PanelController()
  const disposers: Array<() => void> = []
  try {
    disposers.push(mountSidebarEntry(controller))
    disposers.push(mountComposerStyleRow(controller))
    disposers.push(mountPanel(controller))
  } catch (error) {
    // DOM failures degrade the panel, never the GUI.
    console.warn('[dsh-mindmap] mount failed:', error)
  }
  ctx.effect(() => () => {
    for (const dispose of disposers.splice(0)) dispose()
  }, 'dsh-mindmap: ui mounts')
}
