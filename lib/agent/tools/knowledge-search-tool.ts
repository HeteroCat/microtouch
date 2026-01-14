/**
 * KnowledgeSearchTool - 知识库搜索工具
 * 在用户配置的知识库中搜索相关内容
 */

import { Tool } from './registry.js';
import { createClient } from '@supabase/supabase-js';

interface KnowledgeSearchConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  tableName?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  source: string;
  url?: string;
  createdAt: number;
  updatedAt: number;
  relevance?: number;
}

interface KnowledgeSearchResult {
  items: KnowledgeItem[];
  total: number;
  hasMore: boolean;
}

export class KnowledgeSearchTool implements Tool {
  name = 'knowledge_search';
  description = '在知识库中搜索相关文档、笔记、文章等内容';

  private supabase: any;
  private tableName: string;

  constructor(config: KnowledgeSearchConfig = {}) {
    const supabaseUrl = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[KnowledgeSearchTool] Supabase 配置缺失');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    this.tableName = config.tableName || 'knowledge_items';
  }

  /**
   * 执行搜索
   */
  async execute(params: {
    keywords: string[];
    categories?: string[];
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<KnowledgeSearchResult> {
    const { keywords, categories, tags, limit = 20, offset = 0 } = params;

    console.log(`[KnowledgeSearchTool] 搜索关键词: ${keywords.join(', ')}`);

    if (!this.supabase) {
      console.warn('[KnowledgeSearchTool] Supabase 未配置，返回空结果');
      return { items: [], total: 0, hasMore: false };
    }

    try {
      // 构建查询
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // 全文搜索
      if (keywords.length > 0) {
        const searchText = keywords.join(' | ');
        query = query.textSearch('content', searchText);
      }

      // 分类过滤
      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      // 分页
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      // 转换为标准格式
      const items: KnowledgeItem[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        tags: item.tags,
        source: item.source || 'knowledge',
        url: item.url,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.updated_at).getTime(),
        relevance: this.calculateRelevance(keywords, item)
      }));

      // 按相关性排序
      items.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      console.log(`[KnowledgeSearchTool] 找到 ${items.length} 条知识`);

      return {
        items,
        total: count || items.length,
        hasMore: items.length === limit && (count || 0) > offset + limit
      };

    } catch (error) {
      console.error('[KnowledgeSearchTool] 搜索失败:', error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevance(keywords: string[], item: any): number {
    let score = 0;
    const text = `${item.title} ${item.content} ${(item.tags || []).join(' ')}`.toLowerCase();

    keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();

      // 标题匹配权重更高
      if (item.title.toLowerCase().includes(lowerKeyword)) {
        score += 10;
      }

      // 标签完全匹配
      if (item.tags && item.tags.some((tag: string) => tag.toLowerCase() === lowerKeyword)) {
        score += 8;
      }

      // 内容匹配
      const contentMatches = (text.match(new RegExp(lowerKeyword, 'g')) || []).length;
      score += contentMatches * 2;
    });

    return score;
  }

  /**
   * 按知识库 ID 搜索（用于分析模式）
   */
  async searchBySourceIds(
    sourceIds: string[],
    params: {
      keywords?: string[];
      limit?: number;
    } = {}
  ): Promise<KnowledgeSearchResult> {
    const { keywords = [], limit = 100 } = params;

    console.log(`[KnowledgeSearchTool] 按数据源搜索: ${sourceIds.length} 个`);

    if (!this.supabase) {
      return { items: [], total: 0, hasMore: false };
    }

    try {
      // 从 source_configs 获取配置的知识库 ID
      const { data: configs } = await this.supabase
        .from('source_configs')
        .select('config')
        .in('id', sourceIds)
        .eq('type', 'knowledge');

      const knowledgeIds = configs
        ?.map((c: any) => c.config?.knowledge_id)
        .filter(Boolean) || [];

      if (knowledgeIds.length === 0) {
        return { items: [], total: 0, hasMore: false };
      }

      // 搜索这些知识库
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .in('knowledge_id', knowledgeIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      const items: KnowledgeItem[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        tags: item.tags,
        source: item.source || 'knowledge',
        url: item.url,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.updated_at).getTime(),
        relevance: keywords.length > 0 ? this.calculateRelevance(keywords, item) : undefined
      }));

      return {
        items,
        total: count || items.length,
        hasMore: false
      };

    } catch (error) {
      console.error('[KnowledgeSearchTool] 按数据源搜索失败:', error);
      return { items: [], total: 0, hasMore: false };
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
            description: '搜索关键词列表'
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: '分类过滤'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '标签过滤'
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
