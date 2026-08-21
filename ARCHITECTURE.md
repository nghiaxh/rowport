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
│  │ (pg, mysql, │  │ (SQLite)    │  │  - sql / appDb          │ │
│  │  better-    │  │             │  │  - mongo                │ │
│  │  sqlite3)   │  └─────────────┘  │  - keychain             │ │
│  └─────────────┘                   │  - settings / metadata  │ │
│  ┌─────────────────────────────┐  │  - clipboard            │ │
│  │ Connection Manager          │  │  - fs-dialog            │ │
│  │ (Map<id, Connection>)       │  │  - detect               │ │
│  └─────────────────────────────┘  │  - assistant            │ │
│  ┌─────────────────────────────┐  │                         │ │
│  │ Assistant Providers         │  │                         │ │
│  │ (Ollama, OpenAI)            │  │                         │ │
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
│  │   keychain: { savePassword, getPassword, deletePassword },│  │
│  │   sql: { connect, disconnect, select, execute, ... },     │  │
│  │   appDb: { select, execute },                             │  │
│  │   mongo: { listDatabases, find, aggregate, ... },         │  │
│  │   assistant: { chat, listModels, testConnection },        │  │
│  │   detect, settings, versions, platform                    │  │
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
│  │  - useAssistantStore   (assistant chat state)             │  │
│  │  - useSchemaStore      (schema cache version)             │  │
│  │  - useErrorStore       (fatal error boundary)             │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Components                                                 │  │
│  │  - Layout: TitleBar, Sidebar, StatusBar, SettingsDialog   │  │
│  │  - Connection: ConnectionTree, ConnectionForm, FolderForm │  │
│  │  - Query: TabBar, SqlEditor, NoSQLEditor, ResultsGrid     │  │
│  │  - Panel: SchemaPanel, HistoryPanel, AssistantPanel       │  │
│  │  - Toolbar: Toolbar (workspace menu)                      │  │
│  │  - ER: ErDiagram, TableNode                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## IPC Bridge (Critical Pattern)

The renderer has **no direct IPC access**. All cross-process communication goes through a typed bridge:

### 1. Source of Truth: `src/shared/rowport-api.ts`

Channel names are a **flat map**; the API surface is grouped into namespaces:

```typescript
export const IPC_CHANNELS = {
  sqlConnect: 'sql:connect',
  sqlDisconnect: 'sql:disconnect',
  sqlSelect: 'sql:select',
  sqlExecute: 'sql:execute',
  sqlCancel: 'sql:cancel',
  sqlTest: 'sql:test',
  sqlListDatabases: 'sql:listDatabases',
  appDbSelect: 'appDb:select',
  appDbExecute: 'appDb:execute',
  keychainSave: 'keychain:save',
  keychainGet: 'keychain:get',
  keychainDelete: 'keychain:delete',
  mongoConnect: 'mongo:connect',
  mongoDisconnect: 'mongo:disconnect',
  mongoListDatabases: 'mongo:listDatabases',
  mongoListCollections: 'mongo:listCollections',
  mongoFind: 'mongo:find',
  mongoAggregate: 'mongo:aggregate',
  mongoSampleFields: 'mongo:sampleFields',
  detectLocalServers: 'detect:localServers',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsDelete: 'settings:delete',
  dialogOpen: 'dialog:open',
  dialogSave: 'dialog:save',
  fsReadTextFile: 'fs:readTextFile',
  fsWriteTextFile: 'fs:writeTextFile',
  clipboardWrite: 'clipboard:write',
  clipboardRead: 'clipboard:read',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:isMaximized',
  windowMaximizedChange: 'window:maximized-change',
  appGetVersion: 'app:getVersion',
  appRestart: 'app:restart',
  assistantChat: 'assistant:chat',
  assistantListModels: 'assistant:listModels',
  assistantTestConnection: 'assistant:testConnection'
} as const

export interface RowportApi {
  platform: string
  versions: RuntimeVersions
  sql: { connect(...): Promise<void>; select(...): Promise<unknown[]>; ... }
  appDb: { select(...): Promise<unknown[]>; execute(...): Promise<SqlExecuteResult> }
  keychain: { savePassword(...): Promise<void>; getPassword(...): Promise<string | null>; ... }
  mongo: { connect(...): Promise<void>; find(...): Promise<unknown[]>; aggregate(...): Promise<unknown[]>; ... }
  detect: { detectLocalServers(): Promise<DetectedServer[]> }
  settings: { get(key): Promise<string | null>; set(key, value): Promise<void>; delete(key): Promise<void> }
  dialog: { open(options?): Promise<string | null>; save(options?): Promise<string | null> }
  fs: { readTextFile(path): Promise<string>; writeTextFile(path, contents): Promise<void> }
  clipboard: { writeText(text): Promise<void>; readText(): Promise<string> }
  window: { minimize(): Promise<void>; toggleMaximize(): Promise<void>; close(): Promise<void>; ... }
  app: { getVersion(): Promise<string>; restart(): Promise<void> }
  assistant: { chat(provider, model, messages, options?): Promise<{ content: string }>; listModels(...); testConnection(...) }
}
```

### 2. Preload: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/rowport-api'

const api: RowportApi = {
  sql: {
    connect: (connectionId, payload) => ipcRenderer.invoke(IPC_CHANNELS.sqlConnect, connectionId, payload),
    select: (connectionId, sql, params, queryId) => ipcRenderer.invoke(IPC_CHANNELS.sqlSelect, connectionId, sql, params, queryId)
    // ...
  },
  assistant: {
    chat: (provider, model, messages, options) => ipcRenderer.invoke(IPC_CHANNELS.assistantChat, provider, model, messages, options)
    // ...
  }
  // ... implement all channels
}
contextBridge.exposeInMainWorld('rowport', api)
```

### 3. Main: `src/main/ipc/register.ts`

Handlers live in focused modules under `src/main/ipc/` (`app.ts`, `clipboard.ts`, `detect.ts`, `fs-dialog.ts`, `keychain.ts`, `metadata.ts`, `settings.ts`, `validate.ts`, `assistant.ts`), all wired up in `register.ts`:

```typescript
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/rowport-api'

ipcMain.handle(IPC_CHANNELS.appGetVersion, () => getVersion())
ipcMain.handle(IPC_CHANNELS.sqlConnect, (_, id, payload) => connect(id, payload))
ipcMain.handle(IPC_CHANNELS.assistantChat, (_, provider, model, messages, options) => chat(provider, model, messages, options))
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
| `useSettingsStore`   | Theme, fonts, editor settings, grid density, null display, language           |
| `useThemeStore`      | Theme preference (light/dark/system), system theme detection                  |
| `useHistoryStore`    | Query history entries (load/add/remove/clear)                                 |
| `useAssistantStore`  | AI assistant chat state (provider, model, messages)                           |
| `useSchemaStore`     | Schema cache version (for invalidation)                                       |
| `useErrorStore`      | Fatal error boundary state                                                    |

**Pattern**: Stores call IPC via `src/lib/electron-api.ts` wrappers, then update local state. Optimistic updates where appropriate.

**Saved queries** have no dedicated store: they are read/written through functions in `src/lib/metadata.ts`, which query the app metadata database directly via the `appDb` IPC namespace. Query history follows the same pattern for persistence, with `useHistoryStore` holding the in-memory copy.

## UI Strings (i18n)

All text is keyed: no inline strings. Keys are a **flat map** of dotted keys.

```
src/lib/i18n/
├── en.ts   # Source of truth (export const en + TranslationKey type)
└── vi.ts   # Mirrors en.ts, falls back to en

src/lib/i18n.ts  # useT() hook, t() lookup, locale detection
```

```typescript
// en.ts
export const en = {
  'common.cancel': 'Cancel',
  'menu.openWorkspace': 'Open Workspace…',
  // ...
} as const
export type TranslationKey = keyof typeof en

// Component usage
const t = useT()
<button>{t('common.cancel')}</button>
```

## AI Assistant

The assistant lets users ask for query help using a local Ollama server or the OpenAI API.

- **Providers**: `OllamaProvider` and `OpenAiProvider` in `src/main/assistant/providers.ts` implement a common `AssistantProvider` interface (`chat`, `listModels`, `testConnection`)
- **IPC**: `assistantChat`, `assistantListModels`, `assistantTestConnection` handled in `src/main/ipc/assistant.ts`
- **Renderer state**: `useAssistantStore`; UI in `src/components/panel/AssistantPanel.tsx`
- **Credentials**: The Ollama URL and OpenAI API key are supplied per-call from renderer settings as IPC arguments. They are never persisted by the main process and never touch app.db or the keyring

## Key Utilities

### `src/lib/electron-api.ts`

Typed wrappers around `window.rowport`:

```typescript
export const mongoApi = {
  connect: (id, uri) => window.rowport.mongo.connect(id, uri),
  find: (id, db, coll, options) => window.rowport.mongo.find(id, db, coll, options)
  // ...
}

export const keychainApi = {
  savePassword: (id, password) => window.rowport.keychain.savePassword(id, password),
  getPassword: (id) => window.rowport.keychain.getPassword(id)
  // ...
}

// also: detectionApi (local server detection), workspaceApi (.rpw import/export)
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
            ├── TitleBar (window controls, menu, Toolbar)
            ├── Sidebar (ConnectionTree + forms)
            ├── QueryWorkspace (TabBar + SqlEditor/NoSQLEditor + ResultsGrid)
            ├── RightPanel (SchemaPanel | HistoryPanel | AssistantPanel)
            └── StatusBar (active connection, panel toggle, theme)

Dialogs: SettingsDialog, AboutRowportDialog, ConnectionForm, FolderForm, Toaster
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
| `biome.json`             | Linter + formatter (single quotes, no semicolons, printWidth 100) |
| `vitest.config.ts`       | Unit + integration test config                       |
| `playwright.config.ts`   | E2E config (Electron runner, isolated user data dir) |

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
