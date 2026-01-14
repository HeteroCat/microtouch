/**
 * WeChatArticleSearchTool - 微信公众号文章搜索工具
 * 根据用户输入关键词，分析相关公众号，然后搜索文章
 */

import { Tool } from './registry';
import { searchAccounts, keywordSearchArticles } from '@/lib/wechat-api';

interface WeChatArticleSearchResult {
  items: WeChatArticleResult[];
  total: number;
  hasMore: boolean;
}

interface WeChatArticleResult {
  id: string;
  title: string;
  author: string;
  digest: string;
  url: string;
  cover: string;
  publishTime: number;
  source: 'wechat';
  accountName?: string;
}

export class WeChatArticleSearchTool implements Tool {
  name = 'wechat_article_search';
  description = '搜索微信公众号文章。首先根据关键词查找相关公众号，然后在公众号文章中进行关键词搜索，获取高质量的内容';

  private accountCache: Map<string, any[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 执行微信文章搜索
   */
  async execute(params: {
    keywords: string[];
    limit?: number;
    timeRange?: string; // '7d', '30d', '90d'
  }): Promise<WeChatArticleSearchResult> {
    const { keywords, limit = 20, timeRange = '7d' } = params;

    console.log(`[WeChatArticleSearchTool] 搜索关键词: ${keywords.join(', ')}`);

    const mainKeyword = keywords[0];
    if (!mainKeyword) {
      return { items: [], total: 0, hasMore: false };
    }

    try {
      // 步骤1：搜索相关公众号
      const accounts = await this.searchRelatedAccounts(mainKeyword);

      if (accounts.length === 0) {
        console.log('[WeChatArticleSearchTool] 未找到相关公众号');
        return { items: [], total: 0, hasMore: false };
      }

      console.log(`[WeChatArticleSearchTool] 找到 ${accounts.length} 个相关公众号`);

      // 步骤2：从每个公众号搜索相关文章（并发）
      const allArticles: WeChatArticleResult[] = [];

      const searchPromises = accounts.map(async (account) => {
        try {
          // 在该公众号中搜索关键词
          const response = await keywordSearchArticles(
            mainKeyword,
            account.name,
            'all', // 搜索标题和内容
            Math.ceil(limit / accounts.length) + 2, // 分配配额
            0
          );

          if (response.code === 200 && response.data) {
            return response.data.map((article: any) => ({
              id: `wechat_${account.name}_${article.create_time}`,
              title: article.title,
              author: account.name,
              digest: article.digest,
              url: article.link,
              cover: article.cover,
              publishTime: article.create_time,
              source: 'wechat' as const,
              accountName: account.name
            }));
          }
          return [];
        } catch (error) {
          console.error(`[WeChatArticleSearchTool] 公众号 ${account.name} 搜索失败:`, error);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      results.forEach(articles => allArticles.push(...articles));

      // 按发布时间排序（最新的在前）
      allArticles.sort((a, b) => b.publishTime - a.publishTime);

      // 限制返回数量
      const limitedItems = allArticles.slice(0, limit);

      console.log(`[WeChatArticleSearchTool] 共找到 ${allArticles.length} 篇文章，返回 ${limitedItems.length} 篇`);

      return {
        items: limitedItems,
        total: allArticles.length,
        hasMore: allArticles.length > limit
      };

    } catch (error) {
      console.error('[WeChatArticleSearchTool] 搜索失败:', error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  /**
   * 搜索相关公众号（带缓存）
   */
  private async searchRelatedAccounts(keyword: string): Promise<any[]> {
    const cacheKey = keyword.toLowerCase();

    // 检查缓存
    const cached = this.accountCache.get(cacheKey);
    if (cached && Date.now() - cached[0].timestamp < this.cacheTimeout) {
      return cached.map(c => c.account);
    }

    try {
      const response = await searchAccounts(keyword);

      if (response.code === 200 && response.data) {
        // 只返回已认证的公众号
        const verifiedAccounts = response.data.filter((acc: any) => acc.verify_status === 0);

        // 更新缓存
        this.accountCache.set(cacheKey, verifiedAccounts.map((acc: any) => ({
          account: acc,
          timestamp: Date.now()
        })));

        // 清理旧缓存
        this.cleanCache();

        return verifiedAccounts;
      }

      return [];
    } catch (error) {
      console.error('[WeChatArticleSearchTool] 公众号搜索失败:', error);
      return [];
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.accountCache.entries()) {
      if (now - value[0]?.timestamp > this.cacheTimeout) {
        this.accountCache.delete(key);
      }
    }
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
          limit: {
            type: 'number',
            description: '返回数量限制',
            default: 20
          },
          timeRange: {
            type: 'string',
            description: '时间范围（暂未实现，保留参数）',
            default: '7d'
          }
        },
        required: ['keywords']
      }
    };
  }
}
