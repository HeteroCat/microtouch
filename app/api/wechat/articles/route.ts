/**
 * 微信公众号最新文章列表 API 路由
 * 
 * 获取指定公众号的最新文章列表
 * 
 * 请求参数:
 * - nickname: 公众号昵称（必填）
 * - count: 返回数量（可选，默认10）
 * - offset: 偏移量（可选，默认0）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestArticles } from '@/lib/wechat-api';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const nickname = searchParams.get('nickname');
    const count = parseInt(searchParams.get('count') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!nickname) {
        return NextResponse.json(
            { error: 'Missing required parameter "nickname"' },
            { status: 400 }
        );
    }

    try {
        const data = await getLatestArticles(nickname, count, offset);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Latest Articles API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
