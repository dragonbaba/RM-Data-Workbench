import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, InputNumber, Select, Space, Tag, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { WriteJSON } from '../../../wailsjs/go/main/App';
import { EventSystem } from '../../core/EventSystem';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { prepareDataForWrite } from '../../services/DataFileFormatService';
import { getEquipTypeOptions, getSystemRecord } from '../../services/EquipDataService';
import {
  EQUIP_EXTENSIONS_FILE_NAME,
  getActorEquipStateFromExtensions,
  getActorRefitSlotsFromExtensions,
  type ActorRefitSlotRule,
  type EquipExtensionsData,
  type IndexedActorRefitRuleSets,
  type RefitCondition,
  type RefitTransitionRule,
  type RefitVariableOperator,
} from '../../services/EquipExtensionsService';
import { ToastManager } from '../common/ToastManager';
import { CopyToTargetModal } from '../common/CopyToTargetModal';
import { TRAILING_PATH_SEPARATORS_REGEXP } from '../../constants/regexp';

type RecordLike = Record<string, unknown>;
type SystemOption = { value: number; label: string };

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '')}/${fileName}`;
};

const getDisplayName = (item: RecordLike | null, fallback: string) => {
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  return name || fallback;
};

const variableOperatorOptions: Array<{ value: RefitVariableOperator; label: string }> = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
];

const createSwitchCondition = (): RefitCondition => ({
  kind: 'switch',
  switchId: 0,
  value: true,
});

const createNoCondition = (): RefitCondition => ({
  kind: 'none',
});

const createVariableCondition = (): RefitCondition => ({
  kind: 'variable',
  variableId: 0,
  op: '>=',
  value: 0,
});

const createTransition = (fromEquipTypeId: number, toEquipTypeId: number): RefitTransitionRule => ({
  fromEquipTypeId,
  toEquipTypeId,
  goldCost: 0,
  conditions: [createNoCondition()],
});

const inputNumberValue = (value: unknown): number => (typeof value === 'number' ? value : 0);

const cloneRefitTransition = (transition: RefitTransitionRule): RefitTransitionRule => ({
  ...transition,
  conditions: transition.conditions.map((condition) => ({ ...condition })),
});

const cloneRefitSlot = (slot: ActorRefitSlotRule): ActorRefitSlotRule => ({
  ...slot,
  transitions: slot.transitions.map(cloneRefitTransition),
});

const getTypeName = (equipTypeOptions: ReturnType<typeof getEquipTypeOptions>, typeId: number) => {
  return equipTypeOptions.find((option) => option.value === typeId)?.name || (typeId > 0 ? `类型${typeId}` : '无类型');
};

const getSystemNamedOptions = (systemData: unknown, field: 'switches' | 'variables'): SystemOption[] => {
  const system = getSystemRecord(systemData);
  const rawValues = Array.isArray(system?.[field]) ? system[field] : [];
  const options: SystemOption[] = [];

  for (let index = 1; index < rawValues.length; index++) {
    const name = typeof rawValues[index] === 'string' ? rawValues[index].trim() : '';
    if (!name) continue;
    options.push({
      value: index,
      label: `${index} : ${name}`,
    });
  }

  return options;
};

const fallbackSystemOption = (id: number, typeName: string): SystemOption => ({
  value: id,
  label: id > 0 ? `${id} : ${typeName}${id}` : `0 : 未选择`,
});

export function RefitPanel() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentFile = useEditorStore((state) => state.currentFile);
  const config = useEditorStore((state) => state.config);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const markFileClean = useEditorStore((state) => state.markFileClean);
  const getDirtyItemIndexes = useEditorStore((state) => state.getDirtyItemIndexes);

  const [referenceRevision, setReferenceRevision] = useState(0);
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || ['actors.json', 'system.json', EQUIP_EXTENSIONS_FILE_NAME.toLowerCase()].includes(fileName)) {
        setReferenceRevision((value) => value + 1);
      }
    };

    EventSystem.on('data:file-loaded', refreshReferences);
    EventSystem.on('data:manifest-loaded', refreshReferences);

    return () => {
      EventSystem.off('data:file-loaded', refreshReferences);
      EventSystem.off('data:manifest-loaded', refreshReferences);
    };
  }, [config.dataPath, config.projectRoot]);

  useEffect(() => {
    if (!config.dataPath) {
      return;
    }

    void DataLoaderService.ensureEquipExtensionsLoaded(config.dataPath, { force: true }).then((loaded) => {
      if (loaded) {
        setReferenceRevision((value) => value + 1);
      }
    });
  }, [config.dataPath]);

  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>('System.json'),
    [referenceRevision],
  );
  const equipExtensionsData = useMemo(
    () => DataLoaderService.getCachedDataByName<EquipExtensionsData>(EQUIP_EXTENSIONS_FILE_NAME),
    [referenceRevision],
  );
  const equipExtensionsFilePath = useMemo(() => {
    return DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME) || joinPath(config.dataPath, EQUIP_EXTENSIONS_FILE_NAME);
  }, [config.dataPath, referenceRevision]);
  const equipTypeOptions = useMemo(() => getEquipTypeOptions(systemData), [systemData]);
  const switchOptions = useMemo(() => getSystemNamedOptions(systemData, 'switches'), [systemData]);
  const variableOptions = useMemo(() => getSystemNamedOptions(systemData, 'variables'), [systemData]);

  const actor = useMemo(() => {
    if (!currentItem || typeof currentItem !== 'object' || Array.isArray(currentItem)) {
      return null;
    }
    return currentItem as RecordLike;
  }, [currentItem]);

  const actorEquipState = useMemo(
    () => getActorEquipStateFromExtensions(equipExtensionsData, currentItemIndex),
    [currentItemIndex, equipExtensionsData],
  );
  const refitSlots = useMemo(
    () => getActorRefitSlotsFromExtensions(equipExtensionsData, currentItemIndex, actorEquipState.equipSlots),
    [actorEquipState.equipSlots, currentItemIndex, equipExtensionsData],
  );
  const hasCurrentActorChanges = useMemo(() => {
    if (!equipExtensionsFilePath || currentItemIndex <= 0) {
      return false;
    }
    return getDirtyItemIndexes(equipExtensionsFilePath).includes(currentItemIndex);
  }, [currentItemIndex, equipExtensionsFilePath, getDirtyItemIndexes]);

  const applyRefitUpdate = useCallback((nextSlots: ActorRefitSlotRule[]) => {
    if (currentItemIndex <= 0 || !equipExtensionsFilePath || !equipExtensionsData) {
      return;
    }

    const nextActorRefitRules = [...equipExtensionsData.actorRefitRules] as IndexedActorRefitRuleSets;
    nextActorRefitRules[currentItemIndex] = {
      slots: nextSlots.map((slot, slotIndex) => {
        const fromEquipTypeId = actorEquipState.equipSlots[slotIndex] || 0;
        return {
          slotIndex,
          fromEquipTypeId,
          transitions: slot.transitions.map((transition) => ({
            ...transition,
            conditions: transition.conditions.map((condition) => ({ ...condition })),
          })),
        };
      }),
    };

    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      actorRefitRules: nextActorRefitRules,
    };

    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    markItemDirty(equipExtensionsFilePath, currentItemIndex);
    setReferenceRevision((value) => value + 1);
  }, [actorEquipState.equipSlots, currentItemIndex, equipExtensionsData, equipExtensionsFilePath, markFileDirty, markItemDirty]);

  const addTransition = useCallback((slotIndex: number) => {
    const nextSlots = refitSlots.map(cloneRefitSlot);
    const slot = nextSlots[slotIndex];
    if (!slot) return;
    const usedTargets = new Set(slot.transitions
      .filter((transition) => transition.fromEquipTypeId === slot.fromEquipTypeId)
      .map((transition) => transition.toEquipTypeId));
    const target = equipTypeOptions.find((option) => (
      !option.isNone
      && option.value !== slot.fromEquipTypeId
      && !usedTargets.has(option.value)
    ))?.value || 0;
    if (target <= 0) {
      ToastManager.warning('当前槽位没有可添加的目标类型');
      return;
    }
    slot.transitions.push(createTransition(slot.fromEquipTypeId, target));
    applyRefitUpdate(nextSlots);
  }, [applyRefitUpdate, equipTypeOptions, refitSlots]);

  const updateTransition = useCallback((slotIndex: number, transitionIndex: number, updates: Partial<RefitTransitionRule>) => {
    const nextSlots = refitSlots.map(cloneRefitSlot);
    const transition = nextSlots[slotIndex]?.transitions[transitionIndex];
    if (!transition) return;
    if (typeof updates.toEquipTypeId === 'number') {
      if (updates.toEquipTypeId === transition.fromEquipTypeId) {
        ToastManager.warning('目标槽类型不能和当前槽类型相同');
        return;
      }
      const hasDuplicate = nextSlots[slotIndex].transitions.some((item, index) => (
        index !== transitionIndex
        && item.fromEquipTypeId === transition.fromEquipTypeId
        && item.toEquipTypeId === updates.toEquipTypeId
      ));
      if (hasDuplicate) {
        ToastManager.warning('当前槽位已存在这个目标类型');
        return;
      }
    }
    nextSlots[slotIndex].transitions[transitionIndex] = {
      ...transition,
      ...updates,
      fromEquipTypeId: transition.fromEquipTypeId,
    };
    applyRefitUpdate(nextSlots);
  }, [applyRefitUpdate, refitSlots]);

  const deleteTransition = useCallback((slotIndex: number, transitionIndex: number) => {
    const nextSlots = refitSlots.map(cloneRefitSlot);
    nextSlots[slotIndex]?.transitions.splice(transitionIndex, 1);
    applyRefitUpdate(nextSlots);
  }, [applyRefitUpdate, refitSlots]);

  const addCondition = useCallback((slotIndex: number, transitionIndex: number) => {
    const transition = refitSlots[slotIndex]?.transitions[transitionIndex];
    if (!transition) return;
    updateTransition(slotIndex, transitionIndex, {
      conditions: [...transition.conditions, createNoCondition()],
    });
  }, [refitSlots, updateTransition]);

  const updateCondition = useCallback((slotIndex: number, transitionIndex: number, conditionIndex: number, nextCondition: RefitCondition) => {
    const transition = refitSlots[slotIndex]?.transitions[transitionIndex];
    if (!transition) return;
    const nextConditions = transition.conditions.map((condition, index) => (
      index === conditionIndex ? nextCondition : { ...condition }
    ));
    updateTransition(slotIndex, transitionIndex, { conditions: nextConditions });
  }, [refitSlots, updateTransition]);

  const deleteCondition = useCallback((slotIndex: number, transitionIndex: number, conditionIndex: number) => {
    const transition = refitSlots[slotIndex]?.transitions[transitionIndex];
    if (!transition) return;
    updateTransition(slotIndex, transitionIndex, {
      conditions: transition.conditions.filter((_, index) => index !== conditionIndex),
    });
  }, [refitSlots, updateTransition]);

  const saveCurrentActor = useCallback(async () => {
    if (!equipExtensionsFilePath || !equipExtensionsData) {
      ToastManager.error('装备扩展数据未加载');
      return;
    }

    try {
      await WriteJSON(equipExtensionsFilePath, prepareDataForWrite(equipExtensionsFilePath, equipExtensionsData));
      markFileClean(equipExtensionsFilePath);
      ToastManager.success('当前角色改造规则已保存');
      setReferenceRevision((value) => value + 1);
    } catch (error) {
      console.error('Failed to save refit rules:', error);
      ToastManager.error('保存改造规则失败');
    }
  }, [equipExtensionsData, equipExtensionsFilePath, markFileClean]);

  const copyTargetOptions = useMemo(() => {
    if (!Array.isArray(currentData)) return [];
    return currentData.slice(1).map((item, idx) => {
      const index = idx + 1;
      const obj = (item && typeof item === 'object' && !Array.isArray(item)) ? item as { name?: unknown } : null;
      const rawName = typeof obj?.name === 'string' ? obj.name.trim() : '';
      const name = rawName || `角色 ${index}`;
      return { value: index, label: `${index} : ${name}` };
    }).filter((option) => option.value !== currentItemIndex);
  }, [currentData, currentItemIndex]);

  const handleCopyRefitToTargets = useCallback((targetIndexes: number[]) => {
    if (currentItemIndex <= 0 || !equipExtensionsFilePath || !equipExtensionsData) {
      ToastManager.error('装备扩展数据未加载');
      return;
    }

    const sourceRuleSet = equipExtensionsData.actorRefitRules[currentItemIndex];
    if (!sourceRuleSet || !sourceRuleSet.slots.some((slot) => slot.transitions.length > 0)) {
      ToastManager.warning('当前角色没有改造规则可复制');
      return;
    }

    const nextActorRefitRules = [...equipExtensionsData.actorRefitRules] as IndexedActorRefitRuleSets;

    targetIndexes.forEach((targetIndex) => {
      nextActorRefitRules[targetIndex] = {
        slots: sourceRuleSet.slots.map((slot) => ({
          slotIndex: slot.slotIndex,
          fromEquipTypeId: slot.fromEquipTypeId,
          transitions: slot.transitions.map((transition) => ({
            ...transition,
            conditions: transition.conditions.map((condition) => ({ ...condition })),
          })),
        })),
      };
    });

    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      actorRefitRules: nextActorRefitRules,
    };

    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    targetIndexes.forEach((targetIndex) => markItemDirty(equipExtensionsFilePath, targetIndex));
    setReferenceRevision((value) => value + 1);
    setCopyModalOpen(false);
    ToastManager.success(`已复制到 ${targetIndexes.length} 个目标角色`);
  }, [currentItemIndex, equipExtensionsData, equipExtensionsFilePath, markFileDirty, markItemDirty]);

  if (!Array.isArray(currentData) || currentFile.toLowerCase() !== 'actors.json' || !actor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0e17]">
        <Empty description="改造模式仅在角色数据上可用" />
      </div>
    );
  }

  const actorName = getDisplayName(actor, `角色 ${currentItemIndex}`);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0e17]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="panel-title">改造模式</h2>
          <div className="text-xs text-gray-400 mt-1">
            当前角色:
            <Tag color="cyan" className="ml-2">{actorName}</Tag>
            <Tag color="blue">槽位 {actorEquipState.equipSlots.length}</Tag>
            {hasCurrentActorChanges && <Tag color="gold">当前角色已修改</Tag>}
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => void saveCurrentActor()}
            disabled={!hasCurrentActorChanges}
            style={{ backgroundColor: hasCurrentActorChanges ? 'var(--color-accent)' : undefined }}
          >
            保存当前角色
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => setCopyModalOpen(true)}
            disabled={currentItemIndex <= 0 || !refitSlots.some((slot) => slot.transitions.length > 0)}
          >
            复制到…
          </Button>
        </Space>
      </div>

      {refitSlots.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          当前角色没有初始装备槽，请先在装备模式定义 `actorEquipSlots`。
        </div>
      ) : (
        <Space direction="vertical" className="w-full">
          {refitSlots.map((slot, slotIndex) => {
            const fromTypeName = getTypeName(equipTypeOptions, slot.fromEquipTypeId);
            const visibleTransitions = slot.transitions
              .map((transition, transitionIndex) => ({ transition, transitionIndex }))
              .filter(({ transition }) => (
                transition.fromEquipTypeId === slot.fromEquipTypeId
                && transition.toEquipTypeId !== slot.fromEquipTypeId
              ));
            return (
              <div
                key={`refit-slot-${slotIndex}`}
                className="border border-[#30384d] rounded bg-[#111827] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Tag color="cyan">槽位 {slotIndex + 1}</Tag>
                    <Tag color="blue">{slot.fromEquipTypeId} : {fromTypeName}</Tag>
                  </div>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addTransition(slotIndex)}>
                    添加可变更类型
                  </Button>
                </div>

                {visibleTransitions.length === 0 ? (
                  <div className="text-xs text-gray-500 py-3">
                    当前槽位还没有改造规则。没有规则时，游戏内不可改造到其他槽类型。
                  </div>
                ) : (
                  <Space direction="vertical" className="w-full">
                    {visibleTransitions.map(({ transition, transitionIndex }) => (
                      <div
                        key={`transition-${slotIndex}-${transitionIndex}`}
                        className="border border-[#263044] rounded p-3 bg-[#0b1220]"
                      >
                        <div className="grid grid-cols-3 gap-3 items-end">
                          <div className="min-w-0">
                            <label className="block text-xs text-gray-400 mb-1">目标槽类型</label>
                            <Select
                              value={transition.toEquipTypeId || undefined}
                              options={equipTypeOptions.filter((option) => !option.isNone).map((option) => ({
                                value: option.value,
                                label: option.label,
                              }))}
                              className="w-full"
                              onChange={(value) => updateTransition(slotIndex, transitionIndex, { toEquipTypeId: value })}
                            showSearch
                            optionFilterProp="label"
                            />
                          </div>

                          <div className="min-w-0">
                            <label className="block text-xs text-gray-400 mb-1">金币消耗</label>
                            <InputNumber
                              min={0}
                              precision={0}
                              value={transition.goldCost}
                              className="w-full"
                              onChange={(value) => updateTransition(slotIndex, transitionIndex, { goldCost: inputNumberValue(value) })}
                            />
                          </div>

                          <div className="min-w-0">
                            <label className="block text-xs text-transparent mb-1">操作</label>
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteTransition(slotIndex, transitionIndex)}
                              className="w-full"
                            >
                              删除规则
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <Typography.Text type="secondary">条件</Typography.Text>
                            <Button size="small" icon={<PlusOutlined />} onClick={() => addCondition(slotIndex, transitionIndex)}>
                              添加条件
                            </Button>
                          </div>

                          {transition.conditions.length === 0 ? (
                            <div className="text-xs text-gray-500">无条件，满足金币后即可改造。</div>
                          ) : (
                            <Space direction="vertical" className="w-full">
                              {transition.conditions.map((condition, conditionIndex) => (
                                <div
                                  key={`condition-${slotIndex}-${transitionIndex}-${conditionIndex}`}
                                  className="rounded border border-[#1f2a3d] bg-[#0f1729] p-2"
                                >
                                  <div className="grid grid-cols-3 gap-2 items-end">
                                    <div className="min-w-0">
                                      <label className="block text-xs text-gray-400 mb-1">条件类型</label>
                                      <Select
                                        value={condition.kind}
                                        className="w-full"
                                        showSearch
                                        optionFilterProp="label"
                                        options={[
                                          { value: 'none', label: '无条件' },
                                          { value: 'switch', label: '开关' },
                                          { value: 'variable', label: '变量' },
                                        ]}
                                        onChange={(value) => updateCondition(
                                          slotIndex,
                                          transitionIndex,
                                          conditionIndex,
                                          value === 'variable'
                                            ? createVariableCondition()
                                            : value === 'switch'
                                              ? createSwitchCondition()
                                              : createNoCondition(),
                                        )}
                                      />
                                    </div>

                                    {condition.kind === 'none' ? (
                                      <>
                                        <div className="min-w-0">
                                          <label className="block text-xs text-gray-400 mb-1">规则</label>
                                          <div className="h-8 flex items-center px-2 rounded border border-[#2c3850] text-xs text-gray-300 bg-[#111a2d]">
                                            不检查开关或变量
                                          </div>
                                        </div>
                                        <div className="min-w-0 flex gap-2 items-end">
                                          <div className="flex-1 min-w-0">
                                            <label className="block text-xs text-gray-400 mb-1">结果</label>
                                            <div className="h-8 flex items-center px-2 rounded border border-[#2c3850] text-xs text-gray-300 bg-[#111a2d]">
                                              满足金币即可改造
                                            </div>
                                          </div>
                                          <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => deleteCondition(slotIndex, transitionIndex, conditionIndex)}
                                          />
                                        </div>
                                      </>
                                    ) : condition.kind === 'switch' ? (
                                      <>
                                        <div className="min-w-0">
                                          <label className="block text-xs text-gray-400 mb-1">开关</label>
                                          <Select
                                            showSearch
                                            value={condition.switchId || undefined}
                                            className="w-full"
                                            options={condition.switchId > 0 && !switchOptions.some((option) => option.value === condition.switchId)
                                              ? [fallbackSystemOption(condition.switchId, '开关'), ...switchOptions]
                                              : switchOptions}
                                            placeholder="选择开关"
                                            optionFilterProp="label"
                                            onChange={(value) => updateCondition(slotIndex, transitionIndex, conditionIndex, {
                                              ...condition,
                                              switchId: value,
                                            })}
                                          />
                                        </div>
                                        <div className="min-w-0 flex gap-2 items-end">
                                          <div className="flex-1 min-w-0">
                                            <label className="block text-xs text-gray-400 mb-1">状态</label>
                                            <Select
                                              value={condition.value ? 'true' : 'false'}
                                              className="w-full"
                                              options={[
                                                { value: 'true', label: '开启' },
                                                { value: 'false', label: '关闭' },
                                              ]}
                                              onChange={(value) => updateCondition(slotIndex, transitionIndex, conditionIndex, {
                                                ...condition,
                                                value: value === 'true',
                                              })}
                                            showSearch
                                            optionFilterProp="label"
                                            />
                                          </div>
                                          <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => deleteCondition(slotIndex, transitionIndex, conditionIndex)}
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="min-w-0">
                                          <label className="block text-xs text-gray-400 mb-1">变量</label>
                                          <Select
                                            showSearch
                                            value={condition.variableId || undefined}
                                            className="w-full"
                                            options={condition.variableId > 0 && !variableOptions.some((option) => option.value === condition.variableId)
                                              ? [fallbackSystemOption(condition.variableId, '变量'), ...variableOptions]
                                              : variableOptions}
                                            placeholder="选择变量"
                                            optionFilterProp="label"
                                            onChange={(value) => updateCondition(slotIndex, transitionIndex, conditionIndex, {
                                              ...condition,
                                              variableId: value,
                                            })}
                                          />
                                        </div>
                                        <div className="min-w-0 flex gap-2 items-end">
                                          <div className="w-20">
                                            <label className="block text-xs text-gray-400 mb-1">比较</label>
                                            <Select
                                              value={condition.op}
                                              options={variableOperatorOptions}
                                              className="w-full"
                                              onChange={(value) => updateCondition(slotIndex, transitionIndex, conditionIndex, {
                                                ...condition,
                                                op: value,
                                              })}
                                            showSearch
                                            optionFilterProp="label"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <label className="block text-xs text-gray-400 mb-1">值</label>
                                            <InputNumber
                                              precision={0}
                                              value={condition.value}
                                              className="w-full"
                                              onChange={(value) => updateCondition(slotIndex, transitionIndex, conditionIndex, {
                                                ...condition,
                                                value: inputNumberValue(value),
                                              })}
                                            />
                                          </div>
                                          <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => deleteCondition(slotIndex, transitionIndex, conditionIndex)}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </Space>
                          )}
                        </div>
                      </div>
                    ))}
                  </Space>
                )}
              </div>
            );
          })}
        </Space>
      )}
      <CopyToTargetModal
        open={copyModalOpen}
        title="复制改造规则"
        description={`将当前角色「${actorName}」的改造规则（槽位转换、金币消耗、条件）复制到以下目标角色。目标原有改造规则会被覆盖。`}
        options={copyTargetOptions}
        onConfirm={handleCopyRefitToTargets}
        onCancel={() => setCopyModalOpen(false)}
      />
    </div>
  );
}

export default RefitPanel;
