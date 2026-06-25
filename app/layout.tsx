// Developer tracemark purely in code: Developed by awesomemohsin | https://github.com/awesomemohsin
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
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
import { CartProvider } from '@/lib/contexts/CartContext'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { Toaster } from 'sonner'
import Footer from '@/components/footer'
import DeferredComponents from '@/components/deferred-components'
import ScrollToTop from '@/components/scroll-to-top'
import DeferredBottomComponents from '@/components/deferred-bottom-components'
import MetaPixel from '@/components/meta-pixel'




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col overflow-x-hidden`} suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-center" richColors />
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow pt-[104px]">
              <DeferredComponents />
              {children}
            </main>
            <DeferredBottomComponents />
            <Footer />
          </CartProvider>
        </AuthProvider>
        <Analytics />
        <MetaPixel />
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('contextmenu', function(e) {
            if (e.target && e.target.tagName === 'IMG') {
              e.preventDefault();
            }
          }, false);
          document.addEventListener('dragstart', function(e) {
            if (e.target && e.target.tagName === 'IMG') {
              e.preventDefault();
            }
          }, false);
        `}} />
      </body>
    </html>
  )
}
