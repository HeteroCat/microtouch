import { NextRequest, NextResponse } from 'next/server';
import { insertDocument } from '@/lib/db';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: '未提供文件' },
                { status: 400 }
            );
        }

        const filename = file.name;
        let content = '';

        // 根据文件类型解析内容
        if (file.type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
            const buffer = await file.arrayBuffer();
            try {
                // unpdf 的 extractText 返回的是一个对象
                const result = await extractText(new Uint8Array(buffer));

                // 核心修复：确保 content 是字符串类型
                // unpdf 返回的结构可能是 { text: string } 或 { text: string[] }
                if (result && result.text) {
                    if (Array.isArray(result.text)) {
                        content = result.text.join('\n');
                    } else {
                        content = String(result.text);
                    }
                }

                console.log(`PDF parsed: ${filename}, length: ${content?.length}`);
            } catch (pdfError: any) {
                console.error('PDF Parse detailed error:', pdfError);
                return NextResponse.json(
                    { success: false, error: `PDF解析失败: ${pdfError.message}` },
                    { status: 500 }
                );
            }
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename.toLowerCase().endsWith('.docx')
        ) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await mammoth.extractRawText({ buffer });
            content = result.value;
        } else {
            // 默认为文本文件处理 (.txt, .md, .json)
            content = await file.text();
        }

        // 再次确保内容是字符串且不为空
        const finalContent = String(content || '').trim();

        if (!finalContent) {
            return NextResponse.json(
                { success: false, error: '无法提取文件内容或内容为空，请检查文件是否为扫描件' },
                { status: 400 }
            );
        }

        // 插入到本地数据库
        const result = await insertDocument(finalContent, filename);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: '文件上传成功',
                id: result.id,
                filename,
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error || '数据库写入失败' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '服务器解析开小差了' },
            { status: 500 }
        );
    }
}
