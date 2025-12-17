'use client';

/**
 * 微信公众号搜索页面
 * 
 * 功能：
 * - 搜索微信公众号
 * - 点击公众号卡片查看最新文章列表
 * - 关键词搜索文章
 * - 点击文章查看 Markdown 内容
 */

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import {
    Sparkles,
    Loader2,
    ArrowLeft,
    Search,
    Calendar,
    ExternalLink,
    FileText,
    CheckCircle2,
    XCircle,
    X,
    User,
    Menu, // 用于列表图标
    Download, // 用于下载图标
    CheckSquare, // 用于全选图标
    Square // 用于未选中图标
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 获取代理后的图片 URL
 * 通过服务端代理解决微信 CDN 防盗链问题
 */
function getProxiedImageUrl(url: string | undefined | null): string | null {
    if (!url) return null;
    return `/api/wechat/image-proxy?url=${encodeURIComponent(url)}`;
}

// 公众号信息接口
interface Account {
    name: string;
    alias: string;
    head_image_url: string;
    signature: string;
    service_type: number;
    verify_status: number;
}

// 文章信息接口
interface Article {
    title: string;
    link: string;
    cover: string;
    digest: string;
    create_time: number;
    update_time: number;
    publish_type: number;
}

// 视图状态类型
type ViewState = 'search' | 'articles' | 'article-content';

export default function WeChatOfficialSearchPage() {
    // 搜索状态
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // 公众号详情/文章列表状态
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [articlesTotal, setArticlesTotal] = useState(0);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);

    // 文章内容状态
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [articleContent, setArticleContent] = useState('');
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    // 关键词搜索状态
    const [keywordQuery, setKeywordQuery] = useState('');
    const [isKeywordSearch, setIsKeywordSearch] = useState(false);

    // 文章选择与下载状态
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    // 视图状态
    const [viewState, setViewState] = useState<ViewState>('search');

    // 初始化：从 localStorage 恢复选中状态
    useEffect(() => {
        try {
            const saved = localStorage.getItem('wechat_selected_articles');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setSelectedArticles(new Set(parsed));
                }
            }
        } catch (e) {
            console.error('Failed to load selected articles:', e);
        }
    }, []);

    // 监听选中状态变化并同步到 localStorage
    useEffect(() => {
        try {
            localStorage.setItem('wechat_selected_articles', JSON.stringify(Array.from(selectedArticles)));
            // 同时保存数量，方便其他页面快速读取
            localStorage.setItem('wechat_selected_count', selectedArticles.size.toString());
        } catch (e) {
            console.error('Failed to save selected articles:', e);
        }
    }, [selectedArticles]);

    // 搜索公众号
    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/wechat/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.data || []);
            } else {
                console.error('Search failed');
            }
        } catch (error) {
            console.error('Search error', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 获取公众号文章列表
    // 获取公众号文章列表
    const handleAccountClick = async (account: Account) => {
        setSelectedAccount(account);
        setViewState('articles');
        setIsLoadingArticles(true);
        setIsKeywordSearch(false);
        setKeywordQuery('');

        try {
            // 先获取第一页 (20条) 以保证快速响应和兼容性
            const BATCH_SIZE = 20;
            const res = await fetch(
                `/api/wechat/articles?nickname=${encodeURIComponent(account.name)}&count=${BATCH_SIZE}`
            );

            if (res.ok) {
                const data = await res.json();
                let allArticles = data.data || [];
                const total = data.total || 0;

                // 立即显示第一页内容
                setArticles(allArticles);
                setArticlesTotal(total);

                // 如果还有更多文章，尝试并发获取剩余部分 (上限取 100 条防止请求过多)
                // 用户反馈需要全选 50+ 文章，因此自动加载是必须的
                if (total > allArticles.length) {
                    const fetchLimit = 100;
                    const remainingTasks = [];

                    for (let offset = BATCH_SIZE; offset < Math.min(total, fetchLimit); offset += BATCH_SIZE) {
                        remainingTasks.push(
                            fetch(`/api/wechat/articles?nickname=${encodeURIComponent(account.name)}&count=${BATCH_SIZE}&offset=${offset}`)
                                .then(r => r.ok ? r.json() : { data: [] })
                                .then(d => d.data || [])
                                .catch(() => [])
                        );
                    }

                    // 并发执行剩余请求
                    if (remainingTasks.length > 0) {
                        const results = await Promise.all(remainingTasks);
                        results.forEach(batch => {
                            allArticles = [...allArticles, ...batch];
                        });
                        // 更新完整的文章列表
                        setArticles(allArticles);
                    }
                }
            } else {
                console.error('Failed to fetch articles');
            }
        } catch (error) {
            console.error('Articles fetch error', error);
        } finally {
            setIsLoadingArticles(false);
        }
    };

    // 关键词搜索文章
    const handleKeywordSearch = async () => {
        if (!keywordQuery.trim() || !selectedAccount) return;

        setIsLoadingArticles(true);
        setIsKeywordSearch(true);

        try {
            const res = await fetch(
                `/api/wechat/keyword-search?keyword=${encodeURIComponent(keywordQuery)}&nickname=${encodeURIComponent(selectedAccount.name)}&count=20`
            );
            if (res.ok) {
                const data = await res.json();
                setArticles(data.data || []);
                setArticlesTotal(data.total || 0);
            } else {
                console.error('Keyword search failed');
            }
        } catch (error) {
            console.error('Keyword search error', error);
        } finally {
            setIsLoadingArticles(false);
        }
    };

    // 切换文章选中状态
    const handleToggleSelect = (article: Article, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedArticles);
        if (newSelected.has(article.link)) {
            newSelected.delete(article.link);
        } else {
            newSelected.add(article.link);
        }
        setSelectedArticles(newSelected);
    };

    // 全选/取消全选
    const handleSelectAll = () => {
        if (selectedArticles.size === articles.length) {
            setSelectedArticles(new Set());
        } else {
            const newSelected = new Set(articles.map(a => a.link));
            setSelectedArticles(newSelected);
        }
    };

    // 批量下载选中文章
    // Fixes:
    // - [x] Update the UI to show selection mode and download button
    // - [ ] Verify the functionality
    //     - [x] Fix checkbox positioning (add relative)
    //     - [x] Increase article fetch count (20 -> 100)
    const handleDownloadSelected = async () => {
        if (selectedArticles.size === 0) return;

        setIsDownloading(true);
        const zip = new JSZip();

        try {
            // 获取选中的文章对象
            const selectedArticlesList = articles.filter(a => selectedArticles.has(a.link));

            // 并发获取文章内容
            const promises = selectedArticlesList.map(async (article) => {
                try {
                    const res = await fetch(`/api/wechat/extract?url=${encodeURIComponent(article.link)}`);
                    if (res.ok) {
                        const data = await res.json();
                        // 使用文章标题作为文件名，移除非法字符
                        const fileName = `${article.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
                        zip.file(fileName, data.content || '无法获取内容');
                    } else {
                        zip.file(`${article.title}_error.txt`, '获取内容失败');
                    }
                } catch (error) {
                    zip.file(`${article.title}_error.txt`, `发生错误: ${error}`);
                }
            });

            await Promise.all(promises);

            // 生成并下载 ZIP
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `微信文章_${selectedAccount?.name || 'download'}_${new Date().toISOString().slice(0, 10)}.zip`);

        } catch (error) {
            console.error('Download error', error);
            alert('下载过程中发生错误');
        } finally {
            setIsDownloading(false);
        }
    };

    // 获取文章内容
    const handleArticleClick = async (article: Article) => {
        setSelectedArticle(article);
        setViewState('article-content');
        setIsLoadingContent(true);

        try {
            const res = await fetch(
                `/api/wechat/extract?url=${encodeURIComponent(article.link)}`
            );
            if (res.ok) {
                const data = await res.json();
                setArticleContent(data.content || '');
            } else {
                console.error('Failed to extract article content');
                setArticleContent('无法获取文章内容');
            }
        } catch (error) {
            console.error('Extract error', error);
            setArticleContent('获取文章内容时发生错误');
        } finally {
            setIsLoadingContent(false);
        }
    };

    // 返回上一级视图
    const handleBack = () => {
        if (viewState === 'article-content') {
            setViewState('articles');
            setSelectedArticle(null);
            setArticleContent('');
        } else if (viewState === 'articles') {
            setViewState('search');
            setSelectedAccount(null);
            setArticles([]);
        }
    };

    // 清除关键词搜索，恢复最新文章
    const handleClearKeywordSearch = async () => {
        if (!selectedAccount) return;

        setKeywordQuery('');
        setIsKeywordSearch(false);
        setIsLoadingArticles(true);

        try {
            const res = await fetch(
                `/api/wechat/articles?nickname=${encodeURIComponent(selectedAccount.name)}&count=20`
            );
            if (res.ok) {
                const data = await res.json();
                setArticles(data.data || []);
                setArticlesTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Articles fetch error', error);
        } finally {
            setIsLoadingArticles(false);
        }
    };

    // 格式化时间戳
    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // 键盘事件处理
    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') {
            action();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <NavBar />

            <main className="pt-32 px-8 pb-16 max-w-7xl mx-auto">
                {/* 返回按钮 */}
                {viewState !== 'search' && (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        返回
                    </button>
                )}

                {/* 搜索视图 */}
                {viewState === 'search' && (
                    <>
                        {/* 搜索输入框 */}
                        <div className="flex items-center justify-center gap-4 mb-12">
                            <div className="relative group flex items-center w-full max-w-2xl">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500" />

                                <div className="relative w-full">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 z-10">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, handleSearch)}
                                        placeholder="搜索微信公众号..."
                                        className="w-full relative bg-slate-900 border border-slate-700 rounded-full py-4 pl-12 pr-24 text-white placeholder-slate-500 focus:outline-none focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={isLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-500 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 功能特性介绍 - 仅在未搜索时显示 */}
                        {!hasSearched && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* 特性 1 */}
                                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/60 hover:border-purple-500/30 transition-all group">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Search className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-3">全网公众号搜索</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        支持搜索任意微信公众号，一键获取公众号基础信息、头像及认证详情。
                                    </p>
                                </div>

                                {/* 特性 2 */}
                                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/60 hover:border-blue-500/30 transition-all group">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <FileText className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-3">文章 Markdown 提取</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        自动提取文章正文并转换为 Markdown 格式，保留排版结构，支持图片防盗链处理。
                                    </p>
                                </div>

                                {/* 特性 3 */}
                                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/60 hover:border-emerald-500/30 transition-all group">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Sparkles className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-3">深度关键词检索</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">
                                        支持在特定公众号内进行关键词深度搜索，快速定位历史文章，挖掘有价值的内容。
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 搜索结果 */}
                        {hasSearched && (
                            <div className="space-y-6 max-w-4xl mx-auto">
                                <h2 className="text-xl font-semibold mb-4 text-gray-300">
                                    搜索结果 ({results.length})
                                </h2>

                                {results.length === 0 && !isLoading ? (
                                    <div className="text-center text-gray-500 py-10">
                                        未找到相关公众号
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {results.map((account, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleAccountClick(account)}
                                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex items-start gap-4 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group"
                                            >
                                                {account.head_image_url ? (
                                                    <img
                                                        src={getProxiedImageUrl(account.head_image_url) || ''}
                                                        alt={account.name}
                                                        className="w-16 h-16 rounded-full object-cover bg-slate-800"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center ${account.head_image_url ? 'hidden' : ''}`}>
                                                    <User className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                            {account.name}
                                                            {account.verify_status === 0 ? (
                                                                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-gray-500" />
                                                            )}
                                                        </h3>
                                                        <span className="text-xs text-slate-500 uppercase tracking-wider">
                                                            {account.service_type === 2 ? '服务号' : '订阅号'}
                                                        </span>
                                                    </div>
                                                    {account.alias && (
                                                        <p className="text-sm text-purple-400 mb-2 font-mono">
                                                            @{account.alias}
                                                        </p>
                                                    )}
                                                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                                                        {account.signature || '暂无简介'}
                                                    </p>
                                                </div>
                                                <div className="text-gray-500 group-hover:text-purple-400 transition-colors">
                                                    <ArrowLeft className="w-5 h-5 rotate-180" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* 文章列表视图 */}
                {viewState === 'articles' && selectedAccount && (
                    <div className="max-w-4xl mx-auto">
                        {/* 公众号信息头部 */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 mb-8 flex items-center gap-6">
                            {selectedAccount.head_image_url ? (
                                <img
                                    src={getProxiedImageUrl(selectedAccount.head_image_url) || ''}
                                    alt={selectedAccount.name}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/30"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center border-2 border-purple-500/30 ${selectedAccount.head_image_url ? 'hidden' : ''}`}>
                                <User className="w-10 h-10 text-white" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
                                    {selectedAccount.name}
                                    {selectedAccount.verify_status === 0 && (
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                                            已认证
                                        </span>
                                    )}
                                </h1>
                                {selectedAccount.alias && (
                                    <p className="text-sm text-purple-400 font-mono mb-2">
                                        @{selectedAccount.alias}
                                    </p>
                                )}
                                <p className="text-gray-400 text-sm">
                                    {selectedAccount.signature || '暂无简介'}
                                </p>
                            </div>
                        </div>

                        {/* 文章关键词搜索 */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={keywordQuery}
                                    onChange={(e) => setKeywordQuery(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleKeywordSearch)}
                                    placeholder="在该公众号中搜索文章..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleKeywordSearch}
                                disabled={isLoadingArticles || !keywordQuery.trim()}
                                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                搜索
                            </button>

                            {/* 批量下载按钮 */}
                            <button
                                onClick={handleDownloadSelected}
                                disabled={isDownloading || selectedArticles.size === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${selectedArticles.size > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                                {isDownloading ? '打包中...' : `下载 (${selectedArticles.size})`}
                            </button>
                        </div>

                        {/* 全选控制栏 (当有文章时显示) */}
                        {articles.length > 0 && (
                            <div className="flex items-center justify-end mb-2 px-1">
                                <button
                                    onClick={handleSelectAll}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    {selectedArticles.size === articles.length ? (
                                        <>
                                            <CheckSquare className="w-4 h-4 text-blue-500" />
                                            取消全选
                                        </>
                                    ) : (
                                        <>
                                            <Square className="w-4 h-4" />
                                            全选
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* 搜索状态提示 */}
                        {isKeywordSearch && (
                            <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 mb-6">
                                <span className="text-purple-300 text-sm">
                                    搜索 "{keywordQuery}" 的结果，共 {articlesTotal} 篇文章
                                </span>
                                <button
                                    onClick={handleClearKeywordSearch}
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* 文章列表标题 */}
                        <h2 className="text-lg font-semibold text-gray-300 mb-4">
                            {isKeywordSearch ? '搜索结果' : '最新文章'} ({isKeywordSearch ? articles.length : articlesTotal})
                        </h2>

                        {/* 文章列表 */}
                        {isLoadingArticles ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                            </div>
                        ) : articles.length === 0 ? (
                            <div className="text-center text-gray-500 py-16">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>暂无文章</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {articles.map((article, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleArticleClick(article)}
                                        className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex gap-4 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group relative"
                                    >
                                        {article.cover ? (
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={getProxiedImageUrl(article.cover) || ''}
                                                    alt={article.title}
                                                    className="w-32 h-20 rounded-lg object-cover bg-slate-800"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                <div className="hidden w-32 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                                                    <FileText className="w-8 h-8 text-slate-500" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-32 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-8 h-8 text-slate-500" />
                                            </div>
                                        )}

                                        {/* 文章选择复选框 */}
                                        <div
                                            className="absolute top-2 left-2 z-10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => handleToggleSelect(article, e)}
                                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${selectedArticles.has(article.link)
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'bg-slate-900/80 text-gray-400 border border-slate-700 hover:border-slate-500'
                                                    }`}
                                            >
                                                {selectedArticles.has(article.link) && <CheckCircle2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                className="text-white font-medium mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors [&>em]:not-italic [&>em]:text-purple-400 [&>em]:font-bold"
                                                dangerouslySetInnerHTML={{ __html: article.title }}
                                            />
                                            <p className="text-gray-500 text-sm line-clamp-2 mb-2">
                                                {article.digest || '暂无摘要'}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(article.create_time)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-gray-500 group-hover:text-purple-400 transition-colors self-center">
                                            <ExternalLink className="w-5 h-5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 文章内容视图 */}
                {viewState === 'article-content' && selectedArticle && (
                    <div className="max-w-4xl mx-auto">
                        {/* 文章标题 */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white mb-4">
                                {selectedArticle.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(selectedArticle.create_time)}
                                </span>
                                <a
                                    href={selectedArticle.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    查看原文
                                </a>
                            </div>
                        </div>

                        {/* 文章内容 */}
                        {isLoadingContent ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500">正在提取文章内容...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 lg:p-12">
                                <article className="prose prose-invert prose-slate max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            // 自定义图片渲染：接入图片代理
                                            img: ({ node, ...props }) => {
                                                const proxiedUrl = getProxiedImageUrl(props.src as string) || '';
                                                return (
                                                    <span className="block my-8">
                                                        <img
                                                            {...props}
                                                            src={proxiedUrl}
                                                            className="rounded-xl border border-slate-700 mx-auto max-w-full shadow-lg"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                // 如果加载失败，尝试显示提示或隐藏
                                                                target.style.opacity = '0.5';
                                                                target.alt = `图片加载失败: ${target.alt}`;
                                                            }}
                                                        />
                                                    </span>
                                                );
                                            },
                                            // 标题样式
                                            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-white mb-6 mt-10 pb-4 border-b border-slate-800" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-200 mb-5 mt-10 flex items-center gap-2" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-gray-300 mb-4 mt-8" {...props} />,
                                            // 段落样式
                                            p: ({ node, ...props }) => <p className="text-gray-300 leading-8 mb-6 text-lg" {...props} />,
                                            // 引用样式
                                            blockquote: ({ node, ...props }) => (
                                                <blockquote className="border-l-4 border-purple-500 bg-purple-900/20 py-4 px-6 my-6 rounded-r-lg italic text-gray-300" {...props} />
                                            ),
                                            // 链接样式
                                            a: ({ node, ...props }) => (
                                                <a
                                                    className="text-purple-400 hover:text-purple-300 underline underline-offset-4 decoration-purple-500/30 hover:decoration-purple-500 transition-all"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    {...props}
                                                />
                                            ),
                                            // 列表样式
                                            ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-2 mb-6 text-gray-300" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 space-y-2 mb-6 text-gray-300" {...props} />,
                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                            // 代码块样式
                                            code: ({ node, ...props }) => {
                                                // @ts-ignore - inline does not exist on type DetailedHTMLProps
                                                const { inline, className, children } = props;
                                                // const match = /language-(\w+)/.exec(className || '');
                                                return inline ? (
                                                    <code className="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-700" {...props} />
                                                ) : (
                                                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto my-6 text-sm text-gray-300 font-mono">
                                                        <code className={className} {...props} />
                                                    </pre>
                                                );
                                            },
                                            // 表格样式
                                            table: ({ node, ...props }) => (
                                                <div className="overflow-x-auto my-8 border border-slate-700 rounded-xl">
                                                    <table className="min-w-full divide-y divide-slate-700" {...props} />
                                                </div>
                                            ),
                                            thead: ({ node, ...props }) => <thead className="bg-slate-800" {...props} />,
                                            th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" {...props} />,
                                            tbody: ({ node, ...props }) => <tbody className="bg-slate-900 divide-y divide-slate-700" {...props} />,
                                            tr: ({ node, ...props }) => <tr className="hover:bg-slate-800/50 transition-colors" {...props} />,
                                            td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap" {...props} />,
                                        }}
                                    >
                                        {articleContent}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
