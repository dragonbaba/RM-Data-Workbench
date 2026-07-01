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

export interface CopyActorEquipStateResult {
  data: EquipExtensionsData;
  copiedIndexes: number[];
  skippedIndexes: number[];
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const collectTankActorIndexes = (actorsData: unknown): number[] => {
  if (!Array.isArray(actorsData)) return [];
  const result: number[] = [];
  for (let index = 1; index < actorsData.length; index++) {
    const actor = asRecord(actorsData[index]);
    if (actor?.isTank === true) result.push(index);
  }
  return result;
};

const isTankActorIndex = (actorsData: unknown[], actorIndex: number): boolean => {
  const actor = asRecord(actorsData[actorIndex]);
  return actor?.isTank === true;
};

export const copyActorEquipStateToTargets = (
  data: EquipExtensionsData,
  actorsData: unknown,
  sourceActorIndex: number,
  targetIndexes: readonly number[],
): CopyActorEquipStateResult | null => {
  const actors = Array.isArray(actorsData) ? actorsData : [];
  if (sourceActorIndex <= 0 || sourceActorIndex >= actors.length) return null;

  const sourceEquipSlots = data.actorEquipSlots[sourceActorIndex];
  const sourceEquips = data.actorEquips[sourceActorIndex];
  if (!Array.isArray(sourceEquipSlots) || !Array.isArray(sourceEquips)) return null;

  const sourceIsTank = isTankActorIndex(actors, sourceActorIndex);
  const copiedIndexes: number[] = [];
  const skippedIndexes: number[] = [];
  for (let i = 0; i < targetIndexes.length; i++) {
    const targetIndex = targetIndexes[i];
    if (
      targetIndex <= 0
      || targetIndex >= actors.length
      || targetIndex === sourceActorIndex
      || isTankActorIndex(actors, targetIndex) !== sourceIsTank
    ) {
      skippedIndexes.push(targetIndex);
      continue;
    }
    copiedIndexes.push(targetIndex);
  }

  if (copiedIndexes.length === 0) {
    return { data, copiedIndexes, skippedIndexes };
  }

  const nextActorEquipSlots = [...data.actorEquipSlots];
  const nextActorEquips = [...data.actorEquips];
  for (let i = 0; i < copiedIndexes.length; i++) {
    const targetIndex = copiedIndexes[i];
    nextActorEquipSlots[targetIndex] = [...sourceEquipSlots];
    nextActorEquips[targetIndex] = [...sourceEquips];
  }

  return {
    data: {
      ...data,
      actorEquipSlots: nextActorEquipSlots,
      actorEquips: nextActorEquips,
    },
    copiedIndexes,
    skippedIndexes,
  };
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
    fromEquipTypeId:
      typeof source.fromEquipTypeId === 'number' && Number.isInteger(source.fromEquipTypeId) && source.fromEquipTypeId >= 0
        ? source.fromEquipTypeId
        : fallbackFromTypeId,
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
const TANK_BASE_EQUIP_TYPE = 9;
const TANK_ARMOR_EQUIP_TYPES = [TANK_ENGINE_EQUIP_TYPE, TANK_C_UNIT_EQUIP_TYPE, TANK_BASE_EQUIP_TYPE] as const;
const TANK_CORE_SLOT_START = 5;

const isTankCoreRefitType = (typeId: number): boolean => (
  typeId === TANK_ENGINE_EQUIP_TYPE || typeId === TANK_C_UNIT_EQUIP_TYPE
);

const getTankChassisSlotIndex = (equipSlots: number[] | null | undefined): number => (
  equipSlots && equipSlots.length > 0 ? equipSlots.length - 1 : -1
);

const isTankChassisSlot = (slotIndex: number, equipSlots: number[] | null | undefined): boolean => (
  slotIndex === getTankChassisSlotIndex(equipSlots)
);

const isTankCoreSlot = (slotIndex: number, equipSlots: number[] | null | undefined): boolean => {
  const chassisSlotIndex = getTankChassisSlotIndex(equipSlots);
  return slotIndex >= TANK_CORE_SLOT_START && slotIndex < chassisSlotIndex;
};

const normalizeTankActorEquipSlots = (equipSlots: number[] | null): number[] | null => {
  if (!equipSlots || equipSlots.length === 0) return equipSlots;
  const normalized = equipSlots.slice();
  const chassisSlotIndex = getTankChassisSlotIndex(normalized);
  if (chassisSlotIndex >= 0) {
    normalized[chassisSlotIndex] = TANK_BASE_EQUIP_TYPE;
  }
  return normalized;
};

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
  if (isTankCoreRefitType(toEquipTypeId)) {
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
  equipSlots: number[] | null | undefined,
): ActorRefitSlotRule => {
  if (isTankChassisSlot(slotIndex, equipSlots)) {
    return createDefaultActorRefitSlotRule(slotIndex, TANK_BASE_EQUIP_TYPE);
  }
  if (isTankCoreSlot(slotIndex, equipSlots)) {
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
  slots: normalizeNumberArray(equipSlots).map((fromEquipTypeId, slotIndex, slots) => (
    createDefaultTankRefitSlotRule(actorIndex, slotIndex, fromEquipTypeId, slots)
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
  equipSlots: number[] | null | undefined,
): ActorRefitSlotRule => {
  if (isTankChassisSlot(slot.slotIndex, equipSlots)) {
    return createDefaultActorRefitSlotRule(slot.slotIndex, TANK_BASE_EQUIP_TYPE);
  }
  if (!isTankCoreSlot(slot.slotIndex, equipSlots)) return slot;
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
    equipSlots,
  ));
  const existingSlotIndexes = new Set(slots.map((slot) => slot.slotIndex));
  const chassisSlotIndex = getTankChassisSlotIndex(equipSlots);
  for (let slotIndex = TANK_CORE_SLOT_START; slotIndex < chassisSlotIndex; slotIndex++) {
    if (existingSlotIndexes.has(slotIndex)) continue;
    slots.push(createDefaultTankRefitSlotRule(actorIndex, slotIndex, asInt(equipSlots?.[slotIndex]), equipSlots));
    existingSlotIndexes.add(slotIndex);
  }
  if (chassisSlotIndex >= 0 && !existingSlotIndexes.has(chassisSlotIndex)) {
    slots.push(createDefaultActorRefitSlotRule(chassisSlotIndex, TANK_BASE_EQUIP_TYPE));
  }
  slots.sort((a, b) => a.slotIndex - b.slotIndex);
  return { slots };
};

// NOTE: only the current tank refit rule helper is kept; legacy fixed-slot helper removed.
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

const normalizeIndexedActorEquipSlots = (
  value: unknown,
  expectedLength: number,
  tankActorIndexes: readonly number[] = [],
): Array<number[] | null> => {
  const result = normalizeIndexedNumberLists(value, expectedLength);
  for (let i = 0; i < tankActorIndexes.length; i++) {
    const actorIndex = tankActorIndexes[i];
    if (actorIndex > 0 && actorIndex < expectedLength) {
      result[actorIndex] = normalizeTankActorEquipSlots(result[actorIndex]);
    }
  }
  return result;
};

const normalizeIndexedActorEquips = (
  value: unknown,
  expectedLength: number,
  actorEquipSlots: Array<number[] | null>,
  tankActorIndexes: readonly number[] = [],
): Array<number[] | null> => {
  const result = normalizeIndexedNumberLists(value, expectedLength);
  for (let i = 0; i < tankActorIndexes.length; i++) {
    const actorIndex = tankActorIndexes[i];
    if (actorIndex <= 0 || actorIndex >= expectedLength) continue;
    const equipSlots = actorEquipSlots[actorIndex];
    if (!equipSlots) continue;
    const equips = result[actorIndex] ? [...(result[actorIndex] as number[])] : [];
    while (equips.length < equipSlots.length) {
      equips.push(0);
    }
    if (equips.length > equipSlots.length) {
      equips.length = equipSlots.length;
    }
    result[actorIndex] = equips;
  }
  return result;
};

const isTankWeaponEquipType = (slotTypeId: number): boolean => (
  (TANK_WEAPON_EQUIP_TYPES as readonly number[]).includes(slotTypeId)
);

const isTankArmorEquipType = (slotTypeId: number): boolean => (
  (TANK_ARMOR_EQUIP_TYPES as readonly number[]).includes(slotTypeId)
);

const getTankEquipTypeIdForSlot = (
  slotTypeId: number,
  equipId: number,
  weaponsData: unknown[] | null | undefined,
  armorsData: unknown[] | null | undefined,
): number => {
  if (equipId <= 0) return 0;
  if (isTankWeaponEquipType(slotTypeId)) {
    return asInt(asRecord(weaponsData?.[equipId])?.etypeId);
  }
  if (isTankArmorEquipType(slotTypeId)) {
    return asInt(asRecord(armorsData?.[equipId])?.etypeId);
  }
  return 0;
};

const isTankEquipIdValidForSlot = (
  slotTypeId: number,
  equipId: number,
  weaponsData: unknown[] | null | undefined,
  armorsData: unknown[] | null | undefined,
): boolean => (
  slotTypeId > 0
  && equipId > 0
  && getTankEquipTypeIdForSlot(slotTypeId, equipId, weaponsData, armorsData) === slotTypeId
);

export const repairTankActorEquipsBySlotProtocol = (
  actorEquips: unknown,
  actorEquipSlots: unknown,
  weaponsData: unknown[] | null | undefined,
  armorsData: unknown[] | null | undefined,
): number[] => {
  const equipSlots = normalizeNumberArray(actorEquipSlots);
  const result = normalizeNumberArray(actorEquips);
  if (equipSlots.length === 0) return result;
  while (result.length < equipSlots.length) {
    result.push(0);
  }
  if (result.length > equipSlots.length) {
    result.length = equipSlots.length;
  }
  const occupied = result.map((equipId, slotIndex) => (
    isTankEquipIdValidForSlot(equipSlots[slotIndex], equipId, weaponsData, armorsData)
  ));
  for (let slotIndex = 0; slotIndex < result.length; slotIndex++) {
    const equipId = result[slotIndex] | 0;
    if (equipId <= 0 || occupied[slotIndex]) continue;
    let targetIndex = -1;
    for (let index = 0; index < equipSlots.length; index++) {
      if (occupied[index] || result[index] > 0) continue;
      if (!isTankEquipIdValidForSlot(equipSlots[index], equipId, weaponsData, armorsData)) continue;
      targetIndex = index;
      break;
    }
    if (targetIndex < 0) continue;
    result[targetIndex] = equipId;
    result[slotIndex] = 0;
    occupied[targetIndex] = true;
  }
  return result;
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

  const actorEquipSlots = normalizeIndexedActorEquipSlots(source.actorEquipSlots, actorCount, tankActorIndexes);
  const actorEquips = normalizeIndexedActorEquips(
    source.actorEquips,
    actorCount,
    actorEquipSlots,
    tankActorIndexes,
  );
  const data: EquipExtensionsData = {
    weaponEquipTypes: normalizeIndexedNumbers(source.weaponEquipTypes, weaponCount),
    systemWeaponEquipTypes: Array.from(new Set(normalizeNumberArray(source.systemWeaponEquipTypes).filter((item) => item > 0))),
    actorEquipSlots,
    actorEquips,
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
