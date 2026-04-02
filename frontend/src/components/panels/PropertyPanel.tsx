import { Card, Input, InputNumber, Button, Form, Space, Select, Switch } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
  normalizeEnemyEditorValues,
} from '../../services/EnemyPropertyService';
import type {
  EquipExtraParamMap,
  EquipUpgradeParamMap,
  EquipVehicleParamMap,
  ParamTemplate,
  RPGEnemy,
  RPGItem,
} from '../../types';
import { normalizeEffectIdList } from '../../services/GameEffectService';

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

type ShapeParams = Record<string, Record<string, number>>;
type FixedParamGroupKey = 'extraParams' | 'vehicleParams' | 'upgradeParams';

interface FixedParamFieldDefinition {
  key: string;
  label: string;
}

const BASE_ATTRIBUTES: Array<{
  key: string;
  label: string;
  floatLabel: string;
}> = [
  { key: 'mhp', label: '最大生命值', floatLabel: '生命波动' },
  { key: 'mmp', label: '最大魔法值', floatLabel: '魔法波动' },
  { key: 'atk', label: '攻击力', floatLabel: '攻击波动' },
  { key: 'def', label: '防御力', floatLabel: '防御波动' },
  { key: 'mat', label: '魔法攻击力', floatLabel: '魔攻波动' },
  { key: 'mdf', label: '魔法防御力', floatLabel: '魔防波动' },
  { key: 'agi', label: '速度', floatLabel: '速度波动' },
  { key: 'luk', label: '幸运', floatLabel: '幸运波动' },
];

const EXTRA_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { key: 'interceptRate', label: '迎击率' },
  { key: 'evadeRate', label: '回避率' },
  { key: 'critRate', label: '暴击率' },
  { key: 'critDamage', label: '暴伤' },
  { key: 'hitRate', label: '命中率' },
  { key: 'finalDamage', label: '最终伤害' },
];

const VEHICLE_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { key: 'weight', label: '重量' },
  { key: 'carryValue', label: '承重' },
  { key: 'loadValue', label: '载重' },
  { key: 'durability', label: '耐久度' },
  { key: 'ammoCapacity', label: '弹舱' },
  { key: 'shellPrice', label: '弹药价格' },
  { key: 'repeat', label: '连发' },
];

const UPGRADE_PARAM_FIELDS: FixedParamFieldDefinition[] = [
  { key: 'times', label: '强化次数' },
  { key: 'atk', label: '强化攻击力' },
  { key: 'def', label: '强化防御力' },
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

const EMPTY_PARAM_TEMPLATE: ParamTemplate = Object.freeze({
  value: 0,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

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

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeParamTemplate = (value: unknown): ParamTemplate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...EMPTY_PARAM_TEMPLATE };
  }
  const record = value as Record<string, unknown>;
  return {
    value: toFloatOrZero(record.value),
    floatValue: toFloatOrZero(record.floatValue),
    upgradeValue: toFloatOrZero(record.upgradeValue),
    upgradeFloatValue: toFloatOrZero(record.upgradeFloatValue),
  };
};

const buildGroupFormValues = (
  groupValue: unknown,
  fields: FixedParamFieldDefinition[],
) => {
  const groupRecord = groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue)
    ? groupValue as Record<string, unknown>
    : {};
  const result: Record<string, ParamTemplate> = {};
  for (const field of fields) {
    result[field.key] = hasOwn(groupRecord, field.key)
      ? normalizeParamTemplate(groupRecord[field.key])
      : { ...EMPTY_PARAM_TEMPLATE };
  }
  return result;
};

const normalizeGroupValues = <T extends Record<string, ParamTemplate>>(
  value: unknown,
  fields: FixedParamFieldDefinition[],
): T => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const result: Record<string, ParamTemplate> = {};
  for (const field of fields) {
    result[field.key] = normalizeParamTemplate(source[field.key]);
  }
  return result as T;
};

const areParamGroupsEqual = (
  left: unknown,
  right: Record<string, ParamTemplate>,
  fields: FixedParamFieldDefinition[],
) => JSON.stringify(normalizeGroupValues(left, fields)) === JSON.stringify(right);

const readRangeFieldValue = (raw: Record<string, unknown>, key: string, defaultValue: number): number => {
  const value = raw[key];
  return value === undefined ? defaultValue : value as number;
};

const getFloatFieldKey = (key: string) => `${key}_float`;
const EQUIP_TYPE_FIELD_KEY = 'etypeId';
const PRICE_FIELD_KEY = 'price';
const ATTACK_SKILL_FIELD_KEY = 'attackSkillId';
const ATTACK_ELEMENT_FIELD_KEY = 'attackElementId';
const TARGET_CAMP_FIELD_KEY = 'targetCamp';
const TARGET_LIFE_STATE_FIELD_KEY = 'targetLifeState';
const SELECT_MODE_FIELD_KEY = 'selectMode';
const AREA_MODE_FIELD_KEY = 'areaMode';
const SHAPE_TYPE_FIELD_KEY = 'shapeType';
const AREA_TARGET_COUNT_FIELD_KEY = 'areaTargetCount';
const SHAPE_PARAMS_FIELD_KEY = 'shapeParams';
const REPEAT_TIME_FIELD_KEY = 'repeatTime';
const REPEAT_TIME_FLOAT_FIELD_KEY = 'repeatTimeFloat';
const AREA_OVERRIDE_FIELD_KEY = 'areaOverride';
const ITEMS_FILE_NAME = 'Items.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const ARMORS_FILE_NAME = 'Armors.json';
const SKILLS_FILE_NAME = 'Skills.json';
const SYSTEM_FILE_NAME = 'System.json';
const EFFECTS_FILE_NAME = 'Effects.json';
const ENEMIES_FILE_NAME = 'Enemies.json';
const CLASSES_FILE_NAME = 'Classes.json';
const ANIMATIONS_FILE_NAME = 'Animations.json';
const ENEMY_CLASS_ID_FIELD_KEY = 'enemyClassId';
const ENEMY_LEVEL_FIELD_KEY = 'enemyLevel';
const ENEMY_LEVEL_SCOPE_FIELD_KEY = 'enemyLevelScope';
const ENEMY_IS_BOSS_FIELD_KEY = 'enemyIsBoss';
const ENEMY_BOUNTY_FIELD_KEY = 'enemyBounty';
const ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY = 'enemyAttackAnimationId';

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

const DEFAULT_SHAPE_PARAMS: ShapeParams = Object.freeze({
  '1': Object.freeze({ radius: 120 }),
  '2': Object.freeze({ radius: 180, angleDeg: 60 }),
  '3': Object.freeze({ width: 80, length: 240 }),
});

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
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const getDirectoryPath = (filePath: string) => {
  const normalized = (filePath || '').replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
};

const areNumberArraysEqual = (left: unknown, right: number[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return right.every((value, index) => toIntOrZero(left[index]) === value);
};

const normalizeShapeParams = (value: unknown): ShapeParams => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_SHAPE_PARAMS;
  }

  return value as ShapeParams;
};

const areShapeParamsEqual = (left: unknown, right: ShapeParams): boolean => {
  const normalizedLeft = normalizeShapeParams(left);
  return JSON.stringify(normalizedLeft) === JSON.stringify(right);
};

const normalizeCommonRangeValues = (raw: Record<string, unknown>) => {
  let targetCamp = Math.max(1, readRangeFieldValue(raw, TARGET_CAMP_FIELD_KEY, 1));
  let targetLifeState = Math.max(1, readRangeFieldValue(raw, TARGET_LIFE_STATE_FIELD_KEY, 1));
  let selectMode = Math.max(1, readRangeFieldValue(raw, SELECT_MODE_FIELD_KEY, 1));
  let areaMode = Math.max(1, readRangeFieldValue(raw, AREA_MODE_FIELD_KEY, 1));
  let shapeType = Math.max(0, readRangeFieldValue(raw, SHAPE_TYPE_FIELD_KEY, 0));
  let areaTargetCount = Math.max(0, readRangeFieldValue(raw, AREA_TARGET_COUNT_FIELD_KEY, 0));

  if (targetCamp === 3) {
    targetLifeState = 1;
    selectMode = 1;
    areaMode = 1;
  } else if (targetCamp === 4) {
    selectMode = 2;
    areaMode = 4;
  }

  if (selectMode === 2) {
    areaMode = 4;
  }

  if (areaMode === 1 || areaMode === 4) {
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
    targetCamp,
    targetLifeState: Math.min(3, targetLifeState),
    selectMode: Math.min(2, selectMode),
    areaMode: Math.min(4, areaMode),
    shapeType: Math.min(3, shapeType),
    areaTargetCount,
    shapeParams: normalizeShapeParams(raw[SHAPE_PARAMS_FIELD_KEY]),
    repeatTime: Math.max(1, readRangeFieldValue(raw, REPEAT_TIME_FIELD_KEY, 1)),
    repeatTimeFloat: Math.max(0, readRangeFieldValue(raw, REPEAT_TIME_FLOAT_FIELD_KEY, 0)),
  };
};

const normalizeWeaponRangeValues = (raw: Record<string, unknown>) => {
  let areaOverride = Math.max(0, readRangeFieldValue(raw, AREA_OVERRIDE_FIELD_KEY, 0));
  let areaMode = Math.max(1, readRangeFieldValue(raw, AREA_MODE_FIELD_KEY, 1));
  let shapeType = Math.max(0, readRangeFieldValue(raw, SHAPE_TYPE_FIELD_KEY, 0));
  let areaTargetCount = Math.max(0, readRangeFieldValue(raw, AREA_TARGET_COUNT_FIELD_KEY, 0));

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
    shapeParams: normalizeShapeParams(raw[SHAPE_PARAMS_FIELD_KEY]),
    repeatTime: Math.max(1, readRangeFieldValue(raw, REPEAT_TIME_FIELD_KEY, 1)),
    repeatTimeFloat: Math.max(0, readRangeFieldValue(raw, REPEAT_TIME_FLOAT_FIELD_KEY, 0)),
  };
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
  const [referenceRevision, setReferenceRevision] = useState(0);
  const pendingDraftRef = useRef<PendingDraftState | null>(null);
  const currentFileName = currentFilePath.split(/[\\/]/).pop()?.toLowerCase() || '';
  const isItemFile = currentFileName === ITEMS_FILE_NAME.toLowerCase();
  const isWeaponItem = currentFileName === WEAPONS_FILE_NAME.toLowerCase();
  const isArmorItem = currentFileName === ARMORS_FILE_NAME.toLowerCase();
  const isSkillFile = currentFileName === SKILLS_FILE_NAME.toLowerCase();
  const isEnemyFile = currentFileName === ENEMIES_FILE_NAME.toLowerCase();
  const supportsTemplateParams = isWeaponItem || isArmorItem;
  const supportsPrice = isItemFile || isWeaponItem || isArmorItem;
  const supportsCommonRange = isItemFile || isSkillFile;
  const watchedTargetCamp = Form.useWatch(TARGET_CAMP_FIELD_KEY, form) ?? 1;
  const watchedSelectMode = Form.useWatch(SELECT_MODE_FIELD_KEY, form) ?? 1;
  const watchedAreaMode = Form.useWatch(AREA_MODE_FIELD_KEY, form) ?? 1;
  const watchedShapeType = Form.useWatch(SHAPE_TYPE_FIELD_KEY, form) ?? 0;
  const watchedAreaOverride = Form.useWatch(AREA_OVERRIDE_FIELD_KEY, form) ?? 0;
  const watchedEnemyClassId = Form.useWatch(ENEMY_CLASS_ID_FIELD_KEY, form) ?? 0;
  const watchedEnemyAttackAnimationId = Form.useWatch(ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY, form) ?? 0;
  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>(SYSTEM_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const skillsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(SKILLS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const equipExtensionsData = useMemo(
    () => DataLoaderService.getCachedDataByName<EquipExtensionsData>(EQUIP_EXTENSIONS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const effectsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(EFFECTS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const classesData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(CLASSES_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const animationsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ANIMATIONS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const equipTypeOptions = useMemo(
    () => getEquipTypeOptions(systemData),
    [systemData],
  );
  const skillOptions = useMemo(
    () => buildDataOptions(skillsData, '未选择技能'),
    [skillsData],
  );
  const elementOptions = useMemo(
    () => getElementOptions(systemData),
    [systemData],
  );
  const effectOptions = useMemo(
    () => buildEffectReferenceOptions(effectsData),
    [effectsData],
  );
  const enemyClassOptions = useMemo(
    () => getEnemyReferenceValue(classesData, '未选择职业', watchedEnemyClassId, '职业'),
    [classesData, watchedEnemyClassId],
  );
  const enemyAnimationOptions = useMemo(
    () => getEnemyReferenceValue(animationsData, '未选择动画', watchedEnemyAttackAnimationId, '动画'),
    [animationsData, watchedEnemyAttackAnimationId],
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
      for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
        const attr = BASE_ATTRIBUTES[i];
        baseFormValues[attr.key] = item.params?.[i] ?? 0;
        baseFormValues[getFloatFieldKey(attr.key)] = item.floatParams?.[i] ?? 0;
      }
      if (supportsPrice) {
        baseFormValues[PRICE_FIELD_KEY] = toIntOrZero(item.price);
      }
      if (isWeaponItem) {
        baseFormValues[EQUIP_TYPE_FIELD_KEY] = getWeaponEquipTypeAtIndex(equipExtensionsData, currentItemIndex);
        baseFormValues[ATTACK_SKILL_FIELD_KEY] = toIntOrZero(item.attackSkillId);
        baseFormValues[ATTACK_ELEMENT_FIELD_KEY] = toIntOrZero(item.attackElementId);
        Object.assign(baseFormValues, getWeaponRangeValues(item));
      }
      if (supportsCommonRange) {
        Object.assign(baseFormValues, getCommonRangeValues(item));
      }
      if (isEnemyFile) {
        const enemyValues = normalizeEnemyEditorValues(item as RPGEnemy);
        baseFormValues[ENEMY_CLASS_ID_FIELD_KEY] = enemyValues.classId;
        baseFormValues[ENEMY_LEVEL_FIELD_KEY] = enemyValues.level;
        baseFormValues[ENEMY_LEVEL_SCOPE_FIELD_KEY] = enemyValues.levelScope;
        baseFormValues[ENEMY_IS_BOSS_FIELD_KEY] = enemyValues.isBoss;
        baseFormValues[ENEMY_BOUNTY_FIELD_KEY] = enemyValues.bounty;
        baseFormValues[ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY] = enemyValues.attackAnimationId;
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
      const nextBaseValues = pendingDraft?.baseValues
        ? { ...baseFormValues, ...pendingDraft.baseValues }
        : {
            ...baseFormValues,
            ...(supportsTemplateParams ? {
              extraParams: buildGroupFormValues(item.extraParams, EXTRA_PARAM_FIELDS),
              vehicleParams: buildGroupFormValues(item.vehicleParams, VEHICLE_PARAM_FIELDS),
              upgradeParams: buildGroupFormValues(item.upgradeParams, UPGRADE_PARAM_FIELDS),
            } : {}),
          };
      if (supportsTemplateParams && !pendingDraft?.baseValues) {
        nextBaseValues.extraParams = buildGroupFormValues(item.extraParams, EXTRA_PARAM_FIELDS);
        nextBaseValues.vehicleParams = buildGroupFormValues(item.vehicleParams, VEHICLE_PARAM_FIELDS);
        nextBaseValues.upgradeParams = buildGroupFormValues(item.upgradeParams, UPGRADE_PARAM_FIELDS);
      }
      const nextCustomFields = pendingDraft?.customFields ?? custom;
      const savedEffectIds = normalizeEffectIdList(item.effects);
      const nextEffectIds = pendingDraft?.effectIds ?? savedEffectIds;

      form.setFieldsValue(nextBaseValues);
      setCustomFields(nextCustomFields);
      setEffectIds(nextEffectIds);
      setOriginalEffectIds(savedEffectIds);
      setHasBaseChanges(pendingDraft?.hasBaseChanges ?? false);
      setHasCustomChanges(pendingDraft?.hasCustomChanges ?? false);
      pendingDraftRef.current = null;
    }
  }, [currentItem, currentItemIndex, equipExtensionsData, form, isEnemyFile, isWeaponItem, supportsCommonRange, supportsPrice, supportsTemplateParams]);

  useEffect(() => {
    if (!supportsCommonRange) {
      return;
    }
    const nextValues: Record<string, number> = {};
    let nextAreaMode = watchedAreaMode;
    if (watchedTargetCamp === 3) {
      if ((form.getFieldValue(TARGET_LIFE_STATE_FIELD_KEY) ?? 1) !== 1) nextValues[TARGET_LIFE_STATE_FIELD_KEY] = 1;
      if (watchedSelectMode !== 1) nextValues[SELECT_MODE_FIELD_KEY] = 1;
      nextAreaMode = 1;
    } else if (watchedTargetCamp === 4) {
      if (watchedSelectMode !== 2) nextValues[SELECT_MODE_FIELD_KEY] = 2;
      nextAreaMode = 4;
    } else if (watchedSelectMode === 2) {
      nextAreaMode = 4;
    }
    if (watchedAreaMode !== nextAreaMode) nextValues[AREA_MODE_FIELD_KEY] = nextAreaMode;
    if (nextAreaMode === 1 || nextAreaMode === 4) {
      if (watchedShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if ((form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0) !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (nextAreaMode === 3) {
      if (watchedShapeType !== 3) nextValues[SHAPE_TYPE_FIELD_KEY] = 3;
      if ((form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0) !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else {
      if (watchedShapeType !== 1 && watchedShapeType !== 2) nextValues[SHAPE_TYPE_FIELD_KEY] = 1;
      const currentTargetCount = form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0;
      if (currentTargetCount < 1) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 1;
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
    if (watchedAreaOverride !== 1) {
      if (watchedAreaMode !== 1) nextValues[AREA_MODE_FIELD_KEY] = 1;
      if (watchedShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if ((form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0) !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (watchedAreaMode === 1 || watchedAreaMode === 4) {
      if (watchedShapeType !== 0) nextValues[SHAPE_TYPE_FIELD_KEY] = 0;
      if ((form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0) !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else if (watchedAreaMode === 3) {
      if (watchedShapeType !== 3) nextValues[SHAPE_TYPE_FIELD_KEY] = 3;
      if ((form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0) !== 0) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 0;
    } else {
      if (watchedShapeType !== 1 && watchedShapeType !== 2) nextValues[SHAPE_TYPE_FIELD_KEY] = 1;
      const currentTargetCount = form.getFieldValue(AREA_TARGET_COUNT_FIELD_KEY) ?? 0;
      if (currentTargetCount < 1) nextValues[AREA_TARGET_COUNT_FIELD_KEY] = 1;
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

  const handleSaveEffects = () => {
    if (!currentData || currentItemIndex < 0) return;
    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) return;
    if (!hasEffectChanges) {
      ToastManager.info('效果引用没有变化');
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
    updateCurrentItem({
      ...sourceItem,
      effects: normalizedEffectIds,
    });
    setOriginalEffectIds(normalizedEffectIds);
    ToastManager.success('效果引用已保存');
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

  const handleSaveBaseAttributes = () => {
    if (!currentData || currentItemIndex < 0) return;

    const values = form.getFieldsValue(true) as Record<string, unknown>;
    const newParams: number[] = [];
    const newFloatParams: number[] = [];
    for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
      const attr = BASE_ATTRIBUTES[i];
      newParams[i] = toIntOrZero(values[attr.key]);
      newFloatParams[i] = toFloatOrZero(values[getFloatFieldKey(attr.key)]);
    }
    const nextPrice = supportsPrice ? toIntOrZero(values[PRICE_FIELD_KEY]) : 0;
    const nextAttackSkillId = isWeaponItem ? toIntOrZero(values[ATTACK_SKILL_FIELD_KEY]) : 0;
    const nextAttackElementId = isWeaponItem ? toIntOrZero(values[ATTACK_ELEMENT_FIELD_KEY]) : 0;
    const nextEnemyValues = isEnemyFile
      ? {
          classId: values[ENEMY_CLASS_ID_FIELD_KEY],
          level: values[ENEMY_LEVEL_FIELD_KEY],
          levelScope: values[ENEMY_LEVEL_SCOPE_FIELD_KEY],
          isBoss: values[ENEMY_IS_BOSS_FIELD_KEY],
          bounty: values[ENEMY_BOUNTY_FIELD_KEY],
          attackAnimationId: values[ENEMY_ATTACK_ANIMATION_ID_FIELD_KEY],
        }
      : null;
    const nextCommonRangeValues = supportsCommonRange ? normalizeCommonRangeValues(values) : null;
    const nextWeaponRangeValues = isWeaponItem ? normalizeWeaponRangeValues(values) : null;
    const nextExtraParams = supportsTemplateParams
      ? normalizeGroupValues<EquipExtraParamMap>(values.extraParams, EXTRA_PARAM_FIELDS)
      : null;
    const nextVehicleParams = supportsTemplateParams
      ? normalizeGroupValues<EquipVehicleParamMap>(values.vehicleParams, VEHICLE_PARAM_FIELDS)
      : null;
    const nextUpgradeParams = supportsTemplateParams
      ? normalizeGroupValues<EquipUpgradeParamMap>(values.upgradeParams, UPGRADE_PARAM_FIELDS)
      : null;

    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) return;

    const currentCommonRangeValues = supportsCommonRange ? getCommonRangeValues(sourceItem) : null;
    const currentWeaponRangeValues = isWeaponItem ? getWeaponRangeValues(sourceItem) : null;

    const shouldUpdateItem = !areNumberArraysEqual(sourceItem.params, newParams)
      || !areNumberArraysEqual(sourceItem.floatParams, newFloatParams)
      || (supportsPrice && toIntOrZero(sourceItem.price) !== nextPrice)
      || (isWeaponItem && toIntOrZero(sourceItem.attackSkillId) !== nextAttackSkillId)
      || (isWeaponItem && toIntOrZero(sourceItem.attackElementId) !== nextAttackElementId)
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
      || (isEnemyFile && nextEnemyValues !== null && hasEnemyEditorChanges(sourceItem as RPGEnemy, nextEnemyValues));
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

      const nextItem = {
        ...sourceItem,
        ...(supportsPrice ? { price: nextPrice } : {}),
        ...(isWeaponItem ? {
          attackSkillId: nextAttackSkillId,
          attackElementId: nextAttackElementId,
        } : {}),
        ...(supportsTemplateParams && nextExtraParams ? { extraParams: nextExtraParams } : {}),
        ...(supportsTemplateParams && nextVehicleParams ? { vehicleParams: nextVehicleParams } : {}),
        ...(supportsTemplateParams && nextUpgradeParams ? { upgradeParams: nextUpgradeParams } : {}),
        ...(supportsCommonRange && nextCommonRangeValues ? nextCommonRangeValues : {}),
        ...(isWeaponItem && nextWeaponRangeValues ? nextWeaponRangeValues : {}),
        params: newParams,
        floatParams: newFloatParams,
      };

      updateCurrentItem(
        isEnemyFile && nextEnemyValues !== null
          ? buildEnemySaveData(nextItem as RPGEnemy, nextEnemyValues)
          : nextItem,
      );
    }

    const extensionChanged = isWeaponItem ? updateWeaponEquipType(nextEquipTypeId) : false;

    if (!shouldUpdateItem && !extensionChanged) {
      setHasBaseChanges(false);
      ToastManager.info('基础属性没有变化');
      return;
    }

    setHasBaseChanges(false);
    ToastManager.success('基础属性已保存');
  };

  const handleSaveCustomAttributes = () => {
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

    updateCurrentItem({
      ...sourceItem,
      customParams: buildCustomParams(),
    });

    setHasCustomChanges(false);
    ToastManager.success('自定义属性已保存');
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
        <div className="text-xs text-gray-400">基础值</div>
        <div className="text-xs text-gray-400">基础浮动</div>
        <div className="text-xs text-gray-400">强化值</div>
        <div className="text-xs text-gray-400">强化浮动</div>
        {fields.flatMap((field) => [
          (
            <div key={`${groupKey}-${field.key}-label`} className="text-sm text-gray-200 pt-2">
              {field.label}
            </div>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-value`}
              name={[groupKey, field.key, 'value']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-floatValue`}
              name={[groupKey, field.key, 'floatValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={0.1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-upgradeValue`}
              name={[groupKey, field.key, 'upgradeValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={1} />
            </Form.Item>
          ),
          (
            <Form.Item
              key={`${groupKey}-${field.key}-upgradeFloatValue`}
              name={[groupKey, field.key, 'upgradeFloatValue']}
              className="mb-0"
            >
              <InputNumber className="w-full" style={{ width: '100%' }} step={0.1} />
            </Form.Item>
          ),
        ])}
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
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveBaseAttributes}
            disabled={!hasBaseChanges}
            style={{
              backgroundColor: hasBaseChanges ? 'var(--color-accent)' : undefined,
            }}
          >
            保存基础属性
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveCustomAttributes}
            disabled={!hasCustomChanges}
          >
            保存自定义属性
          </Button>
        </Space>
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
          <div className="grid grid-cols-4 gap-x-4 gap-y-4">
            {BASE_ATTRIBUTES.flatMap(({ key, label, floatLabel }) => {
              const floatKey = getFloatFieldKey(key);
              return [
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
                (
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
                  </Form.Item>
                ),
              ];
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
                  />
                </Form.Item>
              </>
            ) : null}
          </div>
        </Card>

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
              这里直接维护敌人顶层扩展字段，保存时会写回敌人数据本体，并保持 `note/meta` 为空。
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
                label={<span className="text-xs text-gray-400">等级范围</span>}
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
                name={ENEMY_IS_BOSS_FIELD_KEY}
                label={<span className="text-xs text-gray-400">是否 Boss</span>}
                className="mb-0"
                valuePropName="checked"
              >
                <Switch checkedChildren="Boss" unCheckedChildren="普通" />
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
                <Select options={TARGET_CAMP_OPTIONS} className="w-full" />
              </Form.Item>
              <Form.Item
                name={TARGET_LIFE_STATE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">目标状态</span>}
                className="mb-0"
              >
                <Select options={TARGET_LIFE_STATE_OPTIONS} className="w-full" />
              </Form.Item>
              <Form.Item
                name={SELECT_MODE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">选中方式</span>}
                className="mb-0"
              >
                <Select options={SELECT_MODE_OPTIONS} className="w-full" />
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
                />
              </Form.Item>
              {shouldShowCommonShapeSelect ? (
                <Form.Item
                  name={SHAPE_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">形状类型</span>}
                  className="mb-0"
                >
                  <Select options={AREA_SHAPE_TYPE_OPTIONS} className="w-full" />
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
                <Select options={AREA_OVERRIDE_OPTIONS} className="w-full" />
              </Form.Item>
              {shouldShowWeaponConfig ? (
                <Form.Item
                  name={AREA_MODE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器范围模式</span>}
                  className="mb-0"
                >
                  <Select options={AREA_MODE_OPTIONS} className="w-full" />
                </Form.Item>
              ) : null}
              {shouldShowWeaponShapeSelect ? (
                <Form.Item
                  name={SHAPE_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">武器形状</span>}
                  className="mb-0"
                >
                  <Select options={AREA_SHAPE_TYPE_OPTIONS} className="w-full" />
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

        {supportsTemplateParams ? renderFixedParamCard(
          '额外统一属性',
          'extraParams',
          EXTRA_PARAM_FIELDS,
          '固定维护命中、回避、暴击、暴伤、迎击与最终伤害。业务属性已迁移到统一模板，不再通过自定义属性名称保存。',
        ) : null}

        {supportsTemplateParams ? renderFixedParamCard(
          '车属性',
          'vehicleParams',
          VEHICLE_PARAM_FIELDS,
          '固定维护重量、承重、载重、耐久、弹舱、弹药价格和连发。即使当前条目用不到，也统一保留字段结构。',
        ) : null}

        {supportsTemplateParams ? renderFixedParamCard(
          '基础强化',
          'upgradeParams',
          UPGRADE_PARAM_FIELDS,
          '承接强化次数、强化攻击力、强化防御力这类不属于 extra/vehicle 的固定业务字段。',
        ) : null}
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
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSaveEffects}
                disabled={!hasEffectChanges}
              >
                保存
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
