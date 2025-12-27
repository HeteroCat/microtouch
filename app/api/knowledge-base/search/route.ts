/**
 * 知识库搜索 API
 * 支持 GET (带参 q) 和 POST (带 JSON body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/db';

async function handleSearch(query: string | null, topK: number = 5) {
    if (!query || typeof query !== 'string') {
        return NextResponse.json(
            { success: false, error: '请提供搜索查询内容' },
            { status: 400 }
        );
    }

    const result = await searchDocuments(query, topK);

    if (result.success) {
        return NextResponse.json({
            success: true,
            results: result.results || [],
        });
    } else {
        return NextResponse.json(
            { success: false, error: result.error || '搜索失败' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const topK = parseInt(searchParams.get('topK') || '5');

    return handleSearch(query, topK);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, topK = 5 } = body;
        return handleSearch(query, topK);
    } catch (error) {
        return NextResponse.json({ success: false, error: '无效的请求体' }, { status: 400 });
    }
}
