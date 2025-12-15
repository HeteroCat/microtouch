/**
 * 微信公众号搜索 API 路由
 * 
 * 根据关键词搜索微信公众号信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAccounts } from '@/lib/wechat-api';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json(
            { error: 'Missing query parameter "q"' },
            { status: 400 }
        );
    }

    try {
        const data = await searchAccounts(query);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
