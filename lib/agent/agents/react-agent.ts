/**
 * ReActAgent - 推理与行动结合的 Agent
 * 支持：
 * - 多步推理
 * - 工具调用
 * - 自我反思
 */

import { Agent } from '../core/agent';
import { HelloAgentsLLM } from '../core/llm';
import { AgentConfig, Thought, ExecutionResult, Plan } from '../core/types';
import { ToolRegistry } from '../tools/registry';

interface ReActConfig extends AgentConfig {
  maxSteps?: number;
  enableReflection?: boolean;
}

export class ReActAgent extends Agent {
  private maxSteps: number;
  private enableReflection: boolean;

  constructor(name: string, llm: HelloAgentsLLM, tools?: ToolRegistry, config: ReActConfig = {}) {
    // 严格的系统提示词，防止工具幻觉
    const defaultPrompt = `你是一个专业的搜索分析助手 ${name}。

## 重要规则（必须严格遵守）：
1. 你只能使用下面"可用工具"列表中明确列出的工具
2. 不要假设存在其他工具（如 analyze_*、extract_*、summarize_*、fetch_* 等都不存在）
3. 分析、总结、提取要点等任务由你直接完成，不需要调用工具
4. 搜索 1-2 次后立即生成最终答案

## 工作流程：
1. 调用搜索工具获取信息（最多 2 次）
2. 直接分析搜索结果
3. 生成最终答案

## 输出格式：
- 需要搜索时：{"needsTool": true, "toolName": "search", "args": {"keywords": ["关键词"]}, "reasoning": "原因"}
- 生成答案时：{"needsTool": false, "answer": "完整的分析报告...", "confidence": 0.8}

## 禁止行为：
- ❌ 不要调用不在列表中的工具
- ❌ 不要尝试 fetch_content、get_web_content、summarize_news 等不存在的工具
- ❌ 不要超过 2 次搜索就开始总结`;

    super(name, llm, {
      ...config,
      tools,
      systemPrompt: config.systemPrompt || defaultPrompt
    });

    // 减少最大步数，强制快速完成
    this.maxSteps = config.maxSteps || 5;
    this.enableReflection = config.enableReflection || false;
  }

  /**
   * 执行计划
   */
  async execute(plan: Plan, userQuery: string): Promise<ExecutionResult> {
    console.log(`[ReActAgent ${this.name}] 开始执行计划...`);
    console.log(`  模式: ${plan.mode}`);
    console.log(`  报告类型: ${plan.reportType}`);

    this.clearMemory();

    const items: any[] = [];
    let step = 0;

    // 初始上下文
    const initialContext = this.buildInitialContext(plan, userQuery);
    this.addMemory({ role: 'system', content: initialContext });

    // ReAct 循环
    while (step < this.maxSteps) {
      step++;
      console.log(`\n[步骤 ${step}]`);

      const thought = await this.think(`步骤 ${step}/${this.maxSteps}`);

      if (thought.needsTool && thought.toolName) {
        console.log(`  → 调用工具: ${thought.toolName}`);
        console.log(`    理由: ${thought.reasoning || 'N/A'}`);

        try {
          const result = await this.useTool(thought.toolName, thought.args || {});
          items.push(...(this.extractItems(result) || []));
          console.log(`    结果: ${JSON.stringify(result).slice(0, 100)}...`);
        } catch (error) {
          console.error(`    工具执行失败:`, error);
          this.addMemory({
            role: 'tool',
            content: `Tool ${thought.toolName} failed: ${error}`
          });
        }
      } else {
        // 生成总结
        console.log(`  → 生成总结`);
        const summary = await this.generateSummary(items, plan, userQuery);

        if (this.enableReflection) {
          const refined = await this.reflect(summary, items);
          return {
            success: true,
            content: {
              items,
              summary: refined,
              metadata: {
                mode: plan.mode,
                reportType: plan.reportType,
                steps: step,
                ...plan.metadata
              }
            },
            confidence: thought.confidence || 0.8
          };
        }

        return {
          success: true,
          content: {
            items,
            summary,
            metadata: {
              mode: plan.mode,
              reportType: plan.reportType,
              steps: step
            }
          },
          confidence: thought.confidence || 0.8
        };
      }
    }

    // 达到最大步数
    console.log(`\n[警告] 达到最大步数 ${this.maxSteps}，强制总结`);
    const summary = await this.generateSummary(items, plan, userQuery);

    return {
      success: true,
      content: {
        items,
        summary,
        metadata: {
          mode: plan.mode,
          reportType: plan.reportType,
          steps: this.maxSteps,
          warning: '达到最大步数'
        }
      },
      confidence: 0.5
    };
  }

  /**
   * 生成总结
   */
  private async generateSummary(items: any[], plan: Plan, query: string): Promise<string> {
    const reportFormat = plan.reportFormat;
    const structureText = reportFormat.structure.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const summaryPrompt = `
基于以下信息生成${plan.reportType === 'deep-research' ? '深度研究报告' : '简要日报'}：

用户问题: ${query}
收集到的数据项: ${items.length} 条
报告类型: ${plan.reportType}

报告结构要求:
${structureText}

格式要求:
- 使用 Markdown 格式
${reportFormat.includeLinks ? '- 包含原始链接' : ''}
${reportFormat.maxLength ? `- 控制在 ${reportFormat.maxLength} 字以内` : ''}
- 细节程度: ${reportFormat.detailLevel}

数据内容:
${JSON.stringify(items.slice(0, 20)).slice(0, 3000)}...

请生成完整报告：
`;

    return await this.callLLM(summaryPrompt);
  }

  /**
   * 自我反思优化
   */
  private async reflect(summary: string, items: any[]): Promise<string> {
    const reflectPrompt = `
请审查并优化以下报告：

原始报告:
${summary}

请检查：
1. 准确性：信息是否正确？
2. 完整性：是否遗漏重要内容？
3. 相关性：是否回答了用户问题？
4. 表达：是否清晰易懂？

如果报告已经很好，直接返回原报告。
如果需要改进，请返回优化后的版本。
`;

    return await this.callLLM(reflectPrompt);
  }

  /**
   * 构建初始上下文
   */
  private buildInitialContext(plan: Plan, query: string): string {
    const parts: string[] = [
      `用户查询: ${query}`,
      `执行模式: ${plan.mode}`,
      `报告类型: ${plan.reportType}`
    ];

    if (plan.searchStrategy) {
      parts.push(
        `搜索策略:\n` +
        `- 数据源: ${plan.searchStrategy.sources.join(', ')}\n` +
        `- 关键词: ${plan.searchStrategy.keywords.join(', ')}\n` +
        `- 深度: ${plan.searchStrategy.depth} 轮`
      );
    }

    if (plan.analysisStrategy) {
      parts.push(
        `分析策略:\n` +
        `- 范围: ${plan.analysisStrategy.scope}\n` +
        `- 角度: ${plan.analysisStrategy.angle.join(', ')}\n` +
        `- 重点: ${plan.analysisStrategy.focus}`
      );
    }

    if (this.tools) {
      parts.push(`\n可用工具:\n${this.getAvailableTools()}`);
    }

    return parts.join('\n\n');
  }

  /**
   * 从工具结果中提取数据项
   */
  private extractItems(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    }
    if (result?.items) {
      return result.items;
    }
    if (result?.data) {
      return result.data;
    }
    return [];
  }

  /**
   * 调整执行（用于返工）
   */
  async revise(result: ExecutionResult, feedback: string): Promise<ExecutionResult> {
    console.log(`[ReActAgent ${this.name}] 根据反馈调整...`);

    const revisePrompt = `
原始执行结果:
${JSON.stringify(result.content)}

反馈意见:
${feedback}

请根据反馈改进结果，返回优化后的内容。
`;

    const revisedSummary = await this.callLLM(revisePrompt);

    return {
      ...result,
      content: {
        ...result.content,
        summary: revisedSummary
      }
    };
  }
}
