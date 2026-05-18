import type {
  EquipExtraParamMap,
  EquipUpgradeCostEntry,
  EquipUpgradeParamMap,
  EquipVehicleParamMap,
  ParamTemplate,
  RPGItem,
} from '../types';
import { extractSystemRecord } from './DataFileFormatService';
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
}

const DEFAULT_FLOAT_PARAM_LENGTH = 8;
const TANK_HIDDEN_ATTACK_SKILL_EQUIP_TYPES = new Set([8, 9]);
const AMMO_CAPACITY_FIELD_INDEX = 4;
const TANK_SECONDARY_WEAPON_TYPE_ID = 2;

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

const toFloatOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
};

const normalizeWeaponImageId = (value: unknown): number => {
  const numeric = toIntOrZero(value);
  return numeric >= 1 ? numeric : 1;
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

const shouldUseHiddenAttackSkillField = (item: Record<string, unknown>): boolean => {
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

export const normalizeArmorElementRateFloats = (value: unknown, systemData: unknown): number[] => {
  const fields = getElementRateFieldDefinitions(systemData);
  const source = Array.isArray(value) ? value : [];
  const normalized = new Array<number>(Math.max(1, fields.length + 1)).fill(0);

  for (const field of fields) {
    normalized[field.id] = Math.max(0, toFloatOrZero(source[field.id]));
  }

  return normalized;
};

const normalizeFloatParams = (value: unknown): number[] => {
  const source = Array.isArray(value) ? value : [];
  return new Array<number>(DEFAULT_FLOAT_PARAM_LENGTH)
    .fill(0)
    .map((_, index) => toFloatOrZero(source[index]));
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
    normalized.qualityLock = item.qualityLock === true;
  }

  if (options.isArmor) {
    normalized.elementRates = normalizeArmorElementRates(item.elementRates, options.systemData);
    normalized.elementRateFloats = normalizeArmorElementRateFloats(item.elementRateFloats, options.systemData);
    if (shouldUseHiddenAttackSkillField(item)) {
      normalized.hiddenAttackSkillId = Math.max(0, toIntOrZero(item.hiddenAttackSkillId));
    } else {
      delete normalized.hiddenAttackSkillId;
    }
  }

  if (options.isWeapon) {
    const rangeValues = normalizeWeaponRangeValues(item);
    normalized.attackSkillId = Math.max(0, toIntOrZero(item.attackSkillId));
    normalized.attackElementId = Math.max(0, toIntOrZero(item.attackElementId));
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
