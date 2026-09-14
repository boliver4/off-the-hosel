/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run separately; don't let it fail production builds in this environment.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
