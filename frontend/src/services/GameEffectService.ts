import type {
  GameEffectAttributeOp,
  GameEffectBaseParamKey,
  GameEffectConfig,
  GameEffectEntry,
  GameEffectOpGroup,
  GameEffectOpKind,
  GameEffectType,
} from '../types';
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
  group: GameEffectOpGroup;
  key: string;
  op: GameEffectOpKind;
  value: number;
}

export interface EffectOption<T extends string = string> {
  value: T;
  label: string;
}

export type GameEffectSelectorMode = 'none' | 'equip';
export type GameEffectArgsMode = 'ops' | 'count+ops' | 'id-set+ops';
export type GameEffectSelectorFieldKey = 'slotIndexes' | 'etypeIds' | 'wtypeIds' | 'atypeIds';
export type GameEffectArgsFieldKey = 'ops' | 'requiredCount' | 'weaponIds' | 'armorIds';

export interface GameEffectAllowedGroupDefinition {
  group: GameEffectOpGroup;
  keys: string[] | null;
}

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
  allowedGroups: GameEffectAllowedGroupDefinition[];
  example: GameEffectEntry;
}

export const EFFECTS_FILE_NAME = 'Effects.json';

const PARAM_RATE_KEYS = ['mhp', 'mmp', 'atk', 'def', 'mat', 'mdf', 'agi', 'luk'] as const;
const EXTRA_PARAM_KEYS = ['hitRate', 'critRate', 'critDamage', 'evadeRate', 'interceptRate', 'finalDamage'] as const;
const OWNER_VEHICLE_PARAM_KEYS = ['loadValue', 'carryValue'] as const;
const PAIR_CUNIT_EQUIP_VEHICLE_PARAM_KEYS = ['actionRepeat'] as const;
const ACTION_REPEAT_KEYS = ['actionRepeat'] as const;
const SCALAR_KEYS = ['expRate'] as const;
const SPECIAL_PARAM_KEYS = ['tgr', 'grd', 'rec', 'pha', 'pdr', 'hrg'] as const;
const OP_OPTIONS: EffectOption<GameEffectOpKind>[] = [
  { value: 'add', label: '加算' },
  { value: 'mul', label: '乘算' },
  { value: 'set', label: '设定值' },
];
const FULL_EQUIP_SELECTOR_TEMPLATE = Object.freeze({
  slotIndexes: [],
  etypeIds: [],
  wtypeIds: [],
  atypeIds: [],
});
const TYPE_EQUIP_SELECTOR_TEMPLATE = Object.freeze({
  etypeIds: [],
  wtypeIds: [],
  atypeIds: [],
});
const EMPTY_ARGS_TEMPLATE = Object.freeze({
  ops: [],
  requiredCount: 0,
  weaponIds: [],
  armorIds: [],
});
const SELECTOR_FIELD_KEYS: GameEffectSelectorFieldKey[] = ['slotIndexes', 'etypeIds', 'wtypeIds', 'atypeIds'];
const ARGS_FIELDS_BY_MODE: Record<GameEffectArgsMode, GameEffectArgsFieldKey[]> = {
  ops: ['ops'],
  'count+ops': ['requiredCount', 'ops'],
  'id-set+ops': ['weaponIds', 'armorIds', 'ops'],
};
const GROUP_LABELS: Record<GameEffectOpGroup, string> = {
  baseParams: '基础属性',
  extraParams: '额外属性',
  vehicleParams: '车辆属性',
  scalar: '标量',
  specialParams: '特殊属性',
  baseParamRate: '基础属性率',
};
const BASE_PARAM_LABELS: Record<string, string> = {
  mhp: '最大生命值',
  mmp: '最大魔法值',
  atk: '攻击力',
  def: '防御力',
  mat: '魔法攻击力',
  mdf: '魔法防御力',
  agi: '速度',
  luk: '幸运',
};
const EXTRA_PARAM_LABELS: Record<string, string> = {
  hitRate: '命中率',
  critRate: '暴击率',
  critDamage: '暴击伤害',
  evadeRate: '回避率',
  interceptRate: '迎击率',
  finalDamage: '最终伤害',
};
const VEHICLE_PARAM_LABELS: Record<string, string> = {
  repeat: '静态连发',
  actionRepeat: '发射期连发',
  loadValue: '载重',
  carryValue: '承重量',
};
const SCALAR_LABELS: Record<string, string> = {
  expRate: '经验获取率',
};
const SPECIAL_PARAM_LABELS: Record<string, string> = {
  tgr: '仇恨',
  grd: '防御效率',
  rec: '恢复效果',
  pha: '药效',
  pdr: '物理伤害',
  hrg: 'HP 再生率',
};
const DEFAULT_KEY_BY_GROUP: Record<GameEffectOpGroup, string> = {
  baseParams: 'mhp',
  extraParams: 'hitRate',
  vehicleParams: 'loadValue',
  scalar: 'expRate',
  specialParams: 'tgr',
  baseParamRate: 'mhp',
};

const OWNER_STATIC_GROUPS: GameEffectAllowedGroupDefinition[] = [
  { group: 'baseParams', keys: [...PARAM_RATE_KEYS] },
  { group: 'extraParams', keys: [...EXTRA_PARAM_KEYS] },
  { group: 'vehicleParams', keys: [...OWNER_VEHICLE_PARAM_KEYS] },
  { group: 'specialParams', keys: [...SPECIAL_PARAM_KEYS] },
  { group: 'baseParamRate', keys: [...PARAM_RATE_KEYS] },
];
const EQUIP_EFFECT_GROUPS: GameEffectAllowedGroupDefinition[] = [
  { group: 'extraParams', keys: [...EXTRA_PARAM_KEYS] },
];
const ENGINE_OWNER_GROUPS: GameEffectAllowedGroupDefinition[] = [
  { group: 'baseParams', keys: [...PARAM_RATE_KEYS] },
  { group: 'baseParamRate', keys: [...PARAM_RATE_KEYS] },
  { group: 'vehicleParams', keys: [...OWNER_VEHICLE_PARAM_KEYS] },
];
const ACTION_REPEAT_GROUPS: GameEffectAllowedGroupDefinition[] = [
  { group: 'vehicleParams', keys: [...ACTION_REPEAT_KEYS] },
];
const PAIR_SAME_CUNIT_EQUIP_GROUPS: GameEffectAllowedGroupDefinition[] = [
  { group: 'extraParams', keys: [...EXTRA_PARAM_KEYS] },
  { group: 'vehicleParams', keys: [...PAIR_CUNIT_EQUIP_VEHICLE_PARAM_KEYS] },
];
const SCALAR_GROUPS: GameEffectAllowedGroupDefinition[] = [{ group: 'scalar', keys: [...SCALAR_KEYS] }];
const OWNER_EXTENDED_GROUPS: GameEffectAllowedGroupDefinition[] = [
  ...OWNER_STATIC_GROUPS,
  ...SCALAR_GROUPS,
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
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isEffectOpKind = (value: unknown): value is GameEffectOpKind =>
  value === 'add' || value === 'mul' || value === 'set';

const cloneJsonValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry)) as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const record = value as Record<string, unknown>;
  const cloned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    cloned[key] = cloneJsonValue(entry);
  }
  return cloned as T;
};

const sanitizeNumberArray = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value) || value.some((entry) => !isFiniteNumber(entry))) {
    return undefined;
  }
  return Array.from(new Set(value.map((entry) => entry | 0)));
};

const normalizeDescriptionLines = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const lines = value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim());
    return lines.length > 0 ? lines : undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const lines = value
    .split(/\r?\n|，|,/)
    .map((entry) => entry.trim());
  return lines.length > 0 ? lines : undefined;
};

const getSystemRecord = (systemData: unknown): Record<string, unknown> | null =>
  extractSystemRecord(systemData);

const getSystemParamNames = (systemData: unknown): string[] => {
  const terms = asRecord(getSystemRecord(systemData)?.terms);
  const params = Array.isArray(terms?.params) ? terms.params : [];
  const names: string[] = [];
  for (let index = 0; index < PARAM_RATE_KEYS.length; index++) {
    const rawName = typeof params[index] === 'string' ? params[index].trim() : '';
    names.push(rawName || `参数${index + 1}`);
  }
  return names;
};

const buildBaseParamOptions = (systemData: unknown): EffectOption<GameEffectBaseParamKey>[] => {
  const paramNames = getSystemParamNames(systemData);
  return PARAM_RATE_KEYS.map((key, index) => ({
    value: key,
    label: paramNames[index] || `参数${index + 1}`,
  }));
};

const getKeyLabel = (group: GameEffectOpGroup, key: string, systemData?: unknown): string => {
  if (group === 'baseParams') return BASE_PARAM_LABELS[key] || key;
  if (group === 'extraParams') return EXTRA_PARAM_LABELS[key] || key;
  if (group === 'vehicleParams') return VEHICLE_PARAM_LABELS[key] || key;
  if (group === 'scalar') return SCALAR_LABELS[key] || key;
  if (group === 'specialParams') return SPECIAL_PARAM_LABELS[key] || key;
  return buildBaseParamOptions(systemData).find((option) => option.value === key)?.label || key;
};

const getSelectorFields = (
  selectorMode: GameEffectSelectorMode,
  selectorTemplate: Record<string, unknown>,
): GameEffectSelectorFieldKey[] =>
  selectorMode === 'equip'
    ? SELECTOR_FIELD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(selectorTemplate, key))
    : [];

const createEffectExample = (
  effectType: GameEffectType,
  label: string,
  description: string,
  isStatic: boolean,
  selector: GameEffectConfig['selector'],
  args: GameEffectConfig['args'],
): GameEffectEntry => ({
  name: label,
  description: normalizeDescriptionLines(description) || [],
  effectType,
  isStatic,
  config: { selector, args },
});

const cloneAllowedGroups = (value: GameEffectAllowedGroupDefinition[]): GameEffectAllowedGroupDefinition[] =>
  value.map((entry) => ({
    group: entry.group,
    keys: entry.keys ? [...entry.keys] : null,
  }));

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
  allowedGroups: GameEffectAllowedGroupDefinition[];
}): GameEffectTypeDefinition => ({
  effectType: input.effectType,
  label: input.label,
  isStatic: input.isStatic,
  allowIsStaticToggle: input.allowIsStaticToggle === true,
  selectorMode: input.selectorMode,
  argsMode: input.argsMode,
  selectorTemplate: cloneJsonValue(input.selectorTemplate),
  argsTemplate: {
    ...cloneJsonValue(EMPTY_ARGS_TEMPLATE),
    ...cloneJsonValue(input.argsTemplate),
  },
  selectorFields: getSelectorFields(input.selectorMode, input.selectorTemplate),
  argsFields: [...ARGS_FIELDS_BY_MODE[input.argsMode]],
  allowedGroups: cloneAllowedGroups(input.allowedGroups),
  example: createEffectExample(
    input.effectType,
    input.exampleName,
    input.exampleDescription,
    input.isStatic,
    cloneJsonValue(input.selectorTemplate) as GameEffectConfig['selector'],
    {
      ...cloneJsonValue(EMPTY_ARGS_TEMPLATE),
      ...cloneJsonValue(input.argsTemplate),
    },
  ),
});

const GAME_EFFECT_TYPE_DEFINITIONS: GameEffectTypeDefinition[] = [
  createTypeDefinition({
    effectType: 'single_engine_bonus',
    label: '单引擎奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'ops',
    exampleName: '单引擎载重补正',
    exampleDescription: 'owner 恰好只装备一个引擎时应用属性奖励',
    selectorTemplate: {},
    argsTemplate: { ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 }] },
    allowedGroups: ENGINE_OWNER_GROUPS,
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
    argsTemplate: { ops: [{ group: 'extraParams', key: 'interceptRate', op: 'add', value: 10 }] },
    allowedGroups: OWNER_STATIC_GROUPS,
  }),
  createTypeDefinition({
    effectType: 'equip_count_bonus',
    label: '同角色装备类型数量奖励',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '双件套奖励',
    exampleDescription: '同一角色身上命中的装备类型数量达到阈值时应用属性',
    selectorTemplate: { ...TYPE_EQUIP_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }] },
    allowedGroups: EQUIP_EFFECT_GROUPS,
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
    argsTemplate: { requiredCount: 2, ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 5000 }] },
    allowedGroups: ENGINE_OWNER_GROUPS,
  }),
  createTypeDefinition({
    effectType: 'pair_same_cunit_bonus',
    label: '双同型 C 装奖励',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'count+ops',
    exampleName: '双同型 C 装联动',
    exampleDescription: 'owner 已装备 c 装中存在一对同基础 ID 时，对命中装备应用属性',
    selectorTemplate: { ...FULL_EQUIP_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { requiredCount: 2, ops: [{ group: 'vehicleParams', key: 'actionRepeat', op: 'add', value: 2 }] },
    allowedGroups: PAIR_SAME_CUNIT_EQUIP_GROUPS,
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
    argsTemplate: { requiredCount: 2, ops: [{ group: 'extraParams', key: 'critRate', op: 'add', value: 5 }] },
    allowedGroups: OWNER_STATIC_GROUPS,
  }),
  createTypeDefinition({
    effectType: 'cunit_slot_action_repeat_bonus',
    label: 'C 装槽位追加发射',
    isStatic: true,
    selectorMode: 'equip',
    argsMode: 'ops',
    exampleName: '主炮追加发射',
    exampleDescription: 'C 装置给指定槽位武器追加发射次数',
    selectorTemplate: { ...FULL_EQUIP_SELECTOR_TEMPLATE, etypeIds: [10] },
    argsTemplate: { ops: [{ group: 'vehicleParams', key: 'actionRepeat', op: 'add', value: 1 }] },
    allowedGroups: ACTION_REPEAT_GROUPS,
  }),
  createTypeDefinition({
    effectType: 'equip_id_set_bonus',
    label: '装备 ID 合集奖励',
    isStatic: true,
    selectorMode: 'none',
    argsMode: 'id-set+ops',
    exampleName: '指定组件联动',
    exampleDescription: 'owner 同时装备指定武器/非武器 id 集合时应用属性',
    selectorTemplate: {},
    argsTemplate: {
      weaponIds: [1],
      armorIds: [2, 5, 10],
      ops: [{ group: 'baseParamRate', key: 'mhp', op: 'mul', value: 1.2 }],
    },
    allowedGroups: OWNER_EXTENDED_GROUPS,
  }),
];

const GAME_EFFECT_TYPE_MAP = new Map(
  GAME_EFFECT_TYPE_DEFINITIONS.map((definition) => [definition.effectType, definition]),
);

export const getGameEffectTypeDefinition = (
  effectType: GameEffectType | '',
): GameEffectTypeDefinition => {
  const definition = GAME_EFFECT_TYPE_MAP.get(effectType as GameEffectType);
  if (!definition) {
    throw new Error(`未知 effectType: ${String(effectType)}`);
  }
  return {
    ...definition,
    selectorFields: [...definition.selectorFields],
    argsFields: [...definition.argsFields],
    selectorTemplate: cloneJsonValue(definition.selectorTemplate),
    argsTemplate: cloneJsonValue(definition.argsTemplate),
    allowedGroups: cloneAllowedGroups(definition.allowedGroups),
    example: cloneJsonValue(definition.example),
  };
};

export const getGameEffectTypeDefinitions = (): GameEffectTypeDefinition[] =>
  GAME_EFFECT_TYPE_DEFINITIONS.map((definition) => getGameEffectTypeDefinition(definition.effectType));

const getAllowedGroupDefinition = (
  effectType: GameEffectType,
  group: GameEffectOpGroup,
): GameEffectAllowedGroupDefinition | null => {
  const definition = getGameEffectTypeDefinition(effectType);
  return definition.allowedGroups.find((entry) => entry.group === group) || null;
};

const buildKeyOptions = (
  effectType: GameEffectType,
  group: GameEffectOpGroup,
  systemData?: unknown,
): EffectOption<string>[] => {
  const allowedGroup = getAllowedGroupDefinition(effectType, group);
  if (!allowedGroup) return [];
  if (allowedGroup.keys === null) {
    return [];
  }
  return allowedGroup.keys.map((key) => ({
    value: key,
    label: getKeyLabel(group, key, systemData),
  }));
};

const sanitizeSelectorRecord = (
  selector: unknown,
  allowedKeys: readonly GameEffectSelectorFieldKey[],
): Record<string, unknown> => {
  const record = asRecord(selector);
  if (!record) return {};
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const normalized = sanitizeNumberArray(record[key]);
    if (normalized) sanitized[key] = normalized;
  }
  return sanitized;
};

const normalizeEffectOpRow = (
  row: unknown,
  effectType: GameEffectType,
  systemData?: unknown,
): EffectOpRow | null => {
  const record = asRecord(row);
  if (!record) return null;
  const group = record.group;
  const key = record.key;
  const op = record.op;
  const value = record.value;
  if (
    (group !== 'baseParams'
      && group !== 'extraParams'
      && group !== 'vehicleParams'
      && group !== 'scalar'
      && group !== 'specialParams'
      && group !== 'baseParamRate')
    || typeof key !== 'string'
    || !isEffectOpKind(op)
    || !isFiniteNumber(value)
  ) {
    return null;
  }
  const keyOptions = buildKeyOptions(effectType, group, systemData);
  if (!keyOptions.some((option) => option.value === key)) {
    return null;
  }
  return { group, key, op, value } as EffectOpRow;
};

const sanitizeEffectOpRows = (
  value: unknown,
  effectType: GameEffectType,
  systemData?: unknown,
): EffectOpRow[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const rows: EffectOpRow[] = [];
  for (const row of value) {
    const normalized = normalizeEffectOpRow(row, effectType, systemData);
    if (!normalized) return undefined;
    rows.push(normalized);
  }
  return rows;
};

const sanitizeArgsRecord = (
  args: unknown,
  definition: Pick<GameEffectTypeDefinition, 'effectType'>,
  systemData?: unknown,
): Record<string, unknown> => {
  const record = asRecord(args);
  if (!record) return {};
  const sanitized: Record<string, unknown> = {};
  if (isFiniteNumber(record.requiredCount)) {
    sanitized.requiredCount = record.requiredCount;
  }
  sanitized.weaponIds = sanitizeNumberArray(record.weaponIds) || [];
  sanitized.armorIds = sanitizeNumberArray(record.armorIds) || [];
  const ops = sanitizeEffectOpRows(record.ops, definition.effectType, systemData);
  if (ops) sanitized.ops = ops;
  return sanitized;
};

export const getGroupOptions = (effectType: GameEffectType): EffectOption<GameEffectOpGroup>[] =>
  getGameEffectTypeDefinition(effectType).allowedGroups.map((entry) => ({
    value: entry.group,
    label: GROUP_LABELS[entry.group],
  }));

export const getKeyOptions = (
  effectType: GameEffectType,
  group: GameEffectOpGroup,
  systemData?: unknown,
): EffectOption<string>[] => buildKeyOptions(effectType, group, systemData);

export const getOpOptions = (): EffectOption<GameEffectOpKind>[] =>
  OP_OPTIONS.map((option) => ({ ...option }));

export const createDefaultOpRow = (
  effectType: GameEffectType,
  systemData?: unknown,
): EffectOpRow => {
  const [firstGroup] = getGroupOptions(effectType);
  const group = firstGroup?.value || 'extraParams';
  const [firstKey] = getKeyOptions(effectType, group, systemData);
  return {
    group,
    key: firstKey?.value || DEFAULT_KEY_BY_GROUP[group],
    op: 'add',
    value: 0,
  } as EffectOpRow;
};

export const parseOpsToRows = (value: unknown): EffectOpRow[] => {
  if (!Array.isArray(value)) return [];
  const rows: EffectOpRow[] = [];
  for (const row of value) {
    const record = asRecord(row);
    if (!record) return [];
    const group = record.group;
    const key = record.key;
    const op = record.op;
    const opValue = record.value;
    if (
      (group !== 'baseParams'
        && group !== 'extraParams'
        && group !== 'vehicleParams'
        && group !== 'scalar'
        && group !== 'specialParams'
        && group !== 'baseParamRate')
      || typeof key !== 'string'
      || !isEffectOpKind(op)
      || !isFiniteNumber(opValue)
    ) {
      return [];
    }
    rows.push({ group, key, op, value: opValue } as EffectOpRow);
  }
  return rows;
};

export const serializeRowsToOps = (rows: EffectOpRow[]): GameEffectAttributeOp[] =>
  rows.map((row) => ({ ...row } as GameEffectAttributeOp));

export const validateEffectOpRows = (
  effectType: GameEffectType,
  rows: EffectOpRow[],
  systemData?: unknown,
): ValidateGameEffectConfigResult => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { valid: false, message: '至少需要一条属性操作' };
  }
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (
      row?.group !== 'baseParams'
      && row?.group !== 'extraParams'
      && row?.group !== 'vehicleParams'
      && row?.group !== 'scalar'
      && row?.group !== 'specialParams'
      && row?.group !== 'baseParamRate'
    ) {
      return { valid: false, message: `第 ${index + 1} 条操作缺少属性分组` };
    }
    const allowedGroups = getGroupOptions(effectType).map((option) => option.value);
    if (!allowedGroups.includes(row.group)) {
      return { valid: false, message: `当前模板不允许使用分组 ${row.group}` };
    }
    if (typeof row.key !== 'string' || row.key.length === 0) {
      return { valid: false, message: `第 ${index + 1} 条操作缺少属性 key` };
    }
    const keyOptions = getKeyOptions(effectType, row.group, systemData);
    if (!keyOptions.some((option) => option.value === row.key)) {
      return { valid: false, message: `当前模板不允许使用 ${row.group}.${row.key}` };
    }
    if (!isEffectOpKind(row.op)) {
      return { valid: false, message: `第 ${index + 1} 条操作的 op 无效` };
    }
    if (!isFiniteNumber(row.value)) {
      return { valid: false, message: `第 ${index + 1} 条操作的 value 不是合法数字` };
    }
  }
  return { valid: true };
};

export const createGameEffectConfig = (
  effectType: GameEffectType,
  value?: { selector?: unknown; args?: unknown },
  systemData?: unknown,
): GameEffectConfig => {
  const definition = getGameEffectTypeDefinition(effectType);
  const selectorTemplate = cloneJsonValue(definition.selectorTemplate);
  const argsTemplate = cloneJsonValue(definition.argsTemplate);
  const normalizedSelector = sanitizeSelectorRecord(value?.selector, definition.selectorFields);
  const normalizedArgs = sanitizeArgsRecord(value?.args, definition, systemData);
  const selector = {
    ...cloneJsonValue(selectorTemplate),
    ...normalizedSelector,
  } as unknown as GameEffectConfig['selector'];
  const args = {
    ...cloneJsonValue(argsTemplate),
    ...normalizedArgs,
  } as unknown as GameEffectConfig['args'];
  return {
    selector,
    args,
  };
};

export const createGameEffectTemplate = (
  effectType: GameEffectType,
  systemData?: unknown,
): GameEffectEntry => {
  const definition = getGameEffectTypeDefinition(effectType);
  return {
    ...cloneJsonValue(definition.example),
    config: createGameEffectConfig(effectType, undefined, systemData),
  };
};

export const normalizeGameEffectEntry = (
  value: unknown,
  systemData?: unknown,
): GameEffectEntry | null => {
  const record = asRecord(value);
  if (!record) return null;
  const rawEffectType = asGameEffectType(record.effectType);
  if (!rawEffectType || !GAME_EFFECT_TYPE_MAP.has(rawEffectType)) return null;
  const effectType = rawEffectType;
  const definition = getGameEffectTypeDefinition(effectType);
  const template = createGameEffectTemplate(effectType, systemData);
  return {
    id: isFiniteNumber(record.id) ? (record.id | 0) : undefined,
    name: 'name' in record ? asString(record.name) : template.name,
    description: 'description' in record ? (normalizeDescriptionLines(record.description) ?? template.description) : template.description,
    effectType,
    isStatic: definition.allowIsStaticToggle
      ? ('isStatic' in record ? asBoolean(record.isStatic) : template.isStatic)
      : definition.isStatic,
    config: createGameEffectConfig(effectType, {
      selector: asRecord(asRecord(record.config)?.selector) || {},
      args: asRecord(asRecord(record.config)?.args) || {},
    }, systemData),
  };
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
  return {
    item: { ...sourceItem, effects: normalizedEffects } as T & { effects: number[] },
    changed,
  };
};

export const normalizeEffectRegistry = (
  data: unknown,
  systemData?: unknown,
): GameEffectEntry[] => {
  if (!Array.isArray(data)) return [null as unknown as GameEffectEntry];
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
    if (!sanitizeNumberArray((record.selector as Record<string, unknown>)[key])) {
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
    const opRows = sanitizeEffectOpRows((record.args as Record<string, unknown>).ops, effectType, systemData);
    if (!opRows || opRows.length === 0) {
      return {
        valid: false,
        message: 'args.ops 必须是合法的对象数组，且属性分组与 key 必须符合当前模板约束',
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
