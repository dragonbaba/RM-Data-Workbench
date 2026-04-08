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
    });
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
      },
      {
        projectileId: 3,
        skillProjectileTag: SKILL_PROJECTILE_TAG_INTERCEPTABLE,
        reactionSuccessRate: 0,
        reactionPriority: 0,
      },
    )).toBe(false);
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
    });
    expect(saved).not.toHaveProperty('isUsedForProjectile');
  });
});
