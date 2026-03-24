import { describe, expect, it } from 'vitest';
import {
  extractSystemRecord,
  normalizeStandardDataForEditor,
  prepareDataForWrite,
} from './DataFileFormatService';

describe('DataFileFormatService', () => {
  it('wraps System.json object data for editor usage', () => {
    const normalized = normalizeStandardDataForEditor('System.json', {
      equipTypes: ['', '武器'],
      switches: [''],
    });

    expect(normalized).toEqual([null, {
      equipTypes: ['', '武器'],
      switches: [''],
    }]);
  });

  it('unwraps wrapped System.json payload before write', () => {
    const payload = prepareDataForWrite('D:/Game/data/System.json', [null, {
      equipTypes: ['', '武器'],
      weaponEquipTypes: [1],
    }]);

    expect(payload).toEqual({
      equipTypes: ['', '武器'],
      weaponEquipTypes: [1],
    });
  });

  it('keeps non-system payload unchanged before write', () => {
    const payload = [null, { id: 1, name: 'Hero' }];
    expect(prepareDataForWrite('D:/Game/data/Actors.json', payload)).toBe(payload);
  });

  it('extracts system record from either wrapped array or plain object', () => {
    const wrapped = extractSystemRecord([null, { equipTypes: ['', '盾牌'] }]);
    const plain = extractSystemRecord({ equipTypes: ['', '头盔'] });

    expect(wrapped).toEqual({ equipTypes: ['', '盾牌'] });
    expect(plain).toEqual({ equipTypes: ['', '头盔'] });
  });
});
