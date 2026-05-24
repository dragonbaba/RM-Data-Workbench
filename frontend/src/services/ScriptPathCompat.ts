import { useEditorStore } from '../stores/editorStore';
import {
  BACKSLASH_REGEXP,
  HTTP_PROTOCOL_REGEXP,
  LEADING_DOT_SLASH_REGEXP,
  LEADING_SLASH_REGEXP,
  LEGACY_TIMESTAMP_FILE_REGEXP,
  TRAILING_PATH_SEPARATORS_REGEXP,
  WINDOWS_DRIVE_ANY_SLASH_REGEXP,
} from '../constants/regexp';

const TRANSFORM_REGEXP = TRAILING_PATH_SEPARATORS_REGEXP;
const WINDOWS_DRIVE_REGEXP = WINDOWS_DRIVE_ANY_SLASH_REGEXP;

const normalizeSlashes = (value: string): string => (value ? value.replace(BACKSLASH_REGEXP, '/') : '');

const isAbsolutePath = (value: string): boolean => {
  if (!value) return false;
  return WINDOWS_DRIVE_REGEXP.test(value) || value.startsWith('/') || value.startsWith('\\');
};

const getDataDirectory = (): string => {
  const dataPath = useEditorStore.getState().config.dataPath;
  if (!dataPath) return '';
  return normalizeSlashes(dataPath.replace(TRANSFORM_REGEXP, ''));
};

const getScriptDirectory = (): string => {
  const scriptPath = useEditorStore.getState().config.scriptSavePath;
  return scriptPath ? normalizeSlashes(scriptPath.replace(TRANSFORM_REGEXP, '')) : '';
};

const getProjectRootDirectory = (): string => {
  const dataDir = getDataDirectory();
  if (!dataDir) return '';
  const lastSlash = dataDir.lastIndexOf('/');
  if (lastSlash <= 0) return dataDir;
  return dataDir.slice(0, lastSlash);
};

const getScriptRelativePrefix = (): string => {
  const scriptDir = getScriptDirectory();
  if (!scriptDir) return '';
  const projectRoot = getProjectRootDirectory();
  if (projectRoot && scriptDir.startsWith(projectRoot)) {
    const relative = scriptDir.slice(projectRoot.length).replace(LEADING_SLASH_REGEXP, '');
    if (relative) {
      return relative;
    }
  }
  const segments = scriptDir.split('/');
  return segments.pop() || '';
};

const needsScriptsRootLeadingSlash = (relativePrefix: string): boolean => {
  return typeof relativePrefix === 'string' && relativePrefix.toLowerCase() === 'scripts';
};

const ensureScriptsRootRelativePath = (pathValue: string, relativePrefix: string): string => {
  if (!pathValue || !needsScriptsRootLeadingSlash(relativePrefix)) {
    return pathValue;
  }
  if (pathValue.startsWith('/') || pathValue.startsWith('//') || isAbsolutePath(pathValue)) {
    return pathValue;
  }
  return `/${pathValue}`;
};

export const formatStoredScriptPath = (pathValue: string): string => {
  if (!pathValue) return '';
  const trimmed = pathValue.trim();
  if (!trimmed) return '';
  const normalized = normalizeSlashes(trimmed);
  if (!normalized || HTTP_PROTOCOL_REGEXP.test(normalized)) {
    return normalized;
  }

  const scriptDir = getScriptDirectory();
  const relativePrefix = getScriptRelativePrefix();
  if (normalized.startsWith('//') && (!scriptDir || !scriptDir.startsWith('//'))) {
    return normalized;
  }
  if (isAbsolutePath(normalized)) {
    if (scriptDir && normalized.startsWith(scriptDir)) {
      const relativePath = normalized.slice(scriptDir.length).replace(LEADING_SLASH_REGEXP, '');
      if (!relativePrefix) {
        return ensureScriptsRootRelativePath(relativePath, relativePrefix);
      }
      return ensureScriptsRootRelativePath(`${relativePrefix}/${relativePath}`, relativePrefix);
    }
    return normalized;
  }

  let cleaned = normalized.replace(LEADING_DOT_SLASH_REGEXP, '');
  if (relativePrefix && !cleaned.startsWith(relativePrefix)) {
    cleaned = `${relativePrefix}/${cleaned}`;
  }
  return ensureScriptsRootRelativePath(cleaned, relativePrefix);
};

export const resolveScriptFilePath = (storedPath: string): string => {
  if (!storedPath) return '';
  const trimmed = storedPath.trim();
  if (!trimmed) return '';
  const normalized = normalizeSlashes(trimmed);
  if (!normalized || HTTP_PROTOCOL_REGEXP.test(normalized)) {
    return normalized;
  }

  const scriptDir = getScriptDirectory();
  if (normalized.startsWith('//') && (!scriptDir || !scriptDir.startsWith('//'))) {
    return normalized;
  }
  const relativePrefix = getScriptRelativePrefix();
  if (
    scriptDir &&
    relativePrefix &&
    needsScriptsRootLeadingSlash(relativePrefix) &&
    normalized.startsWith('/')
  ) {
    const trimmedLeading = normalized.replace(LEADING_SLASH_REGEXP, '');
    const lowerTrimmed = trimmedLeading.toLowerCase();
    const lowerPrefix = relativePrefix.toLowerCase();
    if (lowerTrimmed === lowerPrefix) {
      return scriptDir;
    }
    const prefixWithSlash = `${lowerPrefix}/`;
    if (lowerTrimmed.startsWith(prefixWithSlash)) {
      const relativeTail = trimmedLeading.slice(relativePrefix.length + 1);
      return normalizeSlashes(`${scriptDir}/${relativeTail}`);
    }
  }
  if (isAbsolutePath(normalized)) {
    return normalized;
  }
  if (!scriptDir) {
    return normalized.replace(LEADING_DOT_SLASH_REGEXP, '').replace(LEADING_SLASH_REGEXP, '');
  }
  let relativePath = normalized.replace(LEADING_DOT_SLASH_REGEXP, '').replace(LEADING_SLASH_REGEXP, '');
  if (relativePrefix) {
    if (relativePath === relativePrefix) {
      relativePath = '';
    } else {
      const prefixWithSlash = `${relativePrefix}/`;
      if (relativePath.startsWith(prefixWithSlash)) {
        relativePath = relativePath.slice(prefixWithSlash.length);
      }
    }
  }
  return normalizeSlashes(`${scriptDir}/${relativePath}`);
};

export const hasLegacyTimestampScriptPath = (pathValue: string): boolean => {
  if (!pathValue || typeof pathValue !== 'string') {
    return false;
  }
  return LEGACY_TIMESTAMP_FILE_REGEXP.test(normalizeSlashes(pathValue.trim()));
};

export const normalizeItemScriptPaths = (item: Record<string, unknown>): void => {
  if (!item || typeof item !== 'object' || !('scripts' in item)) {
    return;
  }
  const scripts = item.scripts as Record<string, string> | null;
  if (!scripts) return;
  const keys = Object.keys(scripts);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    scripts[key] = formatStoredScriptPath(scripts[key]);
  }
};

export const ScriptPathCompat = {
  formatStoredScriptPath,
  resolveScriptFilePath,
  hasLegacyTimestampScriptPath,
  normalizeItemScriptPaths,
};

export default ScriptPathCompat;
