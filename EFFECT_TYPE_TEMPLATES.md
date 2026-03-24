# gameEffects effectType 模板清单

本文档用于统一 `gameEffects[*]` 的 `effectType` 体系。

核心原则：

- 每条效果有且只能有一个 `effectType`
- 编辑器根据 `effectType` 自动生成 `config.selector` 与 `config.args`
- 常规效果默认走共享模块 `module = "effect"`
- 只有模板表达不了时，才使用自定义脚本模块
- 编辑器面板必须按 `effectType` 约束字段，不允许把所有字段无差别暴露给用户

## 1. 顶层结构

```json
{
  "name": "效果名",
  "description": "效果说明",
  "module": "effect",
  "effectType": "equip_stat_bonus",
  "isStatic": true,
  "config": {
    "selector": {},
    "args": {}
  }
}
```

## 2. 编辑器创建流程

编辑器创建一条新效果时，必须按以下顺序执行：

1. 选择 `effectType`
2. 读取该类型的模板定义
3. 自动填入默认 `module`
4. 自动填入默认 `isStatic`
5. 自动生成 `config.selector`
6. 自动生成 `config.args`
7. 用户只在模板允许的字段内填写

不允许：

- 没有 `effectType`
- 缺失 `config.selector`
- 缺失 `config.args`
- 一条效果混用多个类型

## 2.1 编辑器修改规范

编辑器侧建议固定成“类型驱动表单”：

1. 先选择 `effectType`
2. 根据 `effectType` 自动填入默认 `module`
3. 根据 `effectType` 自动填入默认 `isStatic`
4. 根据 `effectType` 决定是否显示 `selector`
5. 根据 `effectType` 生成对应的 `args` 字段面板
6. 保存时统一落到：

```json
{
  "name": "",
  "description": "",
  "module": "effect",
  "effectType": "",
  "isStatic": true,
  "config": {
    "selector": {},
    "args": {}
  }
}
```

编辑器不要做的事：

- 不要让用户自由新增未注册字段
- 不要让 `custom_script_effect` 自动带上共享模板字段
- 不要给 `owner_stat_bonus` 暴露无意义的 `selector` 编辑面板
- 不要把 `101/102` 暴露到所有模板里
  - 当前只建议在 owner 类模板和引擎类模板中开放

## 2.2 编辑器字段面板约定

建议统一字段：

- 公共字段
  - `name`
  - `description`
  - `effectType`
  - `module`
  - `isStatic`
- 条件面板
  - `selector.slotIndexes`
  - `selector.etypeIds`
  - `selector.equipTypes`
  - `selector.wtypeIds`
  - `selector.atypeIds`
  - `selector.metaKeys`
- 参数面板
  - `args.ops`
  - `args.requiredCount`
  - `args.requiredMetaKeys`
  - `args.value`

建议显示规则：

- `equip_stat_bonus`
  - 显示：公共字段 + selector + ops
- `runtime_stat_bonus`
  - 显示：公共字段 + selector + ops
- `owner_stat_bonus`
  - 显示：公共字段 + ops
  - 隐藏：selector 面板
  - 保存：`selector` 仍写空对象 `{}`
- `single_engine_bonus`
  - 显示：公共字段 + ops
  - 隐藏：selector 面板
  - 保存：`selector` 仍写空对象 `{}`
- `equip_count_bonus`
  - 显示：公共字段 + selector + requiredCount + ops
- `same_base_id_count_bonus`
  - 显示：公共字段 + selector + requiredCount + ops
- `pair_same_engine_bonus`
  - 显示：公共字段 + requiredCount + ops
  - 隐藏：selector 面板
- `pair_same_cunit_bonus`
  - 显示：公共字段 + selector + requiredCount + ops
- `cunit_owner_stat_bonus`
  - 显示：公共字段 + ops
  - 隐藏：selector 面板
- `cunit_slot_action_repeat_bonus`
  - 显示：公共字段 + selector + ops
- `meta_present_bonus`
  - 显示：公共字段 + selector + requiredMetaKeys + ops
- `custom_script_effect`
  - 显示：公共字段 + 自定义 `args`
  - 隐藏：共享模板专用字段自动生成

## 2.3 effectType 默认注册表

编辑器建议内置如下默认映射：

```json
{
  "equip_stat_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "ops"
  },
  "runtime_stat_bonus": {
    "module": "effect",
    "isStatic": false,
    "selectorMode": "equip",
    "argsMode": "ops"
  },
  "owner_stat_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "none",
    "argsMode": "ops"
  },
  "single_engine_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "none",
    "argsMode": "ops"
  },
  "equip_count_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "count+ops"
  },
  "same_base_id_count_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "count+ops"
  },
  "pair_same_engine_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "none",
    "argsMode": "count+ops"
  },
  "pair_same_cunit_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "count+ops"
  },
  "cunit_owner_stat_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "none",
    "argsMode": "ops"
  },
  "cunit_slot_action_repeat_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "ops"
  },
  "meta_present_bonus": {
    "module": "effect",
    "isStatic": true,
    "selectorMode": "equip",
    "argsMode": "meta+ops"
  },
  "custom_script_effect": {
    "module": "",
    "isStatic": true,
    "selectorMode": "custom",
    "argsMode": "custom"
  }
}
```

## 3. 通用枚举

### 3.1 `opId`

```json
{
  "1": "add",
  "2": "mul",
  "3": "set"
}
```

### 3.2 `equipTypeId`

```json
{
  "1": "weapon",
  "2": "armor",
  "3": "engine",
  "4": "cUnit",
  "5": "base"
}
```

### 3.3 `statId`

```json
{
  "1": "repeat",
  "2": "hitRate",
  "3": "critRate",
  "4": "critDamageRate",
  "5": "evadeRate",
  "6": "interceptRate",
  "7": "actionRepeat",
  "8": "finalDamageRate",
  "101": "loadValue",
  "102": "carryValue"
}
```

说明：

- `1~6` 已接入当前 effect 主链
- `7 = actionRepeat` 表示“仅发射期连发修正”，会影响实际开火次数和弹舱消耗，但不改变 UI 显示的实例连发
- `8 = finalDamageRate` 表示最终伤害百分比修正，按加算方式叠到基础倍率 `1`
- `101/102` 已接入 owner 载重主链
  - `101 = loadValue`：战车运行载重修正
  - `102 = carryValue`：战车背包承重修正
  - 当前建议仅在 `owner_stat_bonus / single_engine_bonus / pair_same_engine_bonus / cunit_owner_stat_bonus` 这类 owner 模板中开放

## 4. 通用 selector 模板

```json
{
  "slotIndexes": [0, 1],
  "etypeIds": [10, 11, 12],
  "equipTypes": [1, 3, 4, 5],
  "wtypeIds": [1, 2, 3],
  "atypeIds": [1, 2, 10],
  "metaKeys": ["projectileId"]
}
```

### 4.1 selector 每个字段的意义

- `slotIndexes`
  - 类型：`number[]`
  - 含义：匹配多个槽位索引
  - 典型用途：同时影响 1、2 号槽
  - 约束：即使只有一个槽，也必须写成数组
- `etypeIds`
  - 类型：`number[]`
  - 含义：按装备的槽位类型匹配
  - 典型用途：主炮/副炮/SE/引擎/c 装置/底盘过滤
- `equipTypes`
  - 类型：`number[]`
  - 含义：按 effect 系统自己的粗分类匹配
  - 典型用途：只匹配引擎、只匹配 c 装
- `wtypeIds`
  - 类型：`number[]`
  - 含义：按武器类型匹配
- `atypeIds`
  - 类型：`number[]`
  - 含义：按防具类型匹配
- `metaKeys`
  - 类型：`string[]`
  - 含义：要求 `meta` 中存在这些键

当前 selector 已经删除这些旧字段：

- `slotIndex`
- `tags`
- `metaEquals`

### 4.2 selector 的使用原则

- `selector` 本身不表示“条件集”还是“作用集”
- 它在不同 `effectType` 下语义不同
- 编辑器不应脱离 `effectType` 单独解释 `selector`

当前第一批模板里的语义：

- `equip_stat_bonus`
  - `selector` = 作用集
- `owner_stat_bonus`
  - `selector` 仅保留为空对象占位
  - `ops` 直接写入 owner 自身累计属性
- `single_engine_bonus`
  - `selector` 仅保留为空对象占位
  - 条件：当前 owner 恰好只有一个引擎
  - `ops` 直接写入 owner 自身累计属性
- `runtime_stat_bonus`
  - `selector` = 运行时匹配条件
- `equip_count_bonus`
  - `selector` = 条件集 + 作用集
- `same_base_id_count_bonus`
  - `selector` = 条件集 + 作用集
- `pair_same_engine_bonus`
  - `selector` 仅保留为空对象占位
  - 条件集固定为 owner 当前所有引擎
  - `ops` 直接写入 owner 自身累计属性
- `pair_same_cunit_bonus`
  - `selector` = 作用集
  - 条件集固定为 owner 当前所有 c 装置
- `cunit_owner_stat_bonus`
  - `selector` 仅保留为空对象占位
  - `ops` 直接写入 owner 自身累计属性
- `cunit_slot_action_repeat_bonus`
  - `selector` = 作用集
  - 适合 c 装置对指定主炮/副炮/SE 追加发射次数
- `meta_present_bonus`
  - `selector` = 作用集
  - 条件集固定为 owner 当前所有已装备实例
- `custom_script_effect`
  - `selector` 语义由脚本自己决定

## 5. 通用 args 结构

数值类模板统一使用：

```json
{
  "ops": [
    [1, 1, 1]
  ]
}
```

每条 `ops[i]` 格式：

```json
[statId, opId, value]
```

### 5.1 args 每个字段的意义

- `ops`
  - 类型：`Array<[statId, opId, value]>`
  - 含义：真正执行的属性修改列表
  - 适用：所有共享模板
- `requiredCount`
  - 类型：`number`
  - 含义：条件成立所需的最小数量
  - 适用：
    - `equip_count_bonus`
    - `same_base_id_count_bonus`
    - `pair_same_engine_bonus`
    - `pair_same_cunit_bonus`
- `sameBaseId`
  - 类型：`boolean`
  - 含义：语义标记，表示这个模板是“相同基础 id”判定
  - 适用：
    - `same_base_id_count_bonus`
    - `pair_same_engine_bonus`
    - `pair_same_cunit_bonus`
- `requiredMetaKeys`
  - 类型：`string[]`
  - 含义：要求存在至少一个装备拥有这些 `meta` 键
  - 适用：
    - `meta_present_bonus`
- `value`
  - 类型：通常为 `number`
  - 含义：自定义脚本模块自己的参数
  - 适用：
    - `custom_script_effect`

## 6. 模板类型清单

### 6.1 `equip_stat_bonus`

用途：给匹配装备直接加静态属性。

默认：

- `module = "effect"`
- `isStatic = true`

模板：

```json
{
  "selector": {},
  "args": {
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

### 6.2 `runtime_stat_bonus`

用途：给本次行动的命中/暴击/暴伤/回避做临时修正。

默认：

- `module = "effect"`
- `isStatic = false`

模板：

```json
{
  "selector": {},
  "args": {
    "ops": [
      [2, 2, 0.5],
      [3, 2, 0.5],
      [4, 2, 2]
    ]
  }
}
```

### 6.3 `owner_stat_bonus`

用途：直接给 owner 自身累计属性加值。适合状态、防具、职业、本体这类不应绑定到某一把当前武器上的属性。

默认：

- `module = "effect"`
- `isStatic = true`

模板：

```json
{
  "selector": {},
  "args": {
    "ops": [
      [8, 1, 15]
    ]
  }
}
```

典型用途：

- 状态让角色命中 -20
- 状态让角色暴击率 -10
- 状态让角色暴伤 +50
- 防具词条让角色最终伤害 +15

### 6.4 `single_engine_bonus`

用途：当前 owner 恰好只装备一个引擎时，对 owner 应用 `ops`。适合单引擎奖励。

```json
{
  "selector": {},
  "args": {
    "ops": [
      [101, 1, 300]
    ]
  }
}
```

### 6.5 `equip_count_bonus`

用途：`selector` 匹配的装备数量达到 `requiredCount` 时，对同一 `selector` 应用 `ops`。

```json
{
  "selector": {},
  "args": {
    "requiredCount": 2,
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

### 6.6 `same_base_id_count_bonus`

用途：在 `selector` 匹配集合里，只要存在某个基础 `id` 的装备数量达到 `requiredCount`，就对 `selector` 应用 `ops`。

```json
{
  "selector": {},
  "args": {
    "requiredCount": 2,
    "sameBaseId": true,
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

### 6.7 `pair_same_engine_bonus`

用途：当前 owner 已装备的引擎里，只要存在两个相同基础 `id`，就对 owner 应用 `ops`。

```json
{
  "selector": {},
  "args": {
    "requiredCount": 2,
    "sameBaseId": true,
    "ops": [
      [101, 1, 500]
    ]
  }
}
```

### 6.8 `pair_same_cunit_bonus`

用途：当前 owner 已装备的 c 装置里，只要存在两个相同基础 `id`，就对 `selector` 应用 `ops`。

```json
{
  "selector": {},
  "args": {
    "requiredCount": 2,
    "sameBaseId": true,
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

### 6.9 `cunit_owner_stat_bonus`

用途：C 装置直接给 owner 累计属性加值。适合迎击率、暴击率、最终伤害等。

```json
{
  "selector": {},
  "args": {
    "ops": [
      [6, 1, 15],
      [3, 1, 5]
    ]
  }
}
```

### 6.10 `cunit_slot_action_repeat_bonus`

用途：C 装置给指定槽位武器额外追加发射次数。通常写 `statId = 7 actionRepeat`。

```json
{
  "selector": {
    "etypeIds": [10]
  },
  "args": {
    "ops": [
      [7, 1, 2]
    ]
  }
}
```

### 6.11 `meta_present_bonus`

用途：当前 owner 只要存在任意已装备实例满足 `requiredMetaKeys`，就对 `selector` 应用 `ops`。

```json
{
  "selector": {},
  "args": {
    "requiredMetaKeys": ["supportCore"],
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

### 6.12 `custom_script_effect`

用途：模板表达不了时，由自定义脚本模块解释 `args`。

```json
{
  "selector": {},
  "args": {}
}
```

## 7. effectType 默认值总表

| effectType | 默认 module | 默认 isStatic | 说明 |
|-----------|-------------|---------------|------|
| `equip_stat_bonus` | `effect` | `true` | 静态装备属性修正 |
| `owner_stat_bonus` | `effect` | `true` | 角色自身累计属性修正 |
| `runtime_stat_bonus` | `effect` | `false` | 本次行动临时修正 |
| `single_engine_bonus` | `effect` | `true` | 单引擎奖励 |
| `equip_count_bonus` | `effect` | `true` | 选择集数量达标 |
| `same_base_id_count_bonus` | `effect` | `true` | 选择集内同基础 id 达标 |
| `pair_same_engine_bonus` | `effect` | `true` | 双同型引擎奖励 |
| `pair_same_cunit_bonus` | `effect` | `true` | 双同型 c 装奖励 |
| `cunit_owner_stat_bonus` | `effect` | `true` | C 装置 owner 属性奖励 |
| `cunit_slot_action_repeat_bonus` | `effect` | `true` | C 装置槽位追加发射 |
| `meta_present_bonus` | `effect` | `true` | 存在指定 meta 键装备 |
| `custom_script_effect` | 用户自选 | 用户自选 | 自定义脚本 |

## 8. 当前实现状态

当前运行时已接入：

- `equip_stat_bonus`
- `owner_stat_bonus`
- `runtime_stat_bonus`
- `single_engine_bonus`
- `equip_count_bonus`
- `same_base_id_count_bonus`
- `pair_same_engine_bonus`
- `pair_same_cunit_bonus`
- `cunit_owner_stat_bonus`
- `cunit_slot_action_repeat_bonus`
- `meta_present_bonus`

补充说明：

- 这些模板的“条件判定”已经接入运行时
- `101/102` 现在已正式进入 owner 载重结算
- 当前仍建议把 `101/102` 限制在 owner 类模板中使用，不要当作普通装备实例属性模板开放

## 9. 编辑器落地建议

编辑器内部建议维护一份 `effectTypeRegistry`：

```json
{
  "effectType": "equip_stat_bonus",
  "module": "effect",
  "isStatic": true,
  "selectorTemplate": {},
  "argsTemplate": {
    "ops": [
      [1, 1, 1]
    ]
  }
}
```

创建效果时：

1. 根据 `effectType` 取模板
2. 深拷贝 `selectorTemplate`
3. 深拷贝 `argsTemplate`
4. 写入 `module`
5. 写入 `isStatic`

以后新增一种效果，只需要：

1. 新增一个 `effectType`
2. 新增它的模板定义
3. 在共享模块 `effect` 中补对应分支
