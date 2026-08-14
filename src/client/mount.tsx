/**
 * Preview drawer mounting for the mindmap plugin.
 *
 * The drawer is a fixed right-hand overlay appended to <body> (see the
 * `[data-dsh-mindmap-view]` CSS), so it floats above the GUI without
 * disturbing the conversation layout. Visibility is bound to the
 * controller's panelOpen state; the panel auto-opens itself when the host
 * recent-HTML feed reports a new generated file (MindmapPanel polls it).
 */
import { createRoot, type Root } from 'react-dom/client'
import type { PanelController } from './panel/controller.ts'
import { MindmapPanel } from './panel/MindmapPanel.tsx'

/** The injected drawer container. */
export const PANEL_VIEW_SELECTOR = '[data-dsh-mindmap-view]'

const ACTIVE_ATTR = 'data-dsh-mindmap-active'

/**
 * Mount the drawer onto <body> and bind its visibility to the controller.
 * @param controller - the panel controller driving the view.
 * @returns disposer unmounting the tree and removing the container.
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
    container = document.createElement('div')
    container.dataset.dshMindmapView = ''
    // No class here: the container is sized/positioned solely by the
    // `[data-dsh-mindmap-view]` selector. Adding the .drawer class would let
    // its `width: 100%` (same specificity, later in the sheet) override the
    // drawer width — and 100% of the viewport on a fixed element = fullscreen.
    document.body.appendChild(container)
    root = createRoot(container)
    root.render(<MindmapPanel controller={controller} />)
  }

  // The drawer mounts on body, which exists immediately; still wait for the
  // shell in case React needs the DOM ready.
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
