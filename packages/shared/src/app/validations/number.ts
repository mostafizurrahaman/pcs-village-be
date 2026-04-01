import { z, ZodIssueCode } from 'zod'

/**
 * Required number (coerces string to number)
 */
export const requiredNumber = (fieldName = 'Value') =>
  z.coerce
    .number({
      error: (issue) => {
        if (issue.code === ZodIssueCode.invalid_type && issue.input === undefined) {
          return `${fieldName} is required`
        }
        if (issue.code === ZodIssueCode.invalid_type) {
          return `${fieldName} must be a number`
        }
        return undefined
      },
    })
    .refine((v) => !Number.isNaN(v), {
      message: `${fieldName} must be a valid number`,
    })

/**
 * Positive number (> 0)
 */
export const positiveNumber = (fieldName = 'Value') =>
  requiredNumber(fieldName).positive({
    message: `${fieldName} must be a positive number`,
  })

/**
 * Integer number (no decimals)
 */
export const integerNumber = (fieldName = 'Value') =>
  requiredNumber(fieldName).int({
    message: `${fieldName} must be an integer`,
  })

/**
 * Positive integer (>0 and no decimals)
 */
export const positiveInt = (fieldName = 'Value') =>
  integerNumber(fieldName).positive({
    message: `${fieldName} must be a positive integer`,
  })

/**
 * Inclusive range number
 */
export const rangedNumber = (fieldName = 'Value', min: number, max: number) =>
  requiredNumber(fieldName)
    .min(min, { message: `${fieldName} must be at least ${min}` })
    .max(max, { message: `${fieldName} must be at most ${max}` })

/**
 * Optional number
 */
export const optionalNumber = (fieldName = 'Value') =>
  z.coerce
    .number({
      error: () => `${fieldName} must be a number`,
    })
    .optional()

/**
 * Optional positive number
 */
export const optionalPositive = (fieldName = 'Value') =>
  optionalNumber(fieldName).refine((v) => v === undefined || v > 0, {
    message: `${fieldName} must be a positive number if provided`,
  })
