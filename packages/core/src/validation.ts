import { z } from 'zod'

import { UserError } from './errors.js'

export function nonEmptyStringSchema(message: string) {
  return z.string({ error: message }).trim().min(1, { error: message })
}

export function parseWithSchema<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
): z.output<Schema> {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0]!.message)
  return result.data
}
