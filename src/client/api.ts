/**
 * Browser-half API client for the mindmap routes. Mirrors the host wire
 * contract one-to-one; every call returns the parsed JSON response.
 */

/** Base path of the mindmap API (must match host routes.ts). */
const API = '/api/dsh-mindmap'

/** Generate a mindmap HTML on the host from an inline doc. */
export interface GenerateRequest {
  doc: unknown
  output: string
}

export interface GenerateResponse {
  ok: boolean
  outputPath?: string
  pages?: Array<{
    branch: string
    fontSizePt: number
    usedMm: number
    budgetMm: number
    overflow: boolean
  }>
  error?: string
}

/** List candidate source files under a directory. */
export interface ListResponse {
  ok: boolean
  dir?: string
  files?: string[]
  error?: string
}

/** Read a generated HTML back for preview (returns the raw text). */
export async function fetchPreview(path: string): Promise<string> {
  const response = await fetch(`${API}/preview?path=${encodeURIComponent(path)}`)
  if (!response.ok) {
    throw new Error(`preview failed: ${response.status}`)
  }
  return response.text()
}

/** POST the generate route. */
export async function generate(doc: unknown, output: string): Promise<GenerateResponse> {
  const response = await fetch(`${API}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, output }),
  })
  return response.json() as Promise<GenerateResponse>
}

/** GET the list route. */
export async function listSources(dir: string): Promise<ListResponse> {
  const response = await fetch(`${API}/list?dir=${encodeURIComponent(dir)}`)
  return response.json() as Promise<ListResponse>
}
