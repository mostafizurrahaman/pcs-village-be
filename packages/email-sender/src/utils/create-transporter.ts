import nodemailer from 'nodemailer'
import type { EmailConfig } from '../types/email-sender'

export const createTransporter = (config: EmailConfig) => {
  return nodemailer.createTransport({
    host: config.host || 'smtp.gmail.com',
    port: config.port || 587,
    secure: config.secure ?? false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

const config: EmailConfig = {
  host: process.env.NODE_EAMIL_HOST as string,
  pass: process.env.NODE_APP_PASSWORD as string,
  port: Number(process.env.NODE_EMAIL_PORT),
  user: process.env.NODE_APP_EMAIL as string,
  secure: process.env.NODE_ENV === 'production',
}

export const transporter = createTransporter(config)
