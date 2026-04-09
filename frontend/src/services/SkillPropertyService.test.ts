import { describe, expect, it } from 'vitest';
import {
  buildSkillSaveData,
  hasSkillEditorChanges,
  normalizeSkillDataEntry,
  normalizeSkillEditorValues,
  SKILL_PROJECTILE_TAG_INTERCEPTABLE,
  SKILL_PROJECTILE_TAG_INTERCEPTOR,
  SKILL_PROJECTILE_TAG_NONE,
} from './SkillPropertyService';

describe('SkillPropertyService', () => {
  it('会优先读取结构化技能字段', () => {
    const values = normalizeSkillEditorValues({
      projectileId: 12,
      skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
      reactionSuccessRate: 45,
      reactionPriority: 30,
      meta: {
        projectileId: 99,
      },
    });

    expect(values).toEqual({
      projectileId: 12,
      skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
      reactionSuccessRate: 45,
      reactionPriority: 30,
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      skillCosts: [],
    });
  });

  it('缺少结构化字段时不会再从 legacy meta 回填', () => {
    const values = normalizeSkillEditorValues({
      meta: {
        projectileId: 8,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 120,
        reactionPriority: 17,
      },
    });

    expect(values).toEqual({
      projectileId: 0,
      skillProjectileTag: SKILL_PROJECTILE_TAG_NONE,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      skillCosts: [],
    });
  });

  it('会规范化多来源技能消耗字段', () => {
    const values = normalizeSkillEditorValues({
      skillCosts: [
        { type: 'hp', value: 120 },
        { type: 'hpRate', value: 15 },
        { type: 'gold', value: 300 },
        { type: 'goldRate', value: 20 },
        { type: 'variable', variableId: 7, value: 2 },
        { type: 'variableRate', variableId: 8, value: 35 },
        { type: 'item', itemId: 3, amount: 4 },
        { type: 'weapon', weaponId: 5, amount: 1 },
        { type: 'armor', armorId: 6, amount: 2 },
      ],
    });

    expect(values.skillCosts).toEqual([
      { type: 'hp', value: 120, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'hpRate', value: 15, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'gold', value: 300, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'goldRate', value: 20, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'variable', value: 2, variableId: 7, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'variableRate', value: 35, variableId: 8, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'item', value: 0, variableId: 0, itemId: 3, weaponId: 0, armorId: 0, amount: 4 },
      { type: 'weapon', value: 0, variableId: 0, itemId: 0, weaponId: 5, armorId: 0, amount: 1 },
      { type: 'armor', value: 0, variableId: 0, itemId: 0, weaponId: 0, armorId: 6, amount: 2 },
    ]);
  });

  it('规范化条目时会保留原有 meta 并补齐结构字段', () => {
    const normalized = normalizeSkillDataEntry({
      id: 9,
      name: '迎击炮',
      projectileId: 15,
      reactionPriority: 21,
      isUsedForProjectile: true,
      meta: {
        projectileId: 15,
        reactionPriority: 21,
      },
    });

    expect(normalized).toMatchObject({
      id: 9,
      name: '迎击炮',
      meta: {
        projectileId: 15,
        reactionPriority: 21,
      },
      projectileId: 15,
      skillProjectileTag: SKILL_PROJECTILE_TAG_NONE,
      reactionSuccessRate: 0,
      reactionPriority: 21,
      skillCosts: [],
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
    });
    expect(normalized).not.toHaveProperty('isUsedForProjectile');
  });

  it('缺少 targeting 字段时会直接补齐默认值', () => {
    const singleTarget = normalizeSkillDataEntry({
      id: 15,
      name: '遗留技能',
      scope: 1,
    });
    expect(singleTarget).toMatchObject({
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
    });

    const allyAllState = normalizeSkillDataEntry({
      id: 31,
      name: '遗留群体友方技能',
      scope: 13,
    });
    expect(allyAllState).toMatchObject({
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
    });
  });

  it('仅在结构化技能字段变化时才返回需要保存', () => {
      expect(hasSkillEditorChanges(
      {
        id: 1,
        name: '火球',
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [{ type: 'gold', value: 10, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 }],
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [{ type: 'gold', value: 10, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 }],
      },
    )).toBe(false);
  });

  it('技能消耗变化时会触发保存', () => {
    expect(hasSkillEditorChanges(
      {
        id: 1,
        name: '火球',
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [{ type: 'gold', value: 10, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 }],
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [{ type: 'gold', value: 15, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 }],
      },
    )).toBe(true);
  });

  it('技能 targeting 变化时会触发保存', () => {
    expect(hasSkillEditorChanges(
      {
        id: 1,
        name: '火球',
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        targetCamp: 1,
        targetLifeState: 1,
        selectMode: 1,
        areaMode: 1,
        skillCosts: [],
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        targetCamp: 2,
        targetLifeState: 1,
        selectMode: 1,
        areaMode: 1,
        skillCosts: [],
      },
    )).toBe(true);
  });

  it('会保留范围技能的 areaMode，而不是回退成单体', () => {
    const values = normalizeSkillEditorValues({
      targetCamp: 2,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
    });

    expect(values).toMatchObject({
      targetCamp: 2,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
    });
  });

  it('百分比类型会按 0~100 收口', () => {
    const values = normalizeSkillEditorValues({
      skillCosts: [
        { type: 'goldRate', value: 140 },
        { type: 'variableRate', variableId: 3, value: -5 },
      ],
    });

    expect(values.skillCosts).toEqual([
      { type: 'goldRate', value: 100, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
      { type: 'variableRate', value: 0, variableId: 3, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
    ]);
  });

  it('会把技能消耗补齐为固定字段结构', () => {
    const values = normalizeSkillEditorValues({
      skillCosts: [
        { type: 'item', itemId: 4 },
      ],
    });

    expect(values.skillCosts[0]).toEqual({
      type: 'item',
      value: 0,
      variableId: 0,
      itemId: 4,
      weaponId: 0,
      armorId: 0,
      amount: 1,
    });
  });

  it('保存时会写回结构化技能字段并保留其他内容', () => {
    const legacySkillSource = {
      id: 4,
      name: '防空弹',
      isUsedForProjectile: true,
      description: ['test'],
      meta: {
        actionSequence: 'aa',
      },
    } as unknown as Parameters<typeof buildSkillSaveData>[0];

    const saved = buildSkillSaveData(
      legacySkillSource,
      {
        projectileId: 11,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
        reactionSuccessRate: 55,
        reactionPriority: 18,
        targetCamp: 2,
        targetLifeState: 2,
        selectMode: 1,
        areaMode: 1,
        skillCosts: [
          { type: 'hpRate', value: 15, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
          { type: 'goldRate', value: 25, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
          { type: 'variableRate', value: 30, variableId: 9, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
          { type: 'item', value: 0, variableId: 0, itemId: 2, weaponId: 0, armorId: 0, amount: 3 },
        ],
      },
    );

    expect(saved).toMatchObject({
      id: 4,
      name: '防空弹',
      description: ['test'],
      meta: {
        actionSequence: 'aa',
      },
      projectileId: 11,
      skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
      reactionSuccessRate: 55,
      reactionPriority: 18,
      targetCamp: 2,
      targetLifeState: 2,
      selectMode: 1,
      areaMode: 1,
      skillCosts: [
        { type: 'hpRate', value: 15, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
        { type: 'goldRate', value: 25, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
        { type: 'variableRate', value: 30, variableId: 9, itemId: 0, weaponId: 0, armorId: 0, amount: 1 },
        { type: 'item', value: 0, variableId: 0, itemId: 2, weaponId: 0, armorId: 0, amount: 3 },
      ],
    });
    expect(saved).not.toHaveProperty('isUsedForProjectile');
  });
});
