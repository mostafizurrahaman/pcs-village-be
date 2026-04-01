import { Html, Head, Body, Container, Preview, Tailwind, Font } from '@react-email/components'
import * as React from 'react'

export const EmailLayout = ({
  children,
  previewText,
}: {
  children: React.ReactNode
  previewText: string
}) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: '#5850EC',
                dark: '#111827',
                gray: {
                  50: '#F9FAFB',
                  100: '#F3F4F6',
                  400: '#9CA3AF',
                  600: '#4B5563',
                  900: '#111827',
                },
              },
            },
          },
        }}
      >
        <Body className="bg-gray-50 py-10 px-2 font-sans">
          <Container className="max-w-[600px] mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
