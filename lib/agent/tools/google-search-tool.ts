/**
 * GoogleSearchTool - 使用 SerpAPI 进行 Google 搜索
 * SerpAPI 文档: https://serpapi.com/search-api
 */

import { Tool } from './registry';

interface GoogleSearchConfig {
  apiKey?: string;
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: 'google';
}

interface GoogleSearchResponse {
  items: GoogleSearchResult[];
  total: number;
  hasMore: boolean;
}

export class GoogleSearchTool implements Tool {
  name = 'search';
  description = '使用 Google 搜索引擎进行网络搜索，获取最新的新闻、文章和信息';

  private apiKey: string;

  constructor(config: GoogleSearchConfig = {}) {
    this.apiKey = config.apiKey || process.env.GOOGLE_SERP_API_KEY || '';
  }

  parameters = {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '搜索关键词列表'
      },
      query: {
        type: 'string',
        description: '搜索查询字符串'
      },
      limit: {
        type: 'number',
        description: '返回数量限制',
        default: 10
      }
    },
    required: []
  };

  /**
   * 执行 Google 搜索 (via SerpAPI)
   */
  async execute(params: any = {}): Promise<GoogleSearchResponse> {
    const { keywords, query, limit = 10 } = params;

    // 兼容多种参数格式
    let searchQuery = '';
    if (Array.isArray(keywords) && keywords.length > 0) {
      searchQuery = keywords.join(' ');
    } else if (typeof query === 'string') {
      searchQuery = query;
    } else if (typeof params.q === 'string') {
      searchQuery = params.q;
    } else if (typeof params === 'string') {
      searchQuery = params;
    }

    if (!searchQuery) {
      console.warn('[GoogleSearchTool] 未提供搜索关键词');
      return { items: [], total: 0, hasMore: false };
    }

    console.log(`[GoogleSearchTool] 搜索: ${searchQuery}`);

    try {
      if (!this.apiKey) {
        throw new Error('SerpAPI Key 未配置');
      }

      // 使用 SerpAPI 接口
      const apiUrl = `https://serpapi.com/search.json?api_key=${this.apiKey}&engine=google&q=${encodeURIComponent(searchQuery)}&num=${limit}&hl=zh-cn`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SerpAPI Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 检查 API 错误
      if (data.error) {
        throw new Error(`SerpAPI Error: ${data.error}`);
      }

      // 解析 organic_results
      const organicResults = data.organic_results || [];
      const items: GoogleSearchResult[] = organicResults.slice(0, limit).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        source: 'google'
      }));

      console.log(`[GoogleSearchTool] ✓ 找到 ${items.length} 条结果`);

      return {
        items,
        total: data.search_information?.total_results || items.length,
        hasMore: organicResults.length > limit
      };

    } catch (error: any) {
      console.error('[GoogleSearchTool] 搜索失败:', error.message);

      // 降级到模拟数据
      return this.getMockData(searchQuery, limit);
    }
  }

  /**
   * 模拟数据（降级用）
   */
  private getMockData(query: string, limit: number): GoogleSearchResponse {
    console.log('[GoogleSearchTool] 使用模拟数据');

    const items: GoogleSearchResult[] = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      title: `关于 "${query}" 的第 ${i + 1} 条搜索结果`,
      link: `https://example.com/result-${i}`,
      snippet: `模拟搜索结果。请检查 SerpAPI Key 是否正确配置。`,
      source: 'google'
    }));

    return { items, total: items.length, hasMore: false };
  }
}
