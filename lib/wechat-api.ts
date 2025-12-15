/**
 * 微信公众号爬虫 API 工具类
 * 
 * 提供与微信公众号爬虫服务交互的功能，包括：
 * - 搜索公众号
 * - 获取最新文章列表
 * - 提取文章 Markdown 内容
 * - 关键词搜索文章
 * 
 * API 文档: https://wxcrawl.touchturing.com/docs
 */

import crypto from 'crypto';

// API 配置 - 建议在生产环境中使用环境变量
const API_CONFIG = {
    baseUrl: process.env.WECHAT_API_BASE_URL || 'https://wxcrawl.touchturing.com',
    apiKey: process.env.WECHAT_API_KEY || 'test_id',
    apiSecret: process.env.WECHAT_API_SECRET || 'test_secret',
};

/**
 * 公众号信息接口
 */
export interface WeChatAccount {
    name: string;           // 公众号昵称
    alias: string;          // 公众号别名
    head_image_url: string; // 头像 URL
    signature: string;      // 功能介绍
    service_type: number;   // 服务号类型，0: 未知, 1: 订阅号, 2: 服务号
    verify_status: number;  // 认证状态，-1: 未认证, 0: 已认证
}

/**
 * 文章信息接口
 */
export interface WeChatArticle {
    title: string;        // 文章标题
    link: string;         // 文章链接
    cover: string;        // 封面图片 URL
    digest: string;       // 文章摘要
    create_time: number;  // 创建时间 Unix 时间戳
    update_time: number;  // 更新时间 Unix 时间戳
    publish_type: number; // 发布类型
}

/**
 * API 响应基础接口
 */
export interface ApiResponse<T> {
    code: number;
    data: T;
    total?: number;
}

/**
 * 生成 API 请求签名
 * 签名规则: md5(api_key + endpoint + timestamp + [body_md5] + api_secret)
 * 
 * @param endpoint - 接口路径，如 "/api/search"
 * @param body - 可选的请求体字节
 * @returns 签名字符串
 */
function generateSignature(endpoint: string, timestamp: string, body?: Buffer): string {
    let message = `${API_CONFIG.apiKey}${endpoint}${timestamp}`;

    if (body) {
        const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
        message += bodyMd5;
    }

    message += API_CONFIG.apiSecret;
    return crypto.createHash('md5').update(message).digest('hex');
}

/**
 * 生成带签名的请求头
 * 
 * @param endpoint - 接口路径
 * @param body - 可选的请求体
 * @returns 请求头对象
 */
export function getAuthHeaders(endpoint: string, body?: Buffer): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(endpoint, timestamp, body);

    return {
        'x-api-key': API_CONFIG.apiKey,
        'x-timestamp': timestamp,
        'x-signature': signature,
    };
}

/**
 * 搜索微信公众号
 * 
 * @param search - 搜索关键词
 * @returns 公众号列表
 */
export async function searchAccounts(search: string): Promise<ApiResponse<WeChatAccount[]>> {
    const endpoint = '/api/search';
    const headers = getAuthHeaders(endpoint);

    const params = new URLSearchParams({ search });
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}?${params}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * 获取公众号最新文章列表
 * 
 * @param nickname - 公众号昵称
 * @param count - 返回数量（可选，默认10）
 * @param offset - 偏移量（可选，默认0）
 * @returns 文章列表
 */
export async function getLatestArticles(
    nickname: string,
    count: number = 10,
    offset: number = 0
): Promise<ApiResponse<WeChatArticle[]>> {
    const endpoint = '/api/latest_articles';
    const headers = getAuthHeaders(endpoint);

    const params = new URLSearchParams({
        nickname,
        count: count.toString(),
        offset: offset.toString(),
    });

    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}?${params}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * 提取微信文章的 Markdown 内容
 * 
 * @param url - 微信文章链接
 * @returns Markdown 格式的文章内容
 */
export async function extractArticleContent(url: string): Promise<string> {
    const endpoint = '/api/extract';
    const headers = getAuthHeaders(endpoint);

    const params = new URLSearchParams({ url });
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}?${params}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * 搜索类型枚举
 */
export type SearchType = 'title' | 'content' | 'all';

/**
 * 在公众号文章中进行关键词搜索
 * 
 * @param keyword - 搜索关键词
 * @param nickname - 公众号昵称
 * @param searchType - 搜索类型 ('title' | 'content' | 'all')
 * @param count - 返回数量（可选，默认10）
 * @param offset - 偏移量（可选，默认0）
 * @returns 文章列表
 */
export async function keywordSearchArticles(
    keyword: string,
    nickname: string,
    searchType: SearchType = 'title',
    count: number = 10,
    offset: number = 0
): Promise<ApiResponse<WeChatArticle[]>> {
    const endpoint = '/api/keyword_search';
    const headers = getAuthHeaders(endpoint);

    const params = new URLSearchParams({
        keyword,
        nickname,
        search_type: searchType,
        count: count.toString(),
        offset: offset.toString(),
    });

    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}?${params}`, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}
