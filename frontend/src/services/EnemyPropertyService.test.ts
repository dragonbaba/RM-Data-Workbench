import { describe, expect, it } from 'vitest';
import {
  buildEnemySaveData,
  hasEnemyEditorChanges,
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
      bounty: 5000,
      attackAnimationId: 8,
      reactionSkillId: 24,
      note: '',
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
        bounty: 0,
        attackAnimationId: 1,
        reactionSkillId: 7,
      },
    )).toBe(false);
  });
});
