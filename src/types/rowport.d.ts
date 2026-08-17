import type { RowportApi } from '../shared/rowport-api'

declare global {
  interface Window {
    rowport: RowportApi
  }
}
