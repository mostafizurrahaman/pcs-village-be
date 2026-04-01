export type TMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type TResponse<T> = {
  statusCode: number
  success: boolean
  message: string
  meta?: TMeta
  data: T
}
