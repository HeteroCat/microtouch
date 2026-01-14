/**
 * Agent 基类
 * 所有 Agent 的基础实现
 */

import { HelloAgentsLLM } from './llm.js';
import { Message, AgentConfig, Thought } from './types.js';
import { ToolRegistry } from '../tools/registry.js';

export abstract class Agent {
  protected name: string;
  protected llm: HelloAgentsLLM;
  protected systemPrompt: string;
  protected memory: Message[] = [];
  protected tools?: ToolRegistry;
  protected config: AgentConfig;

  constructor(name: string, llm: HelloAgentsLLM, config: AgentConfig = {}) {
    this.name = name;
    this.llm = llm;
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    this.config = {
      maxSteps: 10,
      temperature: 0.7,
      ...config
    };

    if (config.tools) {
      this.tools = config.tools;
    }
  }

  /**
   * 获取默认系统提示
   */
  protected getDefaultSystemPrompt(): string {
    return `你是一个有帮助的 AI 助手 ${this.name}。`;
  }

  /**
   * 执行 Agent（子类必须实现）
   */
  abstract run(input: string, context?: any): Promise<string>;

  /**
   * 流式执行（可选实现）
   */
  async *streamRun(input: string): AsyncGenerator<string> {
    yield await this.run(input);
  }

  /**
   * 添加消息到记忆
   */
  protected addMemory(message: Message): void {
    message.timestamp = Date.now();
    this.memory.push(message);
  }

  /**
   * 清空记忆
   */
  protected clearMemory(): void {
    this.memory = [];
  }

  /**
   * 获取最近的记忆
   */
  protected getRecentMemory(count: number = 10): Message[] {
    return this.memory.slice(-count);
  }

  /**
   * 构建 LLM 消息列表
   */
  protected buildMessages(userInput: string): Array<{role: string; content: string}> {
    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: this.systemPrompt }
    ];

    // 添加历史记忆
    const recentMemory = this.getRecentMemory();
    for (const msg of recentMemory) {
      // 只保留必要角色的消息
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // 添加当前输入
    messages.push({ role: 'user', content: userInput });

    return messages;
  }

  /**
   * 调用 LLM
   */
  protected async callLLM(prompt: string): Promise<string> {
    const messages = this.buildMessages(prompt);
    const response = await this.llm.chat(messages);

    // 保存到记忆
    this.addMemory({ role: 'user', content: prompt });
    this.addMemory({ role: 'assistant', content: response.content });

    return response.content;
  }

  /**
   * 思考步骤（用于 ReAct 循环）
   */
  protected async think(context?: string): Promise<Thought> {
    const recentMemory = this.getRecentMemory(5);
    const memorySummary = recentMemory
      .map(m => `${m.role}: ${m.content.slice(0, 100)}...`)
      .join('\n');

    const prompt = `
当前上下文:
${memorySummary}

${context || ''}

请分析当前情况，决定下一步行动。
输出 JSON 格式：
{
  "needsTool": boolean,
  "toolName": "string (可选)",
  "args": object (可选),
  "confidence": number (0-1),
  "reasoning": "string (可选)",
  "answer": "string (无需工具时)"
}
`;

    const response = await this.callLLM(prompt);

    try {
      return JSON.parse(response);
    } catch {
      // 如果不是 JSON，尝试提取
      return {
        needsTool: false,
        answer: response,
        confidence: 0.8
      };
    }
  }

  /**
   * 调用工具
   */
  protected async useTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.tools) {
      throw new Error('No tools available for this agent');
    }

    const result = await this.tools.call(toolName, args);

    // 记录工具调用
    this.addMemory({
      role: 'tool',
      content: `Used ${toolName}: ${JSON.stringify(args)} -> ${JSON.stringify(result).slice(0, 200)}`
    });

    return result;
  }

  /**
   * 获取可用工具列表
   */
  protected getAvailableTools(): string {
    if (!this.tools || this.tools.listTools().length === 0) {
      return 'No tools available.';
    }
    return this.tools.formatForLLM();
  }
}
