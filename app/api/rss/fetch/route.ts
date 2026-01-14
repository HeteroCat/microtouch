/**
 * RSS Fetch API
 * 获取 RSS 源内容
 * 用于 RSSSearchTool 获取 RSS 文章
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: '缺少 url 参数' },
        { status: 400 }
      );
    }

    console.log(`[API] /rss/fetch - URL: ${url}`);

    // 使用 RSS 解析服务
    const feed = await fetchRSSFeed(url);

    return NextResponse.json({
      success: true,
      title: feed.title,
      description: feed.description,
      items: feed.items
    });

  } catch (error: any) {
    console.error('[API] /rss/fetch error:', error);
    return NextResponse.json(
      { error: error.message || '获取 RSS 失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取 RSS 源内容
 */
async function fetchRSSFeed(url: string): Promise<{
  title: string;
  description: string;
  items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    content?: string;
  }>;
}> {
  try {
    // 尝试直接获取 RSS 内容
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      // 添加超时
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();

    // 解析 RSS/Atom
    return parseRSSContent(content, url);

  } catch (error) {
    console.error('[RSS Fetch] 直接获取失败，尝试使用代理服务:', error);

    // 使用 RSS2JSON 或其他代理服务
    return await fetchViaProxy(url);
  }
}

/**
 * 解析 RSS/Atom 内容
 */
function parseRSSContent(content: string, sourceUrl: string): {
  title: string;
  description: string;
  items: any[];
} {
  // 简单的 XML 解析
  const items: any[] = [];

  // 提取 channel title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : 'RSS Feed';

  // 提取 channel description
  const descMatch = content.match(/<description>([^<]+)<\/description>/);
  const description = descMatch ? descMatch[1].trim() : '';

  // 提取所有 items
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(content)) !== null) {
    const itemContent = itemMatch[1];

    const titleMatch = itemContent.match(/<title>([^<]+)<\/title>/);
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
    const descMatch = itemContent.match(/<description>([^<]+)<\/description>/);
    const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/);
    const authorMatch = itemContent.match(/<author>([^<]+)<\/author>/) ||
                       itemContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
    const contentMatch = itemContent.match(/<content:encoded[^>]*>([^<]+)<\/content:encoded>/);

    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        link: linkMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : '',
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
        author: authorMatch ? authorMatch[1].trim() : undefined,
        content: contentMatch ? contentMatch[1].trim() : undefined
      });
    }
  }

  return {
    title,
    description,
    items
  };
}

/**
 * 通过代理服务获取 RSS
 */
async function fetchViaProxy(url: string): Promise<{
  title: string;
  description: string;
  items: any[];
}> {
  // 使用 rss2json.com 作为代理
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Proxy API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'ok') {
    throw new Error(`RSS2JSON error: ${data.message || 'Unknown error'}`);
  }

  // 转换为标准格式
  return {
    title: data.feed.title || 'RSS Feed',
    description: data.feed.description || '',
    items: data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      description: item.description || '',
      pubDate: item.pubDate || new Date().toISOString(),
      author: item.author,
      content: item.content || item.description
    }))
  };
}
