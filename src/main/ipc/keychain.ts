import {
  getPassword as keyringGetPassword,
  setPassword as keyringSetPassword,
  deletePassword as keyringDeletePassword
} from '@napi-rs/keyring/keytar'

const SERVICE = 'com.rowport.app'

export async function savePassword(connectionId: string, password: string): Promise<void> {
  await keyringSetPassword(SERVICE, connectionId, password)
}

export async function getPassword(connectionId: string): Promise<string | null> {
  return keyringGetPassword(SERVICE, connectionId)
}

export async function deletePassword(connectionId: string): Promise<void> {
  await keyringDeletePassword(SERVICE, connectionId)
}
