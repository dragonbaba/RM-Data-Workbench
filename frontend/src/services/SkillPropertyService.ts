import type { RPGItem } from '../types';

export const SKILL_PROJECTILE_TAG_NONE = -1;
export const SKILL_PROJECTILE_TAG_INTERCEPTOR = 0;
export const SKILL_PROJECTILE_TAG_INTERCEPTABLE = 1;

export const KNOWN_SKILL_PROPERTY_KEYS = [
  'projectileId',
  'skillProjectileTag',
  'reactionSuccessRate',
  'reactionPriority',
] as const;

export interface SkillEditorValues {
  projectileId: number;
  skillProjectileTag: number;
  reactionSuccessRate: number;
  reactionPriority: number;
}

export interface SkillEditorInput {
  projectileId?: unknown;
  skillProjectileTag?: unknown;
  reactionSuccessRate?: unknown;
  reactionPriority?: unknown;
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
    };
  }

  const projectileId = normalizeProjectileId(skill.projectileId);

  return {
    projectileId,
    skillProjectileTag: normalizeProjectileTag(skill.skillProjectileTag),
    reactionSuccessRate: clampPercent(skill.reactionSuccessRate),
    reactionPriority: clampPercent(skill.reactionPriority),
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
  };
}

export function hasSkillEditorChanges(sourceItem: RPGItem, nextValues: SkillEditorInput): boolean {
  const currentValues = normalizeSkillEditorValues(sourceItem);

  return currentValues.projectileId !== normalizeProjectileId(nextValues.projectileId)
    || currentValues.skillProjectileTag !== normalizeProjectileTag(nextValues.skillProjectileTag)
    || currentValues.reactionSuccessRate !== clampPercent(nextValues.reactionSuccessRate)
    || currentValues.reactionPriority !== clampPercent(nextValues.reactionPriority);
}

export function buildSkillSaveData(sourceItem: RPGItem, nextValues: SkillEditorInput): RPGItem {
  const currentMeta = extractSkillMeta(sourceItem);
  const restItem = { ...(sourceItem as unknown as Record<string, unknown>) };
  delete restItem.isUsedForProjectile;

  return {
    ...(restItem as unknown as RPGItem),
    meta: currentMeta,
    projectileId: normalizeProjectileId(nextValues.projectileId),
    skillProjectileTag: normalizeProjectileTag(nextValues.skillProjectileTag),
    reactionSuccessRate: clampPercent(nextValues.reactionSuccessRate),
    reactionPriority: clampPercent(nextValues.reactionPriority),
  };
}
