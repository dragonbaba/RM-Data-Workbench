import { BACKSLASH_REGEXP } from '../constants/regexp';

type RecordLike = Record<string, unknown>;

export const SYSTEM_FILE_NAME = 'System.json';

const normalizePath = (value: string) => (value || '').replace(BACKSLASH_REGEXP, '/');

export const extractFileNameFromPath = (filePath: string): string => {
  const normalized = normalizePath(filePath);
  return normalized.split('/').pop() || '';
};

export const extractSystemRecord = (data: unknown): RecordLike | null => {
  if (Array.isArray(data)) {
    if (data.length < 2) return null;
    const wrapped = data[1];
    if (!wrapped || typeof wrapped !== 'object' || Array.isArray(wrapped)) {
      return null;
    }
    return wrapped as RecordLike;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  return data as RecordLike;
};

export const normalizeStandardDataForEditor = (fileName: string, data: unknown): unknown[] | null => {
  if (Array.isArray(data)) return data;
  if (fileName.toLowerCase() === SYSTEM_FILE_NAME.toLowerCase()) {
    const systemRecord = extractSystemRecord(data);
    return systemRecord ? [null, systemRecord] : null;
  }
  return null;
};

export const prepareDataForWrite = (filePath: string, data: unknown): unknown => {
  const fileName = extractFileNameFromPath(filePath);
  if (fileName.toLowerCase() !== SYSTEM_FILE_NAME.toLowerCase()) {
    return data;
  }

  return extractSystemRecord(data) ?? data;
};
