import type { GameEffectEntry, GameEffectType, RPGItem } from '../types';
import { extractSystemRecord } from './DataFileFormatService';

export interface EnsureItemEffectsResult<T> {
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
export type GameEffectArgsMode = 'ops' | 'count+ops' | 'id-set+ops';
export type GameEffectSelectorFieldKey =
  | 'slotIndexes'
  | 'etypeIds'
  | 'wtypeIds'
  | 'atypeIds';
export type GameEffectArgsFieldKey =
  | 'ops'
  | 'requiredCount'
  | 'weaponIds'
  | 'armorIds';
export type GameEffectStatOptionMode = 'static' | 'param-rate' | 'element-rate' | 'owner-extended';

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
  statOptionMode: GameEffectStatOptionMode;
  allowedStatIds: number[] | null;
  example: GameEffectEntry;
}

export const EFFECTS_FILE_NAME = 'Effects.json';
export const EFFECT_STAT_ID = Object.freeze({
  repeat: 1,
  hitRate: 2,
  critRate: 3,
  critDamageRate: 4,
  evadeRate: 5,
  interceptRate: 6,
  actionRepeat: 7,
  finalDamageRate: 8,
  loadValue: 101,
  carryValue: 102,
  expRate: 103,
} as const);

const PARAM_RATE_STAT_BASE = 200;
const ELEMENT_RATE_STAT_BASE = 300;
const STATIC_OWNER_STAT_IDS = [
  EFFECT_STAT_ID.hitRate,
  EFFECT_STAT_ID.critRate,
  EFFECT_STAT_ID.critDamageRate,
  EFFECT_STAT_ID.evadeRate,
  EFFECT_STAT_ID.interceptRate,
  EFFECT_STAT_ID.finalDamageRate,
  EFFECT_STAT_ID.loadValue,
  EFFECT_STAT_ID.carryValue,
];
const EQUIP_STAT_IDS = [
  EFFECT_STAT_ID.repeat,
  EFFECT_STAT_ID.hitRate,
  EFFECT_STAT_ID.critRate,
  EFFECT_STAT_ID.critDamageRate,
  EFFECT_STAT_ID.evadeRate,
  EFFECT_STAT_ID.interceptRate,
  EFFECT_STAT_ID.finalDamageRate,
];
const RUNTIME_STAT_IDS = [
  EFFECT_STAT_ID.hitRate,
  EFFECT_STAT_ID.critRate,
  EFFECT_STAT_ID.critDamageRate,
  EFFECT_STAT_ID.evadeRate,
  EFFECT_STAT_ID.finalDamageRate,
];
const ENGINE_OWNER_STAT_IDS = [EFFECT_STAT_ID.loadValue, EFFECT_STAT_ID.carryValue];
const ACTION_REPEAT_STAT_IDS = [EFFECT_STAT_ID.actionRepeat];
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
  'id-set+ops': ['weaponIds', 'armorIds', 'ops'],
};

const STAT_OPTIONS = new Map<number, EffectOption>([
  [EFFECT_STAT_ID.repeat, { value: EFFECT_STAT_ID.repeat, label: '静态连发' }],
  [EFFECT_STAT_ID.hitRate, { value: EFFECT_STAT_ID.hitRate, label: '命中率' }],
  [EFFECT_STAT_ID.critRate, { value: EFFECT_STAT_ID.critRate, label: '暴击率' }],
  [EFFECT_STAT_ID.critDamageRate, { value: EFFECT_STAT_ID.critDamageRate, label: '暴击伤害率' }],
  [EFFECT_STAT_ID.evadeRate, { value: EFFECT_STAT_ID.evadeRate, label: '回避率' }],
  [EFFECT_STAT_ID.interceptRate, { value: EFFECT_STAT_ID.interceptRate, label: '迎击率' }],
  [EFFECT_STAT_ID.actionRepeat, { value: EFFECT_STAT_ID.actionRepeat, label: '发射期连发' }],
  [EFFECT_STAT_ID.finalDamageRate, { value: EFFECT_STAT_ID.finalDamageRate, label: '最终伤害' }],
  [EFFECT_STAT_ID.loadValue, { value: EFFECT_STAT_ID.loadValue, label: '载重' }],
  [EFFECT_STAT_ID.carryValue, { value: EFFECT_STAT_ID.carryValue, label: '承重量' }],
  [EFFECT_STAT_ID.expRate, { value: EFFECT_STAT_ID.expRate, label: '经验获取率' }],
]);

const OP_OPTIONS: EffectOption[] = [
  { value: 1, label: '加算' },
  { value: 2, label: '乘算' },
  { value: 3, label: '设定值' },
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
  const deduped = Array.from(new Set(value.map((entry) => entry | 0)));
  return deduped;
};

const normalizeDescriptionLines = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const lines = value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return lines;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  return value
    .split(/\r?\n|，|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

export const getParamRateStatId = (paramIndex: number): number => PARAM_RATE_STAT_BASE + (paramIndex | 0);
export const getElementRateStatId = (elementId: number): number => ELEMENT_RATE_STAT_BASE + (elementId | 0);

const getSystemRecord = (systemData: unknown): Record<string, unknown> | null =>
  extractSystemRecord(systemData);

const getSystemParamNames = (systemData: unknown): string[] => {
  const terms = asRecord(getSystemRecord(systemData)?.terms);
  const params = Array.isArray(terms?.params) ? terms?.params : [];
  const names: string[] = [];
  for (let index = 0; index < 8; index++) {
    const rawName = typeof params[index] === 'string' ? params[index].trim() : '';
    names.push(rawName || `参数${index + 1}`);
  }
  return names;
};

const getSystemElementNames = (systemData: unknown): string[] => {
  const systemRecord = getSystemRecord(systemData);
  const rawElements = Array.isArray(systemRecord?.elements)
    ? systemRecord.elements as unknown[]
    : [];
  const names: string[] = [];
  for (let index = 1; index < rawElements.length; index++) {
    const entry = rawElements[index];
    const rawName = typeof entry === 'string' ? entry.trim() : '';
    names.push(rawName || `元素${index}`);
  }
  return names;
};

const buildParamRateOptions = (systemData: unknown): EffectOption[] =>
  getSystemParamNames(systemData).map((name, index) => {
    const statId = getParamRateStatId(index);
    return {
      value: statId,
      label: name,
    };
  });

const buildElementRateOptions = (systemData: unknown): EffectOption[] =>
  getSystemElementNames(systemData).map((name, offset) => {
    const elementId = offset + 1;
    const statId = getElementRateStatId(elementId);
    return {
      value: statId,
      label: name,
    };
  });

const buildStaticOptions = (statIds: number[]): EffectOption[] =>
  statIds
    .map((statId) => STAT_OPTIONS.get(statId))
    .filter((option): option is EffectOption => !!option)
    .map((option) => ({ ...option }));

const buildOwnerExtendedOptions = (systemData: unknown): EffectOption[] => ([
  ...buildStaticOptions([...STATIC_OWNER_STAT_IDS, EFFECT_STAT_ID.expRate]),
  ...buildParamRateOptions(systemData),
  ...buildElementRateOptions(systemData),
]);

const sanitizeOps = (
  value: unknown,
  allowedStatIds: number[] | null,
): Array<[number, number, number]> | undefined => {
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
    rows.push([statId | 0, opId | 0, opValue]);
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
  description: normalizeDescriptionLines(description) || [],
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
  statOptionMode?: GameEffectStatOptionMode;
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
  statOptionMode: input.statOptionMode || 'static',
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.repeat, 1, 1]] },
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
      ops: [
        [EFFECT_STAT_ID.hitRate, 2, 0.5],
        [EFFECT_STAT_ID.critRate, 2, 0.5],
        [EFFECT_STAT_ID.critDamageRate, 2, 2],
      ],
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.finalDamageRate, 1, 0.2]] },
    allowedStatIds: STATIC_OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'owner_scalar_bonus',
    label: 'Owner 标量加成',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '经验增益',
    exampleDescription: '直接给 owner 的标量属性加值，例如经验率',
    selectorTemplate: {},
    argsTemplate: { ops: [[EFFECT_STAT_ID.expRate, 1, 0.1]] },
    allowedStatIds: [EFFECT_STAT_ID.expRate],
  }),
  createTypeDefinition({
    effectType: 'owner_param_rate_bonus',
    label: 'Owner 普通属性率修正',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    statOptionMode: 'param-rate',
    exampleName: '驾驶率提升',
    exampleDescription: '给 owner 的前 8 项普通属性率做加算或乘算',
    selectorTemplate: {},
    argsTemplate: { ops: [[getParamRateStatId(1), 1, 0.1]] },
  }),
  createTypeDefinition({
    effectType: 'owner_element_rate_bonus',
    label: 'Owner 元素率修正',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    statOptionMode: 'element-rate',
    exampleName: '火炎耐性',
    exampleDescription: '给 owner 的元素率做加算或乘算',
    selectorTemplate: {},
    argsTemplate: { ops: [[getElementRateStatId(2), 1, -0.2]] },
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.loadValue, 1, 3000]] },
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.interceptRate, 1, 10]] },
    allowedStatIds: STATIC_OWNER_STAT_IDS,
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
    argsTemplate: { requiredCount: 2, ops: [[EFFECT_STAT_ID.repeat, 1, 1]] },
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
    argsTemplate: { requiredCount: 2, ops: [[EFFECT_STAT_ID.repeat, 1, 1]] },
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
    argsTemplate: { requiredCount: 2, ops: [[EFFECT_STAT_ID.loadValue, 1, 5000]] },
    allowedStatIds: ENGINE_OWNER_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'pair_same_cunit_bonus',
    label: '双同型 C 装奖励',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '双同型 C 装联动',
    exampleDescription: 'owner 已装备 c 装中存在一对同基础 ID 时，对命中装备应用属性',
    selectorTemplate: { ...EMPTY_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [[EFFECT_STAT_ID.actionRepeat, 1, 2]] },
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
    argsTemplate: { requiredCount: 2, ops: [[EFFECT_STAT_ID.critRate, 1, 5]] },
    allowedStatIds: STATIC_OWNER_STAT_IDS,
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.interceptRate, 1, 10], [EFFECT_STAT_ID.critRate, 1, 5]] },
    allowedStatIds: STATIC_OWNER_STAT_IDS,
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
    argsTemplate: { ops: [[EFFECT_STAT_ID.actionRepeat, 1, 1]] },
    allowedStatIds: ACTION_REPEAT_STAT_IDS,
  }),
  createTypeDefinition({
    effectType: 'equip_id_set_bonus',
    label: '装备 ID 合集奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'id-set+ops',
    statOptionMode: 'owner-extended',
    exampleName: '指定组件联动',
    exampleDescription: 'owner 同时装备指定武器/非武器 id 集合时应用属性',
    selectorTemplate: {},
    argsTemplate: {
      weaponIds: [1],
      armorIds: [2, 5, 10],
      ops: [[EFFECT_STAT_ID.expRate, 2, 2]],
    },
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

export const getAllowedStatIds = (effectType: GameEffectType, systemData?: unknown): number[] => {
  const definition = getGameEffectTypeDefinition(effectType);
  if (definition.statOptionMode === 'param-rate') {
    return buildParamRateOptions(systemData).map((option) => option.value);
  }
  if (definition.statOptionMode === 'element-rate') {
    return buildElementRateOptions(systemData).map((option) => option.value);
  }
  if (definition.statOptionMode === 'owner-extended') {
    return buildOwnerExtendedOptions(systemData).map((option) => option.value);
  }
  return [...(definition.allowedStatIds || [])];
};

export const getStatOptions = (effectType: GameEffectType, systemData?: unknown): EffectOption[] => {
  const definition = getGameEffectTypeDefinition(effectType);
  if (definition.statOptionMode === 'param-rate') {
    return buildParamRateOptions(systemData);
  }
  if (definition.statOptionMode === 'element-rate') {
    return buildElementRateOptions(systemData);
  }
  if (definition.statOptionMode === 'owner-extended') {
    return buildOwnerExtendedOptions(systemData);
  }
  return buildStaticOptions(definition.allowedStatIds || []);
};

export const getOpOptions = (): EffectOption[] =>
  OP_OPTIONS.map((option) => ({ ...option }));

export const createDefaultOpRow = (effectType: GameEffectType, systemData?: unknown): EffectOpRow => {
  const [defaultStatId = EFFECT_STAT_ID.repeat] = getAllowedStatIds(effectType, systemData);
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
  systemData?: unknown,
): ValidateGameEffectConfigResult => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      message: '至少需要一条属性操作',
    };
  }
  const allowedStatIds = getAllowedStatIds(effectType, systemData);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!isFiniteNumber(row?.statId)) {
      return { valid: false, message: `第 ${index + 1} 条操作缺少属性` };
    }
    if (!allowedStatIds.includes(row.statId)) {
      return { valid: false, message: `当前模板不允许使用 statId=${row.statId}` };
    }
    if (!isFiniteNumber(row.opId) || !EFFECT_OP_IDS.includes(row.opId)) {
      return { valid: false, message: `第 ${index + 1} 条操作的 opId 无效` };
    }
    if (!isFiniteNumber(row.value)) {
      return { valid: false, message: `第 ${index + 1} 条操作的 value 不是合法数字` };
    }
  }
  return { valid: true };
};

const sanitizeArgsRecord = (
  args: unknown,
  definition: Pick<GameEffectTypeDefinition, 'argsFields' | 'allowedStatIds' | 'statOptionMode' | 'effectType'>,
  systemData?: unknown,
): Record<string, unknown> => {
  const record = asRecord(args);
  if (!record) {
    return {};
  }
  const sanitized: Record<string, unknown> = {};
  if (definition.argsFields.includes('requiredCount') && isFiniteNumber(record.requiredCount)) {
    sanitized.requiredCount = record.requiredCount;
  }
  if (definition.argsFields.includes('weaponIds')) {
    sanitized.weaponIds = sanitizeNumberArray(record.weaponIds) || [];
  }
  if (definition.argsFields.includes('armorIds')) {
    sanitized.armorIds = sanitizeNumberArray(record.armorIds) || [];
  }
  if (definition.argsFields.includes('ops')) {
    const normalizedOps = sanitizeOps(
      record.ops,
      getAllowedStatIds(definition.effectType as GameEffectType, systemData),
    );
    if (normalizedOps) {
      sanitized.ops = normalizedOps;
    }
  }
  return sanitized;
};

export const createGameEffectConfig = (
  effectType: GameEffectType = 'equip_stat_bonus',
  value?: {
    selector?: unknown;
    args?: unknown;
  },
  systemData?: unknown,
): Record<string, unknown> => {
  const definition = getGameEffectTypeDefinition(effectType);
  const selectorTemplate = sanitizeSelectorRecord(definition.selectorTemplate, definition.selectorFields);
  const argsTemplate = sanitizeArgsRecord(definition.argsTemplate, definition, systemData);
  const normalizedSelector = sanitizeSelectorRecord(value?.selector, definition.selectorFields);
  const normalizedArgs = sanitizeArgsRecord(value?.args, definition, systemData);
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

export const createGameEffectTemplate = (
  effectType: GameEffectType,
  systemData?: unknown,
): GameEffectEntry => {
  const definition = getGameEffectTypeDefinition(effectType);
  return {
    ...cloneJsonValue(definition.example) as GameEffectEntry,
    config: createGameEffectConfig(effectType, undefined, systemData),
  };
};

export const normalizeGameEffectEntry = (
  value: unknown,
  systemData?: unknown,
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
  const template = createGameEffectTemplate(effectType, systemData);
  const normalized: GameEffectEntry = {
    id: isFiniteNumber(record.id) ? (record.id | 0) : undefined,
    name: asString(record.name) || template.name,
    description: normalizeDescriptionLines(record.description) || template.description,
    effectType,
    isStatic: definition.allowIsStaticToggle
      ? ('isStatic' in record ? asBoolean(record.isStatic) : template.isStatic)
      : definition.isStatic,
    config: createGameEffectConfig(effectType, {
      selector: asRecord(asRecord(record.config)?.selector) || {},
      args: asRecord(asRecord(record.config)?.args) || {},
    }, systemData),
  };
  return normalized;
};

export const normalizeEffectIdList = (value: unknown): number[] =>
  sanitizeNumberArray(value) || [];

export const ensureItemEffects = <T extends object>(
  item: T,
): EnsureItemEffectsResult<T & { effects: number[] }> => {
  const sourceItem = item as Record<string, unknown> & { effects?: unknown };
  const normalizedEffects = normalizeEffectIdList(sourceItem.effects);
  const changed = !Array.isArray(sourceItem.effects)
    || JSON.stringify(sourceItem.effects) !== JSON.stringify(normalizedEffects);
  if (!changed) {
    return {
      item: {
        ...sourceItem,
        effects: normalizedEffects,
      } as T & { effects: number[] },
      changed: false,
    };
  }
  return {
    item: {
      ...sourceItem,
      effects: normalizedEffects,
    } as T & { effects: number[] },
    changed: true,
  };
};

export const normalizeEffectRegistry = (
  data: unknown,
  systemData?: unknown,
): GameEffectEntry[] => {
  if (!Array.isArray(data)) {
    return [null as unknown as GameEffectEntry];
  }
  const result: GameEffectEntry[] = [null as unknown as GameEffectEntry];
  for (let index = 1; index < data.length; index++) {
    const normalized = normalizeGameEffectEntry(data[index], systemData);
    if (!normalized) {
      result[index] = null as unknown as GameEffectEntry;
      continue;
    }
    normalized.id = normalized.id && normalized.id > 0 ? normalized.id : index;
    result[index] = normalized;
  }
  return result;
};

export const validateGameEffectConfig = (
  effectType: GameEffectType,
  value: unknown,
  systemData?: unknown,
): ValidateGameEffectConfigResult => {
  const record = asRecord(value);
  if (!record) {
    return { valid: false, message: '配置必须是 JSON 对象' };
  }
  if (!asRecord(record.selector)) {
    return { valid: false, message: '配置缺少 selector 对象' };
  }
  if (!asRecord(record.args)) {
    return { valid: false, message: '配置缺少 args 对象' };
  }
  const definition = getGameEffectTypeDefinition(effectType);
  const selectorInvalidKeys = Object.keys(record.selector as Record<string, unknown>)
    .filter((key) => !Object.prototype.hasOwnProperty.call(definition.selectorTemplate, key));
  if (selectorInvalidKeys.length > 0) {
    return { valid: false, message: `selector 存在未定义字段: ${selectorInvalidKeys.join(', ')}` };
  }
  const argsInvalidKeys = Object.keys(record.args as Record<string, unknown>)
    .filter((key) => !Object.prototype.hasOwnProperty.call(definition.argsTemplate, key));
  if (argsInvalidKeys.length > 0) {
    return { valid: false, message: `args 存在未定义字段: ${argsInvalidKeys.join(', ')}` };
  }
  for (const key of Object.keys(record.selector as Record<string, unknown>)) {
    const valueOfKey = (record.selector as Record<string, unknown>)[key];
    if (!sanitizeNumberArray(valueOfKey)) {
      return { valid: false, message: `selector.${key} 必须是数值数组` };
    }
  }
  if (definition.argsFields.includes('requiredCount') && !isFiniteNumber((record.args as Record<string, unknown>).requiredCount)) {
    return { valid: false, message: 'args.requiredCount 必须是数字' };
  }
  if (definition.argsFields.includes('weaponIds') && !sanitizeNumberArray((record.args as Record<string, unknown>).weaponIds)) {
    return { valid: false, message: 'args.weaponIds 必须是数字数组' };
  }
  if (definition.argsFields.includes('armorIds') && !sanitizeNumberArray((record.args as Record<string, unknown>).armorIds)) {
    return { valid: false, message: 'args.armorIds 必须是数字数组' };
  }
  if (definition.argsFields.includes('ops')) {
    const sanitizedOps = sanitizeOps(
      (record.args as Record<string, unknown>).ops,
      getAllowedStatIds(effectType, systemData),
    );
    if (!sanitizedOps || sanitizedOps.length === 0) {
      return {
        valid: false,
        message: 'args.ops 必须是合法的三元组数组，且 statId 必须符合当前模板约束',
      };
    }
  }
  return { valid: true };
};

export const validateGameEffectEntry = (
  value: unknown,
  systemData?: unknown,
): ValidateGameEffectConfigResult => {
  const record = asRecord(value);
  if (!record) {
    return { valid: false, message: '效果必须是对象' };
  }
  const effectType = asGameEffectType(record.effectType);
  if (!effectType || !GAME_EFFECT_TYPE_MAP.has(effectType)) {
    return { valid: false, message: 'effectType 无效或缺失' };
  }
  const definition = getGameEffectTypeDefinition(effectType);
  if (!definition.allowIsStaticToggle && record.isStatic !== definition.isStatic) {
    return {
      valid: false,
      message: `模板 ${effectType} 的 isStatic 必须为 ${definition.isStatic}`,
    };
  }
  return validateGameEffectConfig(effectType, record.config, systemData);
};
