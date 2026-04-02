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
  
  // REMOVED: swcMinify is now enabled by default in Next.js 16
  
  // REMOVED: output: 'standalone' - Let Vercel handle this automatically
  
  // Keep this if needed, but consider removing
  staticPageGenerationTimeout: 120,
  
  // Keep this
  skipTrailingSlashRedirect: true,
  
  // Keep this
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // COMMENT OUT or REMOVE the webpack config to use Turbopack
  // Next.js 16 uses Turbopack by default, which doesn't support webpack configs
  // If you MUST keep webpack, you need to explicitly opt out of Turbopack
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       net: false,
  //       tls: false,
  //       crypto: false,
  //     };
  //   }
  //   return config;
  // },
};

// If you need the webpack config, use this alternative approach:
// export default nextConfig;

// OR explicitly opt-out of Turbopack by adding this:
// export default {
//   ...nextConfig,
//   experimental: {
//     turbo: false, // This disables Turbopack
//   },
// };

export default nextConfig;