const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

type PassiveStateHostEntry = Record<string, unknown> & {
  passiveStates: number[];
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

export function normalizePassiveStates(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const result: number[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < value.length; index++) {
    const stateId = Math.max(0, toIntOrZero(value[index]));
    if (stateId <= 0 || seen.has(stateId)) continue;
    seen.add(stateId);
    result.push(stateId);
  }
  return result;
}

export function buildPassiveStatesSaveData(value: unknown): number[] {
  return normalizePassiveStates(value);
}

export function arePassiveStatesEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizePassiveStates(left);
  const normalizedRight = normalizePassiveStates(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  for (let index = 0; index < normalizedLeft.length; index++) {
    if (normalizedLeft[index] !== normalizedRight[index]) return false;
  }
  return true;
}

export function normalizePassiveStateHostEntry(entry: unknown): PassiveStateHostEntry | null {
  if (!isRecord(entry)) return null;
  return {
    ...entry,
    passiveStates: buildPassiveStatesSaveData(entry.passiveStates),
  };
}
