/**
 * Agent tools for the mindmap mode: one command that turns courseware +
 * e-book knowledge into a printable mindmap HTML per the builder skill.
 *
 * - `mm_generate` — the merged workflow: accept a structured MindmapDoc
 *   (either inline JSON or a JSON file path) plus an output HTML path,
 *   render the document, write the file, and report per-page fit (font size
 *   used + overflow warnings). The model prepares the MindmapDoc by reading
 *   the courseware (with mineru_parse_document or mm_extract) and applying
 *   the mindmap-builder skill; generation itself is one deterministic step.
 * - `mm_extract` — light text extraction for plain sources (.md/.txt/.html);
 *   for PPT/PDF/DOCX it points at the MinerU pipeline already installed.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { renderMindmap, type MindmapDoc } from './generator.ts'
import { RecentStore } from './store.ts'

/** One text content block. */
function text(value: string): ContentBlock[] {
  return [{ type: 'text', text: value }]
}

/** Load a MindmapDoc from inline JSON or a JSON file path. */
async function loadDoc(source: string): Promise<MindmapDoc> {
  const trimmed = source.trim()
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as MindmapDoc
    if (!Array.isArray(parsed.branches) || parsed.branches.length === 0) {
      throw new Error('MindmapDoc.branches must be a non-empty array')
    }
    return parsed
  }
  const raw = await readFile(source, 'utf8')
  const parsed = JSON.parse(raw) as MindmapDoc
  if (!Array.isArray(parsed.branches) || parsed.branches.length === 0) {
    throw new Error('MindmapDoc.branches must be a non-empty array')
  }
  return parsed
}

/** The one-shot mindmap generation tool (the merged workflow). */
export function mmGenerateTool(recent?: RecentStore) {
  return defineTool({
    name: 'mm_generate',
    description: 'Generate a printable review mindmap HTML from structured knowledge. Accepts either an inline MindmapDoc JSON or a path to a .json file containing one, plus an output .html path. Renders A3-landscape pages (one 主干知识点 per page, 大括号式横向布局, SimSun, right-hand note column), writes the file, and reports per-page fit: item font size used and whether any page still overflows (split it when reported). Prepare the MindmapDoc by reading the courseware/ebook (use mineru_parse_document or mm_extract) and following the mindmap-builder skill. JSON shape: {"title","course","ebook","branches":[{"id":"一","title":"概述","groups":[{"heading":"（一）…","items":[{"text":"…","subs":["…"]}]}]}],"quiz":[{"type":"choice","question":"…","options":["A","B","C","D"],"answer":0,"explanation":"…","pitfall":"…"}]}. Triggers: 思维导图, 复习大纲, 生成思维导图 html.',
    parameters: {
      source: {
        type: 'string',
        required: true,
        description: 'Inline MindmapDoc JSON (starts with `{`) or absolute path to a .json file containing it.',
      },
      output: {
        type: 'string',
        required: true,
        description: 'Absolute path of the .html file to write (parent dirs are created).',
      },
      course: {
        type: 'string',
        description: 'Override the courseware name shown on the cover (when absent, uses doc.course).',
      },
      ebook: {
        type: 'string',
        description: 'Override the e-book name shown on the cover (when absent, uses doc.ebook).',
      },
      style: {
        type: 'string',
        enum: ['classic', 'minimal', 'creative', 'academic'],
        description: 'Visual style: classic 经典大括号 / minimal 极简商务 / creative 活泼创意 / academic 学术整理. Defaults to the style selected in the GUI panel.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          outputPath: { type: 'string', required: true },
          pages: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                branch: { type: 'string', required: true },
                fontSizePt: { type: 'number', required: true },
                usedMm: { type: 'number', required: true },
                budgetMm: { type: 'number', required: true },
                overflow: { type: 'boolean', required: true },
              },
            },
          },
          warnings: { type: 'array', items: { type: 'string' }, required: true },
        },
      },
      render: (_args, value) => {
        const parts = [`ok: ${value.ok}`, `output: ${value.outputPath}`]
        for (const page of value.pages) {
          const fit = page.overflow ? ' ⚠ OVERFLOW — split this branch' : ` (fits @ ${page.fontSizePt}pt, ${Math.round(page.usedMm)}/${page.budgetMm}mm)`
          parts.push(`- ${page.branch}${fit}`)
        }
        if (value.warnings.length > 0) parts.push(...value.warnings.map((w) => `warning: ${w}`))
        return text(parts.join('\n'))
      },
    },
    async execute(args) {
      const doc = await loadDoc(args.source)
      const finalDoc: MindmapDoc = {
        ...doc,
        ...(args.course !== undefined ? { course: args.course } : {}),
        ...(args.ebook !== undefined ? { ebook: args.ebook } : {}),
        ...(args.style !== undefined ? { style: args.style as MindmapDoc['style'] } : {}),
        // The GUI-selected style is the default when the doc/tool omit one.
        ...(args.style === undefined && doc.style === undefined && recent !== undefined ? { style: recent.getStyle() as MindmapDoc['style'] } : {}),
      }
      const { html, pages } = renderMindmap(finalDoc)
      const outPath = resolve(args.output)
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf8')
      recent?.push(outPath, 'mm_generate')
      const warnings = pages
        .filter((page) => page.overflow)
        .map((page) => `「${page.branch}」一页放不下（估 ${Math.round(page.usedMm)}mm > ${page.budgetMm}mm），请按 skill 拆分为多个主干页或压缩措辞后重新生成`)
      return {
        ok: true,
        outputPath: outPath,
        pages: pages.map((page) => ({ ...page })),
        warnings,
      }
    },
  })
}

/** Light text extraction for plain sources; heavy formats go to MinerU. */
export function mmExtractTool() {
  return defineTool({
    name: 'mm_extract',
    description: 'Extract readable text from a courseware source for mindmap building. Plain sources (.md, .txt, .html) are read directly; PPT/PDF/DOCX are not parsed here — use mineru_parse_document for those and feed its markdown to mm_generate. Triggers: 提取课件文本, 读取资料内容.',
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path of the source file.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          note: { type: 'string' },
          content: { type: 'string' },
        },
      },
      render: (_args, value) => {
        if (!value.ok) return text(`mm_extract: ${value.note ?? 'failed'}`)
        if (value.content !== undefined) return text(value.content.slice(0, 12000))
        return text(`mm_extract: ${value.note ?? ''}`)
      },
    },
    async execute(args) {
      const lower = args.path.toLowerCase()
      if (lower.endsWith('.md') || lower.endsWith('.txt')) {
        const content = await readFile(args.path, 'utf8')
        return { ok: true, content }
      }
      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        const raw = await readFile(args.path, 'utf8')
        const stripped = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        return { ok: true, content: stripped }
      }
      return {
        ok: false,
        note: `${args.path} 是 ${lower.split('.').pop()} 格式，请用 mineru_parse_document 解析后再构建思维导图（本机已安装 MinerU）。`,
      }
    },
  })
}
