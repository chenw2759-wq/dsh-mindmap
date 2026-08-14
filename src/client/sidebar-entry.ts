/**
 * Sidebar entry injection for the mindmap panel.
 *
 * Follows the dsh-ssh/task-board precedent of DOM-level extension: the entry
 * row is injected between the shell's New Session button and the workspace
 * browser, self-healing via a MutationObserver on sidebar re-renders.
 */

import type { PanelController } from './panel/controller.ts'
import { tt } from './panel/helpers.ts'

/** Stable data attribute identifying the injected entry row. */
export const ENTRY_SELECTOR = '[data-dsh-mindmap-entry]'

/** The sidebar column is the grid item AppFrame renders with this pane marker. */
const SIDEBAR_COLUMN_SELECTOR = '[data-pane="sidebar"]'

/** Inline icon (matches the shell's 16px nav-icon look): a node/branch glyph. */
const ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4" cy="4" r="1.6"/><circle cx="12" cy="4" r="1.6"/><circle cx="4" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><path d="M5.6 4h4.8M4 5.6v4.8M12 5.6v4.8M5.6 12h4.8"/></svg>'

/** Find the sidebar shell root element, or undefined while not yet mounted. */
function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR)
  const root = column?.firstElementChild as HTMLElement | undefined
  return root ?? undefined
}

/** The New Session button: the shell's only direct-child button of the root. */
function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined {
  for (const child of root.children) {
    if (child.tagName === 'BUTTON') return child as HTMLButtonElement
  }
  return undefined
}

/** Build the entry row (a detached button; insert once the shell is up). */
function createEntry(controller: PanelController): HTMLButtonElement {
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.dataset.dshMindmapEntry = ''
  entry.setAttribute('aria-label', tt('entry.label'))
  entry.setAttribute('title', tt('entry.tooltip'))
  entry.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;width:100%;border-radius:8px;color:var(--dsw-alias-label-primary,#1e293b);font-size:13px;background:none;border:none;cursor:pointer">${ICON}<span>${tt('entry.label')}</span></span>`
  entry.style.cssText = 'display:block;width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;font:inherit'
  entry.addEventListener('click', () => { controller.toggle() })
  return entry
}

/** Re-insert the entry after the New Session button (before the browser region). */
function placeEntry(root: HTMLElement, entry: HTMLButtonElement): boolean {
  const button = newSessionButton(root)
  if (button === undefined) return false
  if (entry.parentElement !== root) {
    root.insertBefore(entry, button.nextElementSibling)
  }
  return true
}

/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param controller - the panel controller the entry toggles.
 * @returns disposer removing the entry and its observers.
 */
export function mountSidebarEntry(controller: PanelController): () => void {
  const entry = createEntry(controller)
  let root: HTMLElement | undefined
  let placed = false

  const tryPlace = (): void => {
    if (placed) return
    if (root !== undefined && !root.isConnected) {
      rootObserver.disconnect()
      root = undefined
    }
    root ??= sidebarRoot()
    if (root === undefined) return
    placed = placeEntry(root, entry)
    if (placed) rootObserver.observe(root, { childList: true, subtree: true })
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const rootObserver = new MutationObserver(() => {
    if (root === undefined || !root.isConnected) {
      placed = false
      tryPlace()
      return
    }
    if (!root.contains(entry)) {
      placed = placeEntry(root, entry)
    }
  })

  const unsubscribe = controller.subscribe(() => {
    entry.dataset.active = controller.getSnapshot().panelOpen ? 'true' : undefined
  })
  entry.dataset.active = controller.getSnapshot().panelOpen ? 'true' : undefined

  tryPlace()

  return () => {
    waitObserver.disconnect()
    rootObserver.disconnect()
    unsubscribe()
    entry.remove()
  }
}
