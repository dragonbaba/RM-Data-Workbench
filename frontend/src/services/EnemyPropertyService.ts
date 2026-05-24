import type {
  EnemyActionOverride,
  EnemyActionOverrides,
  EnemyBookChallenge,
  EnemyBookChallengeExtraReward,
  EnemyBookChallengeRewardType,
  EnemyBookChallengeStar,
  RPGEnemy,
} from '../types';
import { normalizePassiveStates } from './PassiveStatePropertyService';
import { arePlainDataEqual } from './PlainDataCompare';
import { normalizeCommonRangeValues } from './RangePropertyService';

export const KNOWN_ENEMY_PROPERTY_KEYS = [
  'classId',
  'level',
  'levelScope',
  'levelScopeUp',
  'isBoss',
  'allowBreak',
  'canReaction',
  'bounty',
  'attackAnimationId',
  'reactionSkillId',
  'bookChallenge',
  'actionOverrides',
] as const;

export interface EnemyEditorValues {
  classId: number;
  level: number;
  levelScope: number;
  levelScopeUp: number;
  isBoss: boolean;
  allowBreak: boolean;
  canReaction: boolean;
  bounty: number;
  attackAnimationId: number;
  reactionSkillId: number;
  bookChallenge: EnemyBookChallenge;
  actionOverrides: EnemyActionOverrides;
}

export interface EnemyEditorInput {
  classId?: unknown;
  level?: unknown;
  levelScope?: unknown;
  levelScopeUp?: unknown;
  isBoss?: unknown;
  allowBreak?: unknown;
  canReaction?: unknown;
  bounty?: unknown;
  attackAnimationId?: unknown;
  reactionSkillId?: unknown;
  bookChallenge?: unknown;
  actionOverrides?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const toBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value === 'true';
  }
  return value === true;
};

const normalizeEnemyClassId = (value: unknown): number => {
  return Math.max(1, toIntOrZero(value) || 1);
};

const normalizeEnemyLevel = (value: unknown): number => {
  return Math.max(1, toIntOrZero(value) || 1);
};

const normalizeActionRepeat = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  return Math.max(1, numeric || 1);
};

const normalizeAllowSkillBreak = (value: unknown): boolean => {
  if (value === false || value === 'false') {
    return false;
  }
  return true;
};

const normalizeSkillDurability = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value | 0);
  if (value !== undefined && value !== null) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n | 0);
  }
  return 100;
};
const normalizeSkillUseCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const int = value | 0;
    return int >= 0 ? int : -1;
  }
  return -1;
};


const getSkillDataById = (skillsData: unknown[] | null | undefined, skillId: number): Record<string, unknown> => {
  if (!Array.isArray(skillsData) || skillId <= 0) {
    return {};
  }
  const skill = skillsData[skillId];
  return isRecord(skill) ? skill : {};
};

const collectActionSkillIds = (enemy: Record<string, unknown>): number[] => {
  const actions = Array.isArray(enemy.actions) ? enemy.actions : [];
  const skillIds: number[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    if (!isRecord(action)) {
      continue;
    }
    const skillId = Math.max(0, toIntOrZero(action.skillId));
    if (skillId <= 0 || seen.has(skillId)) {
      continue;
    }
    seen.add(skillId);
    skillIds.push(skillId);
  }
  return skillIds;
};

export const normalizeEnemyActionOverride = (
  value: unknown,
  fallbackSkill: unknown,
): EnemyActionOverride => {
  const fallback = isRecord(fallbackSkill) ? fallbackSkill : {};
  const source = isRecord(value)
    ? { ...fallback, ...value }
    : fallback;
  const rangeValues = normalizeCommonRangeValues(source);
  return {
    ...rangeValues,
    actionRepeat: normalizeActionRepeat(source.actionRepeat),
    allowSkillBreak: normalizeAllowSkillBreak(source.allowSkillBreak),
    skillDurability: normalizeSkillDurability(source.skillDurability),
    skillUseCount: normalizeSkillUseCount(source.skillUseCount),
  };
};

export const createDefaultEnemyActionOverride = (
  skillId: number,
  skillsData?: unknown[] | null,
): EnemyActionOverride => {
  return normalizeEnemyActionOverride(null, getSkillDataById(skillsData, skillId));
};

export const normalizeEnemyActionOverrides = (
  enemy: unknown,
  skillsData?: unknown[] | null,
): EnemyActionOverrides => {
  if (!isRecord(enemy)) {
    return {};
  }
  const rawOverrides = isRecord(enemy.actionOverrides) ? enemy.actionOverrides : {};
  const skillIds = collectActionSkillIds(enemy);
  const result: EnemyActionOverrides = {};
  for (let index = 0; index < skillIds.length; index++) {
    const skillId = skillIds[index];
    const key = String(skillId);
    result[key] = normalizeEnemyActionOverride(rawOverrides[key], getSkillDataById(skillsData, skillId));
  }
  return result;
};

const createDefaultEnemyBookChallengeReward = (): EnemyBookChallengeExtraReward => ({
  rewardType: 'item',
  dataId: 0,
  amount: 1,
});

const createDefaultEnemyBookChallengeStar = (index = 0): EnemyBookChallengeStar => ({
  star: Math.max(1, index + 1),
  goldCost: 0,
  levelRequirement: 0,
  baseParamRate: 1,
  passiveStates: [],
  dropRateMultiplier: 1,
  goldMultiplier: 1,
  expMultiplier: 1,
  extraRewards: [],
});

const createDefaultEnemyBookChallenge = (): EnemyBookChallenge => ({
  challengeTroopId: 0,
  stars: [],
});

const normalizeEnemyBookChallengeRewardType = (value: unknown): EnemyBookChallengeRewardType => {
  switch (value) {
    case 'gold':
    case 'item':
    case 'weapon':
    case 'armor':
      return value;
    default:
      return 'item';
  }
};

const normalizeEnemyBookChallengeReward = (value: unknown): EnemyBookChallengeExtraReward => {
  if (!isRecord(value)) {
    return createDefaultEnemyBookChallengeReward();
  }
  const rewardType = normalizeEnemyBookChallengeRewardType(value.rewardType);
  return {
    rewardType,
    dataId: rewardType === 'gold' ? 0 : Math.max(0, toIntOrZero(value.dataId)),
    amount: Math.max(1, toIntOrZero(value.amount) || 1),
  };
};

const normalizeEnemyBookChallengeStar = (value: unknown, index: number): EnemyBookChallengeStar => {
  if (!isRecord(value)) {
    return createDefaultEnemyBookChallengeStar(index);
  }
  const extraRewards = Array.isArray(value.extraRewards)
    ? value.extraRewards.map((reward) => normalizeEnemyBookChallengeReward(reward))
    : [];
  return {
    star: Math.max(1, toIntOrZero(value.star) || (index + 1)),
    goldCost: Math.max(0, toIntOrZero(value.goldCost)),
    levelRequirement: Math.max(0, toIntOrZero(value.levelRequirement)),
    baseParamRate: Math.max(0, Number(value.baseParamRate) || 1),
    passiveStates: normalizePassiveStates(value.passiveStates),
    dropRateMultiplier: Math.max(0, Number(value.dropRateMultiplier) || 1),
    goldMultiplier: Math.max(0, Number(value.goldMultiplier) || 1),
    expMultiplier: Math.max(0, Number(value.expMultiplier) || 1),
    extraRewards,
  };
};

export const normalizeEnemyBookChallenge = (value: unknown): EnemyBookChallenge => {
  if (!isRecord(value)) {
    return createDefaultEnemyBookChallenge();
  }
  const stars = Array.isArray(value.stars)
    ? value.stars.map((star, index) => normalizeEnemyBookChallengeStar(star, index))
    : [];
  return {
    challengeTroopId: Math.max(0, toIntOrZero(value.challengeTroopId)),
    stars,
  };
};

export const getEnemyReferenceValue = (
  data: unknown[] | null,
  emptyLabel: string,
  currentValue: number,
  missingLabel: string,
): Array<{ value: number; label: string }> => {
  const options: Array<{ value: number; label: string }> = [
    { value: 0, label: `0 : ${emptyLabel}` },
  ];

  if (Array.isArray(data) && data.length > 1) {
    for (let index = 1; index < data.length; index++) {
      const item = data[index] as Record<string, unknown> | null;
      if (!isRecord(item)) {
        continue;
      }
      const id = toIntOrZero(item.id ?? index);
      const name = typeof item.name === 'string' && item.name.trim()
        ? item.name.trim()
        : `未命名 ${id}`;
      options.push({
        value: id,
        label: `${id} : ${name}`,
      });
    }
  }

  if (currentValue > 0 && !options.some((option) => option.value === currentValue)) {
    return [
      { value: currentValue, label: `${currentValue} : 已失效${missingLabel}` },
      ...options,
    ];
  }

  return options;
};

export function normalizeEnemyEditorValues(
  enemy: unknown,
  skillsData?: unknown[] | null,
): EnemyEditorValues {
  if (!isRecord(enemy)) {
    return {
      classId: 1,
      level: 1,
      levelScope: 0,
      levelScopeUp: 0,
      isBoss: false,
      allowBreak: false,
      canReaction: false,
      bounty: 0,
      attackAnimationId: 0,
      reactionSkillId: 0,
      bookChallenge: createDefaultEnemyBookChallenge(),
      actionOverrides: {},
    };
  }

  return {
    classId: normalizeEnemyClassId(enemy.classId),
    level: normalizeEnemyLevel(enemy.level),
    levelScope: toIntOrZero(enemy.levelScope),
    levelScopeUp: toIntOrZero(enemy.levelScopeUp),
    isBoss: toBooleanFlag(enemy.isBoss),
    allowBreak: toBooleanFlag(enemy.allowBreak),
    canReaction: Object.prototype.hasOwnProperty.call(enemy, 'canReaction')
      ? toBooleanFlag(enemy.canReaction)
      : toIntOrZero(enemy.reactionSkillId) > 0,
    bounty: toIntOrZero(enemy.bounty),
    attackAnimationId: toIntOrZero(enemy.attackAnimationId),
    reactionSkillId: toIntOrZero(enemy.reactionSkillId),
    bookChallenge: normalizeEnemyBookChallenge(enemy.bookChallenge),
    actionOverrides: normalizeEnemyActionOverrides(enemy, skillsData),
  };
}

export function normalizeEnemyDataEntry(
  enemy: unknown,
  skillsData?: unknown[] | null,
): RPGEnemy | null {
  if (!isRecord(enemy)) return null;
  const normalized = normalizeEnemyEditorValues(enemy, skillsData);
  const currentMeta = isRecord(enemy.meta) ? enemy.meta : {};

  return {
    ...(enemy as unknown as RPGEnemy),
    meta: currentMeta,
    classId: normalized.classId,
    level: normalized.level,
    levelScope: normalized.levelScope,
    levelScopeUp: normalized.levelScopeUp,
    isBoss: normalized.isBoss,
    allowBreak: normalized.allowBreak,
    canReaction: normalized.canReaction,
    bounty: normalized.bounty,
    attackAnimationId: normalized.attackAnimationId,
    reactionSkillId: normalized.reactionSkillId,
    bookChallenge: normalized.bookChallenge,
    actionOverrides: normalized.actionOverrides,
  };
}

export function hasEnemyEditorChanges(
  sourceItem: RPGEnemy,
  nextValues: EnemyEditorInput,
  skillsData?: unknown[] | null,
): boolean {
  const currentValues = normalizeEnemyEditorValues(sourceItem, skillsData);
  const nextActionOverrides = normalizeEnemyActionOverrides({
    actions: sourceItem.actions,
    actionOverrides: nextValues.actionOverrides,
  }, skillsData);

  return currentValues.classId !== normalizeEnemyClassId(nextValues.classId)
    || currentValues.level !== normalizeEnemyLevel(nextValues.level)
    || currentValues.levelScope !== toIntOrZero(nextValues.levelScope)
    || currentValues.levelScopeUp !== toIntOrZero(nextValues.levelScopeUp)
    || currentValues.isBoss !== toBooleanFlag(nextValues.isBoss)
    || currentValues.allowBreak !== toBooleanFlag(nextValues.allowBreak)
    || currentValues.canReaction !== toBooleanFlag(nextValues.canReaction)
    || currentValues.bounty !== toIntOrZero(nextValues.bounty)
    || currentValues.attackAnimationId !== toIntOrZero(nextValues.attackAnimationId)
    || currentValues.reactionSkillId !== toIntOrZero(nextValues.reactionSkillId)
    || JSON.stringify(currentValues.bookChallenge) !== JSON.stringify(normalizeEnemyBookChallenge(nextValues.bookChallenge))
    || !arePlainDataEqual(currentValues.actionOverrides, nextActionOverrides);
}

export function buildEnemySaveData(
  sourceItem: RPGEnemy,
  nextValues: EnemyEditorInput,
  skillsData?: unknown[] | null,
): RPGEnemy {
  const currentMeta = isRecord(sourceItem.meta) ? sourceItem.meta : {};
  const actionOverrides = normalizeEnemyActionOverrides({
    actions: sourceItem.actions,
    actionOverrides: nextValues.actionOverrides,
  }, skillsData);
  return {
    ...sourceItem,
    classId: normalizeEnemyClassId(nextValues.classId),
    level: normalizeEnemyLevel(nextValues.level),
    levelScope: toIntOrZero(nextValues.levelScope),
    levelScopeUp: toIntOrZero(nextValues.levelScopeUp),
    isBoss: toBooleanFlag(nextValues.isBoss),
    allowBreak: toBooleanFlag(nextValues.allowBreak),
    canReaction: toBooleanFlag(nextValues.canReaction),
    bounty: toIntOrZero(nextValues.bounty),
    attackAnimationId: toIntOrZero(nextValues.attackAnimationId),
    reactionSkillId: toIntOrZero(nextValues.reactionSkillId),
    bookChallenge: normalizeEnemyBookChallenge(nextValues.bookChallenge),
    actionOverrides,
    meta: currentMeta,
  };
}
