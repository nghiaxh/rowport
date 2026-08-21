import { useEffect, useState, type ReactElement } from 'react'
import { Button, Modal } from '@heroui/react'
import { Copy, ArrowUpRight, Trash, CheckCircle } from '@phosphor-icons/react'
import type { QueryHistoryEntry } from '../../types/query'
import { cn, formatDuration, formatDateTime } from '../../lib/utils'
import { useT } from '../../lib/i18n'

interface HistoryDetailModalProps {
  entry: QueryHistoryEntry | null
  onClose: () => void
  onAddToEditor: (queryText: string) => void
  onDelete: (id: string) => void
}

export function HistoryDetailModal({
  entry,
  onClose,
  onAddToEditor,
  onDelete
}: HistoryDetailModalProps): ReactElement | null {
  const t = useT()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [copied])

  if (!entry) return null

  const e = entry
  const connectionName = e.connectionName ?? t('history.unknown')
  const executedAt = formatDateTime(e.executedAt)
  const duration = formatDuration(e.durationMs ?? 0)
  const rows = e.rowCount ?? 0
  const status = e.status
  const isError = status === 'error'

  function handleCopy(): void {
    void window.rowport.clipboard.writeText(e.queryText)
    setCopied(true)
  }

  function handleAddToEditor(): void {
    onAddToEditor(e.queryText)
    onClose()
  }

  function handleDelete(): void {
    onDelete(e.id)
    onClose()
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container size="lg">
        <Modal.Dialog style={{ width: 640, maxWidth: '90vw', maxHeight: '80vh' }}>
          <Modal.Header>
            <Modal.Heading>{t('history.detailsTitle')}</Modal.Heading>
            <Modal.CloseTrigger onPress={onClose} />
          </Modal.Header>
          <Modal.Body className="mt-4!">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    isError
                      ? 'bg-app-danger/10 text-app-danger'
                      : 'bg-app-success/10 text-app-success'
                  )}
                >
                  {t(`status.${status}`)}
                </span>
                <span className="text-xs text-app-fg-muted">{connectionName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-app-fg-muted">
                <div>
                  <span className="font-medium">{t('history.executedAt')}</span>
                  <div>{executedAt}</div>
                </div>
                <div>
                  <span className="font-medium">{t('history.duration')}</span>
                  <div>{duration}</div>
                </div>
                <div>
                  <span className="font-medium">{t('history.rows')}</span>
                  <div>
                    {rows === 1
                      ? t('qw.rowsOne', { count: rows })
                      : t('qw.rowsMany', { count: rows })}
                  </div>
                </div>
                <div>
                  <span className="font-medium">{t('history.status')}</span>
                  <div className={cn('capitalize', isError && 'text-app-danger')}>
                    {t(`status.${status}`)}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="history-query-text"
                  className="block text-xs text-app-fg-muted mb-1"
                >
                  {t('history.detailsTitle')}
                </label>
                <div className="relative">
                  <pre
                    id="history-query-text"
                    className="bg-app-bg-muted border border-app-edge rounded p-3 text-[11px] font-mono whitespace-pre-wrap max-h-64 overflow-auto text-app-fg"
                  >
                    {e.queryText}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 text-app-fg-muted hover:text-app-fg transition-colors"
                    title={t('common.copy')}
                  >
                    {copied ? <CheckCircle size={14} weight="fill" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {e.errorMessage && (
                <div className="bg-app-danger/10 border border-app-danger/20 rounded p-3 text-[11px] text-app-danger">
                  <div className="font-medium mb-1">{t('error.title')}</div>
                  <pre className="whitespace-pre-wrap">{e.errorMessage}</pre>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-end gap-2">
            <Button variant="ghost" onPress={onClose}>
              {t('common.close')}
            </Button>
            <Button variant="secondary" onPress={handleAddToEditor}>
              <ArrowUpRight size={14} />
              {t('history.addToEditor')}
            </Button>
            <Button variant="danger" onPress={handleDelete}>
              <Trash size={14} />
              {t('history.deleteEntry')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
