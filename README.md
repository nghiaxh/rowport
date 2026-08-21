# Rowport

A modern desktop client for multi-database workflows — connect to PostgreSQL, MySQL, SQLite, and MongoDB from a single Electron app built for developers and data engineers.

![Electron](https://img.shields.io/badge/Electron-43-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-ready-F69220?logo=pnpm&logoColor=white)

## Demo / Screenshot

<!-- TODO: add screenshots or a GIF here, e.g. docs/screenshots/main-window.png
![Rowport main window](docs/screenshots/main-window.png)
-->

## Features

- **Multi-database support**: PostgreSQL, MySQL, SQLite, and MongoDB in a single workspace
- **SQL editor**: CodeMirror-based editor with syntax highlighting, formatting, query history, and saved queries
- **Results grid**: sortable, resizable, pinnable columns with inline cell editing and CSV/JSON/TSV export
- **Schema browser**: browse tables, views, and collections for any connected database
- **ER diagrams**: generated entity relationship diagrams with automatic layout
- **MongoDB editor**: filter, projection, sort, and aggregation pipeline support
- **AI assistant**: query help via Ollama (local) or OpenAI, configurable in Settings
- **Connection management**: folders, color tags, read only mode, SSL modes, SSH tunnels, and secure credential storage via the OS keyring
- **Workspaces**: save, load, import, and export your working session as `.rpw` files
- **Customization**: light, dark, or system themes, editor fonts, row density, zoom, animations toggle, and English or Vietnamese UI

## Tech Stack

| Layer            | Technology                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Desktop shell    | Electron 43 (plain build, no electron-vite), electron-builder              |
| Renderer         | React 19, Zustand, Tailwind CSS 4, HeroUI, Framer Motion                   |
| Editors          | CodeMirror 6 (`@uiw/react-codemirror`), sql-formatter                      |
| Grid & diagrams  | TanStack Table + Virtual, XYFlow + Dagre                                   |
| Database drivers | `pg`, `mysql2`, `better-sqlite3`, `mongodb` (EJSON round-trip)             |
| Security         | Sandboxed preload, context isolation, `@napi-rs/keyring` for credentials   |
| Validation       | Zod                                                                        |
| Tooling          | TypeScript 5.9, Vite 7, esbuild (preload bundle), Biome                    |
| Testing          | Vitest (unit + integration with testcontainers), Playwright (e2e)          |

## Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/) 10+
- Docker (optional — only for container-based integration tests)

## Installation

```bash
git clone https://github.com/nghiaxh/rowport.git
cd rowport
pnpm install
```

> `postinstall` runs `electron-builder install-app-deps` to rebuild native modules (e.g. `better-sqlite3`) against Electron. The bundled `.npmrc` points Electron downloads at npmmirror.com.

## Usage

```bash
# Development: compiles main/preload, then runs Vite dev server + Electron with HMR
pnpm dev
```

No `.env` file is required. The app stores its own metadata (saved connections, settings, history) in a SQLite database under the OS user-data directory, and connection passwords in the OS keyring. AI assistant credentials (OpenAI API key or Ollama URL) are entered in-app via Settings and are never written to disk by Rowport itself.

### Production build

```bash
# Typecheck + compile main/preload + bundle renderer
pnpm build

# Package installers
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux
```

## Project Structure

```
src/
├── main/               # Electron main process (compiled with tsc to dist/main/)
│   ├── assistant/      # AI assistant providers (Ollama, OpenAI)
│   ├── db/             # Database drivers and live connection manager
│   ├── ipc/            # IPC handlers (settings, metadata, keychain, ...)
│   └── index.ts        # App entry: window creation, lifecycle
├── preload/            # Preload script exposing the typed IPC bridge (esbuild bundle)
├── shared/             # Types shared across process boundaries
│   ├── validation/     # Zod schemas
│   ├── assistant-api.ts
│   └── rowport-api.ts  # IPC_CHANNELS + RowportApi — single source of truth
├── components/         # React UI components
│   ├── common/         # Shared UI primitives (toast, ...)
│   ├── connection/     # Connection tree and forms
│   ├── editor/         # SQL editor support components
│   ├── er/             # ER diagram rendering
│   ├── grid/           # Results grid and cell viewer
│   ├── layout/         # Window chrome, sidebar, status bar, dialogs
│   ├── panel/          # Schema, history, assistant panels
│   ├── query/          # Query workspace, tabs, SQL/Mongo editors, results
│   └── toolbar/        # Main toolbar and workspace menu
├── lib/                # Utilities: i18n, schema cache, grid helpers, API wrappers
├── stores/             # Zustand stores (connections, tabs, settings, assistant, ...)
├── styles/             # Global CSS
└── types/              # Global TypeScript declarations

tests/
├── unit/               # Vitest unit tests
├── integration/        # Vitest + testcontainers integration tests
└── e2e/                # Playwright e2e suite

scripts/                # dev.mjs (dev orchestrator), generate-icons.mjs
```

## API Documentation

Rowport is a desktop app — there is no HTTP API. The renderer talks to the main process exclusively through a typed IPC bridge exposed as `window.rowport`:

| Namespace  | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `sql`      | Connect/disconnect/test, select, execute, cancel, listDatabases |
| `appDb`    | Query the local metadata database (saved queries, history)      |
| `mongo`    | Connect, list databases/collections, find, aggregate, fields    |
| `keychain` | Save/get/delete connection passwords in the OS keyring          |
| `settings` | Key-value app settings                                          |
| `dialog`   | Native open/save dialogs                                        |
| `fs`       | Read/write text files (workspace import/export)                 |
| `clipboard`| Write/read clipboard text                                       |
| `window`   | Minimize/maximize/close, maximized state events                 |
| `detect`   | Detect locally running database servers                         |
| `assistant`| Chat, list models, test connection (Ollama/OpenAI)              |
| `app`      | Version info, restart                                           |

Example call from renderer code:

```typescript
const rows = await window.rowport.sql.select(connectionId, 'SELECT * FROM users LIMIT 10')
```

Channels are declared once in `src/shared/rowport-api.ts` (`IPC_CHANNELS` + `RowportApi`). See [ARCHITECTURE.md](ARCHITECTURE.md) for the full bridge pattern and how to add new channels.

## Testing

```bash
# Unit tests (Zod validation, SQL utilities) with Vitest
pnpm test:unit

# Integration tests against real database engines
pnpm test:integration

# Everything except e2e
pnpm test

# End-to-end tests with Playwright (builds the app, then launches Electron)
pnpm test:e2e
```

Integration tests run SQLite locally and use [testcontainers](https://testcontainers.com/) to spin up PostgreSQL, MySQL, and MongoDB in Docker. Container-based tests skip automatically when Docker is unavailable. The e2e suite drives the built app through Playwright's Electron runner with an isolated user data directory.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed architecture overview including:

- Process boundaries (main / preload / renderer)
- IPC bridge pattern and how to add new channels
- Database layer (SQL drivers, MongoDB, OS keyring)
- AI assistant providers
- State management with Zustand stores
- UI internationalization (i18n)
- Security model (sandboxed preload, context isolation)
