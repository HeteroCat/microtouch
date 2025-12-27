'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Sparkles,
    Loader2,
    ArrowLeft,
    Search,
    Calendar,
    FileText,
    CheckCircle2,
    XCircle,
    X,
    FolderOpen,
    Trash2,
    Database,
    Zap,
    Upload,
    ChevronRight,
    Maximize2,
    CheckSquare,
    Square
} from 'lucide-react';
import NavBar from '@/components/NavBar';

// 视图状态
type ViewState = 'dashboard' | 'search-results';

interface DocumentModel {
    id: string;
    filename: string;
    createdAt: number;
    content?: string; // 详情视图时包含内容
}

interface SearchResult {
    content: string;
    filename: string;
    score: number;
}

export default function KnowledgeBasePage() {
    // 数据状态
    const [documents, setDocuments] = useState<DocumentModel[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // 搜索状态
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 上传状态
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // 查看文档状态
    const [viewingDoc, setViewingDoc] = useState<DocumentModel | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    // 视图导航
    const [viewState, setViewState] = useState<ViewState>('dashboard');

    // 选中状态
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // 1. 初始化：从 localStorage 恢复选中状态
    useEffect(() => {
        try {
            const saved = localStorage.getItem('kb_selected_ids');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setSelectedIds(new Set(parsed));
                }
            }
        } catch (e) {
            console.error('Failed to load selected IDs:', e);
        }
    }, []);

    // 2. 监听选中状态变化并同步到 localStorage
    useEffect(() => {
        try {
            localStorage.setItem('kb_selected_ids', JSON.stringify(Array.from(selectedIds)));
            // 保存数量供主页读取
            localStorage.setItem('kb_selected_count', selectedIds.size.toString());
        } catch (e) {
            console.error('Failed to save selected IDs:', e);
        }
    }, [selectedIds]);

    /**
     * 加载文档列表
     */
    const fetchDocuments = useCallback(async () => {
        setIsLoadingDocs(true);
        try {
            const res = await fetch('/api/knowledge-base/documents');
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error('Fetch docs error:', error);
        } finally {
            setIsLoadingDocs(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    /**
     * 切换选中状态
     */
    const handleToggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    /**
     * 查看文档详情
     */
    const handleViewDetail = async (id: string) => {
        setIsFetchingDetail(true);
        try {
            const res = await fetch(`/api/knowledge-base/documents?id=${id}`);
            const data = await res.json();
            if (data.success) {
                setViewingDoc(data.document);
            } else {
                alert(data.error || '获取详情失败');
            }
        } catch (error) {
            alert('网络请求失败');
        } finally {
            setIsFetchingDetail(false);
        }
    };

    /**
     * 处理文件上传
     */
    const handleFileUpload = async (file: File) => {
        const allowedExtensions = ['.txt', '.md', '.json', '.pdf', '.docx', '.doc'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            setErrorMessage('仅支持 .txt, .md, .json, .pdf, .docx 格式');
            setUploadStatus('error');
            return;
        }

        setUploadStatus('uploading');
        setErrorMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/knowledge-base/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setUploadStatus('success');
                fetchDocuments();
                setTimeout(() => setUploadStatus('idle'), 3000);
            } else {
                setErrorMessage(data.error || '上传失败');
                setUploadStatus('error');
            }
        } catch (error) {
            setErrorMessage('网络连接失败');
            setUploadStatus('error');
        }
    };

    /**
     * 执行检索
     */
    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setViewState('search-results');

        try {
            const res = await fetch(`/api/knowledge-base/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.success) {
                setSearchResults(data.results || []);
            } else {
                setErrorMessage(data.error || '检索失败');
            }
        } catch (error) {
            setErrorMessage('搜索服务不可用');
        } finally {
            setIsSearching(false);
        }
    };

    /**
     * 删除文档
     */
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('确定要删除这个文档吗？')) return;

        try {
            const res = await fetch(`/api/knowledge-base/documents?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
            <NavBar />

            <main className="pt-32 px-8 pb-32 max-w-7xl mx-auto">

                {/* 1. 顶部搜索栏 */}
                <div className="flex flex-col items-center mb-24 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="relative group w-full max-w-2xl">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-60" />

                        <div className="relative flex items-center bg-slate-900/80 border border-slate-700/50 rounded-full backdrop-blur-xl shadow-2xl">
                            <div className="absolute left-6 text-blue-400">
                                <Sparkles className="w-5 h-5 animate-pulse" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="搜索你的知识库..."
                                className="w-full bg-transparent py-5 pl-14 pr-32 text-white placeholder-slate-500 focus:outline-none text-lg tracking-wide"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !query.trim()}
                                className="absolute right-3 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : '搜索'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. 主体布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* 左侧：知识库 */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                <h2 className="text-2xl font-bold tracking-tight">知识库</h2>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                                    {documents.length} FILES
                                </span>
                            </div>

                            {viewState === 'search-results' && (
                                <button
                                    onClick={() => setViewState('dashboard')}
                                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> 返回列表
                                </button>
                            )}
                        </div>

                        {viewState === 'search-results' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                        <p className="text-slate-500 font-medium">寻找知识碎片中...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                                        <p className="text-slate-500">没找着相关内容，换个词试试？</p>
                                    </div>
                                ) : (
                                    searchResults.map((result, idx) => {
                                        // 搜索结果目前使用 filename 作为 key，但如果有 ID 更好
                                        // 下一步我会更新 DB 搜索返回 ID
                                        const docId = (result as any).id || result.filename;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => handleViewDetail(docId)}
                                                className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all group cursor-pointer relative"
                                            >
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        {/* 复选框 */}
                                                        <div
                                                            onClick={(e) => handleToggleSelect(docId, e)}
                                                            className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${selectedIds.has(docId)
                                                                ? 'bg-blue-600 border-blue-500'
                                                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                                                }`}
                                                        >
                                                            {selectedIds.has(docId) && <CheckSquare className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="text-xs font-bold text-blue-400/80 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20 flex items-center gap-2">
                                                            <FileText className="w-3 h-3" /> {result.filename}
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 font-mono">
                                                        SCORE: {((1 - result.score) * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <p className="text-slate-300 leading-relaxed text-sm line-clamp-4">
                                                    {result.content}
                                                </p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {isLoadingDocs ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="h-24 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
                                    ))
                                ) : documents.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                        <Database className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-500">知识库还是空的，上传点东西让它活过来</p>
                                    </div>
                                ) : (
                                    documents.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleViewDetail(doc.id)}
                                            className="group relative bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center h-24 gap-5 hover:bg-slate-900/60 hover:border-blue-500/30 transition-all cursor-pointer"
                                        >
                                            {/* 复选框 */}
                                            <div
                                                onClick={(e) => handleToggleSelect(doc.id, e)}
                                                className={`flex-shrink-0 w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${selectedIds.has(doc.id)
                                                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                                                        : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                                    }`}
                                            >
                                                {selectedIds.has(doc.id) && <CheckSquare className="w-4 h-4 text-white" />}
                                            </div>

                                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-bold text-slate-200 truncate group-hover:text-white">{doc.filename}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDelete(doc.id, e)}
                                                    className="p-3 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="删除文档"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <ChevronRight className="w-5 h-5 text-slate-700" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* 右侧：上传区 */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                            <h2 className="text-2xl font-bold tracking-tight">上传</h2>
                        </div>

                        <div className={`relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center min-h-[350px] transition-all group overflow-hidden ${uploadStatus === 'uploading' ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-cyan-500/30'
                            }`}>
                            <input
                                type="file"
                                accept=".txt,.md,.json,.pdf,.docx"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                disabled={uploadStatus === 'uploading'}
                            />

                            <div className="relative z-10 w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                {uploadStatus === 'uploading' ? (
                                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                                ) : uploadStatus === 'success' ? (
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                ) : (
                                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                )}
                            </div>

                            <div className="relative z-10 text-center">
                                <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">
                                    {uploadStatus === 'uploading' ? '解析并注入知识...' : '点击或拖拽文件'}
                                </h3>
                                <p className="text-slate-500 text-sm max-w-[180px] mx-auto leading-relaxed">
                                    支持 PDF/Word/MD 格式，加密存储
                                </p>
                            </div>

                            <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-1.5 opacity-60">
                                {['PDF', 'DOCX', 'MD'].map(ext => (
                                    <span key={ext} className="px-2 py-0.5 text-[9px] font-black bg-slate-800 text-slate-400 rounded-md border border-slate-700">
                                        {ext}
                                    </span>
                                ))}
                            </div>

                            {errorMessage && (
                                <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-2 rounded-xl border border-red-400/20 text-xs">
                                        <XCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                </div>
                            )}

                            {uploadStatus === 'success' && (
                                <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-sm animate-in fade-in" />
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                <h4 className="font-bold text-sm">向量引擎</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">状态</span>
                                    <span className="text-emerald-500 flex items-center gap-1">
                                        在线 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">加密</span>
                                    <span className="text-slate-300">AES-256</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* 查看文件详情 Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{viewingDoc.filename}</h2>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Full Content Preview</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingDoc(null)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-base">
                                    {viewingDoc.content}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-slate-950/50 flex justify-end">
                            <button
                                onClick={() => setViewingDoc(null)}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay for Detail Fetching */}
            {isFetchingDetail && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <span className="text-slate-400 font-medium tracking-wide">加载文档内容...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
