import {
  extractFileName,
  isReloadableDataFile,
  normalizeDataPathKey,
  type DataFileChangePayload,
} from './BaseDataReloadService';

export interface ExternalDataChangeQueueOptions {
  duplicateTtlMs?: number;
}

const DEFAULT_DUPLICATE_TTL_MS = 1200;

export class ExternalDataChangeQueue {
  private readonly pending = new Map<string, DataFileChangePayload>();
  private readonly sessionSuppressedPaths = new Set<string>();
  private readonly recentlyHandledAt = new Map<string, number>();
  private readonly duplicateTtlMs: number;

  constructor(options?: ExternalDataChangeQueueOptions) {
    this.duplicateTtlMs = options?.duplicateTtlMs ?? DEFAULT_DUPLICATE_TTL_MS;
  }

  enqueue(payload: DataFileChangePayload, now = Date.now()): boolean {
    const normalized = this.normalizePayload(payload);
    if (!normalized) {
      return false;
    }

    this.pruneExpiredHandled(now);
    const normalizedPath = normalizeDataPathKey(normalized.filePath);
    if (this.sessionSuppressedPaths.has(normalizedPath)) {
      return false;
    }

    const lastHandledAt = this.recentlyHandledAt.get(normalizedPath);
    if (lastHandledAt !== undefined && now - lastHandledAt < this.duplicateTtlMs) {
      return false;
    }

    this.pending.set(normalizedPath, normalized);
    return true;
  }

  drainPending(): DataFileChangePayload[] {
    const payloads = Array.from(this.pending.values());
    this.pending.clear();
    return payloads;
  }

  markBatchHandled(payloads: Iterable<DataFileChangePayload>, now = Date.now()): string[] {
    this.pruneExpiredHandled(now);
    const handledPaths: string[] = [];

    for (const payload of payloads) {
      const normalized = this.normalizePayload(payload);
      if (!normalized) {
        continue;
      }

      const normalizedPath = normalizeDataPathKey(normalized.filePath);
      this.sessionSuppressedPaths.add(normalizedPath);
      this.recentlyHandledAt.set(normalizedPath, now);
      handledPaths.push(normalizedPath);
    }

    return handledPaths;
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  resetSession(now = Date.now()): void {
    this.pruneExpiredHandled(now);
    this.sessionSuppressedPaths.clear();
  }

  getPendingSize(): number {
    return this.pending.size;
  }

  private pruneExpiredHandled(now: number): void {
    for (const [normalizedPath, handledAt] of this.recentlyHandledAt.entries()) {
      if (now - handledAt >= this.duplicateTtlMs) {
        this.recentlyHandledAt.delete(normalizedPath);
      }
    }
  }

  private normalizePayload(payload: DataFileChangePayload): DataFileChangePayload | null {
    const fileName = payload.fileName || extractFileName(payload.filePath);
    if (!isReloadableDataFile(fileName)) {
      return null;
    }

    return {
      ...payload,
      fileName,
    };
  }
}
