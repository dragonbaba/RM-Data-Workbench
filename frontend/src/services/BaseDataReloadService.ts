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
  'Quests.json',
  'Actors.json',
  'Enemies.json',
  'Items.json',
  'Weapons.json',
  'Armors.json',
  'System.json',
]);

const PROJECTILE_DEPENDENCY_FILES = new Set([
  'Projectiles.json',
  'Animations.json',
  'Actors.json',
  'Enemies.json',
  'Weapons.json',
  'Skills.json',
]);

const EQUIP_DEPENDENCY_FILES = new Set([
  'Actors.json',
  'Weapons.json',
  'Armors.json',
  'System.json',
  'EquipExtensions.json',
]);

const DROP_DEPENDENCY_FILES = new Set([
  'Enemies.json',
  'Items.json',
  'Weapons.json',
  'Armors.json',
]);

const PROPERTY_DEPENDENCY_FILES = new Map<string, Set<string>>([
  ['Weapons.json', new Set(['System.json', 'Skills.json', 'EquipExtensions.json'])],
]);

export const normalizeDataPathKey = (value: string): string => {
  const normalized = (value || '').replace(/\\/g, '/');
  return /^[A-Za-z]:\//.test(normalized) ? normalized.toLowerCase() : normalized;
};

export const extractFileName = (filePath: string): string => {
  const normalized = (filePath || '').replace(/\\/g, '/');
  return normalized.split('/').pop() || '';
};

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
  const fileName = payload.fileName || extractFileName(payload.filePath);

  if (!isReloadableDataFile(fileName)) {
    return { shouldReload: false, shouldConfirm: false, target: 'none' };
  }

  if (currentFilePath && currentFilePath === changedPath) {
    return { shouldReload: true, shouldConfirm: true, target: 'current-file' };
  }

  const currentFileName = extractFileName(snapshot.currentFilePath);
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

  if (fileName === 'MapInfos.json') {
    if (snapshot.uiMode === 'map' && snapshot.currentMapId === null) {
      return { shouldReload: true, shouldConfirm: true, target: 'map-browser' };
    }
    return { shouldReload: true, shouldConfirm: false, target: 'dependency' };
  }

  return { shouldReload: true, shouldConfirm: false, target: 'dependency' };
};
