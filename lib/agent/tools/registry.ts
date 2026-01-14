/**
 * 工具注册表
 * 管理 Agent 可用的所有工具
 */

import { Message } from './types.js';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`Tool registered: ${tool.name}`);
  }

  /**
   * 批量注册工具
   */
  registerTools(tools: Tool[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * 注册函数作为工具
   */
  registerFunction(
    name: string,
    description: string,
    fn: (args: any) => any,
    parameters?: Record<string, any>
  ): void {
    this.registerTool({
      name,
      description,
      parameters: parameters || {},
      execute: async (args) => fn(args)
    });
  }

  /**
   * 获取工具
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 列出所有工具
   */
  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 调用工具
   */
  async call(name: string, args: Record<string, any>): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const result = await tool.execute(args);
      return result;
    } catch (error) {
      console.error(`Tool ${name} execution failed:`, error);
      throw error;
    }
  }

  /**
   * 格式化工具列表为 LLM 提示
   */
  formatForLLM(): string {
    const tools = this.listTools();
    if (tools.length === 0) {
      return 'No tools available.';
    }

    return tools
      .map((tool) => {
        const params = Object.keys(tool.parameters || {}).length > 0
          ? `\n   参数: ${JSON.stringify(tool.parameters)}`
          : '';
        return `- ${tool.name}: ${tool.description}${params}`;
      })
      .join('\n');
  }
}

/**
 * 工具基类
 */
export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, any>;

  abstract execute(args: any): Promise<any>;
}
