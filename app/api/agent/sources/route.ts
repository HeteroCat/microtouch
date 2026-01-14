/**
 * Agent Sources API
 * 数据源配置管理接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, DEFAULT_RSS_SOURCES } from '@/lib/db-queries';

// GET - 获取用户的所有数据源
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 }
      );
    }

    const sources = await db.getUserSources(userId, enabledOnly);

    return NextResponse.json({
      success: true,
      sources
    });

  } catch (error: any) {
    console.error('[API] GET /agent/sources error:', error);
    return NextResponse.json(
      { error: error.message || '获取数据源失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新数据源
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type, // 'wechat' | 'knowledge' | 'rss'
      name,
      config,
      schedule,
      enabled,
      pushTargets
    } = body;

    if (!userId || !type || !name || !config) {
      return NextResponse.json(
        { error: '缺少必要参数: userId, type, name, config' },
        { status: 400 }
      );
    }

    const source = await db.createSource(
      userId,
      type,
      name,
      config,
      { schedule, enabled, pushTargets }
    );

    return NextResponse.json({
      success: true,
      source
    });

  } catch (error: any) {
    console.error('[API] POST /agent/sources error:', error);
    return NextResponse.json(
      { error: error.message || '创建数据源失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新数据源
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, updates } = body;

    if (!sourceId || !updates) {
      return NextResponse.json(
        { error: '缺少必要参数: sourceId, updates' },
        { status: 400 }
      );
    }

    const source = await db.updateSource(sourceId, updates);

    return NextResponse.json({
      success: true,
      source
    });

  } catch (error: any) {
    console.error('[API] PUT /agent/sources error:', error);
    return NextResponse.json(
      { error: error.message || '更新数据源失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除数据源
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: '缺少 sourceId 参数' },
        { status: 400 }
      );
    }

    await db.deleteSource(sourceId);

    return NextResponse.json({
      success: true,
      message: '数据源已删除'
    });

  } catch (error: any) {
    console.error('[API] DELETE /agent/sources error:', error);
    return NextResponse.json(
      { error: error.message || '删除数据源失败' },
      { status: 500 }
    );
  }
}
