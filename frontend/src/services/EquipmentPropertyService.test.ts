import { describe, expect, it } from 'vitest';
import {
  normalizeArmorElementRateFloats,
  normalizeArmorElementRates,
  normalizeEquipmentDataEntry,
} from './EquipmentPropertyService';

describe('EquipmentPropertyService', () => {
  it('会补齐武器固定结构字段', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 8,
        name: '测试炮',
        vehicleParams: {
          repeat: { value: 2 },
        },
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized).toMatchObject({
      id: 8,
      name: '测试炮',
      floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
      attackSkillId: 0,
      attackElementId: 0,
      areaOverride: 0,
      areaMode: 1,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
      repeatTimeFloat: 0,
      qualityLock: false,
      vehicleParams: {
        repeat: { value: 2, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        actionRepeat: { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      },
    });
  });

  it('会按系统元素数量补齐防具元素字段', () => {
    const systemData = {
      elements: ['', '通常', '火炎', '冷气'],
    };

    expect(normalizeArmorElementRates([99, 1.2], systemData)).toEqual([0, 1.2, 0, 0]);
    expect(normalizeArmorElementRateFloats([99, 0.5, -3], systemData)).toEqual([0, 0.5, 0, 0]);
  });

  it('会兼容编辑器缓存里的包装 System.json 结构', () => {
    const wrappedSystemData = [null, {
      elements: ['', '通常', '火炎', '冷气'],
    }];

    expect(normalizeArmorElementRates([99, 1.2], wrappedSystemData)).toEqual([0, 1.2, 0, 0]);
    expect(normalizeArmorElementRateFloats([99, 0.5, -3], wrappedSystemData)).toEqual([0, 0.5, 0, 0]);
  });

  it('会补齐防具固定结构字段', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 9,
        name: '测试甲',
        etypeId: 8,
        qualityLock: true,
      },
      {
        isArmor: true,
        systemData: {
          elements: ['', '通常', '火炎'],
        },
      },
    );

    expect(normalized).toMatchObject({
      id: 9,
      name: '测试甲',
      etypeId: 8,
      hiddenAttackSkillId: 0,
      qualityLock: true,
      floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRates: [0, 0, 0],
      elementRateFloats: [0, 0, 0],
      extraParams: {
        interceptRate: { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      },
      vehicleParams: {
        actionRepeat: { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      },
      upgradeParams: {
        times: { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      },
    });
  });

  it('非底盘与C装置防具不会补 hiddenAttackSkillId', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 10,
        name: '普通头盔',
        etypeId: 2,
      },
      {
        isArmor: true,
        systemData: {
          elements: ['', '通常', '火炎'],
        },
      },
    );

    expect(normalized).not.toHaveProperty('hiddenAttackSkillId');
  });
});
