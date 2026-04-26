/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./synthetic_data/**/*"],
    },
  },
};

export default nextConfig;
