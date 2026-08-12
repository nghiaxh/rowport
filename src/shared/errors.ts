import type { ZodIssue } from 'zod'

export const QUERY_CANCELLED_MESSAGE = 'Query cancelled'

export class RowportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RowportError'
  }
}

export class QueryCancelledError extends RowportError {
  constructor() {
    super(QUERY_CANCELLED_MESSAGE)
    this.name = 'QueryCancelledError'
  }
}

export class RowportValidationError extends RowportError {
  readonly issues: string[]

  constructor(error: { issues: readonly ZodIssue[] }) {
    const detail = error.issues.map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    super(`Invalid input: ${detail.join('; ')}`, { cause: error })
    this.name = 'RowportValidationError'
    this.issues = detail
  }
}
