'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import TiltedCard from '@/components/TiltedCard';
import { BookOpen, MessageCircle, Image, Plus, Sparkles, Bell } from 'lucide-react';

// 工具数据接口
interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    iconBgColor: string;
    date: string;
    isActive: boolean;
    link?: string;
    badgeCount?: number;
}

// 移除自定义SVG组件，改为使用 lucide-react

// 工具卡片组件
function ToolCard({ tool, onToggle }: { tool: Tool; onToggle: (id: string) => void }) {
    const router = useRouter();

    const handleCardClick = () => {
        if (tool.link) {
            router.push(tool.link);
        }
    };

    return (
        <TiltedCard
            containerClassName="group h-full"
            className="h-full relative transition-all"
        >
            <div onClick={handleCardClick} className="h-full cursor-pointer">
                {/* 光晕背景层 */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500" />

                {/* 卡片内容层 */}
                <div className="relative h-full bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
                    {/* 图标和开关 */}
                    <div className="flex items-start justify-between mb-4" style={{ transform: "translateZ(20px)" }}>
                        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${tool.iconBgColor}`}>
                            <div className="text-white">
                                {tool.icon}
                            </div>
                            {tool.badgeCount !== undefined && tool.badgeCount > 0 && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-in zoom-in duration-300">
                                    <span className="text-white text-xs font-bold">{tool.badgeCount}</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(tool.id);
                            }}
                            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${tool.isActive ? 'bg-blue-500' : 'bg-slate-600'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${tool.isActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* 标题和描述 */}
                    <h3 className="text-lg font-semibold text-white mb-2" style={{ transform: "translateZ(15px)" }}>{tool.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-grow" style={{ transform: "translateZ(10px)" }}>{tool.description}</p>

                    {/* 日期和状态 */}
                    <div className="flex items-center justify-between text-sm mt-auto" style={{ transform: "translateZ(5px)" }}>
                        <span className="text-gray-500">{tool.date}</span>
                        <span className="text-gray-400 font-medium tracking-wide">
                            {tool.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                </div>
            </div>
        </TiltedCard>
    );
}

// 新增工具卡片
function AddToolCard() {
    return (
        <TiltedCard
            containerClassName="group min-h-[220px] h-full"
            className="h-full relative transition-all cursor-pointer"
        >
            {/* 光晕背景层 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500" />

            {/* 内容层 */}
            <div className="relative h-full bg-slate-900/80 border-2 border-dashed border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center group-hover:border-purple-500/50 group-hover:bg-slate-900 transition-all">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors" style={{ transform: "translateZ(20px)" }}>
                    <div className="text-slate-500 group-hover:text-purple-400 transition-colors">
                        <Plus className="w-8 h-8" />
                    </div>
                </div>
                <span className="text-slate-500 font-medium group-hover:text-purple-400 transition-colors" style={{ transform: "translateZ(10px)" }}>
                    新增工具
                </span>
            </div>
        </TiltedCard>
    );
}

export default function ProductPage() {
    // 工具列表数据
    const [tools, setTools] = useState<Tool[]>([
        {
            id: 'knowledge-base',
            name: '知识库',
            description: '智能知识管理工具，支持文档上传、智能问答和知识图谱构建，让您的团队知识触手可及。',
            icon: <BookOpen className="w-6 h-6" />,
            iconBgColor: 'bg-purple-600',
            date: 'DEC 9, 2025',
            isActive: true,
        },
        {
            id: 'wechat-official',
            name: '公众号',
            description: '一键生成微信公众号文章，支持智能排版、配图推荐和热点追踪，助力内容创作。',
            icon: <MessageCircle className="w-6 h-6" />,
            iconBgColor: 'bg-emerald-600',
            date: 'DEC 9, 2025',
            isActive: true,
            link: '/product/wechat-official'
        },
        {
            id: 'xiaohongshu',
            name: '小红书',
            description: '小红书内容创作助手，智能生成种草笔记、标题优化和标签推荐，提升曝光率。',
            icon: <Image className="w-6 h-6" />,
            iconBgColor: 'bg-rose-500',
            date: 'DEC 9, 2025',
            isActive: true,
        }
    ]);

    // 切换工具状态
    const handleToggle = (id: string) => {
        setTools(tools.map(tool =>
            tool.id === id ? { ...tool, isActive: !tool.isActive } : tool
        ));
    };

    // 监听 localStorage 中的选中文章数量
    useEffect(() => {
        // 读取数量的函数
        const updateCount = () => {
            try {
                const countStr = localStorage.getItem('wechat_selected_count');
                const count = countStr ? parseInt(countStr, 10) : 0;

                setTools(prevTools => prevTools.map(tool => {
                    if (tool.id === 'wechat-official') {
                        // 只有当数量变化时才更新，避免不必要的重渲染
                        if (tool.badgeCount !== count) {
                            return { ...tool, badgeCount: count };
                        }
                    }
                    return tool;
                }));
            } catch (e) {
                console.error('Failed to read badge count:', e);
            }
        };

        // 初始读取
        updateCount();

        // 监听 storage 事件（跨标签页同步）
        window.addEventListener('storage', updateCount);

        // 也可以设置一个定时器或者在页面获得焦点时检查，以防同页面的快速跳转
        // 由于这里是单页面应用，从 wechat 页面返回时实际上是组件重新挂载，
        // 这里的 useEffect 初始读取应该足够。
        // 为了保险起见，可以在 focus 时也检查一下
        window.addEventListener('focus', updateCount);

        return () => {
            window.removeEventListener('storage', updateCount);
            window.removeEventListener('focus', updateCount);
        };
    }, []);

    return (
        <div className="min-h-screen bg-black">
            {/* 导航栏 */}
            <NavBar />

            {/* 主内容区域 */}
            <main className="pt-32 px-8 pb-16 max-w-7xl mx-auto">
                {/* 搜索输入框 */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <div className="relative group flex items-center w-full max-w-2xl">
                        {/* 输入框光晕背景 */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500" />

                        <div className="relative w-full">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 z-10">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Ask Micro anything..."
                                className="w-full relative bg-slate-900 border border-slate-700 rounded-full py-4 pl-12 pr-24 text-white placeholder-slate-500 focus:outline-none focus:border-transparent transition-all"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-500 transition-colors z-10">
                                Enter
                            </button>
                        </div>
                    </div>
                    <button className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-full text-gray-400 hover:text-white hover:border-slate-600 transition-all">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>

                {/* Available Tools 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Available Tools</h2>
                </div>

                {/* 工具卡片网格 - 三列布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map(tool => (
                        <ToolCard key={tool.id} tool={tool} onToggle={handleToggle} />
                    ))}
                    <AddToolCard />
                </div>
            </main>
        </div>
    );
}
