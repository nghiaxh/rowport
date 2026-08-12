import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { codeInspectorPlugin } from 'code-inspector-plugin'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 9080,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  plugins: [
    react(),
    tailwindcss(),
    codeInspectorPlugin({ bundler: 'vite' }),
    {
      name: 'dev-csp-code-inspector',
      apply: 'serve',
      transformIndexHtml(html: string): string {
        return html
          .replace(
            "connect-src 'self' ws:",
            "connect-src 'self' ws: http://localhost:* http://127.0.0.1:*"
          )
          .replace(
            "img-src 'self' data: blob:",
            "img-src 'self' data: blob: http://localhost:* http://127.0.0.1:*"
          )
      }
    }
  ]
})
