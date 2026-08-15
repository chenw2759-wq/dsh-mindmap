/**
 * dsh-mindmap — host half. Registers the mindmap builder engine surfaces:
 * the /api/dsh-mindmap style route (the GUI-selected default style), the
 * agent tools (mm_generate, mm_extract), and a system-prompt announcement.
 * Generated HTML preview is provided by dsh-IDE, not this plugin.
 *
 * The builder methodology lives in `skills/mindmap-builder/SKILL.md`; the
 * `mindmap` agent preset composes this plugin + that skill so a session in
 * 思维导图模式 can turn courseware + e-books into printable review mindmaps.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from 'schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { makeRoutes } from './host/routes.ts'
import { mmExtractTool, mmGenerateTool } from './host/tools.ts'
import { StyleStore } from './host/store.ts'

/** Re-export the pure renderer so tests and sibling plugins can reuse it. */
export { renderMindmap, MINDMAP_STYLES, resolveStyle } from './host/generator.ts'
export type { MindmapDoc, MindmapBranch, MindmapGroup, MindmapItem, QuizQuestion, RenderResult, PageReport, MindmapStyleId, MindmapStyleDef } from './host/generator.ts'
/** Re-export tool factories for tests and reuse. */
export { mmGenerateTool, mmExtractTool } from './host/tools.ts'

/** Stable cordis plugin name. */
export const name = 'mindmap'

/** Services required before the mindmap surfaces can mount. */
export const inject = ['webServer', 'tools', 'systemPrompt']

/** Plugin config. */
export interface Config {
  /** Master switch for the plugin (routes, tools, prompt section). */
  enabled?: boolean
  /** When true (default), announce the mindmap mode to every agent. */
  announceToAgent?: boolean
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  announceToAgent: z.boolean().default(true),
})

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 160

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const MINDMAP_GUIDANCE =
  '本机已安装 dsh-mindmap 插件（思维导图模式）：新建会话选择「思维导图模式」后在模式下方选择风格（经典大括号 / 极简商务 / 活泼创意 / 学术整理）；构建方法见 mindmap-builder skill。能力：mm_generate 一键生成打印级复习思维导图 HTML（A3 横向、每主干知识点一页、大括号式横向布局、黑体、右侧留白笔记区、封面总览，可选附带交互式测试题）；mm_extract 提取纯文本课件；PPT/PDF/DOCX 请先用 mineru_parse_document 解析再喂给 mm_generate；生成的 HTML 用 dsh-IDE 打开预览。要求：内容以课件与电子书共同重点为主、保留原文细节、严禁概括过简与篡改；每页必须放得下（溢出时工具会报告，需拆分主干页）；字体黑体、字号相对大（17pt 起步）。用户提到「思维导图 / 复习大纲 / 一页一个知识点 / 大括号式 / 留白补充 / 附带测试题」时即指本插件，请据此协作。'

/**
 * Mount the routes, tools, and announcement.
 * @param ctx - host plugin context carrying webServer/tools/systemPrompt.
 * @param config - resolved plugin config.
 */
export function apply(ctx: Context, config?: Config): void {
  const enabled = config?.enabled ?? true
  const announce = config?.announceToAgent ?? true

  if (!enabled) return

  // The GUI-selected style, used as mm_generate's default.
  const styleStore = new StyleStore()

  ctx.effect(
    () => {
      const disposers = makeRoutes(styleStore).map((route) => ctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-mindmap: routes',
  )

  ctx.effect(
    () => {
      const disposers = [mmGenerateTool(styleStore), mmExtractTool()].map((tool) => ctx.tools.register(tool))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-mindmap: tools',
  )

  if (announce) {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: 'plugin:dsh-mindmap',
          order: SECTION_ORDER,
          text: MINDMAP_GUIDANCE,
        }),
      'dsh-mindmap: announcement',
    )
  }
}
