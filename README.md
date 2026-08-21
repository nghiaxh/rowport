# Rowport

A modern desktop client for multi-database workflow.

## Features

- **Multi-database support**: PostgreSQL, MySQL, SQLite, and MongoDB in a single workspace
- **SQL editor**: CodeMirror-based editor with syntax highlighting, formatting, query history, and saved queries
- **Results grid**: sortable, resizable, pinnable columns with inline cell editing and CSV/JSON/TSV export
- **Schema browser**: browse tables, views, and collections for any connected database
- **ER diagrams**: generated entity relationship diagrams with automatic layout
- **MongoDB editor**: filter, projection, sort, and aggregation pipeline support
- **Connection management**: folders, color tags, read only mode, SSL modes, SSH tunnels, and secure credential storage via the OS keyring
- **Workspaces**: save, load, import, and export your working session
- **Customization**: light, dark, or system themes, editor fonts, row density, and English or Vietnamese UI

## Database Support

| Database       | Connections                     | Notes                                           |
| -------------- | ------------------------------- | ----------------------------------------------- |
| **PostgreSQL** | Host/port/auth, SSL, SSH tunnel | Query runner, schema browser, ER diagrams       |
| **MySQL**      | Host/port/auth, SSL, SSH tunnel | Query runner, schema browser, ER diagrams       |
| **SQLite**     | File based                      | Query runner, schema browser, ER diagrams       |
| **MongoDB**    | Connection string (URI)         | Filter, projection, aggregation pipeline editor |

Common to all connection types: folders, color tags, read only mode, and credentials stored securely in the operating system keyring.

## Requirements

- [Node.js](https://nodejs.org/) (24+ recommended)
- [pnpm](https://pnpm.io/)

## Development

### Clone

```bash
git clone https://github.com/nghiaxh/rowport.git
```

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Lint / Typecheck

```bash
pnpm lint

pnpm typecheck

pnpm lint:fix
```

### Testing

```bash
# Unit tests (Zod validation, SQL utilities) with Vitest
pnpm test:unit

# Integration tests against real database engines
pnpm test:integration

# Everything except e2e
pnpm test

# End-to-end tests with Playwright (launches the built Electron app)
pnpm test:e2e
```

Integration tests run SQLite locally and use [testcontainers](https://testcontainers.com/) to spin up PostgreSQL, MySQL, and MongoDB in Docker. The container-based tests skip automatically when Docker is unavailable. The e2e suite builds the app first, then drives it through Playwright's Electron runner with an isolated user data directory.

### Build

```bash
# For Windows
pnpm build:win

# For macOS
pnpm build:mac

# For Linux
pnpm build:linux
```

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── db/            # Database drivers (PostgreSQL, MySQL, SQLite, MongoDB)
│   └── ipc/           # IPC handlers (settings, metadata, keychain, ...)
├── preload/           # Preload script exposing the IPC bridge
├── shared/            # Types and schemas shared across process boundaries
├── components/        # React UI components
│   ├── connection/    # Connection tree and forms
│   ├── editor/        # SQL / MongoDB editors
│   ├── er/            # ER diagram rendering
│   ├── grid/          # Results grid and cell viewer
│   ├── layout/        # Window chrome, sidebar, status bar, dialogs
│   ├── panel/         # Schema, history, saved queries panels
│   ├── query/         # Query workspace, tabs, results
│   └── common/        # Shared UI primitives
├── lib/               # Utilities, i18n, database helpers
├── stores/            # Zustand stores (connections, tabs, settings, ...)
└── types/             # Shared TypeScript types

tests/                 # Unit, integration, and e2e test suites
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed architecture overview including:

- Process boundaries (main / preload / renderer)
- IPC bridge pattern and how to add new channels
- Database layer (SQL drivers, MongoDB, OS keyring)
- State management with Zustand stores
- UI internationalization (i18n)
- Security model (sandboxed preload, context isolation)
- Configuration files
