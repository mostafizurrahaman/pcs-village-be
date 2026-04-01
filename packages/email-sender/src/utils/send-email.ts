import type { SendEmailParams } from '../types/email-sender'
import { transporter } from './create-transporter'

export const sendEmail = async (params: SendEmailParams) => {
  return transporter.sendMail({
    from: process.env.NODE_APP_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })
}
