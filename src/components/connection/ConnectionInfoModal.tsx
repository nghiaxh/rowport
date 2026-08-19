import { useState, type ReactElement, type ReactNode } from 'react'
import { Button, Modal } from '@heroui/react'
import {
  CalendarPlus,
  Clock,
  CopySimple,
  Database,
  FolderOpen,
  Globe,
  LinkSimple,
  LockKey,
  PencilSimple,
  Play,
  Plug,
  ShieldCheck,
  SpinnerGap,
  Stack,
  Stop,
  Terminal,
  Trash,
  User
} from '@phosphor-icons/react'
import type { Connection, ConnectionStatus, DbType } from '../../types/connection'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

const DB_CODES: Record<DbType, string> = {
  postgres: 'PG',
  mysql: 'MY',
  sqlite: 'SQ',
  mongodb: 'MO'
}

function StatusDot({ status }: { status: ConnectionStatus }): ReactElement {
  const color: Record<ConnectionStatus, string> = {
    idle: 'bg-app-fg-soft',
    connecting: 'bg-app-warning animate-pulse',
    connected: 'bg-app-success',
    error: 'bg-app-danger'
  }
  return <span className={cn('size-1.5 shrink-0 rounded-full', color[status])} />
}

interface DetailRowProps {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  placeholder?: boolean
}

function DetailRow({ icon, label, value, mono, placeholder }: DetailRowProps): ReactElement {
  return (
    <div className="flex items-center gap-3 px-2.5 py-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-app-bg-soft text-app-fg-muted">
        {icon}
      </span>
      <span className="w-20 shrink-0 text-xs text-app-fg-muted">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-right text-xs',
          mono && !placeholder && 'font-mono',
          placeholder ? 'italic text-app-fg-soft' : 'text-app-fg'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="space-y-1">
      <h3 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-app-fg-soft">
        {title}
      </h3>
      <div className="divide-y divide-app-edge overflow-hidden rounded-md border border-app-edge bg-app-bg-muted">
        {children}
      </div>
    </section>
  )
}

interface ConnectionInfoModalProps {
  connection: Connection
  onClose: () => void
  onEdit: (connection: Connection) => void
  onDelete: (connection: Connection) => void
}

export function ConnectionInfoModal({
  connection,
  onClose,
  onEdit,
  onDelete
}: ConnectionInfoModalProps): ReactElement {
  const t = useT()
  const status = useConnectionStore((s) => s.statusById[connection.id]) ?? 'idle'
  const connect = useConnectionStore((s) => s.connect)
  const disconnect = useConnectionStore((s) => s.disconnect)
  const duplicateConnection = useConnectionStore((s) => s.duplicateConnection)
  const [busy, setBusy] = useState(false)

  const connected = status === 'connected'
  const connecting = status === 'connecting'

  async function handleToggleConnect(): Promise<void> {
    if (connected) {
      await disconnect(connection.id)
      onClose()
      return
    }
    setBusy(true)
    try {
      await connect(connection.id)
      onClose()
    } catch {
      // status is already marked as error in the store
    } finally {
      setBusy(false)
    }
  }

  const notSet = t('connInfo.notSet')
  const sslLabel =
    connection.sslMode === 'disable'
      ? t('ssl.disable')
      : connection.sslMode === 'require'
        ? t('ssl.require')
        : t('ssl.verifyFull')
  const sshLabel = connection.sshTunnel
    ? `${connection.sshTunnel.username}@${connection.sshTunnel.host}:${connection.sshTunnel.port}`
    : t('connInfo.noSshTunnel')

  function formatDate(value?: string): string {
    if (!value) return notSet
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? notSet : date.toLocaleString()
  }

  const statusLabel =
    status === 'connected'
      ? t('status.connected')
      : status === 'connecting'
        ? t('status.connecting')
        : status === 'error'
          ? t('status.error')
          : t('status.idle')

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{t('connInfo.title')}</Modal.Heading>
            <Modal.CloseTrigger onPress={onClose} />
          </Modal.Header>
          <Modal.Body>
            <div className="flex items-center gap-2.5 pb-3">
              {connection.colorTag && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: connection.colorTag }}
                />
              )}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-app-bg-soft font-mono text-[10px] font-bold text-app-fg-muted">
                {DB_CODES[connection.dbType]}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold leading-tight text-app-fg">
                  {connection.name}
                </h2>
                <p className="truncate text-[11px] text-app-fg-muted">
                  {t(`dbType.${connection.dbType}`)}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-app-bg-soft px-2 py-0.5 text-[11px] text-app-fg-muted">
                <StatusDot status={status} />
                {statusLabel}
              </span>
            </div>

            <div className="space-y-3">
              <DetailSection title={t('connInfo.server')}>
                <DetailRow
                  icon={<Stack size={14} />}
                  label={t('connInfo.type')}
                  value={t(`dbType.${connection.dbType}`)}
                />
                <DetailRow
                  icon={<Globe size={14} />}
                  label={t('connInfo.host')}
                  value={connection.host || notSet}
                  mono
                  placeholder={!connection.host}
                />
                <DetailRow
                  icon={<Plug size={14} />}
                  label={t('connInfo.port')}
                  value={connection.port ? String(connection.port) : notSet}
                  mono
                  placeholder={!connection.port}
                />
                <DetailRow
                  icon={<Database size={14} />}
                  label={t('connInfo.database')}
                  value={connection.database || notSet}
                  mono
                  placeholder={!connection.database}
                />
                {connection.filePath && (
                  <DetailRow
                    icon={<FolderOpen size={14} />}
                    label={t('connInfo.filePath')}
                    value={connection.filePath}
                    mono
                  />
                )}
                {connection.uri && (
                  <DetailRow
                    icon={<LinkSimple size={14} />}
                    label={t('connInfo.uri')}
                    value={connection.uri}
                    mono
                  />
                )}
              </DetailSection>

              <DetailSection title={t('connInfo.security')}>
                <DetailRow
                  icon={<User size={14} />}
                  label={t('connInfo.username')}
                  value={connection.username || notSet}
                  mono
                  placeholder={!connection.username}
                />
                <DetailRow
                  icon={<ShieldCheck size={14} />}
                  label={t('connInfo.ssl')}
                  value={sslLabel}
                />
                <DetailRow
                  icon={<Terminal size={14} />}
                  label={t('connInfo.sshTunnel')}
                  value={sshLabel}
                  placeholder={!connection.sshTunnel}
                />
                <DetailRow
                  icon={<LockKey size={14} />}
                  label={t('connInfo.readOnly')}
                  value={connection.readOnly ? t('connInfo.yes') : t('connInfo.no')}
                />
              </DetailSection>

              <DetailSection title={t('connInfo.metadata')}>
                <DetailRow
                  icon={<Clock size={14} />}
                  label={t('connInfo.lastUsed')}
                  value={formatDate(connection.lastUsedAt)}
                  placeholder={!connection.lastUsedAt}
                />
                <DetailRow
                  icon={<CalendarPlus size={14} />}
                  label={t('connInfo.created')}
                  value={formatDate(connection.createdAt)}
                  placeholder={!connection.createdAt}
                />
              </DetailSection>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex justify-center items-center gap-4">
              <Button variant="ghost" onPress={() => void duplicateConnection(connection.id)}>
                <CopySimple size={14} />
                {t('tree.duplicate')}
              </Button>
              <Button variant="ghost" onPress={() => onEdit(connection)}>
                <PencilSimple size={14} />
                {t('tree.edit')}
              </Button>
              <Button variant="danger" onPress={() => onDelete(connection)}>
                <Trash size={14} />
                {t('tree.delete')}
              </Button>
              <Button
                variant={connected ? 'secondary' : 'primary'}
                isDisabled={busy || connecting}
                onPress={() => void handleToggleConnect()}
              >
                {busy || connecting ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : connected ? (
                  <Stop size={14} />
                ) : (
                  <Play size={14} />
                )}
                {connected ? t('tree.disconnect') : t('tree.connect')}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
