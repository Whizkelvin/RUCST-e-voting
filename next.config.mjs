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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  reactStrictMode: true,
  swcMinify: true,
  
  // Add these to handle client-side only pages
  output: 'standalone', // Better for production deployment
  
  // Configure which pages should be static
  staticPageGenerationTimeout: 120,
  
  // Skip trailing slash redirect for better performance
  skipTrailingSlashRedirect: true,
  
  // Allow skipping static generation for specific pages
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Add webpack configuration for better client-side handling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve certain modules on the client to avoid build issues
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;