import type { ZodType } from 'zod'
import { RowportValidationError } from '../../shared/errors.js'

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new RowportValidationError(result.error)
  }
  return result.data
}
