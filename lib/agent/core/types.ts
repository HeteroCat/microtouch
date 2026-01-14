/**
 * Agent 消息类型定义
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

export interface Thought {
  needsTool: boolean;
  toolName?: string;
  args?: Record<string, any>;
  confidence?: number;
  reasoning?: string;
  answer?: string;
}

export interface AgentConfig {
  name: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  tools?: ToolRegistry;
}

export interface ExecutionResult {
  success: boolean;
  content: {
    items?: any[];
    summary: string;
    metadata?: Record<string, any>;
  };
  confidence: number;
  iterations?: number;
  error?: string;
}

export interface Plan {
  mode: 'search' | 'analyze';
  reportType: 'deep-research' | 'daily-brief';
  dataSourceIds?: string[];
  searchStrategy?: {
    sources: string[];
    keywords: string[];
    depth: number;
    timeRange?: string;
  };
  analysisStrategy?: {
    scope: string;
    angle: string[];
    focus: string;
  };
  reportFormat: {
    structure: string[];
    includeLinks: boolean;
    maxLength?: number;
    detailLevel: 'comprehensive' | 'concise';
  };
}

export interface ReviewResult {
  passed: boolean;
  feedback?: string;
  action: 'push' | 'revise' | 'replan';
  revisionType?: 'content' | 'strategy';
  forced?: boolean;
}
