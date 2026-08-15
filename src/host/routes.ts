/**
 * /api/dsh-mindmap route family: read/set the selected mindmap style, which
 * mm_generate uses as its default. (Generated HTML preview is provided by
 * dsh-IDE, not this plugin.) Every route carries a loopback-only trust fence
 * (plus browser same-origin markers).
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { StyleStore } from './store.ts'

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

/** GET/PUT /api/dsh-mindmap/style — read or set the selected mindmap style. */
function styleRoute(store: StyleStore): WebRoute {
  return {
    path: `${MM_API}/style`,
    kind: 'exact',
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
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
export function makeRoutes(store: StyleStore): WebRoute[] {
  return [styleRoute(store)]
}
