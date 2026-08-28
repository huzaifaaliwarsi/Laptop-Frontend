/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const target = backendUrl.endsWith('/api') ? `${backendUrl}/:path*` : `${backendUrl}/api/:path*`;
    return [
      {
        source: '/api/:path*',
        destination: target.replace('/api/api/', '/api/')
      }
    ];
  }
};

module.exports = nextConfig;
