import type { RPGItem } from '../types';
import { arePlainDataEqual } from './PlainDataCompare';

export type ShapeParams = Record<string, Record<string, number>>;

export interface CommonRangeValues {
  targetCamp: number;
  targetLifeState: number;
  selectMode: number;
  areaMode: number;
  shapeType: number;
  areaTargetCount: number;
  shapeParams: ShapeParams;
  repeatTime: number;
  repeatTimeFloat: number;
}

export interface WeaponRangeValues {
  areaOverride: number;
  areaMode: number;
  shapeType: number;
  areaTargetCount: number;
  shapeParams: ShapeParams;
  repeatTime: number;
  repeatTimeFloat: number;
}

const TARGET_CAMP_SELF = 3;
const TARGET_CAMP_EVERYONE = 4;
const TARGET_LIFE_STATE_ALIVE = 1;
const TARGET_LIFE_STATE_BOTH = 3;
const SELECT_MODE_SINGLE = 1;
const SELECT_MODE_ALL = 2;
const AREA_MODE_SINGLE = 1;
const AREA_MODE_AREA = 2;
const AREA_MODE_PENETRATE = 3;
const AREA_MODE_ALL = 4;
const SHAPE_TYPE_CIRCLE = 1;
const SHAPE_TYPE_SECTOR = 2;
const SHAPE_TYPE_LINE = 3;

export const DEFAULT_SHAPE_PARAMS: ShapeParams = Object.freeze({
  '1': Object.freeze({ radius: 120 }),
  '2': Object.freeze({ radius: 180, angleDeg: 60 }),
  '3': Object.freeze({ width: 80, length: 240 }),
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const toFloatOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
};

const readIntWithDefault = (value: unknown, defaultValue: number): number => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return toIntOrZero(value);
};

const readFloatWithDefault = (value: unknown, defaultValue: number): number => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return toFloatOrZero(value);
};

export const normalizeShapeParams = (value: unknown): ShapeParams => {
  if (!isRecord(value)) {
    return DEFAULT_SHAPE_PARAMS;
  }
  return value as ShapeParams;
};

export const areShapeParamsEqual = (left: unknown, right: ShapeParams): boolean => {
  return arePlainDataEqual(normalizeShapeParams(left), right);
};

export const normalizeCommonRangeValues = (raw: Record<string, unknown>): CommonRangeValues => {
  let targetCamp = Math.max(1, readIntWithDefault(raw.targetCamp, 1));
  let targetLifeState = Math.max(1, readIntWithDefault(raw.targetLifeState, 1));
  let selectMode = Math.max(1, readIntWithDefault(raw.selectMode, 1));
  let areaMode = Math.max(1, readIntWithDefault(raw.areaMode, 1));
  let shapeType = Math.max(0, toIntOrZero(raw.shapeType));
  let areaTargetCount = Math.max(0, toIntOrZero(raw.areaTargetCount));

  if (targetCamp === TARGET_CAMP_SELF) {
    targetLifeState = TARGET_LIFE_STATE_ALIVE;
    selectMode = SELECT_MODE_SINGLE;
    areaMode = AREA_MODE_SINGLE;
  } else if (targetCamp === TARGET_CAMP_EVERYONE) {
    selectMode = SELECT_MODE_ALL;
    areaMode = AREA_MODE_ALL;
  }

  if (selectMode === SELECT_MODE_ALL) {
    areaMode = AREA_MODE_ALL;
  }

  if (areaMode === AREA_MODE_SINGLE || areaMode === AREA_MODE_ALL) {
    shapeType = 0;
    areaTargetCount = 0;
  } else if (areaMode === AREA_MODE_PENETRATE) {
    shapeType = 3;
    areaTargetCount = 0;
  } else {
    if (shapeType !== 1 && shapeType !== 2) shapeType = 1;
    areaTargetCount = Math.max(1, areaTargetCount || 1);
  }

  return {
    targetCamp: Math.min(TARGET_CAMP_EVERYONE, targetCamp),
    targetLifeState: Math.min(TARGET_LIFE_STATE_BOTH, targetLifeState),
    selectMode: Math.min(SELECT_MODE_ALL, selectMode),
    areaMode: Math.min(AREA_MODE_ALL, areaMode),
    shapeType: Math.min(3, shapeType),
    areaTargetCount,
    shapeParams: normalizeShapeParams(raw.shapeParams),
    repeatTime: Math.max(1, readIntWithDefault(raw.repeatTime, 1)),
    repeatTimeFloat: Math.max(0, readFloatWithDefault(raw.repeatTimeFloat, 0)),
  };
};

export const normalizeWeaponRangeValues = (raw: Record<string, unknown>): WeaponRangeValues => {
  let areaOverride = Math.max(0, readIntWithDefault(raw.areaOverride, 0));
  let areaMode = Math.max(1, readIntWithDefault(raw.areaMode, 1));
  let shapeType = Math.max(0, readIntWithDefault(raw.shapeType, 0));
  let areaTargetCount = Math.max(0, readIntWithDefault(raw.areaTargetCount, 0));

  if (areaOverride === 0) {
    areaMode = AREA_MODE_SINGLE;
    shapeType = 0;
    areaTargetCount = 0;
  } else if (areaMode === AREA_MODE_SINGLE || areaMode === AREA_MODE_ALL) {
    shapeType = 0;
    areaTargetCount = 0;
  } else if (areaMode === AREA_MODE_PENETRATE) {
    shapeType = SHAPE_TYPE_LINE;
    areaTargetCount = 0;
  } else {
    areaMode = AREA_MODE_AREA;
    if (
      shapeType !== SHAPE_TYPE_CIRCLE
      && shapeType !== SHAPE_TYPE_SECTOR
      && shapeType !== SHAPE_TYPE_LINE
    ) {
      shapeType = SHAPE_TYPE_CIRCLE;
    }
    areaTargetCount = Math.max(1, areaTargetCount || 1);
  }

  return {
    areaOverride: Math.min(1, areaOverride),
    areaMode: Math.min(AREA_MODE_ALL, areaMode),
    shapeType,
    areaTargetCount,
    shapeParams: normalizeShapeParams(raw.shapeParams),
    repeatTime: Math.max(1, readIntWithDefault(raw.repeatTime, 1)),
    repeatTimeFloat: Math.max(0, readFloatWithDefault(raw.repeatTimeFloat, 0)),
  };
};

export const normalizeCommonRangeDataEntry = (item: unknown): RPGItem | null => {
  if (!isRecord(item)) return null;
  return {
    ...(item as unknown as RPGItem),
    ...normalizeCommonRangeValues(item),
  };
};

export const normalizeWeaponRangeDataEntry = (item: unknown): RPGItem | null => {
  if (!isRecord(item)) return null;
  return {
    ...(item as unknown as RPGItem),
    ...normalizeWeaponRangeValues(item),
  };
};
