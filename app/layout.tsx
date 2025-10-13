import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Clean Racing League',
  description: 'Clean Racing League - Professional iRacing Championships',
  keywords: 'Clean Racing League, iRacing, NASCAR, Trucks, Elite, ARCA',
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
        {/* Simple favicon to prevent 404 errors */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23000'/><text x='16' y='24' text-anchor='middle' fill='%23fff' font-size='20' font-family='monospace'>C</text></svg>" />
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