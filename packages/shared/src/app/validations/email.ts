import { z, ZodIssueCode } from 'zod'

export const requiredEmail = (fieldName = 'Email') =>
  z
    .string({
      error: (issue) => {
        if (issue.code === ZodIssueCode.invalid_type && issue.input === undefined) {
          return `${fieldName} is required`
        }
        if (issue.code === ZodIssueCode.invalid_type) {
          return `${fieldName} must be a string`
        }
        return undefined
      },
    })
    .trim()
    .min(1, { error: `${fieldName} cannot be empty` })
    .email({ message: `${fieldName} must be a valid email address` })
