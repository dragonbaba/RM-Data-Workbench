import { normalizeEnemyDataEntry } from './EnemyPropertyService';
import { normalizeEquipmentDataEntry } from './EquipmentPropertyService';
import { EFFECTS_FILE_NAME, normalizeEffectIdList, normalizeGameEffectEntry } from './GameEffectService';
import { normalizePassiveStateHostEntry } from './PassiveStatePropertyService';
import { arePlainDataEqual } from './PlainDataCompare';
import { normalizeProjectileDataEntry } from './ProjectileTemplateService';
import { normalizeCommonRangeDataEntry } from './RangePropertyService';
import { normalizeSkillDataEntry } from './SkillPropertyService';
import { normalizeStateDataEntry } from './StateChargePropertyService';
import { normalizeStandardDataForEditor } from './DataFileFormatService';
import {
  OWNER_EXTRA_PARAM_KEYS,
  OWNER_PARAM_RATE_KEYS,
  OWNER_SCALAR_KEYS,
  OWNER_SPECIAL_PARAM_KEYS,
} from '../types';

export const ACTORS_FILE_NAME = 'Actors.json';
export const CLASSES_FILE_NAME = 'Classes.json';
export const SKILLS_FILE_NAME = 'Skills.json';
export const AUDIT_TARGET_FILE_NAMES = [
  ACTORS_FILE_NAME,
  CLASSES_FILE_NAME,
  SKILLS_FILE_NAME,
  'States.json',
  'Enemies.json',
  'Items.json',
  'Weapons.json',
  'Armors.json',
  'Projectiles.json',
  EFFECTS_FILE_NAME,
] as const;

export const SYSTEM_FILE_NAME = 'System.json';
const FLAT_PARAM_HOST_FILE_NAMES = new Set([
  ACTORS_FILE_NAME,
  'Enemies.json',
  'Weapons.json',
  'Armors.json',
]);
const FLOAT_PARAM_HOST_FILE_NAMES = new Set([
  'Weapons.json',
  'Armors.json',
]);
const EQUIPMENT_TEMPLATE_HOST_FILE_NAMES = new Set([
  'Weapons.json',
  'Armors.json',
]);
const OWNER_PARAM_HOST_FILE_NAMES = new Set([
  ACTORS_FILE_NAME,
  CLASSES_FILE_NAME,
  'States.json',
  'Enemies.json',
  'Weapons.json',
  'Armors.json',
]);
const PASSIVE_STATE_HOST_FILE_NAMES = new Set([
  ACTORS_FILE_NAME,
  CLASSES_FILE_NAME,
  'Enemies.json',
  'Weapons.json',
  'Armors.json',
]);
const LEGACY_OWNER_EFFECT_TYPES = new Set([
  'owner_stat_bonus',
  'owner_scalar_bonus',
  'owner_param_rate_bonus',
  'owner_element_rate_bonus',
  'cunit_owner_stat_bonus',
]);
const OWNER_PROBABILITY_EXTRA_PARAM_KEYS = new Set([
  'hitRate',
  'evadeRate',
  'critRate',
  'interceptRate',
]);
const CLASS_PARAM_COUNT = 8;
const CLASS_PARAM_LEVEL_COUNT = 100;

export interface DataAuditFileResult {
  fileName: string;
  filePath: string;
  checkedEntries: number;
  repairedEntries: number;
  changed: boolean;
}

export interface DataAuditSummary {
  checkedFiles: number;
  repairedFiles: number;
  repairedEntries: number;
  results: DataAuditFileResult[];
}

export interface DataAuditDependencies {
  readJson: (filePath: string) => Promise<unknown>;
  writeJson: (filePath: string, data: unknown) => Promise<unknown>;
}

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const normalizeFilePayload = (fileName: string, data: unknown): unknown[] => {
  const normalized = normalizeStandardDataForEditor(fileName, data);
  if (!normalized) {
    throw new Error(`无法读取标准数据文件: ${fileName}`);
  }
  return normalized;
};

const normalizeEntryByFileName = (
  fileName: string,
  entry: unknown,
  systemData: unknown,
  skillsData?: unknown[] | null,
) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return entry;
  }

  if (fileName === SKILLS_FILE_NAME) {
    const normalized = normalizeSkillDataEntry(entry) ?? entry;
    return normalizeCommonRangeDataEntry(normalized) ?? normalized;
  }

  if (fileName === 'Enemies.json') {
    return normalizePassiveStateHostEntry(normalizeEnemyDataEntry(entry, skillsData) ?? entry) ?? entry;
  }

  if (fileName === 'States.json') {
    return normalizeStateDataEntry(entry) ?? entry;
  }

  if (fileName === ACTORS_FILE_NAME) {
    const normalized = normalizePassiveStateHostEntry(entry) ?? entry;
    return ensureActorThrowProjectileOffset(normalized as Record<string, unknown>, systemData);
  }

  if (fileName === CLASSES_FILE_NAME) {
    return normalizePassiveStateHostEntry(entry) ?? entry;
  }

  if (fileName === 'Items.json') {
    const normalized = normalizeSkillDataEntry(entry, { isItem: true }) ?? entry;
    const itemNormalized = normalizeCommonRangeDataEntry(normalized) ?? normalized;
    if (itemNormalized && typeof itemNormalized === 'object' && !Array.isArray(itemNormalized)) {
      const nextItem = { ...(itemNormalized as Record<string, unknown>) };
      delete nextItem.skillCosts;
      return nextItem;
    }
    return itemNormalized;
  }

  if (fileName === 'Weapons.json') {
    return normalizePassiveStateHostEntry(normalizeEquipmentDataEntry(entry, { isWeapon: true, systemData }) ?? entry) ?? entry;
  }

  if (fileName === 'Armors.json') {
    return normalizePassiveStateHostEntry(normalizeEquipmentDataEntry(entry, { isArmor: true, systemData }) ?? entry) ?? entry;
  }

  if (fileName === 'Projectiles.json') {
    return normalizeProjectileDataEntry(entry) ?? entry;
  }

  if (fileName === EFFECTS_FILE_NAME) {
    return normalizeGameEffectEntry(entry, systemData) ?? entry;
  }

  return entry;
};

const sanitizeEntryByFileContract = (
  fileName: string,
  entry: unknown,
): unknown => {
  const record = asRecord(entry);
  if (!record) {
    return entry;
  }

  const nextEntry = fileName === CLASSES_FILE_NAME
    ? normalizeClassParamMatrix(record)
    : { ...record };

  if (fileName !== CLASSES_FILE_NAME && !FLAT_PARAM_HOST_FILE_NAMES.has(fileName) && hasOwnKey(nextEntry, 'params')) {
    nextEntry.params = undefined;
  }
  if (!FLOAT_PARAM_HOST_FILE_NAMES.has(fileName) && hasOwnKey(nextEntry, 'floatParams')) {
    nextEntry.floatParams = undefined;
  }
  if (!EQUIPMENT_TEMPLATE_HOST_FILE_NAMES.has(fileName)) {
    if (hasOwnKey(nextEntry, 'extraParams')) {
      nextEntry.extraParams = undefined;
    }
    if (hasOwnKey(nextEntry, 'vehicleParams')) {
      nextEntry.vehicleParams = undefined;
    }
    if (hasOwnKey(nextEntry, 'upgradeParams')) {
      nextEntry.upgradeParams = undefined;
    }
  }
  if (!OWNER_PARAM_HOST_FILE_NAMES.has(fileName) && hasOwnKey(nextEntry, 'ownerParams')) {
    nextEntry.ownerParams = undefined;
  }
  if (!PASSIVE_STATE_HOST_FILE_NAMES.has(fileName) && hasOwnKey(nextEntry, 'passiveStates')) {
    nextEntry.passiveStates = undefined;
  }

  return nextEntry;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const hasOwnKey = (value: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const toFiniteNumber = (value: unknown): number | null => {
  const nextValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const toFiniteInteger = (value: unknown): number | null => {
  const numeric = toFiniteNumber(value);
  return numeric == null ? null : Math.trunc(numeric);
};

const normalizeOwnerExtraParamValue = (key: string, value: unknown): number => {
  const numeric = toFiniteNumber(value) ?? 0;
  if (!OWNER_PROBABILITY_EXTRA_PARAM_KEYS.has(key)) {
    return numeric;
  }
  if (numeric <= 0) return 0;
  if (numeric >= 100) return 100;
  return numeric;
};

const getSystemElementCount = (systemData: unknown): number => {
  const record = asRecord(systemData);
  const elements = Array.isArray(record?.elements) ? record.elements : [];
  return elements.length;
};

const getSystemWeaponTypeCount = (systemData: unknown): number => {
  const record = asRecord(systemData);
  const weaponTypes = Array.isArray(record?.weaponTypes) ? record.weaponTypes : [];
  return weaponTypes.length;
};

const buildClassParamRow = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return new Array(CLASS_PARAM_LEVEL_COUNT).fill(toFiniteInteger(value) ?? 0);
  }

  const nextRow = new Array(CLASS_PARAM_LEVEL_COUNT);
  let fallback = 0;
  for (let index = 0; index < CLASS_PARAM_LEVEL_COUNT; index++) {
    const normalized = toFiniteInteger(value[index]);
    if (normalized != null) {
      fallback = normalized;
    }
    nextRow[index] = fallback;
  }
  return nextRow;
};

const normalizeClassParamMatrix = (entry: Record<string, unknown>): Record<string, unknown> => {
  const rawParams = Array.isArray(entry.params) ? entry.params : [];
  const nextParams = new Array(CLASS_PARAM_COUNT);
  for (let index = 0; index < CLASS_PARAM_COUNT; index++) {
    nextParams[index] = buildClassParamRow(rawParams[index]);
  }
  return {
    ...entry,
    params: nextParams,
  };
};

type LegacyOwnerGroupKey = 'extraParams' | 'specialParams' | 'scalar' | 'paramRate' | 'elementRate';
type FixedOwnerGroupKey = Exclude<LegacyOwnerGroupKey, 'elementRate'>;

const OWNER_GROUP_KEYS = Object.freeze({
  extraParams: OWNER_EXTRA_PARAM_KEYS,
  specialParams: OWNER_SPECIAL_PARAM_KEYS,
  scalar: OWNER_SCALAR_KEYS,
  paramRate: OWNER_PARAM_RATE_KEYS,
});
const OWNER_GROUP_INDEX_MAP: Record<FixedOwnerGroupKey, Map<string, number>> = Object.freeze({
  extraParams: new Map<string, number>(OWNER_EXTRA_PARAM_KEYS.map((key, index) => [key, index])),
  specialParams: new Map<string, number>(OWNER_SPECIAL_PARAM_KEYS.map((key, index) => [key, index])),
  scalar: new Map<string, number>(OWNER_SCALAR_KEYS.map((key, index) => [key, index])),
  paramRate: new Map<string, number>(OWNER_PARAM_RATE_KEYS.map((key, index) => [key, index])),
});

interface MutableOwnerParams {
  extraParams?: number[];
  specialParams?: number[];
  scalar?: number[];
  paramRate?: number[];
  elementRate?: number[];
}

interface ProjectileOffsetPoint {
  x: number;
  y: number;
}

interface LegacyOwnerOp {
  group: LegacyOwnerGroupKey;
  key: string;
  value: number;
}

interface LegacyOwnerEffectEntry {
  id: number;
  ops: LegacyOwnerOp[];
}

const collectLegacyOwnerEffects = (effectsData: unknown): Map<number, LegacyOwnerEffectEntry> => {
  const result = new Map<number, LegacyOwnerEffectEntry>();
  if (!Array.isArray(effectsData)) {
    return result;
  }

  for (let index = 1; index < effectsData.length; index++) {
    const record = asRecord(effectsData[index]);
    if (!record) {
      continue;
    }
    const effectType = typeof record.effectType === 'string' ? record.effectType : '';
    if (!LEGACY_OWNER_EFFECT_TYPES.has(effectType)) {
      continue;
    }
    const config = asRecord(record.config);
    const args = asRecord(config?.args);
    const rawOps = Array.isArray(args?.ops) ? args?.ops : null;
    if (!rawOps || rawOps.length === 0) {
      continue;
    }
    const ops: LegacyOwnerOp[] = [];
    let valid = true;
    for (const rawOp of rawOps) {
      const row = asRecord(rawOp);
      const group = typeof row?.group === 'string' ? row.group : '';
      const key = typeof row?.key === 'string' ? row.key : '';
      const op = typeof row?.op === 'string' ? row.op : '';
      const value = toFiniteNumber(row?.value);
      if (
        (group !== 'extraParams'
          && group !== 'specialParams'
          && group !== 'scalar'
          && group !== 'paramRate'
          && group !== 'elementRate')
        || key.length === 0
        || op !== 'add'
        || value == null
      ) {
        valid = false;
        break;
      }
      ops.push({ group, key, value });
    }
    if (!valid || ops.length === 0) {
      continue;
    }
    result.set(index, { id: index, ops });
  }

  return result;
};

const buildOwnerFixedGroupArray = (
  groupKey: FixedOwnerGroupKey,
  value: unknown,
): number[] => {
  const keys = OWNER_GROUP_KEYS[groupKey];
  const nextValues = new Array(keys.length).fill(0);
  if (Array.isArray(value)) {
    for (let index = 0; index < keys.length; index++) {
      nextValues[index] = groupKey === 'extraParams'
        ? normalizeOwnerExtraParamValue(keys[index], value[index])
        : (toFiniteNumber(value[index]) ?? 0);
    }
  } else {
    const record = asRecord(value);
    if (!record) {
      return nextValues;
    }
    for (let index = 0; index < keys.length; index++) {
      nextValues[index] = groupKey === 'extraParams'
        ? normalizeOwnerExtraParamValue(keys[index], record[keys[index]])
        : (toFiniteNumber(record[keys[index]]) ?? 0);
    }
  }
  return nextValues;
};

const buildOwnerElementRateArray = (
  value: unknown,
  elementCount: number,
) => {
  const source = Array.isArray(value) ? value : [];
  const length = Math.max(1, elementCount, source.length);
  const nextValues = new Array(length).fill(0);
  for (let index = 0; index < length; index++) {
    nextValues[index] = toFiniteNumber(source[index]) ?? 0;
  }
  return nextValues;
};

const getOwnerParamsRecord = (
  entry: Record<string, unknown>,
  elementCount: number,
): MutableOwnerParams => {
  const currentOwnerParams = asRecord(entry.ownerParams);
  if (!currentOwnerParams) {
    return {};
  }
  return {
    extraParams: buildOwnerFixedGroupArray('extraParams', currentOwnerParams.extraParams),
    specialParams: buildOwnerFixedGroupArray('specialParams', currentOwnerParams.specialParams),
    scalar: buildOwnerFixedGroupArray('scalar', currentOwnerParams.scalar),
    paramRate: buildOwnerFixedGroupArray('paramRate', currentOwnerParams.paramRate),
    elementRate: buildOwnerElementRateArray(currentOwnerParams.elementRate, elementCount),
  };
};

const ensureOwnerFixedGroup = (
  ownerParams: MutableOwnerParams,
  groupKey: FixedOwnerGroupKey,
) => {
  let group = ownerParams[groupKey];
  if (group) {
    return group;
  }
  group = new Array(OWNER_GROUP_KEYS[groupKey].length).fill(0);
  ownerParams[groupKey] = group;
  return group;
};

const ensureOwnerElementRateGroup = (
  ownerParams: MutableOwnerParams,
  elementCount: number,
) => {
  let group = ownerParams.elementRate;
  if (group) {
    if (group.length < elementCount) {
      group.length = elementCount;
      for (let index = 0; index < group.length; index++) {
        group[index] = toFiniteNumber(group[index]) ?? 0;
      }
    }
    return group;
  }
  group = new Array(elementCount).fill(0);
  ownerParams.elementRate = group;
  return group;
};

const applyLegacyOwnerOp = (
  ownerParams: MutableOwnerParams,
  op: LegacyOwnerOp,
  elementCount: number,
) => {
  if (op.group === 'elementRate') {
    const elementId = Number(op.key) | 0;
    if (elementId <= 0) {
      return;
    }
    const currentArray = ensureOwnerElementRateGroup(ownerParams, Math.max(elementCount, elementId + 1));
    currentArray[elementId] = (toFiniteNumber(currentArray[elementId]) ?? 0) + op.value;
    return;
  }
  const groupKey = op.group as FixedOwnerGroupKey;
  const index = OWNER_GROUP_INDEX_MAP[groupKey].get(op.key);
  if (index == null) {
    return;
  }
  const nextGroup = ensureOwnerFixedGroup(ownerParams, groupKey);
  nextGroup[index] = (toFiniteNumber(nextGroup[index]) ?? 0) + op.value;
};

const normalizeOwnerParams = (
  ownerParams: MutableOwnerParams,
  elementCount: number,
): MutableOwnerParams => {
  const result: MutableOwnerParams = {};
  const groupKeys: FixedOwnerGroupKey[] = ['extraParams', 'specialParams', 'scalar', 'paramRate'];
  for (const groupKey of groupKeys) {
    const source = ownerParams[groupKey];
    const nextGroup = new Array(OWNER_GROUP_KEYS[groupKey].length).fill(0);
    for (let index = 0; index < nextGroup.length; index++) {
      nextGroup[index] = groupKey === 'extraParams'
        ? normalizeOwnerExtraParamValue(OWNER_GROUP_KEYS[groupKey][index], source?.[index])
        : (toFiniteNumber(source?.[index]) ?? 0);
    }
    result[groupKey] = nextGroup;
  }

  const rawElementRate = ownerParams.elementRate;
  const elementRateLength = Math.max(1, elementCount, rawElementRate?.length ?? 0);
  const nextElementRate = new Array(elementRateLength).fill(0);
  for (let index = 0; index < nextElementRate.length; index++) {
    nextElementRate[index] = toFiniteNumber(rawElementRate?.[index]) ?? 0;
  }
  result.elementRate = nextElementRate;

  return result;
};

const DEFAULT_THROW_PROJECTILE_OFFSET = Object.freeze({ x: -36, y: -23 });
const HUMAN_WEAPON_TYPE_ID = 4;

const toProjectileOffsetPoint = (value: unknown): ProjectileOffsetPoint | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    x: toFiniteNumber(record.x) ?? 0,
    y: toFiniteNumber(record.y) ?? 0,
  };
};

const getArrayProjectileOffsetPoint = (offsets: unknown[], index: number): ProjectileOffsetPoint | null => {
  if (index < 0 || index >= offsets.length) {
    return null;
  }
  return toProjectileOffsetPoint(offsets[index]);
};

const getRecordProjectileOffsetPoint = (
  offsets: Record<string, unknown>,
  key: string,
): ProjectileOffsetPoint | null => {
  return toProjectileOffsetPoint(offsets[key]);
};

const findFirstProjectileOffsetPoint = (value: unknown): ProjectileOffsetPoint | null => {
  if (Array.isArray(value)) {
    for (let index = 1; index < value.length; index++) {
      const point = getArrayProjectileOffsetPoint(value, index);
      if (point) {
        return point;
      }
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const keys = Object.keys(record).sort((left, right) => (Number(left) | 0) - (Number(right) | 0));
  for (let index = 0; index < keys.length; index++) {
    const point = getRecordProjectileOffsetPoint(record, keys[index]);
    if (point) {
      return point;
    }
  }
  return null;
};

const ensureActorThrowProjectileOffset = (
  entry: Record<string, unknown>,
  systemData: unknown,
): Record<string, unknown> => {
  const throwWtypeId = getSystemWeaponTypeCount(systemData);
  if (throwWtypeId <= 0) {
    return entry;
  }
  const rawOffsets = entry.projectileOffset;
  const throwKey = String(throwWtypeId);
  if (Array.isArray(rawOffsets)) {
    if (getArrayProjectileOffsetPoint(rawOffsets, throwWtypeId)) {
      return entry;
    }
    const nextPoint = getArrayProjectileOffsetPoint(rawOffsets, HUMAN_WEAPON_TYPE_ID)
      || findFirstProjectileOffsetPoint(rawOffsets)
      || DEFAULT_THROW_PROJECTILE_OFFSET;
    const nextEntry = { ...entry };
    const nextOffsets = rawOffsets.slice();
    nextOffsets[throwWtypeId] = { x: nextPoint.x, y: nextPoint.y };
    nextEntry.projectileOffset = nextOffsets;
    return nextEntry;
  }
  const offsetRecord = asRecord(rawOffsets);
  if (offsetRecord && getRecordProjectileOffsetPoint(offsetRecord, throwKey)) {
    return entry;
  }
  const nextPoint = (offsetRecord && getRecordProjectileOffsetPoint(offsetRecord, String(HUMAN_WEAPON_TYPE_ID)))
    || findFirstProjectileOffsetPoint(offsetRecord)
    || DEFAULT_THROW_PROJECTILE_OFFSET;
  const nextEntry = { ...entry };
  nextEntry.projectileOffset = {
    ...(offsetRecord ?? {}),
    [throwKey]: { x: nextPoint.x, y: nextPoint.y },
  };
  return nextEntry;
};

const migrateLegacyOwnerEffectsOnEntry = (
  entry: unknown,
  legacyOwnerEffects: Map<number, LegacyOwnerEffectEntry>,
  systemData: unknown,
): unknown => {
  const record = asRecord(entry);
  if (!record) {
    return entry;
  }
  const effectIds = normalizeEffectIdList(record.effects);
  const elementCount = getSystemElementCount(systemData);
  const ownerParams = getOwnerParamsRecord(record, elementCount);
  const migratedEffects = effectIds.filter((effectId) => legacyOwnerEffects.has(effectId));
  for (const effectId of migratedEffects) {
    const effectEntry = legacyOwnerEffects.get(effectId);
    if (!effectEntry) {
      continue;
    }
    for (const op of effectEntry.ops) {
      applyLegacyOwnerOp(ownerParams, op, elementCount);
    }
  }

  const nextEntry: Record<string, unknown> = { ...record };
  if (migratedEffects.length > 0) {
    nextEntry.effects = effectIds.filter((effectId) => !legacyOwnerEffects.has(effectId));
  }
  nextEntry.ownerParams = normalizeOwnerParams(ownerParams, elementCount);
  return nextEntry;
};

export async function auditAndRepairDataFiles(
  dataPath: string,
  deps: DataAuditDependencies,
): Promise<DataAuditSummary> {
  const systemPath = joinPath(dataPath, SYSTEM_FILE_NAME);
  const systemData = await deps.readJson(systemPath);
  const skillsPath = joinPath(dataPath, SKILLS_FILE_NAME);
  const rawSkillsData = await deps.readJson(skillsPath);
  const normalizedSkillsData = normalizeFilePayload(SKILLS_FILE_NAME, rawSkillsData).map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return entry;
    }
    const normalized = normalizeSkillDataEntry(entry) ?? entry;
    return normalizeCommonRangeDataEntry(normalized) ?? normalized;
  });
  const effectsPath = joinPath(dataPath, EFFECTS_FILE_NAME);
  const rawEffectsData = await deps.readJson(effectsPath);
  const legacyOwnerEffects = collectLegacyOwnerEffects(rawEffectsData);
  const results: DataAuditFileResult[] = [];

  for (const fileName of AUDIT_TARGET_FILE_NAMES) {
    const filePath = joinPath(dataPath, fileName);
    const rawData = fileName === EFFECTS_FILE_NAME
      ? rawEffectsData
      : fileName === SKILLS_FILE_NAME
        ? rawSkillsData
        : await deps.readJson(filePath);
    const currentData = normalizeFilePayload(fileName, rawData);
    const nextData = [...currentData];
    let repairedEntries = 0;
    let checkedEntries = 0;

    for (let index = 1; index < currentData.length; index++) {
      const currentEntry = currentData[index];
      if (!currentEntry || typeof currentEntry !== 'object' || Array.isArray(currentEntry)) {
        continue;
      }

      checkedEntries++;
      let normalizedEntry = normalizeEntryByFileName(fileName, currentEntry, systemData, normalizedSkillsData);
      if (OWNER_PARAM_HOST_FILE_NAMES.has(fileName)) {
        normalizedEntry = migrateLegacyOwnerEffectsOnEntry(normalizedEntry, legacyOwnerEffects, systemData);
      }
      if (PASSIVE_STATE_HOST_FILE_NAMES.has(fileName)) {
        normalizedEntry = normalizePassiveStateHostEntry(normalizedEntry) ?? normalizedEntry;
      }
      if (fileName === EFFECTS_FILE_NAME) {
        const effectType: string = typeof (currentEntry as Record<string, unknown>).effectType === 'string'
          ? String((currentEntry as Record<string, unknown>).effectType)
          : '';
        if (LEGACY_OWNER_EFFECT_TYPES.has(effectType) && legacyOwnerEffects.has(index)) {
          normalizedEntry = null;
        }
      }
      normalizedEntry = sanitizeEntryByFileContract(fileName, normalizedEntry);
      if (!arePlainDataEqual(normalizedEntry, currentEntry)) {
        nextData[index] = normalizedEntry;
        repairedEntries++;
      }
    }

    const changed = repairedEntries > 0;
    if (changed) {
      await deps.writeJson(filePath, nextData);
    }

    results.push({
      fileName,
      filePath,
      checkedEntries,
      repairedEntries,
      changed,
    });
  }

  return {
    checkedFiles: results.length,
    repairedFiles: results.filter((item) => item.changed).length,
    repairedEntries: results.reduce((sum, item) => sum + item.repairedEntries, 0),
    results,
  };
}

export const toAuditSummaryText = (summary: DataAuditSummary): string => {
  const changedItems = summary.results.filter((item) => item.changed);
  if (changedItems.length === 0) {
    return `已检查 ${summary.checkedFiles} 个文件，未发现需要修复的数据。`;
  }

  const detail = changedItems
    .map((item) => `${item.fileName} ${item.repairedEntries} 条`)
    .join('，');

  return `已检查 ${summary.checkedFiles} 个文件，修复 ${summary.repairedFiles} 个文件，共 ${summary.repairedEntries} 条：${detail}`;
};

export const isAuditTargetFile = (fileName: string) => {
  return AUDIT_TARGET_FILE_NAMES.includes(fileName as typeof AUDIT_TARGET_FILE_NAMES[number]);
};
