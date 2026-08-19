import { useEffect, useState, type ReactElement } from 'react'
import { Button, Modal } from '@heroui/react'
import { useT } from '../../lib/i18n'

export function AboutRowportDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): ReactElement {
  const t = useT()
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void window.rowport.app
      .getVersion()
      .then(setVersion)
      .catch(() => undefined)
  }, [open])

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{t('about.title')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <svg
                viewBox="0 0 1024 1024"
                fill="currentColor"
                aria-hidden="true"
                className="size-10 text-app-fg"
              >
                <rect x="172" y="284" width="680" height="96" rx="48" />
                <rect x="172" y="404" width="680" height="96" rx="48" />
                <rect x="172" y="524" width="680" height="96" rx="48" />
                <rect x="172" y="644" width="680" height="96" rx="48" />
              </svg>
              <h3 className="text-lg font-semibold text-app-fg">{t('app.name')}</h3>
              {version && (
                <p className="text-sm text-app-fg-muted">{t('about.version', { version })}</p>
              )}
              <p className="max-w-sm text-xs leading-relaxed text-app-fg-soft">
                {t('about.tagline')}
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              {t('about.close')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
