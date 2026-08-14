/**
 * Composer (新建会话) style selector — the mindmap style is chosen where the
 * agent preset/mode is chosen, not in the sidebar.
 *
 * The shell's composer hero row (`wSkVaW_heroWorkspaceRow`) holds the
 * workspace picker and the agent-preset chip (标准模式 / 创造模式 /
 * 思维导图模式 …). We append a compact style row after that chip: four pills
 * (经典大括号 / 极简商务 / 活泼创意 / 学术整理). Picking one persists it on
 * the host (/api/dsh-mindmap/style) and opens the preview drawer.
 *
 * The row is located by layout semantics and self-heals via MutationObserver
 * on shell re-renders (same pattern as the sidebar entry).
 */

import { setStyle } from './api.ts'
import type { PanelController } from './panel/controller.ts'
import { tt } from './panel/helpers.ts'

/** Stable attribute identifying the injected style row. */
export const STYLE_ROW_SELECTOR = '[data-dsh-mindmap-style-row]'

/** The style options (id → label). */
const STYLE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'classic', label: '经典' },
  { id: 'minimal', label: '极简' },
  { id: 'creative', label: '创意' },
  { id: 'academic', label: '学术' },
]

/** Find the composer hero row (workspace + preset chip), or undefined. */
function heroRow(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('.wSkVaW_heroWorkspaceRow') ?? undefined
}

/** Build the style row: a label + four pills. */
function createStyleRow(controller: PanelController): HTMLDivElement {
  const row = document.createElement('div')
  row.dataset.dshMindmapStyleRow = ''
  row.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'margin-left:10px',
    'padding:2px 4px',
    'border-radius:999px',
    'background:var(--dsw-alias-bg-layer-2,#f1f5f9)',
    'flex:none',
  ].join(';')

  const label = document.createElement('span')
  label.textContent = tt('entry.styleHeader') + ':'
  label.style.cssText = 'font-size:12px;color:var(--dsw-alias-label-tertiary,#64748b);padding:0 4px;white-space:nowrap'
  row.appendChild(label)

  for (const option of STYLE_OPTIONS) {
    const pill = document.createElement('button')
    pill.type = 'button'
    pill.dataset.dshMindmapStyle = option.id
    pill.textContent = option.label
    pill.style.cssText = [
      'appearance:none',
      'font:inherit',
      'font-size:12px',
      'color:var(--dsw-alias-label-secondary,#475569)',
      'background:transparent',
      'border:none',
      'border-radius:999px',
      'padding:3px 10px',
      'cursor:pointer',
      'white-space:nowrap',
    ].join(';')
    pill.addEventListener('mouseenter', () => {
      pill.style.background = 'var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))'
    })
    pill.addEventListener('mouseleave', () => {
      pill.style.background = 'transparent'
    })
    pill.addEventListener('click', async () => {
      const ok = await setStyle(option.id)
      if (ok) {
        // Mark the active pill.
        for (const other of row.querySelectorAll('[data-dsh-mindmap-style]')) {
          ;(other as HTMLButtonElement).style.background = 'transparent'
          ;(other as HTMLButtonElement).style.color = 'var(--dsw-alias-label-secondary,#475569)'
        }
        pill.style.background = 'var(--dsw-alias-brand-primary,#1e3a8a)'
        pill.style.color = '#fff'
      }
      controller.setOpen(true)
    })
    row.appendChild(pill)
  }

  return row
}

/** Insert the style row at the end of the hero row. */
function placeRow(row: HTMLDivElement): boolean {
  const hero = heroRow()
  if (hero === undefined) return false
  if (row.parentElement !== hero) {
    hero.appendChild(row)
  }
  return true
}

/**
 * Mount the composer style row, waiting for the hero row and self-healing on
 * shell re-renders.
 * @param controller - the panel controller the pills open.
 * @returns disposer removing the row and its observers.
 */
export function mountComposerStyleRow(controller: PanelController): () => void {
  const row = createStyleRow(controller)
  let placed = false

  const tryPlace = (): void => {
    if (placed) return
    if (row.isConnected) {
      placed = true
      return
    }
    placed = placeRow(row)
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true })
  tryPlace()

  return () => {
    waitObserver.disconnect()
    row.remove()
  }
}
