import type {
  CreateFederatedSourceInput as ContractsCreateFederatedSourceInput,
  FederatedDocument as ContractsFederatedDocument,
  FederatedScanJob as ContractsFederatedScanJob,
  FederatedScanJobStatus as ContractsFederatedScanJobStatus,
  FederatedScanMode as ContractsFederatedScanMode,
  FederatedScanRun as ContractsFederatedScanRun,
  FederatedScanStatus as ContractsFederatedScanStatus,
  FederatedSearchHit as ContractsFederatedSearchHit,
  FederatedSource as ContractsFederatedSource,
  FederatedSourceKind as ContractsFederatedSourceKind,
  FederatedSourceStatus as ContractsFederatedSourceStatus,
  UpdateFederatedSourceInput as ContractsUpdateFederatedSourceInput,
} from '@knowledge-base/contracts';

export type FederatedSourceKind = ContractsFederatedSourceKind;
export type FederatedSourceStatus = ContractsFederatedSourceStatus;
export type FederatedScanStatus = ContractsFederatedScanStatus;
export type FederatedScanMode = ContractsFederatedScanMode;
export type FederatedScanJobStatus = ContractsFederatedScanJobStatus;
export type FederatedSourceRecord = ContractsFederatedSource;
export type FederatedDocumentRecord = ContractsFederatedDocument;
export type FederatedScanRunRecord = ContractsFederatedScanRun;
export type FederatedScanJobRecord = ContractsFederatedScanJob;
export type CreateFederatedSourceInput = ContractsCreateFederatedSourceInput;
export type UpdateFederatedSourceInput = ContractsUpdateFederatedSourceInput;

export interface LocalFilesystemDocument {
  externalId: string;
  path: string;
  title: string;
  content: string;
  hash: string;
  sizeBytes: number;
  mimeType: string;
  modifiedAt: string;
  metadata: Record<string, unknown>;
}

export type FederatedSearchItem = ContractsFederatedSearchHit;
