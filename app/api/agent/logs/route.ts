/**
 * Agent Logs API
 * 推送日志查询接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-queries';

// GET - 获取推送日志
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pushType = searchParams.get('pushType') as 'email' | 'feishu' | 'app' | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 }
      );
    }

    const logs = await db.getUserPushLogs(userId, {
      limit,
      offset,
      pushType: pushType || undefined
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('[API] GET /agent/logs error:', error);
    return NextResponse.json(
      { error: error.message || '获取日志失败' },
      { status: 500 }
    );
  }
}
