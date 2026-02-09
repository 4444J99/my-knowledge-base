import { AtomicUnit } from './types.js';
import { AppError } from './logger.js';

const UNIT_SORT_FIELD_MAP: Record<string, string> = {
  timestamp: 'timestamp',
  created: 'created',
  title: 'title',
  type: 'type',
  category: 'category',
};

export function parseIntParam(
  value: string | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new AppError(`Invalid ${name}`, 'INVALID_PARAMETER', 400);
  }
  if (parsed < min || parsed > max) {
    throw new AppError(`Invalid ${name}`, 'INVALID_PARAMETER', 400);
  }
  return parsed;
}

export function parseWeightParam(value: string | undefined, name: string, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new AppError(`Invalid ${name}`, 'INVALID_PARAMETER', 400);
  }
  return parsed;
}

export function parseIsoDateParam(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${name}`, 'INVALID_PARAMETER', 400);
  }
  return parsed.toISOString();
}

export function parseUnitSortField(value: string | undefined): string {
  const sortBy = value?.trim().toLowerCase() || 'timestamp';
  const mapped = UNIT_SORT_FIELD_MAP[sortBy];
  if (!mapped) {
    throw new AppError('Invalid sortBy', 'INVALID_PARAMETER', 400, {
      allowedSortBy: Object.keys(UNIT_SORT_FIELD_MAP),
    });
  }
  return mapped;
}

export function parseSortOrder(value: string | undefined): 'ASC' | 'DESC' {
  const sortOrder = value?.trim().toUpperCase() || 'DESC';
  if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
    throw new AppError('Invalid sortOrder', 'INVALID_PARAMETER', 400, {
      allowedSortOrder: ['ASC', 'DESC'],
    });
  }
  return sortOrder;
}

/**
 * Format atomic unit for API response
 */
export function formatUnit(unit: AtomicUnit, options?: { includeSensitive?: boolean }): Record<string, any> {
  const record: Record<string, any> = {
    id: unit.id,
    type: unit.type,
    title: unit.title,
    content: unit.content,
    context: unit.context,
    category: unit.category,
    tags: typeof unit.tags === 'string' ? JSON.parse(unit.tags) : unit.tags,
    keywords: typeof unit.keywords === 'string' ? JSON.parse(unit.keywords) : unit.keywords,
    conversationId: unit.conversationId,
    timestamp: unit.timestamp,
  };

  if (options?.includeSensitive === false) {
    delete record.context;
    delete record.keywords;
    delete record.conversationId;
  }

  return record;
}
