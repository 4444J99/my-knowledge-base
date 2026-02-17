import { SearchFilter } from './filter-builder.js';
import type {
  ApiErrorResponse as ContractsApiErrorResponse,
  DatabaseStatsPayload as ContractsDatabaseStatsPayload,
  FederatedScanJob as ContractsFederatedScanJob,
  FederatedScanRun as ContractsFederatedScanRun,
  FederatedSearchHit as ContractsFederatedSearchHit,
  FederatedSource as ContractsFederatedSource,
  ApiListSuccess,
  ApiPageListSuccess,
  ApiSuccess,
  UnitBranchResponse as ContractsUnitBranchResponse,
  SearchFallbackReason as ContractsSearchFallbackReason,
  SearchResponse as ContractsSearchResponse,
} from '@knowledge-base/contracts';

/**
 * API error response format
 */
export type ApiErrorResponse = ContractsApiErrorResponse;

/**
 * API success response format
 */
export type ApiSuccessResponse<T> = ApiSuccess<T>;

/**
 * Paginated response format
 */
export type PaginatedResponse<T> = ApiPageListSuccess<T>;

export type SearchFallbackReason = ContractsSearchFallbackReason;

/**
 * Search response format (Phase 2)
 */
export type SearchResponse<T> = Omit<ContractsSearchResponse<T>, 'filters'> & {
  filters?: {
    applied: SearchFilter[];
    available: Array<{ field: string; buckets: Array<{ value: string; count: number }> }>;
  };
};

export type UniverseListResponse<T> = ApiListSuccess<T>;
export type OffsetListResponse<T> = ApiListSuccess<T>;

export type DatabaseStatsPayload = ContractsDatabaseStatsPayload;
export type FederatedSource = ContractsFederatedSource;
export type FederatedScanRun = ContractsFederatedScanRun;
export type FederatedScanJob = ContractsFederatedScanJob;
export type FederatedSearchHit = ContractsFederatedSearchHit;
export type UnitBranchResponse = ContractsUnitBranchResponse;
