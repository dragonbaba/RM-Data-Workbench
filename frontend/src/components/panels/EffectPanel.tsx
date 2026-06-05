import { Badge, Button, Card, Dropdown, Empty, Input, InputNumber, Select, Space, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { ToastManager } from '../common/ToastManager';
import { EventSystem } from '../../core/EventSystem';
import type { EffectOpRow, GameEffectSelectorFieldKey, GameEffectTypeDefinition } from '../../services/GameEffectService';
import type { GameEffectEntry, GameEffectOpGroup, GameEffectType } from '../../types';
import {
  createDefaultOpRow,
  createGameEffectConfig,
  createGameEffectTemplate,
  EFFECTS_FILE_NAME,
  getGameEffectTypeDefinition,
  getGameEffectTypeDefinitions,
  getGroupOptions,
  getKeyOptions,
  getOpOptions,
  normalizeGameEffectEntry,
  parseOpsToRows,
  serializeRowsToOps,
  validateEffectOpRows,
  validateGameEffectEntry,
} from '../../services/GameEffectService';
import { arePlainDataEqual } from '../../services/PlainDataCompare';
import { COMMA_OR_NEWLINE_REGEXP, NEWLINE_REGEXP, PATH_SEPARATOR_REGEXP } from '../../constants/regexp';

const SYSTEM_FILE_NAME = 'System.json';

const splitTokens = (value: string): string[] =>
  value
    .split(COMMA_OR_NEWLINE_REGEXP)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const parseNumberListText = (value: string): number[] =>
  splitTokens(value)
    .map((token) => Number(token))
    .filter((token) => Number.isFinite(token));

const stringifyNumberList = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : '';

const stringifyDescription = (value: string[]): string => value.join('\n');

const parseDescription = (value: string): string[] =>
  value
    .split(NEWLINE_REGEXP)
    .map((line) => line.trim());

const getNumberArg = (effect: GameEffectEntry, key: string): number | null => {
  const value = effect.config.args[key as keyof typeof effect.config.args];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const parseEffectOpRows = (effect: GameEffectEntry): EffectOpRow[] => {
  return parseOpsToRows(effect.config.args.ops);
};

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

const getFirstAvailableId = (data: unknown[]): number => {
  for (let index = 1; index < data.length; index++) {
    if (data[index] == null) {
      return index;
    }
  }
  return data.length;
};

export function EffectPanel() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const selectItem = useEditorStore((state) => state.selectItem);
  const [referenceRevision, setReferenceRevision] = useState(0);

  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>(SYSTEM_FILE_NAME),
    [referenceRevision],
  );

  const [effect, setEffect] = useState<GameEffectEntry | null>(null);
  const [originalEffect, setOriginalEffect] = useState<GameEffectEntry | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [originalDescriptionText, setOriginalDescriptionText] = useState('');
  const [opRows, setOpRows] = useState<EffectOpRow[]>([]);
  const [originalOpRows, setOriginalOpRows] = useState<EffectOpRow[]>([]);
  const lastAutoSaveFailedDraftRef = useRef<{
    effect: GameEffectEntry | null;
    descriptionText: string;
    opRows: EffectOpRow[];
  } | null>(null);
  const autoSaveSkipRef = useRef(0);
  const autoSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || fileName === SYSTEM_FILE_NAME.toLowerCase()) {
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

  const definitions = useMemo(
    () => getGameEffectTypeDefinitions(),
    [],
  );
  const definitionMap = useMemo(
    () => new Map(definitions.map((definition) => [definition.effectType, definition])),
    [definitions],
  );
  const effectTypeOptions = useMemo(
    () => definitions.map((definition) => ({
      value: definition.effectType,
      label: definition.label,
    })),
    [definitions],
  );
  const addEffectMenuItems = useMemo(
    () => definitions.map((definition) => ({
      key: definition.effectType,
      label: definition.label,
    })),
    [definitions],
  );
  const opOptions = useMemo(
    () => getOpOptions(),
    [],
  );

  const fileName = currentFilePath.split(PATH_SEPARATOR_REGEXP).pop() || '';
  const isEffectsFile = fileName.toLowerCase() === EFFECTS_FILE_NAME.toLowerCase();

  useEffect(() => {
    if (!isEffectsFile || !currentItem) {
      setEffect(null);
      setOriginalEffect(null);
      setDescriptionText('');
      setOriginalDescriptionText('');
      setOpRows([]);
      setOriginalOpRows([]);
      return;
    }

    const normalized = normalizeGameEffectEntry(currentItem, systemData);
    if (!normalized) {
      setEffect(null);
      setOriginalEffect(null);
      setDescriptionText('');
      setOriginalDescriptionText('');
      setOpRows([]);
      setOriginalOpRows([]);
      return;
    }
    normalized.id = normalized.id && normalized.id > 0 ? normalized.id : currentItemIndex;
    const nextRows = parseEffectOpRows(normalized);
    setEffect(normalized);
    setOriginalEffect(normalized);
    if (autoSaveSkipRef.current > 0) {
      autoSaveSkipRef.current--;
    } else {
      setDescriptionText(stringifyDescription(normalized.description));
      setOriginalDescriptionText(stringifyDescription(normalized.description));
    }
    setOpRows(nextRows);
    setOriginalOpRows(nextRows);
  }, [currentItem, currentItemIndex, isEffectsFile, systemData]);

  const hasChanges = useMemo(
    () => !arePlainDataEqual(effect, originalEffect)
      || descriptionText !== originalDescriptionText
      || !arePlainDataEqual(opRows, originalOpRows),
    [descriptionText, effect, opRows, originalDescriptionText, originalEffect, originalOpRows],
  );

  const definition: GameEffectTypeDefinition = useMemo(() => {
    if (!effect) {
      return definitions[0]!;
    }
    return definitionMap.get(effect.effectType) || getGameEffectTypeDefinition(effect.effectType);
  }, [definitionMap, definitions, effect]);

  const groupOptions = useMemo(
    () => (effect ? getGroupOptions(effect.effectType) : []),
    [effect],
  );

  const replaceWithTemplate = (effectType: GameEffectType, keepId = true) => {
    const template = createGameEffectTemplate(effectType, systemData);
    if (keepId && effect?.id) {
      template.id = effect.id;
    }
    setEffect(template);
    setDescriptionText(stringifyDescription(template.description));
    setOpRows(parseEffectOpRows(template));
  };

  const getDefaultKeyForGroup = (effectType: GameEffectType, group: GameEffectOpGroup): string => {
    const [firstKey] = getKeyOptions(effectType, group, systemData);
    return firstKey?.value || '';
  };

  const handleAddEffect = (effectType: GameEffectType) => {
    if (!currentData) return;
    const nextId = getFirstAvailableId(currentData);
    const nextEffect = createGameEffectTemplate(effectType, systemData);
    nextEffect.id = nextId;
    const nextData = [...currentData];
    nextData[nextId] = nextEffect;
    loadData(nextData, currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, nextId);
    }
    selectItem(nextId);
    ToastManager.success(`已新建效果 #${nextId}`);
  };

  const handleDeleteEffect = () => {
    if (!currentData || currentItemIndex <= 0 || !effect) return;
    const nextData = [...currentData];
    nextData[currentItemIndex] = null;
    loadData(nextData, currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
    const fallbackIndex = nextData.findIndex((entry, index) => index > 0 && entry != null);
    if (fallbackIndex > 0) {
      selectItem(fallbackIndex);
    }
    ToastManager.success(`已删除效果 #${currentItemIndex}`);
  };

  const persistEffectChanges = (silent = false): boolean => {
    if (!currentData || !effect || currentItemIndex <= 0) {
      return false;
    }

    const currentDraft = {
      effect,
      descriptionText,
      opRows,
    };
    if (silent && arePlainDataEqual(lastAutoSaveFailedDraftRef.current, currentDraft)) {
      return false;
    }

    const opValidation = validateEffectOpRows(effect.effectType, opRows, systemData);
    if (!opValidation.valid) {
      if (!silent) {
        ToastManager.error(opValidation.message || '属性操作无效');
      }
      if (silent) {
        lastAutoSaveFailedDraftRef.current = currentDraft;
      }
      return false;
    }

    const rawArgs = effect.config.args;
    const argsPayload: Record<string, unknown> = {
      ops: serializeRowsToOps(opRows),
    };
    if (definition.argsFields.includes('requiredCount')) {
      argsPayload.requiredCount = rawArgs.requiredCount;
    }
    if (definition.argsFields.includes('weaponIds')) {
      argsPayload.weaponIds = rawArgs.weaponIds;
    }
    if (definition.argsFields.includes('armorIds')) {
      argsPayload.armorIds = rawArgs.armorIds;
    }

    const nextConfig = createGameEffectConfig(effect.effectType, {
      selector: effect.config.selector,
      args: argsPayload,
    }, systemData);
    const nextEntry = {
      ...effect,
      id: effect.id || currentItemIndex,
      description: parseDescription(descriptionText),
      config: nextConfig,
    };
    const validation = validateGameEffectEntry(nextEntry, systemData);
    if (!validation.valid) {
      if (!silent) {
        ToastManager.error(validation.message || '效果配置无效');
      }
      if (silent) {
        lastAutoSaveFailedDraftRef.current = currentDraft;
      }
      return false;
    }
    const normalized = normalizeGameEffectEntry(nextEntry, systemData);
    if (!normalized) {
      if (!silent) {
        ToastManager.error('effectType 无效');
      }
      if (silent) {
        lastAutoSaveFailedDraftRef.current = currentDraft;
      }
      return false;
    }
    normalized.id = effect.id || currentItemIndex;
    const nextData = [...currentData];
    nextData[currentItemIndex] = normalized;
    if (silent) {
      autoSaveSkipRef.current++;
    }
    loadData(nextData, currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
    const nextRows = parseEffectOpRows(normalized);
    setEffect(normalized);
    setOriginalEffect(normalized);
    if (!silent) {
      setDescriptionText(stringifyDescription(normalized.description));
      setOriginalDescriptionText(stringifyDescription(normalized.description));
    }
    setOpRows(nextRows);
    setOriginalOpRows(nextRows);
    lastAutoSaveFailedDraftRef.current = null;
    if (!silent) {
      ToastManager.success('效果已保存');
    }
    return true;
  };

  useEffect(() => {
    const flushPendingDraft = () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (hasChanges) {
        persistEffectChanges(true);
      }
    };

    EventSystem.on('editor:flush-pending-draft', flushPendingDraft);
    return () => {
      EventSystem.off('editor:flush-pending-draft', flushPendingDraft);
    };
  }, [hasChanges, effect, descriptionText, opRows, currentData, currentItemIndex, currentFilePath, systemData]);

  useEffect(() => {
    if (!hasChanges) {
      return;
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      persistEffectChanges(true);
    }, 160);
    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [hasChanges, effect, descriptionText, opRows, currentData, currentItemIndex, currentFilePath, systemData]);

  if (!isEffectsFile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">效果模式只编辑 Effects.json</p>
      </div>
    );
  }

  if (!effect) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-dark-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="panel-title">
            效果模式
          </h2>
          <Dropdown
            menu={{
              items: addEffectMenuItems,
              onClick: ({ key }) => handleAddEffect(key as GameEffectType),
            }}
            trigger={['click']}
          >
            <Button icon={<PlusOutlined />}>新建效果</Button>
          </Dropdown>
        </div>
        <Card
          title="效果条目"
        >
          <Empty description="请选择左侧效果，或点击上方“新建效果”创建一条新记录" />
        </Card>
      </div>
    );
  }

  const selector = effect.config.selector;
  const argsRecord = effect.config.args;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-dark-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="panel-title">
          效果模式 #{effect.id}
          {hasChanges ? <Badge dot color="orange" className="ml-2" /> : null}
        </h2>
        <Space>
          <Dropdown
            menu={{
              items: addEffectMenuItems,
              onClick: ({ key }) => handleAddEffect(key as GameEffectType),
            }}
            trigger={['click']}
          >
            <Button icon={<PlusOutlined />}>新建效果</Button>
          </Dropdown>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteEffect}
          >
            删除效果
          </Button>
          <span className="text-xs text-gray-500">自动记录变更并标记脏文件</span>
        </Space>
      </div>

      <Card
        title="效果条目"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">效果名称</label>
            <Input
              value={effect.name}
              onChange={(event) => setEffect((current) => current ? ({
                ...current,
                name: event.target.value,
              }) : current)}
              placeholder="输入效果名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">效果类型</label>
            <Select
              value={effect.effectType}
              onChange={(value) => replaceWithTemplate(value as GameEffectType)}
              options={effectTypeOptions}
              className="w-full"
            showSearch
            optionFilterProp="label"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">静态缓存</label>
            <div className="h-[32px] flex items-center">
              <Switch
                checked={effect.isStatic}
                onChange={(checked) => setEffect((current) => current ? ({
                  ...current,
                  isStatic: checked,
                }) : current)}
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
              value={descriptionText}
              onChange={(event) => setDescriptionText(event.target.value)}
              placeholder="输入效果描述，每行会保存为 description 数组的一项"
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
                        onChange={(event) => setEffect((current) => current ? ({
                          ...current,
                          config: createGameEffectConfig(current.effectType, {
                            selector: {
                              ...current.config.selector,
                              [field.key]: field.parse(event.target.value),
                            },
                            args: current.config.args,
                          }, systemData),
                        }) : current)}
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
                onChange={(value) => setEffect((current) => current ? ({
                  ...current,
                  config: createGameEffectConfig(current.effectType, {
                    selector: current.config.selector,
                    args: {
                      ...current.config.args,
                      requiredCount: typeof value === 'number' ? value : 0,
                    },
                  }, systemData),
                }) : current)}
                min={0}
                className="w-full"
              />
            </div>
          ) : null}

          {definition.argsFields.includes('weaponIds') ? (
            <div>
              <label className="block text-xs text-gray-400 mb-1">武器 ID 合集</label>
              <Input
                value={stringifyNumberList(argsRecord.weaponIds)}
                onChange={(event) => setEffect((current) => current ? ({
                  ...current,
                  config: createGameEffectConfig(current.effectType, {
                    selector: current.config.selector,
                    args: {
                      ...current.config.args,
                      weaponIds: parseNumberListText(event.target.value),
                    },
                  }, systemData),
                }) : current)}
                placeholder="例如: 1, 2, 3"
              />
            </div>
          ) : null}

          {definition.argsFields.includes('armorIds') ? (
            <div>
              <label className="block text-xs text-gray-400 mb-1">非武器 ID 合集</label>
              <Input
                value={stringifyNumberList(argsRecord.armorIds)}
                onChange={(event) => setEffect((current) => current ? ({
                  ...current,
                  config: createGameEffectConfig(current.effectType, {
                    selector: current.config.selector,
                    args: {
                      ...current.config.args,
                      armorIds: parseNumberListText(event.target.value),
                    },
                  }, systemData),
                }) : current)}
                placeholder="例如: 2, 5, 10"
              />
            </div>
          ) : null}

          {definition.argsFields.includes('ops') ? (
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-gray-400">属性操作</div>
                  <div className="text-xs text-gray-500 mt-1">每一行代表一条 {`{ group, key, op, value }`}</div>
                </div>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setOpRows((rows) => [...rows, createDefaultOpRow(effect.effectType, systemData)])}
                >
                  添加操作
                </Button>
              </div>

              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_80px] gap-3 text-xs text-gray-400 mb-2">
                <div>分组</div>
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
                    const keyOptions = getKeyOptions(effect.effectType, row.group, systemData);
                    const groupInvalid = !groupOptions.some((option) => option.value === row.group);
                    const keyInvalid = !keyOptions.some((option) => option.value === row.key);
                    return (
                      <div
                        key={rowIndex}
                        className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_80px] gap-3 items-start"
                      >
                        <div>
                          <Select
                            value={row.group}
                            onChange={(value) => setOpRows((rows) => rows.map((entry, index) => (
                              index === rowIndex
                                ? {
                                  ...entry,
                                  group: value as GameEffectOpGroup,
                                  key: getDefaultKeyForGroup(effect.effectType, value as GameEffectOpGroup),
                                }
                                : entry
                            )))}
                            options={groupOptions}
                            className="w-full"
                            status={groupInvalid ? 'error' : ''}
                          showSearch
                          optionFilterProp="label"
                          />
                          {groupInvalid ? (
                            <div className="mt-1 text-xs text-red-400">
                              当前模板不允许使用分组 {row.group}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <Select
                            value={row.key}
                            onChange={(value) => setOpRows((rows) => rows.map((entry, index) => (
                              index === rowIndex ? { ...entry, key: value } : entry
                            )))}
                            options={keyOptions}
                            className="w-full"
                            status={keyInvalid ? 'error' : ''}
                          showSearch
                          optionFilterProp="label"
                          />
                          {keyInvalid ? (
                            <div className="mt-1 text-xs text-red-400">
                              当前模板不允许使用 {row.group}.{row.key}
                            </div>
                          ) : null}
                        </div>
                        <Select
                          value={row.op}
                          onChange={(value) => setOpRows((rows) => rows.map((entry, index) => (
                            index === rowIndex ? { ...entry, op: value } : entry
                          )))}
                          options={opOptions}
                          className="w-full"
                        showSearch
                        optionFilterProp="label"
                        />
                        <InputNumber
                          value={row.value}
                          onChange={(value) => setOpRows((rows) => rows.map((entry, index) => (
                            index === rowIndex
                              ? { ...entry, value: typeof value === 'number' ? value : Number.NaN }
                              : entry
                          )))}
                          step={1}
                          className="w-full"
                        />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => setOpRows((rows) => rows.filter((_, index) => index !== rowIndex))}
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
    </div>
  );
}

export default EffectPanel;
