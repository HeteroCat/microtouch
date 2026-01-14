/**
 * Agent Jobs API
 * 监控任务管理接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-queries';

// GET - 获取监控任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const sourceConfigId = searchParams.get('sourceConfigId');
    const pending = searchParams.get('pending') === 'true';

    if (pending) {
      // 获取待处理任务
      const limit = parseInt(searchParams.get('limit') || '10');
      const jobs = await db.getPendingJobs(limit);

      return NextResponse.json({
        success: true,
        jobs
      });
    }

    if (jobId) {
      const job = await db.getMonitorJob(jobId);

      if (!job) {
        return NextResponse.json(
          { error: '任务不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        job
      });
    }

    if (sourceConfigId) {
      const limit = parseInt(searchParams.get('limit') || '20');
      const jobs = await db.getSourceJobHistory(sourceConfigId, limit);

      return NextResponse.json({
        success: true,
        jobs
      });
    }

    return NextResponse.json(
      { error: '缺少查询参数' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[API] GET /agent/jobs error:', error);
    return NextResponse.json(
      { error: error.message || '获取任务失败' },
      { status: 500 }
    );
  }
}

// POST - 创建监控任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceConfigId } = body;

    if (!sourceConfigId) {
      return NextResponse.json(
        { error: '缺少 sourceConfigId 参数' },
        { status: 400 }
      );
    }

    const job = await db.createMonitorJob(sourceConfigId);

    return NextResponse.json({
      success: true,
      job
    });

  } catch (error: any) {
    console.error('[API] POST /agent/jobs error:', error);
    return NextResponse.json(
      { error: error.message || '创建任务失败' },
      { status: 500 }
    );
  }
}

// PATCH - 更新任务状态
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, updates } = body;

    if (!jobId || !updates) {
      return NextResponse.json(
        { error: '缺少必要参数: jobId, updates' },
        { status: 400 }
      );
    }

    const job = await db.updateMonitorJob(jobId, updates);

    return NextResponse.json({
      success: true,
      job
    });

  } catch (error: any) {
    console.error('[API] PATCH /agent/jobs error:', error);
    return NextResponse.json(
      { error: error.message || '更新任务失败' },
      { status: 500 }
    );
  }
}
