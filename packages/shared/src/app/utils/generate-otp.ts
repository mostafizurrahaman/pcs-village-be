export interface GenerateOtpOptions {
  length?: number
  numericOnly?: boolean
}

/**
 * Generates a one-time password (OTP).
 *
 * @param {Object} [options] - Configuration options for OTP generation.
 * @param {number} [options.length=6] - Length of the OTP.
 * @param {boolean} [options.numericOnly=true] - Whether the OTP should contain only digits.
 *
 * @returns {string} The generated OTP as a string.
 *
 * @example
 * generateOtp(); // "482901"
 *
 * @example
 * generateOtp({ length: 4 }); // "7391"
 *
 * @example
 * generateOtp({ length: 8, numericOnly: false }); // "A7F9K2Q8"
 */

export const generateOtp = ({
  length = 6,
  numericOnly = true,
}: GenerateOtpOptions = {}): string => {
  const numericChars = '0123456789'
  const alphaNumericChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

  const chars = numericOnly ? numericChars : alphaNumericChars

  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return otp
}
