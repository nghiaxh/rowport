const NEW_CONNECTION_EVENT = 'rowport:new-connection'
const NEW_FOLDER_EVENT = 'rowport:new-folder'

export interface NewConnectionEventDetail {
  folderId?: string
}

export function openNewConnectionDialog(folderId?: string): void {
  window.dispatchEvent(new CustomEvent(NEW_CONNECTION_EVENT, { detail: { folderId } }))
}

export function openNewFolderDialog(): void {
  window.dispatchEvent(new Event(NEW_FOLDER_EVENT))
}

export function onNewConnectionDialog(
  listener: (detail: NewConnectionEventDetail) => void
): () => void {
  const handler = (event: CustomEvent<NewConnectionEventDetail>): void => listener(event.detail)
  window.addEventListener(NEW_CONNECTION_EVENT, handler as EventListener)
  return () => window.removeEventListener(NEW_CONNECTION_EVENT, handler as EventListener)
}

export function onNewFolderDialog(listener: () => void): () => void {
  window.addEventListener(NEW_FOLDER_EVENT, listener)
  return () => window.removeEventListener(NEW_FOLDER_EVENT, listener)
}
