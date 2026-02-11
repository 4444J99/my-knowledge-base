import { ProviderImporter, ProviderImporterContext } from './types.js';
import { ChatGPTImporter } from './chatgpt.js';
import { ClaudeImporter } from './claude.js';
import { GeminiImporter } from './gemini.js';
import { GrokImporter } from './grok.js';
import { CopilotImporter } from './copilot.js';
import { maybeJson } from './utils.js';

const DEFAULT_IMPORTERS: ProviderImporter[] = [
  new ClaudeImporter(),
  new ChatGPTImporter(),
  new GeminiImporter(),
  new GrokImporter(),
  new CopilotImporter(),
];

export interface DetectionResult {
  context: ProviderImporterContext;
  importer?: ProviderImporter;
}

export class ProviderImportDetector {
  private readonly importers: ProviderImporter[];

  constructor(importers: ProviderImporter[] = DEFAULT_IMPORTERS) {
    this.importers = importers;
  }

  detect(filePath: string, rawContent: string): DetectionResult {
    const parsedJson = maybeJson(rawContent);
    const context: ProviderImporterContext = {
      filePath,
      rawContent,
      parsedJson,
    };

    const loweredPath = filePath.toLowerCase();
    const priorityPathMatchers: Array<[string, string]> = [
      ['chatgpt', 'chatgpt'],
      ['claude', 'claude'],
      ['gemini', 'gemini'],
      ['grok', 'grok'],
      ['xai', 'grok'],
      ['copilot', 'copilot'],
      ['github', 'copilot'],
    ];

    for (const [needle, importerId] of priorityPathMatchers) {
      if (!loweredPath.includes(needle)) continue;
      const importer = this.importers.find((candidate) => candidate.id === importerId);
      if (importer && importer.canParse(context)) {
        return { context, importer };
      }
    }

    const importer = this.importers.find((candidate) => candidate.canParse(context));
    return { context, importer };
  }

  getImporters(): ProviderImporter[] {
    return [...this.importers];
  }
}
