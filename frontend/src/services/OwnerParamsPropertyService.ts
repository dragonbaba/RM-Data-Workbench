import type {
  OwnerExtraParamMap,
  OwnerParamRateMap,
  OwnerParams,
  OwnerScalarMap,
  OwnerSpecialParamMap,
} from '../types';
import {
  OWNER_EXTRA_PARAM_KEYS,
  OWNER_PARAM_RATE_KEYS,
  OWNER_SCALAR_KEYS,
  OWNER_SPECIAL_PARAM_KEYS,
} from '../types';

const toFloatOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
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

export const buildRequiredOwnerParamsSaveData = (
  extraParams: OwnerExtraParamMap | null,
  specialParams: OwnerSpecialParamMap | null,
  scalar: OwnerScalarMap | null,
  paramRate: OwnerParamRateMap | null,
  elementRate: number[] | null,
): OwnerParams => ({
  extraParams: buildRequiredNumberGroup(extraParams, OWNER_EXTRA_PARAM_KEYS.length) as OwnerExtraParamMap,
  specialParams: buildRequiredNumberGroup(specialParams, OWNER_SPECIAL_PARAM_KEYS.length) as OwnerSpecialParamMap,
  scalar: buildRequiredNumberGroup(scalar, OWNER_SCALAR_KEYS.length) as OwnerScalarMap,
  paramRate: buildRequiredNumberGroup(paramRate, OWNER_PARAM_RATE_KEYS.length) as OwnerParamRateMap,
  elementRate: buildElementRateGroup(elementRate),
});
