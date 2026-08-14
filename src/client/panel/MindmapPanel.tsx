/**
 * The mindmap workspace panel: pick sources, paste/load a MindmapDoc, run
 * generation, and preview the resulting HTML. Pure React over the api +
 * locale helpers; all strings go through the locale dictionaries.
 */

import { useCallback, useMemo, useState } from 'react'
import { fetchPreview, generate, listSources, type GenerateResponse } from '../api.ts'
import { tt } from './helpers.ts'
import css from './panel.module.css'

type Tab = 'sources' | 'generate' | 'preview'

/** Render the mindmap workspace panel. */
export function MindmapPanel() {
  const [tab, setTab] = useState<Tab>('generate')
  const [dir, setDir] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [listing, setListing] = useState(false)
  const [docJson, setDocJson] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)

  const list = useCallback(async () => {
    setListing(true)
    setError(null)
    try {
      const response = await listSources(dir)
      if (!response.ok) {
        setError(response.error ?? tt('common.error'))
        setFiles([])
      } else {
        setFiles(response.files ?? [])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setFiles([])
    } finally {
      setListing(false)
    }
  }, [dir])

  const run = useCallback(async () => {
    if (docJson.trim() === '' || output.trim() === '') return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const parsed = JSON.parse(docJson.trim()) as unknown
      const response = await generate(parsed, output.trim())
      setResult(response)
      if (response.ok && response.outputPath !== undefined) {
        setPreviewPath(response.outputPath)
        setTab('preview')
        setPreviewError(null)
        try {
          setPreviewHtml(await fetchPreview(response.outputPath))
        } catch (cause) {
          setPreviewError(cause instanceof Error ? cause.message : String(cause))
        }
      } else {
        setError(response.error ?? tt('common.error'))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setRunning(false)
    }
  }, [docJson, output])

  const overflowCount = useMemo(
    () => (result?.pages ?? []).filter((page) => page.overflow).length,
    [result],
  )

  return (
    <div className={css.view}>
      <div className={css.head}>
        <span className={css.headTitle}>{tt('panel.title')}</span>
      </div>
      <div className={css.tabs}>
        {(['sources', 'generate', 'preview'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? `${css.tab} ${css.tabActive}` : css.tab}
            onClick={() => { setTab(id) }}
          >
            {tt(`tab.${id}` as never)}
          </button>
        ))}
      </div>
      <div className={css.body}>
        <p className={css.intro}>{tt('panel.intro')}</p>

        {tab === 'sources' && (
          <>
            <label className={css.field}>
              <span className={css.fieldLabel}>{tt('source.dir')}</span>
              <div className={css.row}>
                <input
                  className={css.input}
                  value={dir}
                  placeholder={tt('source.dirPlaceholder')}
                  onChange={(event) => { setDir(event.target.value) }}
                />
                <button type="button" className={css.btn} onClick={list} disabled={listing || dir.trim() === ''}>
                  {tt('source.list')}
                </button>
              </div>
            </label>
            {files.length === 0
              ? <p className={css.result}>{tt('source.none')}</p>
              : (
                <ul className={css.fileList}>
                  {files.map((file) => <li key={file} className={css.fileItem}>{file}</li>)}
                </ul>
              )}
          </>
        )}

        {tab === 'generate' && (
          <>
            <label className={css.field}>
              <span className={css.fieldLabel}>{tt('gen.docJson')}</span>
              <textarea
                className={css.textarea}
                value={docJson}
                placeholder={tt('gen.docJsonPlaceholder')}
                onChange={(event) => { setDocJson(event.target.value) }}
              />
            </label>
            <label className={css.field}>
              <span className={css.fieldLabel}>{tt('gen.output')}</span>
              <input
                className={css.input}
                value={output}
                placeholder={tt('gen.outputPlaceholder')}
                onChange={(event) => { setOutput(event.target.value) }}
              />
            </label>
            <div className={css.row}>
              <button
                type="button"
                className={css.btn}
                onClick={run}
                disabled={running || docJson.trim() === '' || output.trim() === ''}
              >
                {running ? tt('gen.running') : tt('gen.run')}
              </button>
            </div>
            {error !== null && <p className={css.error}>{error}</p>}
            {result !== null && result.ok && (
              <>
                <p className={css.result}>
                  {tt('gen.result')}: {result.outputPath}
                  {result.pages !== undefined && result.pages.length > 0 && (
                    '\n' + result.pages.map((page) =>
                      `- ${page.branch}${page.overflow ? ' ⚠' : ''} @ ${page.fontSizePt}pt (${Math.round(page.usedMm)}/${page.budgetMm}mm)`,
                    ).join('\n')
                  )}
                </p>
                {overflowCount > 0 && <p className={css.warn}>{tt('gen.overflowHint')}</p>}
              </>
            )}
          </>
        )}

        {tab === 'preview' && (
          <>
            <label className={css.field}>
              <span className={css.fieldLabel}>{tt('preview.path')}</span>
              <div className={css.row}>
                <input
                  className={css.input}
                  value={previewPath}
                  placeholder={tt('gen.outputPlaceholder')}
                  onChange={(event) => { setPreviewPath(event.target.value) }}
                />
                <button
                  type="button"
                  className={css.btnGhost}
                  onClick={async () => {
                    setPreviewError(null)
                    try {
                      setPreviewHtml(await fetchPreview(previewPath))
                    } catch (cause) {
                      setPreviewError(cause instanceof Error ? cause.message : String(cause))
                    }
                  }}
                >
                  {tt('preview.open')}
                </button>
              </div>
            </label>
            {previewError !== null && <p className={css.error}>{previewError}</p>}
            {previewHtml !== '' && (
              <iframe
                className={css.frame}
                title={tt('panel.title')}
                srcDoc={previewHtml}
                sandbox="allow-scripts"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
