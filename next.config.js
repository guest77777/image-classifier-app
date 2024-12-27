/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.GITHUB_ACTIONS ? '/image-classifier-app' : '',
  assetPrefix: process.env.GITHUB_ACTIONS ? '/image-classifier-app/' : '',
  trailingSlash: true,
}

module.exports = nextConfig 