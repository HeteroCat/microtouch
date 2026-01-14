
/**
 * AnalyzeSearchTool - 搜索结果分析工具
 * 对搜索结果进行聚合、去重、提取关键信息
 */

import { Tool } from './registry';
import { HelloAgentsLLM } from '../core/llm';

export class AnalyzeSearchTool implements Tool {
    name = 'analyze_search_results';
    description = '分析搜索结果，提取关键主题、趋势和重要信息，进行去重和总结';

    private llm: HelloAgentsLLM;

    constructor() {
        this.llm = new HelloAgentsLLM();
    }

    parameters = {
        type: 'object',
        properties: {
            searchResults: {
                type: 'array',
                description: '需要分析的搜索结果列表'
            },
            content: {
                type: 'string',
                description: '或者作为字符串传入的内容'
            },
            focus: {
                type: 'string',
                description: '分析重点（可选）'
            }
        },
        // 允许 searchResults 或 content
        required: []
    };

    /**
     * 执行分析
     */
    async execute(params: any): Promise<any> {
        const { searchResults, content, focus } = params;

        // 统一处理输入
        let itemsToAnalyze: any[] = [];
        if (Array.isArray(searchResults)) {
            itemsToAnalyze = searchResults;
        } else if (typeof content === 'string') {
            try {
                itemsToAnalyze = JSON.parse(content);
            } catch {
                itemsToAnalyze = [{ content }];
            }
        } else if (params.items) {
            itemsToAnalyze = params.items;
        }

        if (itemsToAnalyze.length === 0) {
            return {
                summary: "没有提供搜索结果进行分析。",
                keyThemes: []
            };
        }

        console.log(`[AnalyzeSearchTool] 分析 ${itemsToAnalyze.length} 条数据`);

        // 构建 LLM 提示词
        const itemsText = JSON.stringify(itemsToAnalyze.slice(0, 20)).slice(0, 3000); // 限制上下文长度

        const prompt = `
请分析以下搜索结果数据：

数据内容:
${itemsText}

${focus ? `请重点关注: ${focus}` : ''}

请执行以下任务：
1. 提取 3-5 个核心主题或关键发现
2. 识别数据中的主要趋势
3. 总结有价值的信息点
4. 过滤掉不相关或低质量的内容

请返回分析结果（JSON格式）：
{
    "summary": "简要总结（200字以内）",
    "keyThemes": ["主题1", "主题2", ...],
    "highValueItems": [索引列表],
    "analysis": "详细分析内容"
}
`;

        try {
            const response = await this.llm.chat([
                { role: 'system', content: '你是一个专业的数据分析师。' },
                { role: 'user', content: prompt }
            ]);

            try {
                // 尝试解析 JSON
                const jsonStr = response.content.match(/\{[\s\S]*\}/)?.[0] || response.content;
                return JSON.parse(jsonStr);
            } catch (e) {
                // 如果解析失败，返回原始文本
                return {
                    summary: response.content.slice(0, 200),
                    analysis: response.content,
                    keyThemes: []
                };
            }
        } catch (error) {
            console.error('[AnalyzeSearchTool] 分析失败:', error);
            return {
                error: '分析过程中发生错误',
                originalCount: itemsToAnalyze.length
            };
        }
    }
}
