import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | Parle Bangladesh',
    default: 'Parle Bangladesh | Quality Biscuits & Snacks',
  },
  description: 'Welcome to Parle Bangladesh - Discover our delicious range of biscuits and snacks.',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
