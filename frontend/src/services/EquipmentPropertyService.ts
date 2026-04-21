import type {
  EquipExtraParamMap,
  EquipUpgradeParamMap,
  EquipVehicleParamMap,
  ParamTemplate,
  RPGItem,
} from '../types';
import { extractSystemRecord } from './DataFileFormatService';
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

type ShapeParams = Record<string, Record<string, number>>;

const DEFAULT_FLOAT_PARAM_LENGTH = 8;
const TANK_HIDDEN_ATTACK_SKILL_EQUIP_TYPES = new Set([8, 9]);

const EMPTY_PARAM_TEMPLATE: ParamTemplate = Object.freeze({
  value: 0,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

const DEFAULT_SHAPE_PARAMS: ShapeParams = Object.freeze({
  1: Object.freeze({ radius: 120 }),
  2: Object.freeze({ angleDeg: 60, radius: 180 }),
  3: Object.freeze({ length: 240, width: 80 }),
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

const normalizeShapeParams = (value: unknown): ShapeParams => {
  if (!isRecord(value)) {
    return DEFAULT_SHAPE_PARAMS;
  }
  return value as ShapeParams;
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

const normalizeWeaponRangeValues = (raw: Record<string, unknown>) => {
  const areaOverride = Math.max(0, toIntOrZero(raw.areaOverride));
  let areaMode = Math.max(1, toIntOrZero(raw.areaMode || 1));
  let shapeType = Math.max(0, toIntOrZero(raw.shapeType));
  let areaTargetCount = Math.max(0, toIntOrZero(raw.areaTargetCount));

  if (areaOverride === 0) {
    areaMode = 1;
    shapeType = 0;
    areaTargetCount = 0;
  } else if (areaMode === 1 || areaMode === 4) {
    shapeType = 0;
    areaTargetCount = 0;
  } else if (areaMode === 3) {
    shapeType = 3;
    areaTargetCount = 0;
  } else {
    if (shapeType !== 1 && shapeType !== 2) shapeType = 1;
    areaTargetCount = Math.max(1, areaTargetCount || 1);
  }

  return {
    areaOverride: Math.min(1, areaOverride),
    areaMode: Math.min(4, areaMode),
    shapeType: Math.min(3, shapeType),
    areaTargetCount,
    shapeParams: normalizeShapeParams(raw.shapeParams),
    repeatTime: Math.max(1, toIntOrZero(raw.repeatTime || 1)),
    repeatTimeFloat: Math.max(0, toFloatOrZero(raw.repeatTimeFloat)),
  };
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
    normalized.extraParams = normalizeParamGroup<EquipExtraParamMap>(item.extraParams, EXTRA_PARAM_FIELDS);
    normalized.vehicleParams = normalizeParamGroup<EquipVehicleParamMap>(
      item.vehicleParams,
      COMPLETE_VEHICLE_PARAM_FIELDS,
    );
    normalized.upgradeParams = normalizeParamGroup<EquipUpgradeParamMap>(item.upgradeParams, UPGRADE_PARAM_FIELDS);
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
