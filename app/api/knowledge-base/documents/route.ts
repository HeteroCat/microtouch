/**
 * 知识库文档列表 API
 * GET /api/knowledge-base/documents - 获取所有文档或单个文档内容
 * DELETE /api/knowledge-base/documents - 删除指定文档
 */

import { NextRequest, NextResponse } from 'next/server';
import { listDocuments, deleteDocument, getDocumentById } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // 如果提供了 ID，则返回该文档的详细内容
        if (id) {
            const result = await getDocumentById(id);
            if (result.success) {
                return NextResponse.json({
                    success: true,
                    document: result.document
                });
            } else {
                return NextResponse.json(
                    { success: false, error: result.error || '未找到文档' },
                    { status: 404 }
                );
            }
        }

        // 默认返回列表
        const result = await listDocuments();

        if (result.success) {
            return NextResponse.json({
                success: true,
                documents: result.documents || [],
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error || '获取文档列表失败' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Documents API error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '服务器错误' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: '未提供文档 ID' },
                { status: 400 }
            );
        }

        const result = await deleteDocument(id);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: '文档删除成功',
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error || '删除失败' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Delete document API error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '服务器错误' },
            { status: 500 }
        );
    }
}
