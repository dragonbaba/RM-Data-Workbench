import type { GameEffectEntry, GameEffectType, RPGItem } from '../types';

export interface EnsureGameEffectsResult<T> {
  item: T;
  changed: boolean;
}

export interface ValidateGameEffectConfigResult {
  valid: boolean;
  message?: string;
}

export interface EffectOpRow {
  statId: number;
  opId: number;
  value: number;
}

export interface EffectOption {
  value: number;
  label: string;
}

export type GameEffectSelectorMode = 'none' | 'equip';
export type GameEffectArgsMode = 'ops' | 'count+ops';
export type GameEffectSelectorFieldKey =
  | 'slotIndexes'
  | 'etypeIds'
  | 'wtypeIds'
  | 'atypeIds';
export type GameEffectArgsFieldKey =
  | 'ops'
  | 'requiredCount';

export interface GameEffectTypeDefinition {
  effectType: GameEffectType;
  label: string;
  isStatic: boolean;
  allowIsStaticToggle: boolean;
  selectorMode: GameEffectSelectorMode;
  argsMode: GameEffectArgsMode;
  selectorTemplate: Record<string, unknown>;
  argsTemplate: Record<string, unknown>;
  selectorFields: GameEffectSelectorFieldKey[];
  argsFields: GameEffectArgsFieldKey[];
  allowedStatIds: number[] | null;
  example: GameEffectEntry;
}

const EQUIP_STAT_IDS = [1, 2, 3, 4, 5, 6, 8];
const RUNTIME_STAT_IDS = [2, 3, 4, 5, 8];
const OWNER_STAT_IDS = [2, 3, 4, 5, 6, 8, 101, 102];
const ENGINE_OWNER_STAT_IDS = [101, 102];
const ACTION_REPEAT_STAT_IDS = [7];
const EFFECT_OP_IDS = [1, 2, 3];
const EMPTY_SELECTOR_TEMPLATE = Object.freeze({
  slotIndexes: [],
  etypeIds: [],
  wtypeIds: [],
  atypeIds: [],
});

const SELECTOR_FIELD_KEYS: GameEffectSelectorFieldKey[] = [
  'slotIndexes',
  'etypeIds',
  'wtypeIds',
  'atypeIds',
];

const ARGS_FIELDS_BY_MODE: Record<GameEffectArgsMode, GameEffectArgsFieldKey[]> = {
  ops: ['ops'],
  'count+ops': ['requiredCount', 'ops'],
};

const STAT_OPTIONS = new Map<number, EffectOption>([
  [1, { value: 1, label: '1 | repeat | 静态连发' }],
  [2, { value: 2, label: '2 | hitRate | 命中率' }],
  [3, { value: 3, label: '3 | critRate | 暴击率' }],
  [4, { value: 4, label: '4 | critDamageRate | 暴击伤害率' }],
  [5, { value: 5, label: '5 | evadeRate | 回避率' }],
  [6, { value: 6, label: '6 | interceptRate | 迎击率' }],
  [7, { value: 7, label: '7 | actionRepeat | 发射期连发' }],
  [8, { value: 8, label: '8 | finalDamageRate | 最终伤害' }],
  [101, { value: 101, label: '101 | loadValue | 载重' }],
  [102, { value: 102, label: '102 | carryValue | 承重量' }],
]);

const OP_OPTIONS: EffectOption[] = [
  { value: 1, label: '1 | add | 加算' },
  { value: 2, label: '2 | mul | 乘算' },
  { value: 3, label: '3 | set | 设定值' },
];

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asBoolean = (value: unknown): boolean => value === true;

const asGameEffectType = (value: unknown): GameEffectType | '' =>
  typeof value === 'string' ? value as GameEffectType : '';

const cloneJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const cloned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    cloned[key] = cloneJsonValue(entry);
  }
  return cloned;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeNumberArray = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value) || value.some((entry) => !isFiniteNumber(entry))) {
    return undefined;
  }
  return value.map((entry) => entry);
};

const sanitizeOps = (value: unknown, allowedStatIds: number[] | null): Array<[number, number, number]> | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows: Array<[number, number, number]> = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 3) {
      return undefined;
    }
    const [statId, opId, opValue] = row;
    if (!isFiniteNumber(statId) || !isFiniteNumber(opId) || !isFiniteNumber(opValue)) {
      return undefined;
    }
    if (!EFFECT_OP_IDS.includes(opId)) {
      return undefined;
    }
    if (allowedStatIds && !allowedStatIds.includes(statId)) {
      return undefined;
    }
    rows.push([statId, opId, opValue]);
  }

  return rows;
};

const sanitizeSelectorRecord = (
  selector: unknown,
  selectorFields: GameEffectSelectorFieldKey[],
): Record<string, unknown> => {
  const record = asRecord(selector);
  if (!record || selectorFields.length === 0) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const key of selectorFields) {
    const rawValue = record[key];
    if (rawValue === undefined) {
      continue;
    }
    const normalized = sanitizeNumberArray(rawValue);
    if (normalized) {
      sanitized[key] = normalized;
    }
  }

  return sanitized;
};

const sanitizeSharedArgsRecord = (
  args: unknown,
  definition: Pick<GameEffectTypeDefinition, 'argsFields' | 'allowedStatIds'>,
): Record<string, unknown> => {
  const record = asRecord(args);
  if (!record) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  if (definition.argsFields.includes('requiredCount') && isFiniteNumber(record.requiredCount)) {
    sanitized.requiredCount = record.requiredCount;
  }
  if (definition.argsFields.includes('ops')) {
    const normalizedOps = sanitizeOps(record.ops, definition.allowedStatIds);
    if (normalizedOps) {
      sanitized.ops = normalizedOps;
    }
  }

  return sanitized;
};

const getSelectorFields = (selectorMode: GameEffectSelectorMode): GameEffectSelectorFieldKey[] =>
  selectorMode === 'equip' ? [...SELECTOR_FIELD_KEYS] : [];

const createEffectExample = (
  effectType: GameEffectType,
  label: string,
  description: string,
  isStatic: boolean,
  selector: Record<string, unknown>,
  args: Record<string, unknown>,
): GameEffectEntry => ({
  name: label,
  description,
  effectType,
  isStatic,
  config: {
    selector,
    args,
  },
});

const createTypeDefinition = (input: {
  effectType: GameEffectType;
  label: string;
  isStatic: boolean;
  allowIsStaticToggle?: boolean;
  selectorMode: GameEffectSelectorMode;
  argsMode: GameEffectArgsMode;
  exampleName: string;
  exampleDescription: string;
  selectorTemplate: Record<string, unknown>;
  argsTemplate: Record<string, unknown>;
  allowedStatIds?: number[] | null;
}): GameEffectTypeDefinition => ({
  effectType: input.effectType,
  label: input.label,
  isStatic: input.isStatic,
  allowIsStaticToggle: input.allowIsStaticToggle === true,
  selectorMode: input.selectorMode,
  argsMode: input.argsMode,
  selectorTemplate: cloneJsonValue(input.selectorTemplate) as Record<string, unknown>,
  argsTemplate: cloneJsonValue(input.argsTemplate) as Record<string, unknown>,
  selectorFields: getSelectorFields(input.selectorMode),
  argsFields: [...ARGS_FIELDS_BY_MODE[input.argsMode]],
  allowedStatIds: input.allowedStatIds === undefined
    ? null
    : [...(input.allowedStatIds || [])],
  example: createEffectExample(
    input.effectType,
    input.exampleName,
    input.exampleDescription,
    input.isStatic,
    cloneJsonValue(input.selectorTemplate) as Record<string, unknown>,
    cloneJsonValue(input.argsTemplate) as Record<string, unknown>,
  ),
});

const GAME_EFFECT_TYPE_DEFINITIONS: GameEffectTypeDefinition[] = [
  createTypeDefinition({
    effectType: 'equip_stat_bonus',
    label: '静态装备属性修正',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'ops',
    exampleName: '主炮支援',
    exampleDescription: '给命中的装备实例增加静态属性',
    selectorTemplate: EMPTY_SELECTOR_TEMPLATE,
    argsTemplate: { ops: [[1, 1, 1]] },
    allowedStatIds: EQUIP_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'runtime_stat_bonus',
    label: '运行时属性修正',
    isStatic: false,
    selectorMode: 'equip',
    argsMode: 'ops',
    exampleName: '失准过载',
    exampleDescription: '对本次行动的命中、暴击和暴伤做临时修正',
    selectorTemplate: EMPTY_SELECTOR_TEMPLATE,
    argsTemplate: {
      ops: [[2, 2, 0.5], [3, 2, 0.5], [4, 2, 2]],
    },
    allowedStatIds: RUNTIME_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'owner_stat_bonus',
    label: 'Owner 自身属性修正',
    isStatic: true,
    allowIsStaticToggle: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '最终伤害强化',
    exampleDescription: '直接给 owner 自身累计属性加值',
    selectorTemplate: {},
    argsTemplate: { ops: [[8, 1, 0.2]] },
    allowedStatIds: OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'single_engine_bonus',
    label: '单引擎奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '单引擎载重补正',
    exampleDescription: 'owner 恰好只装备一个引擎时应用属性奖励',
    selectorTemplate: {},
    argsTemplate: { ops: [[101, 1, 3000]] },
    allowedStatIds: ENGINE_OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'single_cunit_bonus',
    label: '单 C 装奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '单 C 装迎击补正',
    exampleDescription: 'owner 恰好只装备一个 c 装置时应用属性奖励',
    selectorTemplate: {},
    argsTemplate: { ops: [[6, 1, 10]] },
    allowedStatIds: OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'equip_count_bonus',
    label: '装备数量达标',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '双件套奖励',
    exampleDescription: '命中集合数量达到阈值时对同集合应用属性',
    selectorTemplate: { ...EMPTY_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [[1, 1, 1]] },
    allowedStatIds: EQUIP_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'same_base_id_count_bonus',
    label: '同基础 ID 数量达标',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '同型套装奖励',
    exampleDescription: '命中集合里只要有同基础 ID 达标就应用属性',
    selectorTemplate: { ...EMPTY_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [[1, 1, 1]] },
    allowedStatIds: EQUIP_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'pair_same_engine_bonus',
    label: '双同型引擎奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'count+ops',
    exampleName: '双同型引擎补正',
    exampleDescription: 'owner 已装备引擎中存在一对同基础 ID 时应用属性',
    selectorTemplate: {},
    argsTemplate: { requiredCount: 2, ops: [[101, 1, 5000]] },
    allowedStatIds: ENGINE_OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'pair_same_cunit_bonus',
    label: '双同型 C 装奖励',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '双同型 C 装联动',
    exampleDescription: 'owner 已装备 c 装中存在一对同基础 ID 时应用属性',
    selectorTemplate: { ...EMPTY_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [[7, 1, 2]] },
    allowedStatIds: EQUIP_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'pair_same_cunit_owner_bonus',
    label: '双同型 C 装 Owner 奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'count+ops',
    exampleName: '双同型 C 装迎击联动',
    exampleDescription: 'owner 已装备 c 装中存在一对同基础 ID 时对 owner 应用属性',
    selectorTemplate: {},
    argsTemplate: { requiredCount: 2, ops: [[3, 1, 5]] },
    allowedStatIds: OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'cunit_owner_stat_bonus',
    label: 'C 装 Owner 属性修正',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '迎击与暴击强化',
    exampleDescription: 'C 装置直接给 owner 自身累计属性加值',
    selectorTemplate: {},
    argsTemplate: { ops: [[6, 1, 10], [3, 1, 5]] },
    allowedStatIds: OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'cunit_slot_action_repeat_bonus',
    label: 'C 装槽位追加发射',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'ops',
    exampleName: '主炮追加发射',
    exampleDescription: 'C 装置给指定槽位武器追加发射次数',
    selectorTemplate: { ...EMPTY_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { ops: [[7, 1, 1]] },
    allowedStatIds: ACTION_REPEAT_STAT_IDS,
  }),
];

const GAME_EFFECT_TYPE_MAP = new Map(
  GAME_EFFECT_TYPE_DEFINITIONS.map((definition) => [definition.effectType, definition]),
);

export const getGameEffectTypeDefinition = (
  effectType: GameEffectType | '',
): GameEffectTypeDefinition => {
  const definition = GAME_EFFECT_TYPE_MAP.get(effectType as GameEffectType)
    || GAME_EFFECT_TYPE_MAP.get('equip_stat_bonus')!;

  return {
    ...definition,
    selectorFields: [...definition.selectorFields],
    argsFields: [...definition.argsFields],
    allowedStatIds: definition.allowedStatIds ? [...definition.allowedStatIds] : null,
    selectorTemplate: cloneJsonValue(definition.selectorTemplate) as Record<string, unknown>,
    argsTemplate: cloneJsonValue(definition.argsTemplate) as Record<string, unknown>,
    example: cloneJsonValue(definition.example) as GameEffectEntry,
  };
};

export const getGameEffectTypeDefinitions = (): GameEffectTypeDefinition[] =>
  GAME_EFFECT_TYPE_DEFINITIONS.map((definition) => getGameEffectTypeDefinition(definition.effectType));

export const getAllowedStatIds = (effectType: GameEffectType): number[] =>
  [...(getGameEffectTypeDefinition(effectType).allowedStatIds || [])];

export const getStatOptions = (effectType: GameEffectType): EffectOption[] =>
  getAllowedStatIds(effectType)
    .map((statId) => STAT_OPTIONS.get(statId))
    .filter((option): option is EffectOption => !!option)
    .map((option) => ({ ...option }));

export const getOpOptions = (): EffectOption[] =>
  OP_OPTIONS.map((option) => ({ ...option }));

export const createDefaultOpRow = (effectType: GameEffectType): EffectOpRow => {
  const [defaultStatId = 1] = getAllowedStatIds(effectType);
  return {
    statId: defaultStatId,
    opId: 1,
    value: 0,
  };
};

export const parseOpsToRows = (value: unknown): EffectOpRow[] => {
  const ops = sanitizeOps(value, null);
  if (!ops) {
    return [];
  }
  return ops.map(([statId, opId, opValue]) => ({
    statId,
    opId,
    value: opValue,
  }));
};

export const serializeRowsToOps = (rows: EffectOpRow[]): Array<[number, number, number]> =>
  rows.map((row) => [row.statId, row.opId, row.value]);

export const validateEffectOpRows = (
  effectType: GameEffectType,
  rows: EffectOpRow[],
): ValidateGameEffectConfigResult => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      message: '至少需要一条属性操作',
    };
  }

  const allowedStatIds = getAllowedStatIds(effectType);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!isFiniteNumber(row?.statId)) {
      return {
        valid: false,
        message: `第 ${index + 1} 条操作缺少属性`,
      };
    }
    if (!allowedStatIds.includes(row.statId)) {
      return {
        valid: false,
        message: `当前模板不允许使用 statId=${row.statId}`,
      };
    }
    if (!isFiniteNumber(row.opId) || !EFFECT_OP_IDS.includes(row.opId)) {
      return {
        valid: false,
        message: `第 ${index + 1} 条操作的 opId 无效`,
      };
    }
    if (!isFiniteNumber(row.value)) {
      return {
        valid: false,
        message: `第 ${index + 1} 条操作的 value 不是合法数字`,
      };
    }
  }

  return { valid: true };
};

export const createGameEffectConfig = (
  effectType: GameEffectType = 'equip_stat_bonus',
  value?: {
    selector?: unknown;
    args?: unknown;
  },
): Record<string, unknown> => {
  const definition = getGameEffectTypeDefinition(effectType);
  const selectorTemplate = sanitizeSelectorRecord(definition.selectorTemplate, definition.selectorFields);
  const argsTemplate = sanitizeSharedArgsRecord(definition.argsTemplate, definition);
  const normalizedSelector = sanitizeSelectorRecord(value?.selector, definition.selectorFields);
  const normalizedArgs = sanitizeSharedArgsRecord(value?.args, definition);

  return {
    selector: {
      ...cloneJsonValue(selectorTemplate) as Record<string, unknown>,
      ...normalizedSelector,
    },
    args: {
      ...cloneJsonValue(argsTemplate) as Record<string, unknown>,
      ...normalizedArgs,
    },
  };
};

export const createDefaultGameEffectConfig = (
  effectType: GameEffectType = 'equip_stat_bonus',
): Record<string, unknown> => createGameEffectConfig(effectType);

export const createGameEffectTemplate = (
  effectType: GameEffectType,
  _item?: Pick<RPGItem, 'scripts'> | null,
): GameEffectEntry => {
  const definition = getGameEffectTypeDefinition(effectType);
  return {
    ...cloneJsonValue(definition.example) as GameEffectEntry,
    config: createGameEffectConfig(effectType),
  };
};

export const createDefaultGameEffect = (
  effectType: GameEffectType = 'equip_stat_bonus',
  item?: Pick<RPGItem, 'scripts'> | null,
): GameEffectEntry => createGameEffectTemplate(effectType, item);

export const normalizeGameEffectEntry = (
  value: unknown,
  item?: Pick<RPGItem, 'scripts'> | null,
): GameEffectEntry | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const rawEffectType = asGameEffectType(record.effectType);
  if (!rawEffectType || !GAME_EFFECT_TYPE_MAP.has(rawEffectType)) {
    return null;
  }
  const effectType: GameEffectType = rawEffectType;
  const definition = getGameEffectTypeDefinition(effectType);
  const template = createGameEffectTemplate(effectType, item);

  return {
    name: asString(record.name) || template.name,
    description: asString(record.description) || template.description,
    effectType,
    isStatic: definition.allowIsStaticToggle
      ? ('isStatic' in record ? asBoolean(record.isStatic) : template.isStatic)
      : definition.isStatic,
    config: createGameEffectConfig(effectType, {
      selector: asRecord(asRecord(record.config)?.selector) || {},
      args: asRecord(asRecord(record.config)?.args) || {},
    }),
  };
};

export const ensureItemGameEffects = <T extends object>(
  item: T,
): EnsureGameEffectsResult<T & { gameEffects: GameEffectEntry[] }> => {
  const sourceItem = item as Record<string, unknown> & { gameEffects?: unknown[] };

  if (!Array.isArray(sourceItem.gameEffects)) {
    return {
      item: {
        ...sourceItem,
        gameEffects: [],
      } as T & { gameEffects: GameEffectEntry[] },
      changed: true,
    };
  }

  const normalizedEffects = sourceItem.gameEffects
    .map((entry) => normalizeGameEffectEntry(entry, sourceItem as unknown as RPGItem))
    .filter((entry): entry is GameEffectEntry => entry !== null);
  const changed = JSON.stringify(sourceItem.gameEffects) !== JSON.stringify(normalizedEffects);
  if (!changed) {
    return {
      item: sourceItem as T & { gameEffects: GameEffectEntry[] },
      changed: false,
    };
  }

  return {
    item: {
      ...sourceItem,
      gameEffects: normalizedEffects,
    } as T & { gameEffects: GameEffectEntry[] },
    changed: true,
  };
};

export const validateGameEffectConfig = (
  effectType: GameEffectType,
  value: unknown,
): ValidateGameEffectConfigResult => {
  const record = asRecord(value);
  if (!record) {
    return {
      valid: false,
      message: '配置必须是 JSON 对象',
    };
  }

  if (!asRecord(record.selector)) {
    return {
      valid: false,
      message: '配置缺少 selector 对象',
    };
  }

  if (!asRecord(record.args)) {
    return {
      valid: false,
      message: '配置缺少 args 对象',
    };
  }

  const definition = getGameEffectTypeDefinition(effectType);
  const selectorInvalidKeys = Object.keys(record.selector as Record<string, unknown>)
    .filter((key) => !Object.prototype.hasOwnProperty.call(definition.selectorTemplate, key));
  if (selectorInvalidKeys.length > 0) {
    return {
      valid: false,
      message: `selector 存在未定义字段: ${selectorInvalidKeys.join(', ')}`,
    };
  }

  const argsInvalidKeys = Object.keys(record.args as Record<string, unknown>)
    .filter((key) => !Object.prototype.hasOwnProperty.call(definition.argsTemplate, key));
  if (argsInvalidKeys.length > 0) {
    return {
      valid: false,
      message: `args 存在未定义字段: ${argsInvalidKeys.join(', ')}`,
    };
  }

  for (const key of Object.keys(record.selector as Record<string, unknown>)) {
    const valueOfKey = (record.selector as Record<string, unknown>)[key];
    if (!sanitizeNumberArray(valueOfKey)) {
      return {
        valid: false,
        message: `selector.${key} 必须是数值数组`,
      };
    }
  }

  if (definition.argsFields.includes('requiredCount') && !isFiniteNumber((record.args as Record<string, unknown>).requiredCount)) {
    return {
      valid: false,
      message: 'args.requiredCount 必须是数字',
    };
  }

  if (definition.argsFields.includes('ops')) {
    const sanitizedOps = sanitizeOps((record.args as Record<string, unknown>).ops, definition.allowedStatIds);
    if (!sanitizedOps || sanitizedOps.length === 0) {
      return {
        valid: false,
        message: 'args.ops 必须是合法的三元组数组，且 statId 必须符合当前模板约束',
      };
    }
  }

  return { valid: true };
};

export const validateGameEffectEntry = (value: unknown): ValidateGameEffectConfigResult => {
  const record = asRecord(value);
  if (!record) {
    return {
      valid: false,
      message: '效果必须是对象',
    };
  }

  const effectType = asGameEffectType(record.effectType);
  if (!effectType || !GAME_EFFECT_TYPE_MAP.has(effectType)) {
    return {
      valid: false,
      message: 'effectType 无效或缺失',
    };
  }

  const definition = getGameEffectTypeDefinition(effectType);
  if (!definition.allowIsStaticToggle && record.isStatic !== definition.isStatic) {
    return {
      valid: false,
      message: `模板 ${effectType} 的 isStatic 必须为 ${definition.isStatic}`,
    };
  }

  return validateGameEffectConfig(effectType, record.config);
};
