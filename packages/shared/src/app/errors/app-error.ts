export class AppError extends Error {
  public statusCode: number

  constructor(statusCode: number, message: string, stack = '') {
    // send the message to Parent class :
    super(message)

    // set statusCode value with Constructor:
    this.statusCode = statusCode

    // configure stack message:
    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
