/**
 * PushManager - 多渠道推送管理器
 * 支持邮件、飞书、应用内通知
 */

import { createClient } from '@supabase/supabase-js';

interface EmailConfig {
  to: string | string[];
  subject?: string;
  from?: string;
}

interface FeishuConfig {
  webhookUrl: string;
  msgType?: 'text' | 'post' | 'interactive';
}

interface AppNotificationConfig {
  userId: string;
  title?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface PushContent {
  title: string;
  summary: string;
  full: string;
  metadata?: {
    mode?: string;
    reportType?: string;
    [key: string]: any;
  };
}

export class PushManager {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(config: EmailConfig, content: PushContent): Promise<void> {
    console.log(`[PushManager] 发送邮件到: ${Array.isArray(config.to) ? config.to.join(', ') : config.to}`);

    try {
      // 使用 Resend 或其他邮件服务
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        await this.sendViaResend(config, content, resendApiKey);
      } else {
        // 使用 Supabase 邮件或其他服务
        await this.sendViaSupabase(config, content);
      }

      // 记录推送日志
      await this.logPush('email', config, content, 'success');

    } catch (error) {
      console.error('[PushManager] 邮件发送失败:', error);
      await this.logPush('email', config, content, 'failed', String(error));
      throw error;
    }
  }

  /**
   * 通过 Resend 发送邮件
   */
  private async sendViaResend(
    config: EmailConfig,
    content: PushContent,
    apiKey: string
  ): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from || 'MicroTouch <noreply@microtouch.com>',
        to: Array.isArray(config.to) ? config.to : [config.to],
        subject: config.subject || content.title,
        html: this.generateEmailHTML(content)
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    console.log('[PushManager] ✓ 邮件已通过 Resend 发送');
  }

  /**
   * 通过 Supabase 发送邮件
   */
  private async sendViaSupabase(config: EmailConfig, content: PushContent): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase 未配置');
    }

    // 使用 Supabase Edge Function 发送邮件
    const { error } = await this.supabase.functions.invoke('send-email', {
      body: {
        to: config.to,
        subject: config.subject || content.title,
        html: this.generateEmailHTML(content)
      }
    });

    if (error) {
      throw error;
    }

    console.log('[PushManager] ✓ 邮件已通过 Supabase 发送');
  }

  /**
   * 生成邮件 HTML
   */
  private generateEmailHTML(content: PushContent): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #007AFF; }
    .content { margin-bottom: 20px; }
    .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #999; }
    .metadata { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .metadata-item { margin: 5px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${content.title}</h1>
    </div>

    <div class="content">
      <h2>摘要</h2>
      <p>${content.summary}</p>
    </div>

    <div class="content">
      <h2>详细内容</h2>
      <div>${this.markdownToHTML(content.full)}</div>
    </div>

    ${content.metadata ? `
    <div class="metadata">
      <h3>报告信息</h3>
      ${content.metadata.mode ? `<div class="metadata-item"><span class="metadata-label">模式:</span> ${content.metadata.mode}</div>` : ''}
      ${content.metadata.reportType ? `<div class="metadata-item"><span class="metadata-label">类型:</span> ${content.metadata.reportType}</div>` : ''}
    </div>
    ` : ''}

    <div class="footer">
      <p>本邮件由 MicroTouch 智能体系统自动生成</p>
      <p>${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Markdown 转 HTML（简化版）
   */
  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * 发送飞书消息
   */
  async sendFeishu(config: FeishuConfig, content: PushContent): Promise<void> {
    console.log(`[PushManager] 发送飞书消息`);

    try {
      const msgType = config.msgType || 'post';
      const message = this.buildFeishuMessage(msgType, content);

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Feishu API error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`Feishu error: ${result.msg}`);
      }

      console.log('[PushManager] ✓ 飞书消息已发送');
      await this.logPush('feishu', config, content, 'success');

    } catch (error) {
      console.error('[PushManager] 飞书发送失败:', error);
      await this.logPush('feishu', config, content, 'failed', String(error));
      throw error;
    }
  }

  /**
   * 构建飞书消息
   */
  private buildFeishuMessage(msgType: string, content: PushContent): any {
    if (msgType === 'post') {
      return {
        msg_type: 'post',
        content: {
          post: {
            zh_cn: {
              title: content.title,
              content: [
                [{
                  tag: 'text',
                  text: content.summary
                }],
                [{
                  tag: 'text',
                  text: `\n\n${content.full}`
                }]
              ]
            }
          }
        }
      };
    }

    // 默认文本消息
    return {
      msg_type: 'text',
      content: {
        text: `${content.title}\n\n${content.summary}\n\n${content.full}`
      }
    };
  }

  /**
   * 保存应用内通知
   */
  async saveNotification(
    config: AppNotificationConfig,
    content: PushContent
  ): Promise<string> {
    console.log(`[PushManager] 保存应用内通知: ${config.userId}`);

    if (!this.supabase) {
      throw new Error('Supabase 未配置');
    }

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: config.userId,
          title: config.title || content.title,
          content: content.full,
          summary: content.summary,
          type: config.type || 'info',
          metadata: content.metadata,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      console.log('[PushManager] ✓ 应用内通知已保存');
      await this.logPush('app', config, content, 'success');

      return data.id;

    } catch (error) {
      console.error('[PushManager] 保存通知失败:', error);
      await this.logPush('app', config, content, 'failed', String(error));
      throw error;
    }
  }

  /**
   * 批量推送
   */
  async pushToTargets(
    targets: Array<{ type: 'email' | 'feishu' | 'app'; config?: any }>,
    content: PushContent
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const target of targets) {
      try {
        switch (target.type) {
          case 'email':
            await this.sendEmail(target.config, content);
            break;
          case 'feishu':
            await this.sendFeishu(target.config, content);
            break;
          case 'app':
            await this.saveNotification(target.config, content);
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${target.type}: ${error}`);
      }
    }

    return results;
  }

  /**
   * 记录推送日志
   */
  private async logPush(
    pushType: string,
    config: any,
    content: PushContent,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    if (!this.supabase) {
      return;
    }

    try {
      await this.supabase
        .from('push_logs')
        .insert({
          user_id: config.userId || 'system',
          push_type: pushType,
          status,
          title: content.title,
          content_summary: content.summary.slice(0, 500),
          content_full: content.full,
          metadata: content.metadata,
          sent_at: status === 'success' ? new Date().toISOString() : null,
          error_message: errorMessage
        });
    } catch (error) {
      console.error('[PushManager] 记录日志失败:', error);
    }
  }
}
