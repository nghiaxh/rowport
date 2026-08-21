import { z } from 'zod'
import type { SqlDbType } from '../rowport-api.js'

const nullableString = z.string().nullable().optional()

export const connectionIdSchema = z.string().min(1)

export const sqlConnectSchema = z.object({
  dbType: z.enum(['postgres', 'mysql', 'sqlite'] as const satisfies readonly SqlDbType[]),
  host: nullableString,
  port: z.number().int().min(1).max(65535).nullable().optional(),
  username: nullableString,
  password: nullableString,
  database: nullableString,
  filePath: nullableString,
  sslMode: z.enum(['disable', 'require', 'verify-full']).default('disable')
})
export type SqlConnectInput = z.infer<typeof sqlConnectSchema>

export const sqlConnectArgsSchema = z.object({
  connectionId: connectionIdSchema,
  payload: sqlConnectSchema
})
export type SqlConnectArgs = z.infer<typeof sqlConnectArgsSchema>

const sqlTextSchema = z.string().trim().min(1).max(10_000_000)
const sqlParamsSchema = z.array(z.unknown()).max(1000)

export const sqlSelectArgsSchema = z.object({
  connectionId: connectionIdSchema,
  sql: sqlTextSchema,
  params: sqlParamsSchema.default([]),
  queryId: z.string().max(64).default('')
})
export type SqlSelectArgs = z.infer<typeof sqlSelectArgsSchema>

export const sqlCancelArgsSchema = z.object({
  queryId: z.string().min(1)
})
export type SqlCancelArgs = z.infer<typeof sqlCancelArgsSchema>

export const appDbSelectArgsSchema = z.object({
  sql: sqlTextSchema,
  params: sqlParamsSchema.default([])
})
export type AppDbSelectArgs = z.infer<typeof appDbSelectArgsSchema>

export const keychainSaveArgsSchema = z.object({
  connectionId: connectionIdSchema,
  password: z.string().max(4096)
})
export type KeychainSaveArgs = z.infer<typeof keychainSaveArgsSchema>

export const mongoUriSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((uri) => {
    try {
      const url = new URL(uri)
      return url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:'
    } catch {
      return false
    }
  }, 'Invalid MongoDB connection URI')
export type MongoUriInput = z.infer<typeof mongoUriSchema>

export const mongoConnectArgsSchema = z.object({
  connectionId: connectionIdSchema,
  connectionUri: mongoUriSchema
})
export type MongoConnectArgs = z.infer<typeof mongoConnectArgsSchema>

export const mongoResourceArgsSchema = z.object({
  connectionId: connectionIdSchema,
  database: z.string().min(1),
  collection: z.string().min(1)
})
export type MongoResourceArgs = z.infer<typeof mongoResourceArgsSchema>

export const mongoDatabaseArgsSchema = mongoResourceArgsSchema.pick({
  connectionId: true,
  database: true
})
export type MongoDatabaseArgs = z.infer<typeof mongoDatabaseArgsSchema>

export const mongoFindSchema = z.object({
  filter: z.unknown().optional(),
  projection: z.unknown().optional(),
  sort: z.unknown().optional(),
  skip: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(50_000).optional()
})
export type MongoFindInput = z.infer<typeof mongoFindSchema>

export const mongoPipelineSchema = z.array(z.record(z.string(), z.unknown())).max(100)
export type MongoPipelineInput = z.infer<typeof mongoPipelineSchema>

export const mongoFindArgsSchema = mongoResourceArgsSchema.extend({
  options: mongoFindSchema.default({})
})
export type MongoFindArgs = z.infer<typeof mongoFindArgsSchema>

export const mongoAggregateArgsSchema = mongoResourceArgsSchema.extend({
  pipeline: mongoPipelineSchema.default([])
})
export type MongoAggregateArgs = z.infer<typeof mongoAggregateArgsSchema>

export const fsPathSchema = z.string().min(1).max(4096)
export type FsPathInput = z.infer<typeof fsPathSchema>

export const fsReadArgsSchema = z.object({
  path: fsPathSchema
})
export type FsReadArgs = z.infer<typeof fsReadArgsSchema>

export const fsWriteArgsSchema = z.object({
  path: fsPathSchema,
  contents: z.string().max(50_000_000)
})
export type FsWriteArgs = z.infer<typeof fsWriteArgsSchema>

export const keychainSchema = z.object({
  connectionId: connectionIdSchema,
  password: z.string().max(4096)
})
export type KeychainInput = z.infer<typeof keychainSchema>
