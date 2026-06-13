import { arePlainDataEqual } from './PlainDataCompare';

export const CLASS_LEVEL_EXTENSIONS_FILE_NAME = 'ClassLevelExtensions.json';
export const CLASS_LEVEL_EXTENSIONS_SCHEMA_VERSION = 2;
export const CLASS_EXTENDED_MIN_LEVEL = 100;
export const CLASS_BASE_LEVEL_ANCHOR = 99;
export const CLASS_PARAM_COUNT = 8;
export const CLASS_EXP_PARAM_COUNT = 4;
export const DEFAULT_CLASS_EXTENSION_MAX_LEVEL = 100;
export const DEFAULT_CLASS_GROWTH_MODE = 'standard' as const;
export const DEFAULT_CLASS_EXP_PARAMS: ClassExpParams = [30, 20, 30, 30];

export type ClassGrowthMode = 'standard' | 'early' | 'late' | 'linear';
export type ClassExpParams = [number, number, number, number];

export interface ClassExtendedLevel {
  level: number;
  exp: number;
  params: number[];
}

export interface ClassParamCurve {
  target: number;
  mode: ClassGrowthMode;
}

export interface ClassLevelExtension {
  maxLevel: number;
  expParams: ClassExpParams;
  paramCurves: ClassParamCurve[];
}

export interface ClassLevelExtensionsData {
  schemaVersion: number;
  classes: Array<ClassLevelExtension | null>;
}

export interface NormalizedClassLevelExtensionsResult {
  data: ClassLevelExtensionsData;
  changed: boolean;
}

const GROWTH_MODES = new Set<ClassGrowthMode>(['standard', 'early', 'late', 'linear']);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asNonNegativeInt = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
};

const asExtendedLevel = (value: unknown): number => {
  const level = asNonNegativeInt(value);
  return level >= CLASS_EXTENDED_MIN_LEVEL ? level : 0;
};

const normalizeMaxLevel = (value: unknown): number => {
  const level = asNonNegativeInt(value);
  return Math.max(CLASS_EXTENDED_MIN_LEVEL, level || DEFAULT_CLASS_EXTENSION_MAX_LEVEL);
};

const getClassEntry = (classesData: unknown, classIndex: number): unknown => {
  return Array.isArray(classesData) ? classesData[classIndex] : null;
};

const normalizeGrowthMode = (value: unknown): ClassGrowthMode => {
  return typeof value === 'string' && GROWTH_MODES.has(value as ClassGrowthMode)
    ? value as ClassGrowthMode
    : DEFAULT_CLASS_GROWTH_MODE;
};

export const normalizeClassLevelParams = (value: unknown): number[] => {
  const source = Array.isArray(value) ? value : [];
  const params = new Array(CLASS_PARAM_COUNT).fill(0);
  for (let index = 0; index < CLASS_PARAM_COUNT; index++) {
    params[index] = asNonNegativeInt(source[index]);
  }
  return params;
};

export const normalizeClassExpParams = (
  value: unknown,
  fallback: unknown = DEFAULT_CLASS_EXP_PARAMS,
): ClassExpParams => {
  const source = Array.isArray(value) ? value : [];
  const fallbackSource = Array.isArray(fallback) ? fallback : DEFAULT_CLASS_EXP_PARAMS;
  const result = new Array(CLASS_EXP_PARAM_COUNT).fill(0);
  for (let index = 0; index < CLASS_EXP_PARAM_COUNT; index++) {
    const rawValue = source[index] === undefined ? fallbackSource[index] : source[index];
    result[index] = asNonNegativeInt(rawValue);
  }
  return result as ClassExpParams;
};

const getClassEntryExpParams = (classEntry: unknown): ClassExpParams => {
  const source = asRecord(classEntry);
  return normalizeClassExpParams(source?.expParams, DEFAULT_CLASS_EXP_PARAMS);
};

const createDefaultParamCurves = (classEntry: unknown): ClassParamCurve[] => {
  const baseParams = getClassBaseParamsAtLevel(classEntry, CLASS_BASE_LEVEL_ANCHOR);
  return baseParams.map((target) => ({
    target,
    mode: DEFAULT_CLASS_GROWTH_MODE,
  }));
};

export const createDefaultClassLevelExtension = (classEntry?: unknown): ClassLevelExtension => ({
  maxLevel: DEFAULT_CLASS_EXTENSION_MAX_LEVEL,
  expParams: getClassEntryExpParams(classEntry),
  paramCurves: createDefaultParamCurves(classEntry),
});

const normalizeParamCurves = (
  value: unknown,
  classEntry: unknown,
): ClassParamCurve[] => {
  const source = Array.isArray(value) ? value : [];
  const defaults = createDefaultParamCurves(classEntry);
  const result = new Array(CLASS_PARAM_COUNT);
  for (let index = 0; index < CLASS_PARAM_COUNT; index++) {
    const entry = asRecord(source[index]);
    result[index] = {
      target: asNonNegativeInt(entry?.target ?? defaults[index].target),
      mode: normalizeGrowthMode(entry?.mode),
    };
  }
  return result;
};

const normalizeExtendedLevel = (value: unknown): ClassExtendedLevel | null => {
  const source = asRecord(value);
  if (!source) return null;

  const level = asExtendedLevel(source.level);
  if (level <= 0) return null;

  return {
    level,
    exp: asNonNegativeInt(source.exp),
    params: normalizeClassLevelParams(source.params),
  };
};

const normalizeExtendedLevels = (value: unknown): ClassExtendedLevel[] => {
  if (!Array.isArray(value)) return [];

  const byLevel = new Map<number, ClassExtendedLevel>();
  for (let index = 0; index < value.length; index++) {
    const entry = normalizeExtendedLevel(value[index]);
    if (entry) {
      byLevel.set(entry.level, entry);
    }
  }

  return Array.from(byLevel.values()).sort((left, right) => left.level - right.level);
};

const migrateLegacyLevels = (
  levelsValue: unknown,
  classEntry: unknown,
): ClassLevelExtension | null => {
  const levels = normalizeExtendedLevels(levelsValue);
  if (levels.length === 0) return null;

  const lastLevel = levels[levels.length - 1];
  return {
    maxLevel: normalizeMaxLevel(lastLevel.level),
    expParams: getClassEntryExpParams(classEntry),
    paramCurves: lastLevel.params.slice(0, CLASS_PARAM_COUNT).map((target) => ({
      target,
      mode: DEFAULT_CLASS_GROWTH_MODE,
    })),
  };
};

const normalizeClassLevelExtension = (
  value: unknown,
  classEntry: unknown,
): ClassLevelExtension => {
  const source = asRecord(value);
  const migrated = migrateLegacyLevels(source?.levels, classEntry);
  if (migrated) return migrated;

  return {
    maxLevel: normalizeMaxLevel(source?.maxLevel),
    expParams: normalizeClassExpParams(source?.expParams, getClassEntryExpParams(classEntry)),
    paramCurves: normalizeParamCurves(source?.paramCurves, classEntry),
  };
};

export const createDefaultClassLevelExtensions = (
  classCount: number,
  classesData?: unknown,
): ClassLevelExtensionsData => {
  const length = Math.max(1, Math.trunc(classCount));
  const classes: Array<ClassLevelExtension | null> = new Array(length).fill(null);
  classes[0] = null;
  for (let index = 1; index < length; index++) {
    classes[index] = createDefaultClassLevelExtension(getClassEntry(classesData, index));
  }
  return {
    schemaVersion: CLASS_LEVEL_EXTENSIONS_SCHEMA_VERSION,
    classes,
  };
};

export const normalizeClassLevelExtensions = (
  value: unknown,
  classCount: number,
  classesData?: unknown,
): NormalizedClassLevelExtensionsResult => {
  const source = asRecord(value);
  const fallback = createDefaultClassLevelExtensions(classCount, classesData);
  if (!source) {
    return {
      data: fallback,
      changed: true,
    };
  }

  const sourceClasses = Array.isArray(source.classes) ? source.classes : [];
  const length = Math.max(fallback.classes.length, sourceClasses.length);
  const classes: Array<ClassLevelExtension | null> = new Array(length).fill(null);
  classes[0] = null;
  for (let index = 1; index < length; index++) {
    classes[index] = normalizeClassLevelExtension(
      sourceClasses[index],
      getClassEntry(classesData, index),
    );
  }

  const data: ClassLevelExtensionsData = {
    schemaVersion: CLASS_LEVEL_EXTENSIONS_SCHEMA_VERSION,
    classes,
  };

  return {
    data,
    changed: !arePlainDataEqual(source, data),
  };
};

export const getClassLevelExtension = (
  data: ClassLevelExtensionsData | null,
  classIndex: number,
  classEntry?: unknown,
): ClassLevelExtension => {
  if (!data || classIndex <= 0) {
    return createDefaultClassLevelExtension(classEntry);
  }
  return normalizeClassLevelExtension(data.classes[classIndex], classEntry);
};

export const setClassLevelExtension = (
  data: ClassLevelExtensionsData | null,
  classIndex: number,
  extension: ClassLevelExtension,
  classEntry?: unknown,
): ClassLevelExtensionsData => {
  const base = data ?? createDefaultClassLevelExtensions(classIndex + 1);
  const length = Math.max(base.classes.length, classIndex + 1);
  const classes = base.classes.slice(0, length);
  while (classes.length < length) {
    classes.push(createDefaultClassLevelExtension());
  }
  classes[0] = null;
  classes[classIndex] = normalizeClassLevelExtension(extension, classEntry);
  return {
    schemaVersion: CLASS_LEVEL_EXTENSIONS_SCHEMA_VERSION,
    classes,
  };
};

export const getClassBaseParamsAtLevel = (classEntry: unknown, level: number): number[] => {
  const source = asRecord(classEntry);
  const params = Array.isArray(source?.params) ? source.params : [];
  const result = new Array(CLASS_PARAM_COUNT).fill(0);
  for (let paramIndex = 0; paramIndex < CLASS_PARAM_COUNT; paramIndex++) {
    const paramLevels = Array.isArray(params[paramIndex]) ? params[paramIndex] as unknown[] : [];
    result[paramIndex] = asNonNegativeInt(paramLevels[level]);
  }
  return result;
};

export const calculateClassExpFromParams = (
  expParams: unknown,
  level: number,
): number => {
  const [basis, extra, accA, rawAccB] = normalizeClassExpParams(expParams);
  const accB = Math.max(1, rawAccB);
  const targetLevel = Math.max(1, Math.trunc(level));

  return Math.round(
    (basis * Math.pow(targetLevel - 1, 0.9 + accA / 250) * targetLevel * (targetLevel + 1)) /
    (6 + Math.pow(targetLevel, 2) / 50 / accB) +
    (targetLevel - 1) * extra,
  );
};

export const calculateClassExpForLevel = (classEntry: unknown, level: number): number => {
  const source = asRecord(classEntry);
  return calculateClassExpFromParams(source?.expParams, level);
};

export const applyClassGrowthCurve = (
  progress: number,
  mode: ClassGrowthMode,
): number => {
  const t = Math.min(1, Math.max(0, progress));
  switch (mode) {
    case 'linear':
      return t;
    case 'early':
      return 1 - Math.pow(1 - t, 2);
    case 'late':
      return t * t;
    case 'standard':
    default:
      return t * t * (3 - 2 * t);
  }
};

export const calculateCurveParamValue = (
  start: number,
  target: number,
  progress: number,
  mode: ClassGrowthMode,
): number => {
  const curvedProgress = applyClassGrowthCurve(progress, mode);
  return Math.max(0, Math.round(start + (target - start) * curvedProgress));
};

export const buildClassLevelPreview = (
  classEntry: unknown,
  extension: ClassLevelExtension,
): ClassExtendedLevel[] => {
  const normalized = normalizeClassLevelExtension(extension, classEntry);
  const baseParams = getClassBaseParamsAtLevel(classEntry, CLASS_BASE_LEVEL_ANCHOR);
  const range = Math.max(1, normalized.maxLevel - CLASS_BASE_LEVEL_ANCHOR);
  const rows: ClassExtendedLevel[] = [];

  for (let level = CLASS_EXTENDED_MIN_LEVEL; level <= normalized.maxLevel; level++) {
    const progress = (level - CLASS_BASE_LEVEL_ANCHOR) / range;
    const params = new Array(CLASS_PARAM_COUNT);
    for (let paramIndex = 0; paramIndex < CLASS_PARAM_COUNT; paramIndex++) {
      const curve = normalized.paramCurves[paramIndex];
      params[paramIndex] = calculateCurveParamValue(
        baseParams[paramIndex],
        curve.target,
        progress,
        curve.mode,
      );
    }
    rows.push({
      level,
      exp: calculateClassExpFromParams(normalized.expParams, level),
      params,
    });
  }

  return rows;
};
