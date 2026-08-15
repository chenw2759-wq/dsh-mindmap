/**
 * RecentStore: a ring buffer of HTML files generated during agent sessions,
 * so the browser can auto-open a preview when a new mindmap HTML appears.
 */

/** One recently generated HTML entry. */
export interface RecentHtml {
  /** Absolute path of the generated HTML. */
  readonly path: string
  /** Epoch ms when it was recorded. */
  readonly time: number
  /** What produced it: the tool name, or a session id. */
  readonly source: string
}

/** Cap on remembered entries (LRU by insertion order). */
const MAX_ENTRIES = 30

/** Human-safe path validation: must look like an absolute HTML path. */
export function looksLikeHtmlPath(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed.toLowerCase().endsWith('.html') && !trimmed.toLowerCase().endsWith('.htm')) return false
  // Exclude URLs (http://, file://, scheme://…).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return false
  // Absolute-ish: drive letter, leading /, \\, or unix root.
  return /^[a-zA-Z]:[\\/]|^\\\\|^\//.test(trimmed)
}

/** Normalize a path for comparison (single backslashes; lowercased on Windows). */
export function normalizePath(path: string): string {
  const single = path.replace(/\\\\/g, '\\')
  return single.replace(/\\/g, '/').toLowerCase()
}

/** Host-side registry of recently produced HTML files. */
export class RecentStore {
  private entries: RecentHtml[] = []
  private style: string = 'classic'

  /** Record a new HTML path (dedupe by normalized path; newest first). */
  push(path: string, source: string, now: number = Date.now()): void {
    const clean = path.trim()
    const key = normalizePath(clean)
    this.entries = this.entries.filter((entry) => normalizePath(entry.path) !== key)
    this.entries.unshift({ path: clean, time: now, source })
    if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES
  }

  /** Latest entries, newest first. */
  list(): readonly RecentHtml[] {
    return this.entries
  }

  /** Read the current style id. */
  getStyle(): string {
    return this.style
  }

  /** Set the current style id (persists for the process lifetime). */
  setStyle(id: string): void {
    this.style = id
  }
}
