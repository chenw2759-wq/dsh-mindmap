/**
 * Sidebar entry injection for the mindmap panel.
 *
 * Follows the dsh-ssh/task-board precedent of DOM-level extension: the entry
 * row is injected right after the shell's "New Session" button, self-healing
 * via a MutationObserver on sidebar re-renders.
 *
 * The anchor is located by semantics, not by layout class: the shell has
 * changed its sidebar DOM across builds (`data-pane="sidebar"` was removed in
 * newer releases), so we find the New Session button directly — by
 * `aria-label="新建会话"` first, then by visible text "新会话" — and insert
 * after it. Both markers are stable user-facing strings.
 */

import type { PanelController } from './panel/controller.ts'
import { tt } from './panel/helpers.ts'

/** Stable data attribute identifying the injected entry row. */
export const ENTRY_SELECTOR = '[data-dsh-mindmap-entry]'

/** Inline icon (matches the shell's 16px nav-icon look): a node/branch glyph. */
const ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4" cy="4" r="1.6"/><circle cx="12" cy="4" r="1.6"/><circle cx="4" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><path d="M5.6 4h4.8M4 5.6v4.8M12 5.6v4.8M5.6 12h4.8"/></svg>'

/** The "New Session" button: locate by aria-label first, then by text. */
function newSessionButton(): HTMLButtonElement | undefined {
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  for (const button of all) {
    const aria = button.getAttribute('aria-label') ?? ''
    if (aria.includes('新会话') || aria.includes('New session') || aria.includes('New Session')) return button
  }
  for (const button of all) {
    const text = (button.textContent ?? '').trim()
    if (text === '新会话' || text === 'New session' || text === 'New Session') return button
  }
  return undefined
}

/** The sidebar root: the New Session button's parent container. */
function sidebarRoot(): HTMLElement | undefined {
  const button = newSessionButton()
  return button?.parentElement ?? undefined
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

/** Insert the entry right after the New Session button. */
function placeEntry(entry: HTMLButtonElement): boolean {
  const button = newSessionButton()
  if (button === undefined || button.parentElement === null) return false
  const root = button.parentElement
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
    const button = newSessionButton()
    if (button === undefined) return
    root ??= button.parentElement ?? undefined
    if (root === undefined) return
    placed = placeEntry(entry)
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
      placed = placeEntry(entry)
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
