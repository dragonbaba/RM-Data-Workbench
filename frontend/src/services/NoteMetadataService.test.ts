import { describe, expect, it } from 'vitest';
import { ensureItemMeta, extractMetadataFromNote, isMetadataEqual } from './NoteMetadataService';

describe('NoteMetadataService', () => {
  it('按旧规则提取标签并转换类型', () => {
    const note = '<weaponImageId:19>\n<equipSlots:[1,"2",3]>\n<isBoss>\n<options:{"crit":"25","enabled":"true"}>';
    const meta = extractMetadataFromNote(note);

    expect(meta).toEqual({
      weaponImageId: 19,
      equipSlots: [1, 2, 3],
      isBoss: true,
      options: {
        crit: 25,
        enabled: true,
      },
    });
  });

  it('无法解析为 JSON 时保留字符串', () => {
    const meta = extractMetadataFromNote('<menuPicture:p1>');
    expect(meta).toEqual({
      menuPicture: 'p1',
    });
  });

  it('元数据深比较支持对象与数组', () => {
    const left = {
      weaponImageId: 19,
      equipSlots: [1, 2, 3],
      options: {
        enabled: true,
      },
    };
    const right = {
      options: {
        enabled: true,
      },
      equipSlots: [1, 2, 3],
      weaponImageId: 19,
    };

    expect(isMetadataEqual(left, right)).toBe(true);
  });

  it('undefined 与空对象视为相等', () => {
    expect(isMetadataEqual(undefined, {})).toBe(true);
  });

  it('内容变化时比较结果为不相等', () => {
    expect(isMetadataEqual({ weaponImageId: 19 }, { weaponImageId: 20 })).toBe(false);
  });

  it('条目缺少 meta 属性时会按 note 自动补齐', () => {
    const result = ensureItemMeta({
      id: 1,
      note: '<weaponImageId:19>\n<boss>',
    });

    expect(result.changed).toBe(true);
    expect(result.item).toEqual({
      id: 1,
      note: '<weaponImageId:19>\n<boss>',
      meta: {
        weaponImageId: 19,
        boss: true,
      },
    });
  });

  it('条目缺少 meta 但 note 没有标签时保持原样', () => {
    const source = {
      id: 1,
      note: '',
    };
    const result = ensureItemMeta(source);

    expect(result.changed).toBe(false);
    expect(result.item).toBe(source);
  });

  it('条目已有 meta 属性时保持原样', () => {
    const source = {
      id: 1,
      note: '',
      meta: {},
    };
    const result = ensureItemMeta(source);

    expect(result.changed).toBe(false);
    expect(result.item).toBe(source);
  });
});
