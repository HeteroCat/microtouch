/**
 * 微信公众号头像代理 API
 * 
 * 解决微信 CDN 图片防盗链问题
 */

import { NextRequest, NextResponse } from 'next/server';

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
        // 请求原始图片
        const response = await fetch(url, {
            headers: {
                // 伪装请求头以绕过防盗链
                'Referer': 'https://mp.weixin.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch image' },
                { status: response.status }
            );
        }

        // 获取图片内容和类型
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 返回代理后的图片
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // 缓存 1 天
            },
        });
    } catch (error) {
        console.error('Image Proxy Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
