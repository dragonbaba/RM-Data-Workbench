import { describe, expect, it } from 'vitest';
import { arePlainDataEqual } from './PlainDataCompare';

describe('PlainDataCompare', () => {
  it('支持比较基本类型与数组', () => {
    expect(arePlainDataEqual([1, 2, { a: 3 }], [1, 2, { a: 3 }])).toBe(true);
    expect(arePlainDataEqual([1, 2], [1, 3])).toBe(false);
  });

  it('支持比较普通对象', () => {
    expect(arePlainDataEqual(
      { a: 1, b: { c: [2, 3] } },
      { a: 1, b: { c: [2, 3] } },
    )).toBe(true);
    expect(arePlainDataEqual(
      { a: 1, b: { c: [2, 3] } },
      { a: 1, b: { c: [2, 4] } },
    )).toBe(false);
  });

  it('会区分对象键集合差异', () => {
    expect(arePlainDataEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
