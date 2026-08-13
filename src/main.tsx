import React, { Component, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorDialog } from './components/common/ErrorDialog'
import { useErrorStore } from './stores/useErrorStore'
import './styles/globals.css'

function reportUnexpectedError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  useErrorStore.getState().reportError({
    message,
    stack,
    occurredAt: new Date().toISOString()
  })
}

function registerGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    reportUnexpectedError(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportUnexpectedError(event.reason)
  })
}

// biome-ignore lint/style/useComponentExportOnlyModules: app entry point, not a Fast Refresh module
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    reportUnexpectedError(error)
  }

  render(): ReactNode {
    return this.state.hasError ? null : this.props.children
  }
}

registerGlobalErrorHandlers()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <ErrorDialog />
  </React.StrictMode>
)
