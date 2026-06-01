import type {
  OwnerBaseParamMap,
  OwnerExtraParamMap,
  OwnerParamRateMap,
  OwnerParams,
  OwnerScalarMap,
  OwnerSpecialParamMap,
} from '../types';
import {
  BASE_PARAM_KEYS,
  OWNER_EXTRA_PARAM_KEYS,
  OWNER_SCALAR_KEYS,
  OWNER_SPECIAL_PARAM_KEYS,
  type OwnerExtraParamKey,
} from '../types';

const toFloatOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
};

const OWNER_PROBABILITY_EXTRA_PARAM_KEYS = new Set<OwnerExtraParamKey>([
  'hitRate',
  'evadeRate',
  'critRate',
  'interceptRate',
]);

const clampOwnerProbabilityValue = (value: unknown): number => {
  const numeric = toFloatOrZero(value);
  if (numeric <= 0) return 0;
  if (numeric >= 100) return 100;
  return numeric;
};

const buildRequiredNumberGroup = (value: unknown, length: number): number[] => {
  const source = Array.isArray(value) ? value : [];
  const result = new Array<number>(length);
  for (let index = 0; index < length; index++) {
    result[index] = toFloatOrZero(source[index]);
  }
  return result;
};

const buildElementRateGroup = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const result = new Array<number>(value.length);
  for (let index = 0; index < value.length; index++) {
    result[index] = toFloatOrZero(value[index]);
  }
  return result;
};

const buildOwnerExtraParamGroup = (value: unknown): OwnerExtraParamMap => {
  const source = Array.isArray(value) ? value : [];
  const result = new Array<number>(OWNER_EXTRA_PARAM_KEYS.length);
  for (let index = 0; index < OWNER_EXTRA_PARAM_KEYS.length; index++) {
    const key = OWNER_EXTRA_PARAM_KEYS[index];
    const rawValue = source[index];
    result[index] = OWNER_PROBABILITY_EXTRA_PARAM_KEYS.has(key)
      ? clampOwnerProbabilityValue(rawValue)
      : toFloatOrZero(rawValue);
  }
  return result as OwnerExtraParamMap;
};

export const buildRequiredOwnerParamsSaveData = (
  baseParams: OwnerBaseParamMap | null,
  paramRate: OwnerParamRateMap | null,
  extraParams: OwnerExtraParamMap | null,
  specialParams: OwnerSpecialParamMap | null,
  scalar: OwnerScalarMap | null,
  elementRate: number[] | null,
): OwnerParams => ({
  baseParams: buildRequiredNumberGroup(baseParams, BASE_PARAM_KEYS.length) as OwnerBaseParamMap,
  paramRate: buildRequiredNumberGroup(paramRate, BASE_PARAM_KEYS.length) as OwnerParamRateMap,
  extraParams: buildOwnerExtraParamGroup(extraParams),
  specialParams: buildRequiredNumberGroup(specialParams, OWNER_SPECIAL_PARAM_KEYS.length) as OwnerSpecialParamMap,
  scalar: buildRequiredNumberGroup(scalar, OWNER_SCALAR_KEYS.length) as OwnerScalarMap,
  ...(elementRate ? { elementRate: buildElementRateGroup(elementRate) } : {}),
});
