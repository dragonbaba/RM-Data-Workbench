import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, InputNumber, Select, Space, Switch, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { EventSystem } from '../../core/EventSystem';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { normalizeEnemyBookChallenge } from '../../services/EnemyPropertyService';
import type {
  EnemyBookChallengeExtraReward,
  EnemyBookChallengeRewardType,
  EnemyBookChallengeStar,
  EnemyDropEntry,
  RPGEnemy,
} from '../../types';

type DataOption = {
  value: number;
  label: string;
};

type DataRecord = {
  id?: unknown;
  name?: unknown;
};

const ENEMIES_FILE_NAME = 'Enemies.json';
const ITEMS_FILE_NAME = 'Items.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const ARMORS_FILE_NAME = 'Armors.json';

const DROP_TYPE_OPTIONS: Array<{ value: 0 | 1 | 2; label: string }> = [
  { value: 0, label: '物品' },
  { value: 1, label: '武器' },
  { value: 2, label: '防具' },
];

const CHALLENGE_REWARD_TYPE_OPTIONS: Array<{ value: EnemyBookChallengeRewardType; label: string }> = [
  { value: 'gold', label: '金币' },
  { value: 'item', label: '物品' },
  { value: 'weapon', label: '武器' },
  { value: 'armor', label: '防具' },
];

const getDisplayName = (item: DataRecord | null, fallback: string) => {
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  return name || fallback;
};

const toIntOrZero = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const toDropChance = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const toChallengeMultiplier = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return numeric;
};

const toBooleanFlag = (value: unknown): boolean => value === true;

const normalizeDropType = (value: unknown): 0 | 1 | 2 => {
  const numeric = toIntOrZero(value);
  if (numeric === 1 || numeric === 2) {
    return numeric;
  }
  return 0;
};

const createDefaultDropEntry = (): EnemyDropEntry => ({
  dropType: 0,
  dropId: 0,
  dropChance: 0,
  isRare: false,
});

const createDefaultChallengeReward = (): EnemyBookChallengeExtraReward => ({
  rewardType: 'item',
  dataId: 0,
  amount: 1,
});

const normalizeDropEntry = (entry: unknown): EnemyDropEntry => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return createDefaultDropEntry();
  }

  const source = entry as Record<string, unknown>;
  return {
    dropType: normalizeDropType(source.dropType),
    dropId: toIntOrZero(source.dropId),
    dropChance: toDropChance(source.dropChance),
    isRare: toBooleanFlag(source.isRare),
  };
};

const buildDataOptions = (data: unknown[] | null, emptyLabel: string): DataOption[] => {
  const options: DataOption[] = [{ value: 0, label: `0 : ${emptyLabel}` }];
  if (!Array.isArray(data) || data.length < 2) {
    return options;
  }

  for (let index = 1; index < data.length; index++) {
    const item = data[index] as DataRecord | null;
    if (!item || typeof item !== 'object') {
      continue;
    }

    const id = toIntOrZero(item.id ?? index);
    const label = getDisplayName(item, `未命名 ${id}`);
    options.push({
      value: id,
      label: `${id} : ${label}`,
    });
  }

  return options;
};

const hasDataOption = (options: DataOption[], value: number) => {
  return options.some((option) => option.value === value);
};

const normalizeChallengeRewardType = (value: unknown): EnemyBookChallengeRewardType => {
  switch (value) {
    case 'gold':
    case 'item':
    case 'weapon':
    case 'armor':
      return value;
    default:
      return 'item';
  }
};

const cloneChallengeReward = (reward: EnemyBookChallengeExtraReward): EnemyBookChallengeExtraReward => ({
  rewardType: reward.rewardType,
  dataId: reward.dataId,
  amount: reward.amount,
});

const cloneChallengeStar = (star: EnemyBookChallengeStar): EnemyBookChallengeStar => ({
  ...star,
  passiveStates: star.passiveStates.slice(),
  extraRewards: star.extraRewards.map((reward) => cloneChallengeReward(reward)),
});

export function DropPanel() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentFile = useEditorStore((state) => state.currentFile);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const getDirtyItemIndexes = useEditorStore((state) => state.getDirtyItemIndexes);
  const [referenceRevision, setReferenceRevision] = useState(0);

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || [ENEMIES_FILE_NAME, ITEMS_FILE_NAME, WEAPONS_FILE_NAME, ARMORS_FILE_NAME].map((name) => name.toLowerCase()).includes(fileName)) {
        setReferenceRevision((value) => value + 1);
      }
    };

    EventSystem.on('data:file-loaded', refreshReferences);
    EventSystem.on('data:manifest-loaded', refreshReferences);

    return () => {
      EventSystem.off('data:file-loaded', refreshReferences);
      EventSystem.off('data:manifest-loaded', refreshReferences);
    };
  }, []);

  const itemsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ITEMS_FILE_NAME),
    [referenceRevision],
  );
  const weaponsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(WEAPONS_FILE_NAME),
    [referenceRevision],
  );
  const armorsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(ARMORS_FILE_NAME),
    [referenceRevision],
  );

  const enemy = useMemo(() => {
    if (!currentItem || typeof currentItem !== 'object' || Array.isArray(currentItem)) {
      return null;
    }
    return currentItem as RPGEnemy;
  }, [currentItem]);

  const isEnemyFile = currentFile.toLowerCase() === ENEMIES_FILE_NAME.toLowerCase();

  const updateEnemy = useCallback((buildNextEnemy: (source: RPGEnemy) => RPGEnemy) => {
    if (!Array.isArray(currentData) || !currentFilePath || currentItemIndex < 0 || !enemy) {
      return;
    }

    const nextData = [...currentData];
    nextData[currentItemIndex] = buildNextEnemy(enemy) as unknown as typeof nextData[number];
    loadData(nextData as any[], currentFilePath, currentFileType);
    markFileDirty(currentFilePath);
    markItemDirty(currentFilePath, currentItemIndex);
  }, [currentData, currentFilePath, currentFileType, currentItemIndex, enemy, loadData, markFileDirty, markItemDirty]);

  useEffect(() => {
    if (!isEnemyFile || !enemy || currentItemIndex <= 0) {
      return;
    }

    if (Array.isArray(enemy.enemyDrops)) {
      return;
    }

    updateEnemy((source) => ({
      ...source,
      enemyDrops: [],
    }));
  }, [enemy, isEnemyFile, currentItemIndex, updateEnemy]);

  const enemyDrops = useMemo(() => {
    if (!Array.isArray(enemy?.enemyDrops)) {
      return [];
    }
    return enemy.enemyDrops.map((entry) => normalizeDropEntry(entry));
  }, [enemy]);

  const itemOptions = useMemo(
    () => buildDataOptions(itemsData, '未选择物品'),
    [itemsData],
  );
  const weaponOptions = useMemo(
    () => buildDataOptions(weaponsData, '未选择武器'),
    [weaponsData],
  );
  const armorOptions = useMemo(
    () => buildDataOptions(armorsData, '未选择防具'),
    [armorsData],
  );

  const challengeStars = useMemo(() => {
    return normalizeEnemyBookChallenge(enemy?.bookChallenge).stars;
  }, [enemy?.bookChallenge]);

  const buildReferenceOptions = useCallback((dropType: 0 | 1 | 2, currentDropId: number): DataOption[] => {
    const baseOptions = dropType === 0
      ? itemOptions
      : dropType === 1
        ? weaponOptions
        : armorOptions;

    if (currentDropId > 0 && !hasDataOption(baseOptions, currentDropId)) {
      return [
        { value: currentDropId, label: `${currentDropId} : 已失效引用` },
        ...baseOptions,
      ];
    }

    return baseOptions;
  }, [armorOptions, itemOptions, weaponOptions]);

  const buildChallengeRewardReferenceOptions = useCallback((
    rewardType: EnemyBookChallengeRewardType,
    currentDataId: number,
  ): DataOption[] => {
    const baseOptions = rewardType === 'weapon'
      ? weaponOptions
      : rewardType === 'armor'
        ? armorOptions
        : rewardType === 'gold'
          ? [{ value: 0, label: '0 : 金币奖励不需要数据 id' }]
          : itemOptions;

    if (currentDataId > 0 && !hasDataOption(baseOptions, currentDataId)) {
      return [
        { value: currentDataId, label: `${currentDataId} : 已失效引用` },
        ...baseOptions,
      ];
    }

    return baseOptions;
  }, [armorOptions, itemOptions, weaponOptions]);

  const updateDropAt = useCallback((dropIndex: number, updates: Partial<EnemyDropEntry>) => {
    const currentDrop = enemyDrops[dropIndex];
    if (!currentDrop) {
      return;
    }

    const nextDrop: EnemyDropEntry = {
      ...currentDrop,
      ...updates,
    };

    if (updates.dropType !== undefined) {
      nextDrop.dropType = normalizeDropType(updates.dropType);
      const nextOptions = buildReferenceOptions(nextDrop.dropType, 0);
      if (!hasDataOption(nextOptions, nextDrop.dropId)) {
        nextDrop.dropId = 0;
      }
    }

    if (updates.dropId !== undefined) {
      nextDrop.dropId = toIntOrZero(updates.dropId);
    }

    if (updates.dropChance !== undefined) {
      nextDrop.dropChance = toDropChance(updates.dropChance);
    }

    if (updates.isRare !== undefined) {
      nextDrop.isRare = toBooleanFlag(updates.isRare);
    }

    updateEnemy((source) => {
      const nextDrops = Array.isArray(source.enemyDrops)
        ? source.enemyDrops.map((entry) => normalizeDropEntry(entry))
        : [];
      nextDrops[dropIndex] = nextDrop;
      return {
        ...source,
        enemyDrops: nextDrops,
      };
    });
  }, [buildReferenceOptions, enemyDrops, updateEnemy]);

  const addDrop = useCallback(() => {
    updateEnemy((source) => {
      const nextDrops = Array.isArray(source.enemyDrops)
        ? source.enemyDrops.map((entry) => normalizeDropEntry(entry))
        : [];
      nextDrops.push(createDefaultDropEntry());
      return {
        ...source,
        enemyDrops: nextDrops,
      };
    });
  }, [updateEnemy]);

  const removeDrop = useCallback((dropIndex: number) => {
    updateEnemy((source) => {
      const nextDrops = Array.isArray(source.enemyDrops)
        ? source.enemyDrops.map((entry) => normalizeDropEntry(entry))
        : [];
      nextDrops.splice(dropIndex, 1);
      return {
        ...source,
        enemyDrops: nextDrops,
      };
    });
  }, [updateEnemy]);

  const updateChallengeStarAt = useCallback((
    starIndex: number,
    buildNextStar: (star: EnemyBookChallengeStar) => EnemyBookChallengeStar,
  ) => {
    updateEnemy((source) => {
      const bookChallenge = normalizeEnemyBookChallenge(source.bookChallenge);
      const currentStar = bookChallenge.stars[starIndex];
      if (!currentStar) {
        return source;
      }

      const stars = bookChallenge.stars.map((star) => cloneChallengeStar(star));
      stars[starIndex] = buildNextStar(stars[starIndex]);
      return {
        ...source,
        bookChallenge: {
          ...bookChallenge,
          stars,
        },
      };
    });
  }, [updateEnemy]);

  const updateChallengeStarDrop = useCallback((starIndex: number, updates: Partial<EnemyBookChallengeStar>) => {
    updateChallengeStarAt(starIndex, (star) => ({
      ...star,
      dropRateMultiplier: updates.dropRateMultiplier !== undefined
        ? toChallengeMultiplier(updates.dropRateMultiplier)
        : star.dropRateMultiplier,
      goldMultiplier: updates.goldMultiplier !== undefined
        ? toChallengeMultiplier(updates.goldMultiplier)
        : star.goldMultiplier,
      expMultiplier: updates.expMultiplier !== undefined
        ? toChallengeMultiplier(updates.expMultiplier)
        : star.expMultiplier,
    }));
  }, [updateChallengeStarAt]);

  const addChallengeReward = useCallback((starIndex: number) => {
    updateChallengeStarAt(starIndex, (star) => ({
      ...star,
      extraRewards: [
        ...star.extraRewards.map((reward) => cloneChallengeReward(reward)),
        createDefaultChallengeReward(),
      ],
    }));
  }, [updateChallengeStarAt]);

  const updateChallengeRewardAt = useCallback((
    starIndex: number,
    rewardIndex: number,
    updates: Partial<EnemyBookChallengeExtraReward>,
  ) => {
    updateChallengeStarAt(starIndex, (star) => {
      const currentReward = star.extraRewards[rewardIndex];
      if (!currentReward) {
        return star;
      }

      const nextReward = {
        ...cloneChallengeReward(currentReward),
        ...updates,
      };

      if (updates.rewardType !== undefined) {
        nextReward.rewardType = normalizeChallengeRewardType(updates.rewardType);
        const nextOptions = buildChallengeRewardReferenceOptions(nextReward.rewardType, 0);
        if (nextReward.rewardType === 'gold' || !hasDataOption(nextOptions, nextReward.dataId)) {
          nextReward.dataId = 0;
        }
      }

      if (updates.dataId !== undefined) {
        nextReward.dataId = nextReward.rewardType === 'gold' ? 0 : Math.max(0, toIntOrZero(updates.dataId));
      }

      if (updates.amount !== undefined) {
        nextReward.amount = Math.max(1, toIntOrZero(updates.amount) || 1);
      }

      const extraRewards = star.extraRewards.map((reward) => cloneChallengeReward(reward));
      extraRewards[rewardIndex] = nextReward;
      return {
        ...star,
        extraRewards,
      };
    });
  }, [buildChallengeRewardReferenceOptions, updateChallengeStarAt]);

  const removeChallengeReward = useCallback((starIndex: number, rewardIndex: number) => {
    updateChallengeStarAt(starIndex, (star) => {
      const extraRewards = star.extraRewards.map((reward) => cloneChallengeReward(reward));
      extraRewards.splice(rewardIndex, 1);
      return {
        ...star,
        extraRewards,
      };
    });
  }, [updateChallengeStarAt]);

  const hasCurrentEnemyChanges = useMemo(() => {
    if (!currentFilePath || currentItemIndex <= 0) {
      return false;
    }
    return getDirtyItemIndexes(currentFilePath).includes(currentItemIndex);
  }, [currentFilePath, currentItemIndex, getDirtyItemIndexes]);

  if (!Array.isArray(currentData) || !isEnemyFile || !enemy) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0e17]">
        <Empty description="掉落模式仅在敌人数据上可用" />
      </div>
    );
  }

  const enemyName = getDisplayName(enemy, `敌人 ${currentItemIndex}`);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0e17]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>掉落模式</h2>
          <div className="text-xs text-gray-400 mt-1">
            当前敌人:
            <Tag color="red" className="ml-2">{enemyName}</Tag>
            <Tag color="blue">掉落 {enemyDrops.length}</Tag>
            {hasCurrentEnemyChanges && <Tag color="gold">当前敌人已修改</Tag>}
          </div>
        </div>

        <Button type="dashed" icon={<PlusOutlined />} onClick={addDrop}>
          添加掉落
        </Button>
      </div>

      <Card title="当前敌人掉落列表">
        {enemyDrops.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            当前敌人还没有掉落项，点击上方“添加掉落”开始配置。
          </div>
        ) : (
          <Space direction="vertical" className="w-full">
            {enemyDrops.map((drop, index) => (
              <Card
                key={`enemy-drop-${index}`}
                size="small"
                title={`掉落 ${index + 1}`}
                extra={(
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeDrop(index)}
                  />
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(96px,0.85fr),minmax(112px,1fr),minmax(108px,0.95fr),minmax(220px,3.6fr)] gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">掉落类型</label>
                    <Select
                      value={drop.dropType}
                      options={DROP_TYPE_OPTIONS}
                      className="w-full"
                      onChange={(value) => updateDropAt(index, { dropType: Number(value || 0) as 0 | 1 | 2 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">掉落概率</label>
                    <InputNumber
                      value={drop.dropChance}
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full"
                      onChange={(value) => updateDropAt(index, { dropChance: value ?? 0 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">是否稀有</label>
                    <div className="flex items-center h-8">
                      <Switch
                        checked={drop.isRare === true}
                        checkedChildren="是"
                        unCheckedChildren="否"
                        onChange={(checked) => updateDropAt(index, { isRare: checked })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">掉落目标</label>
                    <Select
                      value={drop.dropId}
                      options={buildReferenceOptions(drop.dropType, drop.dropId)}
                      className="w-full"
                      showSearch
                      optionFilterProp="label"
                      onChange={(value) => updateDropAt(index, { dropId: Number(value || 0) })}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      <Card title="图鉴挑战掉落" className="mt-4">
        <div className="text-xs text-gray-500 mb-4">
          这里维护 `enemy.bookChallenge.stars[]` 中的掉落倍率、金币/经验倍率和额外奖励。挑战敌群、星级、挑战消耗和被动状态仍在属性模式维护。
        </div>
        {challengeStars.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            当前敌人没有图鉴挑战星级。请先在属性模式添加挑战星级，再回到掉落模式配置奖励。
          </div>
        ) : (
          <Space direction="vertical" className="w-full">
            {challengeStars.map((star, starIndex) => (
              <Card
                key={`book-challenge-drop-${starIndex}`}
                size="small"
                title={`挑战星级 ${star.star}`}
                extra={<Tag color={enemy.isBoss === true ? 'purple' : 'default'}>{enemy.isBoss === true ? 'Boss' : '非 Boss'}</Tag>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">掉率倍率</label>
                    <InputNumber
                      value={star.dropRateMultiplier}
                      min={0}
                      step={0.1}
                      className="w-full"
                      onChange={(value) => updateChallengeStarDrop(starIndex, { dropRateMultiplier: value ?? 1 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">金币倍率</label>
                    <InputNumber
                      value={star.goldMultiplier}
                      min={0}
                      step={0.1}
                      className="w-full"
                      onChange={(value) => updateChallengeStarDrop(starIndex, { goldMultiplier: value ?? 1 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">经验倍率</label>
                    <InputNumber
                      value={star.expMultiplier}
                      min={0}
                      step={0.1}
                      className="w-full"
                      onChange={(value) => updateChallengeStarDrop(starIndex, { expMultiplier: value ?? 1 })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">额外奖励</div>
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => addChallengeReward(starIndex)}
                    >
                      添加额外奖励
                    </Button>
                  </div>

                  {star.extraRewards.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-600 px-4 py-4 text-sm text-gray-500 text-center">
                      当前星级没有额外奖励。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {star.extraRewards.map((reward, rewardIndex) => (
                        <div
                          key={`book-challenge-drop-${starIndex}-reward-${rewardIndex}`}
                          className="grid grid-cols-1 sm:grid-cols-[minmax(110px,0.9fr),minmax(220px,2fr),minmax(96px,0.8fr),40px] gap-3 items-end"
                        >
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">奖励类型 #{rewardIndex + 1}</label>
                            <Select
                              value={reward.rewardType}
                              options={CHALLENGE_REWARD_TYPE_OPTIONS}
                              className="w-full"
                              onChange={(value) => updateChallengeRewardAt(starIndex, rewardIndex, { rewardType: value })}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">奖励对象</label>
                            <Select
                              value={reward.dataId}
                              options={buildChallengeRewardReferenceOptions(reward.rewardType, reward.dataId)}
                              className="w-full"
                              disabled={reward.rewardType === 'gold'}
                              showSearch
                              optionFilterProp="label"
                              onChange={(value) => updateChallengeRewardAt(starIndex, rewardIndex, { dataId: Number(value || 0) })}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">数量</label>
                            <InputNumber
                              value={reward.amount}
                              min={1}
                              step={1}
                              className="w-full"
                              onChange={(value) => updateChallengeRewardAt(starIndex, rewardIndex, { amount: value ?? 1 })}
                            />
                          </div>

                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeChallengeReward(starIndex, rewardIndex)}
                            title="删除奖励"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}

export default DropPanel;
