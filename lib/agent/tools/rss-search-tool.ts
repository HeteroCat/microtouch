/**
 * RSSSearchTool - RSS 订阅源搜索工具
 * 从配置的 RSS 源中获取最新文章
 */

import { Tool } from './registry.js';
import { createClient } from '@supabase/supabase-js';

interface RSSFeedConfig {
  url: string;
  name: string;
  category?: string;
}

interface RSSArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  author?: string;
  publishedAt: number;
  source: string;
  sourceName: string;
  category?: string;
}

interface RSSSearchResult {
  items: RSSArticle[];
  total: number;
  sources: number;
}

export class RSSSearchTool implements Tool {
  name = 'rss_search';
  description = '从 RSS 订阅源中获取最新文章和内容';

  private supabase: any;
  private cache: Map<string, { items: RSSArticle[]; timestamp: number }> = new Map();
  private cacheDuration = 30 * 60 * 1000; // 30 分钟缓存

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * 执行搜索
   */
  async execute(params: {
    keywords?: string[];
    timeRange?: string; // '7d', '30d'
    limit?: number;
    sources?: string[]; // RSS 源 URL 列表
  }): Promise<RSSSearchResult> {
    const { keywords, timeRange = '7d', limit = 50, sources } = params;

    console.log(`[RSSSearchTool] 获取 RSS 文章`);

    // 获取 RSS 源列表
    const feedConfigs = await this.getFeedConfigs(sources);

    if (feedConfigs.length === 0) {
      console.log('[RSSSearchTool] 没有配置的 RSS 源');
      return { items: [], total: 0, sources: 0 };
    }

    const allItems: RSSArticle[] = [];
    const days = parseInt(timeRange) || 7;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // 从每个源获取文章
    for (const config of feedConfigs) {
      const items = await this.fetchFeed(config, startTime);
      allItems.push(...items);
    }

    // 按时间排序
    allItems.sort((a, b) => b.publishedAt - a.publishedAt);

    // 关键词过滤
    let filteredItems = allItems;
    if (keywords && keywords.length > 0) {
      filteredItems = allItems.filter(item =>
        keywords.some(keyword =>
          item.title.toLowerCase().includes(keyword.toLowerCase()) ||
          item.description.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    // 限制数量
    const resultItems = filteredItems.slice(0, limit);

    console.log(`[RSSSearchTool] 从 ${feedConfigs.length} 个源获取 ${resultItems.length} 篇文章`);

    return {
      items: resultItems,
      total: filteredItems.length,
      sources: feedConfigs.length
    };
  }

  /**
   * 获取 RSS 源配置
   */
  private async getFeedConfigs(sourceUrls?: string[]): Promise<RSSFeedConfig[]> {
    // 如果提供了具体 URL，直接使用
    if (sourceUrls && sourceUrls.length > 0) {
      return sourceUrls.map(url => ({
        url,
        name: this.getSourceName(url)
      }));
    }

    // 从数据库获取配置的源
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('source_configs')
          .select('id, name, config')
          .eq('type', 'rss')
          .eq('enabled', true);

        if (data && data.length > 0) {
          return data.map((item: any) => ({
            url: item.config?.url,
            name: item.name,
            category: item.config?.category
          })).filter((c: RSSFeedConfig) => c.url);
        }
      } catch (error) {
        console.error('[RSSSearchTool] 获取配置失败:', error);
      }
    }

    // 默认 RSS 源
    return [];
  }

  /**
   * 获取单个 RSS 源的文章
   */
  private async fetchFeed(config: RSSFeedConfig, startTime: number): Promise<RSSArticle[]> {
    // 检查缓存
    const cached = this.cache.get(config.url);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.items.filter(item => item.publishedAt >= startTime);
    }

    try {
      // 使用 RSS 解析服务
      // 这里可以集成 rss-parser 或使用 API 服务
      const response = await fetch(`/api/rss/fetch?url=${encodeURIComponent(config.url)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.statusText}`);
      }

      const data = await response.json();

      const items: RSSArticle[] = (data.items || []).map((item: any) => ({
        id: item.guid || item.link,
        title: item.title,
        link: item.link,
        description: item.description || item.snippet || '',
        content: item.content || item['content:encoded'],
        author: item.creator || item.author,
        publishedAt: new Date(item.pubDate || item.published).getTime(),
        source: config.url,
        sourceName: config.name,
        category: config.category
      }));

      // 缓存结果
      this.cache.set(config.url, {
        items,
        timestamp: Date.now()
      });

      return items.filter(item => item.publishedAt >= startTime);

    } catch (error) {
      console.error(`[RSSSearchTool] 获取 ${config.name} 失败:`, error);
      return [];
    }
  }

  /**
   * 从 URL 提取源名称
   */
  private getSourceName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * 按 RSS 源 ID 搜索（用于分析模式）
   */
  async searchBySourceIds(
    sourceIds: string[],
    params: {
      timeRange?: string;
      limit?: number;
    } = {}
  ): Promise<RSSSearchResult> {
    const { timeRange = '7d', limit = 100 } = params;

    if (!this.supabase) {
      return { items: [], total: 0, sources: 0 };
    }

    try {
      // 获取配置的 RSS 源 URL
      const { data: configs } = await this.supabase
        .from('source_configs')
        .select('config')
        .in('id', sourceIds)
        .eq('type', 'rss');

      const sourceUrls = configs
        ?.map((c: any) => c.config?.url)
        .filter(Boolean) || [];

      if (sourceUrls.length === 0) {
        return { items: [], total: 0, sources: 0 };
      }

      // 使用这些 URL 搜索
      return await this.execute({
        sources: sourceUrls,
        timeRange,
        limit
      });

    } catch (error) {
      console.error('[RSSSearchTool] 按数据源搜索失败:', error);
      return { items: [], total: 0, sources: 0 };
    }
  }

  /**
   * 获取工具定义
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
            description: '关键词过滤（可选）'
          },
          timeRange: {
            type: 'string',
            description: '时间范围（如 7d, 30d）',
            default: '7d'
          },
          limit: {
            type: 'number',
            description: '返回数量限制',
            default: 50
          },
          sources: {
            type: 'array',
            items: { type: 'string' },
            description: 'RSS 源 URL 列表（可选）'
          }
        }
      }
    };
  }
}
