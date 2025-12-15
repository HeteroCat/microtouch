/**
 * 微信公众号关键词搜索文章 API 路由
 * 
 * 在指定公众号的文章中根据关键词进行搜索
 * 
 * 请求参数:
 * - keyword: 搜索关键词（必填）
 * - nickname: 公众号昵称（必填）
 * - search_type: 搜索类型 'title' | 'content' | 'all'（可选，默认 'title'）
 * - count: 返回数量（可选，默认10）
 * - offset: 偏移量（可选，默认0）
 */

import { NextRequest, NextResponse } from 'next/server';
import { keywordSearchArticles, SearchType } from '@/lib/wechat-api';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const nickname = searchParams.get('nickname');
    const searchType = (searchParams.get('search_type') || 'title') as SearchType;
    const count = parseInt(searchParams.get('count') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!keyword) {
        return NextResponse.json(
            { error: 'Missing required parameter "keyword"' },
            { status: 400 }
        );
    }

    if (!nickname) {
        return NextResponse.json(
            { error: 'Missing required parameter "nickname"' },
            { status: 400 }
        );
    }

    // 验证 searchType
    if (!['title', 'content', 'all'].includes(searchType)) {
        return NextResponse.json(
            { error: 'Invalid search_type. Must be "title", "content", or "all"' },
            { status: 400 }
        );
    }

    try {
        const data = await keywordSearchArticles(
            keyword,
            nickname,
            searchType,
            count,
            offset
        );
        return NextResponse.json(data);
    } catch (error) {
        console.error('Keyword Search API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
