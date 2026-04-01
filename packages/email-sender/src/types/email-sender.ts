export interface EmailConfig {
  host: string
  port: number
  secure?: boolean
  user: string
  pass: string
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}
