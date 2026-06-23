import type {
  RPGItem,
  SkillCostEntry,
  SkillCostType,
} from '../types';
import { normalizeCommonRangeValues } from './RangePropertyService';
import {
  EXPORT_FUNCTION_DAMAGE_FORMULA_REGEXP,
  EXPORT_NAMED_DAMAGE_FORMULA_REGEXP,
  EXPORT_VARIABLE_DAMAGE_FORMULA_REGEXP,
  NEWLINE_REGEXP,
  SKILL_NOTE_MIGRATED_LINE_REGEXP,
} from '../constants/regexp';

export const SKILL_PROJECTILE_TAG_NONE = -1;
export const SKILL_PROJECTILE_TAG_INTERCEPTOR = 0;
export const SKILL_PROJECTILE_TAG_INTERCEPTABLE = 1;
export const ACTION_SEQUENCE_TYPE_NORMAL = 0;
export const ACTION_SEQUENCE_TYPE_PROJECTILE = 1;
export const ACTION_SEQUENCE_TYPE_THROW_PROJECTILE = 2;
export const ACTION_SEQUENCE_TYPE_ITEM = 3;
export const ACTION_SEQUENCE_TYPE_SELF = 4;
export const ACTION_SEQUENCE_TYPE_WEAPON_ACTION = 5;
export const DAMAGE_FORMULA_EXPORT_NAME = 'damageFormula';
const TARGET_CAMP_ENEMY = 1;
const TARGET_TYPE_ANY = 0;
const TARGET_TYPE_HUMAN = 1;
const TARGET_TYPE_TANK = 2;
const TARGET_LIFE_STATE_ALIVE = 1;
const SELECT_MODE_SINGLE = 1;
const AREA_MODE_SINGLE = 1;
const DEFAULT_DAMAGE_SCATTER = 0;
const DEFAULT_HALF_BROKEN_SKIP_RATE = 50;

export type SkillDamageType = 'none' | 'hp' | 'heal';
export type SkillDamageFormulaMode = 'basic' | 'script';
export type SkillDurabilityChangeMode = 'none' | 'reduce' | 'recover';
export type SkillWeaponActionMode = 'none' | 'selected' | 'all';

export interface SkillDamageFormulaSpec {
  mode: SkillDamageFormulaMode;
  scriptKey: string;
}

export interface SkillDamageSpec {
  damageType: SkillDamageType;
  damageElementIds: number[];
  damageElementId?: number;
  allowCritical: boolean;
  damageScatter: number;
  formula: SkillDamageFormulaSpec;
}

export interface SkillDurabilityChangeSpec {
  mode: SkillDurabilityChangeMode;
  value: number;
}

export interface SkillDurabilitySpec {
  halfBrokenSkipRate: number;
}

export interface SkillEffectSpec {
  damage: SkillDamageSpec;
  durabilityChange: SkillDurabilityChangeSpec;
  skillDurability: SkillDurabilitySpec;
}

export interface SkillWeaponAction {
  mode: SkillWeaponActionMode;
  countMin: number;
  countMax: number;
  maxCount: number;
  ammoLimited: boolean;
  requireCanLaunch: boolean;
  durabilityLossMin: number;
  durabilityLossMax: number;
  friendStateId: number;
}

export const KNOWN_SKILL_PROPERTY_KEYS = [
  'projectileId',
  'skillProjectileTag',
  'reactionSuccessRate',
  'reactionPriority',
  'targetCamp',
  'targetLifeState',
  'targetType',
  'selectMode',
  'areaMode',
  'actionSequenceType',
  'actionSequenceScriptKey',
  'limits',
  'needTargetSelect',
  'needWeaponSelect',
  'weaponAction',
  'skillCosts',
  'skillEffectSpec',
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
  targetType: number;
  selectMode: number;
  areaMode: number;
  actionSequenceType: number;
  actionSequenceScriptKey: string;
  limits: number;
  needTargetSelect: boolean;
  needWeaponSelect: boolean;
  weaponAction: SkillWeaponAction;
  skillCosts: SkillCostEntry[];
  skillEffectSpec: SkillEffectSpec;
}

export interface SkillEditorInput {
  projectileId?: unknown;
  skillProjectileTag?: unknown;
  reactionSuccessRate?: unknown;
  reactionPriority?: unknown;
  targetCamp?: unknown;
  targetLifeState?: unknown;
  targetType?: unknown;
  selectMode?: unknown;
  areaMode?: unknown;
  actionSequenceType?: unknown;
  actionSequenceScriptKey?: unknown;
  limits?: unknown;
  needTargetSelect?: unknown;
  needWeaponSelect?: unknown;
  weaponAction?: unknown;
  skillCosts?: unknown;
  skillEffectSpec?: unknown;
}

interface SkillNormalizationOptions {
  isItem?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const primaryDamageElementIdOf = (elementIds: number[]): number => (
  elementIds.length > 0 ? toIntOrZero(elementIds[0]) : 0
);

const normalizeTargetType = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  if (numeric === TARGET_TYPE_HUMAN || numeric === TARGET_TYPE_TANK) {
    return numeric;
  }
  return TARGET_TYPE_ANY;
};

const normalizeSkillLimit = (value: unknown, meta: Record<string, unknown>): number => {
  const source = value !== undefined && value !== null && value !== ''
    ? value
    : (meta.limits !== undefined ? meta.limits : meta.lilmits);
  if (source === undefined || source === null || source === '') return -1;
  const numeric = toIntOrZero(source);
  return numeric < 0 ? -1 : numeric;
};

const normalizeSkillBoolean = (value: unknown, meta: Record<string, unknown>, key: string): boolean => {
  const source = value !== undefined ? value : meta[key];
  return source === true || source === 'true';
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

const normalizeActionSequenceType = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = toIntOrZero(value);
  if (
    numeric === ACTION_SEQUENCE_TYPE_NORMAL
    || numeric === ACTION_SEQUENCE_TYPE_PROJECTILE
    || numeric === ACTION_SEQUENCE_TYPE_THROW_PROJECTILE
    || numeric === ACTION_SEQUENCE_TYPE_ITEM
    || numeric === ACTION_SEQUENCE_TYPE_SELF
    || numeric === ACTION_SEQUENCE_TYPE_WEAPON_ACTION
  ) {
    return numeric;
  }
  return fallback;
};

const normalizeActionSequenceScriptKey = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeWeaponActionMode = (value: unknown): SkillWeaponActionMode => {
  return value === 'selected' || value === 'all' ? value : 'none';
};

const normalizeWeaponActionCount = (value: unknown, fallback: number): number => {
  const numeric = toIntOrZero(value);
  return Math.max(1, Math.min(8, numeric || fallback));
};

const normalizeWeaponActionLoss = (value: unknown): number => {
  return Math.max(0, toIntOrZero(value));
};

const normalizeWeaponActionValue = (value: unknown): SkillWeaponAction => {
  const source = isRecord(value) ? value : {};
  const countMin = normalizeWeaponActionCount(source.countMin, 1);
  const countMax = Math.max(countMin, normalizeWeaponActionCount(source.countMax, countMin));
  const durabilityLossMin = normalizeWeaponActionLoss(source.durabilityLossMin);
  const durabilityLossMax = Math.max(durabilityLossMin, normalizeWeaponActionLoss(source.durabilityLossMax));
  return {
    mode: normalizeWeaponActionMode(source.mode),
    countMin,
    countMax,
    maxCount: normalizeWeaponActionCount(source.maxCount, 8),
    ammoLimited: source.ammoLimited === true,
    requireCanLaunch: source.requireCanLaunch === true,
    durabilityLossMin,
    durabilityLossMax,
    friendStateId: Math.max(0, toIntOrZero(source.friendStateId)),
  };
};

const getDefaultActionSequenceType = (projectileId: number, options: SkillNormalizationOptions): number => {
  if (projectileId > 0) {
    return options.isItem === true ? ACTION_SEQUENCE_TYPE_THROW_PROJECTILE : ACTION_SEQUENCE_TYPE_PROJECTILE;
  }
  return options.isItem === true ? ACTION_SEQUENCE_TYPE_ITEM : ACTION_SEQUENCE_TYPE_NORMAL;
};

const getLegacyActionSequenceType = (skill: Record<string, unknown>): number | null => {
  const meta = isRecord(skill.meta) ? skill.meta : null;
  const actionSequence = typeof meta?.actionSequence === 'string' ? meta.actionSequence : '';
  switch (actionSequence) {
    case 'actionSequence':
      return ACTION_SEQUENCE_TYPE_NORMAL;
    case 'projectileActionSequence':
      return ACTION_SEQUENCE_TYPE_PROJECTILE;
    case 'throwProjectileActionSequence':
      return ACTION_SEQUENCE_TYPE_THROW_PROJECTILE;
    case 'itemActionSequence':
      return ACTION_SEQUENCE_TYPE_ITEM;
    default:
      break;
  }
  const scripts = isRecord(skill.scripts) ? skill.scripts : null;
  return typeof scripts?.actionSequence === 'string'
    ? ACTION_SEQUENCE_TYPE_SELF
    : null;
};

const getDefaultActionSequenceScriptKey = (skill: Record<string, unknown>, actionSequenceType: number): string => {
  if (actionSequenceType !== ACTION_SEQUENCE_TYPE_SELF) {
    return '';
  }
  const currentKey = normalizeActionSequenceScriptKey(skill.actionSequenceScriptKey);
  if (currentKey) {
    return currentKey;
  }
  return 'actionSequence';
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

const normalizeDamageType = (value: unknown): SkillDamageType => {
  if (value === 'none') return 'none';
  if (value === 'hp') return 'hp';
  if (value === 'heal') return 'heal';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return 'none';
    if (numeric === 1) return 'hp';
    if (numeric === 3) return 'heal';
    return 'none';
  }
  return 'none';
};

const normalizeFormulaMode = (value: unknown, scriptKey: string): SkillDamageFormulaMode => {
  if (value === 'script') {
    return scriptKey ? 'script' : 'basic';
  }
  if (value === 'basic') {
    return 'basic';
  }
  return scriptKey ? 'script' : 'basic';
};

const normalizeDurabilityChangeMode = (value: unknown): SkillDurabilityChangeMode => {
  if (value === 'reduce' || value === 'recover' || value === 'none') {
    return value;
  }
  return 'none';
};

const normalizeDamageFormula = (value: unknown): SkillDamageFormulaSpec => {
  const source = isRecord(value) ? value : {};
  const scriptKey = typeof source.scriptKey === 'string' ? source.scriptKey.trim() : '';
  const mode = normalizeFormulaMode(source.mode, scriptKey);
  return {
    mode,
    scriptKey: mode === 'script' ? scriptKey : '',
  };
};

const normalizeDamageSpecValue = (value: unknown): SkillDamageSpec => {
  const source = isRecord(value) ? value : {};
  const damageElementIds = (source.damageElementIds as number[] | undefined) ?? [];
  const formula = normalizeDamageFormula(source.formula);
  return {
    damageType: normalizeDamageType(source.damageType),
    damageElementIds,
    damageElementId: primaryDamageElementIdOf(damageElementIds),
    allowCritical: source.allowCritical === true,
    damageScatter: clampPercent(source.damageScatter),
    formula,
  };
};

const normalizeDurabilityChangeValue = (value: unknown): SkillDurabilityChangeSpec => {
  const source = isRecord(value) ? value : {};
  return {
    mode: normalizeDurabilityChangeMode(source.mode),
    value: Math.max(0, toIntOrZero(source.value)),
  };
};

const normalizeSkillDurabilityValue = (value: unknown): SkillDurabilitySpec => {
  const source = isRecord(value) ? value : {};
  const halfBrokenSkipRate = source.halfBrokenSkipRate === undefined
    ? (source.halfBrokenRate === undefined ? DEFAULT_HALF_BROKEN_SKIP_RATE : source.halfBrokenRate)
    : source.halfBrokenSkipRate;
  return {
    halfBrokenSkipRate: clampPercent(halfBrokenSkipRate),
  };
};

const normalizeSkillEffectSpecFromSource = (
  skill: Record<string, unknown>,
  options: SkillNormalizationOptions = {},
): SkillEffectSpec => {
  const spec = isRecord(skill.skillEffectSpec) ? skill.skillEffectSpec : null;
  return {
    damage: spec
      ? normalizeDamageSpecValue(spec.damage)
      : normalizeDamageSpecValue(undefined),
    durabilityChange: normalizeDurabilityChangeValue(spec?.durabilityChange),
    skillDurability: normalizeSkillDurabilityValue(spec?.skillDurability),
  };
};

const normalizeSkillEffectSpecValue = (value: unknown): SkillEffectSpec => {
  const source = isRecord(value) ? value : {};
  return {
    damage: normalizeDamageSpecValue(source.damage),
    durabilityChange: normalizeDurabilityChangeValue(source.durabilityChange),
    skillDurability: normalizeSkillDurabilityValue(source.skillDurability),
  };
};

const areSkillDamageFormulaEqual = (left: SkillDamageFormulaSpec, right: SkillDamageFormulaSpec): boolean => {
  return left.mode === right.mode && left.scriptKey === right.scriptKey;
};

const areSkillDamageSpecEqual = (left: SkillDamageSpec, right: SkillDamageSpec): boolean => {
  if (left.damageType !== right.damageType
    || left.damageElementIds.length !== right.damageElementIds.length
    || left.allowCritical !== right.allowCritical
    || left.damageScatter !== right.damageScatter
    || !areSkillDamageFormulaEqual(left.formula, right.formula)) {
    return false;
  }
  return left.damageElementIds.every((id, i) => id === right.damageElementIds[i]);
};

const areSkillDurabilityChangeEqual = (left: SkillDurabilityChangeSpec, right: SkillDurabilityChangeSpec): boolean => {
  return left.mode === right.mode && left.value === right.value;
};

const areSkillDurabilityEqual = (left: SkillDurabilitySpec, right: SkillDurabilitySpec): boolean => {
  return left.halfBrokenSkipRate === right.halfBrokenSkipRate;
};

const areSkillEffectSpecEqual = (left: SkillEffectSpec, right: SkillEffectSpec): boolean => {
  return areSkillDamageSpecEqual(left.damage, right.damage)
    && areSkillDurabilityChangeEqual(left.durabilityChange, right.durabilityChange)
    && areSkillDurabilityEqual(left.skillDurability, right.skillDurability);
};

const areSkillWeaponActionsEqual = (left: SkillWeaponAction, right: SkillWeaponAction): boolean => {
  return left.mode === right.mode
    && left.countMin === right.countMin
    && left.countMax === right.countMax
    && left.maxCount === right.maxCount
    && left.ammoLimited === right.ammoLimited
    && left.requireCanLaunch === right.requireCanLaunch
    && left.durabilityLossMin === right.durabilityLossMin
    && left.durabilityLossMax === right.durabilityLossMax
    && left.friendStateId === right.friendStateId;
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

const cleanMigratedSkillMeta = (meta: Record<string, unknown>): Record<string, unknown> => {
  const cleaned = { ...meta };
  delete cleaned.limits;
  delete cleaned.lilmits;
  delete cleaned.needTargetSelect;
  delete cleaned.needWeaponSelect;
  return cleaned;
};

const cleanMigratedSkillNote = (note: unknown): unknown => {
  if (typeof note !== 'string') return note;
  return note
    .split(NEWLINE_REGEXP)
    .filter((line) => !SKILL_NOTE_MIGRATED_LINE_REGEXP.test(line.trim()))
    .join('\n');
};

const buildMetaPatch = (skill: unknown, meta: Record<string, unknown>) => {
  if (!isRecord(skill)) return {};
  if (Object.keys(meta).length > 0) {
    return { meta };
  }
  return {};
};

export const hasDamageFormulaExport = (content: unknown): boolean => {
  if (typeof content !== 'string' || !content.trim()) {
    return false;
  }
  return EXPORT_FUNCTION_DAMAGE_FORMULA_REGEXP.test(content)
    || EXPORT_VARIABLE_DAMAGE_FORMULA_REGEXP.test(content)
    || EXPORT_NAMED_DAMAGE_FORMULA_REGEXP.test(content);
};

export function normalizeSkillEditorValues(
  skill: unknown,
  options: SkillNormalizationOptions = {},
): SkillEditorValues {
  if (!isRecord(skill)) {
    return {
      projectileId: 0,
      skillProjectileTag: SKILL_PROJECTILE_TAG_NONE,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      targetCamp: TARGET_CAMP_ENEMY,
      targetLifeState: TARGET_LIFE_STATE_ALIVE,
      targetType: TARGET_TYPE_ANY,
      selectMode: SELECT_MODE_SINGLE,
      areaMode: AREA_MODE_SINGLE,
      actionSequenceType: getDefaultActionSequenceType(0, options),
      actionSequenceScriptKey: '',
      limits: -1,
      needTargetSelect: false,
      needWeaponSelect: false,
      weaponAction: normalizeWeaponActionValue(undefined),
      skillCosts: [],
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementIds: [],
          damageElementId: 0,
          allowCritical: false,
          damageScatter: DEFAULT_DAMAGE_SCATTER,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: {
          mode: 'none',
          value: 0,
        },
        skillDurability: {
          halfBrokenSkipRate: DEFAULT_HALF_BROKEN_SKIP_RATE,
        },
      },
    };
  }

  const projectileId = normalizeProjectileId(skill.projectileId);
  const targeting = normalizeSkillTargetingValues(skill);
  const meta = extractSkillMeta(skill);
  const legacyActionSequenceType = getLegacyActionSequenceType(skill);
  const defaultActionSequenceType = legacyActionSequenceType ?? getDefaultActionSequenceType(projectileId, options);
  const actionSequenceType = normalizeActionSequenceType(skill.actionSequenceType, defaultActionSequenceType);

  return {
    projectileId,
    skillProjectileTag: normalizeProjectileTag(skill.skillProjectileTag),
    reactionSuccessRate: clampPercent(skill.reactionSuccessRate),
    reactionPriority: clampPercent(skill.reactionPriority),
    targetCamp: targeting.targetCamp,
    targetLifeState: targeting.targetLifeState,
    targetType: normalizeTargetType(skill.targetType),
    selectMode: targeting.selectMode,
    areaMode: targeting.areaMode,
    actionSequenceType,
    actionSequenceScriptKey: getDefaultActionSequenceScriptKey(skill, actionSequenceType),
    limits: normalizeSkillLimit(skill.limits, meta),
    needTargetSelect: normalizeSkillBoolean(skill.needTargetSelect, meta, 'needTargetSelect'),
    needWeaponSelect: normalizeSkillBoolean(skill.needWeaponSelect, meta, 'needWeaponSelect'),
    weaponAction: normalizeWeaponActionValue(skill.weaponAction),
    skillCosts: normalizeSkillCosts(skill.skillCosts),
    skillEffectSpec: normalizeSkillEffectSpecFromSource(skill, options),
  };
}

export function normalizeSkillDataEntry(
  skill: unknown,
  options: SkillNormalizationOptions = {},
): RPGItem | null {
  if (!isRecord(skill)) return null;
  const normalized = normalizeSkillEditorValues(skill, options);
  const currentMeta = cleanMigratedSkillMeta(extractSkillMeta(skill));
  const restSkill = { ...skill };
  delete restSkill.meta;
  delete restSkill.isUsedForProjectile;
  delete restSkill.damage;
  const cleanedNote = cleanMigratedSkillNote(restSkill.note);
  if (cleanedNote === undefined) {
    delete restSkill.note;
  } else {
    restSkill.note = cleanedNote;
  }

  return {
    ...(restSkill as unknown as RPGItem),
    ...buildMetaPatch(skill, currentMeta),
    projectileId: normalized.projectileId,
    skillProjectileTag: normalized.skillProjectileTag,
    reactionSuccessRate: normalized.reactionSuccessRate,
    reactionPriority: normalized.reactionPriority,
    targetType: normalized.targetType,
    skillCosts: normalized.skillCosts,
    skillEffectSpec: normalized.skillEffectSpec,
    targetCamp: normalized.targetCamp,
    targetLifeState: normalized.targetLifeState,
    selectMode: normalized.selectMode,
    areaMode: normalized.areaMode,
    actionSequenceType: normalized.actionSequenceType,
    actionSequenceScriptKey: normalized.actionSequenceScriptKey,
    ...(options.isItem === true ? {} : {
      limits: normalized.limits,
      needTargetSelect: normalized.needTargetSelect,
      needWeaponSelect: normalized.needWeaponSelect,
      weaponAction: normalized.weaponAction,
    }),
  };
}

export function hasSkillEditorChanges(
  sourceItem: RPGItem,
  nextValues: SkillEditorInput,
  options: SkillNormalizationOptions = {},
): boolean {
  const currentValues = normalizeSkillEditorValues(sourceItem, options);
  const nextTargeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);
  const nextSkillEffectSpec = normalizeSkillEffectSpecValue(nextValues.skillEffectSpec);

  return currentValues.projectileId !== normalizeProjectileId(nextValues.projectileId)
    || currentValues.skillProjectileTag !== normalizeProjectileTag(nextValues.skillProjectileTag)
    || currentValues.reactionSuccessRate !== clampPercent(nextValues.reactionSuccessRate)
    || currentValues.reactionPriority !== clampPercent(nextValues.reactionPriority)
    || currentValues.targetType !== normalizeTargetType(nextValues.targetType)
    || currentValues.targetCamp !== nextTargeting.targetCamp
    || currentValues.targetLifeState !== nextTargeting.targetLifeState
    || currentValues.selectMode !== nextTargeting.selectMode
    || currentValues.areaMode !== nextTargeting.areaMode
    || currentValues.actionSequenceType !== normalizeActionSequenceType(nextValues.actionSequenceType, currentValues.actionSequenceType)
    || currentValues.actionSequenceScriptKey !== normalizeActionSequenceScriptKey(nextValues.actionSequenceScriptKey)
    || (options.isItem !== true && currentValues.limits !== normalizeSkillLimit(nextValues.limits, {}))
    || (options.isItem !== true && currentValues.needTargetSelect !== normalizeSkillBoolean(nextValues.needTargetSelect, {}, 'needTargetSelect'))
    || (options.isItem !== true && currentValues.needWeaponSelect !== normalizeSkillBoolean(nextValues.needWeaponSelect, {}, 'needWeaponSelect'))
    || (options.isItem !== true && !areSkillWeaponActionsEqual(currentValues.weaponAction, normalizeWeaponActionValue(nextValues.weaponAction)))
    || !areSkillCostsEqual(currentValues.skillCosts, normalizeSkillCosts(nextValues.skillCosts))
    || !areSkillEffectSpecEqual(currentValues.skillEffectSpec, nextSkillEffectSpec);
}

export function buildSkillSaveData(
  sourceItem: RPGItem,
  nextValues: SkillEditorInput,
  options: SkillNormalizationOptions = {},
): RPGItem {
  const currentMeta = cleanMigratedSkillMeta(extractSkillMeta(sourceItem));
  const restItem = { ...(sourceItem as unknown as Record<string, unknown>) };
  delete restItem.meta;
  delete restItem.isUsedForProjectile;
  delete restItem.damage;
  const cleanedNote = cleanMigratedSkillNote(restItem.note);
  if (cleanedNote === undefined) {
    delete restItem.note;
  } else {
    restItem.note = cleanedNote;
  }
  const targeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);
  const nextSkillEffectSpec = normalizeSkillEffectSpecValue(nextValues.skillEffectSpec);
  const nextProjectileId = normalizeProjectileId(nextValues.projectileId);
  const defaultActionSequenceType = getDefaultActionSequenceType(nextProjectileId, options);
  const actionSequenceType = normalizeActionSequenceType(nextValues.actionSequenceType, defaultActionSequenceType);

  return {
    ...(restItem as unknown as RPGItem),
    ...buildMetaPatch(sourceItem as unknown as Record<string, unknown>, currentMeta),
    projectileId: nextProjectileId,
    skillProjectileTag: normalizeProjectileTag(nextValues.skillProjectileTag),
    reactionSuccessRate: clampPercent(nextValues.reactionSuccessRate),
    reactionPriority: clampPercent(nextValues.reactionPriority),
    targetType: normalizeTargetType(nextValues.targetType),
    targetCamp: targeting.targetCamp,
    targetLifeState: targeting.targetLifeState,
    selectMode: targeting.selectMode,
    areaMode: targeting.areaMode,
    actionSequenceType,
    actionSequenceScriptKey: actionSequenceType === ACTION_SEQUENCE_TYPE_SELF
      ? normalizeActionSequenceScriptKey(nextValues.actionSequenceScriptKey) || 'actionSequence'
      : '',
    skillCosts: normalizeSkillCosts(nextValues.skillCosts),
    skillEffectSpec: nextSkillEffectSpec,
    ...(options.isItem === true ? {} : {
      limits: normalizeSkillLimit(nextValues.limits, {}),
      needTargetSelect: normalizeSkillBoolean(nextValues.needTargetSelect, {}, 'needTargetSelect'),
      needWeaponSelect: normalizeSkillBoolean(nextValues.needWeaponSelect, {}, 'needWeaponSelect'),
      weaponAction: normalizeWeaponActionValue(nextValues.weaponAction),
    }),
  };
}
