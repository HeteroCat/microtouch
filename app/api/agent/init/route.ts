/**
 * Agent Init API
 * 初始化默认配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, DEFAULT_RSS_SOURCES } from '@/lib/db-queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, initDefaults = true } = body;

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 }
      );
    }

    const results: any = {
      success: true,
      initialized: []
    };

    if (initDefaults) {
      // 初始化默认 RSS 源
      const rssSources = await db.initializeDefaultRSSSources(userId);
      results.initialized.push({
        type: 'rss',
        count: rssSources.length,
        sources: rssSources.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type
        }))
      });
    }

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('[API] POST /agent/init error:', error);
    return NextResponse.json(
      { error: error.message || '初始化失败' },
      { status: 500 }
    );
  }
}

// GET - 获取可用的默认配置
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      defaults: {
        rss: DEFAULT_RSS_SOURCES
      }
    });

  } catch (error: any) {
    console.error('[API] GET /agent/init error:', error);
    return NextResponse.json(
      { error: error.message || '获取默认配置失败' },
      { status: 500 }
    );
  }
}
