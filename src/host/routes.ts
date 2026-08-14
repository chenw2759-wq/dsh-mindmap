/**
 * /api/dsh-mindmap route family: generate a mindmap from an inline doc,
 * read back a generated HTML for preview, and list candidate source files
 * under a directory. Every route carries a loopback-only trust fence (plus
 * browser same-origin markers) — generation reads/writes local files, so
 * LAN-exposed dsh web deployments must not serve them.
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, extname, isAbsolute, join, resolve } from 'node:path'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { renderMindmap, type MindmapDoc } from './generator.ts'
import { RecentStore } from './store.ts'

/** Base path of the mindmap API. */
export const MM_API = '/api/dsh-mindmap'

/** Cap on JSON request bodies. */
const MAX_JSON_BODY_BYTES = 8 * 1024 * 1024

/** Loopback literal check plus browser same-origin markers (mirrors dsh-ssh). */
function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** One JSON response. */
function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

/** Source-file extensions the mindmap panel offers for picking. */
const SOURCE_EXTS = new Set(['.ppt', '.pptx', '.pdf', '.doc', '.docx', '.md', '.txt', '.html'])

/** Guard helper: fence + method check (the webserver keyed route registry rejects duplicate (kind, path), so dispatch by method here). */
function guard(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { ok: false, error: 'forbidden: loopback-only' })
    return false
  }
  if (req.method !== method) {
    writeJson(res, 405, { ok: false, error: `method not allowed: ${req.method ?? ''}` })
    return false
  }
  return true
}

/** POST /api/dsh-mindmap/generate — render an inline doc to an HTML file. */
function generateRoute(store: RecentStore): WebRoute {
  return {
    path: `${MM_API}/generate`,
    kind: 'exact',
    handler: async (req, res) => {
      if (!guard(req, res, 'POST')) return
      const body = await readJsonBody(req)
      if (body === undefined || typeof body.doc !== 'object' || body.doc === null || typeof body.output !== 'string') {
        writeJson(res, 400, { ok: false, error: 'expected { doc: MindmapDoc, output: string }' })
        return
      }
      try {
        const doc = body.doc as unknown as MindmapDoc
        if (!Array.isArray(doc.branches) || doc.branches.length === 0) {
          writeJson(res, 400, { ok: false, error: 'doc.branches must be a non-empty array' })
          return
        }
        const { html, pages } = renderMindmap(doc)
        const outPath = resolve(body.output as string)
        await mkdir(dirname(outPath), { recursive: true })
        await writeFile(outPath, html, 'utf8')
        store.push(outPath, 'panel')
        writeJson(res, 200, { ok: true, outputPath: outPath, pages })
      } catch (error) {
        writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}

/** GET /api/dsh-mindmap/preview?path=… — read back a generated HTML (same-origin only). */
const previewRoute: WebRoute = {
  path: `${MM_API}/preview`,
  kind: 'exact',
  handler: async (req, res) => {
    if (!guard(req, res, 'GET')) return
    const url = new URL(req.url ?? '/', 'http://localhost')
    const target = url.searchParams.get('path')
    if (target === null || !isAbsolute(target)) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('missing absolute path')
      return
    }
    try {
      const html = await readFile(target, 'utf8')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'referrer-policy': 'no-referrer' })
      res.end(html)
    } catch (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(error instanceof Error ? error.message : String(error))
    }
  },
}

/** GET /api/dsh-mindmap/list?dir=… — candidate source files under a directory. */
const listRoute: WebRoute = {
  path: `${MM_API}/list`,
  kind: 'exact',
  handler: async (req, res) => {
    if (!guard(req, res, 'GET')) return
    const url = new URL(req.url ?? '/', 'http://localhost')
    const dir = url.searchParams.get('dir')
    if (dir === null || !isAbsolute(dir)) {
      writeJson(res, 400, { ok: false, error: 'missing absolute dir' })
      return
    }
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      const files = entries
        .filter((entry) => entry.isFile() && SOURCE_EXTS.has(extname(entry.name).toLowerCase()))
        .map((entry) => join(dir, entry.name))
      writeJson(res, 200, { ok: true, dir, files })
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  },
}

/** GET /api/dsh-mindmap/recent — newest generated HTML files (auto-preview feed). */
function recentRoute(store: RecentStore): WebRoute {
  return {
    path: `${MM_API}/recent`,
    kind: 'exact',
    handler: async (req, res) => {
      if (!guard(req, res, 'GET')) return
      writeJson(res, 200, { ok: true, recent: store.list() })
    },
  }
}

/** GET/PUT /api/dsh-mindmap/style — read or set the selected mindmap style. */
function styleRoute(store: RecentStore): WebRoute {
  return {
    path: `${MM_API}/style`,
    kind: 'exact',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        writeJson(res, 200, { ok: true, style: store.getStyle() })
        return
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const body = await readJsonBody(req)
        if (body === undefined || typeof body.style !== 'string') {
          writeJson(res, 400, { ok: false, error: 'expected { style: string }' })
          return
        }
        store.setStyle(body.style)
        writeJson(res, 200, { ok: true, style: store.getStyle() })
        return
      }
      writeJson(res, 405, { ok: false, error: 'method not allowed' })
    },
  }
}

/** The full route family. */
export function makeRoutes(store: RecentStore): WebRoute[] {
  return [generateRoute(store), previewRoute, listRoute, recentRoute(store), styleRoute(store)]
}
