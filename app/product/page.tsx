'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';

// 工具数据接口
interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    iconBgColor: string;
    date: string;
    isActive: boolean;
}

// 工具图标组件
const KnowledgeBaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const WeChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.5 11C9.32843 11 10 10.3284 10 9.5C10 8.67157 9.32843 8 8.5 8C7.67157 8 7 8.67157 7 9.5C7 10.3284 7.67157 11 8.5 11Z" fill="currentColor" />
        <path d="M13.5 11C14.3284 11 15 10.3284 15 9.5C15 8.67157 14.3284 8 13.5 8C12.6716 8 12 8.67157 12 9.5C12 10.3284 12.6716 11 13.5 11Z" fill="currentColor" />
        <path d="M9 15.5C9.55228 15.5 10 15.0523 10 14.5C10 13.9477 9.55228 13.5 9 13.5C8.44772 13.5 8 13.9477 8 14.5C8 15.0523 8.44772 15.5 9 15.5Z" fill="currentColor" />
        <path d="M15 15.5C15.5523 15.5 16 15.0523 16 14.5C16 13.9477 15.5523 13.5 15 13.5C14.4477 13.5 14 13.9477 14 14.5C14 15.0523 14.4477 15.5 15 15.5Z" fill="currentColor" />
        <path d="M12 3C6.5 3 2 6.58 2 11C2 13.13 3.05 15.06 4.75 16.5L4 20L7.5 18C8.93 18.5 10.43 18.75 12 18.75C17.5 18.75 22 15.17 22 10.75C22 6.58 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const XiaohongshuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PlusIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// 星形图标（搜索框）
const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.09 8.26L18.18 6.18L14.91 10.91L21 12L14.91 13.09L18.18 17.82L13.09 15.74L12 22L10.91 15.74L5.82 17.82L9.09 13.09L3 12L9.09 10.91L5.82 6.18L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(59, 130, 246, 0.3)" />
    </svg>
);

// 通知图标
const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6981 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// 工具卡片组件
function ToolCard({ tool, onToggle }: { tool: Tool; onToggle: (id: string) => void }) {
    return (
        <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-all group">
            {/* 图标和开关 */}
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.iconBgColor}`}>
                    <div className="text-white">
                        {tool.icon}
                    </div>
                </div>
                <button
                    onClick={() => onToggle(tool.id)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${tool.isActive ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                >
                    <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${tool.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* 标题和描述 */}
            <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">{tool.description}</p>

            {/* 日期和状态 */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{tool.date}</span>
                <span className="text-gray-400 font-medium tracking-wide">
                    {tool.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>
        </div>
    );
}

// 新增工具卡片
function AddToolCard() {
    return (
        <div className="relative bg-slate-800/30 border-2 border-dashed border-slate-600/50 rounded-2xl p-5 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group min-h-[220px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
                    <PlusIcon />
                </div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-blue-400 transition-colors">
                新增工具
            </span>
        </div>
    );
}

export default function ProductPage() {
    // 工具列表数据
    const [tools, setTools] = useState<Tool[]>([
        {
            id: 'knowledge-base',
            name: '知识库',
            description: '智能知识管理工具，支持文档上传、智能问答和知识图谱构建，让您的团队知识触手可及。',
            icon: <KnowledgeBaseIcon />,
            iconBgColor: 'bg-purple-600',
            date: 'DEC 9, 2025',
            isActive: true,
        },
        {
            id: 'wechat-official',
            name: '公众号',
            description: '一键生成微信公众号文章，支持智能排版、配图推荐和热点追踪，助力内容创作。',
            icon: <WeChatIcon />,
            iconBgColor: 'bg-emerald-600',
            date: 'DEC 9, 2025',
            isActive: true,
        },
        {
            id: 'xiaohongshu',
            name: '小红书',
            description: '小红书内容创作助手，智能生成种草笔记、标题优化和标签推荐，提升曝光率。',
            icon: <XiaohongshuIcon />,
            iconBgColor: 'bg-rose-500',
            date: 'DEC 9, 2025',
            isActive: true,
        },
    ]);

    // 切换工具状态
    const handleToggle = (id: string) => {
        setTools(tools.map(tool =>
            tool.id === id ? { ...tool, isActive: !tool.isActive } : tool
        ));
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* 导航栏 */}
            <NavBar />

            {/* 主内容区域 */}
            <main className="pt-32 px-8 pb-16 max-w-7xl mx-auto">
                {/* 搜索输入框 */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <div className="relative flex items-center w-full max-w-2xl">
                        <div className="absolute left-4 text-blue-400">
                            <SparkleIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Ask Nexus anything..."
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-full py-4 pl-12 pr-24 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button className="absolute right-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-500 transition-colors">
                            Enter
                        </button>
                    </div>
                    <button className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-full text-gray-400 hover:text-white hover:border-slate-600 transition-all">
                        <BellIcon />
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
