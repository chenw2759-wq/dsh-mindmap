/**
 * Sidebar entry injection for the mindmap plugin.
 *
 * The entry row sits right after the shell's "New Session" button. Clicking
 * it opens a style sub-menu (选择思维导图风格): 经典大括号 / 极简商务 /
 * 活泼创意 / 学术整理. Picking a style persists it on the host and opens
 * the preview drawer. Self-healing via a MutationObserver on sidebar
 * re-renders.
 *
 * The anchor is located by semantics, not by layout class: the shell has
 * changed its sidebar DOM across builds (`data-pane="sidebar"` was removed in
 * newer releases), so we find the New Session button directly — by
 * `aria-label="新建会话"` first, then by visible text "新会话" — and insert
 * after it. Both markers are stable user-facing strings.
 */

import { setStyle } from './api.ts'
import type { PanelController } from './panel/controller.ts'
import { tt } from './panel/helpers.ts'

/** Stable data attribute identifying the injected entry row. */
export const ENTRY_SELECTOR = '[data-dsh-mindmap-entry]'

/** The style sub-menu rows (id → label). */
const STYLE_OPTIONS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'classic', label: '经典大括号', hint: '六色轮换 · 柔和层次' },
  { id: 'minimal', label: '极简商务', hint: '蓝灰单色 · 直角矩形' },
  { id: 'creative', label: '活泼创意', hint: '彩虹渐变 · Emoji 图标' },
  { id: 'academic', label: '学术整理', hint: '低饱和蓝绿 · 结构严谨' },
]

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

/** Build the entry row + the style sub-menu (a detached wrapper; inserted once the shell is up). */
function createEntry(controller: PanelController): { entry: HTMLButtonElement; menu: HTMLDivElement } {
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.dataset.dshMindmapEntry = ''
  entry.setAttribute('aria-label', tt('entry.label'))
  entry.setAttribute('title', tt('entry.tooltip'))
  entry.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;width:100%;border-radius:8px;color:var(--dsw-alias-label-primary,#1e293b);font-size:13px;background:none;border:none;cursor:pointer">${ICON}<span>${tt('entry.label')}</span><span style="margin-left:auto;opacity:.6;font-size:11px">▾</span></span>`
  entry.style.cssText = 'display:block;width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;font:inherit'

  // Sub-menu: fixed-position popover with the style options.
  const menu = document.createElement('div')
  menu.dataset.dshMindmapMenu = ''
  menu.style.cssText = [
    'position:fixed',
    'z-index:10000',
    'min-width:220px',
    'background:var(--dsw-alias-bg-layer-3,#fff)',
    'border:1px solid var(--dsw-alias-border-l2,#e2e8f0)',
    'border-radius:10px',
    'box-shadow:0 8px 28px rgba(15,23,42,.18)',
    'padding:6px',
    'display:none',
    'flex-direction:column',
    'gap:2px',
  ].join(';')
  menu.setAttribute('role', 'menu')

  const header = document.createElement('div')
  header.textContent = tt('entry.styleHeader')
  header.style.cssText = 'font-size:11px;color:var(--dsw-alias-label-tertiary,#64748b);padding:4px 10px 6px;font-weight:600;letter-spacing:.05em'
  menu.appendChild(header)

  for (const option of STYLE_OPTIONS) {
    const row = document.createElement('button')
    row.type = 'button'
    row.dataset.dshMindmapStyle = option.id
    row.setAttribute('role', 'menuitem')
    row.innerHTML = `<span style="font-weight:600">${option.label}</span><span style="opacity:.65;font-size:11px">${option.hint}</span>`
    row.style.cssText = [
      'appearance:none',
      'font:inherit',
      'font-size:13px',
      'color:var(--dsw-alias-label-primary,#1e293b)',
      'background:none',
      'border:none',
      'border-radius:7px',
      'padding:8px 10px',
      'cursor:pointer',
      'text-align:left',
      'display:flex',
      'flex-direction:column',
      'gap:1px',
    ].join(';')
    row.addEventListener('mouseenter', () => { row.style.background = 'var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))' })
    row.addEventListener('mouseleave', () => { row.style.background = 'none' })
    row.addEventListener('click', async () => {
      await setStyle(option.id)
      menu.style.display = 'none'
      controller.setOpen(true)
    })
    menu.appendChild(row)
  }

  const toggleMenu = (): void => {
    const rect = entry.getBoundingClientRect()
    menu.style.left = `${rect.right + 6}px`
    menu.style.top = `${Math.max(8, rect.top)}px`
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'
  }

  entry.addEventListener('click', (event) => {
    event.stopPropagation()
    toggleMenu()
  })
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target as Node) && event.target !== entry) {
      menu.style.display = 'none'
    }
  })

  document.body.appendChild(menu)
  return { entry, menu }
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
 * @returns disposer removing the entry, the menu, and their observers.
 */
export function mountSidebarEntry(controller: PanelController): () => void {
  const { entry, menu } = createEntry(controller)
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
    menu.remove()
  }
}
