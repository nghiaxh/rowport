/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { buildSync } from 'esbuild'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const root = process.cwd()
const tscCli = require.resolve('typescript/bin/tsc')
const electronPath = require('electron')

/**
 * @returns {void}
 */
function compileMainAndPreload() {
  const result = spawnSync(process.execPath, [tscCli, '-p', 'tsconfig.node.json'], {
    cwd: root,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/**
 * @returns {void}
 */
function bundlePreload() {
  buildSync({
    entryPoints: [resolve(root, 'src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: resolve(root, 'dist/preload/index.js'),
    external: ['electron']
  })
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  compileMainAndPreload()
  bundlePreload()

  const server = await createServer({ configFile: resolve(root, 'vite.config.ts') })
  await server.listen()
  const devServerUrl = `http://localhost:${server.config.server.port ?? 9080}`

  const electron = spawn(electronPath, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl }
  })

  electron.on('exit', (code) => {
    void server.close()
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
