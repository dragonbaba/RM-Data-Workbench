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
      'single_engine_bonus',
      'single_cunit_bonus',
      'nominal_cunit_salvo',
      'single_base_bonus',
      'equip_count_bonus',
      'pair_same_engine_bonus',
      'pair_same_cunit_bonus',
      'pair_same_cunit_owner_bonus',
      'cunit_slot_action_repeat_bonus',
      'base_slot_action_repeat_bonus',
      'equip_id_set_bonus',
    ]);
  });

  it('模板定义会暴露 selector、args 和分组限制', () => {
    const ownerParamDefinition = getGameEffectTypeDefinition('pair_same_cunit_owner_bonus');
    const equipCountDefinition = getGameEffectTypeDefinition('equip_count_bonus');
    const equipSetDefinition = getGameEffectTypeDefinition('equip_id_set_bonus');
    const cunitDefinition = getGameEffectTypeDefinition('single_cunit_bonus');
    const baseDefinition = getGameEffectTypeDefinition('single_base_bonus');
    const baseSlotDefinition = getGameEffectTypeDefinition('base_slot_action_repeat_bonus');

    expect(ownerParamDefinition.selectorMode).toBe('none');
    expect(ownerParamDefinition.argsMode).toBe('count+ops');
    expect(ownerParamDefinition.selectorFields).toEqual([]);
    expect(ownerParamDefinition.allowIsStaticToggle).toBe(false);
    expect(ownerParamDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'baseParams',
      'extraParams',
      'vehicleParams',
      'specialParams',
      'baseParamRate',
    ]);

    expect(cunitDefinition.label).toBe('C 装携带奖励');
    expect(cunitDefinition.example.description).toEqual([
      '每个装备中的 C 装置会独立应用自身携带的属性奖励',
      '可随多个 C 装叠加',
    ]);
    expect(cunitDefinition.selectorMode).toBe('none');
    expect(cunitDefinition.argsMode).toBe('ops');

    expect(baseDefinition.label).toBe('底盘携带奖励');
    expect(baseDefinition.example.description).toEqual([
      '每个装备中的底盘会独立应用自身携带的属性奖励',
      '可随多个底盘来源叠加',
    ]);
    expect(baseDefinition.selectorMode).toBe('none');
    expect(baseDefinition.argsMode).toBe('ops');
    expect(baseSlotDefinition.selectorMode).toBe('equip');
    expect(baseSlotDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'vehicleParams',
    ]);

    expect(equipCountDefinition.selectorMode).toBe('equip');
    expect(equipCountDefinition.selectorFields).toEqual(['etypeIds', 'wtypeIds', 'atypeIds']);
    expect(equipCountDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'extraParams',
    ]);
    expect(equipSetDefinition.argsFields).toEqual(['weaponIds', 'armorIds', 'ops']);
    expect(equipSetDefinition.allowedGroups.map((entry) => entry.group)).toEqual([
      'baseParams',
      'extraParams',
      'vehicleParams',
      'specialParams',
      'baseParamRate',
      'scalar',
    ]);
  });

  it('默认模板会直接生成新对象协议', () => {
    expect(createGameEffectTemplate('equip_count_bonus')).toEqual({
      name: '双件套奖励',
      description: ['同一角色身上命中的装备类型数量达到阈值时应用属性'],
      effectType: 'equip_count_bonus',
      isStatic: true,
      config: {
        selector: { etypeIds: [10], wtypeIds: [], atypeIds: [] },
        args: {
          requiredCount: 2,
          weaponIds: [],
          armorIds: [],
          ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }],
        },
      },
    });

    expect(createGameEffectConfig('pair_same_engine_bonus')).toEqual({
      selector: {},
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

  it('会在规范化时清理 equip_count_bonus 遗留的 slotIndexes', () => {
    expect(normalizeGameEffectEntry({
      name: '旧件数奖励',
      description: '',
      effectType: 'equip_count_bonus',
      isStatic: true,
      config: {
        selector: { slotIndexes: [0, 1], etypeIds: [10], wtypeIds: [], atypeIds: [] },
        args: { requiredCount: 2, ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }] },
      },
    })).toMatchObject({
      effectType: 'equip_count_bonus',
      config: {
        selector: { etypeIds: [10], wtypeIds: [], atypeIds: [] },
        args: { requiredCount: 2 },
      },
    });
  });

  it('会拒绝 legacy owner effectType 作为正式效果协议', () => {
    expect(normalizeGameEffectEntry({
      name: '旧 owner 奖励',
      description: '',
      effectType: 'owner_stat_bonus',
      isStatic: true,
      config: { selector: {}, args: { ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 10 }] } },
    })).toBeNull();
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
    expect(getGroupOptions('single_engine_bonus')).toEqual([
      { value: 'baseParams', label: '基础属性' },
      { value: 'baseParamRate', label: '基础属性率' },
      { value: 'vehicleParams', label: '车辆属性' },
    ]);
    expect(getKeyOptions('single_engine_bonus', 'vehicleParams')).toEqual([
      { value: 'loadValue', label: '载重' },
      { value: 'carryValue', label: '承重量' },
    ]);
    expect(getKeyOptions('equip_id_set_bonus', 'baseParams', systemData)).toContainEqual({ value: 'mhp', label: '最大生命值' });
    expect(getKeyOptions('equip_id_set_bonus', 'baseParamRate', systemData)).toContainEqual({ value: 'mhp', label: '体力' });
    expect(getKeyOptions('equip_id_set_bonus', 'scalar')).toEqual([
      { value: 'expRate', label: '团队经验加成' },
      { value: 'dropRate', label: '团队掉落加成' },
    ]);
    expect(getKeyOptions('single_cunit_bonus', 'specialParams')).toContainEqual({ value: 'hrg', label: 'HP 再生率' });
    expect(getOpOptions()).toEqual([
      { value: 'add', label: '加算（+固定值）' },
      { value: 'mul', label: '乘算（倍率：1.5=+50%，不是50）' },
      { value: 'set', label: '设定值（覆盖最终值）' },
    ]);
    expect(createDefaultOpRow('cunit_slot_action_repeat_bonus')).toEqual({
      group: 'vehicleParams',
      key: 'actionRepeat',
      op: 'add',
      value: 0,
    });
    expect(createDefaultOpRow('base_slot_action_repeat_bonus')).toEqual({
      group: 'vehicleParams',
      key: 'actionRepeat',
      op: 'add',
      value: 0,
    });
  });

  it('会正确读取编辑器缓存中的 System.json 包装结构', () => {
    expect(getKeyOptions('equip_id_set_bonus', 'baseParams', wrappedSystemData)).toContainEqual({ value: 'mhp', label: '最大生命值' });
    expect(getKeyOptions('equip_id_set_bonus', 'baseParamRate', wrappedSystemData)).toContainEqual({ value: 'mhp', label: '体力' });
  });

  it('会在行级校验中阻止空 ops、非法 group/key 和非法 value', () => {
    expect(validateEffectOpRows('equip_count_bonus', [])).toEqual({ valid: false, message: '至少需要一条属性操作' });
    expect(validateEffectOpRows('equip_count_bonus', [{ group: 'scalar', key: 'expRate', op: 'add', value: 1 }])).toEqual({
      valid: false,
      message: '当前模板不允许使用分组 scalar',
    });
    expect(validateEffectOpRows('equip_id_set_bonus', [{ group: 'scalar', key: 'dropRate', op: 'mul', value: 2 }])).toEqual({
      valid: false,
      message: '团队经验/掉落加成只允许加算',
    });
    expect(validateEffectOpRows('single_engine_bonus', [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: Number.NaN }])).toEqual({
      valid: false,
      message: '第 1 条操作的 value 不是合法数字',
    });
  });

  it('保存前会校验 selector 和 args 必须存在且为对象', () => {
    expect(validateGameEffectConfig('equip_count_bonus', {
      selector: { etypeIds: [], wtypeIds: [], atypeIds: [] },
      args: {
        ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }],
        requiredCount: 2,
        weaponIds: [],
        armorIds: [],
      },
    })).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_count_bonus', { args: {} })).toEqual({
      valid: false,
      message: '配置缺少 selector 对象',
    });

    expect(validateGameEffectConfig('equip_count_bonus', { selector: {}, args: 'invalid' })).toEqual({
      valid: false,
      message: '配置缺少 args 对象',
    });
  });

  it('会按模板严格校验 selector 字段', () => {
    expect(validateGameEffectEntry({
      name: '测试',
      description: '',
      effectType: 'single_cunit_bonus',
      isStatic: true,
      config: {
        selector: { etypeIds: [10] },
        args: {
          ops: [{ group: 'specialParams', key: 'tgr', op: 'add', value: 0.2 }],
          requiredCount: 0,
          weaponIds: [],
          armorIds: [],
        },
      },
    })).toEqual({ valid: false, message: 'selector 存在未定义字段: etypeIds' });

    expect(validateGameEffectEntry({
      name: '件数奖励',
      description: '',
      effectType: 'equip_count_bonus',
      isStatic: true,
      config: {
        selector: { slotIndexes: [0], etypeIds: [], wtypeIds: [], atypeIds: [] },
        args: {
          ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }],
          requiredCount: 2,
          weaponIds: [],
          armorIds: [],
        },
      },
    })).toEqual({
      valid: false,
      message: 'selector 存在未定义字段: slotIndexes',
    });
  });

  it('装备合集模板会校验 weaponIds 和 armorIds', () => {
    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: {},
      args: {
        weaponIds: [1],
        armorIds: [2, 5, 10],
        ops: [{ group: 'scalar', key: 'dropRate', op: 'add', value: 0.2 }],
        requiredCount: 0,
      },
    }, systemData)).toEqual({ valid: true });

    expect(validateGameEffectConfig('equip_id_set_bonus', {
      selector: {},
      args: {
        weaponIds: '1',
        armorIds: [2],
        ops: [{ group: 'scalar', key: 'dropRate', op: 'add', value: 0.2 }],
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
      name: '件数奖励',
      description: '',
      effectType: 'equip_count_bonus',
      isStatic: false,
      config: { selector: { etypeIds: [], wtypeIds: [], atypeIds: [] }, args: { requiredCount: 2, ops: [{ group: 'extraParams', key: 'hitRate', op: 'add', value: 1 }] } },
    })).toEqual({ valid: false, message: '模板 equip_count_bonus 的 isStatic 必须为 true' });
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
  it('挂名齐射模板不暴露属性操作字段', () => {
    const definition = getGameEffectTypeDefinition('nominal_cunit_salvo');
    expect(definition.label).toBe('C 装挂名齐射');
    expect(definition.argsMode).toBe('none');
    expect(definition.argsFields).toEqual([]);
    expect(definition.allowedGroups).toEqual([]);

    const template = createGameEffectTemplate('nominal_cunit_salvo', wrappedSystemData);
    expect(template.config.args).toEqual({});
    expect(validateGameEffectEntry(template, wrappedSystemData)).toEqual({ valid: true });
    expect(validateGameEffectConfig('nominal_cunit_salvo', template.config, wrappedSystemData)).toEqual({ valid: true });
  });

});
