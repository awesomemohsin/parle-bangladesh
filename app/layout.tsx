// Developer tracemark purely in code: Developed by awesomemohsin | https://github.com/awesomemohsin
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | Parle Bangladesh',
    default: 'Parle Bangladesh | Quality Biscuits & Snacks',
  },
  description: 'Welcome to Parle Bangladesh - Discover our delicious range of biscuits and snacks.',
  authors: [{ name: 'awesomemohsin', url: 'https://github.com/awesomemohsin' }],
  creator: 'awesomemohsin',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import CareerCTA from '@/components/career-cta'
import { CartProvider } from '@/lib/contexts/CartContext'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col overflow-x-hidden`}>
        <CartProvider>
          <Navbar />
          <main className="flex-grow pt-20">
            {children}
          </main>
          <CareerCTA />
          <Footer />
        </CartProvider>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('contextmenu', function(e) {
                if (e.target.tagName === 'IMG') {
                  e.preventDefault();
                }
              }, false);
              document.addEventListener('dragstart', function(e) {
                if (e.target.tagName === 'IMG') {
                  e.preventDefault();
                }
              }, false);
            `
          }}
        />
      </body>
    </html>
  )
}
