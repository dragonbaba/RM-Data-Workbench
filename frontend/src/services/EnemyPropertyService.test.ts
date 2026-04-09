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
        allowBreak: false,
        canReaction: true,
        bounty: 0,
        attackAnimationId: 1,
        reactionSkillId: 7,
      },
    )).toBe(false);
  });

  it('缺少 canReaction 时会根据 reactionSkillId 推导默认值', () => {
    const normalized = normalizeEnemyDataEntry({
      id: 3,
      name: '炮台',
      reactionSkillId: 9,
      meta: {
        keep: true,
      },
    });

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
    });
  });
});
