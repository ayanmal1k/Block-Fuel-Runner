import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Manny Obstacle Run',
  description: 'Dodge, jump, punch, and collect coins in this fast-paced obstacle runner!',
  metadataBase: new URL('https://manny-obstacle-run.vercel.app'),
  keywords: ['game', 'obstacle run', 'manny', 'platformer', 'action'],
  authors: [{ name: 'Manny Coin Game' }],
  openGraph: {
    title: 'Manny Obstacle Run',
    description: 'Dodge, jump, punch, and collect coins in this fast-paced obstacle runner!',
    type: 'website',
    images: [{ url: '/manny.png' }],
  },
  twitter: {
    card: 'summary',
    title: 'Manny Obstacle Run',
    description: 'Dodge, jump, punch, and collect coins in this fast-paced obstacle runner!',
    images: ['/manny.png'],
  },
  icons: {
    icon: '/manny.png',
    apple: '/manny.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
