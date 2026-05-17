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

export interface DataChangeBatchEntry {
  payload: DataFileChangePayload;
  fileName: string;
  normalizedPath: string;
  impact: DataChangeImpact;
}

export interface DataChangeBatchPlan {
  entries: DataChangeBatchEntry[];
  shouldConfirm: boolean;
  shouldReloadCurrentSelection: boolean;
  affectsCurrentFile: boolean;
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
  ['skills.json', new Set(['projectiles.json'])],
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
  if (snapshot.uiMode === 'property' && propertyDependencies?.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'quest' && QUEST_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if (snapshot.uiMode === 'projectile' && PROJECTILE_DEPENDENCY_FILES.has(fileName)) {
    return { shouldReload: true, shouldConfirm: true, target: 'dependency' };
  }

  if ((snapshot.uiMode === 'equip' || snapshot.uiMode === 'refit') && EQUIP_DEPENDENCY_FILES.has(fileName)) {
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

export const resolveDataChangeBatch = (
  snapshot: ActivePanelSnapshot,
  payloads: DataFileChangePayload[],
): DataChangeBatchPlan => {
  const deduped = new Map<string, DataFileChangePayload>();
  for (const payload of payloads) {
    const fileName = payload.fileName || extractFileName(payload.filePath);
    if (!isReloadableDataFile(fileName)) {
      continue;
    }
    const normalizedPath = normalizeDataPathKey(payload.filePath);
    deduped.set(normalizedPath, {
      ...payload,
      fileName,
    });
  }

  const entries: DataChangeBatchEntry[] = [];
  let shouldConfirm = false;
  let shouldReloadCurrentSelection = false;
  let affectsCurrentFile = false;

  for (const [normalizedPath, payload] of deduped.entries()) {
    const impact = resolveDataChangeImpact(snapshot, payload);
    if (!impact.shouldReload) {
      continue;
    }
    entries.push({
      payload,
      fileName: payload.fileName || extractFileName(payload.filePath),
      normalizedPath,
      impact,
    });
    shouldConfirm = shouldConfirm || impact.shouldConfirm;
    shouldReloadCurrentSelection = shouldReloadCurrentSelection || impact.shouldConfirm;
    affectsCurrentFile = affectsCurrentFile || impact.target === 'current-file';
  }

  return {
    entries,
    shouldConfirm,
    shouldReloadCurrentSelection,
    affectsCurrentFile,
  };
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

  const currentFileName = normalizeFileName(extractFileName(snapshot.currentFilePath));
  if (impact.target === 'dependency' && snapshot.uiMode === 'property'
    && currentFileName === 'skills.json'
    && normalizeFileName(fileName) === 'projectiles.json') {
    return `当前技能面板依赖的 ${fileName} 已发生变化，重新加载后会同步刷新“挂接弹道”选项。是否立即重新加载？`;
  }

  if (impact.target === 'map-browser') {
    return `当前地图列表依赖的 ${fileName} 已发生变化，是否立即重新加载？`;
  }

  return `当前面板正在使用的 ${fileName} 已发生变化，是否立即重新加载？`;
};

export const buildDataReloadBatchConfirmMessage = (
  snapshot: ActivePanelSnapshot,
  plan: DataChangeBatchPlan,
  hasUnsavedChanges: boolean,
): string => {
  const fileNames = Array.from(new Set(plan.entries.map((entry) => entry.fileName)));
  if (fileNames.length === 0) {
    return '检测到外部数据变化，是否立即重新加载？';
  }

  const lines: string[] = [];
  if (hasUnsavedChanges && plan.affectsCurrentFile) {
    lines.push('当前正在编辑的数据文件及其依赖文件发生了外部变化，重新加载会覆盖未保存修改。是否继续？');
  } else if (snapshot.uiMode === 'projectile') {
    lines.push('当前弹道面板依赖的多个文件发生了外部变化。确认后将统一重新加载一次当前编辑上下文。');
  } else {
    lines.push('检测到当前面板使用的多个文件发生了外部变化。确认后将统一重新加载一次当前编辑上下文。');
  }

  lines.push('', '变更文件：');
  for (const fileName of fileNames) {
    lines.push(`- ${fileName}`);
  }
  return lines.join('\n');
};
