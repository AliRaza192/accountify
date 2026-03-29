/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Docker/Vercel deployment
  output: 'standalone',

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image configuration for Supabase storage
  images: {
    domains: [
      'gdhffydonndkxufylmjkr.supabase.co',
      'supabase.co',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // TypeScript configuration - ignore errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint configuration - ignore during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
