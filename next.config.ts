import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 针对 Vercel 部署优化的配置 */
  typescript: {
    // 在生产环境构建时忽略类型错误（可选，建议本地修复）
    ignoreBuildErrors: true,
  },
  images: {
    // 允许的外部图片域名（如果需要直接显示微信图片等）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.qpic.cn',
      },
      {
        protocol: 'https',
        hostname: '**.qlogo.cn',
      },
    ],
  },
};

export default nextConfig;
