/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-auth"],
  },
  // Expose social provider availability to client-side code.
  // We expose a boolean flag, NOT the actual secret client IDs.
  env: {
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.GOOGLE_CLIENT_ID ? "1" : "",
    NEXT_PUBLIC_GITHUB_ENABLED: process.env.GITHUB_CLIENT_ID ? "1" : "",
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
