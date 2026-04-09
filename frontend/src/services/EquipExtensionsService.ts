export const EQUIP_EXTENSIONS_FILE_NAME = 'EquipExtensions.json';

export interface EquipExtensionsData {
  weaponEquipTypes: Array<number | null>;
  systemWeaponEquipTypes: number[];
  actorEquipSlots: Array<number[] | null>;
  actorEquips: Array<number[] | null>;
}

export interface ActorExtensionEquipState {
  equipSlots: number[];
  equips: number[];
}

export interface NormalizedEquipExtensionsResult {
  data: EquipExtensionsData;
  changed: boolean;
}

export interface EquipExtensionsNormalizationPreview {
  data: EquipExtensionsData;
  changed: boolean;
  summary: string;
  changedSections: string[];
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asInt = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asInt);
};

const normalizeIndexedNumbers = (value: unknown, expectedLength: number): Array<number | null> => {
  const source = Array.isArray(value) ? value : [];
  const result: Array<number | null> = new Array(expectedLength).fill(0);
  result[0] = null;

  for (let index = 1; index < expectedLength; index++) {
    result[index] = asInt(source[index]);
  }

  return result;
};

const normalizeIndexedNumberLists = (value: unknown, expectedLength: number): Array<number[] | null> => {
  const source = Array.isArray(value) ? value : [];
  const result: Array<number[] | null> = new Array(expectedLength).fill(null);
  result[0] = null;

  for (let index = 1; index < expectedLength; index++) {
    result[index] = normalizeNumberArray(source[index]);
  }

  return result;
};

export const createDefaultEquipExtensions = (actorCount: number, weaponCount: number): EquipExtensionsData => ({
  weaponEquipTypes: normalizeIndexedNumbers([], weaponCount),
  systemWeaponEquipTypes: [],
  actorEquipSlots: normalizeIndexedNumberLists([], actorCount),
  actorEquips: normalizeIndexedNumberLists([], actorCount),
});

export const normalizeEquipExtensions = (
  value: unknown,
  actorCount: number,
  weaponCount: number,
): NormalizedEquipExtensionsResult => {
  const source = asRecord(value);
  const fallback = createDefaultEquipExtensions(actorCount, weaponCount);

  if (!source) {
    return {
      data: fallback,
      changed: true,
    };
  }

  const data: EquipExtensionsData = {
    weaponEquipTypes: normalizeIndexedNumbers(source.weaponEquipTypes, weaponCount),
    systemWeaponEquipTypes: Array.from(new Set(normalizeNumberArray(source.systemWeaponEquipTypes).filter((item) => item > 0))),
    actorEquipSlots: normalizeIndexedNumberLists(source.actorEquipSlots, actorCount),
    actorEquips: normalizeIndexedNumberLists(source.actorEquips, actorCount),
  };

  const changed = JSON.stringify(data) !== JSON.stringify(source);
  return { data, changed };
};

const diffIndexedValues = (
  before: Array<number | null> | null | undefined,
  after: Array<number | null>,
): number[] => {
  const changedIndexes: number[] = [];
  const maxLength = Math.max(Array.isArray(before) ? before.length : 0, after.length);
  for (let index = 1; index < maxLength; index++) {
    const beforeValue = asInt(Array.isArray(before) ? before[index] : 0);
    const afterValue = asInt(after[index]);
    if (beforeValue !== afterValue) {
      changedIndexes.push(index);
    }
  }
  return changedIndexes;
};

const diffIndexedLists = (
  before: unknown,
  after: Array<number[] | null>,
): number[] => {
  const source = Array.isArray(before) ? before : [];
  const changedIndexes: number[] = [];
  const maxLength = Math.max(source.length, after.length);
  for (let index = 1; index < maxLength; index++) {
    const beforeList = normalizeNumberArray(source[index]);
    const afterList = normalizeNumberArray(after[index]);
    if (JSON.stringify(beforeList) !== JSON.stringify(afterList)) {
      changedIndexes.push(index);
    }
  }
  return changedIndexes;
};

const formatChangedIndexes = (indexes: number[]): string => {
  if (indexes.length === 0) return '';
  const preview = indexes.slice(0, 8).join(', ');
  if (indexes.length <= 8) {
    return preview;
  }
  return `${preview} 等 ${indexes.length} 项`;
};

export const previewEquipExtensionsNormalization = (
  value: unknown,
  actorCount: number,
  weaponCount: number,
): EquipExtensionsNormalizationPreview => {
  const normalized = normalizeEquipExtensions(value, actorCount, weaponCount);
  if (!normalized.changed) {
    return {
      ...normalized,
      summary: 'EquipExtensions.json 已符合当前规范，无需修复。',
      changedSections: [],
    };
  }

  const source = asRecord(value);
  if (!source) {
    return {
      ...normalized,
      summary: 'EquipExtensions.json 结构无效，确认后会重建为标准结构。',
      changedSections: ['文件结构无效，将整体重建'],
    };
  }

  const changedSections: string[] = [];
  const weaponTypeIndexes = diffIndexedValues(source.weaponEquipTypes as Array<number | null> | undefined, normalized.data.weaponEquipTypes);
  if (weaponTypeIndexes.length > 0) {
    changedSections.push(`weaponEquipTypes：索引 ${formatChangedIndexes(weaponTypeIndexes)} 将被修正`);
  }

  const currentSystemWeaponEquipTypes = normalizeNumberArray(source.systemWeaponEquipTypes);
  if (JSON.stringify(currentSystemWeaponEquipTypes) !== JSON.stringify(normalized.data.systemWeaponEquipTypes)) {
    changedSections.push(`systemWeaponEquipTypes：将整理为 [${normalized.data.systemWeaponEquipTypes.join(', ')}]`);
  }

  const actorEquipSlotIndexes = diffIndexedLists(source.actorEquipSlots, normalized.data.actorEquipSlots);
  if (actorEquipSlotIndexes.length > 0) {
    changedSections.push(`actorEquipSlots：角色 ${formatChangedIndexes(actorEquipSlotIndexes)} 将被修正`);
  }

  const actorEquipsIndexes = diffIndexedLists(source.actorEquips, normalized.data.actorEquips);
  if (actorEquipsIndexes.length > 0) {
    changedSections.push(`actorEquips：角色 ${formatChangedIndexes(actorEquipsIndexes)} 将被修正`);
  }

  const summary = [
    '检测到 EquipExtensions.json 需要规范化。',
    ...changedSections.map((line) => `- ${line}`),
    '',
    '确认后才会写入 EquipExtensions.json。',
  ].join('\n');

  return {
    ...normalized,
    summary,
    changedSections,
  };
};

export const getActorEquipStateFromExtensions = (
  extensions: EquipExtensionsData | null,
  actorIndex: number,
): ActorExtensionEquipState => {
  if (!extensions || actorIndex <= 0) {
    return { equipSlots: [], equips: [] };
  }

  const equips = normalizeNumberArray(extensions.actorEquips[actorIndex]);
  const equipSlots = normalizeNumberArray(extensions.actorEquipSlots[actorIndex]);
  const length = equips.length;
  const nextEquipSlots = equipSlots.slice(0, length);

  while (nextEquipSlots.length < length) {
    nextEquipSlots.push(0);
  }

  return {
    equipSlots: nextEquipSlots,
    equips,
  };
};

export const getWeaponEquipTypeAtIndex = (
  extensions: EquipExtensionsData | null,
  weaponIndex: number,
): number => {
  if (!extensions || weaponIndex <= 0) {
    return 0;
  }
  return asInt(extensions.weaponEquipTypes[weaponIndex]);
};
