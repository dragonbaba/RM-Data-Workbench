import type { RPGEnemy } from '../types';

export const KNOWN_ENEMY_PROPERTY_KEYS = [
  'classId',
  'level',
  'levelScope',
  'isBoss',
  'bounty',
  'attackAnimationId',
] as const;

export interface EnemyEditorValues {
  classId: number;
  level: number;
  levelScope: number;
  isBoss: boolean;
  bounty: number;
  attackAnimationId: number;
}

export interface EnemyEditorInput {
  classId?: unknown;
  level?: unknown;
  levelScope?: unknown;
  isBoss?: unknown;
  bounty?: unknown;
  attackAnimationId?: unknown;
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
      classId: 0,
      level: 0,
      levelScope: 0,
      isBoss: false,
      bounty: 0,
      attackAnimationId: 0,
    };
  }

  return {
    classId: toIntOrZero(enemy.classId),
    level: toIntOrZero(enemy.level),
    levelScope: toIntOrZero(enemy.levelScope),
    isBoss: toBooleanFlag(enemy.isBoss),
    bounty: toIntOrZero(enemy.bounty),
    attackAnimationId: toIntOrZero(enemy.attackAnimationId),
  };
}

export function hasEnemyEditorChanges(sourceItem: RPGEnemy, nextValues: EnemyEditorInput): boolean {
  const currentValues = normalizeEnemyEditorValues(sourceItem);

  return currentValues.classId !== toIntOrZero(nextValues.classId)
    || currentValues.level !== toIntOrZero(nextValues.level)
    || currentValues.levelScope !== toIntOrZero(nextValues.levelScope)
    || currentValues.isBoss !== toBooleanFlag(nextValues.isBoss)
    || currentValues.bounty !== toIntOrZero(nextValues.bounty)
    || currentValues.attackAnimationId !== toIntOrZero(nextValues.attackAnimationId);
}

export function buildEnemySaveData(sourceItem: RPGEnemy, nextValues: EnemyEditorInput): RPGEnemy {
  return {
    ...sourceItem,
    classId: toIntOrZero(nextValues.classId),
    level: toIntOrZero(nextValues.level),
    levelScope: toIntOrZero(nextValues.levelScope),
    isBoss: toBooleanFlag(nextValues.isBoss),
    bounty: toIntOrZero(nextValues.bounty),
    attackAnimationId: toIntOrZero(nextValues.attackAnimationId),
    note: '',
    meta: {},
  };
}
