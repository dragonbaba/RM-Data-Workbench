import type {
  EnemyBookChallenge,
  EnemyBookChallengeExtraReward,
  EnemyBookChallengeRewardType,
  EnemyBookChallengeStar,
  RPGEnemy,
} from '../types';
import { normalizePassiveStates } from './PassiveStatePropertyService';

export const KNOWN_ENEMY_PROPERTY_KEYS = [
  'classId',
  'level',
  'levelScope',
  'isBoss',
  'allowBreak',
  'canReaction',
  'bounty',
  'attackAnimationId',
  'reactionSkillId',
  'bookChallenge',
] as const;

export interface EnemyEditorValues {
  classId: number;
  level: number;
  levelScope: number;
  isBoss: boolean;
  allowBreak: boolean;
  canReaction: boolean;
  bounty: number;
  attackAnimationId: number;
  reactionSkillId: number;
  bookChallenge: EnemyBookChallenge;
}

export interface EnemyEditorInput {
  classId?: unknown;
  level?: unknown;
  levelScope?: unknown;
  isBoss?: unknown;
  allowBreak?: unknown;
  canReaction?: unknown;
  bounty?: unknown;
  attackAnimationId?: unknown;
  reactionSkillId?: unknown;
  bookChallenge?: unknown;
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

export function normalizeEnemyEditorValues(enemy: unknown): EnemyEditorValues {
  if (!isRecord(enemy)) {
    return {
      classId: 1,
      level: 1,
      levelScope: 0,
      isBoss: false,
      allowBreak: false,
      canReaction: false,
      bounty: 0,
      attackAnimationId: 0,
      reactionSkillId: 0,
      bookChallenge: createDefaultEnemyBookChallenge(),
    };
  }

  return {
    classId: normalizeEnemyClassId(enemy.classId),
    level: normalizeEnemyLevel(enemy.level),
    levelScope: toIntOrZero(enemy.levelScope),
    isBoss: toBooleanFlag(enemy.isBoss),
    allowBreak: toBooleanFlag(enemy.allowBreak),
    canReaction: Object.prototype.hasOwnProperty.call(enemy, 'canReaction')
      ? toBooleanFlag(enemy.canReaction)
      : toIntOrZero(enemy.reactionSkillId) > 0,
    bounty: toIntOrZero(enemy.bounty),
    attackAnimationId: toIntOrZero(enemy.attackAnimationId),
    reactionSkillId: toIntOrZero(enemy.reactionSkillId),
    bookChallenge: normalizeEnemyBookChallenge(enemy.bookChallenge),
  };
}

export function normalizeEnemyDataEntry(enemy: unknown): RPGEnemy | null {
  if (!isRecord(enemy)) return null;
  const normalized = normalizeEnemyEditorValues(enemy);
  const currentMeta = isRecord(enemy.meta) ? enemy.meta : {};

  return {
    ...(enemy as unknown as RPGEnemy),
    meta: currentMeta,
    classId: normalized.classId,
    level: normalized.level,
    levelScope: normalized.levelScope,
    isBoss: normalized.isBoss,
    allowBreak: normalized.allowBreak,
    canReaction: normalized.canReaction,
    bounty: normalized.bounty,
    attackAnimationId: normalized.attackAnimationId,
    reactionSkillId: normalized.reactionSkillId,
    bookChallenge: normalized.bookChallenge,
  };
}

export function hasEnemyEditorChanges(sourceItem: RPGEnemy, nextValues: EnemyEditorInput): boolean {
  const currentValues = normalizeEnemyEditorValues(sourceItem);

  return currentValues.classId !== normalizeEnemyClassId(nextValues.classId)
    || currentValues.level !== normalizeEnemyLevel(nextValues.level)
    || currentValues.levelScope !== toIntOrZero(nextValues.levelScope)
    || currentValues.isBoss !== toBooleanFlag(nextValues.isBoss)
    || currentValues.allowBreak !== toBooleanFlag(nextValues.allowBreak)
    || currentValues.canReaction !== toBooleanFlag(nextValues.canReaction)
    || currentValues.bounty !== toIntOrZero(nextValues.bounty)
    || currentValues.attackAnimationId !== toIntOrZero(nextValues.attackAnimationId)
    || currentValues.reactionSkillId !== toIntOrZero(nextValues.reactionSkillId)
    || JSON.stringify(currentValues.bookChallenge) !== JSON.stringify(normalizeEnemyBookChallenge(nextValues.bookChallenge));
}

export function buildEnemySaveData(sourceItem: RPGEnemy, nextValues: EnemyEditorInput): RPGEnemy {
  const currentMeta = isRecord(sourceItem.meta) ? sourceItem.meta : {};
  return {
    ...sourceItem,
    classId: normalizeEnemyClassId(nextValues.classId),
    level: normalizeEnemyLevel(nextValues.level),
    levelScope: toIntOrZero(nextValues.levelScope),
    isBoss: toBooleanFlag(nextValues.isBoss),
    allowBreak: toBooleanFlag(nextValues.allowBreak),
    canReaction: toBooleanFlag(nextValues.canReaction),
    bounty: toIntOrZero(nextValues.bounty),
    attackAnimationId: toIntOrZero(nextValues.attackAnimationId),
    reactionSkillId: toIntOrZero(nextValues.reactionSkillId),
    bookChallenge: normalizeEnemyBookChallenge(nextValues.bookChallenge),
    meta: currentMeta,
  };
}
