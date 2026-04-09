import { describe, expect, it } from 'vitest';
import {
  areStateChargeConfigsEqual,
  buildStateChargeSaveData,
  normalizeStateChargeEditorValues,
  normalizeStateDataEntry,
  STATE_CHARGE_QUEUE_SCOPE_CURRENT,
  STATE_CHARGE_QUEUE_SCOPE_NEXT,
} from './StateChargePropertyService';

describe('StateChargePropertyService', () => {
  it('会把状态蓄力字段规范化为固定编辑结构', () => {
    expect(normalizeStateChargeEditorValues({
      blockActions: true,
      grantAction: '1',
      releaseSkillId: '7',
      queueScope: 1,
      queueShift: -3.8,
    })).toEqual({
      blockActions: true,
      grantAction: false,
      releaseSkillId: 7,
      queueScope: STATE_CHARGE_QUEUE_SCOPE_NEXT,
      queueShift: -3,
    });
  });

  it('缺少配置时会回到默认值', () => {
    expect(normalizeStateChargeEditorValues(undefined)).toEqual({
      blockActions: false,
      grantAction: false,
      releaseSkillId: 0,
      queueScope: STATE_CHARGE_QUEUE_SCOPE_CURRENT,
      queueShift: 0,
    });
  });

  it('保存时会省略默认字段', () => {
    expect(buildStateChargeSaveData(undefined)).toEqual({
      blockActions: false,
      grantAction: false,
      releaseSkillId: 0,
      queueScope: STATE_CHARGE_QUEUE_SCOPE_CURRENT,
      queueShift: 0,
    });
    expect(buildStateChargeSaveData({
      blockActions: true,
      grantAction: true,
      releaseSkillId: 9,
      queueScope: STATE_CHARGE_QUEUE_SCOPE_NEXT,
      queueShift: -2,
    })).toEqual({
      blockActions: true,
      grantAction: true,
      releaseSkillId: 9,
      queueScope: STATE_CHARGE_QUEUE_SCOPE_NEXT,
      queueShift: -2,
    });
  });

  it('相同配置不会误判为变化', () => {
    expect(areStateChargeConfigsEqual(
      {
        blockActions: true,
        grantAction: true,
        releaseSkillId: 5,
        queueScope: STATE_CHARGE_QUEUE_SCOPE_NEXT,
        queueShift: -1,
      },
      {
        blockActions: true,
        grantAction: true,
        releaseSkillId: 5,
        queueScope: STATE_CHARGE_QUEUE_SCOPE_NEXT,
        queueShift: -1,
      },
    )).toBe(true);
  });

  it('规范化状态条目时会写回结构化 chargeConfig', () => {
    expect(normalizeStateDataEntry({
      id: 4,
      name: '蓄力',
      chargeConfig: {
        blockActions: true,
        releaseSkillId: 18,
      },
    })).toEqual({
      id: 4,
      name: '蓄力',
      chargeConfig: {
        blockActions: true,
        grantAction: false,
        releaseSkillId: 18,
        queueScope: 0,
        queueShift: 0,
      },
    });
  });

  it('空或默认 chargeConfig 会在规范化时补齐默认对象', () => {
    expect(normalizeStateDataEntry({
      id: 5,
      name: '空蓄力',
      chargeConfig: {
        blockActions: false,
        grantAction: false,
        releaseSkillId: 0,
        queueScope: 0,
        queueShift: 0,
      },
    })).toEqual({
      id: 5,
      name: '空蓄力',
      chargeConfig: {
        blockActions: false,
        grantAction: false,
        releaseSkillId: 0,
        queueScope: 0,
        queueShift: 0,
      },
    });
    expect(normalizeStateDataEntry({
      id: 6,
      name: '无字段',
    })).toEqual({
      id: 6,
      name: '无字段',
      chargeConfig: {
        blockActions: false,
        grantAction: false,
        releaseSkillId: 0,
        queueScope: 0,
        queueShift: 0,
      },
    });
  });
});
