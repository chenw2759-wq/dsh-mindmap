/**
 * Panel view mounting for the mindmap workspace.
 *
 * The `conversation` slot is single-occupant and external plugins cannot
 * declare slots, so the panel takes over the center column at the DOM level:
 * a container is appended inside the center-column grid item and a stylesheet
 * rule hides the conversation content while active.
 *
 * The center column is located by layout semantics that have stayed stable
 * across shell builds: first the old `[data-pane="conversation"]` marker, then
 * the class fragment `centerCol` / `mainCol`, then the composer-card ancestor.
 * (Newer releases dropped the `data-pane` markers.)
 */
import { createRoot, type Root } from 'react-dom/client'
import type { PanelController } from './panel/controller.ts'
import { MindmapPanel } from './panel/MindmapPanel.tsx'
import css from './panel/panel.module.css'

/** The injected panel container. */
export const PANEL_VIEW_SELECTOR = '[data-dsh-mindmap-view]'

const ACTIVE_ATTR = 'data-dsh-mindmap-active'

/** Find the center column, or undefined while the frame is not mounted. */
function conversationColumn(): HTMLElement | undefined {
  const byPane = document.querySelector<HTMLElement>('[data-pane="conversation"]')
  if (byPane !== null) return byPane
  const byClass = document.querySelector<HTMLElement>('[class*="centerCol"], [class*="mainCol"], [class*="contentCol"]')
  if (byClass !== null) return byClass
  const composer = document.querySelector<HTMLElement>('[data-composer-card]')
  if (composer !== null) {
    let el = composer.parentElement
    while (el !== null) {
      const cls = (el.className ?? '').toString()
      if (el.children.length >= 1 && (cls.includes('frame') || cls.includes('grid') || cls === '')) {
        // climb to the outermost column wrapper with a sibling-ish structure
        const next = el.parentElement
        if (next !== null && (next.children.length >= 2)) return next
      }
      el = el.parentElement
    }
  }
  return undefined
}

/**
 * Mount the panel React tree into the center column and bind its visibility
 * to the controller's panelOpen state.
 * @param controller - the panel controller driving the view.
 * @returns disposer unmounting the tree and restoring the column.
 */
export function mountPanel(controller: PanelController): () => void {
  let root: Root | undefined
  let container: HTMLDivElement | undefined

  const ensure = (): void => {
    if (container !== undefined) {
      if (container.isConnected) return
      root?.unmount()
      root = undefined
      container.remove()
      container = undefined
    }
    const column = conversationColumn()
    if (column === undefined) return
    container = document.createElement('div')
    container.dataset.dshMindmapView = ''
    container.className = css.view
    column.appendChild(container)
    root = createRoot(container)
    root.render(<MindmapPanel />)
  }

  const waitObserver = new MutationObserver(() => { ensure() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const applyActive = (): void => {
    if (controller.getSnapshot().panelOpen) {
      document.documentElement.setAttribute(ACTIVE_ATTR, '')
    } else {
      document.documentElement.removeAttribute(ACTIVE_ATTR)
    }
  }
  const unsubscribe = controller.subscribe(applyActive)
  applyActive()
  ensure()

  return () => {
    waitObserver.disconnect()
    unsubscribe()
    document.documentElement.removeAttribute(ACTIVE_ATTR)
    root?.unmount()
    root = undefined
    container?.remove()
    container = undefined
  }
}
