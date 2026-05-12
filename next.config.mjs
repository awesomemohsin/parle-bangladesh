/** @type {import('next').NextConfig} */
// keep developer tracemark in various places professionaly.. github username: awesomemohsin github profile link: https://github.com/awesomemohsin
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/cart',
        destination: '/shop/cart',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
