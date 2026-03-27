/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      // Add Supabase storage for candidate images
      {
        protocol: 'https',
        hostname: 'vumuereokytmfzfsxdwc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Optional: Add image size limits
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optional: Enable React strict mode
  reactStrictMode: true,
  // Optional: Add other configurations
  swcMinify: true,
};

export default nextConfig;