import type { EditorMode } from '../types';

export interface DataFileChangePayload {
  filePath: string;
  fileName: string;
  changeType: string;
}

export type DataChangeReloadTarget = 'none' | 'current-file' | 'dependency' | 'map-browser';

export interface ActivePanelSnapshot {
  uiMode: EditorMode;
  currentFilePath: string;
  currentMapId: number | null;
}

export interface DataChangeImpact {
  shouldReload: boolean;
  shouldConfirm: boolean;
  target: DataChangeReloadTarget;
}

const QUEST_DEPENDENCY_FILES = new Set([
  'quests.json',
  'actors.json',
  'enemies.json',
  'items.json',
  'weapons.json',
  'armors.json',
  'system.json',
]);

const PROJECTILE_DEPENDENCY_FILES = new Set([
  'projectiles.json',
  'animations.json',
  'actors.json',
  'enemies.json',
  'weapons.json',
  'skills.json',
]);

const EQUIP_DEPENDENCY_FILES = new Set([
  'actors.json',
  'weapons.json',
  'armors.json',
  'system.json',
  'equipextensions.json',
]);

const DROP_DEPENDENCY_FILES = new Set([
  'enemies.json',
  'items.json',
  'weapons.json',
  'armors.json',
]);

const PROPERTY_DEPENDENCY_FILES = new Map<string, Set<string>>([
  ['weapons.json', new Set(['system.json', 'skills.json', 'equipextensions.json'])],
]);

export const normalizeDataPathKey = (value: string): string => {
  const normalized = (value || '').replace(/\\/g, '/');
  return /^[A-Za-z]:\//.test(normalized) ? normalized.toLowerCase() : normalized;
};

export const extractFileName = (filePath: string): string => {
  const normalized = (filePath || '').replace(/\\/g, '/');
  return normalized.split('/').pop() || '';
};

const normalizeFileName = (fileName: string): string => (fileName || '').trim().toLowerCase();

export const isMapFileName = (fileName: string): boolean => /^Map\d+\.json$/i.test(fileName || '');

export const isReloadableDataFile = (fileName: string): boolean => {
  if (!fileName) return false;
  const normalized = fileName.toLowerCase();
  return [
    'actors.json',
    'animations.json',
    'armors.json',
    'classes.json',
    'commonevents.json',
    'equipextensions.json',
    'enemies.json',
    'items.json',
    'mapinfos.json',
    'projectiles.json',
    'quests.json',
    'skills.json',
    'states.json',
    'system.json',
    'troops.json',
    'weapons.json',
  ].includes(normalized) || /^map\d+\.json$/i.test(fileName);
};

export const resolveDataChangeImpact = (
  snapshot: ActivePanelSnapshot,
  payload: DataFileChangePayload,
): DataChangeImpact => {
  const currentFilePath = normalizeDataPathKey(snapshot.currentFilePath);
  const changedPath = normalizeDataPathKey(payload.filePath);
  const fileName = normalizeFileName(payload.fileName || extractFileName(payload.filePath));

  if (!isReloadableDataFile(fileName)) {
    return { shouldReload: false, shouldConfirm: false, target: 'none' };
  }

  if (currentFilePath && currentFilePath === changedPath) {
    return { shouldReload: true, shouldConfirm: true, target: 'current-file' };
  }

  const currentFileName = normalizeFileName(extractFileName(snapshot.currentFilePath));
  const propertyDependencies = PROPERTY_DEPENDENCY_FILES.get(currentFileName);
  if ((snapshot.uiMode === 'property' || snapshot.uiMode === 'note') && propertyDependencies?.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'quest' && QUEST_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'projectile' && PROJECTILE_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'equip' && EQUIP_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'drop' && DROP_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (fileName === 'mapinfos.json') {
    if (snapshot.uiMode === 'map' && snapshot.currentMapId === null) {
      return { shouldReload: true, shouldConfirm: true, target: 'map-browser' };
    }
    return { shouldReload: true, shouldConfirm: false, target: 'dependency' };
  }

  return { shouldReload: true, shouldConfirm: false, target: 'dependency' };
};

export const buildDataReloadConfirmMessage = (
  snapshot: ActivePanelSnapshot,
  impact: DataChangeImpact,
  fileName: string,
  hasUnsavedChanges: boolean,
): string => {
  if (hasUnsavedChanges) {
    return `当前正在使用的 ${fileName} 已发生变化，重新加载会覆盖未保存修改。是否继续？`;
  }

  if (impact.target === 'dependency' && snapshot.uiMode === 'projectile') {
    return `当前弹道面板依赖的 ${fileName} 已发生变化，重新加载后会同步刷新动画与引用选项。是否立即重新加载？`;
  }

  if (impact.target === 'map-browser') {
    return `当前地图列表依赖的 ${fileName} 已发生变化，是否立即重新加载？`;
  }

  return `当前面板正在使用的 ${fileName} 已发生变化，是否立即重新加载？`;
};
