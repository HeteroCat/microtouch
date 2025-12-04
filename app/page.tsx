'use client';

import NavBar from '@/components/NavBar';
import Orb from '@/components/Orb';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* 导航栏 */}
      <NavBar />

      {/* 主内容区域 */}
      <main className="relative flex flex-col items-center justify-center min-h-screen px-4">
        {/* Orb 背景效果 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-80">
            <Orb hue={220} hoverIntensity={0.3} rotateOnHover={true} forceHoverState={true} />
          </div>
        </div>

        {/* 内容层 */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* New AI Agent 标签 */}
          <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-medium text-gray-300">New AI Agent</span>
          </div>

          {/* 主标题 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight max-w-4xl">
            When You Touch
            <br />
            The Truth,
            <br />
            It Transforms!
          </h1>

          {/* 按钮组 */}
          <div className="flex items-center gap-4 mt-12">
            <Link
              href="/home"
              className="px-8 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-100 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="#"
              className="px-8 py-3 bg-transparent text-white font-medium rounded-full border border-white/20 hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
