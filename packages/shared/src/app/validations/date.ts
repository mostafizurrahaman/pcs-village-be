import { z, ZodIssueCode } from 'zod'

/**
 * Required date validator
 * Accepts Date objects or ISO date strings (coerces to Date).
 * @param fieldName - Name used in error messages
 */
export const requiredDate = (fieldName: string = 'Value') =>
  z.preprocess(
    (val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val)
        return isNaN(d.getTime()) ? val : d
      }
      return val
    },
    z.date({
      error: (issue) =>
        issue.code === ZodIssueCode.invalid_type && issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a valid date`,
    })
  )

/**
 * Optional date validator
 * Accepts Date object or ISO string; allows undefined.
 */
export const optionalDate = (fieldName: string = 'Value') => requiredDate(fieldName).optional()

/**
 * Optional + Nullable date validator
 */
export const optionalNullableDate = (fieldName: string = 'Value') =>
  requiredDate(fieldName).optional().nullable()
