import { Badge, Button, Card, Dropdown, Empty, Input, InputNumber, Select, Space, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ToastManager } from '../common/ToastManager';
import type {
  EffectOpRow,
  GameEffectSelectorFieldKey,
  GameEffectTypeDefinition,
} from '../../services/GameEffectService';
import type { GameEffectEntry, GameEffectType, RPGItem } from '../../types';
import {
  createDefaultOpRow,
  createGameEffectConfig,
  createGameEffectTemplate,
  ensureItemGameEffects,
  getGameEffectTypeDefinitions,
  getOpOptions,
  getStatOptions,
  normalizeGameEffectEntry,
  parseOpsToRows,
  serializeRowsToOps,
  validateEffectOpRows,
  validateGameEffectEntry,
} from '../../services/GameEffectService';

const splitTokens = (value: string): string[] =>
  value
    .split(/[\n,，]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const parseNumberListText = (value: string): number[] =>
  splitTokens(value)
    .map((token) => Number(token))
    .filter((token) => Number.isFinite(token));

const stringifyNumberList = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : '';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getNumberArg = (effect: GameEffectEntry, key: string): number | null => {
  const value = asRecord(effect.config.args)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const getOpRowsFromEffect = (effect: GameEffectEntry): EffectOpRow[] =>
  parseOpsToRows(asRecord(effect.config.args)?.ops || []);

const SELECTOR_FIELD_DEFINITIONS: Array<{
  key: GameEffectSelectorFieldKey;
  label: string;
  placeholder: string;
  parse: (value: string) => unknown;
  stringify: (value: unknown) => string;
}> = [
  {
    key: 'slotIndexes',
    label: '槽位索引',
    placeholder: '例如: 0, 1',
    parse: parseNumberListText,
    stringify: stringifyNumberList,
  },
  {
    key: 'etypeIds',
    label: '装备槽位类型',
    placeholder: '例如: 10, 11',
    parse: parseNumberListText,
    stringify: stringifyNumberList,
  },
  {
    key: 'wtypeIds',
    label: '武器类型',
    placeholder: '例如: 1, 2, 3',
    parse: parseNumberListText,
    stringify: stringifyNumberList,
  },
  {
    key: 'atypeIds',
    label: '防具类型',
    placeholder: '例如: 1, 2, 10',
    parse: parseNumberListText,
    stringify: stringifyNumberList,
  },
];

export function EffectPanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentData = useEditorStore((state) => state.currentData);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);

  const [effects, setEffects] = useState<GameEffectEntry[]>([]);
  const [originalEffects, setOriginalEffects] = useState<GameEffectEntry[]>([]);
  const [opsRowsList, setOpsRowsList] = useState<EffectOpRow[][]>([]);
  const [originalOpsRowsList, setOriginalOpsRowsList] = useState<EffectOpRow[][]>([]);

  const currentRpgItem = currentItem as RPGItem | null;

  useEffect(() => {
    if (!Array.isArray(currentData) || currentItemIndex < 0 || !currentItem) {
      return;
    }

    const item = currentItem as RPGItem;
    const ensured = ensureItemGameEffects(item);
    if (!ensured.changed) {
      return;
    }

    const nextData = [...currentData];
    nextData[currentItemIndex] = ensured.item;
    loadData(nextData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
  }, [currentData, currentFilePath, currentFileType, currentItem, currentItemIndex, loadData, markFileDirty, markItemDirty]);

  useEffect(() => {
    if (!currentItem) {
      setEffects([]);
      setOriginalEffects([]);
      setOpsRowsList([]);
      setOriginalOpsRowsList([]);
      return;
    }

    const item = currentItem as RPGItem;
    const nextEffects = Array.isArray(item.gameEffects)
      ? item.gameEffects
        .map((entry) => normalizeGameEffectEntry(entry, item))
        .filter((entry): entry is GameEffectEntry => entry !== null)
      : [];
    const nextOpsRowsList = nextEffects.map((effect) => getOpRowsFromEffect(effect));

    setEffects(nextEffects);
    setOriginalEffects(nextEffects);
    setOpsRowsList(nextOpsRowsList);
    setOriginalOpsRowsList(nextOpsRowsList);
  }, [currentItem]);

  const hasChanges = useMemo(
    () => JSON.stringify(effects) !== JSON.stringify(originalEffects)
      || JSON.stringify(opsRowsList) !== JSON.stringify(originalOpsRowsList),
    [
      effects,
      opsRowsList,
      originalEffects,
      originalOpsRowsList,
    ],
  );

  const effectTypeDefinitions = useMemo(
    () => getGameEffectTypeDefinitions(),
    [],
  );

  const effectTypeDefinitionMap = useMemo(
    () => new Map(effectTypeDefinitions.map((definition) => [definition.effectType, definition])),
    [effectTypeDefinitions],
  );

  const effectTypeOptions = useMemo(
    () => effectTypeDefinitions.map((definition) => ({
      value: definition.effectType,
      label: `${definition.effectType} | ${definition.label}`,
    })),
    [effectTypeDefinitions],
  );

  const addEffectMenuItems = useMemo(
    () => effectTypeDefinitions.map((definition) => ({
      key: definition.effectType,
      label: `${definition.effectType} | ${definition.label}`,
    })),
    [effectTypeDefinitions],
  );

  const opOptions = useMemo(
    () => getOpOptions(),
    [],
  );

  const getDefinition = useCallback((effectType: GameEffectType): GameEffectTypeDefinition =>
    effectTypeDefinitionMap.get(effectType) || effectTypeDefinitions[0], [effectTypeDefinitionMap, effectTypeDefinitions]);

  const updateEffect = useCallback((index: number, updater: (effect: GameEffectEntry) => GameEffectEntry) => {
    setEffects((current) => current.map((effect, effectIndex) => (
      effectIndex === index ? updater(effect) : effect
    )));
  }, []);

  const updateOpsRows = useCallback((index: number, updater: (rows: EffectOpRow[]) => EffectOpRow[]) => {
    setOpsRowsList((current) => current.map((rows, rowsIndex) => (
      rowsIndex === index ? updater(rows) : rows
    )));
  }, []);

  const replaceEffectWithTemplate = useCallback((index: number, effectType: GameEffectType) => {
    const nextEffect = createGameEffectTemplate(effectType, currentRpgItem);
    setEffects((current) => current.map((effect, effectIndex) => (
      effectIndex === index ? nextEffect : effect
    )));
    setOpsRowsList((current) => current.map((rows, rowsIndex) => (
      rowsIndex === index ? getOpRowsFromEffect(nextEffect) : rows
    )));
  }, [currentRpgItem]);

  const addEffect = useCallback((effectType: GameEffectType) => {
    const nextEffect = createGameEffectTemplate(effectType, currentRpgItem);
    setEffects((current) => [...current, nextEffect]);
    setOpsRowsList((current) => [...current, getOpRowsFromEffect(nextEffect)]);
  }, [currentRpgItem]);

  const removeEffect = useCallback((index: number) => {
    setEffects((current) => current.filter((_, effectIndex) => effectIndex !== index));
    setOpsRowsList((current) => current.filter((_, effectIndex) => effectIndex !== index));
  }, []);

  const addOpRow = useCallback((index: number, effectType: GameEffectType) => {
    updateOpsRows(index, (rows) => [...rows, createDefaultOpRow(effectType)]);
  }, [updateOpsRows]);

  const removeOpRow = useCallback((effectIndex: number, rowIndex: number) => {
    updateOpsRows(effectIndex, (rows) => rows.filter((_, index) => index !== rowIndex));
  }, [updateOpsRows]);

  const handleSave = useCallback(() => {
    if (!Array.isArray(currentData) || currentItemIndex < 0 || !currentItem) {
      return;
    }

    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) {
      return;
    }

    const nextEffects: GameEffectEntry[] = [];
    for (let index = 0; index < effects.length; index++) {
      const effect = effects[index];
      const definition = getDefinition(effect.effectType);
      const opRows = opsRowsList[index] || [];
      const opValidation = validateEffectOpRows(effect.effectType, opRows);
      if (!opValidation.valid) {
        ToastManager.error(`效果 ${index + 1} 保存失败: ${opValidation.message}`);
        return;
      }

      const rawArgs = asRecord(effect.config.args) || {};
      const argsPayload: Record<string, unknown> = {
        ops: serializeRowsToOps(opRows),
      };
      if (definition.argsFields.includes('requiredCount')) {
        argsPayload.requiredCount = rawArgs.requiredCount;
      }
      const config = createGameEffectConfig(effect.effectType, {
        selector: effect.config.selector,
        args: argsPayload,
      });

      const validation = validateGameEffectEntry({
        ...effect,
        config,
      });
      if (!validation.valid) {
        ToastManager.error(`效果 ${index + 1} 保存失败: ${validation.message}`);
        return;
      }

      const normalizedEntry = normalizeGameEffectEntry({
        ...effect,
        config,
      }, currentRpgItem);
      if (!normalizedEntry) {
        ToastManager.error(`效果 ${index + 1} 保存失败: effectType 无效`);
        return;
      }
      nextEffects.push(normalizedEntry);
    }

    const nextOpsRowsList = nextEffects.map((effect) => getOpRowsFromEffect(effect));
    const nextData = [...currentData];
    nextData[currentItemIndex] = {
      ...sourceItem,
      gameEffects: nextEffects,
    };

    loadData(nextData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }

    setEffects(nextEffects);
    setOriginalEffects(nextEffects);
    setOpsRowsList(nextOpsRowsList);
    setOriginalOpsRowsList(nextOpsRowsList);
    ToastManager.success('效果配置已保存');
  }, [
    currentData,
    currentFilePath,
    currentFileType,
    currentItem,
    currentItemIndex,
    currentRpgItem,
    effects,
    getDefinition,
    loadData,
    markFileDirty,
    markItemDirty,
    opsRowsList,
  ]);

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧项目以编辑效果</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-dark-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          效果模式
          {hasChanges ? <Badge dot color="orange" className="ml-2" /> : null}
        </h2>
        <Space>
          <Dropdown
            menu={{
              items: addEffectMenuItems,
              onClick: ({ key }) => addEffect(key as GameEffectType),
            }}
            trigger={['click']}
          >
            <Button icon={<PlusOutlined />}>
              添加效果
            </Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!hasChanges}
            style={{ backgroundColor: hasChanges ? 'var(--color-accent)' : undefined }}
          >
            保存效果
          </Button>
        </Space>
      </div>

      {effects.length === 0 ? (
        <Card
          headStyle={{
            backgroundColor: '#252b3d',
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
          }}
          bodyStyle={{ backgroundColor: '#1a1f2e' }}
          title="效果列表"
        >
          <Empty description="当前条目还没有效果，点击上方“添加效果”开始配置" />
        </Card>
      ) : (
        <Space direction="vertical" className="w-full">
          {effects.map((effect, index) => {
            const definition = getDefinition(effect.effectType);
            const selector = asRecord(effect.config.selector) || {};
            const opRows = opsRowsList[index] || [];
            const statOptions = getStatOptions(effect.effectType);

            return (
              <Card
                key={index}
                title={`效果 ${index + 1}`}
                extra={(
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeEffect(index)}
                  >
                    删除
                  </Button>
                )}
                headStyle={{
                  backgroundColor: '#252b3d',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
                bodyStyle={{ backgroundColor: '#1a1f2e' }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">效果名称</label>
                    <Input
                      value={effect.name}
                      onChange={(event) => updateEffect(index, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))}
                      placeholder="输入效果名称"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">效果类型</label>
                    <Select
                      value={effect.effectType}
                      onChange={(value) => replaceEffectWithTemplate(index, value as GameEffectType)}
                      options={effectTypeOptions}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">静态缓存</label>
                    <div className="h-[32px] flex items-center">
                      <Switch
                        checked={effect.isStatic}
                        onChange={(checked) => updateEffect(index, (current) => ({
                          ...current,
                          isStatic: checked,
                        }))}
                        checkedChildren="是"
                        unCheckedChildren="否"
                        disabled={!definition.allowIsStaticToggle}
                      />
                    </div>
                    {!definition.allowIsStaticToggle ? (
                      <div className="mt-1 text-xs text-gray-500">
                        当前模板的 isStatic 已按协议固定为 {String(definition.isStatic)}。
                      </div>
                    ) : null}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">效果描述</label>
                    <Input.TextArea
                      value={effect.description}
                      onChange={(event) => updateEffect(index, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))}
                      placeholder="输入效果描述"
                      rows={3}
                    />
                  </div>

                  {definition.selectorMode === 'equip' ? (
                    <div className="col-span-2">
                      <div className="text-xs text-gray-400 mb-2">条件字段</div>
                      <div className="grid grid-cols-2 gap-4">
                        {SELECTOR_FIELD_DEFINITIONS
                          .filter((field) => definition.selectorFields.includes(field.key))
                          .map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                              <Input
                                value={field.stringify(selector[field.key])}
                                onChange={(event) => updateEffect(index, (current) => ({
                                  ...current,
                                  config: {
                                    ...current.config,
                                    selector: {
                                      ...(asRecord(current.config.selector) || {}),
                                      [field.key]: field.parse(event.target.value),
                                    },
                                  },
                                }))}
                                placeholder={field.placeholder}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500">
                        当前模板不会显示 selector 面板，保存时会写入空对象。
                      </div>
                    </div>
                  )}

                  {definition.argsFields.includes('requiredCount') ? (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">要求数量</label>
                      <InputNumber
                        value={getNumberArg(effect, 'requiredCount')}
                        onChange={(value) => updateEffect(index, (current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            args: {
                              ...(asRecord(current.config.args) || {}),
                              requiredCount: typeof value === 'number' ? value : 0,
                            },
                          },
                        }))}
                        min={0}
                        className="w-full"
                      />
                    </div>
                  ) : null}
                  {definition.argsFields.includes('ops') ? (
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-xs text-gray-400">属性操作</div>
                          <div className="text-xs text-gray-500 mt-1">每一行代表一条 [statId, opId, value]</div>
                        </div>
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => addOpRow(index, effect.effectType)}
                        >
                          添加操作
                        </Button>
                      </div>

                      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_80px] gap-3 text-xs text-gray-400 mb-2">
                        <div>属性</div>
                        <div>操作</div>
                        <div>数值</div>
                        <div>操作栏</div>
                      </div>

                      {opRows.length === 0 ? (
                        <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500">
                          当前没有属性操作，请点击“添加操作”
                        </div>
                      ) : (
                        <Space direction="vertical" className="w-full">
                          {opRows.map((row, rowIndex) => {
                            const statInvalid = !statOptions.some((option) => option.value === row.statId);
                            return (
                              <div
                                key={`${index}-${rowIndex}`}
                                className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_80px] gap-3 items-start"
                              >
                                <div>
                                  <Select
                                    value={row.statId}
                                    onChange={(value) => updateOpsRows(index, (rows) => rows.map((entry, entryIndex) => (
                                      entryIndex === rowIndex ? { ...entry, statId: value } : entry
                                    )))}
                                    options={statOptions}
                                    className="w-full"
                                    status={statInvalid ? 'error' : ''}
                                  />
                                  {statInvalid ? (
                                    <div className="mt-1 text-xs text-red-400">
                                      当前模板不允许使用 statId={row.statId}
                                    </div>
                                  ) : null}
                                </div>
                                <Select
                                  value={row.opId}
                                  onChange={(value) => updateOpsRows(index, (rows) => rows.map((entry, entryIndex) => (
                                    entryIndex === rowIndex ? { ...entry, opId: value } : entry
                                  )))}
                                  options={opOptions}
                                  className="w-full"
                                />
                                <InputNumber
                                  value={row.value}
                                  onChange={(value) => updateOpsRows(index, (rows) => rows.map((entry, entryIndex) => (
                                    entryIndex === rowIndex
                                      ? { ...entry, value: typeof value === 'number' ? value : Number.NaN }
                                      : entry
                                  )))}
                                  step={1}
                                  className="w-full"
                                />
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => removeOpRow(index, rowIndex)}
                                >
                                  删除
                                </Button>
                              </div>
                            );
                          })}
                        </Space>
                      )}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </Space>
      )}
    </div>
  );
}

export default EffectPanel;
