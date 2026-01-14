'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import TiltedCard from '@/components/TiltedCard';
import Antigravity from '@/components/Antigravity';
import { BookOpen, MessageCircle, Image, Plus, Sparkles, Bell, Database, Settings, Link, Loader2, Info, Trash2, Send, X, ChevronDown, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

// 智能体搜索结果接口
interface AgentResult {
    success: boolean;
    result?: {
        items?: any[];
        summary: string;
        metadata?: Record<string, any>;
    };
    iterations?: number;
    error?: string;
    executionSteps?: ExecutionStep[]; // 执行流程
}

// 智能体搜索状态
interface SearchState {
    query: string;
    isSearching: boolean;
    result: AgentResult | null;
    isExpanded: boolean;
    reportType: 'daily-brief' | 'formal' | 'deep-research'; // daily-brief: 简报, formal: 正式, deep-research: 深度
    hasNewResult: boolean; // 是否有新结果
}

// 执行流程步骤接口
interface ExecutionStep {
    id: string;
    type: 'plan' | 'react' | 'review'; // plan: 规划, react: 执行, review: 审核
    phase: string; // 阶段名称
    iteration: number; // 迭代次数
    timestamp: string; // 时间戳
    status: 'running' | 'completed' | 'failed'; // 状态
    content: {
        action?: string; // 执行的动作（如"分析用户意图"）
        decision?: string; // 决策（如"选择使用工具 X"）
        toolCall?: { // 工具调用信息
            toolName: string;
            args: Record<string, any>;
            result?: any;
            error?: string;
        };
        reasoning?: string; // 推理过程
        feedback?: string; // 反馈意见（review agent）
        score?: number; // 评分
    };
}

// 移除自定义SVG组件，改为使用 lucide-react

// 搜索结果弹窗组件
function SearchResultModal({ state, onClose, isOpen }: { state: SearchState; onClose: () => void; isOpen: boolean }) {
    const resultRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'result' | 'execution'>('result'); // 标签页切换

    useEffect(() => {
        if (resultRef.current && isOpen) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [state.result, isOpen]);

    if (!isOpen) return null;

    // 获取执行流程（如果没有则使用模拟数据）
    const executionSteps = state.result?.executionSteps || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-24">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative w-full max-w-4xl bg-[#0a0c10] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 max-h-[85vh] flex flex-col">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                            <Search className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">智能体搜索结果</h3>
                            <p className="text-xs text-slate-500">
                                {state.reportType === 'deep-research' ? '深度研究报告' :
                                    state.reportType === 'formal' ? '正式报告' :
                                        '简要日报'} · {state.result?.iterations || 1} 次迭代
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 标签页切换 */}
                <div className="flex items-center gap-1 px-6 py-2 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('result')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'result'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        📄 报告
                    </button>
                    <button
                        onClick={() => setActiveTab('execution')}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'execution'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        ⚙️ 执行流程
                        {executionSteps.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                                {executionSteps.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'result' ? (
                        // 报告内容
                        state.isSearching ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                                    </div>
                                </div>
                                <p className="mt-4 text-slate-400 text-sm">智能体正在分析中...</p>
                                <p className="mt-2 text-slate-600 text-xs">Plan → ReAct → Review</p>
                            </div>
                        ) : state.result ? (
                            <div className="space-y-4">
                                {state.result.success && state.result.result ? (
                                    <>
                                        {/* 摘要 */}
                                        <div className="bg-slate-800/50 rounded-2xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Sparkles className="w-4 h-4 text-purple-400" />
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">分析摘要</h4>
                                            </div>
                                            <div className="text-slate-200 text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-table:border prose-table:border-slate-700 prose-th:bg-slate-800/50 prose-th:border-b prose-th:border-slate-700 prose-td:border-b prose-td:border-slate-800 prose-td:py-2 prose-td:px-3">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {(() => {
                                                        const summary = state.result.result.summary;
                                                        try {
                                                            // 尝试解析 JSON 字符串，提取 answer 字段
                                                            const parsed = JSON.parse(summary);
                                                            return parsed.answer || summary;
                                                        } catch {
                                                            // 如果不是 JSON，直接使用原字符串
                                                            return summary;
                                                        }
                                                    })()}
                                                </ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* 元数据 */}
                                        {state.result.result.metadata && (
                                            <div className="bg-slate-800/30 rounded-xl p-4">
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {Object.entries(state.result.result.metadata).map(([key, value]) => (
                                                        <span key={key} className="px-2 py-1 bg-slate-800 rounded-md text-slate-500">
                                                            <span className="text-slate-600">{key}:</span> {String(value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
                                            <X className="w-6 h-6 text-red-400" />
                                        </div>
                                        <p className="text-red-400 font-medium">搜索失败</p>
                                        <p className="text-slate-500 text-sm mt-1">{state.result.error || '未知错误'}</p>
                                    </div>
                                )}
                            </div>
                        ) : null
                    ) : activeTab === 'execution' ? (
                        // 执行流程内容
                        executionSteps.length > 0 ? (
                            <div className="space-y-3">
                                {executionSteps.map((step, idx) => (
                                    <div
                                        key={step.id}
                                        className={`relative pl-8 pb-4 border-l-2 ${step.type === 'plan'
                                            ? 'border-blue-500'
                                            : step.type === 'react'
                                                ? 'border-purple-500'
                                                : 'border-green-500'
                                            }`}
                                    >
                                        {/* 步骤图标 */}
                                        <div
                                            className={`absolute left-0 top-0 w-6 h-6 -translate-x-[13px] rounded-full flex items-center justify-center ${step.type === 'plan'
                                                ? 'bg-blue-500'
                                                : step.type === 'react'
                                                    ? 'bg-purple-500'
                                                    : 'bg-green-500'
                                                } ${step.status === 'running' ? 'animate-pulse' : ''}`}
                                        >
                                            {step.type === 'plan' ? (
                                                <span className="text-white text-xs">📋</span>
                                            ) : step.type === 'react' ? (
                                                <span className="text-white text-xs">⚙️</span>
                                            ) : (
                                                <span className="text-white text-xs">✓</span>
                                            )}
                                        </div>

                                        {/* 步骤内容 */}
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${step.type === 'plan'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : step.type === 'react'
                                                            ? 'bg-purple-500/20 text-purple-400'
                                                            : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {step.type === 'plan' ? 'Plan Agent' : step.type === 'react' ? 'ReAct Agent' : 'Review Agent'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{step.phase}</span>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded ${step.status === 'completed'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : step.status === 'failed'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {step.status === 'completed' ? '完成' : step.status === 'failed' ? '失败' : '进行中'}
                                                </span>
                                            </div>

                                            {/* 行动/决策 */}
                                            {step.content.action && (
                                                <p className="text-sm text-slate-300 mb-2">
                                                    <span className="text-slate-500">行动：</span>{step.content.action}
                                                </p>
                                            )}
                                            {step.content.decision && (
                                                <p className="text-sm text-slate-300 mb-2">
                                                    <span className="text-slate-500">决策：</span>{step.content.decision}
                                                </p>
                                            )}

                                            {/* 工具调用 */}
                                            {step.content.toolCall && (
                                                <div className="bg-slate-900/50 rounded-lg p-3 mt-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono text-purple-400">{step.content.toolCall.toolName}</span>
                                                        <span className="text-xs text-slate-500">→</span>
                                                        {step.content.toolCall.error ? (
                                                            <span className="text-xs text-red-400">{step.content.toolCall.error}</span>
                                                        ) : (
                                                            <span className="text-xs text-green-400">成功</span>
                                                        )}
                                                    </div>
                                                    {step.content.toolCall.args && Object.keys(step.content.toolCall.args).length > 0 && (
                                                        <pre className="text-xs text-slate-500 overflow-x-auto">
                                                            {JSON.stringify(step.content.toolCall.args, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}

                                            {/* 推理过程 */}
                                            {step.content.reasoning && (
                                                <p className="text-xs text-slate-500 mt-2 italic">
                                                    "{step.content.reasoning.slice(0, 150)}{step.content.reasoning.length > 150 ? '...' : ''}"
                                                </p>
                                            )}

                                            {/* 反馈 */}
                                            {step.content.feedback && (
                                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-2">
                                                    <p className="text-xs text-green-400 font-medium mb-1">审核反馈</p>
                                                    <p className="text-xs text-slate-400">{step.content.feedback.slice(0, 200)}{step.content.feedback.length > 200 ? '...' : ''}</p>
                                                    {step.content.score !== undefined && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${step.content.score >= 80
                                                                        ? 'bg-green-500'
                                                                        : step.content.score >= 60
                                                                            ? 'bg-yellow-500'
                                                                            : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${step.content.score}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-slate-400">{step.content.score}/100</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 时间戳 */}
                                            <p className="text-[10px] text-slate-600 mt-2">{step.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Settings className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-500 text-sm">暂无执行流程数据</p>
                                <p className="text-slate-600 text-xs mt-1">后端 API 需要返回执行步骤信息</p>
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// 工具卡片组件
function ToolCard({ tool, onToggle, onDelete }: { tool: Tool; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
    const router = useRouter();

    const handleCardClick = () => {
        if (tool.isActive && tool.link) {
            router.push(tool.link);
        }
    };

    return (
        <TiltedCard
            containerClassName={`group h-full transition-all duration-500 ${!tool.isActive ? 'opacity-60' : ''}`}
            className="h-full relative transition-all"
        >
            <div
                onClick={handleCardClick}
                className={`h-full ${tool.isActive && tool.link ? 'cursor-pointer' : 'cursor-default'}`}
            >
                {/* 光晕背景层 - 仅在激活时显示 */}
                {tool.isActive && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500" />
                )}

                {/* 卡片内容层 */}
                <div className={`relative h-full bg-slate-900 border rounded-2xl p-5 flex flex-col transition-colors duration-500 ${tool.isActive ? 'border-slate-800' : 'border-slate-800/50 bg-slate-900/50'
                    }`}>
                    {/* 图标和删除按钮 */}
                    <div className="flex items-start justify-between mb-4" style={{ transform: "translateZ(20px)" }}>
                        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${tool.isActive ? tool.iconBgColor : 'bg-slate-700'
                            }`}>
                            <div className="text-white">
                                {tool.icon}
                            </div>
                            {tool.isActive && tool.badgeCount !== undefined && tool.badgeCount > 0 && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-in zoom-in duration-300">
                                    <span className="text-white text-xs font-bold">{tool.badgeCount}</span>
                                </div>
                            )}
                        </div>
                        {/* 删除按钮 */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(tool.id);
                            }}
                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="删除工具"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 标题和描述 */}
                    <h3 className={`text-lg font-semibold mb-2 transition-colors duration-500 ${tool.isActive ? 'text-white' : 'text-slate-500'
                        }`} style={{ transform: "translateZ(15px)" }}>{tool.name}</h3>
                    <p className={`text-sm leading-relaxed mb-6 flex-grow transition-colors duration-500 ${tool.isActive ? 'text-gray-400' : 'text-slate-600'
                        }`} style={{ transform: "translateZ(10px)" }}>{tool.description}</p>

                    {/* 日期和状态（可点击切换） */}
                    <div className="flex items-center justify-between text-sm mt-auto" style={{ transform: "translateZ(5px)" }}>
                        <span className="text-gray-500">{tool.date}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(tool.id);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${tool.isActive
                                ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${tool.isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
                            <span className={`font-bold tracking-widest text-[10px] transition-colors duration-500 ${tool.isActive ? 'text-blue-400' : 'text-slate-500'
                                }`}>
                                {tool.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </TiltedCard>
    );
}


// 新增工具卡片
function AddToolCard({ onClick }: { onClick: () => void }) {
    return (
        <TiltedCard
            containerClassName="group min-h-[220px] h-full"
            className="h-full relative transition-all cursor-pointer"
        >
            <div onClick={onClick} className="h-full">
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
            </div>
        </TiltedCard>
    );
}

// MCP 导入弹窗
function AddToolModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (name: string, addr: string, tools: any[]) => void }) {
    const [name, setName] = useState('');
    const [addr, setAddr] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parsedTools, setParsedTools] = useState<any[]>([]);

    if (!isOpen) return null;

    const handleParse = () => {
        if (!addr) return;
        setIsParsing(true);
        // 模拟解析过程
        setTimeout(() => {
            const mockTools = [
                { name: 'query_database', description: 'Executes SQL queries against the connected database' },
                { name: 'list_tables', description: 'Lists all available tables in the database' },
                { name: 'get_schema', description: 'Retrieves the schema for a specific table' }
            ];
            setParsedTools(mockTools);
            setIsParsing(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-24 text-slate-200">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0a0c10] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300 flex flex-col">
                {/* 头部 */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                            <Database className="w-4 h-4 text-slate-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">MCP 工具集</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2">
                        <span className="text-2xl">×</span>
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto flex-1">
                    {/* 取个名字 */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">取个名字</label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400">
                                <Link className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="输入该工具集名称..."
                                className="flex-1 bg-slate-900 border border-slate-800 px-5 py-4 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {/* MCP 地址 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">MCP 地址</label>
                            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors group">
                                <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" />
                                鉴权配置
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={addr}
                                onChange={e => setAddr(e.target.value)}
                                placeholder="填入 MCP 地址后，点击解析"
                                className="flex-1 bg-slate-900 border border-slate-800 px-5 py-4 rounded-2xl text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                            />
                            <button
                                onClick={handleParse}
                                disabled={isParsing || !addr}
                                className="px-8 bg-slate-100 text-black hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 rounded-2xl font-bold text-sm transition-all h-14"
                            >
                                {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : '解析'}
                            </button>
                        </div>
                    </div>

                    {/* 工具列表 */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">工具列表</label>
                        <div className="w-full bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden min-h-[220px]">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/20 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">名称</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">描述</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedTools.length > 0 ? (
                                        parsedTools.map((t, i) => (
                                            <tr key={i} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-blue-400 font-mono">{t.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-[200px]">{t.description}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Info className="w-8 h-8 text-slate-700" />
                                                    <p className="text-slate-500 text-sm">暂无数据，需先解析 MCP 地址</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all font-bold text-sm"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => {
                            if (name && parsedTools.length > 0) onAdd(name, addr, parsedTools);
                        }}
                        disabled={!name || parsedTools.length === 0}
                        className="flex-[2] px-10 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-800/50 disabled:text-slate-600 transition-all font-bold text-sm shadow-xl shadow-blue-500/10"
                    >
                        确认导入工具集
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProductPage() {
    // ========== 智能体搜索状态 ==========
    const [searchState, setSearchState] = useState<SearchState>({
        query: '',
        isSearching: false,
        result: null,
        isExpanded: false,
        reportType: 'daily-brief', // 默认简报
        hasNewResult: false
    });

    // ========== 搜索结果弹窗状态 ==========
    const [isSearchResultOpen, setIsSearchResultOpen] = useState(false);

    // ========== 弹窗状态 ==========
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ========== 智能体搜索功能 ==========
    const handleSearch = async () => {
        if (!searchState.query.trim()) return;

        setSearchState(prev => ({ ...prev, isSearching: true, isExpanded: true, result: null }));

        try {
            const response = await fetch('/api/agent/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchState.query,
                    userId: 'demo-user', // 可以从 auth 获取
                    mode: 'full',
                    reportType: searchState.reportType
                })
            });

            const data = await response.json();
            setSearchState(prev => ({
                ...prev,
                isSearching: false,
                result: data,
                hasNewResult: true,
                query: '' // 清空搜索框
            }));
            // 自动打开搜索结果弹窗
            setIsSearchResultOpen(true);
        } catch (error: any) {
            setSearchState(prev => ({
                ...prev,
                isSearching: false,
                result: { success: false, error: error.message },
                hasNewResult: true,
                query: '' // 清空搜索框
            }));
            // 自动打开搜索结果弹窗
            setIsSearchResultOpen(true);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const closeSearchResult = () => {
        setIsSearchResultOpen(false);
        setSearchState(prev => ({ ...prev, hasNewResult: false }));
    };

    const toggleSearchResult = () => {
        if (searchState.hasNewResult || searchState.result) {
            setIsSearchResultOpen(!isSearchResultOpen);
            if (isSearchResultOpen) {
                setSearchState(prev => ({ ...prev, hasNewResult: false }));
            }
        }
    };
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
            link: '/product/knowledge-base'
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

    // 删除工具
    const handleDelete = (id: string) => {
        if (confirm('确定要删除这个工具吗？')) {
            setTools(tools.filter(tool => tool.id !== id));
        }
    };

    // 处理新增 MCP
    const handleAddMCP = (name: string, addr: string, parsedTools: any[]) => {
        const newTool: Tool = {
            id: `mcp-${Date.now()}`,
            name: name,
            description: `已通过 MCP 地址解析共 ${parsedTools.length} 个本地原子工具。协议端点: ${addr}`,
            icon: <Database className="w-6 h-6" />,
            iconBgColor: 'bg-indigo-600',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
            isActive: true
        };
        setTools([...tools, newTool]);
        setIsModalOpen(false);
    };

    // 监听 localStorage 中的选中文章数量
    useEffect(() => {
        // 读取数量的函数
        const updateCount = () => {
            try {
                const countStr = localStorage.getItem('wechat_selected_count');
                const count = countStr ? parseInt(countStr, 10) : 0;

                const kbCountStr = localStorage.getItem('kb_selected_count');
                const kbCount = kbCountStr ? parseInt(kbCountStr, 10) : 0;

                setTools(prevTools => prevTools.map(tool => {
                    if (tool.id === 'wechat-official') {
                        if (tool.badgeCount !== count) {
                            return { ...tool, badgeCount: count };
                        }
                    }
                    if (tool.id === 'knowledge-base') {
                        if (tool.badgeCount !== kbCount) {
                            return { ...tool, badgeCount: kbCount };
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
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* 动态背景 */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <Antigravity
                    color="#6366f1"
                    count={400}
                    particleSize={1.5}
                    magnetRadius={15}
                    autoAnimate={true}
                />
            </div>

            {/* 导航栏 */}
            <div className="relative z-50">
                <NavBar />
            </div>

            {/* 主内容区域 */}
            <main className="relative z-10 pt-32 px-8 pb-16 max-w-7xl mx-auto">
                {/* 搜索输入框 */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <div className="relative group flex items-center w-full max-w-3xl">
                        {/* 输入框光晕背景 */}
                        <div className={`absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur transition duration-500 ${searchState.query ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />

                        <div className="relative w-full">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 z-10">
                                {searchState.isSearching ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                            </div>
                            <input
                                type="text"
                                value={searchState.query}
                                onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask Micro anything... (试试: AI 最新动态 / Python 特性 / 前端框架对比)"
                                className="w-full relative bg-slate-900 border border-slate-700 rounded-full py-4 pl-12 pr-32 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                                {/* 报告类型切换 */}
                                <button
                                    onClick={() => {
                                        const types: Array<'daily-brief' | 'formal' | 'deep-research'> = ['daily-brief', 'formal', 'deep-research'];
                                        const currentIndex = types.indexOf(searchState.reportType);
                                        const nextIndex = (currentIndex + 1) % types.length;
                                        setSearchState(prev => ({ ...prev, reportType: types[nextIndex] }));
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${searchState.reportType === 'deep-research'
                                        ? 'bg-purple-600 text-white'
                                        : searchState.reportType === 'formal'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        }`}
                                    title={
                                        searchState.reportType === 'deep-research' ? '深度研究报告 (3轮搜索)' :
                                            searchState.reportType === 'formal' ? '正式报告 (结构化输出)' :
                                                '简要日报 (快速摘要)'
                                    }
                                >
                                    {searchState.reportType === 'deep-research' ? '深度' :
                                        searchState.reportType === 'formal' ? '正式' :
                                            '简报'}
                                </button>
                                <button
                                    onClick={handleSearch}
                                    disabled={!searchState.query.trim() || searchState.isSearching}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 transition-colors flex items-center gap-1.5"
                                >
                                    <Send className="w-4 h-4" />
                                    搜索
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={toggleSearchResult}
                        className="relative p-3 bg-slate-800/60 border border-slate-700/50 rounded-full text-gray-400 hover:text-white hover:border-slate-600 transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {/* 搜索进行中或有新结果时显示标记 */}
                        {(searchState.isSearching || searchState.hasNewResult) && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold leading-none">
                                    {searchState.isSearching ? '1' : ''}
                                </span>
                            </span>
                        )}
                    </button>
                </div>

                {/* 搜索结果弹窗 */}
                <SearchResultModal
                    state={searchState}
                    onClose={closeSearchResult}
                    isOpen={isSearchResultOpen}
                />

                {/* Available Tools 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Available Tools</h2>
                </div>

                {/* 工具卡片网格 - 三列布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map(tool => (
                        <ToolCard key={tool.id} tool={tool} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                    <AddToolCard onClick={() => setIsModalOpen(true)} />
                </div>

                {/* 导入弹窗 */}
                <AddToolModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAdd={handleAddMCP}
                />
            </main>
        </div>
    );
}
