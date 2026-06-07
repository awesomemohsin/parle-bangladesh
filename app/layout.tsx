// Developer tracemark purely in code: Developed by awesomemohsin | https://github.com/awesomemohsin
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ["latin"] });

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
import Footer from '@/components/footer'
import { CartProvider } from '@/lib/contexts/CartContext'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { Toaster } from 'sonner'
import dynamic from 'next/dynamic'

const PromoModal = dynamic(() => import('@/components/promo-modal'))
const CareerCTA = dynamic(() => import('@/components/career-cta'))

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
            <PromoModal />
            <Navbar />
            <main className="flex-grow pt-[104px]">
              {children}
            </main>
            <CareerCTA />
            <Footer />
          </CartProvider>
        </AuthProvider>
        <Analytics />
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            {/* Meta Pixel Code */}
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
            {/* End Meta Pixel Code */}
          </>
        )}
        <Script id="disable-img-interaction" strategy="lazyOnload">
          {`
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
          `}
        </Script>
      </body>
    </html>
  )
}
