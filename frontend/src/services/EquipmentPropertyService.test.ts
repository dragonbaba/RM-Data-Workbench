import { describe, expect, it } from 'vitest';
import {
  buildEquipUpgradeCostsForLimit,
  createEquipUpgradeCostTemplateEntry,
  getExpectedArmorEquipTypeId,
  getExpectedWeaponEquipTypeId,
  normalizeArmorElementRateFloats,
  normalizeArmorElementRates,
  normalizeEquipUpgradeCosts,
  normalizeEquipmentDataEntry,
  resolveEquipUpgradeCostTargetCount,
} from './EquipmentPropertyService';

const createEquipmentUpgradeParam = (value: number) => ({
  value,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

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
      interceptableMode: -1,
      weaponImageId: 1,
      areaOverride: 0,
      areaMode: 1,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
      repeatTimeFloat: 0,
      qualityLock: false,
      qualityLevel: 0,
      revertTimes: 0,
      upgradeCosts: [],
      vehicleParams: [
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 2, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      ],
    });
  });

  it('会规范武器可被迎击覆盖模式', () => {
    expect(normalizeEquipmentDataEntry({ id: 9, name: '禁迎击炮', interceptableMode: 0 }, { isWeapon: true }))
      .toMatchObject({ interceptableMode: 0 });
    expect(normalizeEquipmentDataEntry({ id: 10, name: '强制迎击炮', interceptableMode: 1 }, { isWeapon: true }))
      .toMatchObject({ interceptableMode: 1 });
    expect(normalizeEquipmentDataEntry({ id: 11, name: '旧值炮', interceptableMode: 7 }, { isWeapon: true }))
      .toMatchObject({ interceptableMode: -1 });
  });

  it('会把缺失弹舱字段的副炮修复为无限弹药', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 281,
        name: '生锈机枪',
        wtypeId: 2,
        vehicleParams: {
          repeat: { value: 1 },
        },
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized?.vehicleParams?.[4]).toEqual({
      value: -1,
      floatValue: 0,
      upgradeValue: 0,
      upgradeFloatValue: 0,
    });
  });

  it('会保留显式配置的弹舱值', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 72,
        name: '7mm机枪',
        wtypeId: 2,
        vehicleParams: {
          ammoCapacity: { value: -1 },
        },
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized?.vehicleParams?.[4]?.value).toBe(-1);
  });
  it('会按 wtypeId 推导并同步武器装备类型', () => {
    expect(getExpectedWeaponEquipTypeId({ wtypeId: 1 })).toBe(10);
    expect(getExpectedWeaponEquipTypeId({ wtypeId: 2 })).toBe(11);
    expect(getExpectedWeaponEquipTypeId({ wtypeId: 3 })).toBe(12);
    expect(getExpectedWeaponEquipTypeId({ wtypeId: 4 })).toBe(1);

    const normalized = normalizeEquipmentDataEntry(
      {
        id: 66,
        name: '巡航战车炮',
        wtypeId: 1,
        etypeId: 1,
      },
      {
        isWeapon: true,
        syncWeaponEquipTypeId: true,
      },
    );

    expect(normalized).toMatchObject({ etypeId: 10 });
  });

  it('会按标题修正战车防具分组占位条目的装备类型', () => {
    expect(getExpectedArmorEquipTypeId({ name: '--发动机', atypeId: 0 })).toBe(7);
    expect(getExpectedArmorEquipTypeId({ name: '--C装置', atypeId: 0 })).toBe(8);
    expect(getExpectedArmorEquipTypeId({ name: '--底盘', atypeId: 0 })).toBe(9);

    const normalized = normalizeEquipmentDataEntry(
      {
        id: 120,
        name: '--底盘',
        atypeId: 0,
        etypeId: 10,
      },
      {
        isArmor: true,
        syncArmorHeadingEquipTypeId: true,
        systemData: {
          elements: ['', '通常'],
        },
      },
    );

    expect(normalized).toMatchObject({ etypeId: 9 });
  });

  it('会规范装备锁定品质等级到 0-6', () => {
    expect(normalizeEquipmentDataEntry(
      { id: 13, name: '负品质炮', qualityLock: true, qualityLevel: -3 },
      { isWeapon: true },
    )).toMatchObject({
      qualityLock: true,
      qualityLevel: 0,
    });

    expect(normalizeEquipmentDataEntry(
      { id: 14, name: '高品质炮', qualityLevel: 99 },
      { isWeapon: true },
    )).toMatchObject({
      qualityLock: false,
      qualityLevel: 6,
    });

    expect(normalizeEquipmentDataEntry(
      { id: 15, name: '字符串品质甲', qualityLevel: '4.8' },
      { isArmor: true, systemData: { elements: ['', '通常'] } },
    )).toMatchObject({
      qualityLevel: 4,
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
      qualityLevel: 0,
      revertTimes: 0,
      floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRates: [0, 0, 0],
      elementRateFloats: [0, 0, 0],
    });
    expect(normalized?.extraParams).toHaveLength(6);
    expect(normalized?.vehicleParams).toHaveLength(8);
    expect(normalized?.upgradeParams).toHaveLength(3);
    expect(normalized?.upgradeCosts).toEqual([]);
    expect(normalized?.extraParams?.[0]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
    expect(normalized?.vehicleParams?.[7]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
    expect(normalized?.upgradeParams?.[0]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
  });

  it('会按强化上限补齐并保留装备还原次数', () => {
    expect(normalizeEquipmentDataEntry(
      {
        id: 16,
        name: '高阶炮',
        upgradeParams: [
          createEquipmentUpgradeParam(40),
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
        ],
      },
      { isWeapon: true },
    )).toMatchObject({
      revertTimes: 3,
    });

    expect(normalizeEquipmentDataEntry(
      {
        id: 20,
        name: '入门炮',
        upgradeParams: [
          createEquipmentUpgradeParam(1),
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
        ],
      },
      { isWeapon: true },
    )).toMatchObject({
      revertTimes: 1,
    });

    expect(normalizeEquipmentDataEntry(
      {
        id: 17,
        name: '中阶甲',
        revertTimes: -1,
        upgradeParams: [
          createEquipmentUpgradeParam(35),
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
        ],
      },
      {
        isArmor: true,
        systemData: { elements: ['', '通常'] },
      },
    )).toMatchObject({
      revertTimes: 2,
    });

    expect(normalizeEquipmentDataEntry(
      {
        id: 18,
        name: '保留炮',
        revertTimes: 6,
        upgradeParams: [
          createEquipmentUpgradeParam(40),
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
        ],
      },
      { isWeapon: true },
    )).toMatchObject({
      revertTimes: 6,
    });

    expect(normalizeEquipmentDataEntry(
      {
        id: 19,
        name: '零阶甲',
        revertTimes: 0,
        upgradeParams: [
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
          createEquipmentUpgradeParam(0),
        ],
      },
      {
        isArmor: true,
        systemData: { elements: ['', '通常'] },
      },
    )).toMatchObject({
      revertTimes: 0,
    });
  });

  it('会在装备修复中保留武器受控线形范围', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 12,
        name: '远程T型炮',
        areaOverride: 1,
        areaMode: 2,
        shapeType: 3,
        areaTargetCount: 3,
        shapeParams: {
          1: { radius: 360 },
          2: { radius: 520, angleDeg: 42 },
          3: { length: 820, width: 104 },
        },
        repeatTime: 1,
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized).toMatchObject({
      areaOverride: 1,
      areaMode: 2,
      shapeType: 3,
      areaTargetCount: 3,
      shapeParams: {
        3: { length: 820, width: 104 },
      },
    });
  });

  it('会标准化逐级强化耗材配置', () => {
    expect(normalizeEquipUpgradeCosts([
      {
        successRate: 120,
        goldCost: -50,
        requiredItemId: 3,
        requiredItemAmount: 0,
        protectItemId: 0,
        protectItemAmount: 9,
      },
      {
        goldCost: '120',
        successRate: '37.5',
        requiredItemId: 0,
        requiredItemAmount: 5,
        protectItemId: 4,
        protectItemAmount: -2,
      },
      null,
    ])).toEqual([
      {
        successRate: 100,
        goldCost: 0,
        requiredItemId: 3,
        requiredItemAmount: 1,
        protectItemId: 0,
        protectItemAmount: 0,
      },
      {
        successRate: 37.5,
        goldCost: 120,
        requiredItemId: 0,
        requiredItemAmount: 0,
        protectItemId: 4,
        protectItemAmount: 1,
      },
      {
        successRate: 100 / 3,
        goldCost: 0,
        requiredItemId: 0,
        requiredItemAmount: 0,
        protectItemId: 0,
        protectItemAmount: 0,
      },
    ]);
  });

  it('会按强化次数与浮动次数计算应生成的耗材等级数', () => {
    expect(resolveEquipUpgradeCostTargetCount([{ value: 30, floatValue: 5 }])).toBe(35);
    expect(resolveEquipUpgradeCostTargetCount({ times: { value: 40, floatValue: 0 } })).toBe(40);
  });

  it('会用模板补齐到目标强化等级并保留已有手填行', () => {
    const template = Array.from({ length: 40 }, (_, index) => ({
      successRate: index === 39 ? 1 : 90,
      goldCost: (index + 1) * 1000,
      requiredItemId: 183,
      requiredItemAmount: index + 1,
      protectItemId: index >= 31 ? 167 : 166,
      protectItemAmount: index + 2,
    }));

    const costs = buildEquipUpgradeCostsForLimit([
      {
        successRate: 88,
        goldCost: 123,
        requiredItemId: 90,
        requiredItemAmount: 5,
        protectItemId: 162,
        protectItemAmount: 1,
      },
    ], 40, template);

    expect(costs).toHaveLength(40);
    expect(costs[0]).toEqual({
      successRate: 88,
      goldCost: 123,
      requiredItemId: 90,
      requiredItemAmount: 5,
      protectItemId: 162,
      protectItemAmount: 1,
    });
    expect(costs[39]).toEqual({
      successRate: 1,
      goldCost: 40000,
      requiredItemId: 183,
      requiredItemAmount: 40,
      protectItemId: 167,
      protectItemAmount: 41,
    });
  });

  it('没有来源模板时会使用暴君 40 级预填口径兜底', () => {
    expect(createEquipUpgradeCostTemplateEntry(39)).toEqual({
      successRate: 1,
      goldCost: 223000,
      requiredItemId: 183,
      requiredItemAmount: 40,
      protectItemId: 167,
      protectItemAmount: 30,
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
