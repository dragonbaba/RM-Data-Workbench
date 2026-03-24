import { DeleteFile, FileExists, ReadFileString, WriteFile, WriteJSON } from '../../wailsjs/go/main/App';
import { InputDialog } from '../components/common/InputDialog';
import { ToastManager } from '../components/common/ToastManager';
import { ScriptCacheManager } from './ScriptCacheManager';
import { extractScriptCode } from './ScriptContentUtils';
import { formatStoredScriptPath, hasLegacyTimestampScriptPath, normalizeItemScriptPaths, resolveScriptFilePath } from './ScriptPathCompat';
import { setEditorStore, useEditorStore } from '../stores/editorStore';

const HTTP_PROTOCOL_REGEXP = /^(https?:)?\/\//i;
const BACKSLASH_REGEXP = /\\/g;
const TRAILING_SLASH_REGEXP = /[\\/]+$/;

const normalizePath = (value: string): string => {
  if (!value) return '';
  return value.replace(BACKSLASH_REGEXP, '/').replace(TRAILING_SLASH_REGEXP, '');
};

const encodeText = (text: string): number[] => Array.from(new TextEncoder().encode(text));


const isHttpProtocol = (value: string): boolean => HTTP_PROTOCOL_REGEXP.test(value);

const buildLegacyScriptPathMessage = (pathValue: string): string =>
  `检测到旧版时间戳脚本路径，已不再兼容: ${pathValue}。请改为无时间戳文件名，例如 2_actionSequence.js`;

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return '未知错误';
  }
};

interface ScriptSaveFailure {
  summary: string;
  log: string;
}

interface PersistScriptOptions {
  action: string;
  filePath: string;
  content: string;
  scriptKey?: string;
}

const buildScriptSaveFailure = (
  options: PersistScriptOptions,
  reason: string,
  error?: unknown
): ScriptSaveFailure => {
  const normalizedContent = extractScriptCode(options.content);
  const timestamp = new Date().toISOString();
  const errorText = error ? formatError(error) : '无';
  const summary = `${options.action}失败，文件未写入，编辑器内容已保留。`;
  const log = [
    '[MyNewEditor] 脚本保存失败日志',
    `时间: ${timestamp}`,
    `操作: ${options.action}`,
    `脚本键: ${options.scriptKey || '未知'}`,
    `文件路径: ${options.filePath || '未知'}`,
    `失败原因: ${reason}`,
    `原始内容长度: ${options.content.length}`,
    `归一化后长度: ${normalizedContent.length}`,
    `错误详情: ${errorText}`,
    '结果: 未执行成功写入，磁盘文件内容未被本次保存覆盖。',
  ].join('\n');

  return { summary, log };
};

const showScriptSaveFailure = async (failure: ScriptSaveFailure): Promise<void> => {
  console.error(failure.log);
  await InputDialog.showLog({
    title: '脚本保存失败',
    summary: failure.summary,
    log: failure.log,
  });
};

const persistScriptFile = async (
  options: PersistScriptOptions
): Promise<{ success: true; content: string } | { success: false; failure: ScriptSaveFailure }> => {
  const normalizedContent = extractScriptCode(options.content);
  if (!normalizedContent.trim()) {
    return {
      success: false,
      failure: buildScriptSaveFailure(options, '归一化后的脚本内容为空，已取消写入'),
    };
  }

  try {
    await writeScriptFile(options.filePath, normalizedContent);
    return {
      success: true,
      content: normalizedContent,
    };
  } catch (error) {
    return {
      success: false,
      failure: buildScriptSaveFailure(options, '写入脚本文件失败', error),
    };
  }
};

const getScriptDirectory = (): string => {
  const scriptPath = useEditorStore.getState().config.scriptSavePath;
  return scriptPath ? normalizePath(scriptPath) : '';
};

const getCurrentItemSnapshot = () => {
  const state = useEditorStore.getState();
  return {
    currentData: state.currentData,
    currentItem: state.currentItem as Record<string, unknown> | null,
    currentItemIndex: state.currentItemIndex,
    currentFilePath: state.currentFilePath,
    currentScriptKey: state.currentScriptKey,
  };
};

const updateCurrentItem = (nextItem: Record<string, unknown>, nextData: Array<unknown>) => {
  setEditorStore(() => ({
    currentItem: nextItem as any,
    currentData: nextData as any,
  }));
};

const markCurrentDataDirty = (filePath: string, itemIndex: number) => {
  if (!filePath || itemIndex < 0) return;
  const state = useEditorStore.getState();
  state.markFileDirty(filePath);
  state.markItemDirty(filePath, itemIndex);
};

const cloneItemWithScripts = (
  item: Record<string, unknown>,
): { nextItem: Record<string, unknown>; scripts: Record<string, string> } => {
  const currentScripts =
    item.scripts && typeof item.scripts === 'object'
      ? (item.scripts as Record<string, string>)
      : {};
  const scripts: Record<string, string> = { ...currentScripts };
  const nextItem: Record<string, unknown> = { ...item, scripts };
  return { nextItem, scripts };
};

const writeDataFile = async (filePath: string, data: Array<unknown>) => {
  if (!filePath) return;
  await WriteJSON(filePath, data);
};

const readScriptFile = async (filePath: string): Promise<string | null> => {
  if (!filePath || isHttpProtocol(filePath)) return null;

  try {
    return await ReadFileString(filePath);
  } catch (error) {
    const normalized = filePath.replace(/\//g, '\\');
    try {
      return await ReadFileString(normalized);
    } catch (secondaryError) {
      throw new Error(
        `读取脚本失败: ${filePath} (${formatError(secondaryError || error)})`
      );
    }
  }
};

const writeScriptFile = async (filePath: string, content: string): Promise<void> => {
  await WriteFile(filePath, encodeText(content));
};

const deleteScriptFile = async (filePath: string): Promise<void> => {
  if (!filePath || isHttpProtocol(filePath)) return;
  await DeleteFile(filePath);
};

const ensureSupportedStoredScriptPath = (storedPath: string): { resolvedPath: string } => {
  if (hasLegacyTimestampScriptPath(storedPath)) {
    throw new Error(buildLegacyScriptPathMessage(storedPath));
  }

  const resolvedPath = resolveScriptFilePath(storedPath);
  if (!resolvedPath) {
    throw new Error('无法解析脚本路径');
  }

  if (hasLegacyTimestampScriptPath(resolvedPath)) {
    throw new Error(buildLegacyScriptPathMessage(resolvedPath));
  }

  return { resolvedPath };
};

export const loadScriptContent = async (
  storedPath: string,
  options?: { bypassCache?: boolean }
): Promise<string | null> => {
  if (!storedPath || typeof storedPath !== 'string') return null;
  const { resolvedPath } = ensureSupportedStoredScriptPath(storedPath);

  if (!options?.bypassCache) {
    const cached = ScriptCacheManager.getContent(resolvedPath);
    if (cached !== undefined) {
      return cached;
    }
  }

  const content = await readScriptFile(resolvedPath);
  if (content === null) return null;

  const normalizedContent = extractScriptCode(content);
  ScriptCacheManager.set(resolvedPath, normalizedContent, normalizedContent);
  return normalizedContent;
};

export const createScript = async (): Promise<void> => {
  const { currentData, currentItem, currentItemIndex, currentFilePath } = getCurrentItemSnapshot();
  if (!currentData || !currentItem || currentItemIndex < 0) {
    ToastManager.error('请先选择项目');
    return;
  }
  if (!currentFilePath) {
    ToastManager.error('请先打开数据文件');
    return;
  }

  const scriptDir = getScriptDirectory();
  if (!scriptDir) {
    ToastManager.error('请先设置脚本保存目录');
    return;
  }

  const scriptKey = await InputDialog.show({
    title: '新建脚本',
    placeholder: '输入脚本键名 (例如: onLoad, onUpdate)',
  });
  if (!scriptKey) return;

  const { nextItem, scripts } = cloneItemWithScripts(currentItem);
  if (scripts[scriptKey]) {
    ToastManager.error(`脚本键名 "${scriptKey}" 已存在`);
    return;
  }

  const itemId = (nextItem.id as number) || currentItemIndex;
  const jsFileName = `${itemId}_${scriptKey}.js`;
  const filePath = `${scriptDir}/${jsFileName}`;
  if (await FileExists(filePath)) {
    ToastManager.error(`脚本文件已存在: ${jsFileName}`);
    return;
  }
  await writeScriptFile(filePath, '');

  scripts[scriptKey] = formatStoredScriptPath(filePath);
  normalizeItemScriptPaths(nextItem);
  const resolvedPath = resolveScriptFilePath(scripts[scriptKey]);
  if (resolvedPath) {
    ScriptCacheManager.set(resolvedPath, '', '');
  }

  const nextData = [...currentData];
  nextData[currentItemIndex] = nextItem as any;
  await writeDataFile(currentFilePath, nextData);
  updateCurrentItem(nextItem, nextData);
  markCurrentDataDirty(currentFilePath, currentItemIndex);

  useEditorStore.getState().selectScript(scriptKey);
  ToastManager.success(`脚本已创建: ${scriptKey}`);
};

export const deleteScript = async (): Promise<void> => {
  const { currentData, currentItem, currentItemIndex, currentFilePath, currentScriptKey } = getCurrentItemSnapshot();
  if (!currentData || !currentItem || currentItemIndex < 0) {
    ToastManager.error('请先选择项目');
    return;
  }
  if (!currentFilePath) {
    ToastManager.error('请先打开数据文件');
    return;
  }

  if (!currentScriptKey) {
    ToastManager.error('请先选择脚本');
    return;
  }

  const cloned = cloneItemWithScripts(currentItem);
  let nextItem = cloned.nextItem;
  const scripts = cloned.scripts;
  if (!scripts || !scripts[currentScriptKey]) {
    ToastManager.error('脚本不存在');
    return;
  }

  const confirmed = await InputDialog.confirm({
    title: '删除脚本',
    content: `确认删除脚本 "${currentScriptKey}" 吗？此操作不可恢复！`,
    type: 'warning',
  });

  if (!confirmed) return;

  const storedPath = scripts[currentScriptKey];
  const resolvedPath = resolveScriptFilePath(storedPath);

  try {
    if (resolvedPath && !isHttpProtocol(resolvedPath)) {
      await deleteScriptFile(resolvedPath);
      ScriptCacheManager.delete(resolvedPath);
    }
  } catch {
    ToastManager.warning('脚本文件删除失败，已仅移除引用');
  }

  delete scripts[currentScriptKey];
  const nextData = [...currentData];
  nextData[currentItemIndex] = nextItem as any;
  await writeDataFile(currentFilePath, nextData);
  updateCurrentItem(nextItem, nextData);

  const remainingKeys = Object.keys(scripts);
  useEditorStore.getState().selectScript(remainingKeys[0] || '');
  ToastManager.success('脚本已删除');
};

export const copyScript = async (): Promise<void> => {
  const { currentData, currentItem, currentItemIndex, currentFilePath, currentScriptKey } = getCurrentItemSnapshot();
  if (!currentData || !currentItem || currentItemIndex < 0) {
    ToastManager.error('请先选择项目');
    return;
  }
  if (!currentFilePath) {
    ToastManager.error('请先打开数据文件');
    return;
  }

  if (!currentScriptKey) {
    ToastManager.error('请先选择脚本');
    return;
  }

  const { nextItem, scripts } = cloneItemWithScripts(currentItem);
  if (!scripts || !scripts[currentScriptKey]) {
    ToastManager.error('脚本不存在');
    return;
  }

  const newKey = await InputDialog.show({
    title: '复制脚本',
    placeholder: '输入新脚本键名',
    defaultValue: `${currentScriptKey}_复制`,
  });

  if (!newKey) return;
  if (scripts[newKey]) {
    ToastManager.error(`脚本键名 "${newKey}" 已存在`);
    return;
  }

  const scriptDir = getScriptDirectory();
  if (!scriptDir) {
    ToastManager.error('请先设置脚本保存目录');
    return;
  }

  const storedPath = scripts[currentScriptKey];
  const resolvedPath = resolveScriptFilePath(storedPath);
  const originalContent = resolvedPath ? await readScriptFile(resolvedPath) : null;

  const nextContent = extractScriptCode(originalContent || '');

  const itemId = (nextItem.id as number) || currentItemIndex;
  const jsFileName = `${itemId}_${newKey}.js`;
  const newFilePath = `${scriptDir}/${jsFileName}`;
  if (await FileExists(newFilePath)) {
    ToastManager.error(`脚本文件已存在: ${jsFileName}`);
    return;
  }
  await writeScriptFile(newFilePath, nextContent);

  scripts[newKey] = formatStoredScriptPath(newFilePath);
  normalizeItemScriptPaths(nextItem);
  const resolvedCopyPath = resolveScriptFilePath(scripts[newKey]);
  if (resolvedCopyPath) {
    ScriptCacheManager.set(resolvedCopyPath, nextContent, nextContent);
  }

  const nextData = [...currentData];
  nextData[currentItemIndex] = nextItem as any;
  await writeDataFile(currentFilePath, nextData);
  updateCurrentItem(nextItem, nextData);
  markCurrentDataDirty(currentFilePath, currentItemIndex);

  useEditorStore.getState().selectScript(newKey);
  ToastManager.success(`脚本已复制: ${newKey}`);
};

export const saveScriptContent = async (scriptKey: string, content: string): Promise<boolean> => {
  if (!scriptKey) return false;
  const { currentItem, currentFilePath, currentItemIndex } = getCurrentItemSnapshot();
  if (!currentItem) return false;

  const scripts = currentItem.scripts as Record<string, string> | undefined;
  if (!scripts || !scripts[scriptKey]) return false;

  const storedPath = scripts[scriptKey];
  let resolvedPath = '';
  try {
    resolvedPath = ensureSupportedStoredScriptPath(storedPath).resolvedPath;
  } catch (error) {
    ToastManager.error(formatError(error));
    return false;
  }

  const isNewScriptFile = !await FileExists(resolvedPath);

  const result = await persistScriptFile({
    action: '保存当前脚本',
    filePath: resolvedPath,
    content,
    scriptKey,
  });

  if (!result.success) {
    await showScriptSaveFailure(result.failure);
    return false;
  }

  ScriptCacheManager.set(resolvedPath, result.content, result.content);
  ScriptCacheManager.markClean(resolvedPath);

  const newStoredPath = formatStoredScriptPath(resolvedPath);
  if (newStoredPath) {
    scripts[scriptKey] = newStoredPath;
  }

  if (isNewScriptFile) {
    markCurrentDataDirty(currentFilePath, currentItemIndex);
  }

  return true;
};

export const saveCurrentScript = async (): Promise<boolean> => {
  const { currentItem, currentScriptKey } = getCurrentItemSnapshot();
  if (!currentItem || !currentScriptKey) {
    ToastManager.error('请先选择脚本');
    return false;
  }

  const scripts = currentItem.scripts as Record<string, string> | undefined;
  if (!scripts || !scripts[currentScriptKey]) {
    ToastManager.error('脚本不存在');
    return false;
  }

  const storedPath = scripts[currentScriptKey];
  let resolvedPath = '';
  try {
    resolvedPath = ensureSupportedStoredScriptPath(storedPath).resolvedPath;
  } catch (error) {
    ToastManager.error(formatError(error));
    return false;
  }

  const cached = ScriptCacheManager.get(resolvedPath);
  const content = cached?.content;
  if (typeof content !== 'string') {
    ToastManager.error('没有可保存的脚本内容');
    return false;
  }

  return saveScriptContent(currentScriptKey, content);
};

export const getScriptFilePath = (storedPath: string): string => resolveScriptFilePath(storedPath);

export const saveScript = async (filePath: string): Promise<boolean> => {
  if (!filePath) return false;
  if (hasLegacyTimestampScriptPath(filePath)) {
    ScriptCacheManager.delete(filePath);
    return false;
  }
  
  const cached = ScriptCacheManager.get(filePath);
  if (!cached || !cached.dirty) return false;
  
  const result = await persistScriptFile({
    action: '保存全部脚本',
    filePath,
    content: cached.content,
  });

  if (!result.success) {
    await showScriptSaveFailure(result.failure);
    return false;
  }

  try {
    ScriptCacheManager.set(filePath, result.content, result.content);
    ScriptCacheManager.markClean(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to save script: ${filePath}`, error);
    return false;
  }
};

export const saveAllScripts = async (): Promise<{ savedCount: number; failedCount: number }> => {
  const dirtyScriptFiles = ScriptCacheManager.getDirtyFiles();
  const legacyScriptFiles = dirtyScriptFiles.filter((scriptPath) => hasLegacyTimestampScriptPath(scriptPath));
  if (legacyScriptFiles.length > 0) {
    for (const scriptPath of legacyScriptFiles) {
      ScriptCacheManager.delete(scriptPath);
    }
    ToastManager.warning(`已清理 ${legacyScriptFiles.length} 个旧版时间戳脚本缓存，请仅保留无时间戳脚本路径`);
  }

  const saveTargets = dirtyScriptFiles.filter((scriptPath) => !hasLegacyTimestampScriptPath(scriptPath));
  if (saveTargets.length === 0) {
    ToastManager.info('没有需要保存的脚本');
    return { savedCount: 0, failedCount: 0 };
  }

  let savedCount = 0;
  let failedCount = 0;
  for (const scriptPath of saveTargets) {
    try {
      const success = await saveScript(scriptPath);
      if (success) {
        savedCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`Failed to save script: ${scriptPath}`, error);
      failedCount++;
    }
  }

  if (failedCount === 0) {
    ToastManager.success(`已保存 ${savedCount} 个脚本`);
  } else if (savedCount === 0) {
    ToastManager.error(`脚本保存失败，${failedCount} 个脚本未保存`);
  } else {
    ToastManager.warning(`已保存 ${savedCount} 个脚本，${failedCount} 个脚本保存失败`);
  }

  return { savedCount, failedCount };
};

export const deleteAllScripts = async (): Promise<void> => {
  const { currentData, currentItem, currentItemIndex, currentFilePath } = getCurrentItemSnapshot();
  if (!currentData || !currentItem || currentItemIndex < 0) {
    ToastManager.error('请先选择项目');
    return;
  }
  if (!currentFilePath) {
    ToastManager.error('请先打开数据文件');
    return;
  }

  const { nextItem, scripts } = cloneItemWithScripts(currentItem);
  const scriptEntries = Object.entries(scripts);
  if (scriptEntries.length === 0) {
    ToastManager.info('当前项目没有脚本');
    return;
  }

  const confirmed = await InputDialog.confirm({
    title: '删除全部脚本',
    content: `确认删除当前项目下全部 ${scriptEntries.length} 个脚本吗？此操作不可恢复！`,
    type: 'warning',
  });
  if (!confirmed) return;

  for (const [, storedPath] of scriptEntries) {
    const resolvedPath = resolveScriptFilePath(storedPath);
    if (!resolvedPath) continue;
    try {
      if (!isHttpProtocol(resolvedPath)) {
        await deleteScriptFile(resolvedPath);
      }
    } catch {
      // 忽略单文件删除失败，继续删除引用
    }
    ScriptCacheManager.delete(resolvedPath);
  }

  nextItem.scripts = {};
  const nextData = [...currentData];
  nextData[currentItemIndex] = nextItem as any;
  await writeDataFile(currentFilePath, nextData);
  updateCurrentItem(nextItem, nextData);
  useEditorStore.getState().selectScript('');
  ToastManager.success('已删除当前项目全部脚本');
};

export const renameScript = async (): Promise<void> => {
  const { currentData, currentItem, currentItemIndex, currentFilePath, currentScriptKey } = getCurrentItemSnapshot();
  if (!currentData || !currentItem || currentItemIndex < 0) {
    ToastManager.error('请先选择项目');
    return;
  }
  if (!currentFilePath) {
    ToastManager.error('请先打开数据文件');
    return;
  }
  if (!currentScriptKey) {
    ToastManager.error('请先选择脚本');
    return;
  }

  const cloned = cloneItemWithScripts(currentItem);
  let nextItem = cloned.nextItem;
  const scripts = cloned.scripts;
  if (!scripts[currentScriptKey]) {
    ToastManager.error('脚本不存在');
    return;
  }

  const nextKey = await InputDialog.show({
    title: '重命名脚本',
    placeholder: '输入新的脚本键名',
    defaultValue: currentScriptKey,
  });
  if (!nextKey) return;
  if (nextKey === currentScriptKey) return;
  if (scripts[nextKey]) {
    ToastManager.error(`脚本键名 "${nextKey}" 已存在`);
    return;
  }

  scripts[nextKey] = scripts[currentScriptKey];
  delete scripts[currentScriptKey];
  normalizeItemScriptPaths(nextItem);

  const nextData = [...currentData];
  nextData[currentItemIndex] = nextItem as any;
  await writeDataFile(currentFilePath, nextData);
  updateCurrentItem(nextItem, nextData);
  useEditorStore.getState().selectScript(nextKey);
  ToastManager.success(`脚本已重命名: ${currentScriptKey} -> ${nextKey}`);
};
