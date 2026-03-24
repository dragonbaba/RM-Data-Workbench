import { describe, expect, it } from 'vitest';
import {
  getEquipCandidateOptions,
  getEquipSourceKind,
  getEquipTypes,
  getEquipTypeOptions,
  getSystemWeaponEquipTypes,
  isEquipCandidateValid,
} from './EquipDataService';

describe('EquipDataService', () => {
  it('keeps equipTypes index 0 as none option', () => {
    const systemData = [null, {
      equipTypes: ['', '武器', '盾牌'],
    }];
    const options = getEquipTypeOptions(systemData);

    expect(options[0]).toEqual({
      value: 0,
      label: '0 : 无类型',
      name: '',
      isNone: true,
    });
    expect(getEquipTypes(systemData)).toEqual(['', '武器', '盾牌']);
    expect(options[1]?.label).toBe('1 : 武器');
    expect(options[2]?.label).toBe('2 : 盾牌');
  });

  it('normalizes and deduplicates weapon equip types from extension data', () => {
    const result = getSystemWeaponEquipTypes({
      weaponEquipTypes: [null],
      systemWeaponEquipTypes: [1, '2' as unknown as number, 2, 0, -1, null as unknown as number, 3.5 as unknown as number, 'abc' as unknown as number],
      actorEquipSlots: [null],
      actorEquips: [null],
    });

    expect(result).toEqual([1, 2]);
  });

  it('returns weapon candidates filtered by slot type', () => {
    const options = getEquipCandidateOptions(
      10,
      [10, 11, 12],
      [null, 10, 11],
      [
        null,
        { id: 1, name: '主炮A', etypeId: 1, wtypeId: 1 },
        { id: 2, name: '副炮B', etypeId: 1, wtypeId: 2 },
      ],
      [
        null,
        { id: 3, name: '引擎', etypeId: 7, atypeId: 1 },
      ],
    );

    expect(getEquipSourceKind(10, [10, 11, 12])).toBe('weapon');
    expect(options.map((item) => item.value)).toEqual([0, 1]);
    expect(isEquipCandidateValid(1, options)).toBe(true);
    expect(isEquipCandidateValid(2, options)).toBe(false);
  });

  it('returns armor candidates filtered by slot type', () => {
    const options = getEquipCandidateOptions(
      7,
      [10, 11, 12],
      [null, 10],
      [
        null,
        { id: 1, name: '主炮A', etypeId: 10, wtypeId: 1 },
      ],
      [
        null,
        { id: 2, name: '引擎A', etypeId: 7, atypeId: 1 },
        { id: 3, name: '底盘B', etypeId: 9, atypeId: 3 },
      ],
    );

    expect(getEquipSourceKind(7, [10, 11, 12])).toBe('armor');
    expect(options.map((item) => item.value)).toEqual([0, 2]);
  });
});
