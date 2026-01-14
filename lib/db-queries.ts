/**
 * Database Queries - 数据库查询封装
 * 提供对 Supabase 数据库的统一访问接口
 */

import { createClient } from '@supabase/supabase-js';

// 数据库类型定义
export interface SourceConfig {
  id: string;
  user_id: string;
  type: 'wechat' | 'knowledge' | 'rss';
  name: string;
  config: Record<string, any>;
  schedule: string;
  enabled: boolean;
  push_targets: Array<{ type: 'email' | 'feishu' | 'app'; config?: any }>;
  last_check_at: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface MonitorJob {
  id: string;
  source_config_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  items_found: number;
  new_items: number;
  summary_generated: boolean;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PushLog {
  id: string;
  user_id: string;
  monitor_job_id: string | null;
  push_type: 'email' | 'feishu' | 'app';
  status: 'pending' | 'sent' | 'failed';
  title: string | null;
  content_summary: string | null;
  content_full: string | null;
  metadata: Record<string, any> | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

// 默认 RSS 源配置
export const DEFAULT_RSS_SOURCES = [
  {
    name: '36氪',
    type: 'rss' as const,
    config: { url: 'https://www.36kr.com/feed' },
    category: '科技创业'
  },
  {
    name: '虎嗅网',
    type: 'rss' as const,
    config: { url: 'https://rss.huxiu.com/' },
    category: '商业科技'
  },
  {
    name: 'IT之家',
    type: 'rss' as const,
    config: { url: 'http://www.ithome.com/rss/' },
    category: '数码科技'
  },
  {
    name: 'InfoQ AI',
    type: 'rss' as const,
    config: { url: 'https://feed.infoq.com/ai-ml-data-eng/' },
    category: 'AI技术'
  }
];

class DatabaseQueries {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 配置缺失');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==================== SourceConfig 操作 ====================

  /**
   * 获取用户的所有数据源配置
   */
  async getUserSources(userId: string, enabledOnly: boolean = false): Promise<SourceConfig[]> {
    // Handle demo user - return empty sources instead of querying database
    if (userId === 'demo-user' || !userId) {
      return [];
    }

    let query = this.supabase
      .from('source_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (enabledOnly) {
      query = query.eq('enabled', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`获取用户数据源失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 根据 ID 获取单个数据源配置
   */
  async getSourceById(sourceId: string): Promise<SourceConfig | null> {
    const { data, error } = await this.supabase
      .from('source_configs')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 未找到
      }
      throw new Error(`获取数据源失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 创建数据源配置
   */
  async createSource(
    userId: string,
    type: 'wechat' | 'knowledge' | 'rss',
    name: string,
    config: Record<string, any>,
    options: {
      schedule?: string;
      enabled?: boolean;
      pushTargets?: Array<{ type: 'email' | 'feishu' | 'app'; config?: any }>;
    } = {}
  ): Promise<SourceConfig> {
    const { data, error } = await this.supabase
      .from('source_configs')
      .insert({
        user_id: userId,
        type,
        name,
        config,
        schedule: options.schedule || '0 */6 * * *',
        enabled: options.enabled !== false,
        push_targets: options.pushTargets || [],
        error_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建数据源失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新数据源配置
   */
  async updateSource(
    sourceId: string,
    updates: Partial<Omit<SourceConfig, 'id' | 'user_id' | 'created_at'>>
  ): Promise<SourceConfig> {
    const { data, error } = await this.supabase
      .from('source_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)
      .select()
      .single();

    if (error) {
      throw new Error(`更新数据源失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除数据源配置
   */
  async deleteSource(sourceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('source_configs')
      .delete()
      .eq('id', sourceId);

    if (error) {
      throw new Error(`删除数据源失败: ${error.message}`);
    }
  }

  /**
   * 初始化默认 RSS 源
   */
  async initializeDefaultRSSSources(userId: string): Promise<SourceConfig[]> {
    const created: SourceConfig[] = [];

    for (const source of DEFAULT_RSS_SOURCES) {
      try {
        const config = await this.createSource(
          userId,
          source.type,
          source.name,
          { ...source.config, category: source.category },
          { enabled: false } // 默认不启用，用户手动启用
        );
        created.push(config);
      } catch (error: any) {
        // 忽略已存在的错误
        if (!error.message.includes('duplicate')) {
          console.error(`创建默认源 ${source.name} 失败:`, error);
        }
      }
    }

    return created;
  }

  /**
   * 更新数据源检查时间
   */
  async updateSourceCheckTime(sourceId: string): Promise<void> {
    await this.supabase
      .from('source_configs')
      .update({
        last_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId);
  }

  /**
   * 增加数据源错误计数
   */
  async incrementSourceErrors(sourceId: string): Promise<void> {
    const source = await this.getSourceById(sourceId);
    if (source) {
      await this.updateSource(sourceId, {
        error_count: source.error_count + 1,
        updated_at: new Date().toISOString()
      });
    }
  }

  // ==================== MonitorJob 操作 ====================

  /**
   * 创建监控任务
   */
  async createMonitorJob(sourceConfigId: string): Promise<MonitorJob> {
    const { data, error } = await this.supabase
      .from('monitor_jobs')
      .insert({
        source_config_id: sourceConfigId,
        status: 'pending',
        items_found: 0,
        new_items: 0,
        summary_generated: false,
        retry_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建监控任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取监控任务
   */
  async getMonitorJob(jobId: string): Promise<MonitorJob | null> {
    const { data, error } = await this.supabase
      .from('monitor_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`获取监控任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新监控任务状态
   */
  async updateMonitorJob(
    jobId: string,
    updates: Partial<Omit<MonitorJob, 'id' | 'source_config_id' | 'created_at'>>
  ): Promise<MonitorJob> {
    const { data, error } = await this.supabase
      .from('monitor_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`更新监控任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取待处理的监控任务
   */
  async getPendingJobs(limit: number = 10): Promise<MonitorJob[]> {
    const { data, error } = await this.supabase
      .from('monitor_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`获取待处理任务失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 获取数据源的监控任务历史
   */
  async getSourceJobHistory(
    sourceConfigId: string,
    limit: number = 20
  ): Promise<MonitorJob[]> {
    const { data, error } = await this.supabase
      .from('monitor_jobs')
      .select('*')
      .eq('source_config_id', sourceConfigId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`获取任务历史失败: ${error.message}`);
    }

    return data || [];
  }

  // ==================== PushLog 操作 ====================

  /**
   * 创建推送日志
   */
  async createPushLog(
    userId: string,
    pushType: 'email' | 'feishu' | 'app',
    content: {
      title?: string;
      summary?: string;
      full?: string;
      metadata?: Record<string, any>;
    },
    monitorJobId?: string
  ): Promise<PushLog> {
    const { data, error } = await this.supabase
      .from('push_logs')
      .insert({
        user_id: userId,
        monitor_job_id: monitorJobId || null,
        push_type: pushType,
        status: 'pending',
        title: content.title || null,
        content_summary: content.summary || null,
        content_full: content.full || null,
        metadata: content.metadata || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建推送日志失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新推送日志状态
   */
  async updatePushLog(
    logId: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    };

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('push_logs')
      .update(updates)
      .eq('id', logId);

    if (error) {
      throw new Error(`更新推送日志失败: ${error.message}`);
    }
  }

  /**
   * 获取用户的推送日志
   */
  async getUserPushLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      pushType?: 'email' | 'feishu' | 'app';
    } = {}
  ): Promise<PushLog[]> {
    let query = this.supabase
      .from('push_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.pushType) {
      query = query.eq('push_type', options.pushType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`获取推送日志失败: ${error.message}`);
    }

    return data || [];
  }

  // ==================== 统计查询 ====================

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: string): Promise<{
    totalSources: number;
    enabledSources: number;
    totalJobs: number;
    completedJobs: number;
    totalPushes: number;
    successfulPushes: number;
  }> {
    const [sourcesResult, jobsResult, pushesResult] = await Promise.all([
      this.supabase
        .from('source_configs')
        .select('id, enabled')
        .eq('user_id', userId),
      this.supabase
        .from('monitor_jobs')
        .select('id, status')
        .eq('source_config_id', userId), // 注意：这里可能需要 join
      this.supabase
        .from('push_logs')
        .select('id, status')
        .eq('user_id', userId)
    ]);

    const sources = sourcesResult.data || [];
    const jobs = jobsResult.data || [];
    const pushes = pushesResult.data || [];

    return {
      totalSources: sources.length,
      enabledSources: sources.filter((s: SourceConfig) => s.enabled).length,
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j: MonitorJob) => j.status === 'completed').length,
      totalPushes: pushes.length,
      successfulPushes: pushes.filter((p: PushLog) => p.status === 'sent').length
    };
  }
}

// 导出单例实例
export const db = new DatabaseQueries();

// 导出类以供需要时创建新实例
export { DatabaseQueries };
