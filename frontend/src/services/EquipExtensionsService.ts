import { arePlainDataEqual } from './PlainDataCompare';
export const EQUIP_EXTENSIONS_FILE_NAME = 'EquipExtensions.json';

export interface EquipExtensionsData {
  weaponEquipTypes: Array<number | null>;
  systemWeaponEquipTypes: number[];
  actorEquipSlots: Array<number[] | null>;
  actorEquips: Array<number[] | null>;
  actorRefitRules: IndexedActorRefitRuleSets;
}

export interface ActorExtensionEquipState {
  equipSlots: number[];
  equips: number[];
}

export type RefitConditionKind = 'none' | 'switch' | 'variable';
export type RefitVariableOperator = '>=' | '<=' | '>' | '<' | '==' | '!=';

export interface RefitNoCondition {
  kind: 'none';
}

export interface RefitSwitchCondition {
  kind: 'switch';
  switchId: number;
  value: boolean;
}

export interface RefitVariableCondition {
  kind: 'variable';
  variableId: number;
  op: RefitVariableOperator;
  value: number;
}

export type RefitCondition = RefitNoCondition | RefitSwitchCondition | RefitVariableCondition;

export interface RefitTransitionRule {
  fromEquipTypeId: number;
  toEquipTypeId: number;
  goldCost: number;
  conditions: RefitCondition[];
}

export interface ActorRefitSlotRule {
  slotIndex: number;
  fromEquipTypeId: number;
  transitions: RefitTransitionRule[];
}

export interface ActorRefitRuleSet {
  slots: ActorRefitSlotRule[];
}

export type IndexedActorRefitRuleSets = [null, ...ActorRefitRuleSet[]];

export interface NormalizedEquipExtensionsResult {
  data: EquipExtensionsData;
  changed: boolean;
}

export interface EquipExtensionsNormalizationPreview {
  data: EquipExtensionsData;
  changed: boolean;
  summary: string;
  changedSections: string[];
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asInt = (value: unknown): number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
};

const asJsonInt = asInt;

const asJsonBoolean = (value: unknown): boolean => value === true;

const normalizeVariableOperator = (value: unknown): RefitVariableOperator => {
  if (value === '>=' || value === '<=' || value === '>' || value === '<' || value === '==' || value === '!=') {
    return value;
  }
  return '>=';
};

const normalizeNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asInt);
};
const HUMAN_WEAPON_EQUIP_TYPE_ID = 1;
const TANK_MAIN_WEAPON_TYPE_ID = 1;
const TANK_SECONDARY_WEAPON_TYPE_ID = 2;
const TANK_SE_WEAPON_TYPE_ID = 3;
const HUMAN_WEAPON_TYPE_ID_START = 4;
const HUMAN_WEAPON_TYPE_ID_END = 12;

export const getExpectedWeaponEquipTypeByWtypeId = (wtypeId: unknown): number | null => {
  if (wtypeId === undefined || wtypeId === null || wtypeId === '') return null;
  const normalizedWtypeId = asInt(wtypeId);
  if (normalizedWtypeId === TANK_MAIN_WEAPON_TYPE_ID) return 10;
  if (normalizedWtypeId === TANK_SECONDARY_WEAPON_TYPE_ID) return 11;
  if (normalizedWtypeId === TANK_SE_WEAPON_TYPE_ID) return 12;
  if (normalizedWtypeId >= HUMAN_WEAPON_TYPE_ID_START && normalizedWtypeId <= HUMAN_WEAPON_TYPE_ID_END) {
    return HUMAN_WEAPON_EQUIP_TYPE_ID;
  }
  return 0;
};

export const repairWeaponEquipTypes = (
  value: unknown,
  weaponsData: unknown[] | null | undefined,
  expectedLength: number,
): Array<number | null> => {
  const normalized = normalizeIndexedNumbers(value, expectedLength);
  if (!Array.isArray(weaponsData)) return normalized;
  for (let index = 1; index < expectedLength; index++) {
    const weapon = asRecord(weaponsData[index]);
    if (!weapon) {
      normalized[index] = 0;
      continue;
    }
    const expectedEquipTypeId = getExpectedWeaponEquipTypeByWtypeId(weapon.wtypeId);
    if (expectedEquipTypeId !== null) {
      normalized[index] = expectedEquipTypeId;
    }
  }
  return normalized;
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

const normalizeRefitCondition = (value: unknown): RefitCondition | null => {
  const source = asRecord(value);
  if (!source) return null;

  if (source.kind === 'none') {
    return { kind: 'none' };
  }

  if (source.kind === 'variable') {
    return {
      kind: 'variable',
      variableId: asJsonInt(source.variableId),
      op: normalizeVariableOperator(source.op),
      value: asJsonInt(source.value),
    };
  }

  return {
    kind: 'switch',
    switchId: asJsonInt(source.switchId),
    value: asJsonBoolean(source.value),
  };
};

const normalizeRefitConditions = (value: unknown): RefitCondition[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const condition = normalizeRefitCondition(entry);
    return condition ? [condition] : [];
  });
};

const normalizeRefitTransitionRule = (value: unknown, fallbackFromTypeId: number): RefitTransitionRule | null => {
  const source = asRecord(value);
  if (!source) return null;
  const toEquipTypeId = asJsonInt(source.toEquipTypeId);
  if (toEquipTypeId <= 0) return null;

  return {
    fromEquipTypeId: asJsonInt(source.fromEquipTypeId) || fallbackFromTypeId,
    toEquipTypeId,
    goldCost: asJsonInt(source.goldCost),
    conditions: normalizeRefitConditions(source.conditions),
  };
};

const normalizeRefitSlotRule = (value: unknown, fallbackSlotIndex: number): ActorRefitSlotRule | null => {
  const source = asRecord(value);
  if (!source) return null;

  const slotIndex = asJsonInt(source.slotIndex);
  const fromEquipTypeId = asJsonInt(source.fromEquipTypeId);
  const rawTransitions = Array.isArray(source.transitions) ? source.transitions : [];
  const transitions = rawTransitions.flatMap((entry) => {
    const transition = normalizeRefitTransitionRule(entry, fromEquipTypeId);
    return transition ? [transition] : [];
  });

  return {
    slotIndex: Number.isInteger(slotIndex) ? slotIndex : fallbackSlotIndex,
    fromEquipTypeId,
    transitions,
  };
};

const cloneRefitCondition = (condition: RefitCondition): RefitCondition => ({ ...condition });

const cloneRefitTransition = (
  transition: RefitTransitionRule,
  fromEquipTypeId: number,
  toEquipTypeId: number,
): RefitTransitionRule => ({
  fromEquipTypeId,
  toEquipTypeId,
  goldCost: transition.goldCost,
  conditions: transition.conditions.map(cloneRefitCondition),
});

const collectRefitSlotTypes = (slot: ActorRefitSlotRule): number[] => {
  const types: number[] = [];
  const addType = (typeId: number) => {
    if (typeId > 0 && !types.includes(typeId)) {
      types.push(typeId);
    }
  };

  addType(slot.fromEquipTypeId);
  slot.transitions.forEach((transition) => {
    addType(transition.fromEquipTypeId);
    addType(transition.toEquipTypeId);
  });

  return types;
};

const findRefitTargetTemplate = (
  transitions: RefitTransitionRule[],
  targetTypeId: number,
): RefitTransitionRule | null => {
  const byTarget = transitions.find((transition) => transition.toEquipTypeId === targetTypeId);
  if (byTarget) return byTarget;
  return transitions.find((transition) => transition.fromEquipTypeId === targetTypeId) || null;
};

const completeRefitSlotTransitions = (slot: ActorRefitSlotRule): ActorRefitSlotRule => {
  const types = collectRefitSlotTypes(slot);
  if (types.length <= 1) return slot;

  const transitions = slot.transitions.map((transition) => ({
    ...transition,
    conditions: transition.conditions.map(cloneRefitCondition),
  }));
  const transitionKeys = new Set(transitions.map((transition) => `${transition.fromEquipTypeId}:${transition.toEquipTypeId}`));

  types.forEach((fromEquipTypeId) => {
    types.forEach((toEquipTypeId) => {
      if (fromEquipTypeId === toEquipTypeId) return;
      const key = `${fromEquipTypeId}:${toEquipTypeId}`;
      if (transitionKeys.has(key)) return;
      const template = findRefitTargetTemplate(transitions, toEquipTypeId);
      if (!template) return;
      transitions.push(cloneRefitTransition(template, fromEquipTypeId, toEquipTypeId));
      transitionKeys.add(key);
    });
  });

  return {
    ...slot,
    transitions,
  };
};

const TANK_WEAPON_EQUIP_TYPES = [10, 11, 12] as const;
const TANK_ENGINE_EQUIP_TYPE = 7;
const TANK_C_UNIT_EQUIP_TYPE = 8;
const TANK_FLEXIBLE_CORE_SLOT_START = 5;
const TANK_FLEXIBLE_CORE_SLOT_END = 8;
const TANK_FIXED_EQUIP_TYPES_BY_SLOT: Record<number, number> = {
  9: 9,
};

const isTankFlexibleCoreSlot = (slotIndex: number): boolean => (
  slotIndex >= TANK_FLEXIBLE_CORE_SLOT_START && slotIndex <= TANK_FLEXIBLE_CORE_SLOT_END
);

const createNoneRefitCondition = (): RefitNoCondition => ({ kind: 'none' });

const createDefaultRefitTransition = (
  fromEquipTypeId: number,
  toEquipTypeId: number,
  goldCost: number,
): RefitTransitionRule => ({
  fromEquipTypeId,
  toEquipTypeId,
  goldCost,
  conditions: [createNoneRefitCondition()],
});

const getDefaultTankWeaponRefitCosts = (actorIndex: number, slotIndex: number): [number, number, number] => {
  const diff = Math.max(0, actorIndex - 16);
  if (slotIndex <= 2) return [13700 + 800 * diff, 11600 + 700 * diff, 18500 + 1100 * diff];
  if (slotIndex === 3) return [15300 + 800 * diff, 13000 + 700 * diff, 20700 + 1200 * diff];
  return [17000 + 1000 * diff, 14400 + 800 * diff, 22900 + 1300 * diff];
};

const getDefaultTankRefitCostStep = (slotIndex: number, toEquipTypeId: number): number => {
  if (isTankFlexibleCoreSlot(slotIndex)) {
    return toEquipTypeId === TANK_C_UNIT_EQUIP_TYPE ? 1300 : 1600;
  }
  if (toEquipTypeId === 12) return slotIndex === 3 ? 1200 : slotIndex === 4 ? 1300 : 1100;
  if (toEquipTypeId === 11) return slotIndex === 4 ? 800 : 700;
  return slotIndex === 4 ? 1000 : 800;
};

const createDefaultWeaponRefitTransitions = (actorIndex: number, slotIndex: number, fromEquipTypeId: number): RefitTransitionRule[] => {
  const [toMainCost, toSubCost, toSeCost] = getDefaultTankWeaponRefitCosts(actorIndex, slotIndex);
  const targetCosts = new Map<number, number>([
    [10, toMainCost],
    [11, toSubCost],
    [12, toSeCost],
  ]);
  const transitions: RefitTransitionRule[] = [];
  if (fromEquipTypeId > 0) {
    for (const fromTypeId of TANK_WEAPON_EQUIP_TYPES) {
      for (const toTypeId of TANK_WEAPON_EQUIP_TYPES) {
        if (fromTypeId === toTypeId) continue;
        transitions.push(createDefaultRefitTransition(fromTypeId, toTypeId, targetCosts.get(toTypeId) ?? 0));
      }
    }
    return transitions;
  }
  transitions.push(
    createDefaultRefitTransition(0, 10, toMainCost),
    createDefaultRefitTransition(0, 11, toSubCost),
    createDefaultRefitTransition(0, 12, toSeCost),
  );
  for (const fromTypeId of TANK_WEAPON_EQUIP_TYPES) {
    for (const toTypeId of TANK_WEAPON_EQUIP_TYPES) {
      if (fromTypeId === toTypeId) continue;
      transitions.push(createDefaultRefitTransition(fromTypeId, toTypeId, targetCosts.get(toTypeId) ?? 0));
    }
  }
  return transitions;
};

const createDefaultTankFlexibleRefitTransitions = (
  actorIndex: number,
  fromEquipTypeId: number,
): RefitTransitionRule[] => {
  const normalizedFromTypeId = asInt(fromEquipTypeId);
  const diff = Math.max(0, actorIndex - 16);
  const engineCost = 26500 + 1600 * diff;
  const cUnitCost = 22700 + 1300 * diff;
  const transitions: RefitTransitionRule[] = [];

  if (normalizedFromTypeId === 0) {
    transitions.push(
      createDefaultRefitTransition(0, TANK_ENGINE_EQUIP_TYPE, engineCost),
      createDefaultRefitTransition(0, TANK_C_UNIT_EQUIP_TYPE, cUnitCost),
    );
  }

  if (normalizedFromTypeId === 0 || normalizedFromTypeId === TANK_ENGINE_EQUIP_TYPE || normalizedFromTypeId === TANK_C_UNIT_EQUIP_TYPE) {
    transitions.push(
      createDefaultRefitTransition(TANK_ENGINE_EQUIP_TYPE, TANK_C_UNIT_EQUIP_TYPE, cUnitCost),
      createDefaultRefitTransition(TANK_C_UNIT_EQUIP_TYPE, TANK_ENGINE_EQUIP_TYPE, engineCost),
    );
  }

  return transitions;
};

const createDefaultTankRefitSlotRule = (
  actorIndex: number,
  slotIndex: number,
  fromEquipTypeId: number,
): ActorRefitSlotRule => {
  const fixedTypeId = TANK_FIXED_EQUIP_TYPES_BY_SLOT[slotIndex];
  if (fixedTypeId !== undefined && fromEquipTypeId === fixedTypeId) {
    return createDefaultActorRefitSlotRule(slotIndex, fixedTypeId);
  }
  if (isTankFlexibleCoreSlot(slotIndex)) {
    return {
      slotIndex,
      fromEquipTypeId: asInt(fromEquipTypeId),
      transitions: createDefaultTankFlexibleRefitTransitions(actorIndex, fromEquipTypeId),
    };
  }
  return {
    slotIndex,
    fromEquipTypeId: asInt(fromEquipTypeId),
    transitions: createDefaultWeaponRefitTransitions(actorIndex, slotIndex, asInt(fromEquipTypeId)),
  };
};

const createDefaultTankActorRefitRuleSet = (actorIndex: number, equipSlots: number[] | null | undefined): ActorRefitRuleSet => ({
  slots: normalizeNumberArray(equipSlots).map((fromEquipTypeId, slotIndex) => (
    createDefaultTankRefitSlotRule(actorIndex, slotIndex, fromEquipTypeId)
  )),
});

const hasAnyRefitTransition = (ruleSet: ActorRefitRuleSet | null): boolean => {
  if (!ruleSet) return false;
  return ruleSet.slots.some((slot) => slot.transitions.length > 0);
};

const clampRefitRuleSetCostsAfterPreviousActor = (
  ruleSet: ActorRefitRuleSet,
  previousRuleSet: ActorRefitRuleSet | null,
): ActorRefitRuleSet => {
  if (!previousRuleSet) return ruleSet;
  const previousCostByTransition = new Map<string, number>();
  previousRuleSet.slots.forEach((slot) => {
    slot.transitions.forEach((transition) => {
      previousCostByTransition.set(
        `${slot.slotIndex}:${transition.fromEquipTypeId}:${transition.toEquipTypeId}`,
        transition.goldCost,
      );
    });
  });
  if (previousCostByTransition.size === 0) return ruleSet;
  return {
    slots: ruleSet.slots.map((slot) => ({
      ...slot,
      transitions: slot.transitions.map((transition) => {
        const previousCost = previousCostByTransition.get(`${slot.slotIndex}:${transition.fromEquipTypeId}:${transition.toEquipTypeId}`);
        if (previousCost === undefined) return transition;
        const minCost = previousCost + getDefaultTankRefitCostStep(slot.slotIndex, transition.toEquipTypeId);
        if (transition.goldCost >= minCost) return transition;
        return { ...transition, goldCost: minCost };
      }),
    })),
  };
};

const normalizeActorRefitRuleSet = (value: unknown): ActorRefitRuleSet => {
  const source = asRecord(value);
  const rawSlots = Array.isArray(source?.slots) ? source.slots : [];
  const slots = rawSlots.flatMap((entry, index) => {
    const slot = normalizeRefitSlotRule(entry, index);
    return slot ? [completeRefitSlotTransitions(slot)] : [];
  });
  return { slots };
};

const cloneRefitTransitionRule = (transition: RefitTransitionRule): RefitTransitionRule => ({
  ...transition,
  conditions: transition.conditions.map(cloneRefitCondition),
});

const mergeRefitTransitions = (
  currentTransitions: RefitTransitionRule[],
  defaultTransitions: RefitTransitionRule[],
): RefitTransitionRule[] => {
  const transitions = currentTransitions.map(cloneRefitTransitionRule);
  const transitionKeys = new Set(transitions.map((transition) => `${transition.fromEquipTypeId}:${transition.toEquipTypeId}`));
  defaultTransitions.forEach((transition) => {
    const key = `${transition.fromEquipTypeId}:${transition.toEquipTypeId}`;
    if (transitionKeys.has(key)) return;
    transitions.push(cloneRefitTransitionRule(transition));
    transitionKeys.add(key);
  });
  return transitions;
};

const ensureTankFlexibleRefitSlotRule = (
  slot: ActorRefitSlotRule,
  actorIndex: number,
  fromEquipTypeId: number,
): ActorRefitSlotRule => {
  if (!isTankFlexibleCoreSlot(slot.slotIndex)) return slot;
  return completeRefitSlotTransitions({
    slotIndex: slot.slotIndex,
    fromEquipTypeId: asInt(fromEquipTypeId),
    transitions: mergeRefitTransitions(
      slot.transitions,
      createDefaultTankFlexibleRefitTransitions(actorIndex, fromEquipTypeId),
    ),
  });
};

const ensureTankFlexibleRefitRules = (
  ruleSet: ActorRefitRuleSet,
  actorIndex: number,
  equipSlots: number[] | null | undefined,
): ActorRefitRuleSet => {
  const slots = ruleSet.slots.map((slot) => ensureTankFlexibleRefitSlotRule(
    slot,
    actorIndex,
    asInt(equipSlots?.[slot.slotIndex]),
  ));
  const existingSlotIndexes = new Set(slots.map((slot) => slot.slotIndex));
  for (let slotIndex = TANK_FLEXIBLE_CORE_SLOT_START; slotIndex <= TANK_FLEXIBLE_CORE_SLOT_END; slotIndex++) {
    if (existingSlotIndexes.has(slotIndex)) continue;
    slots.push(createDefaultTankRefitSlotRule(actorIndex, slotIndex, asInt(equipSlots?.[slotIndex])));
  }
  slots.sort((a, b) => a.slotIndex - b.slotIndex);
  return { slots };
};

const normalizeIndexedActorRefitRules = (
  value: unknown,
  expectedLength: number,
  actorEquipSlots: Array<number[] | null> = [],
  tankActorIndexes: readonly number[] = [],
): IndexedActorRefitRuleSets => {
  const source = Array.isArray(value) ? value : [];
  const result: Array<ActorRefitRuleSet | null> = new Array(expectedLength).fill(null);
  const tankActorSet = new Set(tankActorIndexes);
  result[0] = null;

  for (let index = 1; index < expectedLength; index++) {
    const normalized = normalizeActorRefitRuleSet(source[index]);
    if (tankActorSet.has(index)) {
      const defaulted = hasAnyRefitTransition(normalized)
        ? normalized
        : clampRefitRuleSetCostsAfterPreviousActor(
          createDefaultTankActorRefitRuleSet(index, actorEquipSlots[index]),
          result[index - 1],
        );
      result[index] = ensureTankFlexibleRefitRules(defaulted, index, actorEquipSlots[index]);
    } else {
      result[index] = normalized;
    }
  }

  return result as IndexedActorRefitRuleSets;
};

export const createDefaultEquipExtensions = (actorCount: number, weaponCount: number): EquipExtensionsData => ({
  weaponEquipTypes: normalizeIndexedNumbers([], weaponCount),
  systemWeaponEquipTypes: [],
  actorEquipSlots: normalizeIndexedNumberLists([], actorCount),
  actorEquips: normalizeIndexedNumberLists([], actorCount),
  actorRefitRules: normalizeIndexedActorRefitRules([], actorCount),
});

export const normalizeEquipExtensions = (
  value: unknown,
  actorCount: number,
  weaponCount: number,
  tankActorIndexes: readonly number[] = [],
): NormalizedEquipExtensionsResult => {
  const source = asRecord(value);
  const fallback = createDefaultEquipExtensions(actorCount, weaponCount);

  if (!source) {
    return {
      data: fallback,
      changed: true,
    };
  }

  const actorEquipSlots = normalizeIndexedNumberLists(source.actorEquipSlots, actorCount);
  const data: EquipExtensionsData = {
    weaponEquipTypes: normalizeIndexedNumbers(source.weaponEquipTypes, weaponCount),
    systemWeaponEquipTypes: Array.from(new Set(normalizeNumberArray(source.systemWeaponEquipTypes).filter((item) => item > 0))),
    actorEquipSlots,
    actorEquips: normalizeIndexedNumberLists(source.actorEquips, actorCount),
    actorRefitRules: normalizeIndexedActorRefitRules(source.actorRefitRules, actorCount, actorEquipSlots, tankActorIndexes),
  };

  const changed = !arePlainDataEqual(source, data);
  return { data, changed };
};

const diffIndexedValues = (
  before: Array<number | null> | null | undefined,
  after: Array<number | null>,
): number[] => {
  const changedIndexes: number[] = [];
  const maxLength = Math.max(Array.isArray(before) ? before.length : 0, after.length);
  for (let index = 1; index < maxLength; index++) {
    const beforeValue = asInt(Array.isArray(before) ? before[index] : 0);
    const afterValue = asInt(after[index]);
    if (beforeValue !== afterValue) {
      changedIndexes.push(index);
    }
  }
  return changedIndexes;
};

const diffIndexedLists = (
  before: unknown,
  after: Array<number[] | null>,
): number[] => {
  const source = Array.isArray(before) ? before : [];
  const changedIndexes: number[] = [];
  const maxLength = Math.max(source.length, after.length);
  for (let index = 1; index < maxLength; index++) {
    const beforeList = normalizeNumberArray(source[index]);
    const afterList = normalizeNumberArray(after[index]);
    if (JSON.stringify(beforeList) !== JSON.stringify(afterList)) {
      changedIndexes.push(index);
    }
  }
  return changedIndexes;
};

const formatChangedIndexes = (indexes: number[]): string => {
  if (indexes.length === 0) return '';
  const preview = indexes.slice(0, 8).join(', ');
  if (indexes.length <= 8) {
    return preview;
  }
  return `${preview} 等 ${indexes.length} 项`;
};

export const previewEquipExtensionsNormalization = (
  value: unknown,
  actorCount: number,
  weaponCount: number,
): EquipExtensionsNormalizationPreview => {
  const normalized = normalizeEquipExtensions(value, actorCount, weaponCount);
  if (!normalized.changed) {
    return {
      ...normalized,
      summary: 'EquipExtensions.json 已符合当前规范，无需修复。',
      changedSections: [],
    };
  }

  const source = asRecord(value);
  if (!source) {
    return {
      ...normalized,
      summary: 'EquipExtensions.json 结构无效，确认后会重建为标准结构。',
      changedSections: ['文件结构无效，将整体重建'],
    };
  }

  const changedSections: string[] = [];
  const weaponTypeIndexes = diffIndexedValues(source.weaponEquipTypes as Array<number | null> | undefined, normalized.data.weaponEquipTypes);
  if (weaponTypeIndexes.length > 0) {
    changedSections.push(`weaponEquipTypes：索引 ${formatChangedIndexes(weaponTypeIndexes)} 将被修正`);
  }

  const currentSystemWeaponEquipTypes = normalizeNumberArray(source.systemWeaponEquipTypes);
  if (JSON.stringify(currentSystemWeaponEquipTypes) !== JSON.stringify(normalized.data.systemWeaponEquipTypes)) {
    changedSections.push(`systemWeaponEquipTypes：将整理为 [${normalized.data.systemWeaponEquipTypes.join(', ')}]`);
  }

  const actorEquipSlotIndexes = diffIndexedLists(source.actorEquipSlots, normalized.data.actorEquipSlots);
  if (actorEquipSlotIndexes.length > 0) {
    changedSections.push(`actorEquipSlots：角色 ${formatChangedIndexes(actorEquipSlotIndexes)} 将被修正`);
  }

  const actorEquipsIndexes = diffIndexedLists(source.actorEquips, normalized.data.actorEquips);
  if (actorEquipsIndexes.length > 0) {
    changedSections.push(`actorEquips：角色 ${formatChangedIndexes(actorEquipsIndexes)} 将被修正`);
  }

  if (JSON.stringify(source.actorRefitRules) !== JSON.stringify(normalized.data.actorRefitRules)) {
    changedSections.push('actorRefitRules：改造规则结构将被规范化');
  }

  const summary = [
    '检测到 EquipExtensions.json 需要规范化。',
    ...changedSections.map((line) => `- ${line}`),
    '',
    '确认后才会写入 EquipExtensions.json。',
  ].join('\n');

  return {
    ...normalized,
    summary,
    changedSections,
  };
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
export const remapWeaponEquipTypeIndexes = (
  weaponEquipTypes: Array<number | null>,
  nextIndexByOriginalIndex: Map<number, number>,
): Array<number | null> => {
  const nextWeaponEquipTypes: Array<number | null> = new Array(weaponEquipTypes.length).fill(0);
  nextWeaponEquipTypes[0] = null;
  for (let index = 1; index < weaponEquipTypes.length; index++) {
    const currentTypeId = asInt(weaponEquipTypes[index]);
    nextWeaponEquipTypes[index] = currentTypeId > 0
      ? (nextIndexByOriginalIndex.get(currentTypeId) || 0)
      : 0;
  }
  return nextWeaponEquipTypes;
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

export const createDefaultActorRefitSlotRule = (slotIndex: number, fromEquipTypeId: number): ActorRefitSlotRule => ({
  slotIndex,
  fromEquipTypeId: asInt(fromEquipTypeId),
  transitions: [],
});

export const getActorRefitSlotsFromExtensions = (
  extensions: EquipExtensionsData | null,
  actorIndex: number,
  equipSlots: number[],
): ActorRefitSlotRule[] => {
  if (!extensions || actorIndex <= 0) {
    return equipSlots.map((fromTypeId, slotIndex) => createDefaultActorRefitSlotRule(slotIndex, fromTypeId));
  }

  const ruleSet = extensions.actorRefitRules[actorIndex] as ActorRefitRuleSet;
  const slotRules = ruleSet.slots;
  const ruleBySlotIndex = new Map<number, ActorRefitSlotRule>();
  slotRules.forEach((rule) => {
    ruleBySlotIndex.set(rule.slotIndex, rule);
  });

  return equipSlots.map((fromTypeId, slotIndex) => {
    const existing = ruleBySlotIndex.get(slotIndex);
    if (!existing) {
      return createDefaultActorRefitSlotRule(slotIndex, fromTypeId);
    }

    return {
      slotIndex,
      fromEquipTypeId: asJsonInt(fromTypeId),
      transitions: existing.transitions.map((transition) => ({
        ...transition,
        conditions: transition.conditions.map((condition) => ({ ...condition })),
      })),
    };
  });
};
