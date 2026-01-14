# MicroTouch

MicroTouch 是一个极致简约而功能强大的现代化全栈工具箱，旨在提供极致的用户体验和高效的生产力工具集。

![Project Preview](/public/image/README_preview.png)

## ✨ 核心模块

### 1. 🟢 微信公众号工具箱 (WeChat Nexus)
- **智能搜索**：支持全网微信公众号搜索，实时获取认证信息、头像及简介。
- **深度提取**：一键将微信文章解析为高质量 Markdown，自动处理图片防盗链，彻底解决"裂图"烦恼。
- **批量处理**：支持文章批量选择与快速导出，极大提升内容采集效率。
- **关键词检索**：在特定公众号的历史内容中进行精准关键词搜索。

### 2. 🧠 智能知识库 (Knowledge Hub)
- **多格式支持**：支持 PDF、Word (Docx)、TXT 等多种文档格式上传。
- **语义搜索**：基于向量检索技术，实现超越关键词匹配的智能语义搜索。
- **知识管理**：构建私有知识库，支持大规模文档的快速索引与查询。

### 3. 🤖 智能体搜索系统 (Agent Nexus) ⭐ NEW
- **三 Agent 协作**：Plan Agent（规划）→ ReAct Agent（执行）→ Review Agent（审核）
- **智能数据源**：整合微信公众号、知识库、RSS 订阅源，AI 自动选择最优搜索策略
- **双模式报告**：
  - **深度研究报告**：多轮搜索、全面分析，约 2000 字
  - **简要日报**：快速摘要、带链接，约 500 字
- **多渠道推送**：支持邮件、飞书、应用内通知自动推送
- **默认 RSS 源**：36氪、虎嗅网、IT之家、InfoQ AI

### 4. 🎨 极致视觉体验
- **Antigravity 背景**：集成基于 Three.js 的动力学粒子背景，随鼠标交互产生实时物理反馈。
- **现代 UI 设计**：采用 Glassmorphism（玻璃拟态）、渐变光晕和 3D 倾斜卡片 (Tilted Card) 设计，提供高端的视觉冲击。

## 🛠 技术栈

- **框架**: [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
- **图形**: [Three.js](https://threejs.org/) & [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **组件**: [Shadcn UI](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/)
- **文本处理**: react-markdown, mammoth (Docx), pdf-parse
- **AI/LLM**: 多提供商支持 (OpenAI、通义千问、DeepSeek、Kimi、ModelScope)
- **数据库**: [Supabase](https://supabase.com/) (PostgreSQL)

## 🚀 快速开始

### 1. 克隆并安装
```bash
git clone https://github.com/HeteroCat/microtouch.git
cd microtouch
npm install
```

### 2. 配置环境
在项目根目录创建 `.env.local` 文件：

```env
# ========== Supabase 数据库 ==========
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# ========== LLM (选择一个或多个) ==========
# OpenAI
OPENAI_API_KEY=sk-...

# 通义千问
DASHSCOPE_API_KEY=sk-...

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# Kimi (Moonshot)
MOONSHOT_API_KEY=sk-...

# ModelScope
MODELSCOPE_API_KEY=...

# ========== 微信 API ==========
WECHAT_API_KEY=your_api_key_here
WECHAT_API_BASE_URL=https://api.example.com

# ========== 邮件推送 (可选) ==========
RESEND_API_KEY=re_...

# ========== 飞书推送 (可选) ==========
FEISHU_WEBHOOK_URL=https://open.feishu.cn/...
```

### 3. 初始化数据库

首次使用需要初始化 Supabase 数据库表：

```bash
# 运行数据库初始化脚本
# 或通过 Supabase Dashboard 执行 lib/agent/init-db.sql 中的 SQL
```

### 4. 本地启动
```bash
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 开启体验。

## 📂 目录结构

```
microtouch/
├── app/
│   ├── product/           # 核心功能页面
│   │   ├── wechat/        # 微信公众号搜索
│   │   ├── knowledge/     # 知识库管理
│   │   └── agent/         # 智能体搜索 ⭐
│   ├── api/
│   │   ├── agent/         # 智能体 API 接口 ⭐
│   │   ├── rss/           # RSS 抓取接口 ⭐
│   │   └── ...
│   └── layout.tsx
├── components/
│   ├── Antigravity/       # Three.js 动态背景
│   ├── ui/                # Shadcn UI 组件
│   └── ...
├── lib/
│   ├── agent/             # 智能体系统 ⭐ NEW
│   │   ├── agents/        # Plan/ReAct/Review Agent
│   │   ├── tools/         # 搜索工具 (WeChat/Knowledge/RSS)
│   │   ├── orchestrator.ts
│   │   ├── push-manager.ts
│   │   └── index.ts
│   ├── wechat/            # 微信 API 封装
│   ├── knowledge/         # 知识库处理
│   ├── db-queries.ts      # 数据库查询 ⭐
│   └── utils.ts
├── data/                  # 本地数据存储
└── public/
    └── image/
```

## 🔌 智能体系统 API

### 执行智能体搜索

```bash
# POST 请求
curl -X POST http://localhost:3000/api/agent/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI 大模型最新趋势",
    "userId": "user-123",
    "mode": "full",
    "reportType": "deep-research"
  }'
```

### 数据源管理

```bash
# 获取用户数据源
GET /api/agent/sources?userId=user-123

# 添加 RSS 源
POST /api/agent/sources
{
  "userId": "user-123",
  "type": "rss",
  "name": "TechCrunch",
  "config": { "url": "https://techcrunch.com/feed/" }
}
```

### 初始化默认配置

```bash
# 初始化默认 RSS 源
POST /api/agent/init
{
  "userId": "user-123",
  "initDefaults": true
}
```

## 📖 智能体系统文档

详细文档请查看 [lib/agent/README.md](lib/agent/README.md)

### 工作流程

```
用户查询
    ↓
┌───────────────┐
│  Plan Agent   │ → 分析意图、检查配置、制定计划
└───────┬───────┘
        ↓ Plan
┌───────────────┐
│  ReAct Agent  │ → 调用工具、多步推理、生成结果
└───────┬───────┘
        ↓ Result
┌───────────────┐
│ Review Agent  │ → 质量审核、决定推送/返工
└───────┬───────┘
        ↓ Push
   邮件/飞书/App
```

### 支持的数据源

| 类型 | 说明 | 默认源 |
|------|------|--------|
| **wechat** | 微信公众号文章 | 全网搜索 |
| **knowledge** | 用户知识库 | 语义搜索 |
| **rss** | RSS 订阅源 | 36氪、虎嗅、IT之家、InfoQ |

### 报告类型对比

| 特性 | 深度研究 | 简要日报 |
|------|----------|----------|
| 搜索深度 | 3 轮 | 1 轮 |
| 时间范围 | 30 天 | 7 天 |
| 报告长度 | ~2000 字 | ~500 字 |
| 适用场景 | 复杂问题分析 | 快速获取动态 |

## 🔧 开发指南

### 添加自定义数据源

1. 创建新的 Tool 类继承 `Tool` 接口
2. 实现 `execute()` 方法
3. 注册到 `ToolRegistry`

示例：

```typescript
import { Tool } from '@/lib/agent';

class CustomSourceTool implements Tool {
  name = 'custom_source';
  description = '自定义数据源';

  async execute(params: any) {
    // 实现搜索逻辑
    return { items: [], total: 0 };
  }
}

// 注册
tools.registerTool(new CustomSourceTool());
```

### 添加新的推送渠道

在 `lib/agent/push-manager.ts` 中添加推送方法：

```typescript
async sendCustom(config: any, content: PushContent) {
  // 实现推送逻辑
}
```

## 📄 许可证

MIT License

## 🙏 致谢

本项目基于以下开源项目构建：
- [Next.js](https://nextjs.org/)
- [Three.js](https://threejs.org/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/)
