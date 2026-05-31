import { describe, expect, it } from 'vitest';
import {
  buildEnemySaveData,
  hasEnemyEditorChanges,
  normalizeEnemyDataEntry,
  normalizeEnemyEditorValues,
} from './EnemyPropertyService';

describe('EnemyPropertyService', () => {
  it('只读取敌人顶层扩展字段', () => {
    const values = normalizeEnemyEditorValues({
      classId: 9,
      level: 12,
      levelScope: 8,
      isBoss: true,
      enableSv: true,
      allowBreak: true,
      canReaction: true,
      bounty: 3000,
      attackAnimationId: 5,
      reactionSkillId: 16,
    });

    expect(values).toMatchObject({
      classId: 9,
      level: 12,
      levelScope: 8,
      isBoss: true,
      enableSv: true,
      allowBreak: true,
      canReaction: true,
      bounty: 3000,
      attackAnimationId: 5,
      reactionSkillId: 16,
    });
  });

  it('保存时只写回当前顶层字段，并保留其他顶层扩展字段', () => {
    const saved = buildEnemySaveData(
      {
        id: 106,
        name: '水怪',
        reactionSkillId: 16,
        note: '',
        meta: {},
      },
      {
        classId: 27,
        level: 21,
        levelScope: 4,
        isBoss: true,
        enableSv: true,
        allowBreak: true,
        canReaction: true,
        bounty: 5000,
        attackAnimationId: 8,
        reactionSkillId: 24,
      },
    );

    expect(saved).toMatchObject({
      classId: 27,
      level: 21,
      levelScope: 4,
      isBoss: true,
      enableSv: true,
      allowBreak: true,
      canReaction: true,
      bounty: 5000,
      attackAnimationId: 8,
      reactionSkillId: 24,
      meta: {},
    });
  });

  it('仅在敌人顶层字段变化时才视为需要保存', () => {
    expect(hasEnemyEditorChanges(
      {
        id: 1,
        name: '巨蚁',
        classId: 25,
        level: 4,
        levelScope: 3,
        isBoss: false,
        enableSv: false,
        allowBreak: false,
        canReaction: true,
        bounty: 0,
        attackAnimationId: 1,
        reactionSkillId: 7,
      },
      {
        classId: 25,
        level: 4,
        levelScope: 3,
        isBoss: false,
        enableSv: false,
        allowBreak: false,
        canReaction: true,
        bounty: 0,
        attackAnimationId: 1,
        reactionSkillId: 7,
      },
    )).toBe(false);
  });

  it('缺少 enableSv 时会根据旧 meta.Sv 推导默认值', () => {
    expect(normalizeEnemyEditorValues({
      id: 2,
      name: '动态敌人',
      meta: {
        Sv: 'MonsterSv',
      },
    }).enableSv).toBe(true);
    expect(normalizeEnemyEditorValues({
      id: 3,
      name: '静态敌人',
      enableSv: false,
      meta: {
        Sv: 'MonsterSv',
      },
    }).enableSv).toBe(false);
  });

  it('缺少 canReaction 时会根据 reactionSkillId 推导默认值', () => {
    const normalized = normalizeEnemyDataEntry({
      id: 3,
      name: '炮台',
      reactionSkillId: 9,
      meta: {
        keep: true,
      },
      actions: [
        { skillId: 5, rating: 4, conditionType: 0, conditionParam1: 0, conditionParam2: 0 },
      ],
    }, [
      null,
      null,
      null,
      null,
      null,
      {
        id: 5,
        name: '炮击',
        targetCamp: 1,
        targetLifeState: 1,
        selectMode: 1,
        areaMode: 2,
        shapeType: 1,
        areaTargetCount: 3,
        repeatTime: 2,
        repeatTimeFloat: 0,
      },
    ]);

    expect(normalized).toMatchObject({
      id: 3,
      name: '炮台',
      classId: 1,
      level: 1,
      canReaction: true,
      reactionSkillId: 9,
      meta: {
        keep: true,
      },
      actionOverrides: {
        5: {
          targetCamp: 1,
          targetLifeState: 1,
          selectMode: 1,
          areaMode: 2,
          shapeType: 1,
          areaTargetCount: 3,
          repeatTime: 2,
          repeatTimeFloat: 0,
          actionRepeat: 1,
          allowSkillBreak: true,
        },
      },
    });
  });

  it('会按 actions 中的 skillId 生成共享的默认 actionOverrides', () => {
    const saved = buildEnemySaveData(
      {
        id: 8,
        name: '火炮犬',
        actions: [
          { skillId: 2, rating: 5, conditionType: 0, conditionParam1: 0, conditionParam2: 0 },
          { skillId: 2, rating: 3, conditionType: 1, conditionParam1: 0, conditionParam2: 50 },
        ],
      },
      {
        classId: 1,
        level: 1,
        levelScope: 0,
        isBoss: false,
        allowBreak: false,
        enableSv: false,
        canReaction: false,
        bounty: 0,
        attackAnimationId: 0,
        reactionSkillId: 0,
        actionOverrides: {
          2: {
            targetCamp: 2,
            areaMode: 2,
            areaTargetCount: 4,
            repeatTime: 3,
            actionRepeat: 2,
            allowSkillBreak: false,
          },
        },
      },
      [
        null,
        null,
        {
          id: 2,
          name: '基础炮击',
          targetCamp: 1,
          targetLifeState: 1,
          selectMode: 1,
          areaMode: 1,
          shapeType: 0,
          areaTargetCount: 0,
          repeatTime: 1,
          repeatTimeFloat: 0,
        },
      ],
    );

    expect(saved.actionOverrides).toMatchObject({
      2: {
        targetCamp: 2,
        targetLifeState: 1,
        selectMode: 1,
        areaMode: 2,
        shapeType: 1,
        areaTargetCount: 4,
        repeatTime: 3,
        repeatTimeFloat: 0,
        actionRepeat: 2,
        allowSkillBreak: false,
      },
    });
    expect(Object.keys(saved.actionOverrides ?? {})).toEqual(['2']);
  });
});
