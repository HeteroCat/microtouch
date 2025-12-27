# MicroTouch

MicroTouch 是一个极致简约而功能强大的现代化全栈工具箱，旨在提供极致的用户体验和高效的生产力工具集。

![Project Preview](/public/image/README_preview.png)

## ✨ 核心模块

### 1. 🟢 微信公众号工具箱 (WeChat Nexus)
- **智能搜索**：支持全网微信公众号搜索，实时获取认证信息、头像及简介。
- **深度提取**：一键将微信文章解析为高质量 Markdown，自动处理图片防盗链，彻底解决“裂图”烦恼。
- **批量处理**：支持文章批量选择与快速导出，极大提升内容采集效率。
- **关键词检索**：在特定公众号的历史内容中进行精准关键词搜索。

### 2. 🧠 智能知识库 (Knowledge Hub)
- **多格式支持**：支持 PDF、Word (Docx)、TXT 等多种文档格式上传。
- **语义搜索**：基于向量检索技术，实现超越关键词匹配的智能语义搜索。
- **知识管理**：构建私有知识库，支持大规模文档的快速索引与查询。

### 3. 🎨 极致视觉体验
- **Antigravity 背景**：集成基于 Three.js 的动力学粒子背景，随鼠标交互产生实时物理反馈。
- **现代 UI 设计**：采用 Glassmorphism（玻璃拟态）、渐变光晕和 3D 倾斜卡片 (Tilted Card) 设计，提供高端的视觉冲击。

## 🛠 技术栈

- **框架**: [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
- **图形**: [Three.js](https://threejs.org/) & [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **组件**: [Shadcn UI](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/)
- **文本处理**: react-markdown, mammoth (Docx), pdf-parse

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
# WeChat API Configuration
WECHAT_API_KEY=your_api_key_here
WECHAT_API_BASE_URL=https://api.example.com

# Database/Storage (Optional)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. 本地启动
```bash
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 开启体验。

## 📂 目录结构

- `app/product`: 核心功能页面（微信搜索、知识库入口）。
- `components/`: 复用 UI 组件，包含 `Antigravity` 动态背景。
- `lib/`: 核心业务逻辑（WeChat API 封装、文档解析工具）。
- `data/`: 本地数据持久化存储。

## 📄 许可证

MIT License
