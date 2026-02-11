import { extname } from 'path';
import { createHash } from 'crypto';
import { RedactionService } from '../redaction-service.js';

export interface IntakePolicyDecision {
  allowed: boolean;
  quarantined: boolean;
  reasons: string[];
  redactedContent: string;
  redacted: boolean;
  detections: Array<{
    type: string;
    confidence: number;
    masked: string;
  }>;
}

export interface IntakePolicyConfig {
  blockedPathPatterns?: RegExp[];
  blockedExtensions?: string[];
  maxFileBytes?: number;
  sampleScanBytes?: number;
}

const DEFAULT_BLOCKED_PATH_PATTERNS = [
  /(^|\/)\.git(\/|$)/i,
  /(^|\/)node_modules(\/|$)/i,
  /(^|\/)artifacts\/secrets(\/|$)/i,
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)\.ssh(\/|$)/i,
];

const DEFAULT_BLOCKED_EXTENSIONS = [
  '.pem',
  '.key',
  '.p12',
  '.pfx',
  '.der',
  '.crt',
  '.cer',
];

export class IntakePolicyEngine {
  private readonly redactor: RedactionService;
  private readonly blockedPathPatterns: RegExp[];
  private readonly blockedExtensions: Set<string>;
  private readonly maxFileBytes: number;
  private readonly sampleScanBytes: number;

  constructor(config: IntakePolicyConfig = {}) {
    this.redactor = new RedactionService({
      detectSecrets: true,
      detectPII: true,
      confidenceThreshold: 0.55,
      maskFormat: 'full',
      auditLog: false,
    });
    this.blockedPathPatterns = config.blockedPathPatterns ?? DEFAULT_BLOCKED_PATH_PATTERNS;
    this.blockedExtensions = new Set(
      (config.blockedExtensions ?? DEFAULT_BLOCKED_EXTENSIONS).map((ext) => ext.toLowerCase()),
    );
    this.maxFileBytes = config.maxFileBytes ?? 25 * 1024 * 1024;
    this.sampleScanBytes = config.sampleScanBytes ?? 2 * 1024 * 1024;
  }

  evaluate(input: { relativePath: string; rawContent: string; bytes: number }): IntakePolicyDecision {
    const reasons: string[] = [];
    const loweredPath = input.relativePath.toLowerCase();

    if (input.bytes > this.maxFileBytes) {
      reasons.push(`file exceeds max bytes (${input.bytes} > ${this.maxFileBytes})`);
    }

    if (this.blockedPathPatterns.some((pattern) => pattern.test(loweredPath))) {
      reasons.push('path blocked by policy');
    }

    const extension = extname(loweredPath);
    if (extension && this.blockedExtensions.has(extension)) {
      reasons.push(`extension blocked by policy (${extension})`);
    }

    const sample = input.rawContent.slice(0, this.sampleScanBytes);
    const sampleDetections = this.redactor
      .detect(sample)
      .filter((item) => !item.isFalsePositive && item.confidence >= 0.55);

    const shouldRunFullRedaction =
      input.rawContent.length <= this.sampleScanBytes || sampleDetections.length > 0;

    const redactionResult = shouldRunFullRedaction
      ? this.redactor.redact(input.rawContent)
      : {
          originalText: input.rawContent,
          redactedText: input.rawContent,
          detectedItems: sampleDetections.map((item) => ({
            ...item,
            startIndex: item.startIndex,
            endIndex: item.endIndex,
            isFalsePositive: false,
          })),
          stats: {
            totalDetected: sampleDetections.length,
            secretsDetected: sampleDetections.length,
            piiDetected: 0,
            falsePositives: 0,
            itemsRedacted: 0,
          },
        };
    const hasCriticalFindings = redactionResult.detectedItems.some(
      (item) => !item.isFalsePositive && item.confidence >= 0.9,
    );

    if (hasCriticalFindings) {
      reasons.push('high-confidence sensitive material detected');
    }

    const quarantined = reasons.length > 0;

    return {
      allowed: !quarantined,
      quarantined,
      reasons,
      redactedContent: redactionResult.redactedText,
      redacted: redactionResult.stats.itemsRedacted > 0,
      detections: redactionResult.detectedItems
        .filter((item) => !item.isFalsePositive)
        .map((item) => ({
          type: item.type,
          confidence: item.confidence,
          masked: item.masked,
        })),
    };
  }

  static contentHash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
