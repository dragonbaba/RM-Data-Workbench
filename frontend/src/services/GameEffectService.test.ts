import { describe, expect, it } from 'vitest';
import {
  createDefaultGameEffect,
  createDefaultGameEffectConfig,
  createDefaultOpRow,
  createGameEffectTemplate,
  ensureItemGameEffects,
  getAllowedStatIds,
  getGameEffectTypeDefinition,
  getGameEffectTypeDefinitions,
  getOpOptions,
  getStatOptions,
  parseOpsToRows,
  serializeRowsToOps,
  validateEffectOpRows,
  validateGameEffectConfig,
  validateGameEffectEntry,
} from './GameEffectService';

describe('GameEffectService', () => {
  it('缺少 gameEffects 时会自动补空数组', () => {
    const result = ensureItemGameEffects({
      id: 1,
      name: '史莱姆',
    });

    expect(result.changed).toBe(true);
    expect(result.item.gameEffects).toEqual([]);
  });

  it('缺少 effectType 的旧效果会被直接剔除', () => {
    const result = ensureItemGameEffects({
      id: 1,
      name: '药草',
      gameEffects: [{ name: '恢复' }],
    });

    expect(result.changed).toBe(true);
    expect(result.item.gameEffects).toEqual([]);
  });

  it('模板注册表只暴露当前共享 effectType', () => {
    const definitions = getGameEffectTypeDefinitions();

    expect(definitions.map((definition) => definition.effectType)).toEqual([
      'equip_stat_bonus',
      'runtime_stat_bonus',
      'owner_stat_bonus',
      'single_engine_bonus',
      'single_cunit_bonus',
      'equip_count_bonus',
      'same_base_id_count_bonus',
      'pair_same_engine_bonus',
      'pair_same_cunit_bonus',
      'pair_same_cunit_owner_bonus',
      'cunit_owner_stat_bonus',
      'cunit_slot_action_repeat_bonus',
    ]);
  });

  it('模板定义会暴露新的 selector 字段面板，不再包含旧 selector 字段', () => {
    const ownerDefinition = getGameEffectTypeDefinition('owner_stat_bonus');
    const cunitRepeatDefinition = getGameEffectTypeDefinition('cunit_slot_action_repeat_bonus');

    expect(ownerDefinition.selectorMode).toBe('none');
    expect(ownerDefinition.argsMode).toBe('ops');
    expect(ownerDefinition.selectorFields).toEqual([]);
    expect(ownerDefinition.allowIsStaticToggle).toBe(true);

    expect(cunitRepeatDefinition.selectorMode).toBe('equip');
    expect(cunitRepeatDefinition.selectorFields).toEqual([
      'slotIndexes',
      'etypeIds',
      'wtypeIds',
      'atypeIds',
    ]);
    expect(cunitRepeatDefinition.argsFields).toEqual(['ops']);
  });

  it('模板默认示例会直接给共享模块完整数据', () => {
    expect(createDefaultGameEffect()).toEqual({
      name: '主炮支援',
      description: '给命中的装备实例增加静态属性',
      effectType: 'equip_stat_bonus',
      isStatic: true,
      config: {
        selector: {
          slotIndexes: [],
          etypeIds: [],
          wtypeIds: [],
          atypeIds: [],
        },
        args: {
          ops: [[1, 1, 1]],
        },
      },
    });

    expect(createDefaultGameEffectConfig('pair_same_engine_bonus')).toEqual({
      selector: {},
      args: {
        requiredCount: 2,
        ops: [[101, 1, 5000]],
      },
    });
  });

  it('创建模板时会直接生成共享 effectType 数据', () => {
    expect(createGameEffectTemplate('cunit_slot_action_repeat_bonus')).toEqual({
      name: '主炮追加发射',
      description: 'C 装置给指定槽位武器追加发射次数',
      effectType: 'cunit_slot_action_repeat_bonus',
      isStatic: true,
      config: {
        selector: {
          slotIndexes: [],
          etypeIds: [10],
          wtypeIds: [],
          atypeIds: [],
        },
        args: {
          ops: [[7, 1, 1]],
        },
      },
    });
  });

  it('旧 effectType 和旧字段不会再做兼容迁移，非法模板会被直接剔除', () => {
    const result = ensureItemGameEffects({
      id: 1,
      name: '坦克',
      gameEffects: [{
        name: '旧效果',
        description: '旧版本',
        effectType: 'custom_script_effect',
        isStatic: false,
        config: {
          selector: {
            etypeIds: [10],
            tags: ['support-core'],
          },
          args: {
            value: 3,
            sameBaseId: true,
          },
        },
      }],
    });

    expect(result.changed).toBe(true);
    expect(result.item.gameEffects).toEqual([]);
  });

  it('会删除 sameBaseId 和不符合严格协议的 selector/args 字段类型', () => {
    const result = ensureItemGameEffects({
      id: 1,
      name: '战车',
      gameEffects: [{
        name: '旧双同型效果',
        description: '旧版本',
        effectType: 'pair_same_engine_bonus',
        isStatic: false,
        config: {
          selector: {
            etypeIds: 10,
            slotIndexes: [1],
          },
          args: {
            requiredCount: '2',
            sameBaseId: true,
            ops: [[101, 1, 5000]],
          },
        },
      }],
    });

    expect(result.changed).toBe(true);
    expect(result.item.gameEffects).toEqual([{
      name: '旧双同型效果',
      description: '旧版本',
      effectType: 'pair_same_engine_bonus',
      isStatic: true,
      config: {
        selector: {},
        args: {
          requiredCount: 2,
          ops: [[101, 1, 5000]],
        },
      },
    }]);
  });

  it('会把 ops 三元组转换为结构化行，再序列化回运行时格式', () => {
    const rows = parseOpsToRows([[101, 1, 3000], [4, 2, 1.5]]);

    expect(rows).toEqual([
      { statId: 101, opId: 1, value: 3000 },
      { statId: 4, opId: 2, value: 1.5 },
    ]);
    expect(serializeRowsToOps(rows)).toEqual([[101, 1, 3000], [4, 2, 1.5]]);
    expect(parseOpsToRows('invalid')).toEqual([]);
  });

  it('会按 effectType 暴露 statId/opId 选项和默认操作行', () => {
    expect(getAllowedStatIds('single_engine_bonus')).toEqual([101, 102]);
    expect(getStatOptions('single_engine_bonus')).toEqual([
      { value: 101, label: '101 | loadValue | 载重' },
      { value: 102, label: '102 | carryValue | 承重量' },
    ]);
    expect(getOpOptions()).toEqual([
      { value: 1, label: '1 | add | 加算' },
      { value: 2, label: '2 | mul | 乘算' },
      { value: 3, label: '3 | set | 设定值' },
    ]);
    expect(createDefaultOpRow('cunit_slot_action_repeat_bonus')).toEqual({
      statId: 7,
      opId: 1,
      value: 0,
    });
  });

  it('会在行级校验中阻止空 ops、非法 statId 和非法 value', () => {
    expect(validateEffectOpRows('equip_stat_bonus', [])).toEqual({
      valid: false,
      message: '至少需要一条属性操作',
    });

    expect(validateEffectOpRows('equip_stat_bonus', [{
      statId: 101,
      opId: 1,
      value: 300,
    }])).toEqual({
      valid: false,
      message: '当前模板不允许使用 statId=101',
    });

    expect(validateEffectOpRows('single_engine_bonus', [{
      statId: 101,
      opId: 1,
      value: Number.NaN,
    }])).toEqual({
      valid: false,
      message: '第 1 条操作的 value 不是合法数字',
    });
  });

  it('保存前会校验 selector 和 args 必须存在且为对象', () => {
    expect(validateGameEffectConfig('equip_stat_bonus', {
      selector: {
        slotIndexes: [],
        etypeIds: [],
        wtypeIds: [],
        atypeIds: [],
      },
      args: {
        ops: [[1, 1, 1]],
      },
    })).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_stat_bonus', {
      args: {},
    })).toEqual({
      valid: false,
      message: '配置缺少 selector 对象',
    });

    expect(validateGameEffectConfig('equip_stat_bonus', {
      selector: {},
      args: 'invalid',
    })).toEqual({
      valid: false,
      message: '配置缺少 args 对象',
    });
  });

  it('共享模板会拒绝未定义字段和错误 statId', () => {
    expect(validateGameEffectEntry({
      name: '测试',
      description: '',
      effectType: 'owner_stat_bonus',
      isStatic: true,
      config: {
        selector: {
          etypeIds: [10],
        },
        args: {
          ops: [[8, 1, 0.2]],
        },
      },
    })).toEqual({
      valid: false,
      message: 'selector 存在未定义字段: etypeIds',
    });

    expect(validateGameEffectEntry({
      name: '载重补正',
      description: '',
      effectType: 'equip_stat_bonus',
      isStatic: true,
      config: {
        selector: {},
        args: {
          ops: [[101, 1, 300]],
        },
      },
    })).toEqual({
      valid: false,
      message: 'args.ops 必须是合法的三元组数组，且 statId 必须符合当前模板约束',
    });
  });

  it('固定 isStatic 的共享模板会拒绝错误值，但 owner_stat_bonus 允许切换', () => {
    expect(validateGameEffectEntry({
      name: '双同型引擎',
      description: '',
      effectType: 'pair_same_engine_bonus',
      isStatic: false,
      config: {
        selector: {},
        args: {
          requiredCount: 2,
          ops: [[101, 1, 5000]],
        },
      },
    })).toEqual({
      valid: false,
      message: '模板 pair_same_engine_bonus 的 isStatic 必须为 true',
    });

    expect(validateGameEffectEntry({
      name: '行动时暴伤强化',
      description: '',
      effectType: 'owner_stat_bonus',
      isStatic: false,
      config: {
        selector: {},
        args: {
          ops: [[8, 1, 0.2]],
        },
      },
    })).toEqual({ valid: true });
  });
});
