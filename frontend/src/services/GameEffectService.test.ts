import { describe, expect, it } from 'vitest';
import {
  createDefaultOpRow,
  createGameEffectConfig,
  createGameEffectTemplate,
  ensureItemEffects,
  getAllowedStatIds,
  getGameEffectTypeDefinition,
  getGameEffectTypeDefinitions,
  getOpOptions,
  getStatOptions,
  normalizeGameEffectEntry,
  normalizeEffectRegistry,
  parseOpsToRows,
  serializeRowsToOps,
  validateEffectOpRows,
  validateGameEffectConfig,
  validateGameEffectEntry,
} from './GameEffectService';

describe('GameEffectService', () => {
  const systemData = {
    elements: ['', '通常', '火炎', '冷气', '电气', '音波', '瓦斯', '激光'],
    terms: {
      params: ['体力', '驾驶', '攻击', '防御', '战斗', '修理', '速度', '幸运', '命中', '回避'],
    },
  };
  const wrappedSystemData = [null, systemData];

  it('缺少 effects 时会自动补空数组', () => {
    const result = ensureItemEffects({
      id: 1,
      name: '史莱姆',
    });

    expect(result.changed).toBe(true);
    expect(result.item.effects).toEqual([]);
  });

  it('effects 引用会去重并转成整型数组', () => {
    const result = ensureItemEffects({
      id: 1,
      name: '药草',
      effects: [3, 3, 2, 2.8],
    });

    expect(result.changed).toBe(true);
    expect(result.item.effects).toEqual([3, 2]);
  });

  it('模板注册表只暴露当前集中式 effectType', () => {
    const definitions = getGameEffectTypeDefinitions();

    expect(definitions.map((definition) => definition.effectType)).toEqual([
      'equip_stat_bonus',
      'runtime_stat_bonus',
      'owner_stat_bonus',
      'owner_scalar_bonus',
      'owner_param_rate_bonus',
      'owner_element_rate_bonus',
      'single_engine_bonus',
      'single_cunit_bonus',
      'equip_count_bonus',
      'same_base_id_count_bonus',
      'pair_same_engine_bonus',
      'pair_same_cunit_bonus',
      'pair_same_cunit_owner_bonus',
      'cunit_owner_stat_bonus',
      'cunit_slot_action_repeat_bonus',
      'equip_id_set_bonus',
    ]);
  });

  it('模板定义会按 effectType 暴露 selector 和 args 面板', () => {
    const ownerParamDefinition = getGameEffectTypeDefinition('owner_param_rate_bonus');
    const equipSetDefinition = getGameEffectTypeDefinition('equip_id_set_bonus');

    expect(ownerParamDefinition.selectorMode).toBe('none');
    expect(ownerParamDefinition.argsMode).toBe('ops');
    expect(ownerParamDefinition.selectorFields).toEqual([]);
    expect(ownerParamDefinition.allowIsStaticToggle).toBe(false);

    expect(equipSetDefinition.selectorMode).toBe('none');
    expect(equipSetDefinition.argsMode).toBe('id-set+ops');
    expect(equipSetDefinition.selectorFields).toEqual([]);
    expect(equipSetDefinition.argsFields).toEqual(['weaponIds', 'armorIds', 'ops']);
  });

  it('模板默认示例会直接给 Effects.json 条目完整数据', () => {
    expect(createGameEffectTemplate('equip_stat_bonus')).toEqual({
      name: '主炮支援',
      description: ['给命中的装备实例增加静态属性'],
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

    expect(createGameEffectConfig('pair_same_engine_bonus')).toEqual({
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
      description: ['C 装置给指定槽位武器追加发射次数'],
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

  it('效果注册表会丢弃非法条目并补齐 id', () => {
    const result = normalizeEffectRegistry([
      null,
      {
        name: '经验增益',
        description: ['经验 +10%'],
        effectType: 'owner_scalar_bonus',
        isStatic: true,
        config: {
          selector: {},
          args: {
            ops: [[103, 1, 0.1]],
          },
        },
      },
      {
        name: '非法效果',
        effectType: 'custom_script_effect',
      },
    ], systemData);

    expect(result[1]).toMatchObject({
      id: 1,
      effectType: 'owner_scalar_bonus',
    });
    expect(result[2]).toBeNull();
  });

  it('会把旧字符串描述归一化为 description 数组', () => {
    expect(normalizeGameEffectEntry({
      name: '经验增益',
      description: '经验 +10%\n战斗结算生效',
      effectType: 'owner_scalar_bonus',
      isStatic: true,
      config: {
        selector: {},
        args: {
          ops: [[103, 1, 0.1]],
        },
      },
    })).toMatchObject({
      description: ['经验 +10%', '战斗结算生效'],
    });
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
      { value: 101, label: '载重' },
      { value: 102, label: '承重量' },
    ]);
    expect(getStatOptions('owner_param_rate_bonus', systemData)).toContainEqual({
      value: 200,
      label: '体力',
    });
    expect(getStatOptions('owner_element_rate_bonus', systemData)).toContainEqual({
      value: 302,
      label: '火炎',
    });
    expect(getOpOptions()).toEqual([
      { value: 1, label: '加算' },
      { value: 2, label: '乘算' },
      { value: 3, label: '设定值' },
    ]);
    expect(createDefaultOpRow('cunit_slot_action_repeat_bonus')).toEqual({
      statId: 7,
      opId: 1,
      value: 0,
    });
  });

  it('会正确读取编辑器缓存中的 System.json 包装结构', () => {
    expect(getStatOptions('owner_param_rate_bonus', wrappedSystemData)).toContainEqual({
      value: 200,
      label: '体力',
    });
    expect(getStatOptions('owner_element_rate_bonus', wrappedSystemData)).toContainEqual({
      value: 302,
      label: '火炎',
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

  it('装备合集模板会校验 weaponIds 和 armorIds', () => {
    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: {},
      args: {
        weaponIds: [1],
        armorIds: [2, 5, 10],
        ops: [[103, 2, 2]],
      },
    }, systemData)).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: {},
      args: {
        weaponIds: '1',
        armorIds: [2],
        ops: [[103, 2, 2]],
      },
    }, systemData)).toEqual({
      valid: false,
      message: 'args.weaponIds 必须是数字数组',
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
