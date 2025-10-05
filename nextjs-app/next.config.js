/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment configuration
  images: {
    domains: ['www.simracerhub.com'],
    unoptimized: false
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true
  },
  
  // Optimize for Vercel
  swcMinify: true,
  
  // Static export only for GitHub Pages
  ...(process.env.GITHUB_PAGES === 'true' && {
    output: 'export',
    trailingSlash: true,
    basePath: '/cleanracingleague',
    assetPrefix: '/cleanracingleague',
    images: {
      unoptimized: true
    }
  })
}

module.exports = nextConfig