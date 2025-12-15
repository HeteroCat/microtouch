/**
 * 微信公众号文章内容提取 API 路由
 * 
 * 提取微信公众号文章的 Markdown 内容
 * 
 * 请求参数:
 * - url: 微信文章链接（必填）
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractArticleContent } from '@/lib/wechat-api';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json(
            { error: 'Missing required parameter "url"' },
            { status: 400 }
        );
    }

    try {
        const content = await extractArticleContent(url);
        return NextResponse.json({ content });
    } catch (error) {
        console.error('Extract API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
