export const EQUIPMENT_QUALITY_LEVEL_MIN = 0;
export const EQUIPMENT_QUALITY_LEVEL_MAX = 6;

interface EquipmentQualitySource {
  qualityLock?: unknown;
  qualityLevel?: unknown;
}

export interface EquipmentQualityFields {
  qualityLock: boolean;
  qualityLevel: number;
}

export const normalizeEquipmentQualityLevel = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return EQUIPMENT_QUALITY_LEVEL_MIN;
  const level = Math.trunc(numeric);
  if (level < EQUIPMENT_QUALITY_LEVEL_MIN) return EQUIPMENT_QUALITY_LEVEL_MIN;
  if (level > EQUIPMENT_QUALITY_LEVEL_MAX) return EQUIPMENT_QUALITY_LEVEL_MAX;
  return level;
};

export const normalizeEquipmentQualityFields = (item: EquipmentQualitySource): EquipmentQualityFields => ({
  qualityLock: item.qualityLock === true,
  qualityLevel: normalizeEquipmentQualityLevel(item.qualityLevel),
});
