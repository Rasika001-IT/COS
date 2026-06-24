import type { Request, Response, NextFunction } from 'express'
import { validationResult, type ValidationChain } from 'express-validator'
import { Err } from '../lib/errors.js'

// Runs express-validator chains; on failure throws a 422 with field-level errors
// (matches the frontend's ApiError `fields` shape).
export function validate(chains: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    for (const chain of chains) await chain.run(req)
    const result = validationResult(req)
    if (result.isEmpty()) {
      next()
      return
    }
    const fields: Record<string, string> = {}
    for (const e of result.array()) {
      if (e.type === 'field' && !(e.path in fields)) fields[e.path] = e.msg
    }
    next(Err.validation('Please correct the highlighted fields.', fields))
  }
}
