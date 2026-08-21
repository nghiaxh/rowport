# Architecture Overview

Rowport is a plain Electron application with three separate build targets and a React 19 renderer. It follows a strict process boundary between the main process (database drivers, file system, OS keyring) and the renderer (UI).

## Three Build Targets

| Target   | Source                 | Output                                  | Runtime                     |
| -------- | ---------------------- | --------------------------------------- | --------------------------- |
| Main     | `src/main/**`          | `dist/main/` (CommonJS)                 | Node.js (Electron main)     |
| Preload  | `src/preload/index.ts` | `dist/preload/index.js` (single bundle) | Sandboxed preload (Node.js) |
| Renderer | `src/**/*.tsx`         | `dist/renderer/` (ESM)                  | Chromium (Vite + React)     |

### Build Pipeline

```
pnpm build
├── typecheck:node  (tsc --noEmit -p tsconfig.node.json)
├── typecheck:web   (tsc --noEmit -p tsconfig.web.json)
├── build:main      (tsc -p tsconfig.node.json)          -> dist/main/
├── build:preload   (esbuild --bundle --platform=node)   -> dist/preload/index.js
└── build:renderer  (vite build)                         -> dist/renderer/
```

## Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron Main                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ DB Drivers  │  │  App DB     │  │  IPC Handlers           │ │
│  │ (pg, mysql, │  │ (SQLite)    │  │  - connections          │ │
│  │  better-sqlite3)             │  │  - settings             │ │
│  └─────────────┘  └─────────────┘  │  - keychain             │ │
│                                    │  - metadata             │ │
│  ┌─────────────────────────────┐  │  - clipboard            │ │
│  │ Connection Manager          │  │  - fs-dialog            │ │
│  │ (Map<id, Connection>)       │  │  - detect               │ │
│  └─────────────────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                    contextBridge / ipcRenderer / ipcMain
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Sandboxed Preload                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ window.rowport = {                                        │  │
│  │   app: { getVersion, restart },                           │  │
│  │   window: { minimize, toggleMaximize, close, ... },       │  │
│  │   clipboard: { writeText, readText },                     │  │
│  │   dialog: { open, save },                                 │  │
│  │   fs: { readTextFile, writeTextFile },                    │  │
│  │   keychain: { get, set, delete },                         │  │
│  │   connections: { connect, disconnect, test, ... },        │  │
│  │   mongo: { listDatabases, listCollections, ... },         │  │
│  │   versions, platform                                      │  │
│  │ }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Renderer                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ State (Zustand)                                           │  │
│  │  - useConnectionStore  (connections, folders, status)     │  │
│  │  - useTabStore         (tabs, activeTabId, sql, results)  │  │
│  │  - useSettingsStore    (theme, fonts, editor, grid)       │  │
│  │  - useThemeStore       (theme, systemTheme, toggle)       │  │
│  │  - useHistoryStore     (query history)                    │  │
│  │  - useSavedQueryStore  (saved queries)                    │  │
│  │  - useSchemaStore      (schema cache version)             │  │
│  │  - useErrorStore       (fatal error boundary)             │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Components                                                 │  │
│  │  - Layout: TitleBar, Sidebar, StatusBar, SettingsDialog   │  │
│  │  - Connection: ConnectionTree, ConnectionForm, FolderForm │  │
│  │  - Query: TabBar, SqlEditor, MongoEditor, ResultsGrid     │  │
│  │  - Panel: SchemaPanel, HistoryPanel, SavedQueriesPanel    │  │
│  │  - ER: ErDiagram, TableNode                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## IPC Bridge (Critical Pattern)

The renderer has **no direct IPC access**. All cross-process communication goes through a typed bridge:

### 1. Source of Truth: `src/shared/rowport-api.ts`

```typescript
export const IPC_CHANNELS = {
  app: { getVersion: 'app:getVersion', restart: 'app:restart' },
  window: { minimize: 'window:minimize', ... },
  keychain: { get: 'keychain:get', set: 'keychain:set', delete: 'keychain:delete' },
  connections: { connect: 'connections:connect', ... },
  mongo: { listDatabases: 'mongo:listDatabases', ... },
} as const

export interface RowportApi {
  app: { getVersion(): Promise<string>; restart(): Promise<void> }
  window: { minimize(): Promise<void>; ... }
  // ... all methods fully typed
}
```

### 2. Preload: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/rowport-api'

const api: RowportApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.app.getVersion),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.app.restart)
  }
  // ... implement all channels
}
contextBridge.exposeInMainWorld('rowport', api)
```

### 3. Main: `src/main/ipc/register.ts`

```typescript
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/rowport-api'

ipcMain.handle(IPC_CHANNELS.app.getVersion, () => getVersion())
ipcMain.handle(IPC_CHANNELS.connections.connect, (_, id) => connect(id))
// ... register all handlers
```

### 4. Types: `src/types/rowport.d.ts`

```typescript
import { RowportApi } from '../shared/rowport-api'
declare global {
  interface Window {
    rowport: RowportApi
  }
}
```

**Adding a new IPC channel requires updating all 4 files with matching constant names.**

## Database Layer

### SQL Connections (PostgreSQL, MySQL, SQLite)

- **Live connections**: Held in `Map<string, ConnectionInstance>` in `src/main/db/connections.ts`
- **Drivers**:
  - `pg` for PostgreSQL
  - `mysql2` for MySQL
  - `better-sqlite3` for SQLite
- **Connection object**: Contains driver-specific client/pool + metadata
- **Query execution**: `connection.query(sql)` returns `{ columns, rows, rowCount }`

### App Metadata Database

- **File**: `app.getPath('userData')/app.db` (SQLite)
- **Schema**: connections, folders, saved_queries, history, settings
- **Access**: `src/main/ipc/metadata.ts` (uses `better-sqlite3`)

### MongoDB

- **Separate manager**: `src/main/db/mongodb.ts` (uses `mongodb` driver)
- **Connection**: Single `MongoClient` per connection ID
- **Results**: Round-tripped through EJSON (preserves BSON types)
- **Operations**: Filter, projection, sort, aggregation pipeline

### Credentials (OS Keyring)

- **Library**: `@napi-rs/keyring`
- **Service**: `com.rowport.app`
- **Key**: Connection ID
- **Value**: Password string
- **Never stored** in app.db

## State Management (Zustand)

All app state lives in Zustand stores in `src/stores/`:

| Store                | Responsibility                                                                |
| -------------------- | ----------------------------------------------------------------------------- |
| `useConnectionStore` | Connections, folders, statusById, activeConnectionId, connect/disconnect/test |
| `useTabStore`        | Tabs (query/ER), activeTabId, SQL, results, mongo queries                     |
| `useSettingsStore`   | Theme, fonts, editor settings, grid density, null display                     |
| `useThemeStore`      | Theme preference (light/dark/system), system theme detection                  |
| `useHistoryStore`    | Query history entries (load/add/remove/clear)                                 |
| `useSavedQueryStore` | Saved queries (load/add/remove)                                               |
| `useSchemaStore`     | Schema cache version (for invalidation)                                       |
| `useErrorStore`      | Fatal error boundary state                                                    |

**Pattern**: Stores call IPC via `src/lib/electron-api.ts` wrappers, then update local state. Optimistic updates where appropriate.

## UI Strings (i18n)

All text is keyed: no inline strings.

```
src/lib/i18n/
├── en.ts   # Source of truth (typed keys)
├── vi.ts   # Mirrors en.ts, falls back to en
└── index.ts # useT() hook, t() lookup
```

```typescript
// en.ts
export const strings = {
  app: { name: 'Rowport' },
  conn: { titleNew: 'New Connection', ... },
  // ...
} as const
export type StringKeys = keyof typeof strings

// Component usage
const t = useT()
<button>{t('conn.titleNew')}</button>
```

## Key Utilities

### `src/lib/electron-api.ts`

Typed wrappers around `window.rowport`:

```typescript
export const connectionApi = {
  connect: (id) => window.rowport.connections.connect(id),
  disconnect: (id) => window.rowport.connections.disconnect(id),
  test: (input, existingId) => window.rowport.connections.test(input, existingId)
  // ...
}
```

### `src/lib/schema.ts`

- `getCachedSqlSchema(dbType, connectionId)`: memoized schema fetch
- `loadSqlSchema(dbType, connectionId)`: raw driver query
- `getCachedForeignKeys(dbType, connectionId)`: FK relationships
- `loadMongoSchema(connectionId)`: databases + collections

### `src/lib/grid-utils.ts`

- `formatCell(value)`: display formatting
- `buildTsv(columns, rows)`: export
- `validateCellEdit(value, type, isJson)`: inline edit validation

### `src/lib/er-layout.ts`

- `buildErGraph(tables, foreignKeys, savedLayout?)`: Dagre layout for ER diagrams

## Renderer Entry & Routing

```
index.html
  └── src/main.tsx (React 19 + Vite)
       └── App.tsx
            ├── TitleBar (window controls, menu)
            ├── Sidebar (ConnectionTree + forms)
            ├── QueryWorkspace (TabBar + SqlEditor/MongoEditor + ResultsGrid)
            ├── RightPanel (SchemaPanel | HistoryPanel | SavedQueriesPanel)
            └── StatusBar (active connection, panel toggle, theme)
```

## Security

- **Preload sandbox**: `sandbox: true`: no Node.js access in preload
- **Context isolation**: Enabled: renderer cannot access `require`, `process`, etc.
- **No `nodeIntegration`**: Renderer is pure web context
- **IPC only via contextBridge**: Typed, validated channels only
- **Passwords**: Never touch renderer: stored/retrieved via keyring in main

## Configuration Files

| File                     | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `tsconfig.json`          | Project references only                              |
| `tsconfig.node.json`     | Main + preload + shared (CommonJS, Node types)       |
| `tsconfig.web.json`      | Renderer (ESM, DOM types, `@/*` -> `./src/*`)        |
| `vite.config.ts`         | Renderer build, `@` alias, React plugin, Tailwind    |
| `esbuild` (package.json) | Preload bundle (single file, external: electron)     |
| `electron-builder.yml`   | Packaging config (win/mac/linux)                     |
| `.npmrc`                 | Electron mirror (npmmirror.com)                      |
| `.prettierrc.yaml`       | Format: single quotes, no semicolons, printWidth 100 |
| `eslint.config.mjs`      | Flat config, @electron-toolkit presets               |

## Adding a Feature (Checklist)

1. **IPC needed?**: Update `src/shared/rowport-api.ts` (channel + interface)
2. **Preload**: Implement in `src/preload/index.ts`
3. **Main**: Register handler in `src/main/ipc/register.ts` (or new file in `src/main/ipc/`)
4. **Types**: `src/types/rowport.d.ts` (usually auto via shared)
5. **Renderer API**: Wrapper in `src/lib/electron-api.ts`
6. **Store**: Add actions in relevant Zustand store
7. **UI**: Components, use `useT()` for strings
8. **Strings**: Add to `src/lib/i18n/en.ts` (and `vi.ts`)
9. **Verify**: `pnpm lint && pnpm typecheck`
