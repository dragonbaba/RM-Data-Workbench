import { describe, expect, it } from 'vitest';
import {
  applyClassGrowthCurve,
  buildClassLevelPreview,
  calculateClassExpFromParams,
  calculateClassExpForLevel,
  calculateCurveParamValue,
  CLASS_BASE_LEVEL_ANCHOR,
  CLASS_EXTENDED_MIN_LEVEL,
  createDefaultClassLevelExtensions,
  getClassBaseParamsAtLevel,
  getClassLevelExtension,
  normalizeClassExpParams,
  normalizeClassLevelExtensions,
  normalizeClassLevelParams,
  setClassLevelExtension,
} from './ClassLevelExtensionsService';

const createClassEntry = () => ({
  expParams: [30, 20, 30, 30],
  params: Array.from({ length: 8 }, (_, paramIndex) => {
    const levels = new Array(100).fill(0);
    levels[CLASS_BASE_LEVEL_ANCHOR] = (paramIndex + 1) * 10;
    return levels;
  }),
});

describe('ClassLevelExtensionsService', () => {
  it('创建一基索引的默认曲线结构', () => {
    expect(createDefaultClassLevelExtensions(3, [null, createClassEntry(), createClassEntry()])).toEqual({
      schemaVersion: 2,
      classes: [
        null,
        {
          maxLevel: 100,
          expParams: [30, 20, 30, 30],
          paramCurves: [
            { target: 10, mode: 'standard' },
            { target: 20, mode: 'standard' },
            { target: 30, mode: 'standard' },
            { target: 40, mode: 'standard' },
            { target: 50, mode: 'standard' },
            { target: 60, mode: 'standard' },
            { target: 70, mode: 'standard' },
            { target: 80, mode: 'standard' },
          ],
        },
        {
          maxLevel: 100,
          expParams: [30, 20, 30, 30],
          paramCurves: [
            { target: 10, mode: 'standard' },
            { target: 20, mode: 'standard' },
            { target: 30, mode: 'standard' },
            { target: 40, mode: 'standard' },
            { target: 50, mode: 'standard' },
            { target: 60, mode: 'standard' },
            { target: 70, mode: 'standard' },
            { target: 80, mode: 'standard' },
          ],
        },
      ],
    });
  });

  it('规范化曲线协议并补齐缺失字段', () => {
    const result = normalizeClassLevelExtensions({
      schemaVersion: 99,
      classes: [
        null,
        {
          maxLevel: 99,
          expParams: [40.9, -1, 'x', 0],
          paramCurves: [
            { target: 100.9, mode: 'early' },
            { target: -1, mode: 'invalid' },
          ],
        },
      ],
    }, 3, [null, createClassEntry(), createClassEntry()]);

    expect(result.data.classes[1]).toEqual({
      maxLevel: 100,
      expParams: [40, 0, 0, 0],
      paramCurves: [
        { target: 100, mode: 'early' },
        { target: 0, mode: 'standard' },
        { target: 30, mode: 'standard' },
        { target: 40, mode: 'standard' },
        { target: 50, mode: 'standard' },
        { target: 60, mode: 'standard' },
        { target: 70, mode: 'standard' },
        { target: 80, mode: 'standard' },
      ],
    });
    expect(result.data.classes[2]).toEqual({
      maxLevel: 100,
      expParams: [30, 20, 30, 30],
      paramCurves: [
        { target: 10, mode: 'standard' },
        { target: 20, mode: 'standard' },
        { target: 30, mode: 'standard' },
        { target: 40, mode: 'standard' },
        { target: 50, mode: 'standard' },
        { target: 60, mode: 'standard' },
        { target: 70, mode: 'standard' },
        { target: 80, mode: 'standard' },
      ],
    });
    expect(result.changed).toBe(true);
  });

  it('将旧 levels 协议迁移为最高等级目标曲线', () => {
    const result = normalizeClassLevelExtensions({
      schemaVersion: 1,
      classes: [
        null,
        {
          levels: [
            { level: 99, exp: 10, params: [1, 2, 3] },
            { level: 102, exp: 300, params: [1, 'x', 3, 4, 5, 6, 7, 8, 9] },
            { level: 101.9, exp: 200.8, params: [-1, 2.7] },
            { level: 102, exp: 350, params: [9, 8] },
          ],
        },
      ],
    }, 2, [null, createClassEntry()]);

    expect(result.data).toEqual({
      schemaVersion: 2,
      classes: [
        null,
        {
          maxLevel: 102,
          expParams: [30, 20, 30, 30],
          paramCurves: [
            { target: 9, mode: 'standard' },
            { target: 8, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
          ],
        },
      ],
    });
    expect(result.changed).toBe(true);
  });

  it('固定 params 和经验参数为非负整数', () => {
    expect(normalizeClassLevelParams([1.9, -1, 'x', 4, 5, 6, 7, 8, 9])).toEqual([1, 0, 0, 4, 5, 6, 7, 8]);
    expect(normalizeClassExpParams([1.9, -1, 'x'], [30, 20, 30, 30])).toEqual([1, 0, 0, 30]);
  });

  it('读取和写入指定职业拓展曲线时保持协议结构', () => {
    const base = createDefaultClassLevelExtensions(2, [null, createClassEntry()]);
    const next = setClassLevelExtension(base, 2, {
      maxLevel: 150,
      expParams: [50, 40, 60, 70],
      paramCurves: [
        { target: 100, mode: 'early' },
        { target: 200, mode: 'late' },
      ],
    }, createClassEntry());

    expect(getClassLevelExtension(next, 2, createClassEntry())).toEqual({
      maxLevel: 150,
      expParams: [50, 40, 60, 70],
      paramCurves: [
        { target: 100, mode: 'early' },
        { target: 200, mode: 'late' },
        { target: 30, mode: 'standard' },
        { target: 40, mode: 'standard' },
        { target: 50, mode: 'standard' },
        { target: 60, mode: 'standard' },
        { target: 70, mode: 'standard' },
        { target: 80, mode: 'standard' },
      ],
    });
    expect(next.schemaVersion).toBe(2);
    expect(next.classes).toHaveLength(3);
  });

  it('从职业矩阵读取 99 级属性基准', () => {
    expect(getClassBaseParamsAtLevel(createClassEntry(), CLASS_BASE_LEVEL_ANCHOR)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
  });

  it('使用经验四参数计算等级经验', () => {
    expect(calculateClassExpFromParams([30, 20, 30, 30], 100)).toBeGreaterThan(calculateClassExpForLevel(createClassEntry(), 99));
  });

  it('根据成长模式计算属性曲线', () => {
    expect(applyClassGrowthCurve(0.5, 'linear')).toBe(0.5);
    expect(applyClassGrowthCurve(0.5, 'early')).toBeGreaterThan(0.5);
    expect(applyClassGrowthCurve(0.5, 'late')).toBeLessThan(0.5);
    expect(calculateCurveParamValue(100, 200, 1, 'late')).toBe(200);
  });

  it('按 99 级基准和最大等级目标生成预览', () => {
    const preview = buildClassLevelPreview(createClassEntry(), {
      maxLevel: 101,
      expParams: [30, 20, 30, 30],
      paramCurves: [
        { target: 110, mode: 'linear' },
        { target: 120, mode: 'early' },
        { target: 130, mode: 'late' },
        { target: 140, mode: 'standard' },
        { target: 150, mode: 'standard' },
        { target: 160, mode: 'standard' },
        { target: 170, mode: 'standard' },
        { target: 180, mode: 'standard' },
      ],
    });

    expect(preview).toHaveLength(2);
    expect(preview[0].level).toBe(CLASS_EXTENDED_MIN_LEVEL);
    expect(preview[0].params[0]).toBe(60);
    expect(preview[1].params).toEqual([110, 120, 130, 140, 150, 160, 170, 180]);
  });
});
