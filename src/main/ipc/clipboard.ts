import { clipboard } from 'electron'

export function writeClipboard(text: string): void {
  clipboard.writeText(text)
}

export function readClipboard(): string {
  return clipboard.readText()
}
