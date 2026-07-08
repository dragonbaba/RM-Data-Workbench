import type {
  EquipExtraParamMap,
  EquipUpgradeCostEntry,
  EquipUpgradeParamMap,
  EquipVehicleParamMap,
  ParamTemplate,
  RPGItem,
} from '../types';
import { extractSystemRecord } from './DataFileFormatService';
import { normalizeEquipmentQualityFields } from './EquipmentQualityProtocolService';
import { getExpectedWeaponEquipTypeByWtypeId } from './EquipExtensionsService';
import { normalizeWeaponRangeValues } from './RangePropertyService';
import {
  EQUIP_EXTRA_PARAM_KEYS,
  EQUIP_UPGRADE_PARAM_KEYS,
  EQUIP_VEHICLE_PARAM_KEYS,
} from '../types';

interface FixedParamFieldDefinition {
  index: number;
  key: string;
  label: string;
}

interface EquipmentNormalizationOptions {
  isWeapon?: boolean;
  isArmor?: boolean;
  systemData?: unknown;
  syncWeaponEquipTypeId?: boolean;
  syncArmorHeadingEquipTypeId?: boolean;
}

const DEFAULT_FLOAT_PARAM_LENGTH = 8;
const TANK_HIDDEN_ATTACK_SKILL_EQUIP_TYPES = new Set([8, 9]);
const AMMO_CAPACITY_FIELD_INDEX = 4;
const TANK_SECONDARY_WEAPON_TYPE_ID = 2;
const WEAPON_INTERCEPTABLE_MODES = new Set([-1, 0, 1]);

const ARMOR_HEADING_EQUIP_TYPE_ID_BY_NAME = Object.freeze({
  '-头': 2,
  '--发动机': 7,
  '--引擎': 7,
  '--C装置': 8,
  '--c装置': 8,
  '--底盘': 9,
  '-手': 3,
  '-身': 4,
  '-足': 5,
  '-饰品': 6,
});
const EMPTY_PARAM_TEMPLATE: ParamTemplate = Object.freeze({
  value: 0,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

const EMPTY_UPGRADE_COST_ENTRY: EquipUpgradeCostEntry = Object.freeze({
  successRate: 100,
  goldCost: 0,
  requiredItemId: 0,
  requiredItemAmount: 0,
  protectItemId: 0,
  protectItemAmount: 0,
});

const DEFAULT_UPGRADE_COST_TEMPLATES: readonly EquipUpgradeCostEntry[] = Object.freeze([
  { successRate: 95, goldCost: 320, requiredItemId: 90, requiredItemAmount: 5, protectItemId: 162, protectItemAmount: 1 },
  { successRate: 90, goldCost: 400, requiredItemId: 90, requiredItemAmount: 7, protectItemId: 162, protectItemAmount: 1 },
  { successRate: 85, goldCost: 500, requiredItemId: 90, requiredItemAmount: 9, protectItemId: 162, protectItemAmount: 1 },
  { successRate: 80, goldCost: 625, requiredItemId: 90, requiredItemAmount: 12, protectItemId: 162, protectItemAmount: 2 },
  { successRate: 75, goldCost: 781, requiredItemId: 90, requiredItemAmount: 15, protectItemId: 162, protectItemAmount: 2 },
  { successRate: 70, goldCost: 1200, requiredItemId: 90, requiredItemAmount: 25, protectItemId: 162, protectItemAmount: 3 },
  { successRate: 66, goldCost: 2400, requiredItemId: 90, requiredItemAmount: 27, protectItemId: 162, protectItemAmount: 3 },
  { successRate: 60, goldCost: 2800, requiredItemId: 90, requiredItemAmount: 30, protectItemId: 162, protectItemAmount: 3 },
  { successRate: 55, goldCost: 3600, requiredItemId: 90, requiredItemAmount: 35, protectItemId: 162, protectItemAmount: 4 },
  { successRate: 50, goldCost: 4000, requiredItemId: 150, requiredItemAmount: 5, protectItemId: 162, protectItemAmount: 4 },
  { successRate: 48, goldCost: 4200, requiredItemId: 150, requiredItemAmount: 7, protectItemId: 163, protectItemAmount: 1 },
  { successRate: 46, goldCost: 4600, requiredItemId: 150, requiredItemAmount: 10, protectItemId: 163, protectItemAmount: 2 },
  { successRate: 44, goldCost: 5000, requiredItemId: 150, requiredItemAmount: 15, protectItemId: 163, protectItemAmount: 2 },
  { successRate: 42, goldCost: 7500, requiredItemId: 150, requiredItemAmount: 20, protectItemId: 163, protectItemAmount: 3 },
  { successRate: 40, goldCost: 9200, requiredItemId: 151, requiredItemAmount: 5, protectItemId: 163, protectItemAmount: 3 },
  { successRate: 38, goldCost: 10800, requiredItemId: 151, requiredItemAmount: 10, protectItemId: 163, protectItemAmount: 4 },
  { successRate: 35, goldCost: 12400, requiredItemId: 151, requiredItemAmount: 16, protectItemId: 163, protectItemAmount: 4 },
  { successRate: 32, goldCost: 15200, requiredItemId: 151, requiredItemAmount: 20, protectItemId: 163, protectItemAmount: 6 },
  { successRate: 29, goldCost: 18600, requiredItemId: 152, requiredItemAmount: 12, protectItemId: 164, protectItemAmount: 2 },
  { successRate: 25, goldCost: 22500, requiredItemId: 152, requiredItemAmount: 22, protectItemId: 164, protectItemAmount: 5 },
  { successRate: 22, goldCost: 26300, requiredItemId: 152, requiredItemAmount: 30, protectItemId: 164, protectItemAmount: 5 },
  { successRate: 18, goldCost: 30000, requiredItemId: 152, requiredItemAmount: 36, protectItemId: 164, protectItemAmount: 3 },
  { successRate: 16, goldCost: 35600, requiredItemId: 168, requiredItemAmount: 10, protectItemId: 165, protectItemAmount: 1 },
  { successRate: 14, goldCost: 39200, requiredItemId: 168, requiredItemAmount: 15, protectItemId: 165, protectItemAmount: 1 },
  { successRate: 12, goldCost: 46500, requiredItemId: 168, requiredItemAmount: 20, protectItemId: 165, protectItemAmount: 2 },
  { successRate: 10, goldCost: 56000, requiredItemId: 168, requiredItemAmount: 25, protectItemId: 166, protectItemAmount: 1 },
  { successRate: 8, goldCost: 67000, requiredItemId: 169, requiredItemAmount: 5, protectItemId: 166, protectItemAmount: 1 },
  { successRate: 6, goldCost: 78000, requiredItemId: 169, requiredItemAmount: 10, protectItemId: 166, protectItemAmount: 3 },
  { successRate: 4, goldCost: 99000, requiredItemId: 169, requiredItemAmount: 15, protectItemId: 166, protectItemAmount: 5 },
  { successRate: 3, goldCost: 120000, requiredItemId: 169, requiredItemAmount: 20, protectItemId: 166, protectItemAmount: 10 },
  { successRate: 2.8, goldCost: 123000, requiredItemId: 183, requiredItemAmount: 22, protectItemId: 166, protectItemAmount: 12 },
  { successRate: 2.7, goldCost: 135000, requiredItemId: 183, requiredItemAmount: 22, protectItemId: 167, protectItemAmount: 13 },
  { successRate: 2.6, goldCost: 146000, requiredItemId: 183, requiredItemAmount: 23, protectItemId: 167, protectItemAmount: 15 },
  { successRate: 2.5, goldCost: 148000, requiredItemId: 183, requiredItemAmount: 25, protectItemId: 167, protectItemAmount: 15 },
  { successRate: 2.3, goldCost: 156000, requiredItemId: 183, requiredItemAmount: 27, protectItemId: 167, protectItemAmount: 16 },
  { successRate: 2.2, goldCost: 165000, requiredItemId: 183, requiredItemAmount: 28, protectItemId: 167, protectItemAmount: 18 },
  { successRate: 2, goldCost: 178000, requiredItemId: 183, requiredItemAmount: 29, protectItemId: 167, protectItemAmount: 19 },
  { successRate: 1.5, goldCost: 192000, requiredItemId: 183, requiredItemAmount: 30, protectItemId: 167, protectItemAmount: 22 },
  { successRate: 1.2, goldCost: 201000, requiredItemId: 183, requiredItemAmount: 35, protectItemId: 167, protectItemAmount: 26 },
  { successRate: 1, goldCost: 223000, requiredItemId: 183, requiredItemAmount: 40, protectItemId: 167, protectItemAmount: 30 },
]);

export const EXTRA_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { index: 0, key: EQUIP_EXTRA_PARAM_KEYS[0], label: '迎击率' },
  { index: 1, key: EQUIP_EXTRA_PARAM_KEYS[1], label: '回避率' },
  { index: 2, key: EQUIP_EXTRA_PARAM_KEYS[2], label: '暴击率' },
  { index: 3, key: EQUIP_EXTRA_PARAM_KEYS[3], label: '暴伤' },
  { index: 4, key: EQUIP_EXTRA_PARAM_KEYS[4], label: '命中率' },
  { index: 5, key: EQUIP_EXTRA_PARAM_KEYS[5], label: '最终伤害' },
];

export const VEHICLE_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { index: 0, key: EQUIP_VEHICLE_PARAM_KEYS[0], label: '重量' },
  { index: 1, key: EQUIP_VEHICLE_PARAM_KEYS[1], label: '承重' },
  { index: 2, key: EQUIP_VEHICLE_PARAM_KEYS[2], label: '载重' },
  { index: 3, key: EQUIP_VEHICLE_PARAM_KEYS[3], label: '耐久度' },
  { index: 4, key: EQUIP_VEHICLE_PARAM_KEYS[4], label: '弹舱' },
  { index: 5, key: EQUIP_VEHICLE_PARAM_KEYS[5], label: '弹药价格' },
  { index: 6, key: EQUIP_VEHICLE_PARAM_KEYS[6], label: '连发' },
];

export const COMPLETE_VEHICLE_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  ...VEHICLE_PARAM_FIELDS,
  { index: 7, key: EQUIP_VEHICLE_PARAM_KEYS[7], label: '发射期连发' },
];

export const UPGRADE_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { index: 0, key: EQUIP_UPGRADE_PARAM_KEYS[0], label: '强化次数' },
  { index: 1, key: EQUIP_UPGRADE_PARAM_KEYS[1], label: '强化攻击力' },
  { index: 2, key: EQUIP_UPGRADE_PARAM_KEYS[2], label: '强化防御力' },
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};
export const getExpectedWeaponEquipTypeId = (item: unknown): number | null => {
  if (!isRecord(item) || !hasOwn(item, 'wtypeId')) return null;
  return getExpectedWeaponEquipTypeByWtypeId(item.wtypeId);
};

export const getExpectedArmorEquipTypeId = (item: unknown): number | null => {
  if (!isRecord(item) || !hasOwn(item, 'atypeId')) return null;
  if (toIntOrZero(item.atypeId) !== 0) return null;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const expected = ARMOR_HEADING_EQUIP_TYPE_ID_BY_NAME[name as keyof typeof ARMOR_HEADING_EQUIP_TYPE_ID_BY_NAME];
  return typeof expected === 'number' ? expected : null;
};

const toFloatOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
};

const normalizeWeaponImageId = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  return numeric >= 1 ? numeric : 1;
};
const normalizeFloatParams = (value: unknown): number[] => {
  const source = Array.isArray(value) ? value : [];
  const normalized = new Array<number>(DEFAULT_FLOAT_PARAM_LENGTH).fill(0);
  for (let index = 0; index < DEFAULT_FLOAT_PARAM_LENGTH; index++) {
    normalized[index] = toFloatOrZero(source[index]);
  }
  return normalized;
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeParamTemplate = (value: unknown): ParamTemplate => {
  if (!isRecord(value)) {
    return { ...EMPTY_PARAM_TEMPLATE };
  }

  return {
    value: toFloatOrZero(value.value),
    floatValue: toFloatOrZero(value.floatValue),
    upgradeValue: toFloatOrZero(value.upgradeValue),
    upgradeFloatValue: toFloatOrZero(value.upgradeFloatValue),
  };
};

const hasParamGroupField = (
  value: unknown,
  fields: FixedParamFieldDefinition[],
  fieldIndex: number,
): boolean => {
  const field = fields[fieldIndex];
  if (!field) return false;
  if (Array.isArray(value)) return isRecord(value[fieldIndex]);
  return isRecord(value) && hasOwn(value, field.key);
};

const shouldDefaultMissingAmmoCapacityToInfinite = (item: Record<string, unknown>): boolean => {
  return toIntOrZero(item.wtypeId) === TANK_SECONDARY_WEAPON_TYPE_ID;
};

const getDefaultUpgradeSuccessRate = (index: number): number => {
  const nextLevel = Math.max(1, index + 1);
  return Math.min(100, Math.max(0, 100 / nextLevel));
};

const normalizeSuccessRate = (value: unknown, index: number): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return getDefaultUpgradeSuccessRate(index);
  }
  return Math.min(100, Math.max(0, numeric));
};

const normalizeUpgradeCostEntry = (value: unknown, index: number): EquipUpgradeCostEntry => {
  if (!isRecord(value)) {
    return {
      ...EMPTY_UPGRADE_COST_ENTRY,
      successRate: getDefaultUpgradeSuccessRate(index),
    };
  }

  const requiredItemId = Math.max(0, toIntOrZero(value.requiredItemId));
  const protectItemId = Math.max(0, toIntOrZero(value.protectItemId));
  return {
    successRate: normalizeSuccessRate(value.successRate, index),
    goldCost: Math.max(0, toIntOrZero(value.goldCost)),
    requiredItemId,
    requiredItemAmount: requiredItemId > 0 ? Math.max(1, toIntOrZero(value.requiredItemAmount)) : 0,
    protectItemId,
    protectItemAmount: protectItemId > 0 ? Math.max(1, toIntOrZero(value.protectItemAmount)) : 0,
  };
};

export const normalizeEquipUpgradeCosts = (value: unknown): EquipUpgradeCostEntry[] => {
  const source = Array.isArray(value) ? value : [];
  const normalized = new Array<EquipUpgradeCostEntry>(source.length);

  for (let index = 0; index < source.length; index++) {
    normalized[index] = normalizeUpgradeCostEntry(source[index], index);
  }

  return normalized;
};

export const createEquipUpgradeCostTemplateEntry = (index: number): EquipUpgradeCostEntry => {
  const template = DEFAULT_UPGRADE_COST_TEMPLATES[index];
  if (template) return { ...template };
  return {
    ...EMPTY_UPGRADE_COST_ENTRY,
    successRate: getDefaultUpgradeSuccessRate(index),
  };
};

const readUpgradeTimesTemplate = (upgradeParams: unknown): ParamTemplate => {
  if (Array.isArray(upgradeParams)) {
    return normalizeParamTemplate(upgradeParams[0]);
  }
  if (isRecord(upgradeParams) && hasOwn(upgradeParams, EQUIP_UPGRADE_PARAM_KEYS[0])) {
    return normalizeParamTemplate(upgradeParams[EQUIP_UPGRADE_PARAM_KEYS[0]]);
  }
  return { ...EMPTY_PARAM_TEMPLATE };
};

export const resolveEquipUpgradeCostTargetCount = (upgradeParams: unknown): number => {
  const times = readUpgradeTimesTemplate(upgradeParams);
  const baseTimes = Math.max(0, toIntOrZero(times.value));
  const floatTimes = Math.max(0, toIntOrZero(times.floatValue));
  return baseTimes + floatTimes;
};
export const normalizeEquipmentRevertTimes = (value: unknown, upgradeParams: unknown): number => {
  const upgradeCap = resolveEquipUpgradeCostTargetCount(upgradeParams);
  let fallback = 0;
  if (upgradeCap >= 40) {
    fallback = 3;
  } else if (upgradeCap >= 35) {
    fallback = 2;
  } else if (upgradeCap > 0) {
    fallback = 1;
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const trimmedValue = typeof value === 'string' ? value.trim() : null;
  const numeric = typeof value === 'number'
    ? value
    : (trimmedValue ? Number(trimmedValue) : Number.NaN);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.trunc(numeric);
};

export const buildEquipUpgradeCostsForLimit = (
  value: unknown,
  targetCount: number,
  templateValue?: unknown,
): EquipUpgradeCostEntry[] => {
  const count = Math.max(0, toIntOrZero(targetCount));
  if (count === 0) return [];
  const source = normalizeEquipUpgradeCosts(value);
  const template = normalizeEquipUpgradeCosts(templateValue);
  const normalized = new Array<EquipUpgradeCostEntry>(count);

  for (let index = 0; index < count; index++) {
    normalized[index] = source[index]
      ? { ...source[index] }
      : (template[index] ? { ...template[index] } : createEquipUpgradeCostTemplateEntry(index));
  }

  return normalized;
};

const normalizeParamGroup = <T extends ParamTemplate[]>(
  value: unknown,
  fields: FixedParamFieldDefinition[],
): T => {
  const sourceArray = Array.isArray(value) ? value : null;
  const sourceRecord = sourceArray ? null : (isRecord(value) ? value : null);
  const normalized: ParamTemplate[] = new Array(fields.length);

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    normalized[index] = sourceArray
      ? normalizeParamTemplate(sourceArray[index])
      : (sourceRecord && hasOwn(sourceRecord, field.key)
        ? normalizeParamTemplate(sourceRecord[field.key])
        : { ...EMPTY_PARAM_TEMPLATE });
  }

  return normalized as T;
};

const shouldUseHiddenAttackSkillField = (item: { etypeId?: unknown }): boolean => {
  return TANK_HIDDEN_ATTACK_SKILL_EQUIP_TYPES.has(Math.max(0, toIntOrZero(item.etypeId)));
};

const getElementRateFieldDefinitions = (systemData: unknown): Array<{ id: number }> => {
  const systemRecord = extractSystemRecord(systemData);
  if (!systemRecord || !Array.isArray(systemRecord.elements)) {
    return [];
  }

  const result: Array<{ id: number }> = [];
  for (let index = 1; index < systemRecord.elements.length; index++) {
    result.push({ id: index });
  }
  return result;
};

export const normalizeArmorElementRates = (value: unknown, systemData: unknown): number[] => {
  const fields = getElementRateFieldDefinitions(systemData);
  const source = Array.isArray(value) ? value : [];
  const normalized = new Array<number>(Math.max(1, fields.length + 1)).fill(0);

  for (const field of fields) {
    normalized[field.id] = toFloatOrZero(source[field.id]);
  }

  return normalized;
};

const normalizeWeaponInterceptableMode = (value: unknown): -1 | 0 | 1 => {
  if (value === undefined || value === null || value === '') return -1;
  const mode = toIntOrZero(value);
  return WEAPON_INTERCEPTABLE_MODES.has(mode) ? mode as -1 | 0 | 1 : -1;
};

export const normalizeArmorElementRateFloats = (value: unknown, systemData: unknown): number[] => {
  const fields = getElementRateFieldDefinitions(systemData);
  const source = Array.isArray(value) ? value : [];
  const normalized = new Array<number>(Math.max(1, fields.length + 1)).fill(0);

  for (const field of fields) {
    normalized[field.id] = Math.max(0, toFloatOrZero(source[field.id]));
  }

  return normalized;
};

export function normalizeEquipmentDataEntry(
  item: unknown,
  options: EquipmentNormalizationOptions = {},
): RPGItem | null {
  if (!isRecord(item)) return null;

  const normalized: RPGItem = {
    ...(item as unknown as RPGItem),
    floatParams: normalizeFloatParams(item.floatParams),
  };

  if (options.isWeapon || options.isArmor) {
    const hasAmmoCapacity = hasParamGroupField(
      item.vehicleParams,
      COMPLETE_VEHICLE_PARAM_FIELDS,
      AMMO_CAPACITY_FIELD_INDEX,
    );
    normalized.extraParams = normalizeParamGroup<EquipExtraParamMap>(item.extraParams, EXTRA_PARAM_FIELDS);
    normalized.vehicleParams = normalizeParamGroup<EquipVehicleParamMap>(
      item.vehicleParams,
      COMPLETE_VEHICLE_PARAM_FIELDS,
    );
    if (options.isWeapon && !hasAmmoCapacity && shouldDefaultMissingAmmoCapacityToInfinite(item)) {
      normalized.vehicleParams[AMMO_CAPACITY_FIELD_INDEX].value = -1;
    }
    normalized.upgradeParams = normalizeParamGroup<EquipUpgradeParamMap>(item.upgradeParams, UPGRADE_PARAM_FIELDS);
    normalized.upgradeCosts = normalizeEquipUpgradeCosts(item.upgradeCosts);
    normalized.revertTimes = normalizeEquipmentRevertTimes(item.revertTimes, normalized.upgradeParams);
    Object.assign(normalized, normalizeEquipmentQualityFields(item));
  }

  if (options.isArmor) {
    if (options.syncArmorHeadingEquipTypeId) {
      const expectedEquipTypeId = getExpectedArmorEquipTypeId(item);
      if (expectedEquipTypeId !== null) {
        normalized.etypeId = expectedEquipTypeId;
      }
    }
    normalized.elementRates = normalizeArmorElementRates(item.elementRates, options.systemData);
    normalized.elementRateFloats = normalizeArmorElementRateFloats(item.elementRateFloats, options.systemData);
    if (shouldUseHiddenAttackSkillField(normalized)) {
      normalized.hiddenAttackSkillId = Math.max(0, toIntOrZero(item.hiddenAttackSkillId));
    } else {
      delete normalized.hiddenAttackSkillId;
    }
  }

  if (options.isWeapon) {
    if (options.syncWeaponEquipTypeId) {
      const expectedEquipTypeId = getExpectedWeaponEquipTypeId(item);
      if (expectedEquipTypeId !== null) {
        normalized.etypeId = expectedEquipTypeId;
      }
    }
    const rangeValues = normalizeWeaponRangeValues(item);
    normalized.attackSkillId = Math.max(0, toIntOrZero(item.attackSkillId));
    normalized.interceptableMode = normalizeWeaponInterceptableMode(item.interceptableMode);
    delete (normalized as unknown as Record<string, unknown>).attackElementId;
    normalized.weaponImageId = normalizeWeaponImageId(item.weaponImageId);
    delete normalized.elementRates;
    delete normalized.elementRateFloats;
    normalized.areaOverride = rangeValues.areaOverride;
    normalized.areaMode = rangeValues.areaMode;
    normalized.shapeType = rangeValues.shapeType;
    normalized.areaTargetCount = rangeValues.areaTargetCount;
    normalized.shapeParams = rangeValues.shapeParams;
    normalized.repeatTime = rangeValues.repeatTime;
    normalized.repeatTimeFloat = rangeValues.repeatTimeFloat;
  }

  return normalized;
}
