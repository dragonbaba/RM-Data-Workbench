import { describe, expect, it } from 'vitest';
import {
  buildActorSaveData,
  hasActorEditorChanges,
  normalizeActorDataEntry,
  normalizeActorEditorValues,
} from './ActorPropertyService';

describe('ActorPropertyService', () => {
  it('迁移旧 meta 标记到角色顶层字段并清理标记', () => {
    const normalized = normalizeActorDataEntry({
      id: 2,
      name: '坦克',
      meta: {
        isStaticImage: true,
        isTank: true,
        menuSpine: 'tank_menu',
      },
    });

    expect(normalized).toMatchObject({
      id: 2,
      isStaticImage: true,
      isTank: true,
      meta: {
        menuSpine: 'tank_menu',
      },
    });
    expect(normalized?.meta).not.toHaveProperty('isStaticImage');
    expect(normalized?.meta).not.toHaveProperty('isTank');
  });

  it('迁移旧 note 标记到顶层字段并清理标记行', () => {
    const normalized = normalizeActorDataEntry({
      id: 4,
      name: '旧坦克',
      note: '<isTank:true>\n<isStaticImage:true>\n保留说明',
    });

    expect(normalized).toMatchObject({
      isStaticImage: true,
      isTank: true,
      note: '保留说明',
    });
  });

  it('顶层字段优先于旧 meta 标记', () => {
    expect(normalizeActorEditorValues({
      id: 1,
      isStaticImage: false,
      isTank: false,
      meta: {
        isStaticImage: true,
        isTank: true,
      },
    })).toEqual({
      isStaticImage: false,
      isTank: false,
    });
  });

  it('保存角色扩展字段时不保留旧 meta / note 标记', () => {
    const saved = buildActorSaveData({
      id: 3,
      name: '主角',
      meta: {
        isStaticImage: true,
        isTank: true,
        anime: 'hero',
      },
      note: '<isTank:true>\n<isStaticImage:true>\n角色说明',
    }, {
      isStaticImage: false,
      isTank: true,
    });

    expect(saved).toMatchObject({
      isStaticImage: false,
      isTank: true,
      meta: {
        anime: 'hero',
      },
      note: '角色说明',
    });
    expect(saved.meta).not.toHaveProperty('isStaticImage');
    expect(saved.meta).not.toHaveProperty('isTank');
  });

  it('能比较角色顶层扩展字段变化', () => {
    expect(hasActorEditorChanges({ id: 1, name: 'A', isTank: false, isStaticImage: false }, {
      isTank: true,
      isStaticImage: false,
    })).toBe(true);
    expect(hasActorEditorChanges({ id: 1, name: 'A', isTank: false, isStaticImage: false }, {
      isTank: false,
      isStaticImage: false,
    })).toBe(false);
  });
});
