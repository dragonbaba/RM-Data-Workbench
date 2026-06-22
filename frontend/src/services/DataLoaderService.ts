import { FileExists, GetDefaultQuest, ReadJSON, WriteJSON } from '../../wailsjs/go/main/App';
import { EventSystem } from '../core/EventSystem';
import type { RPGMap, RPGMapInfo } from '../types';
import { normalizeStandardDataForEditor } from './DataFileFormatService';
import { BACKSLASH_REGEXP, MAP_ID_REGEXP, TRAILING_PATH_SEPARATORS_REGEXP, WINDOWS_DRIVE_REGEXP } from '../constants/regexp';
import { createDefaultProjectileTemplate } from './ProjectileTemplateService';
import {
  collectTankActorIndexes,
  createDefaultEquipExtensions,
  EQUIP_EXTENSIONS_FILE_NAME,
  normalizeEquipExtensions,
  type EquipExtensionsData,
} from './EquipExtensionsService';
import {
  CLASS_LEVEL_EXTENSIONS_FILE_NAME,
  createDefaultClassLevelExtensions,
  normalizeClassLevelExtensions,
  type ClassLevelExtensionsData,
} from './ClassLevelExtensionsService';

const DATA_FILE_MANIFEST = [
  'Actors.json',
  'Animations.json',
  'Armors.json',
  'Classes.json',
  'CommonEvents.json',
  'Effects.json',
  'Enemies.json',
  'Items.json',
  'Projectiles.json',
  'Quests.json',
  'Skills.json',
  'System.json',
  'Weapons.json',
  'Troops.json',
  'States.json',
];

const MAP_INFOS_FILE_NAME = 'MapInfos.json';
const QUEST_FILE_NAME = 'Quests.json';
const PROJECTILE_FILE_NAME = 'Projectiles.json';
export interface ReloadedFileResult {
  filePath: string;
  fileName: string;
  fileType: 'data' | 'quest' | 'projectile' | 'map';
  kind: 'standard' | 'mapInfos' | 'map' | 'missing' | 'unsupported';
  payload: unknown;
  mapId?: number;
}

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '')}/${fileName}`;
};

const buildMapFileName = (mapId: number) => `Map${String(mapId).padStart(3, '0')}.json`;

class DataLoaderServiceClass {
  private dataPath = '';
  private cache = new Map<string, unknown>();
  private fileNameToPath = new Map<string, string>();
  private mapInfos: RPGMapInfo[] = [];

  private normalizeFileName(fileName: string): string {
    return (fileName || '').toLowerCase();
  }

  private normalizePath(path: string): string {
    const normalized = (path || '').replace(BACKSLASH_REGEXP, '/');
    return WINDOWS_DRIVE_REGEXP.test(normalized) ? normalized.toLowerCase() : normalized;
  }

  private normalizeMapInfos(data: unknown): RPGMapInfo[] {
    if (!Array.isArray(data)) return [];

    return data.flatMap((entry, index) => {
      if (!entry || typeof entry !== 'object') return [];

      const source = entry as Record<string, unknown>;
      const rawId = typeof source.id === 'number' ? source.id : index;
      if (!Number.isInteger(rawId) || rawId <= 0) return [];

      return [{
        id: rawId,
        name: typeof source.name === 'string' && source.name.trim() ? source.name : `地图 ${rawId}`,
        order: index,
        parentId: typeof source.parentId === 'number' ? source.parentId : undefined,
        expanded: typeof source.expanded === 'boolean' ? source.expanded : undefined,
        scrollX: typeof source.scrollX === 'number' ? source.scrollX : undefined,
        scrollY: typeof source.scrollY === 'number' ? source.scrollY : undefined,
      }];
    });
  }

  private cacheData(filePath: string, fileName: string, data: unknown): void {
    const normalizedPath = this.normalizePath(filePath);
    this.cache.set(normalizedPath, data);
    this.fileNameToPath.set(fileName, normalizedPath);
    this.fileNameToPath.set(this.normalizeFileName(fileName), normalizedPath);
  }

  private removeCachedData(filePath: string, fileName: string): void {
    const normalizedPath = this.normalizePath(filePath);
    this.cache.delete(normalizedPath);
    this.fileNameToPath.delete(fileName);
    this.fileNameToPath.delete(this.normalizeFileName(fileName));
    if (fileName.toLowerCase() === MAP_INFOS_FILE_NAME.toLowerCase()) {
      this.mapInfos = [];
    }
  }

  private getFileName(filePath: string): string {
    const normalizedPath = this.normalizePath(filePath);
    return normalizedPath.split('/').pop() || '';
  }

  private getDirectoryPath(filePath: string): string {
    const normalizedPath = this.normalizePath(filePath);
    const lastSlash = normalizedPath.lastIndexOf('/');
    return lastSlash === -1 ? '' : normalizedPath.slice(0, lastSlash);
  }

  private extractMapId(fileName: string): number | null {
    const match = MAP_ID_REGEXP.exec(fileName);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private detectFileType(fileName: string): 'data' | 'quest' | 'projectile' | 'map' {
    const lower = (fileName || '').toLowerCase();
    if (lower.includes('quest')) return 'quest';
    if (lower.includes('projectile')) return 'projectile';
    if (lower === MAP_INFOS_FILE_NAME.toLowerCase() || MAP_ID_REGEXP.test(fileName)) return 'map';
    return 'data';
  }

  private async loadStandardFile(fileName: string, dataPath: string): Promise<unknown[] | null> {
    const filePath = joinPath(dataPath, fileName);
    if (this.isCachedAtPath(filePath, fileName)) {
      return this.getCachedData<unknown[]>(filePath);
    }

    const exists = await FileExists(filePath);
    if (!exists) {
      return null;
    }

    const rawData = await ReadJSON(filePath);
    const normalized = normalizeStandardDataForEditor(fileName, rawData);
    if (!normalized) {
      return null;
    }

    this.cacheData(filePath, fileName, normalized);
    return normalized;
  }

  private isCachedAtPath(filePath: string, fileName: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    if (!this.cache.has(normalizedPath)) return false;
    const mappedPath = this.fileNameToPath.get(fileName) || this.fileNameToPath.get(this.normalizeFileName(fileName));
    return mappedPath === normalizedPath;
  }

  setDataPath(path: string): void {
    this.dataPath = path || '';
  }

  getDataPath(): string {
    return this.dataPath;
  }

  clearCache(): void {
    this.cache.clear();
    this.fileNameToPath.clear();
    this.mapInfos = [];
  }

  getCachedData<T = unknown[]>(filePath: string): T | null {
    return (this.cache.get(this.normalizePath(filePath)) as T | undefined) ?? null;
  }

  getCachedDataByName<T = unknown[]>(fileName: string): T | null {
    const filePath = this.fileNameToPath.get(fileName) || this.fileNameToPath.get(this.normalizeFileName(fileName));
    if (!filePath) return null;
    return this.getCachedData<T>(filePath);
  }

  getFilePathByName(fileName: string): string | null {
    return this.fileNameToPath.get(fileName) || this.fileNameToPath.get(this.normalizeFileName(fileName)) || null;
  }

  getMapInfos(): RPGMapInfo[] {
    return this.mapInfos.slice();
  }

  getDebugInfo(): { dataPath: string; fileNames: string[]; cacheKeys: string[] } {
    return {
      dataPath: this.dataPath,
      fileNames: Array.from(this.fileNameToPath.keys()),
      cacheKeys: Array.from(this.cache.keys()),
    };
  }

  cacheFileData(filePath: string, fileName: string, data: unknown): void {
    this.cacheData(filePath, fileName, data);
  }

  async ensureEquipExtensionsLoaded(dataPath?: string, options: { force?: boolean } = {}): Promise<EquipExtensionsData | null> {
    const resolvedDataPath = dataPath || this.dataPath;
    if (!resolvedDataPath) return null;

    this.setDataPath(resolvedDataPath);

    const filePath = joinPath(resolvedDataPath, EQUIP_EXTENSIONS_FILE_NAME);
    if (!options.force && this.isCachedAtPath(filePath, EQUIP_EXTENSIONS_FILE_NAME)) {
      return this.getCachedData<EquipExtensionsData>(filePath);
    }

    const actorsData = await this.loadStandardFile('Actors.json', resolvedDataPath);
    const weaponsData = await this.loadStandardFile('Weapons.json', resolvedDataPath);
    const actorCount = Array.isArray(actorsData) ? actorsData.length : 1;
    const weaponCount = Array.isArray(weaponsData) ? weaponsData.length : 1;
    const exists = await FileExists(filePath);

    if (!exists) {
      const payload = createDefaultEquipExtensions(actorCount, weaponCount);
      await WriteJSON(filePath, payload);
      this.cacheData(filePath, EQUIP_EXTENSIONS_FILE_NAME, payload);
      return payload;
    }

    const rawData = await ReadJSON(filePath);
    const normalized = normalizeEquipExtensions(rawData, actorCount, weaponCount, collectTankActorIndexes(actorsData));
    this.cacheData(filePath, EQUIP_EXTENSIONS_FILE_NAME, normalized.data);
    return normalized.data;
  }

  async ensureClassLevelExtensionsLoaded(
    dataPath?: string,
    options: { force?: boolean } = {},
  ): Promise<ClassLevelExtensionsData | null> {
    const resolvedDataPath = dataPath || this.dataPath;
    if (!resolvedDataPath) return null;

    this.setDataPath(resolvedDataPath);

    const filePath = joinPath(resolvedDataPath, CLASS_LEVEL_EXTENSIONS_FILE_NAME);
    if (!options.force && this.isCachedAtPath(filePath, CLASS_LEVEL_EXTENSIONS_FILE_NAME)) {
      return this.getCachedData<ClassLevelExtensionsData>(filePath);
    }

    const classesData = await this.loadStandardFile('Classes.json', resolvedDataPath);
    const classCount = Array.isArray(classesData) ? classesData.length : 1;
    const exists = await FileExists(filePath);

    if (!exists) {
      const payload = createDefaultClassLevelExtensions(classCount, classesData);
      await WriteJSON(filePath, payload);
      this.cacheData(filePath, CLASS_LEVEL_EXTENSIONS_FILE_NAME, payload);
      return payload;
    }

    const rawData = await ReadJSON(filePath);
    const normalized = normalizeClassLevelExtensions(rawData, classCount, classesData);
    this.cacheData(filePath, CLASS_LEVEL_EXTENSIONS_FILE_NAME, normalized.data);
    return normalized.data;
  }

  async reloadFile(filePath: string, options: { emitEvent?: boolean } = {}): Promise<ReloadedFileResult> {
    const normalizedPath = this.normalizePath(filePath);
    const fileName = this.getFileName(normalizedPath);
    const fileType = this.detectFileType(fileName);
    const emitEvent = options.emitEvent !== false;

    if (!fileName) {
      return {
        filePath: normalizedPath,
        fileName: '',
        fileType,
        kind: 'unsupported',
        payload: null,
      };
    }

    const exists = await FileExists(normalizedPath);
    if (!exists) {
      this.removeCachedData(normalizedPath, fileName);
      return {
        filePath: normalizedPath,
        fileName,
        fileType,
        kind: 'missing',
        payload: null,
      };
    }

    if (fileName.toLowerCase() === EQUIP_EXTENSIONS_FILE_NAME.toLowerCase()) {
      const extensions = await this.ensureEquipExtensionsLoaded(this.getDirectoryPath(normalizedPath), { force: true });
      if (emitEvent) {
        EventSystem.emit('data:file-loaded', { fileName, filePath: normalizedPath, type: 'data' });
      }
      return {
        filePath: normalizedPath,
        fileName,
        fileType: 'data',
        kind: 'standard',
        payload: extensions,
      };
    }

    if (fileName.toLowerCase() === CLASS_LEVEL_EXTENSIONS_FILE_NAME.toLowerCase()) {
      const extensions = await this.ensureClassLevelExtensionsLoaded(this.getDirectoryPath(normalizedPath), { force: true });
      if (emitEvent) {
        EventSystem.emit('data:file-loaded', { fileName, filePath: normalizedPath, type: 'data' });
      }
      return {
        filePath: normalizedPath,
        fileName,
        fileType: 'data',
        kind: 'standard',
        payload: extensions,
      };
    }

    if (fileName.toLowerCase() === MAP_INFOS_FILE_NAME.toLowerCase()) {
      const mapInfos = await this.ensureMapInfosLoaded(this.getDirectoryPath(normalizedPath), { force: true });
      if (emitEvent) {
        EventSystem.emit('data:file-loaded', { fileName, filePath: normalizedPath, type: 'map' });
      }
      return {
        filePath: normalizedPath,
        fileName,
        fileType: 'map',
        kind: 'mapInfos',
        payload: mapInfos,
      };
    }

    const mapId = this.extractMapId(fileName);
    if (mapId !== null) {
      const result = await this.loadMapById(mapId, this.getDirectoryPath(normalizedPath), { force: true });
      if (!result) {
        return {
          filePath: normalizedPath,
          fileName,
          fileType: 'map',
          kind: 'missing',
          payload: null,
          mapId,
        };
      }
      if (emitEvent) {
        EventSystem.emit('data:file-loaded', { fileName, filePath: normalizedPath, type: 'map' });
      }
      return {
        filePath: normalizedPath,
        fileName,
        fileType: 'map',
        kind: 'map',
        payload: result.mapData,
        mapId,
      };
    }

    const rawData = await ReadJSON(normalizedPath);
    const normalizedData = normalizeStandardDataForEditor(fileName, rawData);
    if (!normalizedData) {
      return {
        filePath: normalizedPath,
        fileName,
        fileType,
        kind: 'unsupported',
        payload: null,
      };
    }

    this.cacheData(normalizedPath, fileName, normalizedData);
    if (emitEvent) {
      EventSystem.emit('data:file-loaded', { fileName, filePath: normalizedPath, type: fileType });
    }
    return {
      filePath: normalizedPath,
      fileName,
      fileType,
      kind: 'standard',
      payload: normalizedData,
    };
  }

  async ensureMapInfosLoaded(dataPath?: string, options: { force?: boolean } = {}): Promise<RPGMapInfo[]> {
    const resolvedDataPath = dataPath || this.dataPath;
    if (!resolvedDataPath) return [];

    this.setDataPath(resolvedDataPath);

    const filePath = joinPath(resolvedDataPath, MAP_INFOS_FILE_NAME);
    if (!options.force && this.mapInfos.length > 0 && this.isCachedAtPath(filePath, MAP_INFOS_FILE_NAME)) {
      return this.getMapInfos();
    }

    const exists = await FileExists(filePath);
    if (!exists) {
      this.mapInfos = [];
      return [];
    }

    const rawData = await ReadJSON(filePath);
    const normalized = this.normalizeMapInfos(rawData);
    this.mapInfos = normalized;
    this.cacheData(filePath, MAP_INFOS_FILE_NAME, normalized);
    EventSystem.emit('map:infos-loaded', normalized);
    return normalized;
  }

  async loadMapById(mapId: number, dataPath?: string, options: { force?: boolean } = {}): Promise<{ filePath: string; fileName: string; mapData: RPGMap } | null> {
    const resolvedDataPath = dataPath || this.dataPath;
    if (!resolvedDataPath || !Number.isInteger(mapId) || mapId <= 0) {
      return null;
    }

    this.setDataPath(resolvedDataPath);

    const fileName = buildMapFileName(mapId);
    const filePath = joinPath(resolvedDataPath, fileName);
    if (!options.force && this.isCachedAtPath(filePath, fileName)) {
      const cached = this.getCachedData<RPGMap>(filePath);
      if (cached && typeof cached === 'object') {
        return { filePath, fileName, mapData: cached };
      }
    }

    const exists = await FileExists(filePath);
    if (!exists) return null;

    const rawData = await ReadJSON(filePath);
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      return null;
    }

    const mapData = rawData as RPGMap;
    this.cacheData(filePath, fileName, mapData);
    EventSystem.emit('map:file-loaded', { mapId, fileName, filePath });
    return { filePath, fileName, mapData };
  }

  async preloadManifest(
    dataPath?: string,
    options: { force?: boolean } = {},
  ): Promise<{ loaded: string[]; missing: string[]; failed: string[] }> {
    const resolvedDataPath = dataPath || this.dataPath;
    if (!resolvedDataPath) {
      return { loaded: [], missing: [], failed: [] };
    }

    this.setDataPath(resolvedDataPath);

    const loaded: string[] = [];
    const missing: string[] = [];
    const failed: string[] = [];

    const shouldForce = !!options.force;
    const tasks = DATA_FILE_MANIFEST.map(async (fileName) => {
      const filePath = joinPath(resolvedDataPath, fileName);
      if (!shouldForce && this.isCachedAtPath(filePath, fileName)) {
        return { fileName, status: 'loaded' as const };
      }
      const exists = await FileExists(filePath);

      if (!exists) {
        if (fileName === QUEST_FILE_NAME) {
          try {
            const defaultQuest = await GetDefaultQuest();
            const payload = [null, defaultQuest];
            await WriteJSON(filePath, payload);
            this.cacheData(filePath, fileName, payload);
            return { fileName, status: 'loaded' as const };
          } catch {
            return { fileName, status: 'failed' as const };
          }
        }

        if (fileName === PROJECTILE_FILE_NAME) {
          try {
            const payload = [null, createDefaultProjectileTemplate()];
            await WriteJSON(filePath, payload);
            this.cacheData(filePath, fileName, payload);
            return { fileName, status: 'loaded' as const };
          } catch {
            return { fileName, status: 'failed' as const };
          }
        }

        return { fileName, status: 'missing' as const };
      }

      try {
        const data = await ReadJSON(filePath);
        const normalized = normalizeStandardDataForEditor(fileName, data);
        if (!normalized) {
          return { fileName, status: 'failed' as const };
        }

        this.cacheData(filePath, fileName, normalized);
        return { fileName, status: 'loaded' as const };
      } catch {
        return { fileName, status: 'failed' as const };
      }
    });

    const results = await Promise.all(tasks);
    for (const result of results) {
      if (result.status === 'loaded') loaded.push(result.fileName);
      if (result.status === 'missing') missing.push(result.fileName);
      if (result.status === 'failed') failed.push(result.fileName);
    }

    try {
      const extensions = await this.ensureEquipExtensionsLoaded(resolvedDataPath, { force: shouldForce });
      if (extensions) {
        loaded.push(EQUIP_EXTENSIONS_FILE_NAME);
      } else {
        failed.push(EQUIP_EXTENSIONS_FILE_NAME);
      }
    } catch {
      failed.push(EQUIP_EXTENSIONS_FILE_NAME);
    }

    try {
      const classLevelExtensions = await this.ensureClassLevelExtensionsLoaded(resolvedDataPath, { force: shouldForce });
      if (classLevelExtensions) {
        loaded.push(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
      } else {
        failed.push(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
      }
    } catch {
      failed.push(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
    }

    EventSystem.emit('data:manifest-loaded', { loaded, missing, failed });
    return { loaded, missing, failed };
  }
}

export const DataLoaderService = new DataLoaderServiceClass();
export default DataLoaderService;
