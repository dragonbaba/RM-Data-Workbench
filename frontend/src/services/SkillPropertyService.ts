import type {
  RPGItem,
  SkillCostEntry,
  SkillCostType,
} from '../types';
import { normalizeCommonRangeValues } from './RangePropertyService';

export const SKILL_PROJECTILE_TAG_NONE = -1;
export const SKILL_PROJECTILE_TAG_INTERCEPTOR = 0;
export const SKILL_PROJECTILE_TAG_INTERCEPTABLE = 1;
export const DAMAGE_FORMULA_EXPORT_NAME = 'damageFormula';
const TARGET_CAMP_ENEMY = 1;
const TARGET_LIFE_STATE_ALIVE = 1;
const SELECT_MODE_SINGLE = 1;
const AREA_MODE_SINGLE = 1;
const DEFAULT_DAMAGE_SCATTER = 0;
const DEFAULT_HALF_BROKEN_RATE = 50;
const DEFAULT_SKILL_DURABILITY_BASE_LOSS = 1;

export type SkillDamageType = 'none' | 'hp' | 'heal';
export type SkillDamageFormulaMode = 'basic' | 'script';
export type SkillDurabilityChangeMode = 'none' | 'reduce' | 'recover';

export interface SkillDamageFormulaSpec {
  mode: SkillDamageFormulaMode;
  scriptKey: string;
}

export interface SkillDamageSpec {
  damageType: SkillDamageType;
  damageElementId: number;
  allowCritical: boolean;
  damageScatter: number;
  formula: SkillDamageFormulaSpec;
}

export interface SkillDurabilityChangeSpec {
  mode: SkillDurabilityChangeMode;
  value: number;
}

export interface SkillDurabilitySpec {
  baseLoss: number;
  halfBrokenRate: number;
}

export interface SkillEffectSpec {
  damage: SkillDamageSpec;
  durabilityChange: SkillDurabilityChangeSpec;
  skillDurability: SkillDurabilitySpec;
}

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
  selectMode: number;
  areaMode: number;
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
  selectMode?: unknown;
  areaMode?: unknown;
  skillCosts?: unknown;
  skillEffectSpec?: unknown;
}

interface SkillNormalizationOptions {
  migrateLegacyDamage?: boolean;
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
  const formula = normalizeDamageFormula(source.formula);
  return {
    damageType: normalizeDamageType(source.damageType),
    damageElementId: Math.max(0, toIntOrZero(source.damageElementId)),
    allowCritical: source.allowCritical === true,
    damageScatter: clampPercent(source.damageScatter),
    formula,
  };
};

const normalizeLegacyDamageSpec = (skill: Record<string, unknown>): SkillDamageSpec => {
  const damageSource = isRecord(skill.damage) ? skill.damage : {};
  const formula = normalizeDamageFormula(isRecord(damageSource) ? damageSource.formula : undefined);
  return {
    damageType: normalizeDamageType(isRecord(damageSource) ? damageSource.damageType ?? damageSource.type : undefined),
    damageElementId: Math.max(0, toIntOrZero(isRecord(damageSource) ? damageSource.damageElementId ?? damageSource.elementId : 0)),
    allowCritical: isRecord(damageSource) ? damageSource.allowCritical === true || damageSource.critical === true : false,
    damageScatter: clampPercent(isRecord(damageSource) ? damageSource.damageScatter ?? damageSource.variance : 0),
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
  const baseLoss = source.baseLoss === undefined ? DEFAULT_SKILL_DURABILITY_BASE_LOSS : source.baseLoss;
  const halfBrokenRate = source.halfBrokenRate === undefined ? DEFAULT_HALF_BROKEN_RATE : source.halfBrokenRate;
  return {
    baseLoss: Math.max(0, toIntOrZero(baseLoss)) || DEFAULT_SKILL_DURABILITY_BASE_LOSS,
    halfBrokenRate: clampPercent(halfBrokenRate),
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
      : (options.migrateLegacyDamage ? normalizeLegacyDamageSpec(skill) : normalizeDamageSpecValue(undefined)),
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
  return left.damageType === right.damageType
    && left.damageElementId === right.damageElementId
    && left.allowCritical === right.allowCritical
    && left.damageScatter === right.damageScatter
    && areSkillDamageFormulaEqual(left.formula, right.formula);
};

const areSkillDurabilityChangeEqual = (left: SkillDurabilityChangeSpec, right: SkillDurabilityChangeSpec): boolean => {
  return left.mode === right.mode && left.value === right.value;
};

const areSkillDurabilityEqual = (left: SkillDurabilitySpec, right: SkillDurabilitySpec): boolean => {
  return left.baseLoss === right.baseLoss && left.halfBrokenRate === right.halfBrokenRate;
};

const areSkillEffectSpecEqual = (left: SkillEffectSpec, right: SkillEffectSpec): boolean => {
  return areSkillDamageSpecEqual(left.damage, right.damage)
    && areSkillDurabilityChangeEqual(left.durabilityChange, right.durabilityChange)
    && areSkillDurabilityEqual(left.skillDurability, right.skillDurability);
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

const buildMetaPatch = (skill: unknown, meta: Record<string, unknown>) => {
  if (!isRecord(skill)) return {};
  if (hasOwn(skill, 'meta') || Object.keys(meta).length > 0) {
    return { meta };
  }
  return {};
};

export const hasDamageFormulaExport = (content: unknown): boolean => {
  if (typeof content !== 'string' || !content.trim()) {
    return false;
  }
  return /\bexport\s+(?:async\s+)?function\s+damageFormula\b/.test(content)
    || /\bexport\s+(?:const|let|var)\s+damageFormula\b/.test(content)
    || /\bexport\s*\{\s*damageFormula(?:\s+as\s+\w+)?\s*\}/.test(content);
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
      selectMode: SELECT_MODE_SINGLE,
      areaMode: AREA_MODE_SINGLE,
      skillCosts: [],
      skillEffectSpec: {
        damage: {
          damageType: 'none',
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
          baseLoss: DEFAULT_SKILL_DURABILITY_BASE_LOSS,
          halfBrokenRate: DEFAULT_HALF_BROKEN_RATE,
        },
      },
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
    skillEffectSpec: normalizeSkillEffectSpecFromSource(skill, options),
  };
}

export function normalizeSkillDataEntry(
  skill: unknown,
  options: SkillNormalizationOptions = {},
): RPGItem | null {
  if (!isRecord(skill)) return null;
  const normalized = normalizeSkillEditorValues(skill, options);
  const currentMeta = extractSkillMeta(skill);
  const restSkill = { ...skill };
  delete restSkill.isUsedForProjectile;
  delete restSkill.damage;

  return {
    ...(restSkill as unknown as RPGItem),
    ...buildMetaPatch(skill, currentMeta),
    projectileId: normalized.projectileId,
    skillProjectileTag: normalized.skillProjectileTag,
    reactionSuccessRate: normalized.reactionSuccessRate,
    reactionPriority: normalized.reactionPriority,
    skillCosts: normalized.skillCosts,
    skillEffectSpec: normalized.skillEffectSpec,
    targetCamp: normalized.targetCamp,
    targetLifeState: normalized.targetLifeState,
    selectMode: normalized.selectMode,
    areaMode: normalized.areaMode,
  };
}

export function hasSkillEditorChanges(sourceItem: RPGItem, nextValues: SkillEditorInput): boolean {
  const currentValues = normalizeSkillEditorValues(sourceItem);
  const nextTargeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);
  const nextSkillEffectSpec = normalizeSkillEffectSpecValue(nextValues.skillEffectSpec);

  return currentValues.projectileId !== normalizeProjectileId(nextValues.projectileId)
    || currentValues.skillProjectileTag !== normalizeProjectileTag(nextValues.skillProjectileTag)
    || currentValues.reactionSuccessRate !== clampPercent(nextValues.reactionSuccessRate)
    || currentValues.reactionPriority !== clampPercent(nextValues.reactionPriority)
    || currentValues.targetCamp !== nextTargeting.targetCamp
    || currentValues.targetLifeState !== nextTargeting.targetLifeState
    || currentValues.selectMode !== nextTargeting.selectMode
    || currentValues.areaMode !== nextTargeting.areaMode
    || !areSkillCostsEqual(currentValues.skillCosts, normalizeSkillCosts(nextValues.skillCosts))
    || !areSkillEffectSpecEqual(currentValues.skillEffectSpec, nextSkillEffectSpec);
}

export function buildSkillSaveData(sourceItem: RPGItem, nextValues: SkillEditorInput): RPGItem {
  const currentMeta = extractSkillMeta(sourceItem);
  const restItem = { ...(sourceItem as unknown as Record<string, unknown>) };
  delete restItem.isUsedForProjectile;
  delete restItem.damage;
  const targeting = normalizeSkillTargetingValues(nextValues as Record<string, unknown>);
  const nextSkillEffectSpec = normalizeSkillEffectSpecValue(nextValues.skillEffectSpec);

  return {
    ...(restItem as unknown as RPGItem),
    ...buildMetaPatch(sourceItem as unknown as Record<string, unknown>, currentMeta),
    projectileId: normalizeProjectileId(nextValues.projectileId),
    skillProjectileTag: normalizeProjectileTag(nextValues.skillProjectileTag),
    reactionSuccessRate: clampPercent(nextValues.reactionSuccessRate),
    reactionPriority: clampPercent(nextValues.reactionPriority),
    targetCamp: targeting.targetCamp,
    targetLifeState: targeting.targetLifeState,
    selectMode: targeting.selectMode,
    areaMode: targeting.areaMode,
    skillCosts: normalizeSkillCosts(nextValues.skillCosts),
    skillEffectSpec: nextSkillEffectSpec,
  };
}
