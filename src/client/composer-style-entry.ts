/**
 * Composer (新建会话) style selector — the mindmap style is chosen where the
 * agent preset/mode is chosen, not in the sidebar.
 *
 * The shell's composer hero area (`wSkVaW_composerStack`) holds the workspace
 * picker and the agent-preset chip (标准模式 / 创造模式 / 思维导图模式 …).
 * We append a full-width style row BELOW that row: 「风格」label + four pills
 * (经典大括号 / 极简商务 / 活泼创意 / 学术整理), with the current selection
 * highlighted. Picking one persists it on the host (/api/dsh-mindmap/style)
 * and opens the preview drawer.
 *
 * The row self-heals via MutationObserver on shell re-renders (same pattern
 * as the sidebar entry).
 */

import { fetchStyle, setStyle } from './api.ts'
import type { PanelController } from './panel/controller.ts'
import { tt } from './panel/helpers.ts'

/** Stable attribute identifying the injected style row. */
export const STYLE_ROW_SELECTOR = '[data-dsh-mindmap-style-row]'

/** The style options (id → label + hint). */
const STYLE_OPTIONS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'classic', label: '经典大括号', hint: '六色轮换 · 柔和' },
  { id: 'minimal', label: '极简商务', hint: '蓝灰 · 直角' },
  { id: 'creative', label: '活泼创意', hint: '彩虹 · Emoji' },
  { id: 'academic', label: '学术整理', hint: '蓝绿 · 严谨' },
]

/** Find the composer stack (hero row's parent), or undefined. */
function composerStack(): HTMLElement | undefined {
  const hero = document.querySelector<HTMLElement>('.wSkVaW_heroWorkspaceRow')
  if (hero !== null && hero.parentElement !== null) return hero.parentElement
  return document.querySelector<HTMLElement>('.wSkVaW_composerStack') ?? undefined
}

/** The currently selected agent preset/mode, read from the composer chip. */
function currentMode(): string {
  const hero = document.querySelector<HTMLElement>('.wSkVaW_heroWorkspaceRow')
  if (hero === null) return ''
  // The preset chip is the data-slot whose text is a mode name (标准模式…).
  for (const slot of hero.querySelectorAll('[data-slot]')) {
    const text = (slot.textContent ?? '').trim()
    if (text.includes('模式') && text.length <= 20) return text
  }
  return ''
}

/** Whether the style row should be visible for the given mode text. */
function styleVisibleFor(mode: string): boolean {
  return mode.includes('思维导图')
}

/** Build the style row: a label + four pills (independent full-width row). */
function createStyleRow(controller: PanelController): HTMLDivElement {
  const row = document.createElement('div')
  row.dataset.dshMindmapStyleRow = ''
  row.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:8px',
    'margin:0 0 6px',
    'padding:6px 12px',
    'border-radius:10px',
    'background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.03))',
    'flex-wrap:wrap',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = tt('entry.styleHeader')
  label.style.cssText = 'font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#475569);white-space:nowrap'
  row.appendChild(label)

  const pills: HTMLButtonElement[] = []
  for (const option of STYLE_OPTIONS) {
    const pill = document.createElement('button')
    pill.type = 'button'
    pill.dataset.dshMindmapStyle = option.id
    pill.innerHTML = `<span style="font-weight:600">${option.label}</span><span style="opacity:.7;font-size:11px;margin-left:6px">${option.hint}</span>`
    pill.style.cssText = [
      'appearance:none',
      'font:inherit',
      'font-size:12.5px',
      'color:var(--dsw-alias-label-primary,#1e293b)',
      'background:var(--dsw-alias-bg-layer-3,#fff)',
      'border:1px solid var(--dsw-alias-border-l2,#cbd5e1)',
      'border-radius:999px',
      'padding:5px 12px',
      'cursor:pointer',
      'white-space:nowrap',
      'display:inline-flex',
      'align-items:center',
    ].join(';')
    pill.addEventListener('mouseenter', () => {
      pill.style.borderColor = 'var(--dsw-alias-brand-primary,#1e3a8a)'
    })
    pill.addEventListener('mouseleave', () => {
      pill.style.borderColor = 'var(--dsw-alias-border-l2,#cbd5e1)'
    })
    pill.addEventListener('click', async () => {
      const ok = await setStyle(option.id)
      if (ok) highlight(pill)
      controller.setOpen(true)
    })
    row.appendChild(pill)
    pills.push(pill)
  }

  /** Highlight one pill as the active style. */
  const highlight = (active: HTMLButtonElement): void => {
    for (const p of pills) {
      p.style.background = 'var(--dsw-alias-bg-layer-3,#fff)'
      p.style.color = 'var(--dsw-alias-label-primary,#1e293b)'
      p.style.borderColor = 'var(--dsw-alias-border-l2,#cbd5e1)'
      p.style.boxShadow = 'none'
    }
    active.style.background = 'var(--dsw-alias-brand-primary,#1e3a8a)'
    active.style.color = '#fff'
    active.style.borderColor = 'var(--dsw-alias-brand-primary,#1e3a8a)'
    active.style.boxShadow = '0 2px 8px rgba(30,58,138,.3)'
  }

  // Initialize the active pill from the host.
  void fetchStyle().then((current) => {
    const target = pills.find((p) => p.dataset.dshMindmapStyle === current)
    if (target !== undefined) highlight(target)
  })

  return row
}

/** Insert the style row into the composer stack (after the hero row). */
function placeRow(row: HTMLDivElement): boolean {
  const stack = composerStack()
  if (stack === undefined) return false
  if (row.parentElement !== stack) {
    stack.appendChild(row)
  }
  return true
}

/**
 * Mount the composer style row: it is only visible while the selected agent
 * preset/mode is 思维导图模式. Watches the mode chip and shows/hides the row
 * accordingly; self-heals on shell re-renders.
 *
 * Self-healing is unconditional: on EVERY mutation the row is re-inserted if
 * it got detached by a React re-render, and the visibility is re-applied.
 * (A one-shot `placed` flag would leave the row gone forever once the shell
 * rebuilt the composer area.)
 * @param controller - the panel controller the pills open.
 * @returns disposer removing the row and its observers.
 */
export function mountComposerStyleRow(controller: PanelController): () => void {
  const row = createStyleRow(controller)

  const applyVisibility = (): void => {
    row.style.display = styleVisibleFor(currentMode()) ? 'flex' : 'none'
  }

  const tryPlace = (): void => {
    // Re-insert whenever the row is not in the DOM (shell re-renders).
    if (!row.isConnected) {
      placeRow(row)
    }
    applyVisibility()
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
  // Start hidden until we know the mode.
  row.style.display = 'none'
  tryPlace()

  return () => {
    waitObserver.disconnect()
    row.remove()
  }
}
