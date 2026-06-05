import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, EditorConfig, EditorMode, FileType, GameEffectEntry, RPGItem, RPGMap, RPGMapInfo, RPGQuest, ProjectileTemplate } from '../types';
import { EventSystem } from '../core/EventSystem';
import { DataLoaderService } from '../services/DataLoaderService';
import { BACKSLASH_REGEXP, WINDOWS_DRIVE_REGEXP } from '../constants/regexp';

const STORAGE_KEY = 'rpg-editor-config';
const DIRTY_FILES_KEY = 'rpg-editor-dirty-files';
const DIRTY_ITEM_INDEXES_KEY = 'rpg-editor-dirty-item-indexes';

const normalizePathKey = (input: string): string => {
  const normalized = (input || '').replace(BACKSLASH_REGEXP, '/');
  return WINDOWS_DRIVE_REGEXP.test(normalized) ? normalized.toLowerCase() : normalized;
};

const defaultConfig: EditorConfig = {
  projectRoot: '',
  dataPath: '',
  scriptSavePath: '',
  workspaceRoot: '',
  theme: 'dark' as const,
  accentColor: 'cyan' as const,
  animationsEnabled: true,
  themePreset: 'cyberpunk' as const,
  fontSize: 'medium' as const,
  compactMode: false,
  updateCheckFrequency: 'startup' as const,
};

// 从 localStorage 加载脏文件标记 - 使用 try-catch 避免 SSR 问题
const loadDirtyFiles = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(DIRTY_FILES_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    const normalized: Record<string, boolean> = {};
    Object.entries(parsed).forEach(([filePath, dirty]) => {
      if (!dirty) return;
      normalized[normalizePathKey(filePath)] = true;
    });
    return normalized;
  } catch {
    return {};
  }
};

const loadDirtyItemIndexes = (): Record<string, number[]> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(DIRTY_ITEM_INDEXES_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, number[]>;
    const normalized: Record<string, number[]> = {};
    Object.entries(parsed).forEach(([filePath, indexes]) => {
      if (!Array.isArray(indexes) || indexes.length === 0) return;
      normalized[normalizePathKey(filePath)] = Array.from(new Set(indexes.filter((v) => Number.isInteger(v) && v >= 0)));
    });
    return normalized;
  } catch {
    return {};
  }
};

// 保存脏文件标记到 localStorage - 使用防抖优化
let saveDirtyFilesTimeout: ReturnType<typeof setTimeout> | null = null;
const saveDirtyFiles = (dirtyFiles: Record<string, boolean>) => {
  if (typeof window === 'undefined') return;
  
  // 防抖处理，避免频繁写入
  if (saveDirtyFilesTimeout) {
    clearTimeout(saveDirtyFilesTimeout);
  }
  
  saveDirtyFilesTimeout = setTimeout(() => {
    try {
      localStorage.setItem(DIRTY_FILES_KEY, JSON.stringify(dirtyFiles));
    } catch (error) {
      console.warn('[StateManager] Failed to save dirty files:', error);
    }
  }, 300);
};

let saveDirtyItemIndexesTimeout: ReturnType<typeof setTimeout> | null = null;
const saveDirtyItemIndexes = (dirtyItemIndexes: Record<string, number[]>) => {
  if (typeof window === 'undefined') return;

  if (saveDirtyItemIndexesTimeout) {
    clearTimeout(saveDirtyItemIndexesTimeout);
  }

  saveDirtyItemIndexesTimeout = setTimeout(() => {
    try {
      localStorage.setItem(DIRTY_ITEM_INDEXES_KEY, JSON.stringify(dirtyItemIndexes));
    } catch (error) {
      console.warn('[StateManager] Failed to save dirty item indexes:', error);
    }
  }, 300);
};

interface EditorStore extends AppState {
  // 基础操作
  setMode: (mode: EditorMode) => void;
  loadData: (data: (RPGItem | RPGQuest | ProjectileTemplate | GameEffectEntry | null)[], filePath: string, fileType: FileType) => void;
  loadMapBrowser: (mapInfos: RPGMapInfo[]) => void;
  setMapInfos: (mapInfos: RPGMapInfo[]) => void;
  loadMapData: (mapData: RPGMap, filePath: string, mapId: number) => void;
  updateCurrentMapData: (mapData: RPGMap) => void;
  selectItem: (index: number) => void;
  selectScript: (key: string) => void;
  updateConfig: (config: Partial<typeof defaultConfig>) => void;
  setWorkspaceRoot: (path: string) => void;
  
  // 脏文件管理
  dirtyFiles: Record<string, boolean>;
  dirtyItemIndexes: Record<string, number[]>;
  markFileDirty: (filePath: string) => void;
  markItemDirty: (filePath: string, itemIndex: number) => void;
  markFileClean: (filePath: string) => void;
  isFileDirty: (filePath: string) => boolean;
  getDirtyItemIndexes: (filePath: string) => number[];
  getDirtyFileCount: () => number;
  clearAllDirty: () => void;
  
  // 状态订阅（细粒度）
  subscribeToKey: <K extends keyof AppState>(
    key: K,
    callback: (value: AppState[K]) => void
  ) => () => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get, api) => ({
      // 基础状态
      currentData: null,
      currentMapData: null,
      currentMapInfos: [],
      currentMapId: null,
      currentFile: '',
      currentFilePath: '',
      currentFileType: 'data',
      currentItemIndex: 0,
      currentItem: null,
      currentScriptKey: '',
      config: defaultConfig,
      uiMode: 'script',
      workspaceRoot: '',
      dirtyFiles: loadDirtyFiles(),
      dirtyItemIndexes: loadDirtyItemIndexes(),

      // 基础操作 - 使用批量更新减少重渲染
      setMode: (mode) => {
        set({ uiMode: mode }, false); // false = 不替换整个状态
        EventSystem.emit('mode:changed', mode);
      },

      loadData: (data, filePath, fileType) => {
        const normalizedPath = normalizePathKey(filePath);
        const fileName = normalizedPath.split('/').pop() || '';
        const normalizedFileName = fileName.toLowerCase();
        if (normalizedPath && fileName) {
          DataLoaderService.cacheFileData(normalizedPath, fileName, data);
        }
        set((state) => {
          const fallbackIndex = data.length > 1 ? 1 : 0;
          const isSameFile = !!normalizedPath && state.currentFilePath === normalizedPath;
          const preferredIndex = isSameFile ? state.currentItemIndex : fallbackIndex;
          const clampedIndex = Math.min(Math.max(preferredIndex, 0), Math.max(data.length - 1, 0));
          const nextItem = data[clampedIndex] ?? data[fallbackIndex] ?? null;
          const nextIndex = nextItem === data[clampedIndex] ? clampedIndex : fallbackIndex;
          const nextMode = state.uiMode === 'map'
            ? fileType === 'quest'
              ? 'quest'
              : fileType === 'projectile'
                ? 'projectile'
                : 'property'
            : state.uiMode === 'equip'
              ? normalizedFileName === 'actors.json' && fileType === 'data'
                ? 'equip'
                : fileType === 'quest'
                  ? 'quest'
                  : fileType === 'projectile'
                    ? 'projectile'
                    : 'property'
              : state.uiMode === 'refit'
                ? normalizedFileName === 'actors.json' && fileType === 'data'
                  ? 'refit'
                  : fileType === 'quest'
                    ? 'quest'
                    : fileType === 'projectile'
                      ? 'projectile'
                      : 'property'
              : state.uiMode === 'drop'
                ? normalizedFileName === 'enemies.json' && fileType === 'data'
                  ? 'drop'
                  : fileType === 'quest'
                    ? 'quest'
                    : fileType === 'projectile'
                      ? 'projectile'
                      : 'property'
              : state.uiMode === 'effect'
                ? fileType === 'quest'
                  ? 'quest'
                  : fileType === 'projectile'
                    ? 'projectile'
                    : 'effect'
              : state.uiMode;

          return {
            currentData: data,
            currentMapData: null,
            currentFilePath: normalizedPath,
            currentFile: fileName,
            currentFileType: fileType,
            currentItemIndex: nextIndex,
            currentItem: nextItem,
            currentMapId: null,
            currentScriptKey: '',
            uiMode: nextMode,
          };
        }, false);
        EventSystem.emit('file:loaded', normalizedPath, fileType);
      },

      loadMapBrowser: (mapInfos) => {
        set({
          currentData: null,
          currentMapData: null,
          currentMapInfos: mapInfos,
          currentMapId: null,
          currentFile: '',
          currentFilePath: '',
          currentFileType: 'map',
          currentItemIndex: 0,
          currentItem: null,
          currentScriptKey: '',
          uiMode: 'map',
        }, false);
        EventSystem.emit('map:browser-loaded', mapInfos);
      },

      setMapInfos: (mapInfos) => {
        set((state) => ({
          currentMapInfos: mapInfos,
          currentMapData: state.currentMapData,
          currentMapId: state.currentMapId,
        }), false);
        EventSystem.emit('map:infos-loaded', mapInfos);
      },

      loadMapData: (mapData, filePath, mapId) => {
        const normalizedPath = normalizePathKey(filePath);
        const fileName = normalizedPath.split('/').pop() || '';
        if (normalizedPath && fileName) {
          DataLoaderService.cacheFileData(normalizedPath, fileName, mapData);
        }

        set((state) => ({
          currentData: null,
          currentMapData: mapData,
          currentMapInfos: state.currentMapInfos,
          currentMapId: mapId,
          currentFile: fileName,
          currentFilePath: normalizedPath,
          currentFileType: 'map',
          currentItemIndex: 0,
          currentItem: mapData,
          currentScriptKey: '',
          uiMode: 'map',
        }), false);
        EventSystem.emit('file:loaded', normalizedPath, 'map');
      },

      updateCurrentMapData: (mapData) => {
        const { currentFilePath, currentMapId } = get();
        const normalizedPath = normalizePathKey(currentFilePath);
        const fileName = normalizedPath.split('/').pop() || '';
        if (normalizedPath && fileName) {
          DataLoaderService.cacheFileData(normalizedPath, fileName, mapData);
        }

        let shouldEmitDirty = false;
        set((state) => {
          const nextState: Partial<EditorStore> = {
            currentMapData: mapData,
            currentItem: mapData,
            currentMapId,
          };

          if (normalizedPath && !state.dirtyFiles[normalizedPath]) {
            const newDirtyFiles = { ...state.dirtyFiles, [normalizedPath]: true };
            saveDirtyFiles(newDirtyFiles);
            nextState.dirtyFiles = newDirtyFiles;
            shouldEmitDirty = true;
          }

          return nextState;
        }, false);
        if (shouldEmitDirty) {
          EventSystem.emit('file:dirty', normalizedPath);
        }
        EventSystem.emit('item:updated', mapData);
      },

      selectItem: (index) => {
        const { currentData } = get();
        if (!currentData || index < 0 || index >= currentData.length) return;
        const item = currentData[index];
        set({
          currentItemIndex: index,
          currentItem: item,
          currentScriptKey: '',
        }, false);
        EventSystem.emit('item:selected', index, item);
      },

      selectScript: (key) => {
        set({ currentScriptKey: key }, false);
        EventSystem.emit('script:selected', key);
      },

      updateConfig: (configUpdate) => {
        set((state) => ({
          config: { ...state.config, ...configUpdate },
        }), false);
        EventSystem.emit('config:updated', configUpdate);
      },

      setWorkspaceRoot: (path) => {
        set({ workspaceRoot: path }, false);
      },

      // 脏文件管理 - 优化批量更新
      markFileDirty: (filePath) => {
        const normalizedPath = normalizePathKey(filePath);
        if (!normalizedPath) return;

        set((state) => {
          // 避免不必要的更新
          if (state.dirtyFiles[normalizedPath]) return state;
          
          const newDirtyFiles = { ...state.dirtyFiles, [normalizedPath]: true };
          saveDirtyFiles(newDirtyFiles);
          return { dirtyFiles: newDirtyFiles };
        }, false);
        EventSystem.emit('file:dirty', normalizedPath);
      },

      markItemDirty: (filePath, itemIndex) => {
        const normalizedPath = normalizePathKey(filePath);
        if (!normalizedPath || itemIndex < 0) return;

        set((state) => {
          const currentIndexes = state.dirtyItemIndexes[normalizedPath] || [];
          if (currentIndexes.includes(itemIndex)) {
            return state;
          }

          const newIndexes = [...currentIndexes, itemIndex].sort((a, b) => a - b);
          const nextDirtyIndexes = {
            ...state.dirtyItemIndexes,
            [normalizedPath]: newIndexes,
          };
          saveDirtyItemIndexes(nextDirtyIndexes);
          return { dirtyItemIndexes: nextDirtyIndexes };
        }, false);
      },

      markFileClean: (filePath) => {
        const normalizedPath = normalizePathKey(filePath);
        if (!normalizedPath) return;

        set((state) => {
          // 避免不必要的更新
          if (!state.dirtyFiles[normalizedPath] && !state.dirtyItemIndexes[normalizedPath]) return state;
          
          const newDirtyFiles = { ...state.dirtyFiles };
          delete newDirtyFiles[normalizedPath];

          const newDirtyItemIndexes = { ...state.dirtyItemIndexes };
          delete newDirtyItemIndexes[normalizedPath];

          saveDirtyFiles(newDirtyFiles);
          saveDirtyItemIndexes(newDirtyItemIndexes);
          return {
            dirtyFiles: newDirtyFiles,
            dirtyItemIndexes: newDirtyItemIndexes,
          };
        }, false);
        EventSystem.emit('file:clean', normalizedPath);
      },

      isFileDirty: (filePath) => {
        return !!get().dirtyFiles[normalizePathKey(filePath)];
      },

      getDirtyItemIndexes: (filePath) => {
        const normalizedPath = normalizePathKey(filePath);
        return get().dirtyItemIndexes[normalizedPath] || [];
      },

      getDirtyFileCount: () => {
        return Object.keys(get().dirtyFiles).length;
      },

      clearAllDirty: () => {
        set({
          dirtyFiles: {},
          dirtyItemIndexes: {},
        }, false);
        saveDirtyFiles({});
        saveDirtyItemIndexes({});
      },

      // 状态订阅（细粒度）- 使用 selector 优化
      subscribeToKey: <K extends keyof AppState>(
        key: K,
        callback: (value: AppState[K]) => void
      ) => {
        return api.subscribe((state, prevState) => {
          if (state[key] !== prevState[key]) {
            callback(state[key]);
          }
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ config: state.config }),
      // 添加版本控制
      version: 1,
      // 迁移函数
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState && typeof persistedState === 'object'
          ? persistedState as { config?: Partial<EditorConfig> }
          : {};
        if (version === 0) {
          // 从旧版本迁移
          return {
            ...persisted,
            config: {
              ...defaultConfig,
              ...persisted.config,
            },
          };
        }
        return persisted;
      },
    }
  )
);

// 导出便捷函数 - 使用 selector 优化性能
export const getEditorStore = () => useEditorStore.getState();

// 使用 selector 的便捷访问函数
export const selectCurrentItem = (state: EditorStore) => state.currentItem;
export const selectCurrentData = (state: EditorStore) => state.currentData;
export const selectConfig = (state: EditorStore) => state.config;
export const selectDirtyFiles = (state: EditorStore) => state.dirtyFiles;

export const setEditorStore = (fn: (state: EditorStore) => Partial<EditorStore>) => {
  useEditorStore.setState(fn, false);
};
