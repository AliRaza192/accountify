/** @type {import('next').NextConfig} */
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};
export default nextConfig;

module.exports = nextConfig
