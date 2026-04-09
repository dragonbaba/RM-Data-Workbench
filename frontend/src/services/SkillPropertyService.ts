import type { RPGItem, SkillCostEntry, SkillCostType } from '../types';
import { normalizeCommonRangeValues } from './RangePropertyService';

export const SKILL_PROJECTILE_TAG_NONE = -1;
export const SKILL_PROJECTILE_TAG_INTERCEPTOR = 0;
export const SKILL_PROJECTILE_TAG_INTERCEPTABLE = 1;
const TARGET_CAMP_ENEMY = 1;
const TARGET_LIFE_STATE_ALIVE = 1;
const SELECT_MODE_SINGLE = 1;
const AREA_MODE_SINGLE = 1;

export const KNOWN_SKILL_PROPERTY_KEYS = [
  'projectileId',
  'skillProjectileTag',
  'reactionSuccessRate',
  'reactionPriority',
  'targetCamp',
  'targetLifeState',
  'selectMode',
  'areaMode',
  'skillCosts',
] as const;

const SKILL_COST_TYPES: SkillCostType[] = [
  'hp',
  'hpRate',
  'gold',
  'goldRate',
  'variable',
  'variableRate',
  'item',
  'weapon',
  'armor',
];

export interface SkillEditorValues {
  projectileId: number;
  skillProjectileTag: number;
  reactionSuccessRate: number;
  reactionPriority: number;
  targetCamp: number;
  targetLifeState: number;
  selectMode: number;
  areaMode: number;
  skillCosts: SkillCostEntry[];
}

export interface SkillEditorInput {
  projectileId?: unknown;
  skillProjectileTag?: unknown;
  reactionSuccessRate?: unknown;
  reactionPriority?: unknown;
  targetCamp?: unknown;
  targetLifeState?: unknown;
  selectMode?: unknown;
  areaMode?: unknown;
  skillCosts?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const clampPercent = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  if (numeric <= 0) return 0;
  if (numeric >= 100) return 100;
  return numeric;
};

const normalizeProjectileId = (value: unknown): number => {
  return Math.max(0, toIntOrZero(value));
};

const normalizeProjectileTag = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return SKILL_PROJECTILE_TAG_NONE;
  }
  const numeric = toIntOrZero(value);
  if (numeric === SKILL_PROJECTILE_TAG_INTERCEPTOR || numeric === SKILL_PROJECTILE_TAG_INTERCEPTABLE) {
    return numeric;
  }
  return SKILL_PROJECTILE_TAG_NONE;
};

const normalizeCostValue = (value: unknown): number => {
  return Math.max(0, toIntOrZero(value));
};

const normalizeCostAmount = (value: unknown): number => {
  return Math.max(1, toIntOrZero(value) || 1);
};

const normalizeSkillCostType = (value: unknown): SkillCostType => {
  const type = typeof value === 'string' ? value : '';
  return SKILL_COST_TYPES.includes(type as SkillCostType)
    ? type as SkillCostType
    : 'hp';
};

const createDefaultSkillCostEntry = (type: SkillCostType = 'hp'): SkillCostEntry => ({
  type,
  value: 0,
  variableId: 0,
  itemId: 0,
  weaponId: 0,
  armorId: 0,
  amount: 1,
});

const normalizeSkillCostEntry = (value: unknown): SkillCostEntry | null => {
  if (!isRecord(value)) return null;

  const type = normalizeSkillCostType(value.type);
  const baseEntry = createDefaultSkillCostEntry(type);
  switch (type) {
    case 'hp':
    case 'gold':
      return {
        ...baseEntry,
        value: normalizeCostValue(value.value),
      };
    case 'hpRate':
    case 'goldRate':
      return {
        ...baseEntry,
        value: clampPercent(value.value),
      };
    case 'variable':
      return {
        ...baseEntry,
        variableId: Math.max(0, toIntOrZero(value.variableId)),
        value: normalizeCostValue(value.value),
      };
    case 'variableRate':
      return {
        ...baseEntry,
        variableId: Math.max(0, toIntOrZero(value.variableId)),
        value: clampPercent(value.value),
      };
    case 'item':
      return {
        ...baseEntry,
        itemId: Math.max(0, toIntOrZero(value.itemId)),
        amount: normalizeCostAmount(value.amount),
      };
    case 'weapon':
      return {
        ...baseEntry,
        weaponId: Math.max(0, toIntOrZero(value.weaponId)),
        amount: normalizeCostAmount(value.amount),
      };
    case 'armor':
      return {
        ...baseEntry,
        armorId: Math.max(0, toIntOrZero(value.armorId)),
        amount: normalizeCostAmount(value.amount),
      };
    default:
      return null;
  }
};

const normalizeSkillCosts = (value: unknown): SkillCostEntry[] => {
  if (!Array.isArray(value)) return [];
  const result: SkillCostEntry[] = [];
  for (let index = 0; index < value.length; index++) {
    const normalized = normalizeSkillCostEntry(value[index]);
    if (normalized) {
      result.push(normalized);
    }
  }
  return result;
};

const areSkillCostEntriesEqual = (left: SkillCostEntry, right: SkillCostEntry): boolean => {
  return left.type === right.type
    && left.value === right.value
    && left.variableId === right.variableId
    && left.itemId === right.itemId
    && left.weaponId === right.weaponId
    && left.armorId === right.armorId
    && left.amount === right.amount;
};

const areSkillCostsEqual = (left: SkillCostEntry[], right: SkillCostEntry[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (!areSkillCostEntriesEqual(left[index], right[index])) {
      return false;
    }
  }
  return true;
};

interface SkillTargetingValues {
  targetCamp: number;
  targetLifeState: number;
  selectMode: number;
  areaMode: number;
}

const normalizeSkillTargetingValues = (skill: Record<string, unknown>): SkillTargetingValues => {
  const normalized = normalizeCommonRangeValues(skill);
  return {
    targetCamp: normalized.targetCamp,
    targetLifeState: normalized.targetLifeState,
    selectMode: normalized.selectMode,
    areaMode: normalized.areaMode,
  };
};

const extractSkillMeta = (skill: unknown): Record<string, unknown> => {
  if (!isRecord(skill)) return {};
  return isRecord(skill.meta) ? skill.meta : {};
};

export function normalizeSkillEditorValues(skill: unknown): SkillEditorValues {
  if (!isRecord(skill)) {
    return {
      projectileId: 0,
      skillProjectileTag: SKILL_PROJECTILE_TAG_NONE,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      targetCamp: TARGET_CAMP_ENEMY,
      targetLifeState: TARGET_LIFE_STATE_ALIVE,
      selectMode: SELECT_MODE_SINGLE,
      areaMode: AREA_MODE_SINGLE,
      skillCosts: [],
    };
  }

  const projectileId = normalizeProjectileId(skill.projectileId);
  const targeting = normalizeSkillTargetingValues(skill);

  return {
    projectileId,
    skillProjectileTag: normalizeProjectileTag(skill.skillProjectileTag),
    reactionSuccessRate: clampPercent(skill.reactionSuccessRate),
    reactionPriority: clampPercent(skill.reactionPriority),
    targetCamp: targeting.targetCamp,
    targetLifeState: targeting.targetLifeState,
    selectMode: targeting.selectMode,
    areaMode: targeting.areaMode,
    skillCosts: normalizeSkillCosts(skill.skillCosts),
  };
}

export function normalizeSkillDataEntry(skill: unknown): RPGItem | null {
  if (!isRecord(skill)) return null;
  const normalized = normalizeSkillEditorValues(skill);
  const currentMeta = extractSkillMeta(skill);
  const restSkill = { ...skill };
  delete restSkill.isUsedForProjectile;

  return {
    ...(restSkill as unknown as RPGItem),
    meta: currentMeta,
    projectileId: normalized.projectileId,
    skillProjectileTag: normalized.skillProjectileTag,
    reactionSuccessRate: normalized.reactionSuccessRate,
    reactionPriority: normalized.reactionPriority,
    skillCosts: normalized.skillCosts,
    targetCamp: normalized.targetCamp,
    targetLifeState: normalized.targetLifeState,
    selectMode: normalized.selectMode,
    areaMode: normalized.areaMode,
  };
}

export function hasSkillEditorChanges(sourceItem: RPGItem, nextValues: SkillEditorInput): boolean {
  const currentValues = normalizeSkillEditorValues(sourceItem);
  const nextTargeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);

  return currentValues.projectileId !== normalizeProjectileId(nextValues.projectileId)
    || currentValues.skillProjectileTag !== normalizeProjectileTag(nextValues.skillProjectileTag)
    || currentValues.reactionSuccessRate !== clampPercent(nextValues.reactionSuccessRate)
    || currentValues.reactionPriority !== clampPercent(nextValues.reactionPriority)
    || currentValues.targetCamp !== nextTargeting.targetCamp
    || currentValues.targetLifeState !== nextTargeting.targetLifeState
    || currentValues.selectMode !== nextTargeting.selectMode
    || currentValues.areaMode !== nextTargeting.areaMode
    || !areSkillCostsEqual(currentValues.skillCosts, normalizeSkillCosts(nextValues.skillCosts));
}

export function buildSkillSaveData(sourceItem: RPGItem, nextValues: SkillEditorInput): RPGItem {
  const currentMeta = extractSkillMeta(sourceItem);
  const restItem = { ...(sourceItem as unknown as Record<string, unknown>) };
  delete restItem.isUsedForProjectile;
  const targeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);

  return {
    ...(restItem as unknown as RPGItem),
    meta: currentMeta,
    projectileId: normalizeProjectileId(nextValues.projectileId),
    skillProjectileTag: normalizeProjectileTag(nextValues.skillProjectileTag),
    reactionSuccessRate: clampPercent(nextValues.reactionSuccessRate),
    reactionPriority: clampPercent(nextValues.reactionPriority),
    targetCamp: targeting.targetCamp,
    targetLifeState: targeting.targetLifeState,
    selectMode: targeting.selectMode,
    areaMode: targeting.areaMode,
    skillCosts: normalizeSkillCosts(nextValues.skillCosts),
  };
}
