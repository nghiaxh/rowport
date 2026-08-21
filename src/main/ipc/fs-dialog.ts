import { dialog, type BrowserWindow } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import type { OpenDialogOptions, SaveDialogOptions } from '../../shared/rowport-api.js'

export async function showOpenDialog(
  parent: BrowserWindow | null,
  options?: OpenDialogOptions
): Promise<string | string[] | null> {
  const properties: Electron.OpenDialogOptions['properties'] = ['openFile']
  if (options?.multiple) properties.push('multiSelections')
  if (options?.directory) {
    properties.length = 0
    properties.push('openDirectory')
    if (options?.multiple) properties.push('multiSelections')
  }
  const dialogOptions: Electron.OpenDialogOptions = {
    properties,
    filters: options?.filters
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)
  if (result.canceled || result.filePaths.length === 0) return null
  if (options?.multiple) return result.filePaths
  return result.filePaths[0] ?? null
}

export async function showSaveDialog(
  parent: BrowserWindow | null,
  options?: SaveDialogOptions
): Promise<string | null> {
  const dialogOptions: Electron.SaveDialogOptions = {
    defaultPath: options?.defaultPath,
    filters: options?.filters
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

export function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf8')
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return writeFile(path, contents, 'utf8')
}
