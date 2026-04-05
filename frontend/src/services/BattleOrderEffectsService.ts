import type { BattleOrderEffects } from '../types';

export const DEFAULT_BATTLE_ORDER_EFFECTS: Readonly<Required<BattleOrderEffects>> = Object.freeze({
  userNext: 0,
  targetCurrent: 0,
  targetNext: 0,
  targetFollow: false,
  speedConvert: 0,
});

const toIntOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

export function normalizeBattleOrderEffects(value: unknown): Required<BattleOrderEffects> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_BATTLE_ORDER_EFFECTS };
  }

  const source = value as Record<string, unknown>;
  return {
    userNext: toIntOrZero(source.userNext),
    targetCurrent: toIntOrZero(source.targetCurrent),
    targetNext: toIntOrZero(source.targetNext),
    targetFollow: source.targetFollow === true,
    speedConvert: toIntOrZero(source.speedConvert),
  };
}

export function areBattleOrderEffectsEqual(
  left: unknown,
  right: Required<BattleOrderEffects>,
): boolean {
  const normalizedLeft = normalizeBattleOrderEffects(left);
  return normalizedLeft.userNext === right.userNext
    && normalizedLeft.targetCurrent === right.targetCurrent
    && normalizedLeft.targetNext === right.targetNext
    && normalizedLeft.targetFollow === right.targetFollow
    && normalizedLeft.speedConvert === right.speedConvert;
}

export function buildBattleOrderEffectsSaveData(
  value: unknown,
): Required<BattleOrderEffects> {
  return normalizeBattleOrderEffects(value);
}
