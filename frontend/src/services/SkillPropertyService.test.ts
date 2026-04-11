import { describe, expect, it } from 'vitest';
import {
  ACTION_SEQUENCE_TYPE_ITEM,
  ACTION_SEQUENCE_TYPE_NORMAL,
  ACTION_SEQUENCE_TYPE_PROJECTILE,
  ACTION_SEQUENCE_TYPE_SELF,
  ACTION_SEQUENCE_TYPE_THROW_PROJECTILE,
  buildSkillSaveData,
  hasDamageFormulaExport,
  hasSkillEditorChanges,
  normalizeSkillDataEntry,
  normalizeSkillEditorValues,
  SKILL_PROJECTILE_TAG_INTERCEPTABLE,
  SKILL_PROJECTILE_TAG_INTERCEPTOR,
  SKILL_PROJECTILE_TAG_NONE,
  type SkillEffectSpec,
} from './SkillPropertyService';

const defaultSkillEffectSpec: SkillEffectSpec = {
  damage: {
    damageType: 'none',
    damageElementId: 0,
    allowCritical: false,
    damageScatter: 0,
    formula: {
      mode: 'basic',
      scriptKey: '',
    },
  },
  durabilityChange: {
    mode: 'none',
    value: 0,
  },
  skillDurability: {
    baseLoss: 1,
    halfBrokenRate: 50,
  },
};

describe('SkillPropertyService', () => {
  it('会优先读取结构化技能字段并补齐 skillEffectSpec 默认值', () => {
    const values = normalizeSkillEditorValues({
      projectileId: 12,
      skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
      reactionSuccessRate: 45,
      reactionPriority: 30,
      skillEffectSpec: {
        damage: {
          damageType: 'hp',
          damageElementId: 7,
          allowCritical: true,
          damageScatter: 18,
          formula: {
            mode: 'script',
            scriptKey: 'onDamage',
          },
        },
        durabilityChange: {
          mode: 'reduce',
          value: 9,
        },
        skillDurability: {
          baseLoss: 4,
          halfBrokenRate: 25,
        },
      },
      meta: {
        projectileId: 99,
      },
    });

    expect(values).toMatchObject({
      projectileId: 12,
      skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
      reactionSuccessRate: 45,
      reactionPriority: 30,
      actionSequenceType: ACTION_SEQUENCE_TYPE_PROJECTILE,
      actionSequenceScriptKey: '',
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      skillCosts: [],
      skillEffectSpec: {
        damage: {
          damageType: 'hp',
          damageElementId: 7,
          allowCritical: true,
          damageScatter: 18,
          formula: {
            mode: 'script',
            scriptKey: 'onDamage',
          },
        },
        durabilityChange: {
          mode: 'reduce',
          value: 9,
        },
        skillDurability: {
          baseLoss: 4,
          halfBrokenRate: 25,
        },
      },
    });
  });

  it('缺少结构化字段时不会再从旧 damage 字段回填普通编辑值', () => {
    const values = normalizeSkillEditorValues({
      damage: {
        type: 2,
        elementId: 8,
        critical: true,
        variance: 21,
      },
      meta: {
        projectileId: 8,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 120,
        reactionPriority: 17,
      },
    });

    expect(values).toMatchObject({
      projectileId: 0,
      skillProjectileTag: SKILL_PROJECTILE_TAG_NONE,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      actionSequenceType: ACTION_SEQUENCE_TYPE_NORMAL,
      actionSequenceScriptKey: '',
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      skillCosts: [],
      skillEffectSpec: defaultSkillEffectSpec,
    });
  });

  it('会把 heal 作为合法伤害类型保留', () => {
    const values = normalizeSkillEditorValues({
      skillEffectSpec: {
        damage: {
          damageType: 'heal',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 12,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
      },
    });

    expect(values.skillEffectSpec.damage).toMatchObject({
      damageType: 'heal',
      damageScatter: 12,
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

  it('普通规范化条目时只保留结构字段默认值并删除旧 damage', () => {
    const normalized = normalizeSkillDataEntry({
      id: 9,
      name: '迎击炮',
      projectileId: 15,
      reactionPriority: 21,
      damage: {
        type: 1,
        elementId: 5,
        critical: false,
        variance: 12,
      },
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
      actionSequenceType: ACTION_SEQUENCE_TYPE_PROJECTILE,
      actionSequenceScriptKey: '',
      skillCosts: [],
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: defaultSkillEffectSpec.durabilityChange,
        skillDurability: defaultSkillEffectSpec.skillDurability,
      },
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
    });
    expect(normalized).not.toHaveProperty('isUsedForProjectile');
    expect(normalized).not.toHaveProperty('damage');
  });

  it('物品规范化会按弹道状态分配动作序列默认值', () => {
    const projectileItem = normalizeSkillDataEntry({
      id: 1,
      name: '手雷',
      projectileId: 5,
    }, { isItem: true });
    const normalItem = normalizeSkillDataEntry({
      id: 2,
      name: '药水',
      projectileId: 0,
    }, { isItem: true });

    expect(projectileItem).toMatchObject({
      actionSequenceType: ACTION_SEQUENCE_TYPE_THROW_PROJECTILE,
      actionSequenceScriptKey: '',
    });
    expect(normalItem).toMatchObject({
      actionSequenceType: ACTION_SEQUENCE_TYPE_ITEM,
      actionSequenceScriptKey: '',
    });
  });

  it('物品规范化不会从原生 damage 回填 skillEffectSpec', () => {
    const normalized = normalizeSkillDataEntry({
      id: 3,
      name: '投掷炸弹',
      projectileId: 9,
      damage: {
        type: 1,
        elementId: 4,
        critical: true,
        variance: 16,
      },
    }, { isItem: true });

    expect(normalized).toMatchObject({
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: defaultSkillEffectSpec.durabilityChange,
        skillDurability: defaultSkillEffectSpec.skillDurability,
      },
    });
    expect(normalized).not.toHaveProperty('damage');
  });

  it('规范化不会从旧 damage 迁移到 skillEffectSpec', () => {
    const normalized = normalizeSkillDataEntry({
      id: 10,
      name: '修复用主炮',
      damage: {
        type: 1,
        elementId: 5,
        critical: true,
        variance: 12,
      },
    });

    expect(normalized).toMatchObject({
      id: 10,
      name: '修复用主炮',
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: defaultSkillEffectSpec.durabilityChange,
        skillDurability: defaultSkillEffectSpec.skillDurability,
      },
    });
    expect(normalized).not.toHaveProperty('damage');
  });

  it('旧 HP Recover 类型不会被兼容迁移为 heal', () => {
    const normalized = normalizeSkillDataEntry({
      id: 11,
      name: '修复用回复',
      damage: {
        type: 3,
        elementId: 0,
        critical: false,
        variance: 10,
      },
    });

    expect(normalized).toMatchObject({
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
        },
      },
    });
    expect(normalized).not.toHaveProperty('damage');
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
        skillEffectSpec: defaultSkillEffectSpec,
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [{ type: 'gold', value: 10, variableId: 0, itemId: 0, weaponId: 0, armorId: 0, amount: 1 }],
        skillEffectSpec: defaultSkillEffectSpec,
      },
    )).toBe(false);
  });

  it('技能效果协议变化时会触发保存', () => {
    expect(hasSkillEditorChanges(
      {
        id: 1,
        name: '火球',
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [],
        skillEffectSpec: defaultSkillEffectSpec,
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
        skillCosts: [],
        skillEffectSpec: {
          ...defaultSkillEffectSpec,
          damage: {
            ...defaultSkillEffectSpec.damage,
            damageElementId: 3,
          },
        },
      },
    )).toBe(true);
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
      scripts: {
        actionSequence: '/scripts/4_actionSequence.js',
      },
    } as unknown as Parameters<typeof buildSkillSaveData>[0];

    const saved = buildSkillSaveData(
      legacySkillSource,
      {
        projectileId: 11,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTOR,
        reactionSuccessRate: 55,
        reactionPriority: 18,
        actionSequenceType: ACTION_SEQUENCE_TYPE_SELF,
        actionSequenceScriptKey: 'actionSequence',
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
        skillEffectSpec: {
          damage: {
            damageType: 'hp',
            damageElementId: 11,
            allowCritical: true,
            damageScatter: 20,
            formula: {
              mode: 'script',
              scriptKey: 'damageByScript',
            },
          },
          durabilityChange: {
            mode: 'recover',
            value: 6,
          },
          skillDurability: {
            baseLoss: 3,
            halfBrokenRate: 40,
          },
        },
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
      actionSequenceType: ACTION_SEQUENCE_TYPE_SELF,
      actionSequenceScriptKey: 'actionSequence',
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
      skillEffectSpec: {
        damage: {
          damageType: 'hp',
          damageElementId: 11,
          allowCritical: true,
          damageScatter: 20,
          formula: {
            mode: 'script',
            scriptKey: 'damageByScript',
          },
        },
        durabilityChange: {
          mode: 'recover',
          value: 6,
        },
        skillDurability: {
          baseLoss: 3,
          halfBrokenRate: 40,
        },
      },
    });
    expect(saved).not.toHaveProperty('isUsedForProjectile');
    expect(saved).not.toHaveProperty('damage');
  });

  it('会识别 damageFormula 导出脚本', () => {
    expect(hasDamageFormulaExport('export function damageFormula() { return 1; }')).toBe(true);
    expect(hasDamageFormulaExport('export const damageFormula = () => 1;')).toBe(true);
    expect(hasDamageFormulaExport('export { damageFormula }')).toBe(true);
    expect(hasDamageFormulaExport('export function otherFormula() { return 1; }')).toBe(false);
  });
});
