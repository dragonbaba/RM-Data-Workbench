import { describe, expect, it } from 'vitest';
import {
  createDefaultEquipExtensions,
  getActorEquipStateFromExtensions,
  getActorRefitSlotsFromExtensions,
  getExpectedWeaponEquipTypeByWtypeId,
  getWeaponEquipTypeAtIndex,
  normalizeEquipExtensions,
  previewEquipExtensionsNormalization,
  remapWeaponEquipTypeIndexes,
  repairWeaponEquipTypes,
} from './EquipExtensionsService';

describe('EquipExtensionsService', () => {
  it('creates default indexed extension data', () => {
    const result = createDefaultEquipExtensions(4, 3);

    expect(result).toEqual({
      weaponEquipTypes: [null, 0, 0],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [], [], []],
      actorEquips: [null, [], [], []],
      actorRefitRules: [null, { slots: [] }, { slots: [] }, { slots: [] }],
    });
  });

  it('normalizes malformed extension data to actor and weapon counts', () => {
    const result = normalizeEquipExtensions({
      weaponEquipTypes: [999, 10, -1, 'abc'],
      systemWeaponEquipTypes: [10, 11, 11, 0, -1],
      actorEquipSlots: [999, [10, 11], 'bad'],
      actorEquips: [999, [1, 2], [3]],
    }, 4, 3);

    expect(result.changed).toBe(true);
    expect(result.data).toEqual({
      weaponEquipTypes: [null, 10, 0],
      systemWeaponEquipTypes: [10, 11],
      actorEquipSlots: [null, [10, 11], [], []],
      actorEquips: [null, [1, 2], [3], []],
      actorRefitRules: [null, { slots: [] }, { slots: [] }, { slots: [] }],
    });
  });
  it('derives weapon equip type from weapon type semantics', () => {
    expect(getExpectedWeaponEquipTypeByWtypeId(1)).toBe(10);
    expect(getExpectedWeaponEquipTypeByWtypeId(2)).toBe(11);
    expect(getExpectedWeaponEquipTypeByWtypeId(3)).toBe(12);
    expect(getExpectedWeaponEquipTypeByWtypeId(4)).toBe(1);
    expect(getExpectedWeaponEquipTypeByWtypeId(12)).toBe(1);
    expect(getExpectedWeaponEquipTypeByWtypeId(0)).toBe(0);
    expect(getExpectedWeaponEquipTypeByWtypeId(undefined)).toBeNull();
  });

  it('repairs weapon equip assignments from weapon wtype data', () => {
    const repaired = repairWeaponEquipTypes(
      [null, 1, 10, 0, 12],
      [
        null,
        { id: 1, name: '巡航战车炮', wtypeId: 1 },
        { id: 2, name: '超震动罗勒莱', wtypeId: 2 },
        { id: 3, name: '--主炮--通常单体', wtypeId: 0 },
        { id: 4, name: '托卢', wtypeId: 3 },
      ],
      5,
    );

    expect(repaired).toEqual([null, 10, 11, 0, 12]);
  });

  it('remaps stored weapon equip type indexes when equipTypes are reindexed', () => {
    const remapped = remapWeaponEquipTypeIndexes(
      [null, 10, 11, 12, 1, 0],
      new Map([
        [1, 1],
        [10, 7],
        [11, 8],
        [12, 9],
      ]),
    );

    expect(remapped).toEqual([null, 7, 8, 9, 1, 0]);
  });

  it('does not mark normalized data changed when only object key order differs', () => {
    const result = normalizeEquipExtensions({
      actorRefitRules: [null, { slots: [] }],
      actorEquips: [null, []],
      actorEquipSlots: [null, []],
      systemWeaponEquipTypes: [],
      weaponEquipTypes: [null],
    }, 2, 1);

    expect(result.changed).toBe(false);
  });

  it('normalizes actor refit rules with transitions and conditions', () => {
    const result = normalizeEquipExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [10]],
      actorEquips: [null, [1]],
      actorRefitRules: [null, {
        slots: [{
          slotIndex: 0,
          fromEquipTypeId: 10,
          transitions: [{
            fromEquipTypeId: 10,
            toEquipTypeId: 11,
            goldCost: 1200,
            conditions: [
              { kind: 'none' },
              { kind: 'switch', switchId: 98, value: true },
              { kind: 'variable', variableId: 5, op: '>=', value: 3 },
            ],
          }, {
            toEquipTypeId: 0,
            goldCost: 10,
          }],
        }],
      }],
    }, 2, 1);

    expect(result.data.actorRefitRules[1]).toEqual({
      slots: [{
        slotIndex: 0,
        fromEquipTypeId: 10,
        transitions: [{
          fromEquipTypeId: 10,
          toEquipTypeId: 11,
          goldCost: 1200,
          conditions: [
            { kind: 'none' },
            { kind: 'switch', switchId: 98, value: true },
            { kind: 'variable', variableId: 5, op: '>=', value: 3 },
          ],
        }, {
          fromEquipTypeId: 11,
          toEquipTypeId: 10,
          goldCost: 1200,
          conditions: [
            { kind: 'none' },
            { kind: 'switch', switchId: 98, value: true },
            { kind: 'variable', variableId: 5, op: '>=', value: 3 },
          ],
        }],
      }],
    });
  });

  it('completes positive refit type transitions in the same slot', () => {
    const result = normalizeEquipExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [0]],
      actorEquips: [null, [0]],
      actorRefitRules: [null, {
        slots: [{
          slotIndex: 0,
          fromEquipTypeId: 0,
          transitions: [{
            fromEquipTypeId: 0,
            toEquipTypeId: 10,
            goldCost: 1000,
            conditions: [{ kind: 'none' }],
          }, {
            fromEquipTypeId: 0,
            toEquipTypeId: 11,
            goldCost: 800,
            conditions: [{ kind: 'switch', switchId: 5, value: true }],
          }, {
            fromEquipTypeId: 0,
            toEquipTypeId: 12,
            goldCost: 1500,
            conditions: [{ kind: 'variable', variableId: 2, op: '>=', value: 1 }],
          }],
        }],
      }],
    }, 2, 1);

    const transitions = result.data.actorRefitRules[1]?.slots[0].transitions || [];
    expect(transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromEquipTypeId: 10, toEquipTypeId: 11, goldCost: 800 }),
      expect.objectContaining({ fromEquipTypeId: 10, toEquipTypeId: 12, goldCost: 1500 }),
      expect.objectContaining({ fromEquipTypeId: 11, toEquipTypeId: 10, goldCost: 1000 }),
      expect.objectContaining({ fromEquipTypeId: 12, toEquipTypeId: 10, goldCost: 1000 }),
    ]));
  });

  it('fills missing tank actor refit rules from the default monotonic template', () => {
    const result = normalizeEquipExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [
        null,
        [0, 0, 0, 0, 0, 7, 0, 8, 0, 9],
        [10, 0, 0, 0, 0, 7, 0, 8, 0, 9],
        [0, 0, 0, 0, 0, 7, 0, 8, 0, 9],
      ],
      actorEquips: [null, [], [], []],
      actorRefitRules: [null, {
        slots: [{
          slotIndex: 0,
          fromEquipTypeId: 0,
          transitions: [{
            fromEquipTypeId: 10,
            toEquipTypeId: 12,
            goldCost: 20000,
            conditions: [{ kind: 'none' }],
          }],
        }],
      }, {
        slots: [
          { slotIndex: 0, fromEquipTypeId: 10, transitions: [] },
          { slotIndex: 1, fromEquipTypeId: 0, transitions: [] },
          { slotIndex: 5, fromEquipTypeId: 7, transitions: [] },
        ],
      }, { slots: [] }],
    }, 4, 1, [2, 3]);

    const actor2Slot0Transitions = result.data.actorRefitRules[2]?.slots[0].transitions || [];
    expect(actor2Slot0Transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromEquipTypeId: 10, toEquipTypeId: 11, goldCost: 11600 }),
      expect.objectContaining({ fromEquipTypeId: 10, toEquipTypeId: 12, goldCost: 21100 }),
    ]));
    expect(result.data.actorRefitRules[2]?.slots[5].transitions).toEqual([]);
    expect(result.data.actorRefitRules[3]?.slots[0].transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromEquipTypeId: 0, toEquipTypeId: 10, goldCost: 13700 }),
      expect.objectContaining({ fromEquipTypeId: 10, toEquipTypeId: 12, goldCost: 22200 }),
    ]));
  });

  it('uses actor equips length as the display baseline and pads missing slots with 0', () => {
    const state = getActorEquipStateFromExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [10]],
      actorEquips: [null, [3, 4, 5]],
      actorRefitRules: [null, { slots: [] }],
    }, 1);

    expect(state).toEqual({
      equipSlots: [10, 0, 0],
      equips: [3, 4, 5],
    });
  });

  it('reads weapon equip type by aligned weapon index', () => {
    expect(getWeaponEquipTypeAtIndex({
      weaponEquipTypes: [null, 10, 11],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null],
      actorEquips: [null],
      actorRefitRules: [null],
    }, 2)).toBe(11);
  });

  it('aligns actor refit slots to current equip slots', () => {
    const slots = getActorRefitSlotsFromExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [10, 11]],
      actorEquips: [null, [1, 2]],
      actorRefitRules: [null, {
        slots: [{
          slotIndex: 1,
          fromEquipTypeId: 11,
          transitions: [{
            fromEquipTypeId: 11,
            toEquipTypeId: 12,
            goldCost: 500,
            conditions: [],
          }, {
            fromEquipTypeId: 12,
            toEquipTypeId: 11,
            goldCost: 600,
            conditions: [{ kind: 'none' }],
          }],
        }],
      }],
    }, 1, [10, 11]);

    expect(slots).toEqual([
      { slotIndex: 0, fromEquipTypeId: 10, transitions: [] },
      {
        slotIndex: 1,
        fromEquipTypeId: 11,
        transitions: [{
          fromEquipTypeId: 11,
          toEquipTypeId: 12,
          goldCost: 500,
          conditions: [],
        }, {
          fromEquipTypeId: 12,
          toEquipTypeId: 11,
          goldCost: 600,
          conditions: [{ kind: 'none' }],
        }],
      },
    ]);
  });

  it('builds normalization preview summary for changed sections', () => {
    const result = previewEquipExtensionsNormalization({
      weaponEquipTypes: [999, 10, -1, 'abc'],
      systemWeaponEquipTypes: [10, 11, 11, 0, -1],
      actorEquipSlots: [999, [10, 11], 'bad'],
      actorEquips: [999, [1, 2], [3]],
    }, 4, 3);

    expect(result.changed).toBe(true);
    expect(result.changedSections).toEqual([
      'systemWeaponEquipTypes：将整理为 [10, 11]',
      'actorRefitRules：改造规则结构将被规范化',
    ]);
    expect(result.summary).toContain('检测到 EquipExtensions.json 需要规范化。');
    expect(result.summary).toContain('确认后才会写入 EquipExtensions.json。');
  });
});
