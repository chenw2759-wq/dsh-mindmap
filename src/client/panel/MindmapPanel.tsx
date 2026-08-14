/**
 * The mindmap preview panel: a right-hand drawer that shows generated HTML.
 *
 * It polls the host recent-HTML feed; when a new HTML appears (mm_generate
 * output, or any tool result that produced an .html path), the drawer opens
 * itself and loads the preview. A manual path input remains for ad-hoc use.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { fetchPreview, fetchRecent } from '../api.ts'
import { tt } from './helpers.ts'
import type { PanelController } from './controller.ts'
import css from './panel.module.css'

/** Poll interval for the recent feed. */
const POLL_MS = 2000

/** localStorage key for the persisted drawer width. */
const WIDTH_KEY = 'dsh-mindmap:width'

/** Clamp a drawer width into the quarter-to-half viewport band. */
function clampWidth(px: number): number {
  const min = Math.max(280, Math.round(window.innerWidth * 0.25))
  const max = Math.round(window.innerWidth * 0.5)
  return Math.min(max, Math.max(min, px))
}

/** Render the mindmap preview drawer. */
export function MindmapPanel({ controller }: { controller: PanelController }) {
  const [previewPath, setPreviewPath] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  const seen = useRef(new Set<string>())
  const viewEl = useRef<HTMLElement | null>(null)

  /** Capture the outer fixed container (the React root's parent). */
  const setDrawerRef = useCallback((el: HTMLDivElement | null): void => {
    viewEl.current = el?.closest<HTMLElement>('[data-dsh-mindmap-view]') ?? null
  }, [])

  // Restore the persisted width once the drawer mounts.
  useEffect(() => {
    const saved = Number.parseFloat(window.localStorage.getItem(WIDTH_KEY) ?? '')
    if (viewEl.current !== null && Number.isFinite(saved)) {
      viewEl.current.style.width = `${clampWidth(saved)}px`
    }
  }, [])

  /** Drag the left edge to resize between a quarter and half of the viewport. */
  const onResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    const view = viewEl.current
    if (view === null) return
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    document.body.style.userSelect = 'none'
    const move = (e: PointerEvent): void => {
      // Right-anchored drawer: width tracks the pointer from the right edge.
      view.style.width = `${clampWidth(window.innerWidth - e.clientX)}px`
    }
    const stop = (e: PointerEvent): void => {
      handle.releasePointerCapture(e.pointerId)
      document.body.style.userSelect = ''
      window.localStorage.setItem(WIDTH_KEY, String(view.getBoundingClientRect().width))
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }, [])

  /** Load one HTML path into the preview. */
  const loadPath = useCallback(async (path: string) => {
    setPreviewError(null)
    try {
      setPreviewHtml(await fetchPreview(path))
      setPreviewPath(path)
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [])

  /** Manual "open" button. */
  const openManual = useCallback(async () => {
    if (previewPath.trim() === '') return
    setPreviewError(null)
    try {
      setPreviewHtml(await fetchPreview(previewPath.trim()))
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [previewPath])

  // Poll the recent feed; auto-open + auto-load anything new.
  useEffect(() => {
    let stopped = false
    const tick = async (): Promise<void> => {
      try {
        const recent = await fetchRecent()
        if (stopped) return
        setRecentPaths(recent.map((entry) => entry.path))
        for (const entry of recent) {
          if (!seen.current.has(entry.path)) {
            seen.current.add(entry.path)
            // Auto-open the newest unseen HTML.
            controller.setOpen(true)
            await loadPath(entry.path)
            break
          }
        }
      } catch {
        // transient; keep polling
      }
    }
    const timer = window.setInterval(() => { void tick() }, POLL_MS)
    void tick()
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [controller, loadPath])

  return (
    <div className={css.drawer} ref={setDrawerRef}>
      <div
        className={css.resizer}
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />
      <div className={css.head}>
        <span className={css.headTitle}>{tt('panel.title')} · {tt('preview.label')}</span>
      </div>
      <div className={css.body}>
        <p className={css.intro}>{tt('preview.autoHint')}</p>
        <label className={css.field}>
          <span className={css.fieldLabel}>{tt('preview.path')}</span>
          <div className={css.row}>
            <input
              className={css.input}
              value={previewPath}
              placeholder={tt('gen.outputPlaceholder')}
              onChange={(event) => { setPreviewPath(event.target.value) }}
            />
            <button type="button" className={css.btnGhost} onClick={openManual}>
              {tt('preview.open')}
            </button>
          </div>
        </label>
        {recentPaths.length > 0 && (
          <p className={css.result}>
            {tt('preview.recentLabel')}:{'\n'}{recentPaths.slice(0, 5).map((p) => `- ${p}`).join('\n')}
          </p>
        )}
        {previewError !== null && <p className={css.error}>{previewError}</p>}
        {previewHtml !== '' && (
          <iframe
            className={css.frame}
            title={tt('panel.title')}
            srcDoc={previewHtml}
            sandbox="allow-scripts"
          />
        )}
      </div>
    </div>
  )
}
