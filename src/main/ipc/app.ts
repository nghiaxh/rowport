import { app } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function getVersion(): string {
  return app.getVersion()
}

export function restartApp(): void {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    const urlPath = join(app.getPath('userData'), 'vite-dev-url.txt')
    writeFileSync(urlPath, devServerUrl)
  }
  app.relaunch()
  app.quit()
}
