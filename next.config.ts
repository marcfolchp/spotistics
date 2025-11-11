import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ensure html2canvas is properly handled
  transpilePackages: ['html2canvas'],
};

export default nextConfig;
