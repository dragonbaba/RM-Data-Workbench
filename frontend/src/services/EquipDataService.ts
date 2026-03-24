import type { RPGItem } from '../types';
import { extractSystemRecord } from './DataFileFormatService';
import type { EquipExtensionsData } from './EquipExtensionsService';

type RecordLike = Record<string, unknown>;

export type EquipSourceKind = 'none' | 'weapon' | 'armor';

export interface EquipTypeOption {
  value: number;
  label: string;
  name: string;
  isNone: boolean;
}

export interface EquipCandidateOption {
  value: number;
  label: string;
  name: string;
  source: EquipSourceKind;
  typeId: number;
}

const NONE_EQUIP_OPTION: EquipCandidateOption = {
  value: 0,
  label: '0 : 无装备',
  name: '无装备',
  source: 'none',
  typeId: 0,
};

const asRecord = (value: unknown): RecordLike | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as RecordLike;
};

const asInt = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asInt);
};

const getDatabaseEntries = (data: unknown[] | null): Array<{ index: number; item: RPGItem }> => {
  if (!Array.isArray(data) || data.length < 2) return [];

  const result: Array<{ index: number; item: RPGItem }> = [];
  for (let index = 1; index < data.length; index++) {
    const item = asRecord(data[index]);
    if (!item) continue;
    result.push({ index, item: item as unknown as RPGItem });
  }
  return result;
};

export const getSystemRecord = (systemData: unknown): RecordLike | null => extractSystemRecord(systemData);

export const getEquipTypes = (systemData: unknown): string[] => {
  const system = getSystemRecord(systemData);
  const rawTypes = Array.isArray(system?.equipTypes) ? system.equipTypes : [];
  const result = [''];

  for (let index = 1; index < rawTypes.length; index++) {
    result.push(typeof rawTypes[index] === 'string' ? rawTypes[index].trim() : '');
  }

  return result;
};

export const getEquipTypeOptions = (systemData: unknown): EquipTypeOption[] => {
  const rawTypes = getEquipTypes(systemData);
  const options: EquipTypeOption[] = [{
    value: 0,
    label: '0 : 无类型',
    name: '',
    isNone: true,
  }];

  for (let index = 1; index < rawTypes.length; index++) {
    const rawName = typeof rawTypes[index] === 'string' ? rawTypes[index] : '';
    const name = rawName.trim();
    options.push({
      value: index,
      label: `${index} : ${name || `类型${index}`}`,
      name,
      isNone: false,
    });
  }

  return options;
};

export const getSystemWeaponEquipTypes = (extensionsData: EquipExtensionsData | null): number[] => {
  const values = normalizeNumberArray(extensionsData?.systemWeaponEquipTypes);
  return Array.from(new Set(values.filter((value) => value > 0)));
};

export const getEquipSourceKind = (slotTypeId: number, weaponEquipTypes: number[]): EquipSourceKind => {
  if (!Number.isInteger(slotTypeId) || slotTypeId <= 0) {
    return 'none';
  }
  return weaponEquipTypes.includes(slotTypeId) ? 'weapon' : 'armor';
};

export const getEquipCandidateOptions = (
  slotTypeId: number,
  weaponEquipTypes: number[],
  weaponTypeAssignments: Array<number | null> | null | undefined,
  weaponsData: unknown[] | null,
  armorsData: unknown[] | null,
): EquipCandidateOption[] => {
  const source = getEquipSourceKind(slotTypeId, weaponEquipTypes);
  if (source === 'none') {
    return [NONE_EQUIP_OPTION];
  }

  const items = source === 'weapon'
    ? getDatabaseEntries(weaponsData)
      .filter(({ index }) => asInt(weaponTypeAssignments?.[index]) === slotTypeId)
      .map(({ item }) => item)
    : getDatabaseEntries(armorsData)
      .filter(({ item }) => asInt(item.etypeId) === slotTypeId)
      .map(({ item }) => item);

  const options = items.map((item) => {
    const id = asInt(item.id);
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `未命名装备${id || ''}`;
    return {
      value: id,
      label: `${id} : ${name}`,
      name,
      source,
      typeId: slotTypeId,
    };
  });

  return [NONE_EQUIP_OPTION, ...options];
};

export const isEquipCandidateValid = (equipId: number, options: EquipCandidateOption[]): boolean => {
  return options.some((option) => option.value === equipId);
};
