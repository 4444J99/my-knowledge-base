
/**
 * AI Provider Types
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stop?: string[];
  abortSignal?: AbortSignal;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  
  // Capabilities
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  embed(text: string | string[], options?: EmbeddingOptions): Promise<number[][]>;
  
  // Management
  getModels(): Promise<string[]>;
  healthCheck(): Promise<boolean>;
}

export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  organizationId?: string;
  timeoutMs?: number;
}
