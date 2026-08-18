import { useEffect, useState, type ReactElement } from 'react'
import { Button, Modal } from '@heroui/react'
import { Copy } from '@phosphor-icons/react'
import { useT } from '../../lib/i18n'
import { useErrorStore, type FatalErrorInfo } from '../../stores/useErrorStore'

const COPY_FEEDBACK_MS = 1600

function buildDebugLog(appVersion: string, error: FatalErrorInfo): string {
  const { electron, chrome, node } = window.rowport.versions
  const lines = [
    `Rowport version: ${appVersion || 'unknown'}`,
    `Platform: ${window.rowport.platform}`,
    `Electron: ${electron}`,
    `Chrome: ${chrome}`,
    `Node: ${node}`,
    `Time: ${error.occurredAt}`,
    '',
    error.message
  ]
  if (error.stack) {
    lines.push('', error.stack)
  }
  return lines.join('\n')
}

export function ErrorDialog(): ReactElement | null {
  const t = useT()
  const error = useErrorStore((s) => s.error)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!error) return
    void window.rowport.app
      .getVersion()
      .then(setAppVersion)
      .catch(() => undefined)
  }, [error])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    return () => window.clearTimeout(id)
  }, [copied])

  if (!error) return null

  const log = buildDebugLog(appVersion ?? '', error)

  const handleCopy = (): void => {
    void window.rowport.clipboard.writeText(log).then(() => setCopied(true))
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={() => {}} isDismissable={false}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{t('error.title')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-app-fg-muted">{t('error.description')}</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-app-fg-muted">
                    {t('error.debugLog')}
                  </span>
                  <Button size="sm" variant="secondary" onPress={handleCopy}>
                    <Copy size={14} />
                    {copied ? t('error.copiedLog') : t('common.copy')}
                  </Button>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-app-edge bg-app-bg-soft p-2.5 font-mono text-xs leading-relaxed text-app-fg-muted break-all">
                  {log}
                </pre>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={() => void window.rowport.window.close()}>
              {t('error.exit')}
            </Button>
            <Button variant="primary" onPress={() => void window.rowport.app.restart()}>
              {t('error.restart')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
