/**
 * 本地极简向量数据库 (JSON 文件版)
 * 不需要任何外部依赖或服务，纯文件存储。
 * 核心：支持混合搜索（语义哈希 + 关键词匹配）
 */

import fs from 'fs';
import path from 'path';

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vectors.json');

// 向量维度
const VECTOR_DIM = 256;

// 数据接口
interface VectorDocument {
    id: string;
    vector: number[];
    content: string;
    filename: string;
    createdAt: number;
}

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 简单的文本向量化（模拟实现 - 多频哈希）
 */
export function textToVector(text: string): number[] {
    const vector: number[] = new Array(VECTOR_DIM).fill(0);
    const cleanText = text.toLowerCase();

    for (let i = 0; i < cleanText.length; i++) {
        const charCode = cleanText.charCodeAt(i);
        const pos = i % VECTOR_DIM;
        const shift = (i * 31) % VECTOR_DIM;

        vector[pos] += charCode * 0.1;
        vector[shift] += (charCode % 7) * 0.5;
    }

    // 归一化
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        for (let i = 0; i < VECTOR_DIM; i++) {
            vector[i] /= magnitude;
        }
    }

    return vector;
}

/**
 * 余弦相似度
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}

/**
 * 读取数据库
 */
async function loadDB(): Promise<VectorDocument[]> {
    if (!fs.existsSync(DB_FILE)) return [];
    try {
        const data = await fs.promises.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

/**
 * 保存数据库
 */
async function saveDB(data: VectorDocument[]): Promise<void> {
    await fs.promises.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 插入文档
 */
export async function insertDocument(content: string, filename: string) {
    try {
        const documents = await loadDB();
        const vector = textToVector(content);
        const id = Date.now().toString() + Math.random().toString(36).substring(7);

        documents.push({ id, vector, content, filename, createdAt: Date.now() });
        await saveDB(documents);
        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 混合搜索：向量哈希 + 关键词增强
 */
export async function searchDocuments(query: string, topK: number = 5) {
    try {
        const documents = await loadDB();
        if (documents.length === 0) return { success: true, results: [] };

        const queryVector = textToVector(query);
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

        const results = documents.map(doc => {
            // 1. 向量相似度 (语义哈希)
            const vSim = cosineSimilarity(queryVector, doc.vector);

            // 2. 关键词匹配度 (解决语义理解不足的问题)
            let keywordScore = 0;
            const contentLower = doc.content.toLowerCase();
            const filenameLower = doc.filename.toLowerCase();

            queryTerms.forEach(term => {
                const termSafe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(termSafe, 'g');

                // 2a. 文件名匹配 (权重极高)
                if (filenameLower.includes(term)) {
                    keywordScore += 0.6; // 文件名命中直接给 0.6
                }

                // 2b. 内容匹配
                if (contentLower.includes(term)) {
                    keywordScore += 0.3; // 基础内容命中奖励
                    const matches = (contentLower.match(regex) || []).length;
                    keywordScore += Math.min(matches * 0.05, 0.4); // 频次奖励
                }
            });

            // 综合相似度 (给关键词极高权重以确保"搜得到")
            const finalSim = Math.min(vSim * 0.1 + keywordScore, 0.99);

            return {
                id: doc.id,
                content: doc.content,
                filename: doc.filename,
                score: 1 - finalSim // score 表示距离，1 - score 为最终显示的相似度
            };
        });

        // 按距离升序排列
        const sorted = results.sort((a, b) => a.score - b.score).slice(0, topK);
        return { success: true, results: sorted };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 根据 ID 获取文档详情
 */
export async function getDocumentById(id: string) {
    try {
        const docs = await loadDB();
        const doc = docs.find(d => d.id === id);
        if (!doc) return { success: false, error: '未找到该文档' };

        return {
            success: true,
            document: {
                id: doc.id,
                filename: doc.filename,
                content: doc.content,
                createdAt: doc.createdAt
            }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 列出所有文档
 */
export async function listDocuments() {
    try {
        const docs = await loadDB();
        return {
            success: true,
            documents: docs.map(d => ({ id: d.id, filename: d.filename, createdAt: d.createdAt }))
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 删除文档
 */
export async function deleteDocument(id: string) {
    try {
        let docs = await loadDB();
        const initialLen = docs.length;
        docs = docs.filter(d => d.id !== id);
        if (docs.length !== initialLen) await saveDB(docs);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
