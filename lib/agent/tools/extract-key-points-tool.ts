
/**
 * ExtractKeyPointsTool - 关键点提取工具
 * 从文本或分析结果中提取结构化的关键点
 */

import { Tool } from './registry';
import { HelloAgentsLLM } from '../core/llm';

export class ExtractKeyPointsTool implements Tool {
    name = 'extract_key_points';
    description = '从文本或分析结果中提取关键点，按类别组织（如趋势、风险、机遇等）';

    private llm: HelloAgentsLLM;

    constructor() {
        this.llm = new HelloAgentsLLM();
    }

    parameters = {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description: '需要提取关键点的文本或JSON内容'
            },
            categories: {
                type: 'array',
                items: { type: 'string' },
                description: '自定义类别列表（可选）'
            }
        },
        required: ['content']
    };

    /**
     * 执行提取
     */
    async execute(params: any): Promise<any> {
        const { content, categories } = params;

        // 如果没有任何内容
        if (!content) {
            return {
                keyPoints: []
            };
        }

        // 处理对象输入
        let textToAnalyze = content;
        if (typeof content !== 'string') {
            textToAnalyze = JSON.stringify(content);
        }

        console.log(`[ExtractKeyPointsTool] 提取关键点`);

        const defaultCategories = ['核心观点', '主要趋势', '重要数据', '结论建议'];
        const targetCategories = categories || defaultCategories;

        const prompt = `
请从以下内容中提取关键点，并按指定类别进行组织：

内容:
${textToAnalyze.slice(0, 3000)}

请按以下类别分类提取：
${targetCategories.join(', ')}

请返回提取结果（JSON格式）：
{
    "categories": [
        {
            "name": "类别名称",
            "points": ["关键点1", "关键点2", ...]
        },
        ...
    ]
}
`;

        try {
            const response = await this.llm.chat([
                { role: 'system', content: '你是一个专业的信息提取助手。' },
                { role: 'user', content: prompt }
            ]);

            try {
                const jsonStr = response.content.match(/\{[\s\S]*\}/)?.[0] || response.content;
                return JSON.parse(jsonStr);
            } catch (e) {
                return {
                    rawResult: response.content,
                    categories: []
                };
            }
        } catch (error) {
            console.error('[ExtractKeyPointsTool] 提取失败:', error);
            return {
                error: '提取过程中发生错误'
            };
        }
    }
}
