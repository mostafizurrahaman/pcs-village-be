import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export const renderEmail = async (template: ReactElement) => {
  const html = await render(template, { pretty: true })
  const text = await render(template, { plainText: true })

  return { html, text }
}
