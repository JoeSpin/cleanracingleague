import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Clean Racing League',
  description: 'Clean Racing League - Professional iRacing Championships',
  keywords: 'Clean Racing League, iRacing, NASCAR, Trucks, Elite, ARCA',
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    // Optimize resource hints
    'resource-hints': 'prefetch'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Optimize CSS loading to prevent preload warnings */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}