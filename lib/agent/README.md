# 智能体搜索系统

基于 HelloAgents 设计的 Node.js/TypeScript 三 Agent 协作系统，支持跨数据源智能搜索、分析和多渠道推送。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                         │
│                   (三 Agent 协作编排器)                        │
└────────────┬────────────────────────────────┬────────────────┘
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │   PlanAgent     │              │   ReActAgent   │
    │  (规划智能体)     │─────────────▶│  (执行智能体)   │
    │                 │   Plan       │                │
    │ - 分析意图       │              │ - 调用工具      │
    │ - 检查配置       │◀──────────────│ - 多步推理      │
    │ - 制定计划       │   Feedback   │ - 生成总结      │
    └─────────────────┘              └────────┬───────┘
                                               │
                                               ▼
                                        ┌──────▼────────┐
                                        │  ReviewAgent  │
                                        │  (审核智能体)  │
                                        │               │
                                        │ - 质量审核     │
                                        │ - 决定推送     │
                                        │ - 多渠道分发   │
                                        └───────────────┘
```

## 核心组件

### 1. AgentOrchestrator (编排器)

协调三个 Agent 的完整协作流程，支持迭代优化。

```typescript
import { AgentOrchestrator } from '@/lib/agent';

const orchestrator = new AgentOrchestrator(
  async (userId: string) => {
    // 检查用户配置的数据源
    const sources = await db.getUserSources(userId, true);
    return sources.map(s => ({
      id: s.id,
      type: s.type,
      name: s.name,
      enabled: s.enabled
    }));
  },
  pushManager
);

// 执行完整流程
const result = await orchestrator.process(userQuery, userId, {
  reportType: 'deep-research', // 或 'daily-brief'
  pushTargets: [
    { type: 'email', config: { to: 'user@example.com' } },
    { type: 'feishu', config: { webhookUrl: '...' } },
    { type: 'app', config: { userId } }
  ]
});

// 快速搜索模式
const quickResult = await orchestrator.quickSearch(query, {
  sources: ['wechat', 'knowledge', 'rss']
});
```

### 2. PlanAgent (规划智能体)

- **职责**：分析用户意图，制定执行计划
- **输入**：用户查询、用户配置
- **输出**：执行计划 (Plan)

```typescript
const plan = await planAgent.makePlan(userQuery, userId);
// plan.mode: 'search' | 'analyze'
// plan.reportType: 'deep-research' | 'daily-brief'
```

### 3. ReActAgent (执行智能体)

- **职责**：执行计划，调用工具，生成结果
- **模式**：ReAct (Reasoning + Acting) 循环
- **支持**：多步推理、自我反思

```typescript
const result = await reactAgent.execute(plan, userQuery);
// result.success: boolean
// result.content: { items, summary, metadata }
// result.confidence: number
```

### 4. ReviewAgent (审核智能体)

- **职责**：审核结果质量，决定推送或返工
- **标准**：准确性、完整性、相关性、可读性

```typescript
const review = await reviewAgent.review(result, userQuery, plan);
// review.action: 'push' | 'revise' | 'replan'
```

## 数据源类型

### WeChat (微信)
- 公众号文章搜索
- 支持关键词和时间范围过滤

### Knowledge (知识库)
- 用户配置的知识库搜索
- 全文搜索和相关性排序

### RSS (订阅源)
- 默认源：36氪、虎嗅、IT之家、InfoQ
- 支持自定义 RSS 源

## 报告类型

### Deep Research (深度研究)
- **用途**：复杂问题的全面分析
- **深度**：多轮搜索 (3 轮)
- **时间范围**：30 天
- **字数**：~2000 字
- **结构**：执行摘要、背景分析、核心发现、数据支持、趋势洞察、关联分析、结论与建议

### Daily Brief (简要日报)
- **用途**：快速获取最新动态
- **深度**：单轮搜索
- **时间范围**：7 天
- **字数**：~500 字
- **结构**：核心摘要、关键要点、数据来源

## API 接口

### 1. 搜索接口

**POST** `/api/agent/search`

```json
{
  "query": "AI 大模型最新趋势",
  "userId": "user-123",
  "mode": "full",
  "reportType": "deep-research",
  "pushTargets": [
    { "type": "email", "config": { "to": "user@example.com" } }
  ]
}
```

**GET** `/api/agent/search?query=...&userId=...&mode=quick`

支持流式响应 (SSE)。

### 2. 数据源管理

**GET** `/api/agent/sources?userId=...&enabledOnly=true`

获取用户的数据源列表。

**POST** `/api/agent/sources`

```json
{
  "userId": "user-123",
  "type": "rss",
  "name": "TechCrunch",
  "config": { "url": "https://techcrunch.com/feed/" },
  "enabled": true,
  "schedule": "0 */6 * * *"
}
```

**PUT** `/api/agent/sources`

```json
{
  "sourceId": "source-123",
  "updates": { "enabled": false }
}
```

**DELETE** `/api/agent/sources?sourceId=...`

### 3. 初始化

**POST** `/api/agent/init`

```json
{
  "userId": "user-123",
  "initDefaults": true
}
```

初始化默认 RSS 源。

### 4. 统计信息

**GET** `/api/agent/stats?userId=...`

获取用户统计数据。

## 环境配置

### 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# LLM (选择一个)
OPENAI_API_KEY=sk-...
DASHSCOPE_API_KEY=sk-...  # 通义千问
DEEPSEEK_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...   # Kimi
MODELSCOPE_API_KEY=...

# 邮件 (可选)
RESEND_API_KEY=re_...

# 微信 (可选)
WECHAT_ACCESS_TOKEN=...
```

### 数据库表

系统需要以下 Supabase 表：

- `source_configs` - 数据源配置
- `monitor_jobs` - 监控任务记录
- `push_logs` - 推送日志

创建表请参考 `/scripts/init-db.sql`。

## 使用示例

### 完整三 Agent 流程

```typescript
import { AgentOrchestrator } from '@/lib/agent';
import { db } from '@/lib/db-queries';

// 1. 创建编排器
const orchestrator = new AgentOrchestrator(
  async (userId) => await db.getUserSources(userId, true),
  new PushManager()
);

// 2. 执行搜索
const result = await orchestrator.process(
  '分析最近一周的 AI 行业动态',
  userId,
  {
    reportType: 'daily-brief',
    pushTargets: [
      { type: 'email', config: { to: 'user@example.com' } },
      { type: 'app', config: { userId } }
    ]
  }
);

console.log(result.success, result.iterations);
```

### 快速搜索

```typescript
const quickResult = await orchestrator.quickSearch('Python 最新特性', {
  sources: ['wechat', 'knowledge'],
  reportType: 'daily-brief'
});
```

### 自定义工具

```typescript
import { ToolRegistry, Tool } from '@/lib/agent';

class CustomSearchTool implements Tool {
  name = 'custom_search';
  description = '自定义搜索工具';

  async execute(params: any) {
    // 实现搜索逻辑
    return { items: [], total: 0 };
  }
}

const tools = new ToolRegistry();
tools.registerTool(new CustomSearchTool());

const result = await orchestrator.process(query, userId, { tools });
```

## 默认 RSS 源

系统预配置了以下 RSS 源：

- **36氪** - 科技创业资讯
- **虎嗅网** - 商业科技分析
- **IT之家** - 数码科技新闻
- **InfoQ AI** - AI 技术文章

可以通过 `/api/agent/init` 接口初始化到用户配置中。

## 推送渠道

### 邮件 (Email)
- 支持 Resend 或 Supabase 邮件服务
- HTML 格式报告

### 飞书 (Feishu)
- Webhook 消息推送
- 支持富文本格式

### 应用内 (App)
- 保存到 notifications 表
- 支持分类和已读状态

## 错误处理

系统内置完善的错误处理：

- API 调用失败自动重试
- 达到最大迭代次数后强制返回
- 错误计数和降级策略
- 详细的错误日志

## 性能优化

- 工具结果缓存
- 流式响应支持
- 并行工具调用
- 连接池管理

## 开发指南

### 添加新的数据源类型

1. 创建新的 Tool 类

```typescript
// lib/agent/tools/custom-source-tool.ts
export class CustomSourceTool implements Tool {
  name = 'custom_source';
  description = '自定义数据源';

  async execute(params: any) {
    // 实现逻辑
  }
}
```

2. 注册到 ToolRegistry

```typescript
tools.registerTool(new CustomSourceTool());
```

3. 在 PlanAgent 中添加识别逻辑

### 添加新的推送渠道

1. 在 PushManager 中添加方法

```typescript
async sendCustom(config: any, content: PushContent) {
  // 实现推送逻辑
}
```

2. 更新 pushToTargets 方法

3. 在 types 中添加类型定义

## 许可证

MIT
