import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const ROOT = join(__dirname, '..', '..')

let userData: string
let app: ElectronApplication
let page: Page

test.beforeEach(async () => {
  userData = mkdtempSync(join(tmpdir(), 'rowport-e2e-'))
})

test.afterEach(async () => {
  await app?.close().catch(() => undefined)
  rmSync(userData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
})

async function launch(): Promise<void> {
  app = await electron.launch({
    args: [ROOT],
    cwd: ROOT,
    env: { ...process.env, ROWPORT_USER_DATA: userData }
  })
  page = await app.firstWindow()
  page.on('pageerror', (error) => console.log('[renderer error]', error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('[renderer console]', message.text())
  })
  app.process().stderr?.on('data', (chunk) => console.log('[main stderr]', chunk.toString()))
}

async function addSqliteConnection(name: string): Promise<void> {
  await page.getByRole('button', { name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'New Connection' }).click()

  await page.getByPlaceholder('Connection name').fill(name)
  await page.locator('select').first().selectOption('sqlite')
  await page.getByPlaceholder('SQLite file path').fill(join(userData, `${name}.db`))
  await page.getByRole('button', { name: 'Add connection' }).click()

  await page.getByText(name, { exact: true }).dblclick()
}

async function runQuery(sql: string): Promise<void> {
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(sql)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
}

test('boots and shows the welcome empty state', async () => {
  await launch()
  await expect(page.getByRole('heading', { name: 'Connect to a database to get started' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New connection' })).toBeVisible()
})

test('creates a sqlite connection and runs a query', async () => {
  await launch()
  await addSqliteConnection('E2E SQLite')

  await expect(page.locator('.cm-editor')).toBeVisible()
  await runQuery("SELECT 'hello' AS greeting")

  await expect(page.locator('th').filter({ hasText: 'greeting' })).toBeVisible()
  await expect(page.locator('tbody').getByText('hello', { exact: true })).toBeVisible()
  await expect(page.getByText('Success', { exact: true })).toBeVisible()
})

test('persists saved connections and reconnects after relaunch', async () => {
  await launch()
  await addSqliteConnection('Persistent DB')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await app.close()

  await launch()
  await expect(page.getByText('Persistent DB', { exact: true })).toBeVisible()
  await page.getByText('Persistent DB', { exact: true }).dblclick()

  await expect(page.locator('.cm-editor')).toBeVisible()
  await runQuery('SELECT 42 AS answer')

  await expect(page.locator('th').filter({ hasText: 'answer' })).toBeVisible()
  await expect(page.locator('tbody').getByText('42', { exact: true })).toBeVisible()
})
