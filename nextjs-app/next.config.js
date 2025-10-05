/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static export only for GitHub Pages deployment
  // Keep dynamic routes for regular production builds
  ...(process.env.GITHUB_PAGES === 'true' && {
    output: 'export',
    trailingSlash: true,
  }),
  images: {
    unoptimized: true
  },
  basePath: process.env.GITHUB_PAGES === 'true' ? '/cleanracingleague' : '',
  assetPrefix: process.env.GITHUB_PAGES === 'true' ? '/cleanracingleague' : '',
}

module.exports = nextConfig