import { Alert, Card, Input, InputNumber, Button, Form, Space, Select, Switch } from 'antd';
import type { FormListFieldData } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ToastManager } from '../common/ToastManager';
import { DataLoaderService } from '../../services/DataLoaderService';
import { EventSystem } from '../../core/EventSystem';
import { getEquipTypeOptions, getSystemRecord } from '../../services/EquipDataService';
import { EQUIP_EXTENSIONS_FILE_NAME, getWeaponEquipTypeAtIndex, type EquipExtensionsData } from '../../services/EquipExtensionsService';
import {
  buildEnemySaveData,
  getEnemyReferenceValue,
  hasEnemyEditorChanges,
  normalizeEnemyDataEntry,
  normalizeEnemyEditorValues,
} from '../../services/EnemyPropertyService';
import {
  buildSkillSaveData,
  ACTION_SEQUENCE_TYPE_ITEM,
  ACTION_SEQUENCE_TYPE_NORMAL,
  ACTION_SEQUENCE_TYPE_PROJECTILE,
  ACTION_SEQUENCE_TYPE_SELF,
  ACTION_SEQUENCE_TYPE_THROW_PROJECTILE,
  ACTION_SEQUENCE_TYPE_WEAPON_ACTION,
  DAMAGE_FORMULA_EXPORT_NAME,
  hasSkillEditorChanges,
  hasDamageFormulaExport,
  normalizeSkillDataEntry,
  normalizeSkillEditorValues,
  SKILL_PROJECTILE_TAG_INTERCEPTABLE,
  SKILL_PROJECTILE_TAG_INTERCEPTOR,
  SKILL_PROJECTILE_TAG_NONE,
} from '../../services/SkillPropertyService';
import {
  areBattleOrderEffectsEqual,
  buildBattleOrderEffectsSaveData,
  normalizeBattleOrderEffects,
} from '../../services/BattleOrderEffectsService';
import {
  areStateChargeConfigsEqual,
  buildStateChargeSaveData,
  normalizeStateChargeEditorValues,
  STATE_CHARGE_QUEUE_SCOPE_CURRENT,
  STATE_CHARGE_QUEUE_SCOPE_NEXT,
} from '../../services/StateChargePropertyService';
import {
  arePassiveStatesEqual,
  buildPassiveStatesSaveData,
  normalizePassiveStates,
} from '../../services/PassiveStatePropertyService';
import { buildRequiredOwnerParamsSaveData } from '../../services/OwnerParamsPropertyService';
import { EnemyActionOverridesCard } from './EnemyActionOverridesCard';
import { NotePanel } from './NotePanel';
import {
  EXTRA_PARAM_FIELDS,
  normalizeArmorElementRateFloats,
  normalizeArmorElementRates,
  normalizeEquipUpgradeCosts,
  normalizeEquipmentDataEntry,
  UPGRADE_PARAM_FIELDS,
  VEHICLE_PARAM_FIELDS,
} from '../../services/EquipmentPropertyService';
import {
  OWNER_EXTRA_PARAM_KEYS,
  OWNER_SCALAR_KEYS,
  OWNER_SPECIAL_PARAM_KEYS,
} from '../../types';
import type {
  BattleOrderEffects,
  EnemyBookChallengeStar,
  EnemyWeaknessGroup,
  EquipExtraParamMap,
  EquipUpgradeCostEntry,
  EquipUpgradeParamMap,
  EquipVehicleParamMap,
  OwnerExtraParamMap,
  OwnerParams,
  OwnerScalarMap,
  OwnerSpecialParamMap,
  ParamTemplate,
  RPGEnemy,
  RPGItem,
  SkillCostEntry,
  SkillCostType,
  StateWeaknessEffects,
} from '../../types';
import { normalizeEffectIdList } from '../../services/GameEffectService';
import { arePlainDataEqual } from '../../services/PlainDataCompare';
import { BACKSLASH_REGEXP, PATH_SEPARATOR_REGEXP, TRAILING_PATH_SEPARATORS_REGEXP } from '../../constants/regexp';
import {
  areShapeParamsEqual,
  normalizeCommonRangeValues,
  normalizeWeaponRangeValues,
} from '../../services/RangePropertyService';
import { loadScriptContent } from '../../services/ScriptOperations';

interface CustomAttribute {
  name: string;
  value: number;
  floatValue: number;
}

interface PendingDraftState {
  baseValues?: Record<string, unknown>;
  customFields?: CustomAttribute[];
  effectIds?: number[];
  hasBaseChanges: boolean;
  hasCustomChanges: boolean;
  hasEffectChanges?: boolean;
}

type FixedParamGroupKey = 'extraParams' | 'vehicleParams' | 'upgradeParams';
type OwnerParamGroupKey = 'extraParams' | 'specialParams' | 'scalar';

interface FixedParamFieldDefinition {
  index: number;
  key: string;
  label: string;
}

interface FixedParamColumnLabels {
  value: string;
  floatValue: string;
  upgradeValue: string;
  upgradeFloatValue: string;
}

interface OwnerParamFieldDefinition {
  index: number;
  key: string;
  label: string;
}

interface OwnerParamsFormValues {
  extraParams?: number[];
  specialParams?: number[];
  scalar?: number[];
  elementRate?: number[];
}

interface ParamTemplateInput {
  value?: unknown;
  floatValue?: unknown;
  upgradeValue?: unknown;
  upgradeFloatValue?: unknown;
}

const BASE_ATTRIBUTES: Array<{
  key: string;
  fallbackLabel: string;
}> = [
  { key: 'mhp', fallbackLabel: '最大生命值' },
  { key: 'mmp', fallbackLabel: '最大魔法值' },
  { key: 'atk', fallbackLabel: '攻击力' },
  { key: 'def', fallbackLabel: '防御力' },
  { key: 'mat', fallbackLabel: '魔法攻击力' },
  { key: 'mdf', fallbackLabel: '魔法防御力' },
  { key: 'agi', fallbackLabel: '速度' },
  { key: 'luk', fallbackLabel: '幸运' },
];

const LEGACY_BUSINESS_CUSTOM_PARAM_KEYS = new Set(
  [
    '迎击率', '强化迎击率',
    '回避率', '强化回避率',
    '暴击率', '强化暴击率',
    '暴伤', '强化暴伤',
    '命中率', '强化命中率',
    '最终伤害', '强化最终伤害',
    '重量', '强化重量',
    '承重', '强化承重',
    '载重', '强化载重量',
    '耐久度', '强化耐久度',
    '弹舱', '强化弹舱数',
    '弹药价格',
    '连发',
    '强化次数',
    '强化攻击力',
    '强化防御力',
  ],
);

const UPGRADE_PARAM_DISPLAY_FIELDS: FixedParamFieldDefinition[] = [
  { index: UPGRADE_PARAM_FIELDS[0].index, key: UPGRADE_PARAM_FIELDS[0].key, label: '可强化次数' },
  { index: UPGRADE_PARAM_FIELDS[1].index, key: UPGRADE_PARAM_FIELDS[1].key, label: '攻击力' },
  { index: UPGRADE_PARAM_FIELDS[2].index, key: UPGRADE_PARAM_FIELDS[2].key, label: '防御力' },
];

const DEFAULT_FIXED_PARAM_COLUMN_LABELS: FixedParamColumnLabels = {
  value: '未强化值',
  floatValue: '随机浮动',
  upgradeValue: '每级强化追加',
  upgradeFloatValue: '追加浮动',
};

const UPGRADE_PARAM_COLUMN_LABELS: FixedParamColumnLabels = {
  value: '配置值',
  floatValue: '配置浮动',
  upgradeValue: '每级追加',
  upgradeFloatValue: '追加浮动',
};

const EMPTY_PARAM_TEMPLATE: ParamTemplate = Object.freeze({
  value: 0,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

const OWNER_EXTRA_PARAM_FIELDS: OwnerParamFieldDefinition[] = [
  { index: 0, key: OWNER_EXTRA_PARAM_KEYS[0], label: '命中率' },
  { index: 1, key: OWNER_EXTRA_PARAM_KEYS[1], label: '回避率' },
  { index: 2, key: OWNER_EXTRA_PARAM_KEYS[2], label: '暴击率' },
  { index: 3, key: OWNER_EXTRA_PARAM_KEYS[3], label: '暴击伤害' },
  { index: 4, key: OWNER_EXTRA_PARAM_KEYS[4], label: '迎击率' },
  { index: 5, key: OWNER_EXTRA_PARAM_KEYS[5], label: '最终伤害' },
];

const OWNER_SPECIAL_PARAM_FIELDS: OwnerParamFieldDefinition[] = [
  { index: 0, key: OWNER_SPECIAL_PARAM_KEYS[0], label: '仇恨' },
  { index: 1, key: OWNER_SPECIAL_PARAM_KEYS[1], label: '防御效率' },
  { index: 2, key: OWNER_SPECIAL_PARAM_KEYS[2], label: '恢复效果' },
  { index: 3, key: OWNER_SPECIAL_PARAM_KEYS[3], label: '药效' },
  { index: 4, key: OWNER_SPECIAL_PARAM_KEYS[4], label: '物理伤害' },
  { index: 5, key: OWNER_SPECIAL_PARAM_KEYS[5], label: 'HP 再生率' },
];

const OWNER_SCALAR_FIELDS: OwnerParamFieldDefinition[] = [
  { index: 0, key: OWNER_SCALAR_KEYS[0], label: '经验获取率' },
];

const buildOwnerNumberGroupFormValues = (
  groupValue: number[] | undefined,
  fields: OwnerParamFieldDefinition[],
) => {
  const source = Array.isArray(groupValue) ? groupValue : [];
  return fields.map((field) => toFloatOrZero(source[field.index]));
};

const normalizeOwnerNumberGroupValues = <T extends number[]>(
  value: unknown,
  fields: OwnerParamFieldDefinition[],
): T => {
  const source = Array.isArray(value) ? value : [];
  const result = new Array(fields.length);
  for (let index = 0; index < fields.length; index++) {
    result[index] = toFloatOrZero(source[index]);
  }
  return result as T;
};

const areOwnerNumberGroupsEqual = (
  left: unknown,
  right: number[],
  fields: OwnerParamFieldDefinition[],
) => arePlainDataEqual(normalizeOwnerNumberGroupValues(left, fields), right);

const normalizeOwnerElementRates = (value: unknown, systemData: unknown): number[] => {
  return normalizeArmorElementRates(value, systemData);
};

const buildOwnerParamsFormValues = (
  ownerParams: OwnerParams | undefined,
  systemData: unknown,
  supportsOwnerElementRate: boolean,
) => ({
  extraParams: buildOwnerNumberGroupFormValues(ownerParams?.extraParams, OWNER_EXTRA_PARAM_FIELDS),
  specialParams: buildOwnerNumberGroupFormValues(ownerParams?.specialParams, OWNER_SPECIAL_PARAM_FIELDS),
  scalar: buildOwnerNumberGroupFormValues(ownerParams?.scalar, OWNER_SCALAR_FIELDS),
  ...(supportsOwnerElementRate
    ? { elementRate: normalizeOwnerElementRates(ownerParams?.elementRate, systemData) }
    : {}),
});

const buildOwnerParamsSaveData = (
  extraParams: OwnerExtraParamMap | null,
  specialParams: OwnerSpecialParamMap | null,
  scalar: OwnerScalarMap | null,
  elementRate: number[] | null,
): OwnerParams => buildRequiredOwnerParamsSaveData(extraParams, specialParams, scalar, elementRate);

const toIntOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const toFloatOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const readFormIntField = (
  form: ReturnType<typeof Form.useForm>[0],
  name: string | (string | number)[],
  fallbackValue: number,
) => {
  const currentValue = form.getFieldValue(name);
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return fallbackValue;
  }
  return toIntOrZero(currentValue);
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeParamTemplate = (value: ParamTemplateInput | undefined): ParamTemplate => {
  const record = value ?? {};
  return {
    value: toFloatOrZero(record.value),
    floatValue: toFloatOrZero(record.floatValue),
    upgradeValue: toFloatOrZero(record.upgradeValue),
    upgradeFloatValue: toFloatOrZero(record.upgradeFloatValue),
  };
};

const buildGroupFormValues = (
  groupValue: ParamTemplate[] | undefined,
  fields: FixedParamFieldDefinition[],
) => {
  const source = Array.isArray(groupValue) ? groupValue : [];
  const result: ParamTemplate[] = new Array(fields.length);
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    result[index] = normalizeParamTemplate(source[field.index] as ParamTemplateInput | undefined);
  }
  return result;
};

const normalizeGroupValues = <T extends ParamTemplate[]>(
  value: unknown,
  fields: FixedParamFieldDefinition[],
): T => {
  const source = Array.isArray(value) ? value : [];
  const result: ParamTemplate[] = new Array(fields.length);
  for (let index = 0; index < fields.length; index++) {
    result[index] = normalizeParamTemplate(source[index] as ParamTemplateInput | undefined);
  }
  return result as T;
};

const areParamGroupsEqual = (
  left: unknown,
  right: ParamTemplate[],
  fields: FixedParamFieldDefinition[],
) => arePlainDataEqual(
  normalizeGroupValues(left, fields),
  right,
);

const getDefaultUpgradeSuccessRate = (index: number): number => {
  const nextLevel = Math.max(1, index + 1);
  return Math.min(100, Math.max(0, 100 / nextLevel));
};

const createEmptyUpgradeCostEntry = (index: number): EquipUpgradeCostEntry => ({
  successRate: getDefaultUpgradeSuccessRate(index),
  goldCost: 0,
  requiredItemId: 0,
  requiredItemAmount: 0,
  protectItemId: 0,
  protectItemAmount: 0,
});

const getFloatFieldKey = (key: string) => `${key}_float`;
const EQUIP_TYPE_FIELD_KEY = 'etypeId';
const PRICE_FIELD_KEY = 'price';
const ATTACK_SKILL_FIELD_KEY = 'attackSkillId';
const HIDDEN_ATTACK_SKILL_FIELD_KEY = 'hiddenAttackSkillId';
const ATTACK_ELEMENT_FIELD_KEY = 'attackElementId';
const WEAPON_IMAGE_ID_FIELD_KEY = 'weaponImageId';
const ELEMENT_RATES_FIELD_KEY = 'elementRates';
const ELEMENT_RATE_FLOATS_FIELD_KEY = 'elementRateFloats';
const QUALITY_LOCK_FIELD_KEY = 'qualityLock';
const UPGRADE_COSTS_FIELD_KEY = 'upgradeCosts';
const TARGET_CAMP_FIELD_KEY = 'targetCamp';
const TARGET_LIFE_STATE_FIELD_KEY = 'targetLifeState';
const TARGET_TYPE_FIELD_KEY = 'targetType';
const SELECT_MODE_FIELD_KEY = 'selectMode';
const AREA_MODE_FIELD_KEY = 'areaMode';
const SHAPE_TYPE_FIELD_KEY = 'shapeType';
const AREA_TARGET_COUNT_FIELD_KEY = 'areaTargetCount';
const SHAPE_PARAMS_FIELD_KEY = 'shapeParams';
const REPEAT_TIME_FIELD_KEY = 'repeatTime';
const REPEAT_TIME_FLOAT_FIELD_KEY = 'repeatTimeFloat';
const AREA_OVERRIDE_FIELD_KEY = 'areaOverride';
const ITEMS_FILE_NAME = 'Items.json';
const ACTORS_FILE_NAME = 'Actors.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const ARMORS_FILE_NAME = 'Armors.json';
const SKILLS_FILE_NAME = 'Skills.json';
const PROJECTILES_FILE_NAME = 'Projectiles.json';
const SYSTEM_FILE_NAME = 'System.json';
const TANK_COMPUTER_EQUIP_TYPE_ID = 8;
const TANK_BASE_EQUIP_TYPE_ID = 9;
const EFFECTS_FILE_NAME = 'Effects.json';
const ENEMIES_FILE_NAME = 'Enemies.json';
const STATES_FILE_NAME = 'States.json';
const CLASSES_FILE_NAME = 'Classes.json';
const ANIMATIONS_FILE_NAME = 'Animations.json';
const TROOPS_FILE_NAME = 'Troops.json';
const OWNER_PARAMS_HOST_FILE_NAMES = new Set([
  ACTORS_FILE_NAME.toLowerCase(),
  CLASSES_FILE_NAME.toLowerCase(),
  ENEMIES_FILE_NAME.toLowerCase(),
  STATES_FILE_NAME.toLowerCase(),
  WEAPONS_FILE_NAME.toLowerCase(),
  ARMORS_FILE_NAME.toLowerCase(),
]);
const SKILL_PROJECTILE_ID_FIELD_KEY = 'skillProjectileId';
const SKILL_PROJECTILE_TAG_FIELD_KEY = 'skillProjectileTag';
const SKILL_REACTION_SUCCESS_RATE_FIELD_KEY = 'skillReactionSuccessRate';
const SKILL_REACTION_PRIORITY_FIELD_KEY = 'skillReactionPriority';
const ACTION_SEQUENCE_TYPE_FIELD_KEY = 'actionSequenceType';
const ACTION_SEQUENCE_SCRIPT_KEY_FIELD_KEY = 'actionSequenceScriptKey';
const SKILL_WEAPON_ACTION_FIELD_KEY = 'weaponAction';
const SKILL_LIMITS_FIELD_KEY = 'limits';
const SKILL_NEED_TARGET_SELECT_FIELD_KEY = 'needTargetSelect';
const SKILL_NEED_WEAPON_SELECT_FIELD_KEY = 'needWeaponSelect';
const SKILL_COSTS_FIELD_KEY = 'skillCosts';
const SKILL_EFFECT_SPEC_FIELD_KEY = 'skillEffectSpec';
const ENEMY_CLASS_ID_FIELD_KEY = 'enemyClassId';
const ENEMY_LEVEL_FIELD_KEY = 'enemyLevel';
const ENEMY_LEVEL_SCOPE_FIELD_KEY = 'enemyLevelScope';
const ENEMY_LEVEL_SCOPE_UP_FIELD_KEY = 'enemyLevelScopeUp';
const ENEMY_IS_BOSS_FIELD_KEY = 'enemyIsBoss';
const ENEMY_ALLOW_BREAK_FIELD_KEY = 'enemyAllowBreak';
const ENEMY_CAN_REACTION_FIELD_KEY = 'enemyCanReaction';
const ENEMY_BASE_WEAKNESS_GROUP_FIELD_KEY = 'enemyBaseWeaknessGroup';
const ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY = 'enemyDynamicWeaknessGroups';
const ENEMY_BOUNTY_FIELD_KEY = 'enemyBounty';
const ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY = 'enemyAttackAnimationId';
const ENEMY_REACTION_SKILL_ID_FIELD_KEY = 'enemyReactionSkillId';
const ENEMY_BOOK_CHALLENGE_FIELD_KEY = 'enemyBookChallenge';
const ENEMY_ACTION_OVERRIDES_FIELD_KEY = 'enemyActionOverrides';
const STATE_WEAKNESS_EFFECTS_FIELD_KEY = 'stateWeaknessEffects';
const STATE_CHARGE_CONFIG_FIELD_KEY = 'stateChargeConfig';
const PASSIVE_STATES_FIELD_KEY = 'passiveStates';
const ORDER_EFFECTS_FIELD_KEY = 'orderEffects';
const PASSIVE_STATE_HOST_FILE_NAMES = new Set([
  ACTORS_FILE_NAME.toLowerCase(),
  CLASSES_FILE_NAME.toLowerCase(),
  ENEMIES_FILE_NAME.toLowerCase(),
  WEAPONS_FILE_NAME.toLowerCase(),
  ARMORS_FILE_NAME.toLowerCase(),
]);

const TARGET_CAMP_OPTIONS = [
  { value: 1, label: '1 : 敌方' },
  { value: 2, label: '2 : 我方' },
  { value: 3, label: '3 : 自身' },
  { value: 4, label: '4 : 全阵营' },
];

const TARGET_LIFE_STATE_OPTIONS = [
  { value: 1, label: '1 : 存活' },
  { value: 2, label: '2 : 死亡' },
  { value: 3, label: '3 : 全状态' },
];

const TARGET_TYPE_OPTIONS = [
  { value: 0, label: '0 : 均可' },
  { value: 1, label: '1 : 人' },
  { value: 2, label: '2 : 车' },
];

const SELECT_MODE_OPTIONS = [
  { value: 1, label: '1 : 单体选中' },
  { value: 2, label: '2 : 全体选中' },
];

const AREA_MODE_OPTIONS = [
  { value: 1, label: '1 : 单体' },
  { value: 2, label: '2 : 范围' },
  { value: 3, label: '3 : 贯穿' },
  { value: 4, label: '4 : 全体' },
];

const AREA_SHAPE_TYPE_OPTIONS = [
  { value: 1, label: '1 : 圆形' },
  { value: 2, label: '2 : 扇形' },
];

const AREA_OVERRIDE_OPTIONS = [
  { value: 0, label: '0 : 不覆盖' },
  { value: 1, label: '1 : 覆盖技能范围' },
];

const SKILL_PROJECTILE_TAG_OPTIONS = [
  { value: SKILL_PROJECTILE_TAG_NONE, label: '-1 : 不参与迎击逻辑' },
  { value: SKILL_PROJECTILE_TAG_INTERCEPTOR, label: '0 : 作为迎击技能' },
  { value: SKILL_PROJECTILE_TAG_INTERCEPTABLE, label: '1 : 发射可被迎击的弹道' },
];

const ACTION_SEQUENCE_TYPE_OPTIONS = [
  { value: ACTION_SEQUENCE_TYPE_NORMAL, label: '0 : 通常动作序列' },
  { value: ACTION_SEQUENCE_TYPE_PROJECTILE, label: '1 : 弹道动作序列' },
  { value: ACTION_SEQUENCE_TYPE_THROW_PROJECTILE, label: '2 : 投掷物动作序列' },
  { value: ACTION_SEQUENCE_TYPE_ITEM, label: '3 : 通常物品动作序列' },
  { value: ACTION_SEQUENCE_TYPE_SELF, label: '4 : 技能/物品自身动作序列' },
  { value: ACTION_SEQUENCE_TYPE_WEAPON_ACTION, label: '5 : 武器动作序列' },
];

const SKILL_WEAPON_ACTION_MODE_OPTIONS = [
  { value: 'none', label: '不触发武器' },
  { value: 'selected', label: '选中武器' },
  { value: 'all', label: '全部武器' },
];

const SKILL_COST_TYPE_OPTIONS: Array<{ value: SkillCostType; label: string }> = [
  { value: 'hp', label: '生命值固定值' },
  { value: 'hpRate', label: '生命值百分比' },
  { value: 'gold', label: '金钱固定值' },
  { value: 'goldRate', label: '金钱百分比' },
  { value: 'variable', label: '变量值' },
  { value: 'variableRate', label: '变量百分比' },
  { value: 'item', label: '指定物品' },
  { value: 'weapon', label: '指定武器' },
  { value: 'armor', label: '指定防具' },
];

const SKILL_DAMAGE_TYPE_OPTIONS = [
  { value: 'none', label: '0 : 无伤害' },
  { value: 'hp', label: '1 : 生命伤害' },
  { value: 'heal', label: '2 : 生命恢复' },
];

const SKILL_DAMAGE_FORMULA_MODE_OPTIONS = [
  { value: 'basic', label: '基础通用伤害公式' },
  { value: 'script', label: '当前技能自定义公式脚本' },
];

const SKILL_DURABILITY_CHANGE_MODE_OPTIONS = [
  { value: 'none', label: '0 : 无变化' },
  { value: 'reduce', label: '1 : 降低耐久' },
  { value: 'recover', label: '2 : 恢复耐久' },
];

const areArraysEqual = (left: number[], right: number[]) => {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
};

const supportsOwnerParamsFile = (fileName: string) => OWNER_PARAMS_HOST_FILE_NAMES.has(fileName);
const supportsPassiveStatesFile = (fileName: string) => PASSIVE_STATE_HOST_FILE_NAMES.has(fileName);

const getNextEffectReferenceId = (
  currentIds: number[],
  options: Array<{ value: number; label: string }>,
) => {
  for (const option of options) {
    if (!currentIds.includes(option.value)) {
      return option.value;
    }
  }
  return options[0]?.value ?? null;
};

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '')}/${fileName}`;
};

const getDirectoryPath = (filePath: string) => {
  const normalized = (filePath || '').replace(BACKSLASH_REGEXP, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
};

const areNumberArraysEqual = (left: unknown, right: number[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return right.every((value, index) => toIntOrZero(left[index]) === value);
};

const areFloatArraysEqual = (left: unknown, right: number[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return right.every((value, index) => Math.abs(toFloatOrZero(left[index]) - value) < 1e-8);
};

const getCommonRangeValues = (item: RPGItem) => {
  return normalizeCommonRangeValues(item as unknown as Record<string, unknown>);
};

const getWeaponRangeValues = (item: RPGItem) => {
  return normalizeWeaponRangeValues(item as unknown as Record<string, unknown>);
};

const buildDataOptions = (data: unknown[] | null, emptyLabel: string) => {
  const options = [{ value: 0, label: `0 : ${emptyLabel}` }];
  if (!Array.isArray(data) || data.length < 2) {
    return options;
  }

  for (let index = 1; index < data.length; index++) {
    const item = data[index] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      continue;
    }

    const id = toIntOrZero(item.id ?? index);
    const rawName = typeof item.name === 'string' ? item.name.trim() : '';
    options.push({
      value: id,
      label: `${id} : ${rawName || `未命名 ${id}`}`,
    });
  }

  return options;
};

const getElementOptions = (systemData: unknown) => {
  const systemRecord = getSystemRecord(systemData);
  const rawElements = Array.isArray(systemRecord?.elements) ? systemRecord.elements : [];
  const options = [{ value: 0, label: '0 : 无元素' }];

  for (let index = 1; index < rawElements.length; index++) {
    const rawName = typeof rawElements[index] === 'string' ? rawElements[index].trim() : '';
    options.push({
      value: index,
      label: `${index} : ${rawName || `元素${index}`}`,
    });
  }

  return options;
};

const getVariableOptions = (systemData: unknown) => {
  const systemRecord = getSystemRecord(systemData);
  const rawVariables = Array.isArray(systemRecord?.variables) ? systemRecord.variables : [];
  const options = [{ value: 0, label: '0 : 未选择变量' }];

  for (let index = 1; index < rawVariables.length; index++) {
    const rawName = typeof rawVariables[index] === 'string' ? rawVariables[index].trim() : '';
    options.push({
      value: index,
      label: `${index} : ${rawName || `变量${index}`}`,
    });
  }

  return options;
};

const getBaseAttributeDisplayFields = (systemData: unknown) => {
  const systemRecord = getSystemRecord(systemData);
  const terms = systemRecord?.terms;
  const rawParams = terms && typeof terms === 'object' && !Array.isArray(terms) && Array.isArray((terms as Record<string, unknown>).params)
    ? (terms as Record<string, unknown>).params as unknown[]
    : [];
  return BASE_ATTRIBUTES.map((attribute, index) => {
    const rawLabel = typeof rawParams[index] === 'string' ? rawParams[index].trim() : '';
    const label = rawLabel || attribute.fallbackLabel;
    return {
      key: attribute.key,
      label,
      floatLabel: `${label}波动`,
    };
  });
};

const createEmptySkillCostEntry = (): SkillCostEntry => ({
  type: 'hp',
  value: 0,
  variableId: 0,
  itemId: 0,
  weaponId: 0,
  armorId: 0,
  amount: 1,
});

const getElementRateFieldDefinitions = (systemData: unknown) => {
  const systemRecord = getSystemRecord(systemData);
  const rawElements = Array.isArray(systemRecord?.elements) ? systemRecord.elements : [];
  const fields: Array<{ id: number; label: string }> = [];
  for (let index = 1; index < rawElements.length; index++) {
    const rawName = typeof rawElements[index] === 'string' ? rawElements[index].trim() : '';
    fields.push({
      id: index,
      label: `${index} : ${rawName || `元素${index}`}`,
    });
  }
  return fields;
};

const normalizeEnemyElementRates = (value: unknown, systemData: unknown): number[] => {
  return normalizeArmorElementRates(value, systemData);
};

const createEmptyEnemyChallengeStar = (index = 0): EnemyBookChallengeStar => ({
  star: Math.max(1, index + 1),
  goldCost: 0,
  levelRequirement: 0,
  baseParamRate: 1,
  passiveStates: [],
  dropRateMultiplier: 1,
  goldMultiplier: 1,
  expMultiplier: 1,
  extraRewards: [],
});

const createEmptyEnemyWeaknessGroup = (): EnemyWeaknessGroup => ({
  shieldMax: 0,
  slots: [],
});

const normalizeEnemyWeaknessSlot = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { elementId: 0, rate: 0 };
  }
  const record = value as Record<string, unknown>;
  return {
    elementId: Math.max(0, toIntOrZero(record.elementId)),
    rate: toFloatOrZero(record.rate),
  };
};

const normalizeEnemyWeaknessGroup = (value: unknown): EnemyWeaknessGroup => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyEnemyWeaknessGroup();
  }
  const record = value as Record<string, unknown>;
  const rawSlots = Array.isArray(record.slots) ? record.slots : [];
  const slots = [];
  for (const rawSlot of rawSlots) {
    slots.push(normalizeEnemyWeaknessSlot(rawSlot));
  }
  return {
    shieldMax: Math.max(0, toIntOrZero(record.shieldMax)),
    slots,
  };
};

const normalizeEnemyWeaknessGroupField = (enemy: RPGEnemy): EnemyWeaknessGroup => {
  return normalizeEnemyWeaknessGroup(enemy.baseWeaknessGroup);
};

const normalizeEnemyDynamicWeaknessGroupsField = (enemy: RPGEnemy): EnemyWeaknessGroup[] => {
  const groups = Array.isArray(enemy.dynamicWeaknessGroups) ? enemy.dynamicWeaknessGroups : [];
  const normalizedGroups = [];
  for (const rawGroup of groups) {
    normalizedGroups.push(normalizeEnemyWeaknessGroup(rawGroup));
  }
  return normalizedGroups;
};

const areEnemyWeaknessGroupsEqual = (left: unknown, right: EnemyWeaknessGroup): boolean => {
  return arePlainDataEqual(normalizeEnemyWeaknessGroup(left), normalizeEnemyWeaknessGroup(right));
};

const areEnemyWeaknessGroupListsEqual = (left: unknown, right: EnemyWeaknessGroup[]): boolean => {
  const normalizedLeft = Array.isArray(left) ? left.map(normalizeEnemyWeaknessGroup) : [];
  return arePlainDataEqual(normalizedLeft, right.map(normalizeEnemyWeaknessGroup));
};

const getEnemyWeaknessDuplicateMessages = (groups: EnemyWeaknessGroup[], systemData: unknown): string[] => {
  const fieldMap = new Map<number, string>();
  for (const field of getElementRateFieldDefinitions(systemData)) {
    fieldMap.set(field.id, field.label);
  }

  const messages: string[] = [];
  groups.forEach((group, groupIndex) => {
    const duplicateIds = new Set<number>();
    const seen = new Set<number>();
    for (const rawSlot of group.slots) {
      const slot = normalizeEnemyWeaknessSlot(rawSlot);
      if (slot.elementId <= 0) continue;
      if (seen.has(slot.elementId)) {
        duplicateIds.add(slot.elementId);
      } else {
        seen.add(slot.elementId);
      }
    }
    if (duplicateIds.size <= 0) return;
    const groupLabel = groupIndex === 0 ? '基础弱点组' : `动态弱点组 #${groupIndex}`;
    const elements = Array.from(duplicateIds).map((elementId) => fieldMap.get(elementId) ?? `${elementId} : 元素${elementId}`);
    messages.push(`${groupLabel} 存在重复元素：${elements.join('、')}`);
  });
  return messages;
};

const normalizeNumberIdList = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const result: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < value.length; i++) {
    const id = Math.max(0, toIntOrZero(value[i]));
    if (id <= 0 || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
};

const normalizeStateWeaknessPhaseEffect = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      switchGroupIndex: -1,
      protectElements: [],
      unprotectElements: [],
    };
  }
  const record = value as Record<string, unknown>;
  const switchGroupIndex = toIntOrZero(record.switchGroupIndex);
  return {
    switchGroupIndex: switchGroupIndex >= 0 ? switchGroupIndex : -1,
    protectElements: normalizeNumberIdList(record.protectElements),
    unprotectElements: normalizeNumberIdList(record.unprotectElements),
  };
};

const normalizeStateWeaknessEffects = (value: unknown): StateWeaknessEffects => {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    onAdd: normalizeStateWeaknessPhaseEffect(record.onAdd),
    onRemove: normalizeStateWeaknessPhaseEffect(record.onRemove),
  };
};

const buildStateWeaknessEffectsSaveData = (value: unknown): StateWeaknessEffects | undefined => {
  const normalized = normalizeStateWeaknessEffects(value);
  const buildPhase = (phase: ReturnType<typeof normalizeStateWeaknessPhaseEffect>) => {
    const result: Record<string, unknown> = {};
    if ((phase.switchGroupIndex | 0) >= 0) {
      result.switchGroupIndex = phase.switchGroupIndex | 0;
    }
    if (phase.protectElements.length > 0) {
      result.protectElements = phase.protectElements.slice();
    }
    if (phase.unprotectElements.length > 0) {
      result.unprotectElements = phase.unprotectElements.slice();
    }
    return Object.keys(result).length > 0 ? result : null;
  };
  const onAdd = buildPhase(normalized.onAdd as ReturnType<typeof normalizeStateWeaknessPhaseEffect>);
  const onRemove = buildPhase(normalized.onRemove as ReturnType<typeof normalizeStateWeaknessPhaseEffect>);
  if (onAdd == null && onRemove == null) return undefined;
  return {
    ...(onAdd ? { onAdd } : {}),
    ...(onRemove ? { onRemove } : {}),
  };
};

const areStateWeaknessEffectsEqual = (left: unknown, right: StateWeaknessEffects | undefined): boolean => {
  const normalizedLeft = buildStateWeaknessEffectsSaveData(left);
  return arePlainDataEqual(normalizedLeft ?? null, right ?? null);
};

const buildEffectReferenceOptions = (effectsData: unknown): Array<{ value: number; label: string }> => {
  if (!Array.isArray(effectsData)) {
    return [];
  }
  const options: Array<{ value: number; label: string }> = [];
  for (let index = 1; index < effectsData.length; index++) {
    const entry = effectsData[index] as Record<string, unknown> | null;
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const id = toIntOrZero(entry.id ?? index);
    if (id <= 0) {
      continue;
    }
    const name = typeof entry.name === 'string' && entry.name.trim()
      ? entry.name.trim()
      : `效果${id}`;
    options.push({
      value: id,
      label: `#${id} ${name}`,
    });
  }
  return options;
};

export function PropertyPanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentData = useEditorStore((state) => state.currentData);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const [form] = Form.useForm();
  const [customFields, setCustomFields] = useState<CustomAttribute[]>([]);
  const [hasBaseChanges, setHasBaseChanges] = useState(false);
  const [hasCustomChanges, setHasCustomChanges] = useState(false);
  const [effectIds, setEffectIds] = useState<number[]>([]);
  const [originalEffectIds, setOriginalEffectIds] = useState<number[]>([]);
  const [damageFormulaScriptOptions, setDamageFormulaScriptOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isDamageFormulaScriptOptionsLoading, setIsDamageFormulaScriptOptionsLoading] = useState(false);
  const [damageFormulaScriptWarning, setDamageFormulaScriptWarning] = useState('');
  const [referenceRevision, setReferenceRevision] = useState(0);
  const pendingDraftRef = useRef<PendingDraftState | null>(null);
  const savingRef = useRef(false);
  const currentFileName = currentFilePath.split(PATH_SEPARATOR_REGEXP).pop()?.toLowerCase() || '';
  const isItemFile = currentFileName === ITEMS_FILE_NAME.toLowerCase();
  const isActorFile = currentFileName === ACTORS_FILE_NAME.toLowerCase();
  const isClassFile = currentFileName === CLASSES_FILE_NAME.toLowerCase();
  const isWeaponItem = currentFileName === WEAPONS_FILE_NAME.toLowerCase();
  const isArmorItem = currentFileName === ARMORS_FILE_NAME.toLowerCase();
  const isSkillFile = currentFileName === SKILLS_FILE_NAME.toLowerCase();
  const isEnemyFile = currentFileName === ENEMIES_FILE_NAME.toLowerCase();
  const isStateFile = currentFileName === STATES_FILE_NAME.toLowerCase();
  const supportsFlatBaseAttributes = isActorFile || isEnemyFile || isWeaponItem || isArmorItem;
  const supportsFlatFloatBaseAttributes = isWeaponItem || isArmorItem;
  const supportsProjectileConfig = isSkillFile || isItemFile;
  const projectileConfigSourceName = isItemFile ? '物品' : '技能';
  const supportsTemplateParams = isWeaponItem || isArmorItem;
  const supportsOwnerParams = supportsOwnerParamsFile(currentFileName);
  const supportsOwnerElementRate = supportsOwnerParams && !isWeaponItem && !isArmorItem;
  const supportsPassiveStates = supportsPassiveStatesFile(currentFileName);
  const supportsPrice = isItemFile || isWeaponItem || isArmorItem;
  const supportsCommonRange = isItemFile || isSkillFile;
  const watchedTargetCamp = Form.useWatch(TARGET_CAMP_FIELD_KEY, form) ?? 1;
  const watchedSelectMode = Form.useWatch(SELECT_MODE_FIELD_KEY, form) ?? 1;
  const watchedAreaMode = Form.useWatch(AREA_MODE_FIELD_KEY, form) ?? 1;
  const watchedShapeType = Form.useWatch(SHAPE_TYPE_FIELD_KEY, form) ?? 0;
  const watchedAreaOverride = Form.useWatch(AREA_OVERRIDE_FIELD_KEY, form) ?? 0;
  const watchedSkillProjectileTag = Form.useWatch(SKILL_PROJECTILE_TAG_FIELD_KEY, form) ?? SKILL_PROJECTILE_TAG_NONE;
  const watchedActionSequenceType = Form.useWatch(ACTION_SEQUENCE_TYPE_FIELD_KEY, form) ?? ACTION_SEQUENCE_TYPE_NORMAL;
  const watchedDamageFormulaMode = Form.useWatch([SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'formula', 'mode'], form) ?? 'basic';
  const watchedDamageFormulaScriptKey = Form.useWatch([SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'formula', 'scriptKey'], form) ?? '';
  const watchedEnemyClassId = Form.useWatch(ENEMY_CLASS_ID_FIELD_KEY, form) ?? 0;
  const watchedEnemyAttackAnimationId = Form.useWatch(ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY, form) ?? 0;
  const watchedEnemyCanReaction = Form.useWatch(ENEMY_CAN_REACTION_FIELD_KEY, form) === true;
  const watchedEnemyReactionSkillId = Form.useWatch(ENEMY_REACTION_SKILL_ID_FIELD_KEY, form) ?? 0;
  const watchedEnemyIsBoss = Form.useWatch(ENEMY_IS_BOSS_FIELD_KEY, form) === true;
  const watchedEnemyChallengeTroopId = Form.useWatch([ENEMY_BOOK_CHALLENGE_FIELD_KEY, 'challengeTroopId'], form) ?? 0;
  const watchedEnemyBaseWeaknessGroup = Form.useWatch(ENEMY_BASE_WEAKNESS_GROUP_FIELD_KEY, form);
  const watchedEnemyDynamicWeaknessGroups = Form.useWatch(ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY, form);
  // Reference datasets come from the global cache and should only refresh when the cache revision changes.
  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>(SYSTEM_FILE_NAME),
    [referenceRevision],
  );
  const skillsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(SKILLS_FILE_NAME),
    [referenceRevision],
  );
  const itemsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ITEMS_FILE_NAME),
    [referenceRevision],
  );
  const weaponsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(WEAPONS_FILE_NAME),
    [referenceRevision],
  );
  const armorsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ARMORS_FILE_NAME),
    [referenceRevision],
  );
  const projectilesData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(PROJECTILES_FILE_NAME),
    [referenceRevision],
  );
  const currentArmorEquipTypeId = isArmorItem
    ? toIntOrZero((currentItem as RPGItem | null)?.etypeId)
    : 0;
  const supportsHiddenAttackSkill = isArmorItem
    && (currentArmorEquipTypeId === TANK_COMPUTER_EQUIP_TYPE_ID || currentArmorEquipTypeId === TANK_BASE_EQUIP_TYPE_ID);
  const equipExtensionsData = useMemo(
    () => DataLoaderService.getCachedDataByName<EquipExtensionsData>(EQUIP_EXTENSIONS_FILE_NAME),
    [referenceRevision],
  );
  const effectsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(EFFECTS_FILE_NAME),
    [referenceRevision],
  );
  const statesData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(STATES_FILE_NAME),
    [referenceRevision],
  );
  const classesData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(CLASSES_FILE_NAME),
    [referenceRevision],
  );
  const animationsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ANIMATIONS_FILE_NAME),
    [referenceRevision],
  );
  const troopsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(TROOPS_FILE_NAME),
    [referenceRevision],
  );
  const equipTypeOptions = useMemo(
    () => getEquipTypeOptions(systemData),
    [systemData],
  );
  const skillOptions = useMemo(
    () => buildDataOptions(skillsData, '未选择技能'),
    [skillsData],
  );
  const projectileOptions = useMemo(
    () => buildDataOptions(projectilesData, '未选择弹道'),
    [projectilesData],
  );
  const itemReferenceOptions = useMemo(
    () => buildDataOptions(itemsData, '未选择物品'),
    [itemsData],
  );
  const weaponReferenceOptions = useMemo(
    () => buildDataOptions(weaponsData, '未选择武器'),
    [weaponsData],
  );
  const armorReferenceOptions = useMemo(
    () => buildDataOptions(armorsData, '未选择防具'),
    [armorsData],
  );
  const currentItemScripts = useMemo(() => {
    if (!supportsProjectileConfig || !currentItem || typeof currentItem !== 'object') {
      return {};
    }
    const scripts = (currentItem as RPGItem).scripts;
    return scripts && typeof scripts === 'object' ? scripts : {};
  }, [currentItem, supportsProjectileConfig]);
  const currentActionSequenceScriptOptions = useMemo(
    () => Object.keys(currentItemScripts).map((key) => ({ value: key, label: key })),
    [currentItemScripts],
  );
  const elementOptions = useMemo(
    () => getElementOptions(systemData),
    [systemData],
  );
  const variableOptions = useMemo(
    () => getVariableOptions(systemData),
    [systemData],
  );
  const weaknessElementOptions = useMemo(
    () => elementOptions.filter((option) => option.value > 0),
    [elementOptions],
  );
  const armorElementRateFields = useMemo(
    () => getElementRateFieldDefinitions(systemData),
    [systemData],
  );
  const baseAttributeDisplayFields = useMemo(
    () => getBaseAttributeDisplayFields(systemData),
    [systemData],
  );
  const enemyWeaknessDuplicateMessages = useMemo(
    () => getEnemyWeaknessDuplicateMessages(
      [
        normalizeEnemyWeaknessGroup(watchedEnemyBaseWeaknessGroup),
        ...(Array.isArray(watchedEnemyDynamicWeaknessGroups)
          ? watchedEnemyDynamicWeaknessGroups.map(normalizeEnemyWeaknessGroup)
          : []),
      ],
      systemData,
    ),
    [systemData, watchedEnemyBaseWeaknessGroup, watchedEnemyDynamicWeaknessGroups],
  );
  const effectOptions = useMemo(
    () => buildEffectReferenceOptions(effectsData),
    [effectsData],
  );
  const passiveStateOptions = useMemo(
    () => buildDataOptions(statesData, '未选择状态').filter((option) => option.value > 0),
    [statesData],
  );
  useEffect(() => {
    let active = true;

    const applyDamageFormulaScriptState = (
      options: Array<{ value: string; label: string }>,
      warning: string,
    ) => {
      if (!active) return;
      setDamageFormulaScriptOptions(options);
      setDamageFormulaScriptWarning(warning);
      setIsDamageFormulaScriptOptionsLoading(false);
    };

    const refreshDamageFormulaScriptOptions = async () => {
      if (!supportsProjectileConfig || watchedDamageFormulaMode !== 'script') {
        setIsDamageFormulaScriptOptionsLoading(false);
        setDamageFormulaScriptWarning('');
        setDamageFormulaScriptOptions([]);
        return;
      }

      setIsDamageFormulaScriptOptionsLoading(true);
      setDamageFormulaScriptWarning('');
      const scriptEntries = Object.entries(currentItemScripts);
      if (scriptEntries.length === 0) {
        applyDamageFormulaScriptState(
          watchedDamageFormulaScriptKey
            ? [{ value: watchedDamageFormulaScriptKey, label: `${watchedDamageFormulaScriptKey}（当前选择，未通过校验）` }]
            : [],
          watchedDamageFormulaScriptKey
            ? `当前${projectileConfigSourceName}没有可导出 \`${DAMAGE_FORMULA_EXPORT_NAME}\` 的脚本，当前选择的脚本键「${watchedDamageFormulaScriptKey}」也未通过校验。请先补齐脚本导出，或改回“基础通用伤害公式”。`
            : `当前${projectileConfigSourceName}没有可导出 \`${DAMAGE_FORMULA_EXPORT_NAME}\` 的脚本。请先补齐脚本导出，或改回“基础通用伤害公式”。`,
        );
        return;
      }

      const resolvedOptions = await Promise.all(scriptEntries.map(async ([scriptKey, storedPath]) => {
        try {
          const content = await loadScriptContent(storedPath, { bypassCache: true });
          if (!hasDamageFormulaExport(content)) {
            return null;
          }
          return { value: scriptKey, label: scriptKey };
        } catch {
          return null;
        }
      }));

      if (!active) return;

      const options = resolvedOptions.filter((option): option is { value: string; label: string } => !!option);
      let warning = '';
      if (watchedDamageFormulaScriptKey && !options.some((option) => option.value === watchedDamageFormulaScriptKey)) {
        options.push({
          value: watchedDamageFormulaScriptKey,
          label: `${watchedDamageFormulaScriptKey}（当前选择，未通过校验）`,
        });
        warning = `当前选中的公式脚本键「${watchedDamageFormulaScriptKey}」没有导出 \`${DAMAGE_FORMULA_EXPORT_NAME}\`。请重新选择有效脚本，或改回“基础通用伤害公式”。`;
      } else if (options.length === 0) {
        warning = `当前${projectileConfigSourceName}没有可导出 \`${DAMAGE_FORMULA_EXPORT_NAME}\` 的脚本。请先补齐脚本导出，或改回“基础通用伤害公式”。`;
      }
      applyDamageFormulaScriptState(options, warning);
    };

    void refreshDamageFormulaScriptOptions();
    return () => {
      active = false;
    };
  }, [currentItemScripts, projectileConfigSourceName, supportsProjectileConfig, watchedDamageFormulaMode, watchedDamageFormulaScriptKey]);
  const enemyClassOptions = useMemo(
    () => getEnemyReferenceValue(classesData, '未选择职业', watchedEnemyClassId, '职业'),
    [classesData, watchedEnemyClassId],
  );
  const enemyAnimationOptions = useMemo(
    () => getEnemyReferenceValue(animationsData, '未选择动画', watchedEnemyAttackAnimationId, '动画'),
    [animationsData, watchedEnemyAttackAnimationId],
  );
  const enemyReactionSkillOptions = useMemo(
    () => getEnemyReferenceValue(skillsData, '未选择迎击技能', watchedEnemyReactionSkillId, '技能'),
    [skillsData, watchedEnemyReactionSkillId],
  );
  const enemyChallengeTroopOptions = useMemo(
    () => getEnemyReferenceValue(troopsData, '未选择挑战敌群', watchedEnemyChallengeTroopId, '敌群'),
    [troopsData, watchedEnemyChallengeTroopId],
  );
  const equipExtensionsFilePath = useMemo(() => {
    return DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME)
      || joinPath(getDirectoryPath(currentFilePath), EQUIP_EXTENSIONS_FILE_NAME);
  }, [currentFilePath, referenceRevision]);
  const normalizedEffectIds = useMemo(
    () => normalizeEffectIdList(effectIds),
    [effectIds],
  );
  const hasEffectChanges = useMemo(
    () => !areArraysEqual(normalizedEffectIds, originalEffectIds),
    [normalizedEffectIds, originalEffectIds],
  );

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || [
        EQUIP_EXTENSIONS_FILE_NAME.toLowerCase(),
        SYSTEM_FILE_NAME.toLowerCase(),
        SKILLS_FILE_NAME.toLowerCase(),
        ITEMS_FILE_NAME.toLowerCase(),
        WEAPONS_FILE_NAME.toLowerCase(),
        ARMORS_FILE_NAME.toLowerCase(),
        PROJECTILES_FILE_NAME.toLowerCase(),
        EFFECTS_FILE_NAME.toLowerCase(),
        CLASSES_FILE_NAME.toLowerCase(),
        ANIMATIONS_FILE_NAME.toLowerCase(),
      ].includes(fileName)) {
        setReferenceRevision((value) => value + 1);
      }
    };

    EventSystem.on('data:file-loaded', refreshReferences);
    EventSystem.on('data:manifest-loaded', refreshReferences);

    return () => {
      EventSystem.off('data:file-loaded', refreshReferences);
      EventSystem.off('data:manifest-loaded', refreshReferences);
    };
  }, []);

  useEffect(() => {
    if (!isWeaponItem || !currentFilePath) {
      return;
    }

    const dataPath = getDirectoryPath(currentFilePath);
    void DataLoaderService.ensureEquipExtensionsLoaded(dataPath, { force: true }).then((loaded) => {
      if (loaded) {
        setReferenceRevision((value) => value + 1);
      }
    });
  }, [currentFilePath, isWeaponItem]);

  useEffect(() => {
    if (currentItem) {
      const item = currentItem as RPGItem;
      const baseFormValues: Record<string, unknown> = {};
      if (supportsFlatBaseAttributes) {
        for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
          const attr = BASE_ATTRIBUTES[i];
          baseFormValues[attr.key] = item.params?.[i] ?? 0;
          if (supportsFlatFloatBaseAttributes) {
            baseFormValues[getFloatFieldKey(attr.key)] = item.floatParams?.[i] ?? 0;
          }
        }
      }
      if (supportsPrice) {
        baseFormValues[PRICE_FIELD_KEY] = toIntOrZero(item.price);
      }
      if (isWeaponItem) {
        baseFormValues[EQUIP_TYPE_FIELD_KEY] = getWeaponEquipTypeAtIndex(equipExtensionsData, currentItemIndex);
        baseFormValues[ATTACK_SKILL_FIELD_KEY] = toIntOrZero(item.attackSkillId);
        baseFormValues[ATTACK_ELEMENT_FIELD_KEY] = toIntOrZero(item.attackElementId);
        baseFormValues[WEAPON_IMAGE_ID_FIELD_KEY] = Math.max(1, toIntOrZero(item.weaponImageId || 1));
        Object.assign(baseFormValues, getWeaponRangeValues(item));
      }
      if (isArmorItem) {
        baseFormValues[ELEMENT_RATES_FIELD_KEY] = normalizeArmorElementRates(item.elementRates, systemData);
        baseFormValues[ELEMENT_RATE_FLOATS_FIELD_KEY] = normalizeArmorElementRateFloats(item.elementRateFloats, systemData);
        if (supportsHiddenAttackSkill) {
          baseFormValues[HIDDEN_ATTACK_SKILL_FIELD_KEY] = toIntOrZero(item.hiddenAttackSkillId);
        }
      }
      if (isWeaponItem || isArmorItem) {
        baseFormValues[QUALITY_LOCK_FIELD_KEY] = item.qualityLock === true;
      }
      if (supportsCommonRange) {
        Object.assign(baseFormValues, getCommonRangeValues(item));
        baseFormValues[ORDER_EFFECTS_FIELD_KEY] = normalizeBattleOrderEffects(item.orderEffects);
      }
      if (supportsProjectileConfig) {
        const skillValues = normalizeSkillEditorValues(item, { isItem: isItemFile });
        baseFormValues[SKILL_PROJECTILE_ID_FIELD_KEY] = skillValues.projectileId;
        baseFormValues[SKILL_PROJECTILE_TAG_FIELD_KEY] = skillValues.skillProjectileTag;
        baseFormValues[SKILL_REACTION_SUCCESS_RATE_FIELD_KEY] = skillValues.reactionSuccessRate;
        baseFormValues[SKILL_REACTION_PRIORITY_FIELD_KEY] = skillValues.reactionPriority;
        baseFormValues[ACTION_SEQUENCE_TYPE_FIELD_KEY] = skillValues.actionSequenceType;
        baseFormValues[ACTION_SEQUENCE_SCRIPT_KEY_FIELD_KEY] = skillValues.actionSequenceScriptKey;
        baseFormValues[TARGET_TYPE_FIELD_KEY] = skillValues.targetType;
        baseFormValues[SKILL_EFFECT_SPEC_FIELD_KEY] = skillValues.skillEffectSpec;
        if (isSkillFile) {
          baseFormValues[SKILL_LIMITS_FIELD_KEY] = skillValues.limits;
          baseFormValues[SKILL_NEED_TARGET_SELECT_FIELD_KEY] = skillValues.needTargetSelect;
          baseFormValues[SKILL_NEED_WEAPON_SELECT_FIELD_KEY] = skillValues.needWeaponSelect;
          baseFormValues[SKILL_WEAPON_ACTION_FIELD_KEY] = skillValues.weaponAction;
          baseFormValues[SKILL_COSTS_FIELD_KEY] = skillValues.skillCosts;
        }
      }
      if (isStateFile) {
        baseFormValues[STATE_WEAKNESS_EFFECTS_FIELD_KEY] = normalizeStateWeaknessEffects(item.weaknessStateEffects);
        baseFormValues[STATE_CHARGE_CONFIG_FIELD_KEY] = normalizeStateChargeEditorValues(item.chargeConfig);
      }
      if (isEnemyFile) {
        const enemyValues = normalizeEnemyEditorValues(item as RPGEnemy, skillsData);
        baseFormValues[ENEMY_BASE_WEAKNESS_GROUP_FIELD_KEY] = normalizeEnemyWeaknessGroupField(item as RPGEnemy);
        baseFormValues[ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY] = normalizeEnemyDynamicWeaknessGroupsField(item as RPGEnemy);
        baseFormValues[ENEMY_CLASS_ID_FIELD_KEY] = enemyValues.classId;
        baseFormValues[ENEMY_LEVEL_FIELD_KEY] = enemyValues.level;
        baseFormValues[ENEMY_LEVEL_SCOPE_FIELD_KEY] = enemyValues.levelScope;
        baseFormValues[ENEMY_LEVEL_SCOPE_UP_FIELD_KEY] = enemyValues.levelScopeUp;
        baseFormValues[ENEMY_IS_BOSS_FIELD_KEY] = enemyValues.isBoss;
        baseFormValues[ENEMY_ALLOW_BREAK_FIELD_KEY] = enemyValues.allowBreak;
        baseFormValues[ENEMY_CAN_REACTION_FIELD_KEY] = enemyValues.canReaction;
        baseFormValues[ENEMY_BOUNTY_FIELD_KEY] = enemyValues.bounty;
        baseFormValues[ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY] = enemyValues.attackAnimationId;
        baseFormValues[ENEMY_REACTION_SKILL_ID_FIELD_KEY] = enemyValues.reactionSkillId;
        baseFormValues[ENEMY_BOOK_CHALLENGE_FIELD_KEY] = enemyValues.bookChallenge;
        baseFormValues[ENEMY_ACTION_OVERRIDES_FIELD_KEY] = enemyValues.actionOverrides;
      }
      if (supportsOwnerParams) {
        baseFormValues.ownerParams = buildOwnerParamsFormValues(item.ownerParams, systemData, supportsOwnerElementRate);
      }
      if (supportsPassiveStates) {
        baseFormValues[PASSIVE_STATES_FIELD_KEY] = normalizePassiveStates(item.passiveStates);
      }

      const custom: CustomAttribute[] = [];
      const customParams = item.customParams || {};
      Object.entries(customParams).forEach(([name, data]) => {
        if (LEGACY_BUSINESS_CUSTOM_PARAM_KEYS.has(name)) {
          return;
        }
        if (typeof data === 'object' && data !== null) {
          const d = data as any;
          custom.push({
            name,
            value: d.value || 0,
            floatValue: d.floatValue || 0,
          });
        } else {
          // 兼容旧格式
          custom.push({
            name,
            value: data as number || 0,
            floatValue: 0,
          });
        }
      });

      const pendingDraft = pendingDraftRef.current;
      const nextBaseValues: Record<string, unknown> = pendingDraft?.baseValues
        ? { ...baseFormValues, ...pendingDraft.baseValues }
        : {
            ...baseFormValues,
            ...(supportsTemplateParams ? {
              extraParams: buildGroupFormValues(item.extraParams, EXTRA_PARAM_FIELDS),
              vehicleParams: buildGroupFormValues(item.vehicleParams, VEHICLE_PARAM_FIELDS),
              upgradeParams: buildGroupFormValues(item.upgradeParams, UPGRADE_PARAM_FIELDS),
              [UPGRADE_COSTS_FIELD_KEY]: normalizeEquipUpgradeCosts(item.upgradeCosts),
            } : {}),
          };
      if (supportsTemplateParams && !pendingDraft?.baseValues) {
        nextBaseValues.extraParams = buildGroupFormValues(item.extraParams, EXTRA_PARAM_FIELDS);
        nextBaseValues.vehicleParams = buildGroupFormValues(item.vehicleParams, VEHICLE_PARAM_FIELDS);
        nextBaseValues.upgradeParams = buildGroupFormValues(item.upgradeParams, UPGRADE_PARAM_FIELDS);
        nextBaseValues[UPGRADE_COSTS_FIELD_KEY] = normalizeEquipUpgradeCosts(item.upgradeCosts);
      }
      if (supportsOwnerParams && !pendingDraft?.baseValues) {
        nextBaseValues.ownerParams = buildOwnerParamsFormValues(item.ownerParams, systemData, supportsOwnerElementRate);
      }
      if (supportsPassiveStates && !pendingDraft?.baseValues) {
        nextBaseValues[PASSIVE_STATES_FIELD_KEY] = normalizePassiveStates(item.passiveStates);
      }
      const nextCustomFields = pendingDraft?.customFields ?? custom;
      const savedEffectIds = normalizeEffectIdList(item.effects);
      const nextEffectIds = pendingDraft?.effectIds ?? savedEffectIds;

      if (savingRef.current) {
        savingRef.current = false;
      } else {
        form.setFieldsValue(nextBaseValues);
      }
      setCustomFields(nextCustomFields);
      setEffectIds(nextEffectIds);
      setOriginalEffectIds(savedEffectIds);
      setHasBaseChanges(pendingDraft?.hasBaseChanges ?? false);
      setHasCustomChanges(pendingDraft?.hasCustomChanges ?? false);
      pendingDraftRef.current = null;
    }
  }, [currentItem, currentItemIndex, equipExtensionsData, form, isArmorItem, isEnemyFile, isStateFile, isWeaponItem, skillsData, supportsCommonRange, supportsFlatBaseAttributes, supportsFlatFloatBaseAttributes, supportsHiddenAttackSkill, supportsOwnerElementRate, supportsOwnerParams, supportsPrice, supportsTemplateParams, systemData]);

  useEffect(() => {
    if (!supportsCommonRange) {
      return;
    }
    const nextValues: Record<string, number> = {};
    const currentTargetCamp = readFormIntField(form, TARGET_CAMP_FIELD_KEY, watchedTargetCamp);
    const currentSelectMode = readFormIntField(form, SELECT_MODE_FIELD_KEY, watchedSelectMode);
    const currentAreaMode = readFormIntField(form, AREA_MODE_FIELD_KEY, watchedAreaMode);
    const currentShapeType = readFormIntField(form, SHAPE_TYPE_FIELD_KEY, watchedShapeType);
    const currentAreaTargetCount = readFormIntField(form, AREA_TARGET_COUNT_FIELD_KEY, 0);
    let nextAreaMode = currentAreaMode;
    if (currentTargetCamp === 3) {
      if ((form.getFieldValue(TARGET_LIFE_STATE_FIELD_KEY) ?? 1) !== 1) nextValues[TARGET_LIFE_STATE_FIELD_KEY] = 1;
      if (currentSelectMode !== 1) nextValues[SELECT_MODE_FIELD_KEY] = 1;
      nextAreaMode = 1;
    } else if (currentTargetCamp === 4) {
      if (currentSelectMode !== 2) nextValues[SELECT_MODE_FIELD_KEY] = 2;
      nextAreaMode = 4;
    } else if (currentSelectMode === 2) {
      nextAreaMode = 4;
    }
    if (currentAreaMode !== nextAreaMode) nextValues[AREA_MODE_FIELD_KEY] = nextAreaMode;
    if (nextAreaMode === 1 || nextAreaMode === 4) {
      if (currentShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if (currentAreaTargetCount !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (nextAreaMode === 3) {
      if (currentShapeType !== 3) nextValues[SHAPE_TYPE_FIELD_KEY] = 3;
      if (currentAreaTargetCount !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else {
      if (currentShapeType !== 1 && currentShapeType !== 2) nextValues[SHAPE_TYPE_FIELD_KEY] = 1;
      if (currentAreaTargetCount < 1) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 1;
    }
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [supportsCommonRange, watchedTargetCamp, watchedSelectMode, watchedAreaMode, watchedShapeType, form]);

  useEffect(() => {
    if (!isWeaponItem) {
      return;
    }
    const nextValues: Record<string, number> = {};
    const currentAreaOverride = readFormIntField(form, AREA_OVERRIDE_FIELD_KEY, watchedAreaOverride);
    const currentAreaMode = readFormIntField(form, AREA_MODE_FIELD_KEY, watchedAreaMode);
    const currentShapeType = readFormIntField(form, SHAPE_TYPE_FIELD_KEY, watchedShapeType);
    const currentAreaTargetCount = readFormIntField(form, AREA_TARGET_COUNT_FIELD_KEY, 0);
    if (currentAreaOverride !== 1) {
      if (currentAreaMode !== 1) nextValues[AREA_MODE_FIELD_KEY] = 1;
      if (currentShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if (currentAreaTargetCount !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (currentAreaMode === 1 || currentAreaMode === 4) {
      if (currentShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if (currentAreaTargetCount !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (currentAreaMode === 3) {
      if (currentShapeType !== 3) nextValues[SHAPE_TYPE_FIELD_KEY] = 3;
      if (currentAreaTargetCount !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else {
      if (currentShapeType !== 1 && currentShapeType !== 2) nextValues[SHAPE_TYPE_FIELD_KEY] = 1;
      if (currentAreaTargetCount < 1) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 1;
    }
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [isWeaponItem, watchedAreaOverride, watchedAreaMode, watchedShapeType, form]);

  const handleValuesChange = () => {
    setHasBaseChanges(true);
  };

  const buildCustomParams = (): Record<string, { value: number; floatValue: number }> => {
    const customParams: Record<string, { value: number; floatValue: number }> = {};
    customFields.forEach(({ name, value, floatValue }) => {
      if (name && !LEGACY_BUSINESS_CUSTOM_PARAM_KEYS.has(name)) {
        customParams[name] = { value, floatValue };
      }
    });
    return customParams;
  };

  const updateCurrentItem = (updatedItem: RPGItem | RPGEnemy | Record<string, unknown>) => {
    if (!currentData || currentItemIndex < 0) return;
    const newData = [...currentData];
    newData[currentItemIndex] = updatedItem as any;

    loadData(newData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
  };

  useEffect(() => {
    if (!currentData || currentItemIndex < 0) {
      return;
    }
    const sourceItem = currentData[currentItemIndex] as RPGItem | RPGEnemy | null;
    if (!sourceItem) {
      return;
    }

    const normalized = isSkillFile
      ? normalizeSkillDataEntry(sourceItem)
      : isEnemyFile
        ? normalizeEnemyDataEntry(sourceItem as RPGEnemy, skillsData)
        : null;

    if (!normalized) return;
    if (arePlainDataEqual(normalized, sourceItem)) return;
    updateCurrentItem(normalized);
  }, [currentData, currentItemIndex, isEnemyFile, isSkillFile, currentItem, currentFilePath, skillsData]);

  useEffect(() => {
    if ((!isWeaponItem && !isArmorItem) || !currentData || currentItemIndex < 0) {
      return;
    }
    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) {
      return;
    }
    const normalized = normalizeEquipmentDataEntry(sourceItem, {
      isWeapon: isWeaponItem,
      isArmor: isArmorItem,
      systemData,
    });
    if (!normalized) return;
    if (arePlainDataEqual(normalized, sourceItem)) return;
    updateCurrentItem(normalized);
  }, [currentData, currentItemIndex, isArmorItem, isWeaponItem, currentItem, currentFilePath, systemData]);

  const handleSaveEffects = (silent = false) => {
    if (!currentData || currentItemIndex < 0) return;
    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) return;
    if (!hasEffectChanges) {
      if (!silent) {
        ToastManager.info('效果引用没有变化');
      }
      return;
    }
    pendingDraftRef.current = (hasBaseChanges || hasCustomChanges)
      ? {
          baseValues: hasBaseChanges ? form.getFieldsValue() : undefined,
          customFields: hasCustomChanges ? customFields.map((field) => ({ ...field })) : undefined,
          hasBaseChanges,
          hasCustomChanges,
        }
      : null;
    savingRef.current = true;
    updateCurrentItem({
      ...sourceItem,
      effects: normalizedEffectIds,
    });
    setOriginalEffectIds(normalizedEffectIds);
    if (!silent) {
      ToastManager.success('效果引用已保存');
    }
  };

  const updateWeaponEquipType = (typeId: number): boolean => {
    if (!isWeaponItem || currentItemIndex <= 0 || !equipExtensionsFilePath || !equipExtensionsData) {
      return false;
    }

    const currentTypeId = getWeaponEquipTypeAtIndex(equipExtensionsData, currentItemIndex);
    if (currentTypeId === typeId) {
      return false;
    }

    const nextWeaponEquipTypes = [...equipExtensionsData.weaponEquipTypes];
    nextWeaponEquipTypes[currentItemIndex] = typeId;
    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      weaponEquipTypes: nextWeaponEquipTypes,
    };

    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    markItemDirty(equipExtensionsFilePath, currentItemIndex);
    setReferenceRevision((value) => value + 1);
    return true;
  };

  const handleSaveBaseAttributes = (silent = false) => {
    if (!currentData || currentItemIndex < 0) return;

    const values = form.getFieldsValue(true) as Record<string, unknown>;
    const newParams: number[] = [];
    const newFloatParams: number[] = [];
    for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
      const attr = BASE_ATTRIBUTES[i];
      newParams[i] = toIntOrZero(values[attr.key]);
      newFloatParams[i] = supportsFlatFloatBaseAttributes
        ? toFloatOrZero(values[getFloatFieldKey(attr.key)])
        : 0;
    }
    const nextPrice = supportsPrice ? toIntOrZero(values[PRICE_FIELD_KEY]) : 0;
    const nextAttackSkillId = isWeaponItem ? toIntOrZero(values[ATTACK_SKILL_FIELD_KEY]) : 0;
    const nextHiddenAttackSkillId = supportsHiddenAttackSkill ? toIntOrZero(values[HIDDEN_ATTACK_SKILL_FIELD_KEY]) : 0;
    const nextAttackElementId = isWeaponItem ? toIntOrZero(values[ATTACK_ELEMENT_FIELD_KEY]) : 0;
    const nextWeaponImageId = isWeaponItem ? Math.max(1, toIntOrZero(values[WEAPON_IMAGE_ID_FIELD_KEY] ?? 1)) : 0;
    const nextArmorElementRates = isArmorItem
      ? normalizeArmorElementRates(values[ELEMENT_RATES_FIELD_KEY], systemData)
      : null;
    const nextElementRateFloats = isArmorItem
      ? normalizeArmorElementRateFloats(values[ELEMENT_RATE_FLOATS_FIELD_KEY], systemData)
      : null;
    const nextEnemyBaseWeaknessGroup = isEnemyFile
      ? normalizeEnemyWeaknessGroup(values[ENEMY_BASE_WEAKNESS_GROUP_FIELD_KEY])
      : null;
    const nextEnemyDynamicWeaknessGroups = isEnemyFile
      ? (Array.isArray(values[ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY])
        ? values[ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY].map(normalizeEnemyWeaknessGroup)
        : [])
      : null;
    const nextStateWeaknessEffects = isStateFile
      ? buildStateWeaknessEffectsSaveData(values[STATE_WEAKNESS_EFFECTS_FIELD_KEY])
      : null;
    const nextStateChargeConfig = isStateFile
      ? buildStateChargeSaveData(values[STATE_CHARGE_CONFIG_FIELD_KEY])
      : null;
    const nextQualityLock = (isWeaponItem || isArmorItem)
      ? values[QUALITY_LOCK_FIELD_KEY] === true
      : false;
    const nextSkillValues = supportsProjectileConfig
      ? {
          projectileId: values[SKILL_PROJECTILE_ID_FIELD_KEY],
          skillProjectileTag: values[SKILL_PROJECTILE_TAG_FIELD_KEY],
          reactionSuccessRate: values[SKILL_REACTION_SUCCESS_RATE_FIELD_KEY],
          reactionPriority: values[SKILL_REACTION_PRIORITY_FIELD_KEY],
          actionSequenceType: values[ACTION_SEQUENCE_TYPE_FIELD_KEY],
          actionSequenceScriptKey: values[ACTION_SEQUENCE_SCRIPT_KEY_FIELD_KEY],
          targetType: values[TARGET_TYPE_FIELD_KEY],
          targetCamp: values[TARGET_CAMP_FIELD_KEY],
          targetLifeState: values[TARGET_LIFE_STATE_FIELD_KEY],
          selectMode: values[SELECT_MODE_FIELD_KEY],
          areaMode: values[AREA_MODE_FIELD_KEY],
          limits: isSkillFile ? values[SKILL_LIMITS_FIELD_KEY] : undefined,
          needTargetSelect: isSkillFile ? values[SKILL_NEED_TARGET_SELECT_FIELD_KEY] : undefined,
          needWeaponSelect: isSkillFile ? values[SKILL_NEED_WEAPON_SELECT_FIELD_KEY] : undefined,
          weaponAction: isSkillFile ? values[SKILL_WEAPON_ACTION_FIELD_KEY] : undefined,
          skillCosts: isSkillFile ? values[SKILL_COSTS_FIELD_KEY] : undefined,
          skillEffectSpec: values[SKILL_EFFECT_SPEC_FIELD_KEY],
        }
      : null;
    const nextEnemyValues = isEnemyFile
      ? {
          classId: values[ENEMY_CLASS_ID_FIELD_KEY],
          level: values[ENEMY_LEVEL_FIELD_KEY],
          levelScope: values[ENEMY_LEVEL_SCOPE_FIELD_KEY],
          levelScopeUp: values[ENEMY_LEVEL_SCOPE_UP_FIELD_KEY],
          isBoss: values[ENEMY_IS_BOSS_FIELD_KEY],
          allowBreak: values[ENEMY_ALLOW_BREAK_FIELD_KEY],
          canReaction: values[ENEMY_CAN_REACTION_FIELD_KEY],
          bounty: values[ENEMY_BOUNTY_FIELD_KEY],
          attackAnimationId: values[ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY],
          reactionSkillId: values[ENEMY_REACTION_SKILL_ID_FIELD_KEY],
          bookChallenge: values[ENEMY_BOOK_CHALLENGE_FIELD_KEY],
          actionOverrides: values[ENEMY_ACTION_OVERRIDES_FIELD_KEY],
        }
      : null;
    const nextCommonRangeValues = supportsCommonRange ? normalizeCommonRangeValues(values) : null;
    const nextOrderEffects = supportsCommonRange
      ? buildBattleOrderEffectsSaveData(values[ORDER_EFFECTS_FIELD_KEY])
      : null;
    const nextWeaponRangeValues = isWeaponItem ? normalizeWeaponRangeValues(values) : null;
    const ownerValues = (values.ownerParams as OwnerParamsFormValues | undefined) ?? {};
    const nextPassiveStates = supportsPassiveStates
      ? buildPassiveStatesSaveData(values[PASSIVE_STATES_FIELD_KEY])
      : [];
    const nextExtraParams = supportsTemplateParams
      ? normalizeGroupValues<EquipExtraParamMap>(values.extraParams, EXTRA_PARAM_FIELDS)
      : null;
    const nextVehicleParams = supportsTemplateParams
      ? normalizeGroupValues<EquipVehicleParamMap>(values.vehicleParams, VEHICLE_PARAM_FIELDS)
      : null;
    const nextUpgradeParams = supportsTemplateParams
      ? normalizeGroupValues<EquipUpgradeParamMap>(values.upgradeParams, UPGRADE_PARAM_FIELDS)
      : null;
    const nextUpgradeCosts = supportsTemplateParams
      ? normalizeEquipUpgradeCosts(values[UPGRADE_COSTS_FIELD_KEY])
      : null;
    const nextOwnerExtraParams = supportsOwnerParams
      ? normalizeOwnerNumberGroupValues<OwnerExtraParamMap>(ownerValues.extraParams, OWNER_EXTRA_PARAM_FIELDS)
      : null;
    const nextOwnerSpecialParams = supportsOwnerParams
      ? normalizeOwnerNumberGroupValues<OwnerSpecialParamMap>(ownerValues.specialParams, OWNER_SPECIAL_PARAM_FIELDS)
      : null;
    const nextOwnerScalar = supportsOwnerParams
      ? normalizeOwnerNumberGroupValues<OwnerScalarMap>(ownerValues.scalar, OWNER_SCALAR_FIELDS)
      : null;
    const nextOwnerElementRate = supportsOwnerElementRate
      ? normalizeOwnerElementRates(ownerValues.elementRate, systemData)
      : null;
    const nextOwnerParams = supportsOwnerParams
      ? buildOwnerParamsSaveData(
        nextOwnerExtraParams,
        nextOwnerSpecialParams,
        nextOwnerScalar,
        nextOwnerElementRate,
      )
      : undefined;

    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) return;
    if (isEnemyFile && enemyWeaknessDuplicateMessages.length > 0) {
      ToastManager.error('弱点组存在重复元素，请先处理后再保存');
      return;
    }

    const currentCommonRangeValues = supportsCommonRange ? getCommonRangeValues(sourceItem) : null;
    const currentWeaponRangeValues = isWeaponItem ? getWeaponRangeValues(sourceItem) : null;

    const shouldUpdateItem = (supportsFlatBaseAttributes && !areNumberArraysEqual(sourceItem.params, newParams))
      || (supportsFlatFloatBaseAttributes && !areNumberArraysEqual(sourceItem.floatParams, newFloatParams))
      || (supportsPrice && toIntOrZero(sourceItem.price) !== nextPrice)
      || (isWeaponItem && toIntOrZero(sourceItem.attackSkillId) !== nextAttackSkillId)
      || (supportsHiddenAttackSkill && toIntOrZero(sourceItem.hiddenAttackSkillId) !== nextHiddenAttackSkillId)
      || (isWeaponItem && toIntOrZero(sourceItem.attackElementId) !== nextAttackElementId)
      || (isWeaponItem && Math.max(1, toIntOrZero(sourceItem.weaponImageId || 1)) !== nextWeaponImageId)
      || (supportsCommonRange && currentCommonRangeValues !== null && nextCommonRangeValues !== null && (
        currentCommonRangeValues.targetCamp !== nextCommonRangeValues.targetCamp
        || currentCommonRangeValues.targetLifeState !== nextCommonRangeValues.targetLifeState
        || currentCommonRangeValues.selectMode !== nextCommonRangeValues.selectMode
        || currentCommonRangeValues.areaMode !== nextCommonRangeValues.areaMode
        || currentCommonRangeValues.shapeType !== nextCommonRangeValues.shapeType
        || currentCommonRangeValues.areaTargetCount !== nextCommonRangeValues.areaTargetCount
        || currentCommonRangeValues.repeatTime !== nextCommonRangeValues.repeatTime
        || currentCommonRangeValues.repeatTimeFloat !== nextCommonRangeValues.repeatTimeFloat
        || !areShapeParamsEqual(sourceItem.shapeParams, nextCommonRangeValues.shapeParams)
        || (nextOrderEffects !== null && !areBattleOrderEffectsEqual(sourceItem.orderEffects, nextOrderEffects))
      ))
      || (isWeaponItem && currentWeaponRangeValues !== null && nextWeaponRangeValues !== null && (
        currentWeaponRangeValues.areaOverride !== nextWeaponRangeValues.areaOverride
        || currentWeaponRangeValues.areaMode !== nextWeaponRangeValues.areaMode
        || currentWeaponRangeValues.shapeType !== nextWeaponRangeValues.shapeType
        || currentWeaponRangeValues.areaTargetCount !== nextWeaponRangeValues.areaTargetCount
        || currentWeaponRangeValues.repeatTime !== nextWeaponRangeValues.repeatTime
        || currentWeaponRangeValues.repeatTimeFloat !== nextWeaponRangeValues.repeatTimeFloat
        || !areShapeParamsEqual(sourceItem.shapeParams, nextWeaponRangeValues.shapeParams)
      ))
      || (supportsTemplateParams && nextExtraParams !== null && !areParamGroupsEqual(sourceItem.extraParams, nextExtraParams, EXTRA_PARAM_FIELDS))
      || (supportsTemplateParams && nextVehicleParams !== null && !areParamGroupsEqual(sourceItem.vehicleParams, nextVehicleParams, VEHICLE_PARAM_FIELDS))
      || (supportsTemplateParams && nextUpgradeParams !== null && !areParamGroupsEqual(sourceItem.upgradeParams, nextUpgradeParams, UPGRADE_PARAM_FIELDS))
      || (supportsTemplateParams && nextUpgradeCosts !== null && !arePlainDataEqual(normalizeEquipUpgradeCosts(sourceItem.upgradeCosts), nextUpgradeCosts))
      || (supportsOwnerParams && nextOwnerExtraParams !== null && !areOwnerNumberGroupsEqual(sourceItem.ownerParams?.extraParams, nextOwnerExtraParams, OWNER_EXTRA_PARAM_FIELDS))
      || (supportsOwnerParams && nextOwnerSpecialParams !== null && !areOwnerNumberGroupsEqual(sourceItem.ownerParams?.specialParams, nextOwnerSpecialParams, OWNER_SPECIAL_PARAM_FIELDS))
      || (supportsOwnerParams && nextOwnerScalar !== null && !areOwnerNumberGroupsEqual(sourceItem.ownerParams?.scalar, nextOwnerScalar, OWNER_SCALAR_FIELDS))
      || (supportsOwnerParams && sourceItem.ownerParams != null && Object.prototype.hasOwnProperty.call(sourceItem.ownerParams, 'paramRate'))
      || (supportsOwnerElementRate && nextOwnerElementRate !== null && !areFloatArraysEqual(normalizeOwnerElementRates(sourceItem.ownerParams?.elementRate, systemData), nextOwnerElementRate))
      || (!supportsOwnerElementRate && sourceItem.ownerParams != null && Object.prototype.hasOwnProperty.call(sourceItem.ownerParams, 'elementRate'))
      || (supportsOwnerParams && sourceItem.ownerParams == null)
      || (supportsPassiveStates && !arePassiveStatesEqual(sourceItem.passiveStates, nextPassiveStates))
      || (isArmorItem && nextArmorElementRates !== null && !areFloatArraysEqual(sourceItem.elementRates, nextArmorElementRates))
      || (isArmorItem && nextElementRateFloats !== null && !areFloatArraysEqual(sourceItem.elementRateFloats, nextElementRateFloats))
      || (isEnemyFile && nextEnemyBaseWeaknessGroup !== null && !areEnemyWeaknessGroupsEqual((sourceItem as RPGEnemy).baseWeaknessGroup, nextEnemyBaseWeaknessGroup))
      || (isEnemyFile && nextEnemyDynamicWeaknessGroups !== null && !areEnemyWeaknessGroupListsEqual((sourceItem as RPGEnemy).dynamicWeaknessGroups, nextEnemyDynamicWeaknessGroups))
      || (isStateFile && !areStateWeaknessEffectsEqual(sourceItem.weaknessStateEffects, nextStateWeaknessEffects ?? undefined))
      || (isStateFile && !areStateChargeConfigsEqual(sourceItem.chargeConfig, nextStateChargeConfig ?? undefined))
      || (supportsProjectileConfig && nextSkillValues !== null && hasSkillEditorChanges(sourceItem, nextSkillValues, { isItem: isItemFile }))
      || ((isWeaponItem || isArmorItem) && (sourceItem.qualityLock === true) !== nextQualityLock)
      || (isEnemyFile && nextEnemyValues !== null && hasEnemyEditorChanges(sourceItem as RPGEnemy, nextEnemyValues, skillsData));
    const nextEquipTypeId = isWeaponItem ? toIntOrZero(values[EQUIP_TYPE_FIELD_KEY]) : 0;

    if (shouldUpdateItem) {
      pendingDraftRef.current = hasCustomChanges
        ? {
            customFields: customFields.map((field) => ({ ...field })),
            effectIds: effectIds.slice(),
            hasBaseChanges: false,
            hasCustomChanges: true,
            hasEffectChanges,
          }
        : null;

      let nextItem: RPGItem | RPGEnemy = {
        ...sourceItem,
        ...(supportsPrice ? { price: nextPrice } : {}),
        ...(isWeaponItem ? {
          attackSkillId: nextAttackSkillId,
          attackElementId: nextAttackElementId,
          weaponImageId: nextWeaponImageId,
        } : {}),
        ...(supportsHiddenAttackSkill ? { hiddenAttackSkillId: nextHiddenAttackSkillId } : {}),
        ...(supportsTemplateParams && nextExtraParams ? { extraParams: nextExtraParams } : {}),
        ...(supportsTemplateParams && nextVehicleParams ? { vehicleParams: nextVehicleParams } : {}),
        ...(supportsTemplateParams && nextUpgradeParams ? { upgradeParams: nextUpgradeParams } : {}),
        ...(supportsTemplateParams && nextUpgradeCosts ? { upgradeCosts: nextUpgradeCosts } : {}),
        ...(supportsOwnerParams ? { ownerParams: nextOwnerParams } : {}),
        ...(supportsPassiveStates ? { passiveStates: nextPassiveStates } : {}),
        ...(isArmorItem && nextArmorElementRates ? { elementRates: nextArmorElementRates } : {}),
        ...(isArmorItem && nextElementRateFloats ? { elementRateFloats: nextElementRateFloats } : {}),
        ...(isStateFile ? { weaknessStateEffects: nextStateWeaknessEffects ?? undefined } : {}),
        ...(isStateFile ? { chargeConfig: nextStateChargeConfig ?? undefined } : {}),
        ...(isEnemyFile && nextEnemyBaseWeaknessGroup ? {
          baseWeaknessGroup: nextEnemyBaseWeaknessGroup,
          dynamicWeaknessGroups: nextEnemyDynamicWeaknessGroups ?? [],
        } : {}),
        ...((isWeaponItem || isArmorItem) ? { qualityLock: nextQualityLock } : {}),
        ...(supportsCommonRange && nextCommonRangeValues ? nextCommonRangeValues : {}),
        ...(supportsCommonRange && nextOrderEffects ? { orderEffects: nextOrderEffects as BattleOrderEffects } : {}),
        ...(isWeaponItem && nextWeaponRangeValues ? nextWeaponRangeValues : {}),
        params: supportsFlatBaseAttributes ? newParams : sourceItem.params,
        floatParams: supportsFlatFloatBaseAttributes ? newFloatParams : sourceItem.floatParams,
      };

      if (supportsProjectileConfig && nextSkillValues !== null) {
        nextItem = buildSkillSaveData(nextItem as RPGItem, nextSkillValues, { isItem: isItemFile });
        if (isItemFile) {
          delete (nextItem as RPGItem).skillCosts;
        }
        if (nextCommonRangeValues) {
          nextItem = {
            ...nextItem,
          ...nextCommonRangeValues,
        };
      }
    }

      if (isStateFile && nextStateWeaknessEffects == null) {
        delete (nextItem as RPGItem).weaknessStateEffects;
      }

      if (isEnemyFile && nextEnemyValues !== null) {
        nextItem = buildEnemySaveData(nextItem as RPGEnemy, nextEnemyValues, skillsData);
      }

      savingRef.current = true;
      updateCurrentItem(
        nextItem,
      );
    }

    const extensionChanged = isWeaponItem ? updateWeaponEquipType(nextEquipTypeId) : false;

    if (!shouldUpdateItem && !extensionChanged) {
      setHasBaseChanges(false);
      if (!silent) {
        ToastManager.info('基础属性没有变化');
      }
      return;
    }

    setHasBaseChanges(false);
    if (!silent) {
      ToastManager.success('基础属性已保存');
    }
  };

  const renderSkillCostConfigFields = (field: FormListFieldData) => (
    <Form.Item
      noStyle
      shouldUpdate={(prevValues, nextValues) => {
        const prevType = prevValues?.[SKILL_COSTS_FIELD_KEY]?.[field.name]?.type;
        const nextType = nextValues?.[SKILL_COSTS_FIELD_KEY]?.[field.name]?.type;
        return prevType !== nextType;
      }}
    >
      {({ getFieldValue }) => {
        const costType = (getFieldValue([SKILL_COSTS_FIELD_KEY, field.name, 'type']) || 'hp') as SkillCostType;
        if (costType === 'variable' || costType === 'variableRate') {
          return (
            <>
              <Form.Item
                name={[field.name, 'variableId']}
                label={<span className="text-xs text-gray-400">变量</span>}
                className="mb-0"
              >
                <Select
                  options={variableOptions}
                  className="w-full"
                  placeholder="选择变量"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[field.name, 'value']}
                label={<span className="text-xs text-gray-400">{costType === 'variableRate' ? '百分比' : '扣减值'}</span>}
                className="mb-0"
              >
                <InputNumber
                  min={0}
                  max={costType === 'variableRate' ? 100 : undefined}
                  step={1}
                  className="w-full"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          );
        }

        if (costType === 'item' || costType === 'weapon' || costType === 'armor') {
          const options = costType === 'item'
            ? itemReferenceOptions
            : (costType === 'weapon' ? weaponReferenceOptions : armorReferenceOptions);
          const referenceName = costType === 'item'
            ? 'itemId'
            : (costType === 'weapon' ? 'weaponId' : 'armorId');
          const referenceLabel = costType === 'item'
            ? '物品'
            : (costType === 'weapon' ? '武器' : '防具');

          return (
            <>
              <Form.Item
                name={[field.name, referenceName]}
                label={<span className="text-xs text-gray-400">{referenceLabel}</span>}
                className="mb-0"
              >
                <Select
                  options={options}
                  className="w-full"
                  placeholder={`选择${referenceLabel}`}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[field.name, 'amount']}
                label={<span className="text-xs text-gray-400">数量</span>}
                className="mb-0"
              >
                <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
            </>
          );
        }

        return (
          <Form.Item
            name={[field.name, 'value']}
            label={<span className="text-xs text-gray-400">{costType === 'hpRate' || costType === 'goldRate' ? '百分比' : '消耗值'}</span>}
            className="mb-0"
          >
            <InputNumber
              min={0}
              max={costType === 'hpRate' || costType === 'goldRate' ? 100 : undefined}
              step={1}
              className="w-full"
              style={{ width: '100%' }}
            />
          </Form.Item>
        );
      }}
    </Form.Item>
  );

  const handleSaveCustomAttributes = (silent = false) => {
    if (!currentData || currentItemIndex < 0) return;

    const sourceItem = currentData[currentItemIndex] as any;
    if (!sourceItem) return;

    pendingDraftRef.current = hasBaseChanges
      ? {
          baseValues: form.getFieldsValue(),
          effectIds: effectIds.slice(),
          hasBaseChanges: true,
          hasCustomChanges: false,
          hasEffectChanges,
        }
      : null;

    savingRef.current = true;
    updateCurrentItem({
      ...sourceItem,
      customParams: buildCustomParams(),
    });

    setHasCustomChanges(false);
    if (!silent) {
      ToastManager.success('自定义属性已保存');
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: '', value: 0, floatValue: 0 }]);
    setHasCustomChanges(true);
  };

  const removeCustomField = (index: number) => {
    const newFields = [...customFields];
    newFields.splice(index, 1);
    setCustomFields(newFields);
    setHasCustomChanges(true);
  };

  const updateCustomField = (index: number, field: keyof CustomAttribute, value: string | number) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setCustomFields(newFields);
    setHasCustomChanges(true);
  };

  const addEffectReference = () => {
    const nextId = getNextEffectReferenceId(effectIds, effectOptions);
    if (nextId === null) {
      ToastManager.info('当前没有可引用的效果');
      return;
    }
    setEffectIds((current) => [...current, nextId]);
  };

  const removeEffectReference = (index: number) => {
    setEffectIds((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateEffectReference = (index: number, value: number) => {
    setEffectIds((current) => current.map((entry, currentIndex) => (
      currentIndex === index ? value : entry
    )));
  };

  useEffect(() => {
    if (!hasBaseChanges) return;
    const timer = window.setTimeout(() => {
      handleSaveBaseAttributes(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hasBaseChanges, handleSaveBaseAttributes]);

  useEffect(() => {
    if (!hasCustomChanges) return;
    const timer = window.setTimeout(() => {
      handleSaveCustomAttributes(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hasCustomChanges, handleSaveCustomAttributes]);

  useEffect(() => {
    if (!hasEffectChanges) return;
    const timer = window.setTimeout(() => {
      handleSaveEffects(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hasEffectChanges, handleSaveEffects]);

  const shouldShowCommonShapeSection = supportsCommonRange && watchedAreaMode !== 1 && watchedAreaMode !== 4;
  const shouldShowCommonTargetCount = supportsCommonRange && watchedAreaMode === 2;
  const shouldShowCommonShapeSelect = supportsCommonRange && watchedAreaMode === 2;
  const shouldShowWeaponConfig = isWeaponItem && watchedAreaOverride === 1;
  const shouldShowWeaponShapeSection = shouldShowWeaponConfig && watchedAreaMode !== 1 && watchedAreaMode !== 4;
  const shouldShowWeaponTargetCount = shouldShowWeaponConfig && watchedAreaMode === 2;
  const shouldShowWeaponShapeSelect = shouldShowWeaponConfig && watchedAreaMode === 2;
  const activeShapeType = watchedAreaMode === 3
    ? 3
    : watchedAreaMode === 2
      ? (watchedShapeType === 2 ? 2 : 1)
      : 0;

  const renderShapeParamsEditor = () => (
    <div className="grid grid-cols-4 gap-x-4 gap-y-4">
      {activeShapeType === 1 ? (
        <Form.Item
          name={[SHAPE_PARAMS_FIELD_KEY, '1', 'radius']}
          label={<span className="text-xs text-gray-400">圆形半径</span>}
          className="mb-0"
        >
          <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
        </Form.Item>
      ) : null}
      {activeShapeType === 2 ? (
        <>
          <Form.Item
            name={[SHAPE_PARAMS_FIELD_KEY, '2', 'radius']}
            label={<span className="text-xs text-gray-400">扇形半径</span>}
            className="mb-0"
          >
            <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name={[SHAPE_PARAMS_FIELD_KEY, '2', 'angleDeg']}
            label={<span className="text-xs text-gray-400">扇形角度</span>}
            className="mb-0"
          >
            <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      {activeShapeType === 3 ? (
        <>
          <Form.Item
            name={[SHAPE_PARAMS_FIELD_KEY, '3', 'width']}
            label={<span className="text-xs text-gray-400">矩形宽度</span>}
            className="mb-0"
          >
            <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name={[SHAPE_PARAMS_FIELD_KEY, '3', 'length']}
            label={<span className="text-xs text-gray-400">矩形长度</span>}
            className="mb-0"
          >
            <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      <div className="col-span-4 text-xs text-gray-500">
        当前激活形状：
        {activeShapeType === 1 ? '圆形' : activeShapeType === 2 ? '扇形' : activeShapeType === 3 ? '矩形' : '无'}
        。运行时只读取当前 `shapeType` 对应的一套参数。
      </div>
    </div>
  );

  const renderFixedParamCard = (
    title: string,
    groupKey: FixedParamGroupKey,
    fields: FixedParamFieldDefinition[],
    description: string,
    columnLabels: FixedParamColumnLabels = DEFAULT_FIXED_PARAM_COLUMN_LABELS,
  ) => (
    <Card
      title={title}
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      <div className="grid grid-cols-5 gap-x-4 gap-y-4 items-start">
        <div className="text-xs text-gray-400">属性</div>
        <div className="text-xs text-gray-400">{columnLabels.value}</div>
        <div className="text-xs text-gray-400">{columnLabels.floatValue}</div>
        <div className="text-xs text-gray-400">{columnLabels.upgradeValue}</div>
        <div className="text-xs text-gray-400">{columnLabels.upgradeFloatValue}</div>
        {fields.flatMap((field) => [
          (
            <div key={`${groupKey}-${field.key}-label`} className="text-sm text-gray-200 pt-2">
              {field.label}
            </div>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-value`}
              name={[groupKey, field.index, 'value']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-floatValue`}
              name={[groupKey, field.index, 'floatValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={0.1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-upgradeValue`}
              name={[groupKey, field.index, 'upgradeValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-upgradeFloatValue`}
              name={[groupKey, field.index, 'upgradeFloatValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={0.1} />
            </Form.Item>
          ),
        ])}
      </div>
    </Card>
  );

  const renderUpgradeCostsCard = () => (
    <Form.List name={UPGRADE_COSTS_FIELD_KEY}>
      {(fields, { add, remove }) => (
        <Card
          title={(
            <div className="flex justify-between items-center">
              <span>强化耗材</span>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => add(createEmptyUpgradeCostEntry(fields.length))}
              >
                添加一级
              </Button>
            </div>
          )}
          className="mb-4"
          headStyle={{
            backgroundColor: '#252b3d',
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
          }}
          bodyStyle={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="text-xs text-gray-500 mb-4">
            逐级配置强化消耗，第一行对应强化到 +1，第二行对应强化到 +2。金币和必需物品在强化失败时也会消耗；保底物品只在本次选择保底强化时消耗。
          </div>
          {fields.length === 0 ? (
            <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
              当前没有逐级耗材配置，运行时会视为该装备不可强化。点击右上角“添加一级”开始配置。
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[64px_96px_repeat(5,minmax(0,1fr))_40px] gap-x-3 text-xs text-gray-400">
                <div>等级</div>
                <div>成功率%</div>
                <div>所需金币</div>
                <div>必需物品</div>
                <div>必需数量</div>
                <div>保底物品</div>
                <div>保底数量</div>
                <div>操作</div>
              </div>
              {fields.map((field, index) => {
                const canRemove = index === fields.length - 1;
                return (
                  <div
                    key={field.key}
                    className="grid grid-cols-[64px_96px_repeat(5,minmax(0,1fr))_40px] gap-x-3 items-center"
                  >
                    <div className="text-sm text-gray-200">+{index + 1}</div>
                    <Form.Item name={[field.name, 'successRate']} className="mb-0">
                      <InputNumber min={0} max={100} step={0.01} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'goldCost']} className="mb-0">
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'requiredItemId']} className="mb-0">
                      <Select
                        options={itemReferenceOptions}
                        className="w-full"
                        optionFilterProp="label"
                        showSearch
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'requiredItemAmount']} className="mb-0">
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'protectItemId']} className="mb-0">
                      <Select
                        options={itemReferenceOptions}
                        className="w-full"
                        optionFilterProp="label"
                        showSearch
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'protectItemAmount']} className="mb-0">
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!canRemove}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </Form.List>
  );

  const renderOwnerParamCard = (
    title: string,
    groupKey: OwnerParamGroupKey,
    fields: OwnerParamFieldDefinition[],
    description: string,
    step = 0.01,
  ) => (
    <Card
      title={title}
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-4">
        {fields.map((field) => (
            <Form.Item
              key={`owner-${groupKey}-${field.key}`}
              name={['ownerParams', groupKey, field.index]}
              label={<span className="text-xs text-gray-400">{field.label}</span>}
              className="mb-0"
            >
            <InputNumber step={step} className="w-full" style={{ width: '100%' }} />
          </Form.Item>
        ))}
      </div>
    </Card>
  );

  const renderOwnerElementRateCard = (description: string) => (
    <Card
      title="元素属性率"
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      {armorElementRateFields.length === 0 ? (
        <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
          当前系统没有可编辑元素，请先在 System.json 配置元素列表。
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-4 gap-y-4">
          {armorElementRateFields.map((field) => (
            <Form.Item
              key={`owner-element-rate-${field.id}`}
              name={['ownerParams', 'elementRate', field.id]}
              label={<span className="text-xs text-gray-400">{field.label}</span>}
              className="mb-0"
            >
              <InputNumber step={0.01} className="w-full" style={{ width: '100%' }} />
            </Form.Item>
          ))}
        </div>
      )}
    </Card>
  );

  const renderOwnerParamsSection = (sectionTitle?: string) => {
    if (!supportsOwnerParams) {
      return null;
    }
    const ownerIntro = isWeaponItem || isArmorItem
      ? '这里维护装备穿上后加给宿主的固定奖励；装备自身属性仍然在本页其他区块维护。'
      : '这里维护宿主固有的固定战斗奖励，运行时会直接累计到 owner 静态字段。';
    const ownerElementIntro = '这里维护宿主受到对应元素时的元素属性率增量。正数表示更脆，受到该元素伤害增加；负数表示抗性，受到该元素伤害减少。写 0.2 表示最终元素率额外 +20%，写 -0.2 表示额外 -20%。';
    return (
      <>
        {sectionTitle ? (
          <div className="mb-3 text-sm font-medium text-gray-200">{sectionTitle}</div>
        ) : null}
        {renderOwnerParamCard('额外奖励', 'extraParams', OWNER_EXTRA_PARAM_FIELDS, ownerIntro)}
        {renderOwnerParamCard('特殊奖励', 'specialParams', OWNER_SPECIAL_PARAM_FIELDS, '这些字段会直接作用到仇恨、防御效率、恢复效果、药效、物理伤害和 HP 再生率。')}
        {renderOwnerParamCard('标量奖励', 'scalar', OWNER_SCALAR_FIELDS, '当前只保留经验获取率这类全局标量字段。')}
        {supportsOwnerElementRate ? renderOwnerElementRateCard(ownerElementIntro) : null}
      </>
    );
  };

  const renderPassiveStatesCard = () => {
    if (!supportsPassiveStates) {
      return null;
    }
    return (
      <Card
        title="被动状态"
        className="mb-4"
        headStyle={{
          backgroundColor: '#252b3d',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
        bodyStyle={{ backgroundColor: '#1a1f2e' }}
      >
        <div className="text-xs text-gray-500 mb-4">
          这里维护宿主固定携带的被动状态 id 列表。修复模式会强制补齐空数组，运行时按严格字段直接读取，不再对缺字段做兜底。
        </div>
        <Form.List name={PASSIVE_STATES_FIELD_KEY}>
          {(fields, { add, remove }) => (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">被动状态列表</span>
                <Space>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => add(undefined)}
                  >
                    添加被动状态
                  </Button>
                  <Button
                    type="dashed"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(fields.length - 1)}
                    disabled={fields.length === 0}
                  >
                    删除最后一项
                  </Button>
                </Space>
              </div>
              {fields.length === 0 ? (
                <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                  当前没有被动状态，点击右上角“添加被动状态”开始编辑。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {fields.map((field, index) => (
                    <Form.Item
                      key={field.key}
                      name={field.name}
                      label={<span className="text-xs text-gray-400">被动状态 {index + 1}</span>}
                      className="mb-0"
                    >
                      <Select
                        options={passiveStateOptions}
                        className="w-full"
                        placeholder="选择被动状态"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  ))}
                </div>
              )}
            </div>
          )}
        </Form.List>
      </Card>
    );
  };

  const renderEnemyChallengeCard = () => {
    if (!isEnemyFile) {
      return null;
    }
    return (
      <Card
        title="Boss 图鉴挑战"
        className="mb-4"
        headStyle={{
          backgroundColor: '#252b3d',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
        bodyStyle={{ backgroundColor: '#1a1f2e' }}
      >
        <div className="text-xs text-gray-500 mb-4">
          这里只维护 `enemy.bookChallenge` 的挑战入口和星级属性。掉落倍率、金币/经验倍率和额外奖励请在掉落模式统一维护。
          运行时只有已击败的 Boss 才能在图鉴里发起挑战，Boss 只要配置了挑战敌群和星级，就会自动开放挑战。
        </div>
        {!watchedEnemyIsBoss ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="当前敌人未勾选 Boss，图鉴挑战数据即使配置也不会在运行时开放。"
          />
        ) : null}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <Form.Item
            name={[ENEMY_BOOK_CHALLENGE_FIELD_KEY, 'challengeTroopId']}
            label={<span className="text-xs text-gray-400">挑战敌群</span>}
            className="mb-0"
          >
            <Select
              options={enemyChallengeTroopOptions}
              className="w-full"
              placeholder="选择该 Boss 的图鉴挑战敌群"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </div>
        <Form.List name={[ENEMY_BOOK_CHALLENGE_FIELD_KEY, 'stars']}>
          {(fields, { add, remove }) => (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">星级配置列表</div>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => add(createEmptyEnemyChallengeStar(fields.length))}
                >
                  添加星级
                </Button>
              </div>
              {fields.length === 0 ? (
                <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                  当前没有挑战星级，Boss 图鉴里不会开放挑战入口。
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.key} className="rounded border border-gray-700 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-sm text-gray-200">挑战星级 #{index + 1}</div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          删除星级
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <Form.Item
                          name={[field.name, 'star']}
                          label={<span className="text-xs text-gray-400">星级数</span>}
                          className="mb-0"
                        >
                          <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'goldCost']}
                          label={<span className="text-xs text-gray-400">挑战金币</span>}
                          className="mb-0"
                        >
                          <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'levelRequirement']}
                          label={<span className="text-xs text-gray-400">等级要求</span>}
                          className="mb-0"
                        >
                          <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'baseParamRate']}
                          label={<span className="text-xs text-gray-400">基础属性倍率</span>}
                          className="mb-0"
                        >
                          <InputNumber min={0} step={0.1} className="w-full" style={{ width: '100%' }} />
                        </Form.Item>
                      </div>
                      <Form.List name={[field.name, 'passiveStates']}>
                        {(passiveFields, { add: addPassiveState, remove: removePassiveState }) => (
                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-400">额外初始被动状态</div>
                              <div className="flex gap-2">
                                <Button
                                  type="dashed"
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => addPassiveState(0)}
                                >
                                  添加被动
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => removePassiveState(passiveFields.length - 1)}
                                  disabled={passiveFields.length === 0}
                                >
                                  删除最后一项
                                </Button>
                              </div>
                            </div>
                            {passiveFields.length === 0 ? (
                              <div className="rounded border border-dashed border-gray-600 px-4 py-4 text-sm text-gray-500 text-center">
                                当前星级没有额外初始被动状态。
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                {passiveFields.map((passiveField, passiveIndex) => (
                                  <Form.Item
                                    key={passiveField.key}
                                    name={passiveField.name}
                                    label={<span className="text-xs text-gray-400">被动状态 {passiveIndex + 1}</span>}
                                    className="mb-0"
                                  >
                                    <Select
                                      options={passiveStateOptions}
                                      className="w-full"
                                      placeholder="选择被动状态"
                                      showSearch
                                      allowClear
                                      optionFilterProp="label"
                                    />
                                  </Form.Item>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Form.List>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Form.List>
      </Card>
    );
  };

  const renderWeaknessSlotList = (
    pathPrefix: Array<string | number>,
    emptyText: string,
  ) => (
    <Form.List name={[...pathPrefix, 'slots']}>
      {(fields, { add, remove }) => (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              这里是敌人弱点槽位，不是 owner 元素属性率。倍率写增量值，实际按 1 + 增量 结算：0.3 表示弱点，最终元素率 1.3；-0.2 表示抗性，最终元素率 0.8。编辑器会阻止同组重复元素。
            </div>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => add({ elementId: 0, rate: 0 })}
              disabled={weaknessElementOptions.length === 0}
            >
              添加弱点
            </Button>
          </div>
          {fields.length === 0 ? (
            <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
              {emptyText}
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.key} className="grid grid-cols-[1.2fr,0.8fr,40px] gap-3 items-center">
                  <Form.Item
                    name={[field.name, 'elementId']}
                    label={<span className="text-xs text-gray-400">元素 #{index + 1}</span>}
                    className="mb-0"
                  >
                    <Select
                      options={weaknessElementOptions}
                      className="w-full"
                      placeholder="选择元素"
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'rate']}
                    label={<span className="text-xs text-gray-400">倍率增量</span>}
                    className="mb-0"
                  >
                    <InputNumber step={0.01} className="w-full" style={{ width: '100%' }} />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Form.List>
  );

  const renderDynamicWeaknessGroupEditor = (
    field: { key: number; name: number; fieldKey?: number },
    index: number,
    removeGroup: (index: number | number[]) => void,
  ) => (
    <div key={field.key} className="rounded border border-gray-700 p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-gray-200">动态弱点组 #{index + 1}</div>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeGroup(field.name)}
        >
          删除弱点组
        </Button>
      </div>
      <div className="text-xs text-gray-500 mb-4">切到该组时会重建当前弱点列表与盾上限。</div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Form.Item
          name={[field.name, 'shieldMax']}
          fieldKey={field.fieldKey !== undefined ? [field.fieldKey, 'shieldMax'] : undefined}
          label={<span className="text-xs text-gray-400">盾上限</span>}
          className="mb-0"
        >
          <InputNumber min={0} max={99} step={1} className="w-full" style={{ width: '100%' }} />
        </Form.Item>
      </div>
      <Form.List name={[field.name, 'slots']}>
        {(slotFields, { add, remove }) => (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                这里是敌人弱点槽位，不是 owner 元素属性率。倍率写增量值，实际按 1 + 增量 结算：0.3 表示弱点，最终元素率 1.3；-0.2 表示抗性，最终元素率 0.8。编辑器会阻止同组重复元素。
              </div>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => add({ elementId: 0, rate: 0 })}
                disabled={weaknessElementOptions.length === 0}
              >
                添加弱点
              </Button>
            </div>
            {slotFields.length === 0 ? (
              <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                该动态组还没有弱点条目。
              </div>
            ) : (
              <div className="space-y-3">
                {slotFields.map((slotField) => (
                  <div key={slotField.key} className="grid grid-cols-[1.2fr,0.8fr,40px] gap-3 items-center">
                    <Form.Item
                      name={[slotField.name, 'elementId']}
                      fieldKey={slotField.fieldKey !== undefined ? [slotField.fieldKey, 'elementId'] : undefined}
                      label={<span className="text-xs text-gray-400">元素</span>}
                      className="mb-0"
                    >
                      <Select
                        options={weaknessElementOptions}
                        className="w-full"
                        placeholder="选择元素"
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[slotField.name, 'rate']}
                      fieldKey={slotField.fieldKey !== undefined ? [slotField.fieldKey, 'rate'] : undefined}
                      label={<span className="text-xs text-gray-400">倍率增量</span>}
                      className="mb-0"
                    >
                      <InputNumber step={0.01} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(slotField.name)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Form.List>
    </div>
  );

  const renderWeaknessGroupCard = (
    title: string,
    pathPrefix: Array<string | number>,
    description: string,
    emptyText: string,
  ) => (
    <Card
      title={title}
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Form.Item
          name={[...pathPrefix, 'shieldMax']}
          label={<span className="text-xs text-gray-400">盾上限</span>}
          className="mb-0"
        >
          <InputNumber min={0} max={99} step={1} className="w-full" style={{ width: '100%' }} />
        </Form.Item>
      </div>
      {renderWeaknessSlotList(pathPrefix, emptyText)}
    </Card>
  );

  const renderStateWeaknessPhaseEditor = (
    phaseKey: 'onAdd' | 'onRemove',
    title: string,
    description: string,
  ) => (
    <div className="rounded border border-gray-700 p-4">
      <div className="text-sm text-gray-200 mb-3">{title}</div>
      <div className="text-xs text-gray-500 mb-4">{description}</div>
      <div className="grid grid-cols-3 gap-4">
        <Form.Item
          name={[STATE_WEAKNESS_EFFECTS_FIELD_KEY, phaseKey, 'switchGroupIndex']}
          label={<span className="text-xs text-gray-400">切换弱点组</span>}
          className="mb-0"
        >
          <InputNumber min={-1} step={1} className="w-full" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name={[STATE_WEAKNESS_EFFECTS_FIELD_KEY, phaseKey, 'protectElements']}
          label={<span className="text-xs text-gray-400">新增保护元素</span>}
          className="mb-0"
        >
          <Select
            mode="multiple"
            options={weaknessElementOptions}
            className="w-full"
            placeholder="选择要保护的元素"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name={[STATE_WEAKNESS_EFFECTS_FIELD_KEY, phaseKey, 'unprotectElements']}
          label={<span className="text-xs text-gray-400">移除保护元素</span>}
          className="mb-0"
        >
          <Select
            mode="multiple"
            options={weaknessElementOptions}
            className="w-full"
            placeholder="选择要解除保护的元素"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </div>
    </div>
  );

  const renderStateChargeEditor = () => (
    <Card
      title="状态蓄力配置"
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">
        这里定义状态级 `chargeConfig`。当前结构化蓄力只在状态移除时触发：`禁止行动` 会让状态持续期间视为不可行动；`结束后给一动` 与 `结束时释放技能` 会在状态结束时新增一条行动；`顺位队列` 决定它写入当前回合还是下回合，`顺位偏移` 里正数表示提前，负数表示延后。
      </div>
      <div className="grid grid-cols-5 gap-4">
        <Form.Item
          name={[STATE_CHARGE_CONFIG_FIELD_KEY, 'blockActions']}
          label={<span className="text-xs text-gray-400">禁止行动</span>}
          valuePropName="checked"
          className="mb-0"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name={[STATE_CHARGE_CONFIG_FIELD_KEY, 'grantAction']}
          label={<span className="text-xs text-gray-400">结束后给一动</span>}
          valuePropName="checked"
          className="mb-0"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name={[STATE_CHARGE_CONFIG_FIELD_KEY, 'releaseSkillId']}
          label={<span className="text-xs text-gray-400">结束时释放技能</span>}
          className="mb-0"
        >
          <Select
            options={skillOptions}
            className="w-full"
            placeholder="未选择技能"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name={[STATE_CHARGE_CONFIG_FIELD_KEY, 'queueScope']}
          label={<span className="text-xs text-gray-400">顺位队列</span>}
          className="mb-0"
        >
          <Select
            options={[
              { value: STATE_CHARGE_QUEUE_SCOPE_CURRENT, label: '当前回合' },
              { value: STATE_CHARGE_QUEUE_SCOPE_NEXT, label: '下回合' },
            ]}
            className="w-full"
            placeholder="选择队列"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name={[STATE_CHARGE_CONFIG_FIELD_KEY, 'queueShift']}
          label={<span className="text-xs text-gray-400">顺位偏移</span>}
          className="mb-0"
        >
          <InputNumber step={1} className="w-full" style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </Card>
  );

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧项目以加载属性</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-dark-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          属性定义
        </h2>
        <span className="text-xs text-gray-500">自动记录变更并标记脏文件</span>
      </div>

      <Form form={form} onValuesChange={handleValuesChange}>
        <Card
          title="基础属性"
          className="mb-4"
          headStyle={{
            backgroundColor: '#252b3d',
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
          }}
          bodyStyle={{ backgroundColor: '#1a1f2e' }}
        >
          {supportsFlatBaseAttributes ? (
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
            {baseAttributeDisplayFields.flatMap(({ key, label, floatLabel }) => {
              const floatKey = getFloatFieldKey(key);
              const items = [
                (
                  <Form.Item
                    key={key}
                    name={key}
                    label={<span className="text-xs text-gray-400">{label}</span>}
                    className="mb-0"
                  >
                    <Input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      className="w-full"
                      placeholder="整数"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                ),
              ];
              if (supportsFlatFloatBaseAttributes) {
                items.push(
                  <Form.Item
                    key={floatKey}
                    name={floatKey}
                    label={<span className="text-xs text-gray-400">{floatLabel}</span>}
                    className="mb-0"
                  >
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      className="w-full"
                      placeholder="数字"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>,
                );
              }
              return items;
            })}
            {supportsPrice ? (
              <Form.Item
                key={PRICE_FIELD_KEY}
                name={PRICE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">价格</span>}
                className="mb-0"
              >
                <Input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  className="w-full"
                  placeholder="输入价格"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : null}
            {isWeaponItem ? (
              <>
                <Form.Item
                  key={ATTACK_SKILL_FIELD_KEY}
                  name={ATTACK_SKILL_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">攻击技能</span>}
                  className="mb-0"
                >
                  <Select
                    options={skillOptions}
                    className="w-full"
                    placeholder="选择攻击技能"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
                <Form.Item
                  key={ATTACK_ELEMENT_FIELD_KEY}
                  name={ATTACK_ELEMENT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">攻击元素</span>}
                  className="mb-0"
                >
                  <Select
                    options={elementOptions}
                    className="w-full"
                    placeholder="选择攻击元素"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
                <Form.Item
                  key={WEAPON_IMAGE_ID_FIELD_KEY}
                  name={WEAPON_IMAGE_ID_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器图片 ID</span>}
                  className="mb-0"
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    step={1}
                    className="w-full"
                    placeholder="输入武器图片 ID"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item
                  key={EQUIP_TYPE_FIELD_KEY}
                  name={EQUIP_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">装备类型</span>}
                  className="mb-0"
                >
                  <Select
                    options={equipTypeOptions}
                    className="w-full"
                    placeholder="选择装备类型"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              </>
            ) : null}
            {supportsHiddenAttackSkill ? (
              <Form.Item
                key={HIDDEN_ATTACK_SKILL_FIELD_KEY}
                name={HIDDEN_ATTACK_SKILL_FIELD_KEY}
                label={<span className="text-xs text-gray-400">隐藏攻击技能</span>}
                className="mb-0"
              >
                <Select
                  options={skillOptions}
                  className="w-full"
                  placeholder="选择隐藏攻击技能"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            ) : null}
            {(isWeaponItem || isArmorItem) ? (
              <Form.Item
                key={QUALITY_LOCK_FIELD_KEY}
                name={QUALITY_LOCK_FIELD_KEY}
                label={<span className="text-xs text-gray-400">品质锁定</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="锁定" unCheckedChildren="随机" />
              </Form.Item>
            ) : null}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              {isClassFile
                ? '职业使用专用等级成长矩阵，不再走当前平面属性保存链。'
                : '当前文件类型不支持平面基础属性字段，编辑器不会再写入 params。'}
            </div>
          )}
        </Card>

        <NotePanel embedded />

        {supportsProjectileConfig ? (
          <Card
            title="技能 / 物品弹道 / 迎击配置"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="text-xs text-gray-500 mb-4">
              这里维护技能/物品共用的结构化弹道与迎击字段，不再依赖 `meta.projectileId / skillProjectileTag / reactionSuccessRate / reactionPriority`。
              只要 `弹道模板 id {'>'} 0`，运行时就会把该技能或物品视为弹道宿主。
              `迎击类型` 含义与 `Zaun_ProjectileReaction.js` 保持一致：`0` 表示当前动作可作为迎击技能，`1` 表示当前动作发出的弹道可被迎击。物品现在也能发射并被迎击，但拦截动作本身仍来自敌人 `reactionSkillId` 或角色迎击武器绑定的反应技能。
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={ACTION_SEQUENCE_TYPE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">动作序列</span>}
                className="mb-0"
              >
                <Select
                  options={ACTION_SEQUENCE_TYPE_OPTIONS}
                  className="w-full"
                  placeholder="选择动作序列"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={ACTION_SEQUENCE_SCRIPT_KEY_FIELD_KEY}
                label={<span className="text-xs text-gray-400">自身脚本键</span>}
                className="mb-0"
              >
                <Select
                  options={currentActionSequenceScriptOptions}
                  className="w-full"
                  placeholder="选择自身动作序列脚本"
                  disabled={watchedActionSequenceType !== ACTION_SEQUENCE_TYPE_SELF}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={SKILL_PROJECTILE_ID_FIELD_KEY}
                label={<span className="text-xs text-gray-400">挂接弹道</span>}
                className="mb-0"
              >
                <Select
                  options={projectileOptions}
                  className="w-full"
                  placeholder="选择弹道模板"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={SKILL_PROJECTILE_TAG_FIELD_KEY}
                label={<span className="text-xs text-gray-400">迎击类型</span>}
                className="mb-0"
              >
                <Select
                  options={SKILL_PROJECTILE_TAG_OPTIONS}
                  className="w-full"
                  placeholder="选择迎击类型"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={SKILL_REACTION_SUCCESS_RATE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">迎击成功率</span>}
                className="mb-0"
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  style={{ width: '100%' }}
                  disabled={watchedSkillProjectileTag !== SKILL_PROJECTILE_TAG_INTERCEPTOR}
                />
              </Form.Item>
              <Form.Item
                name={SKILL_REACTION_PRIORITY_FIELD_KEY}
                label={<span className="text-xs text-gray-400">迎击优先级</span>}
                className="mb-0"
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  style={{ width: '100%' }}
                  disabled={watchedSkillProjectileTag !== SKILL_PROJECTILE_TAG_INTERCEPTOR}
                />
              </Form.Item>
            </div>
          </Card>
        ) : null}

        {isSkillFile && watchedActionSequenceType === ACTION_SEQUENCE_TYPE_WEAPON_ACTION ? (
          <Card
            title="技能武器动作配置"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'mode']}
                label={<span className="text-xs text-gray-400">武器触发</span>}
                className="mb-0"
              >
                <Select
                  options={SKILL_WEAPON_ACTION_MODE_OPTIONS}
                  className="w-full"
                  placeholder="选择触发方式"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'countMin']}
                label={<span className="text-xs text-gray-400">最少次数</span>}
                className="mb-0"
              >
                <InputNumber min={1} max={8} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'countMax']}
                label={<span className="text-xs text-gray-400">最多次数</span>}
                className="mb-0"
              >
                <InputNumber min={1} max={8} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'maxCount']}
                label={<span className="text-xs text-gray-400">硬上限</span>}
                className="mb-0"
              >
                <InputNumber min={1} max={8} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'ammoLimited']}
                label={<span className="text-xs text-gray-400">按弹药截断</span>}
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'requireCanLaunch']}
                label={<span className="text-xs text-gray-400">要求可发射</span>}
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'durabilityLossMin']}
                label={<span className="text-xs text-gray-400">耐久降低最小</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'durabilityLossMax']}
                label={<span className="text-xs text-gray-400">耐久降低最大</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_WEAPON_ACTION_FIELD_KEY, 'friendStateId']}
                label={<span className="text-xs text-gray-400">全员状态</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </Card>
        ) : null}

        {supportsProjectileConfig ? (
          <Card
            title={isItemFile ? '物品伤害 / 耐久协议' : '技能伤害 / 耐久协议'}
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="text-xs text-gray-500 mb-4">
              这里维护{isItemFile ? '物品' : '技能'}真实战斗语义的单一顶层协议 `skillEffectSpec`。伤害元素已纳入新协议，不再读取旧 `damage.elementId`。`formula` 支持基础通用公式与当前{isItemFile ? '物品' : '技能'}脚本两种来源，脚本模式仅列出当前{isItemFile ? '物品' : '技能'}脚本中导出 `damageFormula` 的键。
            </div>
            {isSkillFile ? (
              <div className="grid grid-cols-4 gap-x-4 gap-y-4 mb-4">
                <Form.Item
                  name={SKILL_LIMITS_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">使用次数上限</span>}
                  className="mb-0"
                >
                  <InputNumber min={-1} step={1} className="w-full" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name={SKILL_NEED_TARGET_SELECT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">需要目标选择</span>}
                  className="mb-0"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="需要" unCheckedChildren="不需要" />
                </Form.Item>
                <Form.Item
                  name={SKILL_NEED_WEAPON_SELECT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">需要武器选择</span>}
                  className="mb-0"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="需要" unCheckedChildren="不需要" />
                </Form.Item>
              </div>
            ) : null}
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'damageType']}
                label={<span className="text-xs text-gray-400">伤害类型</span>}
                className="mb-0"
              >
                <Select
                  options={SKILL_DAMAGE_TYPE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'damageElementId']}
                label={<span className="text-xs text-gray-400">伤害元素</span>}
                className="mb-0"
              >
                <Select
                  options={elementOptions}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'allowCritical']}
                label={<span className="text-xs text-gray-400">允许暴击</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="允许" unCheckedChildren="禁止" />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'damageScatter']}
                label={<span className="text-xs text-gray-400">伤害浮动分散度</span>}
                className="mb-0"
              >
                <InputNumber min={0} max={100} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'formula', 'mode']}
                label={<span className="text-xs text-gray-400">伤害公式来源</span>}
                className="mb-0"
              >
                <Select
                  options={SKILL_DAMAGE_FORMULA_MODE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'damage', 'formula', 'scriptKey']}
                label={<span className="text-xs text-gray-400">公式脚本键</span>}
                className="mb-0"
              >
                <Select
                  options={damageFormulaScriptOptions}
                  className="w-full"
                  placeholder="筛选当前技能脚本"
                  showSearch
                  optionFilterProp="label"
                  disabled={watchedDamageFormulaMode !== 'script'}
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'durabilityChange', 'mode']}
                label={<span className="text-xs text-gray-400">耐久度改变</span>}
                className="mb-0"
              >
                <Select
                  options={SKILL_DURABILITY_CHANGE_MODE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'durabilityChange', 'value']}
                label={<span className="text-xs text-gray-400">耐久度改变值</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[SKILL_EFFECT_SPEC_FIELD_KEY, 'skillDurability', 'halfBrokenSkipRate']}
                label={<span className="text-xs text-gray-400">低耐久跳过概率</span>}
                className="mb-0"
              >
                <InputNumber min={0} max={100} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
            </div>
            {watchedDamageFormulaMode === 'script' && isDamageFormulaScriptOptionsLoading ? (
              <div className="mt-3 text-xs text-gray-500">
                正在校验当前技能脚本的 `{DAMAGE_FORMULA_EXPORT_NAME}` 导出，请稍候。
              </div>
            ) : null}
            {watchedDamageFormulaMode === 'script' && !isDamageFormulaScriptOptionsLoading && damageFormulaScriptWarning ? (
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                message={`${projectileConfigSourceName}公式脚本配置异常`}
                description={damageFormulaScriptWarning}
              />
            ) : null}
          </Card>
        ) : null}

        {isSkillFile ? (
          <Form.List name={SKILL_COSTS_FIELD_KEY}>
            {(fields, { add, remove }) => (
              <Card
                title={(
                  <div className="flex justify-between items-center">
                    <span>技能消耗规则</span>
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => add(createEmptySkillCostEntry())}
                    >
                      添加消耗
                    </Button>
                  </div>
                )}
                className="mb-4"
                headStyle={{
                  backgroundColor: '#252b3d',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
                bodyStyle={{ backgroundColor: '#1a1f2e' }}
              >
                <div className="text-xs text-gray-500 mb-4">
                  所有消耗会并行生效并共同决定技能是否可释放。生命、金钱、变量使用 `value`，
                  物品/武器/防具使用目标 id + `amount`。
                </div>
                {fields.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                    当前没有技能消耗规则，技能只保留默认可用条件。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className="rounded border border-gray-700 bg-[#141a27] px-4 py-4"
                      >
                        <div className="grid grid-cols-4 gap-x-4 gap-y-4 items-end">
                          <Form.Item
                            name={[field.name, 'type']}
                            label={<span className="text-xs text-gray-400">消耗来源</span>}
                            className="mb-0"
                          >
                            <Select
                              options={SKILL_COST_TYPE_OPTIONS}
                              className="w-full"
                              placeholder="选择消耗来源"
                              showSearch
                              optionFilterProp="label"
                            />
                          </Form.Item>
                          {renderSkillCostConfigFields(field)}
                          <div className="flex justify-end">
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(field.name)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </Form.List>
        ) : null}

        {isEnemyFile ? (
          <Card
            title="敌人扩展"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="text-xs text-gray-500 mb-4">
              这里直接维护敌人顶层扩展字段。迎击能力使用结构化 `canReaction + reactionSkillId`，
              不再依赖备注或 meta 语义；保存时会保留敌人已有的 `note/meta` 内容。
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={ENEMY_CLASS_ID_FIELD_KEY}
                label={<span className="text-xs text-gray-400">敌人职业</span>}
                className="mb-0"
              >
                <Select
                  options={enemyClassOptions}
                  className="w-full"
                  placeholder="选择职业"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={ENEMY_LEVEL_FIELD_KEY}
                label={<span className="text-xs text-gray-400">等级</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={ENEMY_LEVEL_SCOPE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">等级下浮</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={ENEMY_LEVEL_SCOPE_UP_FIELD_KEY}
                label={<span className="text-xs text-gray-400">等级上浮</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={ENEMY_BOUNTY_FIELD_KEY}
                label={<span className="text-xs text-gray-400">赏金值</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY}
                label={<span className="text-xs text-gray-400">攻击动画</span>}
                className="mb-0"
              >
                <Select
                  options={enemyAnimationOptions}
                  className="w-full"
                  placeholder="选择攻击动画"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={ENEMY_CAN_REACTION_FIELD_KEY}
                label={<span className="text-xs text-gray-400">允许迎击</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="关闭" />
              </Form.Item>
              <Form.Item
                name={ENEMY_REACTION_SKILL_ID_FIELD_KEY}
                label={<span className="text-xs text-gray-400">迎击技能</span>}
                className="mb-0"
              >
                <Select
                  options={enemyReactionSkillOptions}
                  className="w-full"
                  placeholder="选择迎击技能"
                  disabled={!watchedEnemyCanReaction}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={ENEMY_IS_BOSS_FIELD_KEY}
                label={<span className="text-xs text-gray-400">是否 Boss</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="Boss" unCheckedChildren="普通" />
              </Form.Item>
              <Form.Item
                name={ENEMY_ALLOW_BREAK_FIELD_KEY}
                label={<span className="text-xs text-gray-400">允许破盾</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="关闭" />
              </Form.Item>
            </div>
          </Card>
        ) : null}

        {isEnemyFile ? (
          <EnemyActionOverridesCard
            enemy={(currentItem as RPGEnemy | null) ?? null}
            skillsData={skillsData}
            fieldKey={ENEMY_ACTION_OVERRIDES_FIELD_KEY}
          />
        ) : null}

        {renderEnemyChallengeCard()}

        {isStateFile ? (
          <>
            {renderOwnerParamsSection('战斗属性')}
            {renderStateChargeEditor()}
            <Card
              title="状态即时弱点效果"
              className="mb-4"
              headStyle={{
                backgroundColor: '#252b3d',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-accent)',
              }}
              bodyStyle={{ backgroundColor: '#1a1f2e' }}
            >
              <div className="text-xs text-gray-500 mb-4">
                这里只控制状态添加/移除时的一次性弱点操作。`切换弱点组` 写 `-1` 表示不切组，`0` 表示切回基础组，`1..n` 对应敌人的动态弱点组。
              </div>
              <div className="space-y-4">
                {renderStateWeaknessPhaseEditor('onAdd', '添加时触发', '状态首次附加到目标时执行，适合进入阶段、锁定弱点。')}
                {renderStateWeaknessPhaseEditor('onRemove', '移除时触发', '状态移除时执行，适合回到基础组或解除保护。')}
              </div>
            </Card>
          </>
        ) : null}

        {isEnemyFile ? (
          <>
            {enemyWeaknessDuplicateMessages.length > 0 ? (
              <Card
                className="mb-4"
                headStyle={{
                  backgroundColor: '#3a1f24',
                  borderBottom: '1px solid #7f1d1d',
                  color: '#fca5a5',
                }}
                bodyStyle={{ backgroundColor: '#24161b' }}
              >
                <div className="text-sm text-red-300 mb-2">弱点组存在重复元素，当前保存会被阻止。</div>
                <div className="space-y-1 text-xs text-red-200">
                  {enemyWeaknessDuplicateMessages.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              </Card>
            ) : null}
            {armorElementRateFields.length === 0 ? (
              <Card
                title="敌人弱点组"
                className="mb-4"
                headStyle={{
                  backgroundColor: '#252b3d',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
                bodyStyle={{ backgroundColor: '#1a1f2e' }}
              >
                <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                  当前系统没有可编辑元素，请先在 System.json 配置元素列表。
                </div>
              </Card>
            ) : (
              <>
                {renderWeaknessGroupCard(
                  '基础弱点组',
                  [ENEMY_BASE_WEAKNESS_GROUP_FIELD_KEY],
                  '基础组会作为 groupIndex=0 使用。这里是敌人弱点槽位，不是 owner 元素属性率；倍率写增量值，最终按 `1 + 增量` 结算，`0.3` 表示实际元素倍率为 `1.3`，`-0.2` 表示实际元素倍率为 `0.8`。',
                  '当前没有基础弱点，敌人将不会显示弱点槽位。',
                )}
                <Form.List name={ENEMY_DYNAMIC_WEAKNESS_GROUPS_FIELD_KEY}>
                  {(fields, { add, remove }) => (
                    <Card
                      title={(
                        <div className="flex justify-between items-center">
                          <span>动态弱点组</span>
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => add(createEmptyEnemyWeaknessGroup())}
                          >
                            添加弱点组
                          </Button>
                        </div>
                      )}
                      className="mb-4"
                      headStyle={{
                        backgroundColor: '#252b3d',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-accent)',
                      }}
                      bodyStyle={{ backgroundColor: '#1a1f2e' }}
                    >
                      <div className="text-xs text-gray-500 mb-4">
                        动态组从 `groupIndex=1` 开始。这里同样是敌人弱点槽位，不是 owner 元素属性率；后续状态/技能即时效果会直接切到这些组，并同步刷新该组盾上限。
                      </div>
                      {fields.length === 0 ? (
                        <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                          当前没有动态弱点组，敌人只会使用基础组。
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {fields.map((field, index) => renderDynamicWeaknessGroupEditor(field, index, remove))}
                        </div>
                      )}
                    </Card>
                  )}
                </Form.List>
              </>
            )}
          </>
        ) : null}

        {supportsCommonRange ? (
          <Card
            title="OTB 顺位规则"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="text-xs text-gray-500 mb-4">
              这里直接维护技能/物品的结构化 `orderEffects` 字段，后续 OTB 运行时将直接读取，不再依赖备注正则。正数表示提前，负数表示延后；`targetCurrent` 改目标本回合，`targetNext` 改目标下回合，`targetFollow` 只会让 `targetNext` 在目标仍留在当前队列时改写到本回合。`userNext / speedConvert` 只影响使用者下回合顺位，不负责新增行动机会；状态结束后新增一动请改上面的“状态蓄力配置”。
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={[ORDER_EFFECTS_FIELD_KEY, 'userNext']}
                label={<span className="text-xs text-gray-400">自身下回合偏移</span>}
                className="mb-0"
              >
                <InputNumber step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[ORDER_EFFECTS_FIELD_KEY, 'targetCurrent']}
                label={<span className="text-xs text-gray-400">目标本回合偏移</span>}
                className="mb-0"
              >
                <InputNumber step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[ORDER_EFFECTS_FIELD_KEY, 'targetNext']}
                label={<span className="text-xs text-gray-400">目标下回合偏移</span>}
                className="mb-0"
              >
                <InputNumber step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[ORDER_EFFECTS_FIELD_KEY, 'speedConvert']}
                label={<span className="text-xs text-gray-400">速度换算</span>}
                className="mb-0"
              >
                <InputNumber step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={[ORDER_EFFECTS_FIELD_KEY, 'targetFollow']}
                label={<span className="text-xs text-gray-400">目标跟随当前回合</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="跟随" unCheckedChildren="独立" />
              </Form.Item>
            </div>
          </Card>
        ) : null}

        {supportsCommonRange ? (
          <Card
            title="技能/物品范围规则"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={TARGET_CAMP_FIELD_KEY}
                label={<span className="text-xs text-gray-400">目标阵营</span>}
                className="mb-0"
              >
                <Select
                  options={TARGET_CAMP_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={TARGET_LIFE_STATE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">目标状态</span>}
                className="mb-0"
              >
                <Select
                  options={TARGET_LIFE_STATE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={TARGET_TYPE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">作用目标类型</span>}
                className="mb-0"
              >
                <Select
                  options={TARGET_TYPE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={SELECT_MODE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">选中方式</span>}
                className="mb-0"
              >
                <Select
                  options={SELECT_MODE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                name={AREA_MODE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">范围模式</span>}
                className="mb-0"
              >
                <Select
                  options={AREA_MODE_OPTIONS}
                  className="w-full"
                  disabled={watchedTargetCamp === 3 || watchedTargetCamp === 4 || watchedSelectMode === 2}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              {shouldShowCommonShapeSelect ? (
                <Form.Item
                  name={SHAPE_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">形状类型</span>}
                  className="mb-0"
                >
                  <Select
                    options={AREA_SHAPE_TYPE_OPTIONS}
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              ) : null}
              {shouldShowCommonTargetCount ? (
                <Form.Item
                  name={AREA_TARGET_COUNT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">范围几体</span>}
                  className="mb-0"
                >
                  <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
                </Form.Item>
              ) : null}
              <Form.Item
                name={REPEAT_TIME_FIELD_KEY}
                label={<span className="text-xs text-gray-400">重复次数</span>}
                className="mb-0"
              >
                <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={REPEAT_TIME_FLOAT_FIELD_KEY}
                label={<span className="text-xs text-gray-400">重复次数浮动</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
            </div>
            {shouldShowCommonShapeSection ? (
              <div className="mt-4">
                {renderShapeParamsEditor()}
              </div>
            ) : null}
          </Card>
        ) : null}

        {isWeaponItem ? (
          <Card
            title="武器范围规则"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={AREA_OVERRIDE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">覆盖技能范围</span>}
                className="mb-0"
              >
                <Select
                  options={AREA_OVERRIDE_OPTIONS}
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              {shouldShowWeaponConfig ? (
                <Form.Item
                  name={AREA_MODE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器范围模式</span>}
                  className="mb-0"
                >
                  <Select
                    options={AREA_MODE_OPTIONS}
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              ) : null}
              {shouldShowWeaponShapeSelect ? (
                <Form.Item
                  name={SHAPE_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器形状</span>}
                  className="mb-0"
                >
                  <Select
                    options={AREA_SHAPE_TYPE_OPTIONS}
                    className="w-full"
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              ) : null}
              {shouldShowWeaponTargetCount ? (
                <Form.Item
                  name={AREA_TARGET_COUNT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器几体</span>}
                  className="mb-0"
                >
                  <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
                </Form.Item>
              ) : null}
              <Form.Item
                name={REPEAT_TIME_FIELD_KEY}
                label={<span className="text-xs text-gray-400">武器重复次数</span>}
                className="mb-0"
              >
                <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={REPEAT_TIME_FLOAT_FIELD_KEY}
                label={<span className="text-xs text-gray-400">重复次数浮动</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} />
              </Form.Item>
            </div>
            {shouldShowWeaponShapeSection ? (
              <div className="mt-4">
                {renderShapeParamsEditor()}
              </div>
            ) : null}
          </Card>
        ) : null}

        {isArmorItem ? (
          <Card
            title="元素属性率"
            className="mb-4"
            headStyle={{
              backgroundColor: '#252b3d',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-accent)',
            }}
            bodyStyle={{ backgroundColor: '#1a1f2e' }}
          >
            <div className="text-xs text-gray-500 mb-4">
              这里维护防具自身提供的固定元素属性率与浮动值。正数表示穿上后更脆，受到该元素伤害增加；负数表示抗性，受到该元素伤害减少。基础值 0.2 表示 +20%，-0.2 表示 -20%；浮动 0.05 表示在该基础上再做 ±5% 变化。索引 0 固定为 0，不在面板中编辑。
            </div>
            {armorElementRateFields.length === 0 ? (
              <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
                当前系统没有可编辑元素，请先在 System.json 配置元素列表。
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-4 gap-y-4">
                {armorElementRateFields.map((field) => (
                  <div key={`armor-element-rate-${field.id}`} className="contents">
                    <Form.Item
                      name={[ELEMENT_RATES_FIELD_KEY, field.id]}
                      label={<span className="text-xs text-gray-400">{field.label} 值</span>}
                      className="mb-0"
                    >
                      <InputNumber step={0.01} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name={[ELEMENT_RATE_FLOATS_FIELD_KEY, field.id]}
                      label={<span className="text-xs text-gray-400">{field.label} 浮动</span>}
                      className="mb-0"
                    >
                      <InputNumber min={0} step={0.01} className="w-full" style={{ width: '100%' }} />
                    </Form.Item>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {renderPassiveStatesCard()}

        {supportsOwnerParams && !isStateFile ? renderOwnerParamsSection() : null}

        {supportsTemplateParams ? renderFixedParamCard(
          '额外统一属性',
          'extraParams',
          EXTRA_PARAM_FIELDS,
          '固定维护命中、回避、暴击、暴伤、迎击与最终伤害。未强化值是装备当前提供的数值；每级强化追加是强化结算时按等级叠加的增量。',
        ) : null}

        {supportsTemplateParams ? renderFixedParamCard(
          '车属性',
          'vehicleParams',
          VEHICLE_PARAM_FIELDS,
          '固定维护重量、承重、载重、耐久、弹舱、弹药价格和连发。未强化值是装备当前提供的数值；每级强化追加是强化结算时按等级叠加的增量。',
        ) : null}

        {supportsTemplateParams ? renderFixedParamCard(
          '基础强化',
          'upgradeParams',
          UPGRADE_PARAM_DISPLAY_FIELDS,
          '承接装备强化相关固定字段。配置值记录强化次数、攻击力、防御力这些强化参数本身；每级追加记录该参数随强化等级继续叠加的增量。',
          UPGRADE_PARAM_COLUMN_LABELS,
        ) : null}

        {supportsTemplateParams ? renderUpgradeCostsCard() : null}
      </Form>

      <Card
        title={
          <div className="flex justify-between items-center">
            <span>效果引用</span>
            <Space>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={addEffectReference}
                disabled={effectOptions.length === 0}
              >
                添加
              </Button>
            </Space>
          </div>
        }
        className="mb-4"
        headStyle={{
          backgroundColor: '#252b3d',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
        bodyStyle={{ backgroundColor: '#1a1f2e' }}
      >
        <div className="grid grid-cols-1 gap-y-3">
          <div className="text-xs text-gray-500">
            当前条目只保存效果 id 引用，效果内容请在 Effects.json 的效果模式下编辑。
          </div>
          {effectIds.length === 0 ? (
            <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
              当前没有效果引用，点击右上角“添加”新增一条。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {effectIds.map((effectId, index) => (
                <div key={`${effectId}-${index}`} className="flex gap-2 items-center">
                  <Select
                    value={effectId}
                    options={effectOptions}
                    onChange={(value) => updateEffectReference(index, value)}
                    placeholder="选择要挂接的效果"
                    className="w-full"
                    optionFilterProp="label"
                    showSearch
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeEffectReference(index)}
                  />
                </div>
              ))}
            </div>
          )}
          {effectIds.length > 0 && effectIds.length !== normalizedEffectIds.length ? (
            <div className="text-xs text-gray-500">
              当前列表里存在重复效果 id，保存时会自动去重。
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        title={
          <div className="flex justify-between items-center">
            <span>自定义属性（保留）</span>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={addCustomField}
            >
              添加
            </Button>
          </div>
        }
        headStyle={{
          backgroundColor: '#252b3d',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
        bodyStyle={{ backgroundColor: '#1a1f2e' }}
      >
        <div className="text-xs text-gray-500 mb-4">
          这里只保留非业务扩展字段。命中、回避、暴击、暴伤、载重、承重、连发、弹舱等固定属性请改上方模板。
        </div>
        {customFields.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无自定义属性</p>
        ) : (
          <Space direction="vertical" className="w-full">
            <div className="flex gap-2 items-center px-1">
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                名称（第1列）
              </span>
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                数值（第2列）
              </span>
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                浮动数值（第3列）
              </span>
              <span className="text-xs text-gray-400" style={{ width: 32 }}>
                操作
              </span>
            </div>
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="名称"
                  value={field.name}
                  onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                  style={{ flex: 1 }}
                  aria-label="自定义属性名称"
                />
                <Input
                  type="number"
                  placeholder="数值"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', Number(e.target.value))}
                  style={{ flex: 1 }}
                  aria-label="自定义属性数值"
                />
                <Input
                  type="number"
                  placeholder="浮动数值"
                  value={field.floatValue}
                  onChange={(e) => updateCustomField(index, 'floatValue', Number(e.target.value))}
                  style={{ flex: 1 }}
                  aria-label="自定义属性浮动数值"
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeCustomField(index)}
                />
              </div>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}

export default PropertyPanel;
