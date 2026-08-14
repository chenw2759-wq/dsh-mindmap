/**
 * The mindmap preview drawer: a JupyterLab-style tab bar of every generated
 * HTML, with a zoomable canvas.
 *
 * - Polls the host recent-HTML feed; each generated file becomes a tab
 *   (newest first), auto-selected when it appears.
 * - The canvas renders the selected HTML in an iframe at its native A3 size
 *   (420mm × 297mm) and applies CSS transform scaling, so the user can zoom
 *   in/out and pan to read any part — no path typing, no text lists.
 * - The drawer width is adjustable via its left edge (persisted).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { fetchPreview, fetchRecent } from '../api.ts'
import { tt } from './helpers.ts'
import type { PanelController } from './controller.ts'
import css from './panel.module.css'

/** Poll interval for the recent feed. */
const POLL_MS = 2000

/** localStorage key for the persisted drawer width. */
const WIDTH_KEY = 'dsh-mindmap:width'

/** Native A3 landscape size of the generated pages (px @96dpi). */
const PAGE_W = Math.round(420 / 25.4 * 96) // ≈1587
const PAGE_H = Math.round(297 / 25.4 * 96) // ≈1122

/** Clamp a drawer width into the third-to-two-thirds viewport band. */
function clampWidth(px: number): number {
  const min = Math.max(360, Math.round(window.innerWidth * 0.33))
  const max = Math.round(window.innerWidth * 0.66)
  return Math.min(max, Math.max(min, px))
}

/** Short filename from a path. */
function fileName(path: string): string {
  const cleaned = path.replace(/\\/g, '/')
  const base = cleaned.split('/').pop() ?? path
  return base.length > 40 ? base.slice(0, 37) + '…' : base
}

/** Normalized path key for dedupe (single slashes, lowercased). */
function pathKey(path: string): string {
  return path.replace(/\\\\/g, '\\').replace(/\\/g, '/').toLowerCase()
}

/** Fit-to-width zoom for the given container width. */
function fitZoom(containerW: number): number {
  const target = Math.max(200, containerW - 48)
  return Math.min(1.5, Math.max(0.3, target / PAGE_W))
}

/** One tab entry. */
interface PreviewTab {
  path: string
  /** Display label (filename). */
  label: string
  /** Loaded HTML (empty when loading failed). */
  html: string
  /** Non-empty when loading failed. */
  error?: string
}

/** Render the mindmap preview drawer (tabs + zoomable canvas). */
export function MindmapPanel({ controller }: { controller: PanelController }) {
  const [tabs, setTabs] = useState<PreviewTab[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.45)
  const seen = useRef(new Set<string>())
  const viewEl = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const zoomInitialized = useRef(false)

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

  /** Fetch one path's HTML (cache it in a tab; failed loads stay closable). */
  const ensureTab = useCallback(async (path: string): Promise<PreviewTab> => {
    try {
      const html = await fetchPreview(path)
      return { path, label: fileName(path), html }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      return { path, label: fileName(path), html: '', error: message }
    }
  }, [])

  /** Open (or switch to) one path as a tab. */
  const openPath = useCallback(async (path: string) => {
    const key = pathKey(path)
    const tab = await ensureTab(path)
    setTabs((prev) => {
      if (prev.some((t) => pathKey(t.path) === key)) return prev
      return [...prev, tab]
    })
    setActive(tab.path)
  }, [ensureTab])

  /** Close one tab; switch to a neighbour when the active tab closes. */
  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => pathKey(t.path) === pathKey(path))
      if (idx === -1) return prev
      const next = prev.filter((t) => pathKey(t.path) !== pathKey(path))
      // If the closed tab was active, activate the neighbour on the same side.
      setActive((current) => {
        if (current === null || pathKey(current) !== pathKey(path)) return current
        const neighbour = next[Math.min(idx, next.length - 1)]
        return neighbour?.path ?? null
      })
      return next
    })
  }, [])

  // Poll the recent feed; auto-open anything new.
  useEffect(() => {
    let stopped = false
    const tick = async (): Promise<void> => {
      try {
        const recent = await fetchRecent()
        if (stopped) return
        for (const entry of recent) {
          if (!seen.current.has(entry.path)) {
            seen.current.add(entry.path)
            controller.setOpen(true)
            await openPath(entry.path)
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
  }, [controller, openPath])

  // Fit-to-width once on first render (then let the user control zoom).
  useEffect(() => {
    if (zoomInitialized.current) return
    const stage = stageRef.current
    if (stage === null) return
    zoomInitialized.current = true
    setZoom(fitZoom(stage.clientWidth))
  }, [])

  const zoomIn = (): void => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))
  const zoomOut = (): void => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)))
  const zoomFit = (): void => {
    const stage = stageRef.current
    setZoom(fitZoom(stage?.clientWidth ?? 640))
  }
  const zoomReset = (): void => setZoom(1)

  const activeTab = useMemo(() => tabs.find((tab) => tab.path === active) ?? null, [tabs, active])

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
        <div className={css.zoomBar}>
          <button type="button" className={css.zoomBtn} onClick={zoomOut} title="缩小">−</button>
          <span className={css.zoomPct}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={css.zoomBtn} onClick={zoomIn} title="放大">＋</button>
          <button type="button" className={css.zoomBtn} onClick={zoomFit} title="适合宽度">⤢</button>
          <button type="button" className={css.zoomBtn} onClick={zoomReset} title="100%">1:1</button>
        </div>
      </div>

      {/* JupyterLab-style tab bar (each tab closable) */}
      {tabs.length > 0 && (
        <div className={css.tabs} role="tablist">
          {tabs.map((tab) => (
            <div
              key={tab.path}
              role="presentation"
              className={tab.path === active ? `${css.tabWrap} ${css.tabWrapActive}` : css.tabWrap}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab.path === active}
                className={css.tab}
                onClick={() => { setActive(tab.path) }}
                title={tab.path}
              >
                {tab.label}
              </button>
              <button
                type="button"
                className={css.tabClose}
                aria-label="close"
                title="关闭"
                onClick={() => { closeTab(tab.path) }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={css.body}>
        {tabs.length === 0 && <p className={css.empty}>{tt('preview.empty')}</p>}
        {activeTab !== null && activeTab.error !== undefined && (
          <div className={css.loadError}>
            <p className={css.error}>{tt('preview.loadFailed')}: {activeTab.error}</p>
            <div className={css.zoomBar}>
              <button type="button" className={css.zoomBtn} onClick={() => { void openPath(activeTab.path) }} title="重试">↻ 重试</button>
              <button type="button" className={css.zoomBtn} onClick={() => { closeTab(activeTab.path) }} title="关闭">× 关闭</button>
            </div>
          </div>
        )}
        {activeTab !== null && activeTab.html !== '' && (
          <div className={css.stage} ref={stageRef}>
            <div className={css.canvas} style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${zoom})` }}>
              <iframe
                className={css.frame}
                title={activeTab.label}
                srcDoc={activeTab.html}
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
