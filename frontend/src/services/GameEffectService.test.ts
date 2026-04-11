import { describe, expect, it } from 'vitest';
import {
  createDefaultOpRow,
  createGameEffectConfig,
  createGameEffectTemplate,
  ensureItemEffects,
  getGameEffectTypeDefinition,
  getGameEffectTypeDefinitions,
  getGroupOptions,
  getKeyOptions,
  getOpOptions,
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
    const result = ensureItemEffects({ id: 1, name: '史莱姆' });
    expect(result.changed).toBe(true);
    expect(result.item.effects).toEqual([]);
  });

  it('effects 引用会去重并转成整型数组', () => {
    const result = ensureItemEffects({ id: 1, name: '药草', effects: [3, 3, 2, 2.8] });
    expect(result.changed).toBe(true);
    expect(result.item.effects).toEqual([3, 2]);
  });

  it('模板注册表只暴露集中式 effectType', () => {
    expect(getGameEffectTypeDefinitions().map((definition) => definition.effectType)).toEqual([
      'equip_stat_bonus',
      'runtime_stat_bonus',
      'single_engine_bonus',
      'single_cunit_bonus',
      'equip_count_bonus',
      'same_base_id_count_bonus',
      'pair_same_engine_bonus',
      'pair_same_cunit_bonus',
      'pair_same_cunit_owner_bonus',
      'cunit_slot_action_repeat_bonus',
      'equip_id_set_bonus',
    ]);
  });

  it('模板定义会暴露 selector、args 和分组限制', () => {
    const ownerParamDefinition = getGameEffectTypeDefinition('pair_same_cunit_owner_bonus');
    const equipSetDefinition = getGameEffectTypeDefinition('equip_id_set_bonus');

    expect(ownerParamDefinition.selectorMode).toBe('none');
    expect(ownerParamDefinition.argsMode).toBe('count+ops');
    expect(ownerParamDefinition.selectorFields).toEqual([]);
    expect(ownerParamDefinition.allowIsStaticToggle).toBe(false);
    expect(ownerParamDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'extraParams',
      'vehicleParams',
      'specialParams',
    ]);

    expect(equipSetDefinition.argsFields).toEqual(['weaponIds', 'armorIds', 'ops']);
    expect(equipSetDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'extraParams',
      'vehicleParams',
      'specialParams',
      'scalar',
      'paramRate',
      'elementRate',
    ]);
  });

  it('默认模板会直接生成新对象协议', () => {
    expect(createGameEffectTemplate('equip_stat_bonus')).toEqual({
      name: '主炮支援',
      description: ['给命中的装备实例增加静态属性'],
      effectType: 'equip_stat_bonus',
      isStatic: true,
      config: {
        selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
        args: {
          requiredCount: 0,
          weaponIds: [],
          armorIds: [],
          ops: [{ group: 'vehicleParams', key: 'repeat', op: 'add', value: 1 }],
        },
      },
    });

    expect(createGameEffectConfig('pair_same_engine_bonus')).toEqual({
      selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
      args: {
        requiredCount: 2,
        weaponIds: [],
        armorIds: [],
        ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 5000 }],
      },
    });
  });

  it('效果注册表会丢弃非法条目并补齐 id', () => {
    const result = normalizeEffectRegistry([
      null,
      {
        name: '单引擎补正',
        description: ['载重 +3000'],
        effectType: 'single_engine_bonus',
        isStatic: true,
        config: { selector: {}, args: { ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 }] } },
      },
      { name: '非法效果', effectType: 'custom_script_effect' },
    ], systemData);

    expect(result[1]).toMatchObject({ id: 1, effectType: 'single_engine_bonus' });
    expect(result[2]).toBeNull();
  });

  it('会把旧字符串描述归一化为 description 数组', () => {
    expect(normalizeGameEffectEntry({
      name: '单引擎补正',
      description: '载重 +3000\n单引擎时生效',
      effectType: 'single_engine_bonus',
      isStatic: true,
      config: { selector: {}, args: { ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 }] } },
    })).toMatchObject({ description: ['载重 +3000', '单引擎时生效'] });
  });

  it('会把对象 ops 转为面板行，再序列化回配置格式', () => {
    const rows = parseOpsToRows([
      { group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 },
      { group: 'extraParams', key: 'critDamage', op: 'mul', value: 1.5 },
    ]);

    expect(rows).toEqual([
      { group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 },
      { group: 'extraParams', key: 'critDamage', op: 'mul', value: 1.5 },
    ]);
    expect(serializeRowsToOps(rows)).toEqual(rows);
    expect(parseOpsToRows('invalid')).toEqual([]);
  });

  it('会按 effectType 暴露 group/key/op 选项和默认操作行', () => {
    expect(getGroupOptions('single_engine_bonus')).toEqual([{ value: 'vehicleParams', label: '车辆属性' }]);
    expect(getKeyOptions('single_engine_bonus', 'vehicleParams')).toEqual([
      { value: 'loadValue', label: '载重' },
      { value: 'carryValue', label: '承重量' },
    ]);
    expect(getKeyOptions('equip_id_set_bonus', 'paramRate', systemData)).toContainEqual({ value: 'mhp', label: '体力' });
    expect(getKeyOptions('equip_id_set_bonus', 'elementRate', systemData)).toContainEqual({ value: '2', label: '火炎' });
    expect(getKeyOptions('single_cunit_bonus', 'specialParams')).toContainEqual({ value: 'tgr', label: '仇恨' });
    expect(getOpOptions()).toEqual([
      { value: 'add', label: '加算' },
      { value: 'mul', label: '乘算' },
      { value: 'set', label: '设定值' },
    ]);
    expect(createDefaultOpRow('cunit_slot_action_repeat_bonus')).toEqual({
      group: 'vehicleParams',
      key: 'actionRepeat',
      op: 'add',
      value: 0,
    });
  });

  it('会正确读取编辑器缓存中的 System.json 包装结构', () => {
    expect(getKeyOptions('equip_id_set_bonus', 'paramRate', wrappedSystemData)).toContainEqual({ value: 'mhp', label: '体力' });
    expect(getKeyOptions('equip_id_set_bonus', 'elementRate', wrappedSystemData)).toContainEqual({ value: '2', label: '火炎' });
  });

  it('会在行级校验中阻止空 ops、非法 group/key 和非法 value', () => {
    expect(validateEffectOpRows('equip_stat_bonus', [])).toEqual({ valid: false, message: '至少需要一条属性操作' });
    expect(validateEffectOpRows('equip_stat_bonus', [{ group: 'scalar', key: 'expRate', op: 'add', value: 1 }])).toEqual({
      valid: false,
      message: '当前模板不允许使用分组 scalar',
    });
    expect(validateEffectOpRows('single_engine_bonus', [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: Number.NaN }])).toEqual({
      valid: false,
      message: '第 1 条操作的 value 不是合法数字',
    });
  });

  it('保存前会校验 selector 和 args 必须存在且为对象', () => {
    expect(validateGameEffectConfig('equip_stat_bonus', {
      selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
      args: {
        ops: [{ group: 'vehicleParams', key: 'repeat', op: 'add', value: 1 }],
        requiredCount: 0,
        weaponIds: [],
        armorIds: [],
      },
    })).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_stat_bonus', { args: {} })).toEqual({
      valid: false,
      message: '配置缺少 selector 对象',
    });

    expect(validateGameEffectConfig('equip_stat_bonus', { selector: {}, args: 'invalid' })).toEqual({
      valid: false,
      message: '配置缺少 args 对象',
    });
  });

  it('共享模板会接受固定 selector 键，但仍会拒绝错误 key', () => {
    expect(validateGameEffectEntry({
      name: '测试',
      description: '',
      effectType: 'single_cunit_bonus',
      isStatic: true,
      config: {
        selector: { slotIndexes: [], etypeIds: [10], wtypeIds: [], atypeIds: [] },
        args: {
          ops: [{ group: 'specialParams', key: 'tgr', op: 'add', value: 0.2 }],
          requiredCount: 0,
          weaponIds: [],
          armorIds: [],
        },
      },
    })).toEqual({ valid: true });

    expect(validateGameEffectEntry({
      name: '载重补正',
      description: '',
      effectType: 'equip_stat_bonus',
      isStatic: true,
      config: {
        selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
        args: {
          ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 300 }],
          requiredCount: 0,
          weaponIds: [],
          armorIds: [],
        },
      },
    })).toEqual({
      valid: false,
      message: 'args.ops 必须是合法的对象数组，且属性分组与 key 必须符合当前模板约束',
    });
  });

  it('装备合集模板会校验 weaponIds 和 armorIds', () => {
    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
      args: {
        weaponIds: [1],
        armorIds: [2, 5, 10],
        ops: [{ group: 'scalar', key: 'expRate', op: 'mul', value: 2 }],
        requiredCount: 0,
      },
    }, systemData)).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: { slotIndexes: [], etypeIds: [], wtypeIds: [], atypeIds: [] },
      args: {
        weaponIds: '1',
        armorIds: [2],
        ops: [{ group: 'scalar', key: 'expRate', op: 'mul', value: 2 }],
        requiredCount: 0,
      },
    }, systemData)).toEqual({ valid: false, message: 'args.weaponIds 必须是数字数组' });
  });

  it('固定 isStatic 的模板会拒绝错误值', () => {
    expect(validateGameEffectEntry({
      name: '双同型引擎',
      description: '',
      effectType: 'pair_same_engine_bonus',
      isStatic: false,
      config: { selector: {}, args: { requiredCount: 2, ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 5000 }] } },
    })).toEqual({ valid: false, message: '模板 pair_same_engine_bonus 的 isStatic 必须为 true' });

    expect(validateGameEffectEntry({
      name: '行动时暴伤强化',
      description: '',
      effectType: 'runtime_stat_bonus',
      isStatic: false,
      config: { selector: {}, args: { ops: [{ group: 'extraParams', key: 'finalDamage', op: 'add', value: 0.2 }] } },
    })).toEqual({ valid: true });
  });

  it('owner 属性模板允许特殊属性分组', () => {
    expect(validateGameEffectEntry({
      name: '挑衅装置',
      description: '',
      effectType: 'single_cunit_bonus',
      isStatic: true,
      config: {
        selector: {},
        args: {
          ops: [{ group: 'specialParams', key: 'tgr', op: 'add', value: 0.5 }],
          requiredCount: 0,
          weaponIds: [],
          armorIds: [],
        },
      },
    })).toEqual({ valid: true });
  });
});
