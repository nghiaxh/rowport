import { describe, expect, it } from 'vitest'
import {
  fsPathSchema,
  fsWriteArgsSchema,
  mongoAggregateArgsSchema,
  mongoConnectArgsSchema,
  mongoFindArgsSchema,
  mongoFindSchema,
  mongoPipelineSchema,
  mongoUriSchema,
  sqlConnectArgsSchema,
  sqlConnectSchema,
  sqlSelectArgsSchema
} from '../../src/shared/validation'
import { RowportValidationError } from '../../src/shared/errors'

describe('sqlConnectSchema', () => {
  it('accepts a valid postgres payload', () => {
    const result = sqlConnectSchema.safeParse({
      dbType: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'secret',
      database: 'app',
      sslMode: 'require'
    })
    expect(result.success).toBe(true)
  })

  it('accepts a minimal sqlite payload and defaults sslMode', () => {
    const result = sqlConnectSchema.safeParse({ dbType: 'sqlite', filePath: 'C:\\db.sqlite' })
    expect(result.success).toBe(true)
    expect(result.data?.sslMode).toBe('disable')
  })

  it('rejects an unknown dbType', () => {
    const result = sqlConnectSchema.safeParse({ dbType: 'oracle' })
    expect(result.success).toBe(false)
  })

  it('rejects a port out of range', () => {
    const result = sqlConnectSchema.safeParse({ dbType: 'mysql', port: 70000, sslMode: 'disable' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer port', () => {
    const result = sqlConnectSchema.safeParse({ dbType: 'mysql', port: 5432.5, sslMode: 'disable' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported sslMode', () => {
    const result = sqlConnectSchema.safeParse({ dbType: 'mysql', sslMode: 'garbage' })
    expect(result.success).toBe(false)
  })
})

describe('sqlConnectArgsSchema', () => {
  it('accepts a connection id plus payload', () => {
    const result = sqlConnectArgsSchema.safeParse({
      connectionId: 'conn-1',
      payload: { dbType: 'sqlite', filePath: 'x.db' }
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty connection id', () => {
    const result = sqlConnectArgsSchema.safeParse({
      connectionId: '',
      payload: { dbType: 'sqlite', filePath: 'x.db' }
    })
    expect(result.success).toBe(false)
  })
})

describe('sqlSelectArgsSchema', () => {
  it('accepts a valid query', () => {
    const result = sqlSelectArgsSchema.safeParse({
      connectionId: 'conn-1',
      sql: 'SELECT * FROM users'
    })
    expect(result.success).toBe(true)
    expect(result.data?.params).toEqual([])
  })

  it('accepts params', () => {
    const result = sqlSelectArgsSchema.safeParse({
      connectionId: 'conn-1',
      sql: 'SELECT * FROM users WHERE id = ?',
      params: [1, 'x']
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty sql', () => {
    const result = sqlSelectArgsSchema.safeParse({ connectionId: 'conn-1', sql: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejects oversized params', () => {
    const result = sqlSelectArgsSchema.safeParse({
      connectionId: 'conn-1',
      sql: 'SELECT 1',
      params: new Array(1001).fill(0)
    })
    expect(result.success).toBe(false)
  })
})

describe('mongoUriSchema', () => {
  it('accepts a mongodb uri', () => {
    expect(mongoUriSchema.safeParse('mongodb://localhost:27017/app').success).toBe(true)
  })

  it('accepts a mongodb+srv uri', () => {
    expect(mongoUriSchema.safeParse('mongodb+srv://cluster.example.com/app').success).toBe(true)
  })

  it('rejects an http url', () => {
    expect(mongoUriSchema.safeParse('http://localhost:27017/app').success).toBe(false)
  })

  it('rejects a non-url string', () => {
    expect(mongoUriSchema.safeParse('not-a-uri').success).toBe(false)
  })
})

describe('mongoConnectArgsSchema', () => {
  it('rejects an invalid uri in args', () => {
    const result = mongoConnectArgsSchema.safeParse({
      connectionId: 'conn-1',
      connectionUri: 'http://nope'
    })
    expect(result.success).toBe(false)
  })
})

describe('mongoFindSchema', () => {
  it('accepts empty options', () => {
    expect(mongoFindSchema.safeParse({}).success).toBe(true)
  })

  it('accepts skip and limit', () => {
    const result = mongoFindSchema.safeParse({ skip: 10, limit: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects negative skip', () => {
    expect(mongoFindSchema.safeParse({ skip: -1 }).success).toBe(false)
  })

  it('rejects a limit above 50000', () => {
    expect(mongoFindSchema.safeParse({ limit: 50001 }).success).toBe(false)
  })

  it('rejects a fractional limit', () => {
    expect(mongoFindSchema.safeParse({ limit: 1.5 }).success).toBe(false)
  })
})

describe('mongoFindArgsSchema', () => {
  it('accepts resource with no options', () => {
    const result = mongoFindArgsSchema.safeParse({
      connectionId: 'conn-1',
      database: 'app',
      collection: 'users'
    })
    expect(result.success).toBe(true)
    expect(result.data?.options).toEqual({})
  })

  it('rejects missing collection', () => {
    const result = mongoFindArgsSchema.safeParse({
      connectionId: 'conn-1',
      database: 'app'
    })
    expect(result.success).toBe(false)
  })
})

describe('mongoPipelineSchema', () => {
  it('accepts an empty pipeline', () => {
    expect(mongoPipelineSchema.safeParse([]).success).toBe(true)
  })

  it('accepts stages up to the limit', () => {
    const stages = new Array(100).fill({ $match: {} })
    expect(mongoPipelineSchema.safeParse(stages).success).toBe(true)
  })

  it('rejects a pipeline over 100 stages', () => {
    const stages = new Array(101).fill({ $match: {} })
    expect(mongoPipelineSchema.safeParse(stages).success).toBe(false)
  })

  it('rejects a non-array pipeline', () => {
    expect(mongoPipelineSchema.safeParse({ $match: {} }).success).toBe(false)
  })
})

describe('mongoAggregateArgsSchema', () => {
  it('accepts resource and pipeline', () => {
    const result = mongoAggregateArgsSchema.safeParse({
      connectionId: 'conn-1',
      database: 'app',
      collection: 'users',
      pipeline: [{ $limit: 10 }]
    })
    expect(result.success).toBe(true)
  })
})

describe('fsPathSchema', () => {
  it('accepts a normal path', () => {
    expect(fsPathSchema.safeParse('C:\\Users\\app\\notes.md').success).toBe(true)
  })

  it('rejects an empty path', () => {
    expect(fsPathSchema.safeParse('').success).toBe(false)
  })

  it('rejects an oversized path', () => {
    expect(fsPathSchema.safeParse('x'.repeat(4097)).success).toBe(false)
  })
})

describe('fsWriteArgsSchema', () => {
  it('rejects oversized contents', () => {
    const result = fsWriteArgsSchema.safeParse({
      path: 'C:\\notes.md',
      contents: 'x'.repeat(50_000_001)
    })
    expect(result.success).toBe(false)
  })
})

describe('RowportValidationError', () => {
  it('formats issues with paths', () => {
    const parsed = sqlConnectSchema.safeParse({ dbType: 'nope' })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const err = new RowportValidationError(parsed.error)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('RowportValidationError')
    expect(err.issues.length).toBeGreaterThan(0)
    expect(err.issues.some((issue) => issue.includes('dbType'))).toBe(true)
  })
})
