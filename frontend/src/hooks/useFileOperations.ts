import { EventsOn } from '../../wailsjs/runtime/runtime';
import { FileExists, OpenFileDialog, ProceedClose, ReadJSON, SetCurrentFile, WriteJSON } from '../../wailsjs/go/main/App';
import { InputDialog } from '../components/common/InputDialog';
import { ToastManager } from '../components/common/ToastManager';
import { EventSystem } from '../core/EventSystem';
import { useEditorStore } from '../stores/editorStore';
import type { FileType, RPGMapInfo } from '../types';
import {
  buildDataReloadBatchConfirmMessage,
  extractFileName,
  isReloadableDataFile,
  resolveDataChangeBatch,
  type DataFileChangePayload,
} from '../services/BaseDataReloadService';
import { normalizeStandardDataForEditor, prepareDataForWrite, SYSTEM_FILE_NAME } from '../services/DataFileFormatService';
import { auditAndRepairDataFiles, isAuditTargetFile, toAuditSummaryText } from '../services/DataAuditService';
import { applyWorkspaceSettings } from '../services/MonacoLoader';
import { DataLoaderService } from '../services/DataLoaderService';
import { normalizeItemScriptPaths, resolveScriptFilePath } from '../services/ScriptPathCompat';
import { appendEditorFailureLog, buildSaveFailureLog, formatSaveFailureError } from '../services/SaveFailureLogger';
import { ScriptCacheManager } from '../services/ScriptCacheManager';
import { copyScript, createScript, deleteAllScripts, deleteScript, renameScript, saveAllScripts, saveCurrentScript, saveScript } from '../services/ScriptOperations';
import { ScriptPathManager } from '../services/ScriptPathManager';
import { EQUIP_EXTENSIONS_FILE_NAME } from '../services/EquipExtensionsService';
import { ExternalDataChangeQueue } from '../services/ExternalDataChangeQueue';

interface WorkspacePayload {
  projectRoot: string;
  dataPath: string;
  scriptPath: string;
  imagePath: string;
  workspacePath: string;
  projectName: string;
}

const DATA_MENU_LABELS: Record<string, string> = {
  actors: 'Actors.json',
  animations: 'Animations.json',
  armors: 'Armors.json',
  classes: 'Classes.json',
  commonEvents: 'CommonEvents.json',
  effects: 'Effects.json',
  enemies: 'Enemies.json',
  items: 'Items.json',
  projectiles: 'Projectiles.json',
  quests: 'Quests.json',
  skills: 'Skills.json',
  system: 'System.json',
  weapons: 'Weapons.json',
  troops: 'Troops.json',
  states: 'States.json',
};

const MAP_INFOS_FILE_NAME = 'MapInfos.json';
const ACTORS_FILE_NAME = 'Actors.json';
const ENEMIES_FILE_NAME = 'Enemies.json';
const EFFECTS_FILE_NAME = 'Effects.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const EXTERNAL_CHANGE_BATCH_WINDOW_MS = 180;

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const normalizePath = (value: string) => value.replace(/\\/g, '/');
const normalizePathKey = (value: string) => {
  const normalized = normalizePath(value || '');
  return /^[A-Za-z]:\//.test(normalized) ? normalized.toLowerCase() : normalized;
};

const getFileName = (filePath: string) => normalizePath(filePath).split('/').pop() || '';
const buildMapFileName = (mapId: number) => `Map${String(mapId).padStart(3, '0')}.json`;

const logDataSaveFailure = async (
  action: string,
  filePath: string,
  reason: string,
  error?: unknown,
) => {
  const log = buildSaveFailureLog('[MyNewEditor] 数据保存失败日志', [
    `时间: ${new Date().toISOString()}`,
    `操作: ${action}`,
    `文件路径: ${filePath || '未知'}`,
    `失败原因: ${reason}`,
    `错误详情: ${error ? formatSaveFailureError(error) : '无'}`,
  ]);
  try {
    await appendEditorFailureLog(log);
  } catch (logError) {
    console.error('[MyNewEditor] 写入 log.txt 失败', logError);
  }
};

const getDirectoryPath = (filePath: string) => {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
};

const extractMapIdFromFileName = (fileName: string): number | null => {
  const match = /^map(\d+)\.json$/i.exec(fileName);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const ensureScriptRootFromFile = async (filePath: string) => {
  const state = useEditorStore.getState();
  if (state.config.scriptSavePath) return;
  if (!filePath) return;

  const normalized = normalizePath(filePath);
  const dataMarker = '/data/';
  const markerIndex = normalized.toLowerCase().lastIndexOf(dataMarker);
  if (markerIndex === -1) return;

  const projectRoot = normalized.slice(0, markerIndex);
  if (!projectRoot) return;

  const scriptsRoot = joinPath(projectRoot, 'scripts');
  const exists = await FileExists(scriptsRoot);
  if (!exists) return;

  useEditorStore.getState().updateConfig({
    scriptSavePath: scriptsRoot,
    scriptPath: scriptsRoot,
    projectRoot,
  });
};

const normalizeScriptPaths = (data: unknown[]) => {
  for (let i = 1; i < data.length; i++) {
    const item = data[i] as Record<string, unknown> | null;
    if (item && typeof item === 'object' && 'scripts' in item) {
      normalizeItemScriptPaths(item);
    }
  }
};

const getCurrentPayload = () => {
  const state = useEditorStore.getState();
  if (state.currentFileType === 'map') {
    return state.currentMapData;
  }
  return state.currentData;
};

const getCachedPayloadForSave = (filePath: string, currentFilePath: string, currentPayload: unknown) => {
  const normalizedFilePath = normalizePathKey(filePath);
  if (normalizedFilePath === normalizePathKey(currentFilePath)) {
    return currentPayload;
  }

  const fileName = getFileName(filePath);
  return DataLoaderService.getCachedData(normalizedFilePath)
    ?? (fileName ? DataLoaderService.getCachedDataByName(fileName) : null);
};

const collectCurrentDataSaveTargets = (
  state: ReturnType<typeof useEditorStore.getState>,
  options?: { includeCurrentFile?: boolean; dirtyOnly?: boolean },
) => {
  const includeCurrentFile = options?.includeCurrentFile ?? false;
  const dirtyOnly = options?.dirtyOnly ?? false;
  const saveTargets = new Set<string>();
  const { currentFilePath, uiMode } = state;
  const currentFileName = getFileName(currentFilePath).toLowerCase();

  if (currentFilePath && (!dirtyOnly || state.isFileDirty(currentFilePath) || includeCurrentFile)) {
    saveTargets.add(currentFilePath);
  }

  if (uiMode === 'equip') {
    const systemPath = DataLoaderService.getFilePathByName(SYSTEM_FILE_NAME);
    const extensionsPath = DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME);
    if (systemPath && (!dirtyOnly || state.isFileDirty(systemPath))) {
      saveTargets.add(systemPath);
    }
    if (extensionsPath && (!dirtyOnly || state.isFileDirty(extensionsPath))) {
      saveTargets.add(extensionsPath);
    }
  }

  if (currentFileName === WEAPONS_FILE_NAME.toLowerCase()) {
    const extensionsPath = DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME);
    if (extensionsPath && (!dirtyOnly || state.isFileDirty(extensionsPath))) {
      saveTargets.add(extensionsPath);
    }
  }

  return Array.from(saveTargets).filter((value) => !!value);
};

const getCurrentScriptPath = () => {
  const state = useEditorStore.getState();
  if (state.uiMode !== 'script' || !state.currentScriptKey) {
    return '';
  }

  const currentItem = state.currentItem;
  if (!currentItem || typeof currentItem !== 'object' || Array.isArray(currentItem)) {
    return '';
  }

  const scripts = (currentItem as Record<string, unknown>).scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
    return '';
  }

  const storedPath = (scripts as Record<string, string>)[state.currentScriptKey];
  return storedPath ? resolveScriptFilePath(storedPath) : '';
};

const ensureMapInfosInStore = (mapInfos: RPGMapInfo[]) => {
  const state = useEditorStore.getState();
  if (state.currentMapInfos.length === mapInfos.length) return;
  state.loadMapBrowser(mapInfos);
};

export function useFileOperations() {
  const loadStandardFile = async (fileName: string, fileType: FileType, dataPath?: string) => {
    const state = useEditorStore.getState();
    const resolvedDataPath = dataPath || state.config.dataPath;
    if (!resolvedDataPath) return false;

    let normalized = DataLoaderService.getCachedDataByName<unknown[]>(fileName);
    const filePath = joinPath(resolvedDataPath, fileName);

    if (!normalized) {
      const data = await ReadJSON(filePath);
      normalized = normalizeStandardDataForEditor(fileName, data);
      if (normalized) {
        DataLoaderService.cacheFileData(filePath, fileName, normalized);
      }
    }

    if (!normalized) {
      ToastManager.error(`未能加载数据文件: ${fileName}`);
      return false;
    }

    normalizeScriptPaths(normalized);
    await ensureScriptRootFromFile(filePath);
    useEditorStore.getState().loadData(normalized as any[], filePath, fileType);
    await SetCurrentFile(filePath);
    EventSystem.emit('data:file-loaded', { fileName, filePath, type: fileType });
    return true;
  };

  const openMapBrowser = async (dataPath?: string) => {
    const resolvedDataPath = dataPath || useEditorStore.getState().config.dataPath;
    if (!resolvedDataPath) {
      ToastManager.error('请先打开项目');
      return;
    }

    const mapInfos = await DataLoaderService.ensureMapInfosLoaded(resolvedDataPath);
    useEditorStore.getState().loadMapBrowser(mapInfos);
    await SetCurrentFile(joinPath(resolvedDataPath, MAP_INFOS_FILE_NAME));
    if (mapInfos.length === 0) {
      ToastManager.info('未找到可用地图');
      return;
    }
    ToastManager.success(`已加载 ${mapInfos.length} 张地图索引`);
  };

  const openMapById = async (mapId: number, dataPath?: string) => {
    const state = useEditorStore.getState();
    const resolvedDataPath = dataPath || state.config.dataPath;
    if (!resolvedDataPath) {
      ToastManager.error('请先打开项目');
      return;
    }
    if (state.currentFileType === 'map' && state.currentMapId === mapId && state.currentMapData) {
      return;
    }

    const mapInfos = await DataLoaderService.ensureMapInfosLoaded(resolvedDataPath);
    if (mapInfos.length > 0) {
      ensureMapInfosInStore(mapInfos);
    }

    const fileName = buildMapFileName(mapId);
    const filePath = joinPath(resolvedDataPath, fileName);
    const wasCached = DataLoaderService.getCachedData(filePath) !== null;
    const result = await DataLoaderService.loadMapById(mapId, resolvedDataPath);
    if (!result) {
      ToastManager.error(`加载地图失败: #${mapId}`);
      return;
    }

    useEditorStore.getState().loadMapData(result.mapData, result.filePath, mapId);
    await SetCurrentFile(result.filePath);
    if (!wasCached) {
      ToastManager.success(`已加载地图 ${result.fileName}`);
    }
  };

  const openFile = async () => {
    try {
      const filePath = await OpenFileDialog();
      if (!filePath) return;

      const fileName = getFileName(filePath);
      const dataPath = getDirectoryPath(filePath);
      DataLoaderService.setDataPath(dataPath);

      if (fileName.toLowerCase() === MAP_INFOS_FILE_NAME.toLowerCase()) {
        await openMapBrowser(dataPath);
        return;
      }

      const mapId = extractMapIdFromFileName(fileName);
      if (mapId !== null) {
        await openMapById(mapId, dataPath);
        return;
      }

      const cached = DataLoaderService.getCachedData(filePath);
      const data = cached ?? (await ReadJSON(filePath));
      if (!data) return;

      let fileType: FileType = 'data';
      const normalizedName = fileName.toLowerCase();
      if (normalizedName.includes('quest')) {
        fileType = 'quest';
      } else if (normalizedName.includes('projectile')) {
        fileType = 'projectile';
      }

      const normalizedData = normalizeStandardDataForEditor(fileName, data);
      if (!normalizedData) return;

      normalizeScriptPaths(normalizedData);
      await ensureScriptRootFromFile(filePath);
      useEditorStore.getState().loadData(normalizedData as any[], filePath, fileType);
      await SetCurrentFile(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const saveFile = async (): Promise<boolean> => {
    const state = useEditorStore.getState();
    const { currentFilePath } = state;
    const currentPayload = getCurrentPayload();
    if (!currentFilePath) return false;

    try {
      const saveTargets = collectCurrentDataSaveTargets(state, {
        includeCurrentFile: true,
        dirtyOnly: false,
      });

      for (const targetPath of saveTargets) {
        const payload = getCachedPayloadForSave(targetPath, currentFilePath, currentPayload);
        if (!payload) {
          console.warn(`[SaveFile] Missing payload for ${targetPath}`);
          await logDataSaveFailure('保存当前文件', targetPath, '未找到可写入的数据载荷');
          return false;
        }

        await WriteJSON(targetPath, prepareDataForWrite(targetPath, payload));
        useEditorStore.getState().markFileClean(targetPath);
      }

      console.log('File saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      await logDataSaveFailure('保存当前文件', currentFilePath, '写入数据文件失败', error);
      return false;
    }
  };

  const saveAllFiles = async (): Promise<{ savedCount: number; failedCount: number }> => {
    const { currentFilePath, dirtyFiles } = useEditorStore.getState();
    const currentPayload = getCurrentPayload();
    const dirtyScriptFiles = ScriptCacheManager.getDirtyFiles();
    const dirtyDataFiles = Object.keys(dirtyFiles);
    const dirtyFileCount = dirtyDataFiles.length + dirtyScriptFiles.length;

    if (dirtyFileCount === 0) {
      ToastManager.info('没有需要保存的文件');
      return { savedCount: 0, failedCount: 0 };
    }

    let savedCount = 0;
    let failedCount = 0;

    for (const filePath of dirtyDataFiles) {
      try {
        const changedIndexes = useEditorStore.getState().getDirtyItemIndexes(filePath);
        const normalizedFilePath = normalizePathKey(filePath);
        const isCurrentFile = normalizedFilePath === normalizePathKey(currentFilePath || '');
        const fileName = normalizedFilePath.split('/').pop() || '';
        const payload = isCurrentFile
          ? currentPayload
          : DataLoaderService.getCachedData(normalizedFilePath) ?? (fileName ? DataLoaderService.getCachedDataByName(fileName) : null);

        if (!payload) {
          console.warn(`[SaveAll] Missing payload for ${filePath}`);
          await logDataSaveFailure('保存全部文件', filePath, '未找到可写入的数据载荷');
          failedCount++;
          continue;
        }

        console.log(`[SaveAll] Persist data file: ${filePath}; changed indexes: [${changedIndexes.join(', ')}]`);
        await WriteJSON(filePath, prepareDataForWrite(filePath, payload));
        useEditorStore.getState().markFileClean(filePath);
        savedCount++;
      } catch (error) {
        console.error(`Failed to save data file: ${filePath}`, error);
        await logDataSaveFailure('保存全部文件', filePath, '写入数据文件失败', error);
        failedCount++;
      }
    }

    for (const scriptPath of dirtyScriptFiles) {
      try {
        const result = await saveScript(scriptPath);
        if (result.status === 'saved') {
          savedCount++;
        } else if (result.status === 'failed') {
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to save script: ${scriptPath}`, error);
        await logDataSaveFailure('保存全部文件', scriptPath, '脚本保存流程抛出未捕获异常', error);
        failedCount++;
      }
    }

    if (failedCount === 0) {
      ToastManager.success(`已保存 ${savedCount} 个文件`);
    } else if (savedCount === 0) {
      ToastManager.error(`保存失败，${failedCount} 个文件未保存`);
    } else {
      ToastManager.warning(`已保存 ${savedCount} 个文件，${failedCount} 个文件保存失败`);
    }

    return { savedCount, failedCount };
  };

  const checkFileExists = async (filePath: string): Promise<boolean> => {
    return await FileExists(filePath);
  };

  const setupMenuListeners = () => {
    let closeRequestPending = false;
    const externalChangeQueue = new ExternalDataChangeQueue();
    let externalChangeFlushTimer: ReturnType<typeof setTimeout> | null = null;
    let isProcessingExternalChanges = false;

    const reloadCurrentSelection = async () => {
      const state = useEditorStore.getState();
      const dataPath = state.config.dataPath;
      if (!dataPath) return;

      if (state.uiMode === 'map') {
        if (state.currentMapId) {
          await openMapById(state.currentMapId, dataPath);
          return;
        }
        await openMapBrowser(dataPath);
        return;
      }

      if (!state.currentFile) return;
      await loadStandardFile(state.currentFile, state.currentFileType, dataPath);
    };

    const buildUnsavedChangesMessage = (actionLabel: string) => {
      const state = useEditorStore.getState();
      const dirtyDataFiles = Object.keys(state.dirtyFiles);
      const dirtyScriptFiles = ScriptCacheManager.getDirtyFiles();
      const lines = [`检测到未保存修改。${actionLabel}前请选择处理方式。`, ''];

      if (dirtyDataFiles.length > 0) {
        lines.push(`数据文件: ${dirtyDataFiles.length} 个`);
      }
      if (dirtyScriptFiles.length > 0) {
        lines.push(`脚本文件: ${dirtyScriptFiles.length} 个`);
      }

      lines.push('', '选择“保存全部”会执行现有 SaveAll 链路。');
      return lines.join('\n');
    };

    const ensureUnsavedChangesHandled = async (actionLabel: string): Promise<boolean> => {
      const state = useEditorStore.getState();
      const dirtyDataFiles = Object.keys(state.dirtyFiles);
      const dirtyScriptFiles = ScriptCacheManager.getDirtyFiles();
      if (dirtyDataFiles.length === 0 && dirtyScriptFiles.length === 0) {
        return true;
      }

      const choice = await InputDialog.choose<'save-all' | 'discard' | 'cancel'>({
        title: '检测到未保存修改',
        content: buildUnsavedChangesMessage(actionLabel),
        type: 'warning',
        choices: [
          { value: 'save-all', label: '保存全部', type: 'primary' },
          { value: 'discard', label: '不保存' },
          { value: 'cancel', label: '取消', danger: true },
        ],
      });

      if (!choice || choice === 'cancel') {
        return false;
      }

      if (choice === 'discard') {
        return true;
      }

      const { failedCount } = await saveAllFiles();
      if (failedCount > 0) {
        ToastManager.error(`${actionLabel}前保存失败，已取消操作`);
        return false;
      }

      return true;
    };

    const reloadChangedFile = async (payload: DataFileChangePayload, emitToast = false) => {
      const fileName = payload.fileName || extractFileName(payload.filePath);
      if (!isReloadableDataFile(fileName)) {
        return false;
      }

      const result = await DataLoaderService.reloadFile(payload.filePath, { emitEvent: false });
      if (result.kind === 'missing') {
        if (emitToast) {
          ToastManager.warning(`外部数据文件已不存在: ${fileName}`);
        }
        return false;
      }

      if (result.kind === 'unsupported') {
        return false;
      }

      if (result.kind === 'mapInfos') {
        const mapInfos = Array.isArray(result.payload) ? (result.payload as RPGMapInfo[]) : [];
        useEditorStore.getState().setMapInfos(mapInfos);
        EventSystem.emit('data:file-loaded', { fileName, filePath: payload.filePath, type: 'map' });
      } else if (result.kind === 'standard') {
        EventSystem.emit('data:file-loaded', {
          fileName,
          filePath: payload.filePath,
          type: result.fileType,
        });
      } else if (result.kind === 'map') {
        EventSystem.emit('data:file-loaded', { fileName, filePath: payload.filePath, type: 'map' });
      }

      if (emitToast) {
        ToastManager.success(`已重新加载 ${fileName}`);
      }
      return true;
    };

    const handleExternalDataChange = async (payload: DataFileChangePayload) => {
      if (!externalChangeQueue.enqueue(payload)) {
        return;
      }

      if (externalChangeFlushTimer) {
        clearTimeout(externalChangeFlushTimer);
      }
      externalChangeFlushTimer = setTimeout(() => {
        void flushExternalDataChanges();
      }, EXTERNAL_CHANGE_BATCH_WINDOW_MS);
    };

    const flushExternalDataChanges = async () => {
      if (isProcessingExternalChanges) {
        return;
      }
      isProcessingExternalChanges = true;
      if (externalChangeFlushTimer) {
        clearTimeout(externalChangeFlushTimer);
        externalChangeFlushTimer = null;
      }

      try {
        while (externalChangeQueue.hasPending()) {
          const queuedPayloads = externalChangeQueue.drainPending();

          const state = useEditorStore.getState();
          const snapshot = {
            uiMode: state.uiMode,
            currentFilePath: state.currentFilePath,
            currentMapId: state.currentMapId,
          };
          const plan = resolveDataChangeBatch(snapshot, queuedPayloads);

          if (plan.entries.length === 0) {
            continue;
          }

          externalChangeQueue.markBatchHandled(plan.entries.map((entry) => entry.payload));

          if (!plan.shouldConfirm) {
            for (const entry of plan.entries) {
              await reloadChangedFile(entry.payload);
            }
          } else {
            const hasUnsavedChanges = plan.affectsCurrentFile
              && !!state.currentFilePath
              && state.isFileDirty(state.currentFilePath);
            const confirmed = await InputDialog.confirm({
              title: '检测到外部数据变化',
              content: buildDataReloadBatchConfirmMessage(snapshot, plan, hasUnsavedChanges),
              confirmText: '统一重新加载',
              cancelText: '稍后处理',
              type: 'warning',
            });

            if (!confirmed) {
              if (externalChangeQueue.hasPending()) {
                await new Promise<void>((resolve) => {
                  setTimeout(resolve, EXTERNAL_CHANGE_BATCH_WINDOW_MS);
                });
              }
              continue;
            }

            for (const entry of plan.entries) {
              await reloadChangedFile(entry.payload);
            }

            if (plan.shouldReloadCurrentSelection) {
              await reloadCurrentSelection();
              if (plan.affectsCurrentFile && state.currentFilePath) {
                useEditorStore.getState().markFileClean(state.currentFilePath);
              }
            }

            const changedFileNames = Array.from(new Set(plan.entries.map((entry) => entry.fileName)));
            ToastManager.success(`已统一重新加载 ${changedFileNames.length} 个外部变更文件`);
          }

          if (externalChangeQueue.hasPending()) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, EXTERNAL_CHANGE_BATCH_WINDOW_MS);
            });
          }
        }
      } finally {
        isProcessingExternalChanges = false;
        externalChangeQueue.resetSession();
      }
    };

    const handleAuditRepairRequest = async () => {
      const state = useEditorStore.getState();
      const dataPath = state.config.dataPath;
      if (!dataPath) {
        ToastManager.error('请先打开项目');
        return;
      }

      const canProceed = await ensureUnsavedChangesHandled('执行数据体检/修复');
      if (!canProceed) {
        return;
      }

      const confirmed = await InputDialog.confirm({
        title: '执行数据体检/修复',
        content: '本操作会直接检查并改写 Skills.json、Enemies.json、Items.json、Weapons.json、Armors.json、Projectiles.json、Effects.json。建议先确认当前工程文件已提交或已备份。是否继续？',
        confirmText: '开始修复',
        cancelText: '取消',
        type: 'warning',
      });

      if (!confirmed) {
        return;
      }

      try {
        const summary = await auditAndRepairDataFiles(dataPath, {
          readJson: async (filePath) => ReadJSON(filePath),
          writeJson: async (filePath, data) => WriteJSON(filePath, prepareDataForWrite(filePath, data)),
        });

        const changedFileEntries = summary.results
          .filter((result) => result.changed && isAuditTargetFile(result.fileName))
          .map((result) => ({ fileName: result.fileName, filePath: result.filePath }));

        const latestState = useEditorStore.getState();
        if (changedFileEntries.length === 0) {
          ToastManager.info(toAuditSummaryText(summary));
          return;
        }

        const changedFileNames = Array.from(new Set(changedFileEntries.map((item) => item.fileName)));
        const reloadConfirmed = await InputDialog.confirm({
          title: '修复已完成',
          content: [
            toAuditSummaryText(summary),
            '',
            '以下文件已发生变更：',
            ...changedFileNames.map((fileName) => `- ${fileName}`),
            '',
            '确认后将统一重新加载一次当前编辑上下文。',
          ].join('\n'),
          confirmText: '确认并重新加载',
          cancelText: '暂不重新加载',
          type: 'success',
        });

        if (!reloadConfirmed) {
          ToastManager.info('已保留当前界面，文件变更已写入磁盘');
          return;
        }

        for (const entry of changedFileEntries) {
          await DataLoaderService.reloadFile(entry.filePath, { emitEvent: false });
          useEditorStore.getState().markFileClean(entry.filePath);
        }
        await reloadCurrentSelection();
        if (latestState.currentFilePath) {
          useEditorStore.getState().markFileClean(latestState.currentFilePath);
        }
        ToastManager.success(`已统一重新加载 ${changedFileNames.length} 个变更文件`);
      } catch (error) {
        console.error('Failed to audit and repair data files:', error);
        ToastManager.error(`数据体检/修复失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const handleMapOpen = (mapId: unknown) => {
      if (typeof mapId !== 'number') return;
      void openMapById(mapId);
    };

    EventSystem.on('map:open', handleMapOpen);

    const disposeWorkspaceLoaded = EventsOn('workspace:loaded', async (workspace: WorkspacePayload) => {
      if (!workspace || !workspace.projectRoot) {
        return;
      }

      const state = useEditorStore.getState();
      state.updateConfig({
        projectRoot: workspace.projectRoot,
        dataPath: workspace.dataPath,
        scriptSavePath: workspace.scriptPath,
        scriptPath: workspace.scriptPath,
        imagePath: workspace.imagePath,
        workspacePath: workspace.workspacePath,
        workspaceRoot: workspace.projectRoot,
      });
      state.setWorkspaceRoot(workspace.projectRoot);
      ScriptPathManager.setWorkspaceRoot(workspace.projectRoot);

      DataLoaderService.clearCache();
      DataLoaderService.setDataPath(workspace.dataPath);
      await DataLoaderService.preloadManifest(workspace.dataPath);
      await applyWorkspaceSettings(workspace.workspacePath);
      EventSystem.emit('workspace:loaded', workspace);
    });

    const disposeDataSelect = EventsOn('data:select', async (type: string) => {
      const dataPath = useEditorStore.getState().config.dataPath;
      if (!dataPath) {
        ToastManager.error('请先打开项目');
        return;
      }

      try {
        const canSwitchData = await ensureUnsavedChangesHandled('切换数据文件');
        if (!canSwitchData) {
          return;
        }

        if (type === 'maps') {
          await openMapBrowser(dataPath);
          return;
        }

        const label = DATA_MENU_LABELS[type];
        if (!label) {
          ToastManager.error('未知数据类型');
          return;
        }

        const fileType: FileType = type === 'quests'
          ? 'quest'
          : type === 'projectiles'
            ? 'projectile'
            : 'data';

        const loaded = await loadStandardFile(label, fileType, dataPath);
        if (!loaded) return;

        await DataLoaderService.preloadManifest(dataPath);
        ToastManager.success(`已切换到 ${label}`);
      } catch (error) {
        console.error(`Failed to select data file: ${type}`, error);
        ToastManager.error(`加载失败: ${type}`);
      }
    });

    const ensureSavedBeforeModeChange = async (nextMode: string) => {
      const state = useEditorStore.getState();
      if (state.uiMode === nextMode) {
        return true;
      }
      return ensureUnsavedChangesHandled('切换模式');
    };

    const disposeModeChange = EventsOn('mode:change', async (mode: string) => {
      const nextMode = mode === 'note' ? 'property' : mode;
      const canChangeMode = await ensureSavedBeforeModeChange(nextMode);
      if (!canChangeMode) {
        return;
      }

      if (nextMode === 'effect') {
        const state = useEditorStore.getState();
        const dataPath = state.config.dataPath;
        if (!dataPath) {
          ToastManager.error('请先打开项目');
          return;
        }
        const currentFileName = getFileName(state.currentFilePath || state.currentFile);
        if (currentFileName.toLowerCase() !== EFFECTS_FILE_NAME.toLowerCase() || !state.currentData) {
          const loaded = await loadStandardFile(EFFECTS_FILE_NAME, 'data', dataPath);
          if (!loaded) {
            return;
          }
        }
        useEditorStore.getState().setMode('effect');
        return;
      }

      if (nextMode === 'drop') {
        const state = useEditorStore.getState();
        const dataPath = state.config.dataPath;
        if (!dataPath) {
          ToastManager.error('请先打开项目');
          return;
        }

        const currentFileName = getFileName(state.currentFilePath || state.currentFile);
        if (currentFileName.toLowerCase() !== ENEMIES_FILE_NAME.toLowerCase() || !state.currentData) {
          const loaded = await loadStandardFile(ENEMIES_FILE_NAME, 'data', dataPath);
          if (!loaded) {
            return;
          }
        }

        await DataLoaderService.preloadManifest(dataPath);
        useEditorStore.getState().setMode('drop');
        return;
      }

      if (nextMode !== 'equip') {
        useEditorStore.getState().setMode(nextMode as any);
        return;
      }

      const state = useEditorStore.getState();
      const dataPath = state.config.dataPath;
      if (!dataPath) {
        ToastManager.error('请先打开项目');
        return;
      }

      const currentFileName = getFileName(state.currentFilePath || state.currentFile);
      if (currentFileName.toLowerCase() !== ACTORS_FILE_NAME.toLowerCase() || !state.currentData) {
        const loaded = await loadStandardFile(ACTORS_FILE_NAME, 'data', dataPath);
        if (!loaded) {
          return;
        }
      }

      const extensions = await DataLoaderService.ensureEquipExtensionsLoaded(dataPath, { force: true });
      if (!extensions) {
        ToastManager.error('装备扩展数据加载失败');
        return;
      }

      useEditorStore.getState().setMode('equip');
    });

    const disposeScriptCreate = EventsOn('script:create', () => {
      void createScript();
    });

    const disposeScriptDelete = EventsOn('script:delete', () => {
      void deleteScript();
    });

    const disposeScriptCopy = EventsOn('script:copy', () => {
      void copyScript();
    });

    const disposeScriptRename = EventsOn('script:rename', () => {
      void renameScript();
    });

    const disposeScriptSaveCurrent = EventsOn('script:save-current', async () => {
      const result = await saveCurrentScript();
      if (result.status === 'saved') {
        ToastManager.success('脚本已保存');
      }
    });

    const disposeScriptSaveAll = EventsOn('script:save-all', () => {
      void saveAllScripts();
    });

    const disposeScriptDeleteAll = EventsOn('script:delete-all', () => {
      void deleteAllScripts();
    });

    const disposeSaveRequest = EventsOn('file:save-request', () => {
      void saveFile();
    });

    const disposeSaveAllRequest = EventsOn('file:save-all-request', () => {
      void saveAllFiles();
    });

    const handleAuditRepairEvent = () => {
      void handleAuditRepairRequest();
    };
    EventSystem.on('data:audit-repair-request', handleAuditRepairEvent);

    const disposeDataFileChanged = EventsOn('data:file-changed', (payload: DataFileChangePayload) => {
      void handleExternalDataChange(payload);
    });

    const disposeBeforeCloseRequest = EventsOn('app:before-close-request', async () => {
      if (closeRequestPending) {
        return;
      }

      closeRequestPending = true;
      try {
        const canClose = await ensureUnsavedChangesHandled('退出程序');
        if (!canClose) {
          return;
        }
        await ProceedClose();
      } finally {
        closeRequestPending = false;
      }
    });

    return () => {
      EventSystem.off('map:open', handleMapOpen);

      const disposers = [
        disposeWorkspaceLoaded,
        disposeDataSelect,
        disposeModeChange,
        disposeScriptCreate,
        disposeScriptDelete,
        disposeScriptCopy,
        disposeScriptRename,
        disposeScriptSaveCurrent,
        disposeScriptSaveAll,
        disposeScriptDeleteAll,
        disposeSaveRequest,
        disposeSaveAllRequest,
        disposeDataFileChanged,
        disposeBeforeCloseRequest,
      ];

      for (const dispose of disposers) {
        try {
          dispose?.();
        } catch (error) {
          console.warn('Failed to dispose menu listener', error);
        }
      }

      EventSystem.off('data:audit-repair-request', handleAuditRepairEvent);
    };
  };

  return {
    openFile,
    saveFile,
    saveAllFiles,
    checkFileExists,
    setupMenuListeners,
  };
}
