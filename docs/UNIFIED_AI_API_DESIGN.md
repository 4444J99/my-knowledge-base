# Unified AI API Abstraction Design

## Overview
The goal is to provide a single, consistent interface for interacting with different LLM providers (Claude and Gemini). This allows the Personal Knowledge Database system to remain model-agnostic and leverage the strengths of each provider (e.g., Claude's prompt caching, Gemini's large context and multi-modal support).

## AIService Interface

```typescript
export interface AIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
  systemPrompt?: string;
  cachedContext?: string;
  jsonMode?: boolean;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  cost: number;
  savings: number;
}

export interface AIService {
  readonly provider: 'anthropic' | 'google';
  
  /**
   * Basic chat completion
   */
  chat(message: string, options?: AIOptions): Promise<string>;
  
  /**
   * Structured output completion (JSON)
   */
  chatJSON<T>(message: string, options?: AIOptions): Promise<T>;
  
  /**
   * Multi-turn conversation
   */
  conversation(messages: Message[], options?: AIOptions): Promise<string>;
  
  /**
   * Provider-specific token usage stats
   */
  getUsage(): AIUsage;
  
  /**
   * Reset stats for a new session
   */
  resetUsage(): void;
}
```

## Provider Implementations

### 1. ClaudeService (Anthropic)
- Already implemented in `src/claude-service.ts`.
- Needs refactoring to implement the `AIService` interface.
- Leverages `@anthropic-ai/sdk`.
- Key feature: **Prompt Caching** (ephemeral).

### 2. GeminiService (Google)
- New implementation.
- Leverages `@google/generative-ai` or Gemini's OpenAI-compatible endpoint.
- Key feature: **Large Context Window** (up to 2M tokens).
- Supports multi-modal (PDF parsing, image analysis).

## Factory Pattern

A factory will manage the instantiation of services based on configuration.

```typescript
export class AIServiceFactory {
  static create(provider: 'anthropic' | 'google', apiKey?: string, model?: string): AIService {
    if (provider === 'anthropic') {
      return new ClaudeService(apiKey, model);
    } else {
      return new GeminiService(apiKey, model);
    }
  }
  
  static fromEnv(): AIService {
    const provider = (process.env.AI_PROVIDER || 'anthropic') as 'anthropic' | 'google';
    return this.create(provider);
  }
}
```

## Advanced Features to Standardize

1. **Prompt Caching Abstraction**: Define a standard way to mark sections of a prompt as cacheable, even if the underlying provider handles it differently.
2. **Context Pruning**: Move `ContextManager` logic from `ClaudeService` to a shared utility that works across all providers.
3. **Cost Calculation**: Centralize pricing logic for different models to ensure accurate usage tracking.
4. **Retry & Rate Limiting**: Implement standard retry logic using `p-retry` and `p-limit` at the abstraction layer.
