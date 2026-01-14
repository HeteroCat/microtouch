/**
 * Agent Stats API
 * 获取用户统计信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 }
      );
    }

    const stats = await db.getUserStats(userId);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('[API] GET /agent/stats error:', error);
    return NextResponse.json(
      { error: error.message || '获取统计信息失败' },
      { status: 500 }
    );
  }
}
