# AGENTS.md

Electron desktop app for multi-database workflows (PostgreSQL, MySQL, SQLite, MongoDB). React 19 renderer, plain Electron build, pnpm.

## Commands

- `pnpm dev` — compile main/preload, then run Vite dev server + Electron with hot reload (renderer HMR)
- `pnpm typecheck` — runs BOTH `typecheck:node` (main/preload, tsconfig.node.json) and `typecheck:web` (renderer, tsconfig.web.json). The root `tsconfig.json` is a project reference file only
- `pnpm lint` — Biome `check` (linter + formatter), config in `biome.json`
- `pnpm lint:fix` — Biome `check --write`, applies safe autofixes (includes formatting)
- `pnpm build` — typecheck + `tsc` for main/preload/shared + `esbuild` bundle for preload + `vite build` for renderer
- `pnpm build:win|mac|linux` — builds and packages with electron-builder
- `pnpm test:unit` — Vitest unit tests (`tests/unit/`)
- `pnpm test:integration` — Vitest integration tests (`tests/integration/`); container-based tests need Docker
- `pnpm test` — all Vitest tests (unit + integration)
- `pnpm test:e2e` — Playwright e2e suite (`tests/e2e/`); builds the app first, then launches Electron

Verification is `pnpm lint && pnpm typecheck && pnpm test`.

## Architecture

Plain Electron project (no electron-vite). Three build targets:

- `src/main/` — Electron main process (db drivers, IPC handlers). Compiled to `dist/main/` with `tsc` (CommonJS)
- `src/preload/` — preload script (only bridge, no React). Bundled to a single `dist/preload/index.js` with `esbuild` so `sandbox: true` keeps working (sandboxed preloads can't require relative files)
- `src/` renderer — React UI, lives at repo root `index.html`; path alias `@` maps to `src` (renderer only). Built to `dist/renderer/` with Vite

Entry point is `dist/main/index.js` (`package.json` `main`). `electron .` runs the app.

Build output: `dist/` (compiled), `dist/` installers from electron-builder.

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## IPC bridge pattern (critical)

The renderer has no direct IPC access. A feature crossing process boundaries touches multiple files in a specific chain:

1. `src/shared/rowport-api.ts` — single source of truth. Add the channel name to `IPC_CHANNELS` AND the method to the `RowportApi` interface. Renderer typings flow from here
2. `src/preload/index.ts` — implement the method via `ipcRenderer.invoke`, exposed on `window.rowport`
3. `src/main/ipc/register.ts` — register `ipcMain.handle` using the same `IPC_CHANNELS` constant (or a new module imported there)
4. `src/types/rowport.d.ts` — global `Window.rowport` typing

Renderer code calls through wrappers in `src/lib/electron-api.ts` (e.g. `keychainApi`, `mongoApi`), not `ipcRenderer` directly. Adding a channel requires the constant name to match exactly across all files.

## Database layer

- SQL live connections (postgres/mysql/sqlite) are held in a `Map` keyed by connection id in `src/main/db/connections.ts`; drivers in `src/main/db/`
- App metadata (saved connections, settings) lives in a SQLite app db at `app.getPath('userData')/app.db`, accessed via `src/main/ipc/metadata.ts`
- MongoDB uses a separate `MongoManager` (`src/main/db/mongodb.ts`); document results are round-tripped through EJSON
- Passwords are stored in the OS keyring via `@napi-rs/keyring` (service `com.rowport.app`, keyed by connection id), never in the app db

## UI strings (i18n)

All UI text is keyed, not inline. Keys are typed from `src/lib/i18n/en.ts`; `vi.ts` mirrors it (falls back to `en` when a key is missing). Adding a string means adding it to `en.ts` (and `vi.ts` for parity) and referencing by key. Use the `useT()` hook in components; `t()` is the non-reactive imperative lookup.

## Conventions

- Conventional commits (`feat:`, `fix:`, `chore:`) per git history
- Zustand stores in `src/stores/` for app state
- `.npmrc` redirects Electron downloads to npmmirror.com; don't change it without reason

## Code Quality

- `pnpm lint && pnpm typecheck` must pass before committing
- Explicit return types required (`nursery/useExplicitReturnType` in Biome, warn level with `allowExpressions`/`allowIifes`)
- Biome formatting: single quotes, no semicolons, printWidth 100, no trailing commas, JSX double quotes
- A11y rules that were never enforced by the old ESLint config stay off in `biome.json` (noStaticElementInteractions, useSemanticElements, useKeyWithClickEvents, noAutofocus, noNoninteractiveTabindex, noArrayIndexKey, noAssignInExpressions, noNonNullAssertion); re-enable incrementally rather than adding `biome-ignore` comments
- Deliberate hook-dependency or `!important` choices use `// biome-ignore lint/...: reason` comments (see `ConnectionForm.tsx`, `MongoEditor.tsx`, `globals.css`)
- Markdown files are not formatter-managed (Biome formats TS/JS/JSON/CSS only)
- Tests live in `tests/unit`, `tests/integration`, and `tests/e2e`; see `vitest.config.ts` and `playwright.config.ts`
