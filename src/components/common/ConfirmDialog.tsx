import { Button, Modal } from '@heroui/react'
import type { ReactElement } from 'react'
import { useT } from '../../lib/i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'primary',
  onConfirm,
  onClose
}: ConfirmDialogProps): ReactElement {
  const t = useT()
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      isDismissable={false}
    >
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          {description && (
            <Modal.Body>
              <p className="text-sm text-app-fg-muted">{description}</p>
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
