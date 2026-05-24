# MyGame 运行时补丁说明: equipment-upgrade-costs

目标文件位于 `D:/RMProjects/MyGame/js/plugins/`。当前沙箱不能写入该目录，因此这里给出编辑器字段落地后的运行时对接补丁说明。

## 数据契约

- 武器、防具统一读取顶层字段 `upgradeCosts`。
- `upgradeCosts[index]` 对应目标强化等级 `index + 1`。
- 单级结构固定为：

```js
{
  successRate: 100,
  goldCost: 0,
  requiredItemId: 0,
  requiredItemAmount: 0,
  protectItemId: 0,
  protectItemAmount: 0
}
```

- `goldCost` 和 `requiredItem*` 是必需消耗，强化失败也扣除。
- `successRate` 是当前目标强化等级的基础成功率百分比，范围 `0-100`。
- `protectItem*` 是保底消耗，只在玩家选择保底强化且物品数量足够时扣除，并把成功率提升到 100%。
- 缺少当前目标等级的 `upgradeCosts[nextLevel - 1]` 时，运行时应视为不可强化，而不是回退插件参数。

## Zaun_ItemCore.js

在 `Item` 初始化成员中加入：

```js
this.upgradeCosts = Array.empty;
```

建议放在现有：

```js
this.upgradeParams = Array.empty;
```

后面。

在 `copyEquipIdentity(equip, copyParams = true)` 中加入：

```js
this.upgradeCosts = equip.upgradeCosts ?? Array.empty;
```

建议放在现有：

```js
this.upgradeParams = equip.upgradeParams ?? Array.empty;
```

后面。

## Zaun_ItemUpgrade.js

插件参数中的 `protectItemList`、`upgradeGoldList`、`humanProtectItemList`、`humanUpgradeGoldList` 需要停止参与运行时强化消耗。保留参数声明不会影响运行，但 `ItemUpgradeAdaptor` 不应再读取它们。

### 1. 构造函数

将构造函数改为不接收金币和保底参数：

```js
constructor() {
  this._equipSourceMap = new Map();
  this._equipCollectedMap = new Map();
  // 保留后续 request 初始化
}
```

`UpgradeManager` 初始化改为：

```js
const UpgradeManager = new ItemUpgradeAdaptor();
```

### 2. 单级配置读取

替换原 `getGoldList`、`getProtectItemIds`、`getGoldCost`、`getProtectItemId`：

```js
getUpgradeCostEntry(item, nextLevel) {
  if (!item || nextLevel <= 0) return null;
  const list = Array.isArray(item.upgradeCosts) ? item.upgradeCosts : Array.empty;
  const entry = list[nextLevel - 1];
  if (!entry) return null;
  return entry;
}

getGoldCost(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  return entry ? Math.max(0, entry.goldCost || 0) : 0;
}

getConfiguredSuccessRate(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  if (!entry) return 0;
  const value = Number(entry.successRate);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value)) / 100;
}

getRequiredItem(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  const id = entry ? Math.max(0, entry.requiredItemId || 0) : 0;
  return id > 0 ? $dataItems[id] : null;
}

getRequiredItemAmount(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  if (!entry || !entry.requiredItemId) return 0;
  return Math.max(1, entry.requiredItemAmount || 0);
}

getProtectItem(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  const id = entry ? Math.max(0, entry.protectItemId || 0) : 0;
  return id > 0 ? $dataItems[id] : null;
}

getProtectItemAmount(item, nextLevel) {
  const entry = this.getUpgradeCostEntry(item, nextLevel);
  if (!entry || !entry.protectItemId) return 0;
  return Math.max(1, entry.protectItemAmount || 0);
}
```

### 3. 保底列表

`collectProtectItems(outData, equipItem)` 改为只收集当前目标等级配置的保底物品：

```js
const nextLevel = this.getCurrentTimes(equipItem) + 1;
const item = this.getProtectItem(equipItem, nextLevel);
const amount = this.getProtectItemAmount(equipItem, nextLevel);
if (item && item.itypeId === 1 && $gameParty.numItems(item) >= amount) {
  data[0] = item;
  data[1] = null;
} else {
  data[0] = null;
}
```

### 4. buildRequest

在 `buildRequest` 中取得当前级配置：

```js
const costEntry = this.getUpgradeCostEntry(item, nextLevel);
const hasCostEntry = !!costEntry;
const goldCost = this.getGoldCost(item, nextLevel);
const requiredItem = this.getRequiredItem(item, nextLevel);
const requiredItemAmount = this.getRequiredItemAmount(item, nextLevel);
const canAffordRequiredItem = !requiredItem || $gameParty.numItems(requiredItem) >= requiredItemAmount;
const requiredProtectItem = this.getProtectItem(item, nextLevel);
const requiredProtectItemAmount = this.getProtectItemAmount(item, nextLevel);
const selected = selectedProtectItem || null;
const useProtect = !!requiredProtectItem && !!selected && selected.id === requiredProtectItem.id;
const hasProtect = useProtect && $gameParty.numItems(selected) >= requiredProtectItemAmount;
const guaranteed = useProtect && hasProtect;
const successRate = guaranteed ? 1 : this.getConfiguredSuccessRate(item, nextLevel);
```

同时让：

```js
const canUpgrade = currentTimes < timesRule.max;
```

变为：

```js
const canUpgrade = currentTimes < timesRule.max && hasCostEntry;
```

并把以下字段写进 `request`：

```js
request.requiredItem = requiredItem;
request.requiredItemAmount = requiredItemAmount;
request.canAffordRequiredItem = canAffordRequiredItem;
request.requiredProtectItem = requiredProtectItem;
request.requiredProtectItemAmount = requiredProtectItemAmount;
request.successRate = successRate;
```

### 5. execute

在金币检查后增加必需物品检查：

```js
if (!request.canAffordRequiredItem) {
  return this.setExecuteResult(false, "强化所需物品不足");
}
```

执行扣除顺序改为：

```js
if (request.goldCost > 0) $gameParty.loseGold(request.goldCost);
if (request.requiredItem && request.requiredItemAmount > 0) {
  $gameParty.loseItem(request.requiredItem, request.requiredItemAmount);
}
if (request.guaranteed) {
  $gameParty.loseItem(request.selectedProtectItem, request.requiredProtectItemAmount);
}
```

之后再执行成功率判定。这样金币和必需耗材在失败时也会消耗。

### 6. UI 展示

所有原本展示 `request.requiredProtectItem` 和 `request.goldCost` 的窗口，需要同时展示：

- `request.requiredItem` / `request.requiredItemAmount`
- `request.requiredProtectItem` / `request.requiredProtectItemAmount`
- `request.canAffordRequiredItem`
- `request.successRate`，非保底时显示为 `Math.round(request.successRate * 100)` 或按窗口格式保留小数

确认窗口文案建议明确区分“必需耗材”和“保底耗材”，避免玩家误以为保底物品是普通强化必需条件。
