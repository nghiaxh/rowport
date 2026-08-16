import { connect } from 'node:net'
import type { DetectedServer } from '../../shared/rowport-api'

const PROBES: Array<[string, number]> = [
  ['postgres', 5432],
  ['mysql', 3306],
  ['mongodb', 27017]
]

const TIMEOUT_MS = 500

function probePort(port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

export async function detectLocalServers(): Promise<DetectedServer[]> {
  const probes = PROBES.map(async ([dbType, port]): Promise<DetectedServer | null> => {
    if (await probePort(port, TIMEOUT_MS)) {
      return { dbType, host: '127.0.0.1', port }
    }
    return null
  })
  const results = await Promise.all(probes)
  return results.filter((r): r is DetectedServer => r !== null)
}
