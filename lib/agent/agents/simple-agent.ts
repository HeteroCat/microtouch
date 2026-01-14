/**
 * SimpleAgent - 简单对话 Agent
 * 基础的对话功能，无工具调用
 */

import { Agent } from '../core/agent';
import { HelloAgentsLLM } from '../core/llm';
import { AgentConfig } from '../core/types';

export class SimpleAgent extends Agent {
  constructor(name: string, llm: HelloAgentsLLM, config: AgentConfig = {}) {
    const defaultPrompt = `你是一个专业、友好的 AI 助手 ${name}。
你的职责是提供准确、有帮助的回答。
回答要简洁、清晰、有条理。`;

    super(name, llm, {
      ...config,
      systemPrompt: config.systemPrompt || defaultPrompt
    });
  }

  /**
   * 执行对话
   */
  async run(input: string): Promise<string> {
    return await this.callLLM(input);
  }

  /**
   * 流式执行
   */
  async *streamRun(input: string): AsyncGenerator<string> {
    const messages = this.buildMessages(input);

    for await (const chunk of this.llm.chatStream(messages)) {
      if (!chunk.done) {
        yield chunk.content;
      }
    }
  }
}
