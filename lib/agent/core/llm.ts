/**
 * LLM 抽象层
 * 支持多种 LLM 提供商（OpenAI、通义千问、DeepSeek、Kimi 等）
 */

export interface LLMConfig {
  modelId: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export class LLM {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 60000,
      ...config
    };
  }

  /**
   * 聊天接口
   */
  async chat(messages: Array<{role: string; content: string}>): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.modelId,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusCode} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  /**
   * 流式聊天接口
   */
  async *chatStream(messages: Array<{role: string; content: string}>): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.modelId,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      }),
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusCode} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

/**
 * LLM 提供商配置
 */
interface ProviderConfig {
  modelId: string;
  apiKey: string;
  baseUrl: string;
}

/**
 * 获取可用的 LLM 提供商配置
 * 优先级：DeepSeek > OpenAI > 通义千问 > Kimi > ModelScope
 */
function getProviderConfig(): ProviderConfig {
  // 1. DeepSeek (默认首选)
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('✓ Using DeepSeek');
    return {
      modelId: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com'
    };
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log('✓ Using OpenAI');
    return {
      modelId: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com'
    };
  }

  // 3. 通义千问
  if (process.env.DASHSCOPE_API_KEY) {
    console.log('✓ Using 通义千问');
    return {
      modelId: 'qwen-plus',
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    };
  }

  // 4. Kimi (Moonshot)
  if (process.env.MOONSHOT_API_KEY) {
    console.log('✓ Using Kimi');
    return {
      modelId: 'moonshot-v1-8k',
      apiKey: process.env.MOONSHOT_API_KEY,
      baseUrl: 'https://api.moonshot.cn/v1'
    };
  }

  // 5. ModelScope
  if (process.env.MODELSCOPE_API_KEY) {
    console.log('✓ Using ModelScope');
    return {
      modelId: 'qwen-plus',
      apiKey: process.env.MODELSCOPE_API_KEY,
      baseUrl: 'https://api-inference.modelscope.cn/v1'
    };
  }

  // 6. 旧版环境变量（兼容）
  const legacyModelId = process.env.LLM_MODEL_ID;
  const legacyApiKey = process.env.LLM_API_KEY;
  const legacyBaseUrl = process.env.LLM_BASE_URL;

  if (legacyApiKey) {
    console.log('✓ Using legacy LLM config');
    return {
      modelId: legacyModelId || 'gpt-4',
      apiKey: legacyApiKey,
      baseUrl: legacyBaseUrl || 'https://api.openai.com'
    };
  }

  throw new Error(
    'No LLM API key found. Please configure at least one of:\n' +
    '- DEEPSEEK_API_KEY (recommended)\n' +
    '- OPENAI_API_KEY\n' +
    '- DASHSCOPE_API_KEY\n' +
    '- MOONSHOT_API_KEY\n' +
    '- MODELSCOPE_API_KEY'
  );
}

/**
 * HelloAgentsLLM - 预配置的 LLM 实例
 * 自动选择可用的 LLM 提供商
 */
export class HelloAgentsLLM extends LLM {
  constructor(provider?: string) {
    let config: ProviderConfig;

    // 如果指定了 provider，使用指定配置
    if (provider) {
      config = getProviderConfig();
      console.log(`Using provider: ${provider}`);
    } else {
      // 否则自动选择最佳配置
      config = getProviderConfig();
    }

    super({
      modelId: config.modelId,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      temperature: 0.7,
      maxTokens: 8192,
      timeout: 120000
    });
  }
}
