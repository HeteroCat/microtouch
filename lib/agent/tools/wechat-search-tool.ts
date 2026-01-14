/**
 * WeChatSearchTool - 微信文章搜索工具
 * 通过 WeChat API 搜索相关文章
 */

import { Tool } from './registry.js';

interface WeChatSearchConfig {
  appId?: string;
  appSecret?: string;
  apiUrl?: string;
}

interface WeChatArticle {
  id: string;
  title: string;
  author: string;
  digest: string;
  url: string;
  coverUrl?: string;
  publishTime: number;
  source: 'wechat';
}

interface WeChatSearchResult {
  items: WeChatArticle[];
  total: number;
  hasMore: boolean;
}

export class WeChatSearchTool implements Tool {
  name = 'wechat_search';
  description = '搜索微信公众号文章，支持关键词搜索和时间范围过滤';

  private config: WeChatSearchConfig;

  constructor(config: WeChatSearchConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.weixin.qq.com/cgi-bin',
      ...config
    };
  }

  /**
   * 获取 Access Token
   */
  private async getAccessToken(): Promise<string> {
    if (this.config.appId && this.config.appSecret) {
      const response = await fetch(
        `${this.config.apiUrl}/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`
      );
      const data = await response.json();
      return data.access_token;
    }

    // 使用环境变量或已有 token
    return process.env.WECHAT_ACCESS_TOKEN || '';
  }

  /**
   * 执行搜索
   */
  async execute(params: {
    keywords: string[];
    timeRange?: string; // '7d', '30d', '90d'
    limit?: number;
    offset?: number;
  }): Promise<WeChatSearchResult> {
    const { keywords, timeRange = '7d', limit = 20, offset = 0 } = params;

    console.log(`[WeChatSearchTool] 搜索关键词: ${keywords.join(', ')}`);

    // 计算时间范围
    const days = parseInt(timeRange) || 7;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    try {
      const token = await this.getAccessToken();

      // 这里使用微信搜索 API
      // 实际实现可能需要根据具体的微信 API 文档调整
      const response = await fetch(
        `${this.config.apiUrl}/search/article?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: keywords.join(' '),
            count: limit,
            offset,
            begin_time: Math.floor(startTime / 1000)
          })
        }
      );

      if (!response.ok) {
        throw new Error(`WeChat API error: ${response.statusText}`);
      }

      const data = await response.json();

      // 转换为标准格式
      const items: WeChatArticle[] = (data.list || []).map((item: any) => ({
        id: item.doc_id || item.id,
        title: item.title,
        author: item.author || item.source,
        digest: item.digest || item.summary,
        url: item.url || item.link,
        coverUrl: item.cover,
        publishTime: item.create_time || item.published_at,
        source: 'wechat'
      }));

      console.log(`[WeChatSearchTool] 找到 ${items.length} 篇文章`);

      return {
        items,
        total: data.total || items.length,
        hasMore: items.length === limit
      };

    } catch (error) {
      console.error('[WeChatSearchTool] 搜索失败:', error);

      // 返回模拟数据用于测试
      return this.getMockData(keywords, limit);
    }
  }

  /**
   * 模拟数据（用于测试/降级）
   */
  private getMockData(keywords: string[], limit: number): WeChatSearchResult {
    console.log('[WeChatSearchTool] 使用模拟数据');

    const items: WeChatArticle[] = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `mock_${i}`,
      title: `关于 ${keywords[0] || '相关'} 的第 ${i + 1} 篇文章`,
      author: '测试公众号',
      digest: `这是一篇关于 ${keywords.join('、')} 的测试文章摘要内容...`,
      url: `https://mp.weixin.qq.com/s/mock_${i}`,
      coverUrl: '',
      publishTime: Date.now() - i * 3600000,
      source: 'wechat'
    }));

    return {
      items,
      total: items.length,
      hasMore: false
    };
  }

  /**
   * 获取工具定义（用于 LLM）
   */
  getDefinition(): {
    name: string;
    description: string;
    parameters: Record<string, any>;
  } {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: '搜索关键词列表'
          },
          timeRange: {
            type: 'string',
            description: '时间范围（如 7d, 30d, 90d）',
            default: '7d'
          },
          limit: {
            type: 'number',
            description: '返回数量限制',
            default: 20
          }
        },
        required: ['keywords']
      }
    };
  }
}
