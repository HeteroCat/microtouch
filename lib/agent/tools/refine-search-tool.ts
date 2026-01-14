
/**
 * RefineSearchTool - 优化搜索工具
 * 基于之前的搜索结果，优化关键词并重新搜索
 */

import { Tool } from './registry';
import { GoogleSearchTool } from './google-search-tool';

export class RefineSearchTool implements Tool {
    name = 'refine_search';
    description = '根据上下文优化搜索查询，进行更精确的二次搜索';

    private searchTool: GoogleSearchTool;

    constructor() {
        this.searchTool = new GoogleSearchTool();
    }

    parameters = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '优化后的搜索查询'
            },
            originalQuery: {
                type: 'string',
                description: '原始查询（可选）'
            },
            focus: {
                type: 'string',
                description: '关注点（可选）'
            }
        },
        required: ['query']
    };

    /**
     * 执行优化搜索
     */
    async execute(params: any): Promise<any> {
        const { query } = params;

        console.log(`[RefineSearchTool] 优化搜索: ${query}`);

        // 直接复用 search 工具的逻辑
        return this.searchTool.execute({
            query: query,
            limit: 10
        });
    }
}
