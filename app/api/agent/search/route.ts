/**
 * Agent Search API
 * 简化的工具注册 - 只保留核心搜索工具
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { db } from '@/lib/db-queries';
import { PushManager } from '@/lib/agent/push-manager';
import { ToolRegistry } from '@/lib/agent/tools/registry';
import { GoogleSearchTool } from '@/lib/agent/tools/google-search-tool';
import { WeChatSearchTool } from '@/lib/agent/tools/wechat-search-tool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, mode, userId, reportType, pushTargets } = body;

    if (!query) {
      return NextResponse.json({ error: '缺少 query 参数' }, { status: 400 });
    }

    const effectiveUserId = userId || 'anonymous';

    // 初始化工具注册表 - 只注册核心搜索工具
    const tools = new ToolRegistry();

    // 只注册搜索工具，分析和总结由 AI 直接完成
    tools.registerTool(new GoogleSearchTool() as any);
    tools.registerTool(new WeChatSearchTool() as any);

    // 初始化推送管理器
    const pushManager = new PushManager();

    // 初始化编排器
    const orchestrator = new AgentOrchestrator(
      async (uid) => db.getUserSources(uid),
      pushManager
    );

    let result;
    const mappedReportType = reportType;

    if (mode === 'quick') {
      // 快速搜索模式
      result = await orchestrator.quickSearch(query, {
        reportType: mappedReportType,
        tools
      });
    } else {
      // 完整三Agent流程
      result = await orchestrator.process(query, effectiveUserId, {
        reportType: mappedReportType,
        pushTargets,
        tools
      });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API] /agent/search error:', error);
    return NextResponse.json(
      { error: error.message || '搜索处理失败', success: false },
      { status: 500 }
    );
  }
}