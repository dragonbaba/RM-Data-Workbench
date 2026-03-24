export const EQUIP_EXTENSIONS_FILE_NAME = 'EquipExtensions.json';

export interface EquipExtensionsData {
  weaponEquipTypes: Array<number | null>;
  systemWeaponEquipTypes: number[];
  actorEquipSlots: Array<number[] | null>;
  actorEquips: Array<number[] | null>;
}

export interface ActorExtensionEquipState {
  equipSlots: number[];
  equips: number[];
}

export interface NormalizedEquipExtensionsResult {
  data: EquipExtensionsData;
  changed: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asInt = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asInt);
};

const normalizeIndexedNumbers = (value: unknown, expectedLength: number): Array<number | null> => {
  const source = Array.isArray(value) ? value : [];
  const result: Array<number | null> = new Array(expectedLength).fill(0);
  result[0] = null;

  for (let index = 1; index < expectedLength; index++) {
    result[index] = asInt(source[index]);
  }

  return result;
};

const normalizeIndexedNumberLists = (value: unknown, expectedLength: number): Array<number[] | null> => {
  const source = Array.isArray(value) ? value : [];
  const result: Array<number[] | null> = new Array(expectedLength).fill(null);
  result[0] = null;

  for (let index = 1; index < expectedLength; index++) {
    result[index] = normalizeNumberArray(source[index]);
  }

  return result;
};

export const createDefaultEquipExtensions = (actorCount: number, weaponCount: number): EquipExtensionsData => ({
  weaponEquipTypes: normalizeIndexedNumbers([], weaponCount),
  systemWeaponEquipTypes: [],
  actorEquipSlots: normalizeIndexedNumberLists([], actorCount),
  actorEquips: normalizeIndexedNumberLists([], actorCount),
});

export const normalizeEquipExtensions = (
  value: unknown,
  actorCount: number,
  weaponCount: number,
): NormalizedEquipExtensionsResult => {
  const source = asRecord(value);
  const fallback = createDefaultEquipExtensions(actorCount, weaponCount);

  if (!source) {
    return {
      data: fallback,
      changed: true,
    };
  }

  const data: EquipExtensionsData = {
    weaponEquipTypes: normalizeIndexedNumbers(source.weaponEquipTypes, weaponCount),
    systemWeaponEquipTypes: Array.from(new Set(normalizeNumberArray(source.systemWeaponEquipTypes).filter((item) => item > 0))),
    actorEquipSlots: normalizeIndexedNumberLists(source.actorEquipSlots, actorCount),
    actorEquips: normalizeIndexedNumberLists(source.actorEquips, actorCount),
  };

  const changed = JSON.stringify(data) !== JSON.stringify(source);
  return { data, changed };
};

export const getActorEquipStateFromExtensions = (
  extensions: EquipExtensionsData | null,
  actorIndex: number,
): ActorExtensionEquipState => {
  if (!extensions || actorIndex <= 0) {
    return { equipSlots: [], equips: [] };
  }

  const equips = normalizeNumberArray(extensions.actorEquips[actorIndex]);
  const equipSlots = normalizeNumberArray(extensions.actorEquipSlots[actorIndex]);
  const length = equips.length;
  const nextEquipSlots = equipSlots.slice(0, length);

  while (nextEquipSlots.length < length) {
    nextEquipSlots.push(0);
  }

  return {
    equipSlots: nextEquipSlots,
    equips,
  };
};

export const getWeaponEquipTypeAtIndex = (
  extensions: EquipExtensionsData | null,
  weaponIndex: number,
): number => {
  if (!extensions || weaponIndex <= 0) {
    return 0;
  }
  return asInt(extensions.weaponEquipTypes[weaponIndex]);
};
