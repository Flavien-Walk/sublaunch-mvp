/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com', 'ui-avatars.com'],
  },
};

module.exports = nextConfig;
