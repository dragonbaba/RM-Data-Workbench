import { describe, expect, it } from 'vitest';
import { buildRequiredOwnerParamsSaveData } from './OwnerParamsPropertyService';

describe('OwnerParamsPropertyService', () => {
  it('保存 ownerParams 时即使全 0 也会保留完整结构', () => {
    expect(buildRequiredOwnerParamsSaveData(
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0],
    )).toEqual({
      extraParams: [0, 0, 0, 0, 0, 0],
      specialParams: [0, 0, 0, 0, 0],
      scalar: [0],
      paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRate: [0, 0, 0],
    });
  });

  it('缺失分组会按严格结构补齐默认数组', () => {
    expect(buildRequiredOwnerParamsSaveData(null, null, null, null, null)).toEqual({
      extraParams: [0, 0, 0, 0, 0, 0],
      specialParams: [0, 0, 0, 0, 0],
      scalar: [0],
      paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRate: [],
    });
  });

  it('概率类 owner extraParams 会在保存时收紧到 0-100，并保留 0-1 兼容写法', () => {
    expect(buildRequiredOwnerParamsSaveData(
      [150, -5, 0.9, 0.5, 120, 2],
      null,
      null,
      null,
      null,
    )).toEqual({
      extraParams: [100, 0, 0.9, 0.5, 100, 2],
      specialParams: [0, 0, 0, 0, 0],
      scalar: [0],
      paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRate: [],
    });
  });
});
