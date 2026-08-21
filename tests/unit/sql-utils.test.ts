import { describe, expect, it } from 'vitest'
import {
  columnsFromRows,
  countSelect,
  isDdlQuery,
  isDestructiveQuery,
  isSelectQuery,
  paginateSelect,
  parseJsonDocument,
  splitStatements,
  withRowLimit
} from '../../src/lib/sql-utils'

describe('isSelectQuery', () => {
  it('recognizes plain select', () => {
    expect(isSelectQuery('select * from users')).toBe(true)
    expect(isSelectQuery('  SELECT 1')).toBe(true)
  })

  it('recognizes cte, show, describe, pragma, explain', () => {
    expect(isSelectQuery('with cte as (select 1) select * from cte')).toBe(true)
    expect(isSelectQuery('show tables')).toBe(true)
    expect(isSelectQuery('describe users')).toBe(true)
    expect(isSelectQuery('desc users')).toBe(true)
    expect(isSelectQuery('explain select 1')).toBe(true)
    expect(isSelectQuery('pragma table_info(users)')).toBe(true)
    expect(isSelectQuery('values (1), (2)')).toBe(true)
    expect(isSelectQuery('table users')).toBe(true)
  })

  it('skips leading comments', () => {
    expect(isSelectQuery('-- comment\nselect 1')).toBe(true)
    expect(isSelectQuery('/* block */ select 1')).toBe(true)
  })

  it('rejects non-select statements', () => {
    expect(isSelectQuery('insert into t values (1)')).toBe(false)
    expect(isSelectQuery('update t set x = 1')).toBe(false)
    expect(isSelectQuery('delete from t')).toBe(false)
  })
})

describe('isDestructiveQuery', () => {
  it('recognizes destructive keywords', () => {
    expect(isDestructiveQuery('delete from users')).toBe(true)
    expect(isDestructiveQuery('UPDATE t SET x = 1')).toBe(true)
    expect(isDestructiveQuery('drop table t')).toBe(true)
    expect(isDestructiveQuery('truncate t')).toBe(true)
    expect(isDestructiveQuery('alter table t add column c int')).toBe(true)
  })

  it('does not match keywords inside identifiers', () => {
    expect(isDestructiveQuery('select * from updates_log')).toBe(false)
    expect(isDestructiveQuery('select updated_at from t')).toBe(false)
  })

  it('rejects safe queries', () => {
    expect(isDestructiveQuery('select 1')).toBe(false)
    expect(isDestructiveQuery('insert into t values (1)')).toBe(false)
  })
})

describe('isDdlQuery', () => {
  it('recognizes ddl keywords', () => {
    expect(isDdlQuery('create table t (id int)')).toBe(true)
    expect(isDdlQuery('DROP TABLE t')).toBe(true)
    expect(isDdlQuery('alter table t rename to u')).toBe(true)
    expect(isDdlQuery('truncate t')).toBe(true)
  })

  it('rejects dml and queries', () => {
    expect(isDdlQuery('insert into t values (1)')).toBe(false)
    expect(isDdlQuery('select * from t')).toBe(false)
    expect(isDdlQuery('update t set x = 1')).toBe(false)
  })
})

describe('splitStatements', () => {
  it('splits on semicolons', () => {
    expect(splitStatements('select 1; select 2')).toEqual(['select 1', 'select 2'])
  })

  it('does not split inside single-quoted strings', () => {
    expect(splitStatements("select 'a;b'")).toEqual(["select 'a;b'"])
  })

  it('does not split inside double-quoted identifiers', () => {
    expect(splitStatements('select "a;b"')).toEqual(['select "a;b"'])
  })

  it('does not split inside backtick identifiers', () => {
    expect(splitStatements('select `a;b`')).toEqual(['select `a;b`'])
  })

  it('does not split inside comments', () => {
    expect(splitStatements('select 1 -- note; here\n; select 2')).toEqual([
      'select 1 -- note; here',
      'select 2'
    ])
    expect(splitStatements('/* one; two */ select 1')).toEqual(['/* one; two */ select 1'])
  })

  it('handles trailing and consecutive semicolons', () => {
    expect(splitStatements('select 1;')).toEqual(['select 1'])
    expect(splitStatements(';;select 1;;')).toEqual(['select 1'])
  })

  it('returns empty array for empty input', () => {
    expect(splitStatements('')).toEqual([])
    expect(splitStatements('   ')).toEqual([])
    expect(splitStatements(';;')).toEqual([])
  })
})

describe('columnsFromRows', () => {
  it('unions keys in first-seen order', () => {
    const rows = [{ a: 1, b: 2 }, { c: 3 }, { b: 4, a: 5 }]
    expect(columnsFromRows(rows)).toEqual(['a', 'b', 'c'])
  })

  it('keeps keys with nullish values', () => {
    expect(columnsFromRows([{ a: null, b: undefined }])).toEqual(['a', 'b'])
  })

  it('returns empty array for empty rows', () => {
    expect(columnsFromRows([])).toEqual([])
  })
})

describe('withRowLimit', () => {
  it('returns the same array under the limit', () => {
    const rows = [1, 2]
    expect(withRowLimit(rows, 5)).toBe(rows)
  })

  it('slices when over the limit', () => {
    const rows = [1, 2, 3]
    expect(withRowLimit(rows, 2)).toEqual([1, 2])
  })

  it('does not mutate the original', () => {
    const rows = [1, 2, 3]
    withRowLimit(rows, 1)
    expect(rows).toEqual([1, 2, 3])
  })
})

describe('parseJsonDocument', () => {
  it('parses valid json', () => {
    expect(parseJsonDocument('{"a": 1}', 'Filter')).toEqual({ a: 1 })
  })

  it('returns null for empty input', () => {
    expect(parseJsonDocument('', 'Filter')).toBeNull()
    expect(parseJsonDocument('  ', 'Filter')).toBeNull()
  })

  it('throws with a contextual message for invalid json', () => {
    expect(() => parseJsonDocument('{nope}', 'Filter')).toThrow('Filter is not valid JSON.')
    expect(() => parseJsonDocument('{"a":}', 'Pipeline')).toThrow('Pipeline is not valid JSON.')
  })
})

describe('paginateSelect', () => {
  it('wraps the query in a subquery with limit and offset', () => {
    expect(paginateSelect('SELECT * FROM users', 100, 0)).toBe(
      'SELECT * FROM (\nSELECT * FROM users\n) AS _rowport LIMIT 100 OFFSET 0'
    )
  })

  it('keeps trailing semicolons off the wrapped query', () => {
    expect(paginateSelect('select 1;', 10, 20)).toBe(
      'SELECT * FROM (\nselect 1;\n) AS _rowport LIMIT 10 OFFSET 20'
    )
  })
})

describe('countSelect', () => {
  it('wraps the query in a count over a subquery', () => {
    expect(countSelect('SELECT * FROM users')).toBe(
      'SELECT COUNT(*) AS _count FROM (\nSELECT * FROM users\n) AS _rowport'
    )
  })

  it('counts over a query with ORDER BY intact', () => {
    expect(countSelect('SELECT * FROM users ORDER BY id')).toContain('ORDER BY id')
  })
})
