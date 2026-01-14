/**
 * ReviewAgent - 审核智能体
 * 负责：
 * - 审核报告质量
 * - 决定是否推送或返工
 * - 多渠道推送
 */

import { Agent } from '../core/agent';
import { HelloAgentsLLM } from '../core/llm';
import { AgentConfig, ReviewResult, ExecutionResult, Plan } from '../core/types';

interface PushTarget {
  type: 'email' | 'feishu' | 'app';
  config?: any;
}

export class ReviewAgent extends Agent {
  private pushTargets: PushTarget[];

  constructor(
    private pushManager: any // PushManager 实例
  ) {
    const systemPrompt = `你是一个严格的内容审核专家。

审核维度：
1. 准确性：信息是否正确、有据可依
2. 完整性：是否遗漏关键信息
3. 相关性：是否回答了用户问题
4. 可读性：表达是否清晰、有条理

审核标准：
- 深度研究报告：要求严谨、全面、有深度
- 简要日报：要求简洁、准确、突出重点

输出格式：
{
  "passed": boolean,
  "feedback": "string",
  "action": "push" | "revise" | "replan",
  "revisionType": "content" | "strategy"
}`;

    const llm = new HelloAgentsLLM();
    super('审核助手', llm, { systemPrompt });
    this.pushTargets = [];
  }

  /**
   * 设置推送目标
   */
  setPushTargets(targets: PushTarget[]): void {
    this.pushTargets = targets;
  }

  /**
   * 审核执行结果
   */
  async review(
    result: ExecutionResult,
    originalQuery: string,
    plan: Plan,
    attempts: number = 0
  ): Promise<ReviewResult> {
    console.log(`[ReviewAgent] 开始审核...`);
    console.log(`  报告类型: ${plan.reportType}`);
    console.log(`  置信度: ${result.confidence}`);
    console.log(`  尝试次数: ${attempts + 1}`);

    // 执行审核
    const review = await this.performReview(result, originalQuery, plan);

    if (review.passed) {
      console.log(`  ✓ 审核通过`);
      await this.pushResult(result);
      return { ...review, action: 'push' };
    }

    console.log(`  ✗ 审核未通过: ${review.feedback}`);

    // 检查返工次数
    const maxAttempts = 2;
    if (attempts >= maxAttempts) {
      console.log(`  ! 达到最大返工次数，强制通过`);
      await this.pushResult({
        ...result,
        content: {
          ...result.content,
          warning: '此报告未经完整审核，请谨慎参考'
        }
      });
      return { ...review, action: 'push', forced: true };
    }

    // 返工
    if (review.revisionType === 'strategy') {
      console.log(`  → 需要重新规划`);
      return { ...review, action: 'replan' };
    } else {
      console.log(`  → 需要调整内容`);
      return { ...review, action: 'revise' };
    }
  }

  /**
   * 执行审核
   */
  private async performReview(
    result: ExecutionResult,
    query: string,
    plan: Plan
  ): Promise<Omit<ReviewResult, 'action'>> {
    const reviewPrompt = `
审核以下${plan.reportType}：

原始问题: ${query}

报告类型: ${plan.reportType}
执行模式: ${plan.mode}
置信度: ${result.confidence}

报告内容:
${result.content.summary}

${result.content.items ? `数据项数量: ${result.content.items.length}` : ''}

审核要求：
${this.getReviewCriteria(plan.reportType)}

输出 JSON 格式：
{
  "passed": boolean,
  "feedback": "详细反馈意见",
  "revisionType": "content" | "strategy"
}

请严格审核，确保质量。
`;

    const response = await this.callLLM(reviewPrompt);

    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        passed: response.includes('通过') || response.includes('合格'),
        feedback: response,
        revisionType: 'content'
      };
    } catch {
      // 解析失败，使用关键词判断
      return {
        passed: response.includes('通过') || response.includes('合格') || response.includes('优秀'),
        feedback: response,
        revisionType: 'content'
      };
    }
  }

  /**
   * 获取审核标准
   */
  private getReviewCriteria(reportType: string): string {
    if (reportType === 'deep-research') {
      return `
1. 准确性（30分）：数据准确、引用正确
2. 完整性（25分）：覆盖全面、无重要遗漏
3. 深度（25分）：分析深入、有独到见解
4. 结构性（10分）：逻辑清晰、结构完整
5. 可读性（10分）：表达流畅、易于理解

总分80分以上为通过。
`;
    }

    return `
1. 准确性（40分）：信息准确
2. 相关性（30分）：回答问题
3. 简洁性（20分）：简洁明了
4. 完整性（10分）：不遗漏要点

总分70分以上为通过。
`;
  }

  /**
   * 推送结果
   */
  private async pushResult(result: ExecutionResult): Promise<void> {
    console.log(`\n[ReviewAgent] 开始推送...`);

    for (const target of this.pushTargets) {
      try {
        await this.pushToTarget(target, result);
        console.log(`  ✓ 推送到 ${target.type} 成功`);
      } catch (error) {
        console.error(`  ✗ 推送到 ${target.type} 失败:`, error);
      }
    }
  }

  /**
   * 推送到特定目标
   */
  private async pushToTarget(target: PushTarget, result: ExecutionResult): Promise<void> {
    const content = {
      title: `智能体分析报告 - ${new Date().toLocaleString()}`,
      summary: result.content.summary.slice(0, 200) + '...',
      full: result.content.summary,
      metadata: result.content.metadata
    };

    switch (target.type) {
      case 'email':
        await this.pushManager.sendEmail(target.config, content);
        break;
      case 'feishu':
        await this.pushManager.sendFeishu(target.config, content);
        break;
      case 'app':
        await this.pushManager.saveNotification(content);
        break;
      default:
        throw new Error(`Unknown push type: ${target.type}`);
    }
  }
}
