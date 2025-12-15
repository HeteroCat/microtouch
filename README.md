# MicroTouch

MicroTouch 是一个现代化的 Next.js 全栈应用，旨在提供极致的用户体验和强大的工具集。目前核心集成了**微信公众号全网搜索与内容深度提取**功能，支持从搜索公众号到导出 Markdown 文章的一站式工作流。

![Project Preview](/public/image/README_preview.png)
*(这里可以放一张项目的预览图)*

## ✨ 核心功能：微信公众号工具箱

MicroTouch 提供了一套完整的微信公众号数据获取与处理方案：

### 1. 🔍 全网公众号搜索
- 支持搜索全网任意微信公众号。
- 实时获取公众号的基础信息、头像、认证详情及功能介绍。
- **智能图片代理**：自动处理微信图片防盗链，确保头像和封面图在第三方网页完美显示。

### 2. 📑 文章列表浏览
- 查看公众号的历史文章列表。
- 支持分页加载和最新内容实时同步。

### 3. 📝 文章 Markdown 提取
- **一键提取**：将任意微信文章的正文内容提取为高质量的 Markdown 格式。
- **完美排版**：保留原文章的标题、段落、引用、代码块等结构。
- **图片自动代理**：Markdown 内容中的所有图片链接均自动经过代理处理，防止裂图。

### 4. ⚡️ 深度关键词检索
- **公众号内搜索**：支持在**特定公众号的历史文章**中进行关键词深度搜索。
- **高亮显示**：搜索结果标题自动高亮关键词，快速定位目标内容。

## 🛠 技术栈

- **框架**: [Next.js 15](https://nextjs.org/) (App Router)
- **语言**: TypeScript
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件**: [Shadcn UI](https://ui.shadcn.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **Markdown 渲染**: react-markdown + remark-gfm
- **API 集成**: WeChat Official Account Search API

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/microtouch.git
cd microtouch
```

### 2. 安装依赖
```bash
npm install
# 或者
pnpm install
```

### 3. 配置环境变量
在项目根目录创建 `.env.local` 文件，并填入你的 API 密钥：

```env
# WeChat Search API Configuration
WECHAT_API_KEY=your_api_key_here
WECHAT_API_SECRET=your_api_secret_here
WECHAT_API_BASE_URL=https://api.example.com
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到效果。

## 📂 目录结构

- `app/product/wechat-official`: 微信公众号搜索主页面。
- `app/api/wechat/*`: 后端 API 路由（搜索、提取、图片代理等）。
- `lib/wechat-api.ts`: 封装的微信 API 调用核心类。
- `components/ui`: Shadcn UI 组件库。

## 📄 许可证

MIT License
