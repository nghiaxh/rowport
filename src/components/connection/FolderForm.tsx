import { useEffect, useState, type ReactElement } from 'react'
import { Button, Input, Modal } from '@heroui/react'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { ColorTagPicker } from '../common/ColorTagPicker'
import type { ConnectionFolder } from '../../types/connection'
import { useT } from '../../lib/i18n'

interface FolderFormProps {
  open: boolean
  onClose: () => void
  existing?: ConnectionFolder | null
}

export function FolderForm({ open, onClose, existing }: FolderFormProps): ReactElement {
  const t = useT()
  const addFolder = useConnectionStore((s) => s.addFolder)
  const updateFolder = useConnectionStore((s) => s.updateFolder)
  const [name, setName] = useState('')
  const [colorTag, setColorTag] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? '')
      setColorTag(existing?.colorTag)
      setSubmitting(false)
      setError(null)
    }
  }, [open, existing])

  async function handleSubmit(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('folder.nameRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (existing) {
        await updateFolder(existing.id, trimmed, colorTag)
      } else {
        await addFolder(trimmed, colorTag)
      }
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      isDismissable={false}
    >
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{existing ? t('folder.titleEdit') : t('folder.titleNew')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <span className="text-xs text-app-fg-muted">{t('folder.name')}</span>
                <Input
                  autoFocus
                  placeholder={t('folder.namePlaceholder')}
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSubmit()
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs text-app-fg-muted">{t('conn.colorTag')}</span>
                <ColorTagPicker value={colorTag} onChange={setColorTag} />
              </div>
              {error && <p className="text-xs text-app-danger">{error}</p>}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" isDisabled={submitting} onPress={() => void handleSubmit()}>
              {existing ? t('conn.saveChanges') : t('folder.create')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
