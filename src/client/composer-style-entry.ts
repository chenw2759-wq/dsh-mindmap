/**
 * Composer (新建会话) style selector — the mindmap style is chosen where the
 * agent preset/mode is chosen.
 *
 * The shell's composer hero area (`wSkVaW_composerStack`) holds the workspace
 * picker and the agent-preset chip (标准模式 / 创造模式 / 思维导图模式 …).
 * We append a full-width style row BELOW that row: 「风格」label + four pills
 * (经典大括号 / 极简商务 / 活泼创意 / 学术整理), with the current selection
 * highlighted. Picking one persists it on the host (/api/dsh-mindmap/style);
 * it becomes the default style for mm_generate.
 *
 * The row is only visible while the selected mode is 思维导图模式, and
 * self-heals via MutationObserver on shell re-renders (the row is re-inserted
 * whenever a React re-render detaches it).
 */

/** Stable attribute identifying the injected style row. */
export const STYLE_ROW_SELECTOR = '[data-dsh-mindmap-style-row]'

/** The style options (id → label + hint). */
const STYLE_OPTIONS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'classic', label: '经典大括号', hint: '六色轮换 · 柔和' },
  { id: 'minimal', label: '极简商务', hint: '蓝灰 · 直角' },
  { id: 'creative', label: '活泼创意', hint: '彩虹 · Emoji' },
  { id: 'academic', label: '学术整理', hint: '蓝绿 · 严谨' },
]

/** Style API base. */
const API = '/api/dsh-mindmap'

/** Read the currently selected style id. */
async function fetchStyle(): Promise<string> {
  try {
    const response = await fetch(`${API}/style`)
    const body = (await response.json()) as { ok?: boolean; style?: string }
    return body.ok === true && typeof body.style === 'string' ? body.style : 'classic'
  } catch {
    return 'classic'
  }
}

/** Persist the selected style id. */
async function setStyle(style: string): Promise<boolean> {
  try {
    const response = await fetch(`${API}/style`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ style }),
    })
    const body = (await response.json()) as { ok?: boolean }
    return body.ok === true
  } catch {
    return false
  }
}

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
function createStyleRow(): HTMLDivElement {
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
  label.textContent = '选择思维导图风格'
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
      if (await setStyle(option.id)) highlight(pill)
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
 * @returns disposer removing the row and its observers.
 */
export function mountComposerStyleRow(): () => void {
  const row = createStyleRow()

  const applyVisibility = (): void => {
    row.style.display = styleVisibleFor(currentMode()) ? 'flex' : 'none'
  }

  const tryPlace = (): void => {
    if (!row.isConnected) {
      placeRow(row)
    }
    applyVisibility()
  }

  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
  row.style.display = 'none'
  tryPlace()

  return () => {
    waitObserver.disconnect()
    row.remove()
  }
}
