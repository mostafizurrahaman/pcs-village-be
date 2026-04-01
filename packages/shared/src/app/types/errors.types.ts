export interface IErrorSources {
  path: string | number
  message: string
}

export interface ISendErrorResponse {
  statusCode: number
  message: string
  errorSources: IErrorSources[]
}
