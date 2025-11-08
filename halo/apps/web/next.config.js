/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@halo/ui", "@halo/types"],
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

module.exports = nextConfig;

