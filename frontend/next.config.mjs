/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-auth"],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.MEREWA_BACKEND_URL || "http://127.0.0.1:8000"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
