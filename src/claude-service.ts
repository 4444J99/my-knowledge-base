/**
 * Unified LLM service (formerly ClaudeService)
 * Supports Anthropic, OpenAI, and Ollama via AIFactory.
 */

import { config } from 'dotenv';
import { AIFactory } from './ai-factory.js';
import { AIProvider, ChatMessage } from './ai-types.js';

config();

export type { ChatMessage as ClaudeMessage };

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
  systemPrompt?: string;
  cachedContext?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalCost: number;
  cacheSavings: number;
}

export class ClaudeService {
  private provider: AIProvider;
  private model: string;
  private tokenStats: TokenUsage;

  constructor(apiKey?: string, model: string = 'claude-sonnet-4-5-20250929') {
    if (apiKey) {
      // If API key is provided directly, assume Anthropic for backward compat
      this.provider = AIFactory.createProvider('anthropic', { apiKey });
    } else {
      // Otherwise use the configured global provider
      this.provider = AIFactory.getConfiguredProvider();
    }
    
    this.model = model;
    this.tokenStats = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalCost: 0,
      cacheSavings: 0,
    };
  }

  /**
   * Send a message to the LLM
   */
  async chat(
    userMessage: string,
    options: ClaudeOptions = {}
  ): Promise<string> {
    const {
      model = this.model,
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
      cachedContext,
    } = options;

    const messages: ChatMessage[] = [];

    // Combine system prompt and cached context into system message(s)
    if (systemPrompt || cachedContext) {
      const systemContent = [systemPrompt, cachedContext].filter(Boolean).join('\n\n');
      messages.push({ role: 'system', content: systemContent });
    }

    messages.push({ role: 'user', content: userMessage });

    try {
      const response = await this.provider.chat(messages, {
        model,
        maxTokens,
        temperature,
      });

      // Rough token estimation since unified provider abstraction might not return usage yet
      // This is a placeholder for stats until we strictly type response usage
      this.updateTokenStats({ input_tokens: userMessage.length / 4, output_tokens: response.length / 4 });

      return response;
    } catch (error) {
      console.error('Error calling LLM Provider:', error);
      throw error;
    }
  }

  /**
   * Multi-turn conversation with context
   */
  async conversation(
    messages: ChatMessage[],
    options: ClaudeOptions = {}
  ): Promise<string> {
    const {
      model = this.model,
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
      cachedContext,
    } = options;

    const fullMessages: ChatMessage[] = [];

    if (systemPrompt || cachedContext) {
      const systemContent = [systemPrompt, cachedContext].filter(Boolean).join('\n\n');
      fullMessages.push({ role: 'system', content: systemContent });
    }

    fullMessages.push(...messages);

    try {
      const response = await this.provider.chat(fullMessages, {
        model,
        maxTokens,
        temperature,
      });

      this.updateTokenStats({ 
        input_tokens: messages.reduce((acc, m) => acc + m.content.length, 0) / 4, 
        output_tokens: response.length / 4 
      });

      return response;
    } catch (error) {
      console.error('Error calling LLM Provider:', error);
      throw error;
    }
  }

  /**
   * Batch processing
   */
  async batchProcess(
    items: string[],
    processPrompt: (item: string) => string,
    options: ClaudeOptions = {}
  ): Promise<string[]> {
    const results: string[] = [];

    for (const item of items) {
      const userMessage = processPrompt(item);
      const result = await this.chat(userMessage, options);
      results.push(result);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Update token usage statistics
   */
  private updateTokenStats(usage: any) {
    this.tokenStats.inputTokens += usage.input_tokens || 0;
    this.tokenStats.outputTokens += usage.output_tokens || 0;
    // Costs are harder to track generically, leaving as 0 or rough estimate
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(): TokenUsage {
    return { ...this.tokenStats };
  }

  /**
   * Reset token statistics
   */
  resetStats() {
    this.tokenStats = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalCost: 0,
      cacheSavings: 0,
    };
  }

  /**
   * Print token usage summary
   */
  printStats() {
    console.log('\n📊 Token Usage Statistics (Estimated):');
    console.log(`  Input tokens: ${Math.round(this.tokenStats.inputTokens).toLocaleString()}`);
    console.log(`  Output tokens: ${Math.round(this.tokenStats.outputTokens).toLocaleString()}`);
  }
}
