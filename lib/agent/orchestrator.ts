/**
 * AgentOrchestrator - 三 Agent 协作编排器
 * 协调 Plan -> ReAct -> Review 的完整流程
 */

import { PlanAgent } from './agents/plan-agent';
import { ReActAgent } from './agents/react-agent';
import { ReviewAgent } from './agents/review-agent';
import { HelloAgentsLLM } from './core/llm';
import { ToolRegistry } from './tools/registry';

// 执行流程步骤接口
export interface ExecutionStep {
  id: string;
  type: 'plan' | 'react' | 'review';
  phase: string;
  iteration: number;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  content: {
    action?: string;
    decision?: string;
    toolCall?: {
      toolName: string;
      args: Record<string, any>;
      result?: any;
      error?: string;
    };
    reasoning?: string;
    feedback?: string;
    score?: number;
  };
}

interface ProcessResult {
  success: boolean;
  result?: any;
  iterations: number;
  error?: string;
  executionSteps?: ExecutionStep[];
}

export class AgentOrchestrator {
  private planAgent: PlanAgent;
  private reactAgent: ReActAgent;
  private reviewAgent: ReviewAgent;
  private maxIterations: number = 3;

  constructor(
    private checkUserConfigs: (userId: string) => Promise<any>,
    private pushManager: any
  ) {
    const llm = new HelloAgentsLLM();

    this.planAgent = new PlanAgent(checkUserConfigs);
    this.reviewAgent = new ReviewAgent(pushManager);
    // ReActAgent 在执行时动态创建（需要工具）
  }

  /**
   * 处理用户查询
   */
  async process(
    userQuery: string,
    userId: string,
    options: {
      reportType?: 'deep-research' | 'daily-brief' | 'formal';
      pushTargets?: Array<{ type: 'email' | 'feishu' | 'app'; config?: any }>;
      tools?: ToolRegistry;
    } = {}
  ): Promise<ProcessResult> {
    console.log('\n' + '='.repeat(60));
    console.log(`[AgentOrchestrator] 开始处理: ${userQuery}`);
    console.log('='.repeat(60));

    // 执行步骤跟踪
    const executionSteps: ExecutionStep[] = [];

    // 创建步骤 ID 的辅助函数
    const createStepId = (type: string, iteration: number, index: number) =>
      `${type}-${iteration}-${index}-${Date.now()}`;

    // 添加步骤的辅助函数
    const addStep = (step: Omit<ExecutionStep, 'id' | 'timestamp'>) => {
      const fullStep: ExecutionStep = {
        ...step,
        id: createStepId(step.type, step.iteration, executionSteps.length),
        timestamp: new Date().toISOString()
      };
      executionSteps.push(fullStep);
      return fullStep;
    };

    let iteration = 0;
    let currentPlan: any = null;

    // 设置推送目标
    if (options.pushTargets) {
      this.reviewAgent.setPushTargets(options.pushTargets);
    }

    while (iteration < this.maxIterations) {
      iteration++;
      console.log(`\n\n### 迭代 ${iteration}/${this.maxIterations} ###`);

      try {
        // 1. Plan Agent 制定计划
        console.log(`\n[阶段 1/3] 规划阶段`);
        addStep({
          type: 'plan',
          phase: '规划阶段',
          iteration,
          status: 'running',
          content: {
            action: '分析用户意图并生成执行计划'
          }
        });

        currentPlan = await this.planAgent.makePlan(userQuery, userId, options.reportType);

        addStep({
          type: 'plan',
          phase: '规划阶段',
          iteration,
          status: 'completed',
          content: {
            decision: `生成执行模式: ${currentPlan.mode}, 报告类型: ${currentPlan.reportType}`
          }
        });
        console.log(`  ✓ 计划生成完成`);

        // 2. ReAct Agent 执行
        console.log(`\n[阶段 2/3] 执行阶段`);
        const reactAgent = this.createReActAgent(options.tools);

        addStep({
          type: 'react',
          phase: '执行阶段',
          iteration,
          status: 'running',
          content: {
            action: '开始执行计划，调用工具获取信息'
          }
        });

        const result = await reactAgent.execute(currentPlan, userQuery);

        addStep({
          type: 'react',
          phase: '执行阶段',
          iteration,
          status: 'completed',
          content: {
            reasoning: `执行完成，收集到 ${result.content?.items?.length || 0} 条数据，置信度: ${result.confidence}`
          }
        });

        console.log(`  ✓ 执行完成`);
        console.log(`  置信度: ${result.confidence}`);

        // 3. Review Agent 审核
        console.log(`\n[阶段 3/3] 审核阶段`);

        addStep({
          type: 'review',
          phase: '审核阶段',
          iteration,
          status: 'running',
          content: {
            action: '审核结果质量，评估是否需要返工'
          }
        });

        const review = await this.reviewAgent.review(
          result,
          userQuery,
          currentPlan,
          iteration - 1
        );

        const reviewStep = addStep({
          type: 'review',
          phase: '审核阶段',
          iteration,
          status: review.action === 'push' ? 'completed' : 'failed',
          content: {
            feedback: review.feedback || (review.action === 'push' ? '审核通过' : '需要返工'),
            score: review.score
          }
        });

        if (review.action === 'push') {
          console.log(`\n${'='.repeat(60)}`);
          console.log(`[AgentOrchestrator] ✓ 成功完成！`);
          console.log(`  总迭代次数: ${iteration}`);
          console.log('='.repeat(60));

          return {
            success: true,
            result: result.content,
            iterations: iteration,
            executionSteps
          };
        }

        // 需要返工
        if (review.action === 'replan') {
          console.log(`\n[返工] 需要重新规划...`);
          continue; // 重新循环
        } else if (review.action === 'revise') {
          console.log(`\n[返工] 调整执行...`);

          addStep({
            type: 'react',
            phase: '调整阶段',
            iteration,
            status: 'running',
            content: {
              action: '根据反馈调整执行结果'
            }
          });

          // 使用 ReActAgent 的 revise 方法
          const revised = await reactAgent.revise(result, review.feedback);

          addStep({
            type: 'react',
            phase: '调整阶段',
            iteration,
            status: 'completed',
            content: {
              reasoning: '根据反馈调整完成'
            }
          });

          // 重新审核
          const reReview = await this.reviewAgent.review(
            revised,
            userQuery,
            currentPlan,
            iteration - 1
          );

          const reReviewStep = addStep({
            type: 'review',
            phase: '重新审核阶段',
            iteration,
            status: reReview.action === 'push' ? 'completed' : 'failed',
            content: {
              feedback: reReview.feedback || '重新审核',
              score: reReview.score
            }
          });

          if (reReview.action === 'push') {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`[AgentOrchestrator] ✓ 调整后通过！`);
            console.log(`  总迭代次数: ${iteration}`);
            console.log('='.repeat(60));

            return {
              success: true,
              result: revised.content,
              iterations: iteration,
              executionSteps
            };
          }
        }

      } catch (error) {
        console.error(`\n[错误] 迭代 ${iteration} 失败:`, error);

        addStep({
          type: 'react',
          phase: '执行阶段',
          iteration,
          status: 'failed',
          content: {
            reasoning: error instanceof Error ? error.message : String(error)
          }
        });

        if (iteration >= this.maxIterations) {
          return {
            success: false,
            iterations: iteration,
            error: error instanceof Error ? error.message : String(error),
            executionSteps
          };
        }
      }
    }

    // 达到最大迭代次数
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[AgentOrchestrator] ✗ 达到最大迭代次数`);
    console.log('='.repeat(60));

    return {
      success: false,
      iterations: this.maxIterations,
      error: '达到最大迭代次数',
      executionSteps
    };
  }

  /**
   * 创建 ReActAgent
   */
  private createReActAgent(tools?: ToolRegistry): ReActAgent {
    const llm = new HelloAgentsLLM();
    return new ReActAgent('执行助手', llm, tools, {
      maxSteps: 10,
      enableReflection: false
    });
  }

  /**
   * 快速搜索（单次执行，无审核）
   */
  async quickSearch(
    query: string,
    options: {
      sources?: string[];
      reportType?: 'deep-research' | 'daily-brief';
      tools?: ToolRegistry;
    } = {}
  ): Promise<ProcessResult> {
    console.log(`\n[AgentOrchestrator] 快速搜索模式`);

    // 执行步骤跟踪
    const executionSteps: ExecutionStep[] = [];

    const createStepId = (type: string, index: number) =>
      `${type}-1-${index}-${Date.now()}`;

    const addStep = (step: Omit<ExecutionStep, 'id' | 'timestamp'>) => {
      const fullStep: ExecutionStep = {
        ...step,
        id: createStepId(step.type, executionSteps.length),
        timestamp: new Date().toISOString()
      };
      executionSteps.push(fullStep);
      return fullStep;
    };

    const reactAgent = this.createReActAgent(options.tools);

    // 简化计划
    const plan = {
      mode: 'search',
      reportType: options.reportType || 'daily-brief',
      searchStrategy: {
        sources: options.sources || ['wechat', 'knowledge', 'rss'],
        keywords: [query],
        depth: 1,
        timeRange: '7d'
      },
      reportFormat: {
        structure: ['核心摘要', '关键要点', '数据来源'],
        includeLinks: true,
        detailLevel: 'concise'
      }
    };

    try {
      addStep({
        type: 'react',
        phase: '快速搜索',
        iteration: 1,
        status: 'running',
        content: {
          action: '执行快速搜索查询'
        }
      });

      const result = await reactAgent.execute(plan, query);

      addStep({
        type: 'react',
        phase: '快速搜索',
        iteration: 1,
        status: 'completed',
        content: {
          reasoning: `搜索完成，收集到 ${result.content?.items?.length || 0} 条数据`
        }
      });

      return {
        success: true,
        result: result.content,
        iterations: 1,
        executionSteps
      };
    } catch (error) {
      addStep({
        type: 'react',
        phase: '快速搜索',
        iteration: 1,
        status: 'failed',
        content: {
          reasoning: error instanceof Error ? error.message : String(error)
        }
      });

      return {
        success: false,
        iterations: 1,
        error: error instanceof Error ? error.message : String(error),
        executionSteps
      };
    }
  }
}
