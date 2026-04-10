import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Select, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { WriteJSON } from '../../../wailsjs/go/main/App';
import { EventSystem } from '../../core/EventSystem';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { extractSystemRecord, prepareDataForWrite } from '../../services/DataFileFormatService';
import {
  getEquipCandidateOptions,
  getEquipSourceKind,
  getEquipTypes,
  getEquipTypeOptions,
  getSystemWeaponEquipTypes,
  isEquipCandidateValid,
} from '../../services/EquipDataService';
import {
  EQUIP_EXTENSIONS_FILE_NAME,
  getActorEquipStateFromExtensions,
  type EquipExtensionsData,
} from '../../services/EquipExtensionsService';
import { ToastManager } from '../common/ToastManager';

type RecordLike = Record<string, unknown>;
type EquipTypeDraft = { key: string; originalIndex: number | null; name: string };

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const getDisplayName = (item: RecordLike | null, fallback: string) => {
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  return name || fallback;
};

const createDraftKey = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEquipTypeDrafts = (systemData: unknown): EquipTypeDraft[] => {
  const equipTypes = getEquipTypes(systemData);
  const result: EquipTypeDraft[] = [];

  for (let index = 1; index < equipTypes.length; index++) {
    result.push({
      key: `type-${index}`,
      originalIndex: index,
      name: equipTypes[index] || '',
    });
  }

  return result;
};

const buildWeaponEquipTypeDrafts = (extensionsData: EquipExtensionsData | null, equipTypeDrafts: EquipTypeDraft[]): string[] => {
  const indexToKey = new Map<number, string>();
  equipTypeDrafts.forEach((draft, index) => {
    indexToKey.set(index + 1, draft.key);
  });

  return getSystemWeaponEquipTypes(extensionsData)
    .map((value) => indexToKey.get(value) || '')
    .filter((value) => !!value);
};

export function EquipPanel() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentFile = useEditorStore((state) => state.currentFile);
  const config = useEditorStore((state) => state.config);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const getDirtyItemIndexes = useEditorStore((state) => state.getDirtyItemIndexes);
  const isFileDirty = useEditorStore((state) => state.isFileDirty);
  const markFileClean = useEditorStore((state) => state.markFileClean);

  const [referenceRevision, setReferenceRevision] = useState(0);
  const [equipTypeDrafts, setEquipTypeDrafts] = useState<EquipTypeDraft[]>([]);
  const [weaponEquipTypeDrafts, setWeaponEquipTypeDrafts] = useState<string[]>([]);

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || ['actors.json', 'weapons.json', 'armors.json', 'system.json', EQUIP_EXTENSIONS_FILE_NAME.toLowerCase()].includes(fileName)) {
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

  const weaponsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>('Weapons.json'),
    [referenceRevision],
  );
  const armorsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>('Armors.json'),
    [referenceRevision],
  );
  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>('System.json'),
    [referenceRevision],
  );
  const equipExtensionsData = useMemo(
    () => DataLoaderService.getCachedDataByName<EquipExtensionsData>(EQUIP_EXTENSIONS_FILE_NAME),
    [referenceRevision],
  );

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
  const equipTypeOptions = useMemo(() => getEquipTypeOptions(systemData), [systemData]);
  const weaponEquipTypes = useMemo(() => getSystemWeaponEquipTypes(equipExtensionsData), [equipExtensionsData]);

  const systemFilePath = useMemo(() => {
    return DataLoaderService.getFilePathByName('System.json') || joinPath(config.dataPath, 'System.json');
  }, [config.dataPath, referenceRevision]);
  const equipExtensionsFilePath = useMemo(() => {
    return DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME) || joinPath(config.dataPath, EQUIP_EXTENSIONS_FILE_NAME);
  }, [config.dataPath, referenceRevision]);

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

  useEffect(() => {
    const nextEquipTypeDrafts = buildEquipTypeDrafts(systemData);
    setEquipTypeDrafts(nextEquipTypeDrafts);
    setWeaponEquipTypeDrafts(buildWeaponEquipTypeDrafts(equipExtensionsData, nextEquipTypeDrafts));
  }, [systemData, equipExtensionsData]);

  const applyActorUpdate = useCallback((nextEquipSlots: number[], nextEquips: number[]) => {
    if (currentItemIndex <= 0 || !equipExtensionsFilePath || !equipExtensionsData) {
      return;
    }

    const nextActorEquipSlots = [...equipExtensionsData.actorEquipSlots];
    const nextActorEquips = [...equipExtensionsData.actorEquips];
    nextActorEquipSlots[currentItemIndex] = [...nextEquipSlots];
    nextActorEquips[currentItemIndex] = [...nextEquips];

    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      actorEquipSlots: nextActorEquipSlots,
      actorEquips: nextActorEquips,
    };

    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    markItemDirty(equipExtensionsFilePath, currentItemIndex);
    setReferenceRevision((value) => value + 1);
  }, [currentItemIndex, equipExtensionsData, equipExtensionsFilePath, markFileDirty, markItemDirty]);

  const updateSlotType = useCallback((slotIndex: number, nextTypeId: number) => {
    const nextEquipSlots = [...actorEquipState.equipSlots];
    const nextEquips = [...actorEquipState.equips];
    nextEquipSlots[slotIndex] = nextTypeId;

    const nextCandidates = getEquipCandidateOptions(
      nextTypeId,
      weaponEquipTypes,
      equipExtensionsData?.weaponEquipTypes,
      weaponsData,
      armorsData,
    );
    if (!isEquipCandidateValid(nextEquips[slotIndex] || 0, nextCandidates)) {
      nextEquips[slotIndex] = 0;
    }

    applyActorUpdate(nextEquipSlots, nextEquips);
  }, [actorEquipState.equipSlots, actorEquipState.equips, applyActorUpdate, armorsData, equipExtensionsData?.weaponEquipTypes, weaponEquipTypes, weaponsData]);

  const updateEquipValue = useCallback((slotIndex: number, equipId: number) => {
    const nextEquips = [...actorEquipState.equips];
    nextEquips[slotIndex] = equipId;
    applyActorUpdate([...actorEquipState.equipSlots], nextEquips);
  }, [actorEquipState.equipSlots, actorEquipState.equips, applyActorUpdate]);

  const addSlot = useCallback(() => {
    applyActorUpdate(
      [...actorEquipState.equipSlots, 0],
      [...actorEquipState.equips, 0],
    );
  }, [actorEquipState.equipSlots, actorEquipState.equips, applyActorUpdate]);

  const removeSlot = useCallback((slotIndex: number) => {
    const nextEquipSlots = [...actorEquipState.equipSlots];
    const nextEquips = [...actorEquipState.equips];
    nextEquipSlots.splice(slotIndex, 1);
    nextEquips.splice(slotIndex, 1);
    applyActorUpdate(nextEquipSlots, nextEquips);
  }, [actorEquipState.equipSlots, actorEquipState.equips, applyActorUpdate]);

  const addEquipTypeDraft = useCallback(() => {
    setEquipTypeDrafts((current) => [...current, {
      key: createDraftKey(),
      originalIndex: null,
      name: '',
    }]);
  }, []);

  const updateEquipTypeDraft = useCallback((draftKey: string, nextName: string) => {
    setEquipTypeDrafts((current) => current.map((draft) => (
      draft.key === draftKey ? { ...draft, name: nextName } : draft
    )));
  }, []);

  const deleteEquipTypeDraft = useCallback((draftKey: string) => {
    setEquipTypeDrafts((current) => current.filter((draft) => draft.key !== draftKey));
    setWeaponEquipTypeDrafts((current) => current.filter((value) => value !== draftKey));
  }, []);

  const addWeaponEquipTypeDraft = useCallback(() => {
    const firstDraftKey = equipTypeDrafts[0]?.key || '';
    if (!firstDraftKey) {
      ToastManager.warning('请先添加装备类型');
      return;
    }
    setWeaponEquipTypeDrafts((current) => [...current, firstDraftKey]);
  }, [equipTypeDrafts]);

  const updateWeaponEquipTypeDraft = useCallback((index: number, draftKey: string) => {
    setWeaponEquipTypeDrafts((current) => current.map((value, currentIndex) => (
      currentIndex === index ? draftKey : value
    )));
  }, []);

  const deleteWeaponEquipTypeDraft = useCallback((index: number) => {
    setWeaponEquipTypeDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const saveSystemConfig = useCallback(() => {
    if (!systemFilePath) {
      ToastManager.error('系统数据未加载');
      return;
    }

    if (!equipExtensionsFilePath || !equipExtensionsData) {
      ToastManager.error('装备扩展数据未加载');
      return;
    }

    const sourceSystem = extractSystemRecord(systemData);
    if (!sourceSystem) {
      ToastManager.error('系统数据未加载');
      return;
    }

    const normalizedEquipTypeDrafts = equipTypeDrafts
      .map((draft) => ({ ...draft, name: draft.name.trim() }))
      .filter((draft) => draft.name);

    const nextEquipTypes = [''];
    const nextIndexByDraftKey = new Map<string, number>();
    const nextIndexByOriginalIndex = new Map<number, number>();

    normalizedEquipTypeDrafts.forEach((draft) => {
      const nextIndex = nextEquipTypes.push(draft.name) - 1;
      nextIndexByDraftKey.set(draft.key, nextIndex);
      if (draft.originalIndex !== null) {
        nextIndexByOriginalIndex.set(draft.originalIndex, nextIndex);
      }
    });

    const nextWeaponEquipTypes = Array.from(new Set(
      weaponEquipTypeDrafts
        .map((draftKey) => nextIndexByDraftKey.get(draftKey) || 0)
        .filter((value) => value > 0),
    ));

    const nextSystemData = [null, {
      ...(sourceSystem as RecordLike),
      equipTypes: nextEquipTypes,
    }] as unknown[];
    const nextActorEquipSlots = [...equipExtensionsData.actorEquipSlots];
    for (let index = 1; index < nextActorEquipSlots.length; index++) {
      const currentSlots = Array.isArray(nextActorEquipSlots[index]) ? [...(nextActorEquipSlots[index] as number[])] : [];
      nextActorEquipSlots[index] = currentSlots.map((slotTypeId) => {
        if (slotTypeId <= 0) return 0;
        return nextIndexByOriginalIndex.get(slotTypeId) || 0;
      });
    }

    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      systemWeaponEquipTypes: nextWeaponEquipTypes,
      actorEquipSlots: nextActorEquipSlots,
    };

    DataLoaderService.cacheFileData(systemFilePath, 'System.json', nextSystemData);
    markFileDirty(systemFilePath);
    markItemDirty(systemFilePath, 1);
    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    for (let index = 1; index < nextActorEquipSlots.length; index++) {
      markItemDirty(equipExtensionsFilePath, index);
    }

    setReferenceRevision((value) => value + 1);
    ToastManager.success('系统装备配置已保存');
  }, [
    equipTypeDrafts,
    equipExtensionsData,
    equipExtensionsFilePath,
    markFileDirty,
    markItemDirty,
    systemData,
    systemFilePath,
    weaponEquipTypeDrafts,
  ]);

  const hasCurrentActorChanges = useMemo(() => {
    if (!equipExtensionsFilePath || currentItemIndex <= 0) {
      return false;
    }
    return getDirtyItemIndexes(equipExtensionsFilePath).includes(currentItemIndex);
  }, [currentItemIndex, equipExtensionsFilePath, getDirtyItemIndexes]);

  const hasEquipExtensionChanges = useMemo(() => {
    if (!equipExtensionsFilePath) {
      return false;
    }
    return isFileDirty(equipExtensionsFilePath);
  }, [equipExtensionsFilePath, isFileDirty]);

  const saveCurrentActor = useCallback(async () => {
    if (!equipExtensionsFilePath || !equipExtensionsData) {
      ToastManager.error('装备扩展数据未加载');
      return;
    }

    try {
      await WriteJSON(equipExtensionsFilePath, prepareDataForWrite(equipExtensionsFilePath, equipExtensionsData));
      markFileClean(equipExtensionsFilePath);
      ToastManager.success('当前角色装备已保存');
      setReferenceRevision((value) => value + 1);
    } catch (error) {
      console.error('Failed to save equip extensions:', error);
      ToastManager.error('保存当前角色失败');
    }
  }, [equipExtensionsData, equipExtensionsFilePath, markFileClean]);

  if (!Array.isArray(currentData) || currentFile.toLowerCase() !== 'actors.json' || !actor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0e17]">
        <Empty description="装备模式仅在角色数据上可用" />
      </div>
    );
  }

  const actorName = getDisplayName(actor, `角色 ${currentItemIndex}`);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0e17]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>装备模式</h2>
          <div className="text-xs text-gray-400 mt-1">
            当前角色:
            <Tag color="cyan" className="ml-2">{actorName}</Tag>
            <Tag color="blue">槽位 {actorEquipState.equips.length}</Tag>
            {hasCurrentActorChanges && <Tag color="gold">当前角色已修改</Tag>}
            {!hasCurrentActorChanges && hasEquipExtensionChanges && <Tag color="orange">扩展数据已修改</Tag>}
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
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addSlot}
          >
            添加一行
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="角色装备与装备槽" className="xl:col-span-2">
          {actorEquipState.equips.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              当前角色还没有装备行，点击上方“添加一行”开始定义。
            </div>
          ) : (
            <Space direction="vertical" className="w-full">
              {actorEquipState.equips.map((equipId, slotIndex) => {
                const slotTypeId = actorEquipState.equipSlots[slotIndex] || 0;
                const sourceKind = getEquipSourceKind(slotTypeId, weaponEquipTypes);
                const equipOptions = getEquipCandidateOptions(
                  slotTypeId,
                  weaponEquipTypes,
                  equipExtensionsData?.weaponEquipTypes,
                  weaponsData,
                  armorsData,
                );
                return (
                  <Card
                    key={`equip-slot-${slotIndex}`}
                    size="small"
                    title={`槽位 ${slotIndex + 1}`}
                    extra={(
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeSlot(slotIndex)}
                      />
                    )}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr,auto] gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">装备槽类型</label>
                        <Select
                          value={slotTypeId}
                          options={equipTypeOptions}
                          className="w-full"
                          onChange={(value) => updateSlotType(slotIndex, Number(value || 0))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">装备</label>
                        <Select
                          value={equipId || 0}
                          options={equipOptions}
                          className="w-full"
                          onChange={(value) => updateEquipValue(slotIndex, Number(value || 0))}
                        />
                      </div>

                      <div className="pb-1">
                        <Tag color={sourceKind === 'weapon' ? 'volcano' : sourceKind === 'armor' ? 'geekblue' : 'default'}>
                          {sourceKind === 'weapon' ? '武器来源' : sourceKind === 'armor' ? '防具来源' : '无类型'}
                        </Tag>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </Space>
          )}
        </Card>

        <Space direction="vertical" className="w-full">
          <Card title="当前角色摘要">
            <Space direction="vertical" className="w-full">
              <div className="text-sm text-gray-300">
                角色名称:
                <span className="ml-2 text-white">{actorName}</span>
              </div>
              <div className="text-sm text-gray-300">
                装备槽数量:
                <span className="ml-2 text-white">{actorEquipState.equips.length}</span>
              </div>
              <Typography.Text type="secondary">
                每一行左侧是 `EquipExtensions.json.actorEquipSlots[index]`，右侧是 `EquipExtensions.json.actorEquips[index]`。添加和删除都会同时作用于这一行的槽位和装备数据。
              </Typography.Text>
            </Space>
          </Card>

          <Card
            title="系统装备类型规则"
            extra={(
              <Button type="primary" icon={<SaveOutlined />} onClick={saveSystemConfig}>
                保存系统配置
              </Button>
            )}
          >
            <Space direction="vertical" className="w-full">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-gray-400">equipTypes</label>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addEquipTypeDraft}>
                    添加类型
                  </Button>
                </div>

                {equipTypeDrafts.length === 0 ? (
                  <div className="text-xs text-gray-500">当前还没有自定义装备类型。</div>
                ) : (
                  <Space direction="vertical" className="w-full">
                    {equipTypeDrafts.map((draft, index) => (
                      <div key={draft.key} className="grid grid-cols-[48px,1fr,auto] gap-2 items-center">
                        <Tag color="blue">{index + 1}</Tag>
                        <Input
                          value={draft.name}
                          onChange={(event) => updateEquipTypeDraft(draft.key, event.target.value)}
                          placeholder="输入装备类型名称"
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => deleteEquipTypeDraft(draft.key)}
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-gray-400">weaponEquipTypes</label>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addWeaponEquipTypeDraft}>
                    添加武器类型
                  </Button>
                </div>

                {weaponEquipTypeDrafts.length === 0 ? (
                  <div className="text-xs text-gray-500">当前还没有武器装备类型定义。</div>
                ) : (
                  <Space direction="vertical" className="w-full">
                    {weaponEquipTypeDrafts.map((draftKey, index) => (
                      <div key={`weapon-type-${index}`} className="grid grid-cols-[1fr,auto] gap-2 items-center">
                        <Select
                          value={draftKey || undefined}
                          className="w-full"
                          placeholder="选择武器装备类型"
                          options={equipTypeDrafts
                            .map((draft, draftIndex) => ({
                              value: draft.key,
                              label: `${draftIndex + 1} : ${draft.name.trim() || `类型${draftIndex + 1}`}`,
                            }))}
                          onChange={(value) => updateWeaponEquipTypeDraft(index, String(value || ''))}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => deleteWeaponEquipTypeDraft(index)}
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </div>

              <Typography.Text type="secondary">
                保存后，`equipTypes` 会写入 `System.json.equipTypes`，`weaponEquipTypes` 会写入 `EquipExtensions.json.systemWeaponEquipTypes`。若删除了装备类型，角色槽位中的旧索引会自动重映射或回落为 0。
              </Typography.Text>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}

export default EquipPanel;
