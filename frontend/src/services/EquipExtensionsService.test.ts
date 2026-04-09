import { describe, expect, it } from 'vitest';
import {
  createDefaultEquipExtensions,
  getActorEquipStateFromExtensions,
  getWeaponEquipTypeAtIndex,
  normalizeEquipExtensions,
  previewEquipExtensionsNormalization,
} from './EquipExtensionsService';

describe('EquipExtensionsService', () => {
  it('creates default indexed extension data', () => {
    const result = createDefaultEquipExtensions(4, 3);

    expect(result).toEqual({
      weaponEquipTypes: [null, 0, 0],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [], [], []],
      actorEquips: [null, [], [], []],
    });
  });

  it('normalizes malformed extension data to actor and weapon counts', () => {
    const result = normalizeEquipExtensions({
      weaponEquipTypes: [999, '10', -1, 'abc'],
      systemWeaponEquipTypes: [10, '11', 11, 0, -1],
      actorEquipSlots: [999, [10, '11'], 'bad'],
      actorEquips: [999, [1, '2'], [3]],
    }, 4, 3);

    expect(result.changed).toBe(true);
    expect(result.data).toEqual({
      weaponEquipTypes: [null, 10, 0],
      systemWeaponEquipTypes: [10, 11],
      actorEquipSlots: [null, [10, 11], [], []],
      actorEquips: [null, [1, 2], [3], []],
    });
  });

  it('uses actor equips length as the display baseline and pads missing slots with 0', () => {
    const state = getActorEquipStateFromExtensions({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [],
      actorEquipSlots: [null, [10]],
      actorEquips: [null, [3, 4, 5]],
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
    }, 2)).toBe(11);
  });

  it('builds normalization preview summary for changed sections', () => {
    const result = previewEquipExtensionsNormalization({
      weaponEquipTypes: [999, '10', -1, 'abc'],
      systemWeaponEquipTypes: [10, '11', 11, 0, -1],
      actorEquipSlots: [999, [10, '11'], 'bad'],
      actorEquips: [999, [1, '2'], [3]],
    }, 4, 3);

    expect(result.changed).toBe(true);
    expect(result.changedSections).toEqual([
      'systemWeaponEquipTypes：将整理为 [10, 11]',
    ]);
    expect(result.summary).toContain('检测到 EquipExtensions.json 需要规范化。');
    expect(result.summary).toContain('确认后才会写入 EquipExtensions.json。');
  });
});
