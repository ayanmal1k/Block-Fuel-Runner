import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BLOCK FUEL: Punch and Run | Fast-Paced Cyber Runner',
  description: 'Dodge hazards, punch cyber drones, collect Fuel Coins, and survive the neon grid in BLOCK FUEL: Punch and Run!',
  metadataBase: new URL('https://manny-obstacle-run.vercel.app'),
  keywords: ['BLOCK FUEL', 'punch and run', 'cyberpunk runner', 'platformer', 'arcade action', 'retro runner', 'fuel coins'],
  authors: [{ name: 'BLOCK FUEL' }],
  openGraph: {
    title: 'BLOCK FUEL: Punch and Run',
    description: 'Dodge hazards, punch cyber drones, collect Fuel Coins, and survive the neon grid!',
    type: 'website',
    images: [{ url: '/Untitled design - 2026-08-23T192254.088.png', width: 1200, height: 630, alt: 'BLOCK FUEL: Punch and Run' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BLOCK FUEL: Punch and Run',
    description: 'Dodge hazards, punch cyber drones, collect Fuel Coins, and survive the neon grid!',
    images: ['/Untitled design - 2026-08-23T192254.088.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/coin.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={pressStart2P.variable}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${pressStart2P.className} antialiased bg-[#060b0e] text-[#e0f2f1]`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
