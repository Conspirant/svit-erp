import './globals.css'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: {
    default: 'SVIT ERP',
    template: '%s · SVIT ERP',
  },
  description: 'A mobile-first SVIT student ERP app with attendance, timetable, marketplace, and campus connect.',
  applicationName: 'SVIT ERP',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SVIT ERP',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/svit-logo-v3.png',
    apple: '/svit-logo-v3.png',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f766e',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
