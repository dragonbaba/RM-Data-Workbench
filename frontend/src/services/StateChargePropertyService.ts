import type { RPGItem, StateChargeConfig } from '../types';

export const STATE_CHARGE_QUEUE_SCOPE_CURRENT = 0;
export const STATE_CHARGE_QUEUE_SCOPE_NEXT = 1;

export interface StateChargeEditorValues {
  blockActions: boolean;
  grantAction: boolean;
  releaseSkillId: number;
  queueScope: number;
  queueShift: number;
}

export interface StateChargeEditorInput {
  blockActions?: unknown;
  grantAction?: unknown;
  releaseSkillId?: unknown;
  queueScope?: unknown;
  queueShift?: unknown;
}

export const DEFAULT_STATE_CHARGE_CONFIG: Readonly<StateChargeEditorValues> = Object.freeze({
  blockActions: false,
  grantAction: false,
  releaseSkillId: 0,
  queueScope: STATE_CHARGE_QUEUE_SCOPE_CURRENT,
  queueShift: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const normalizeQueueScope = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  return numeric === STATE_CHARGE_QUEUE_SCOPE_NEXT
    ? STATE_CHARGE_QUEUE_SCOPE_NEXT
    : STATE_CHARGE_QUEUE_SCOPE_CURRENT;
};

export function normalizeStateChargeEditorValues(value: unknown): StateChargeEditorValues {
  if (!isRecord(value)) {
    return { ...DEFAULT_STATE_CHARGE_CONFIG };
  }

  return {
    blockActions: value.blockActions === true,
    grantAction: value.grantAction === true,
    releaseSkillId: Math.max(0, toIntOrZero(value.releaseSkillId)),
    queueScope: normalizeQueueScope(value.queueScope),
    queueShift: toIntOrZero(value.queueShift),
  };
}

export function buildStateChargeSaveData(value: unknown): StateChargeConfig | undefined {
  const normalized = normalizeStateChargeEditorValues(value);
  return {
    blockActions: normalized.blockActions,
    grantAction: normalized.grantAction,
    releaseSkillId: normalized.releaseSkillId,
    queueScope: normalized.queueScope,
    queueShift: normalized.queueShift,
  };
}

export function areStateChargeConfigsEqual(
  left: unknown,
  right: StateChargeConfig | undefined,
): boolean {
  const normalizedLeft = normalizeStateChargeEditorValues(left);
  const normalizedRight = normalizeStateChargeEditorValues(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function normalizeStateDataEntry(state: unknown): RPGItem | null {
  if (!isRecord(state)) return null;
  const chargeConfig = buildStateChargeSaveData(state.chargeConfig);
  const nextState: RPGItem = {
    ...(state as unknown as RPGItem),
    chargeConfig,
  };
  return nextState;
}
