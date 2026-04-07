/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/images/wafers-chips/parle-wafer/cream-n-onion.webp',
        destination: '/images/wafers/Parle-Wafer/parle-wafer/Parle_wafers_Cream.webp',
      },
      {
        source: '/images/wafers-chips/parle-wafer/tangy-tomato.webp',
        destination: '/images/wafers/Parle-Wafer/parle-wafer/Parle_wafers_Tangy.webp',
      },
      {
        source: '/images/wafers-chips/parle-wafer/classic.webp',
        destination: '/images/wafers/Parle-Wafer/parle-wafer/Parle_wafers_Classic.webp',
      },
      {
        source: '/images/wafers-chips/parle-wafer/piri-piri.webp',
        destination: '/images/wafers/Parle-Wafer/parle-wafer/Parle_wafers_Piri_Piri_FOP.webp',
      },
      {
        source: '/images/wafers-chips/:path*',
        destination: '/images/wafers/:path*',
      }
    ]
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
