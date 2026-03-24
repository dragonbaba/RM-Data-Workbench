import { Card, Input, Button, Form, Space, Select } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ToastManager } from '../common/ToastManager';
import { DataLoaderService } from '../../services/DataLoaderService';
import { EventSystem } from '../../core/EventSystem';
import { getEquipTypeOptions, getSystemRecord } from '../../services/EquipDataService';
import { EQUIP_EXTENSIONS_FILE_NAME, getWeaponEquipTypeAtIndex, type EquipExtensionsData } from '../../services/EquipExtensionsService';
import type { RPGItem } from '../../types';

interface CustomAttribute {
  name: string;
  value: number;
  floatValue: number;
}

interface PendingDraftState {
  baseValues?: Record<string, unknown>;
  customFields?: CustomAttribute[];
  hasBaseChanges: boolean;
  hasCustomChanges: boolean;
}

const BASE_ATTRIBUTES: Array<{
  key: string;
  label: string;
  floatLabel: string;
}> = [
  { key: 'mhp', label: '最大生命值', floatLabel: '生命波动' },
  { key: 'mmp', label: '最大魔法值', floatLabel: '魔法波动' },
  { key: 'atk', label: '攻击力', floatLabel: '攻击波动' },
  { key: 'def', label: '防御力', floatLabel: '防御波动' },
  { key: 'mat', label: '魔法攻击力', floatLabel: '魔攻波动' },
  { key: 'mdf', label: '魔法防御力', floatLabel: '魔防波动' },
  { key: 'agi', label: '速度', floatLabel: '速度波动' },
  { key: 'luk', label: '幸运', floatLabel: '幸运波动' },
];

const toIntOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const toFloatOrZero = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const getFloatFieldKey = (key: string) => `${key}_float`;
const EQUIP_TYPE_FIELD_KEY = 'etypeId';
const PRICE_FIELD_KEY = 'price';
const ATTACK_SKILL_FIELD_KEY = 'attackSkillId';
const ATTACK_ELEMENT_FIELD_KEY = 'attackElementId';
const ITEMS_FILE_NAME = 'Items.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const ARMORS_FILE_NAME = 'Armors.json';
const SKILLS_FILE_NAME = 'Skills.json';
const SYSTEM_FILE_NAME = 'System.json';
const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const getDirectoryPath = (filePath: string) => {
  const normalized = (filePath || '').replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
};

const areNumberArraysEqual = (left: unknown, right: number[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return right.every((value, index) => toIntOrZero(left[index]) === value);
};

const buildDataOptions = (data: unknown[] | null, emptyLabel: string) => {
  const options = [{ value: 0, label: `0 : ${emptyLabel}` }];
  if (!Array.isArray(data) || data.length < 2) {
    return options;
  }

  for (let index = 1; index < data.length; index++) {
    const item = data[index] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      continue;
    }

    const id = toIntOrZero(item.id ?? index);
    const rawName = typeof item.name === 'string' ? item.name.trim() : '';
    options.push({
      value: id,
      label: `${id} : ${rawName || `未命名 ${id}`}`,
    });
  }

  return options;
};

const getElementOptions = (systemData: unknown) => {
  const systemRecord = getSystemRecord(systemData);
  const rawElements = Array.isArray(systemRecord?.elements) ? systemRecord.elements : [];
  const options = [{ value: 0, label: '0 : 无元素' }];

  for (let index = 1; index < rawElements.length; index++) {
    const rawName = typeof rawElements[index] === 'string' ? rawElements[index].trim() : '';
    options.push({
      value: index,
      label: `${index} : ${rawName || `元素${index}`}`,
    });
  }

  return options;
};

export function PropertyPanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentData = useEditorStore((state) => state.currentData);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const [form] = Form.useForm();
  const [customFields, setCustomFields] = useState<CustomAttribute[]>([]);
  const [hasBaseChanges, setHasBaseChanges] = useState(false);
  const [hasCustomChanges, setHasCustomChanges] = useState(false);
  const [referenceRevision, setReferenceRevision] = useState(0);
  const pendingDraftRef = useRef<PendingDraftState | null>(null);
  const currentFileName = currentFilePath.split(/[\\/]/).pop()?.toLowerCase() || '';
  const isItemFile = currentFileName === ITEMS_FILE_NAME.toLowerCase();
  const isWeaponItem = currentFileName === WEAPONS_FILE_NAME.toLowerCase();
  const isArmorItem = currentFileName === ARMORS_FILE_NAME.toLowerCase();
  const supportsPrice = isItemFile || isWeaponItem || isArmorItem;
  const systemData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown>(SYSTEM_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const skillsData = useMemo(
    () => DataLoaderService.getCachedDataByName<unknown[]>(SKILLS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const equipExtensionsData = useMemo(
    () => DataLoaderService.getCachedDataByName<EquipExtensionsData>(EQUIP_EXTENSIONS_FILE_NAME),
    [currentFilePath, currentItem, referenceRevision],
  );
  const equipTypeOptions = useMemo(
    () => getEquipTypeOptions(systemData),
    [systemData],
  );
  const skillOptions = useMemo(
    () => buildDataOptions(skillsData, '未选择技能'),
    [skillsData],
  );
  const elementOptions = useMemo(
    () => getElementOptions(systemData),
    [systemData],
  );
  const equipExtensionsFilePath = useMemo(() => {
    return DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME)
      || joinPath(getDirectoryPath(currentFilePath), EQUIP_EXTENSIONS_FILE_NAME);
  }, [currentFilePath, referenceRevision]);

  useEffect(() => {
    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || [EQUIP_EXTENSIONS_FILE_NAME.toLowerCase(), SYSTEM_FILE_NAME.toLowerCase(), SKILLS_FILE_NAME.toLowerCase()].includes(fileName)) {
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

  useEffect(() => {
    if (!isWeaponItem || !currentFilePath) {
      return;
    }

    const dataPath = getDirectoryPath(currentFilePath);
    void DataLoaderService.ensureEquipExtensionsLoaded(dataPath, { force: true }).then((loaded) => {
      if (loaded) {
        setReferenceRevision((value) => value + 1);
      }
    });
  }, [currentFilePath, isWeaponItem]);

  useEffect(() => {
    if (currentItem) {
      const item = currentItem as RPGItem;
      const baseFormValues: Record<string, number> = {};
      for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
        const attr = BASE_ATTRIBUTES[i];
        baseFormValues[attr.key] = item.params?.[i] ?? 0;
        baseFormValues[getFloatFieldKey(attr.key)] = item.floatParams?.[i] ?? 0;
      }
      if (supportsPrice) {
        baseFormValues[PRICE_FIELD_KEY] = toIntOrZero(item.price);
      }
      if (isWeaponItem) {
        baseFormValues[EQUIP_TYPE_FIELD_KEY] = getWeaponEquipTypeAtIndex(equipExtensionsData, currentItemIndex);
        baseFormValues[ATTACK_SKILL_FIELD_KEY] = toIntOrZero(item.attackSkillId);
        baseFormValues[ATTACK_ELEMENT_FIELD_KEY] = toIntOrZero(item.attackElementId);
      }

      const custom: CustomAttribute[] = [];
      const customParams = item.customParams || {};
      Object.entries(customParams).forEach(([name, data]) => {
        if (typeof data === 'object' && data !== null) {
          const d = data as any;
          custom.push({
            name,
            value: d.value || 0,
            floatValue: d.floatValue || 0,
          });
        } else {
          // 兼容旧格式
          custom.push({
            name,
            value: data as number || 0,
            floatValue: 0,
          });
        }
      });

      const pendingDraft = pendingDraftRef.current;
      const nextBaseValues = pendingDraft?.baseValues
        ? { ...baseFormValues, ...pendingDraft.baseValues }
        : baseFormValues;
      const nextCustomFields = pendingDraft?.customFields ?? custom;

      form.setFieldsValue(nextBaseValues);
      setCustomFields(nextCustomFields);
      setHasBaseChanges(pendingDraft?.hasBaseChanges ?? false);
      setHasCustomChanges(pendingDraft?.hasCustomChanges ?? false);
      pendingDraftRef.current = null;
    }
  }, [currentItem, currentItemIndex, equipExtensionsData, form, isWeaponItem, supportsPrice]);

  const handleValuesChange = () => {
    setHasBaseChanges(true);
  };

  const buildCustomParams = (): Record<string, { value: number; floatValue: number }> => {
    const customParams: Record<string, { value: number; floatValue: number }> = {};
    customFields.forEach(({ name, value, floatValue }) => {
      if (name) {
        customParams[name] = { value, floatValue };
      }
    });
    return customParams;
  };

  const updateCurrentItem = (updatedItem: Record<string, unknown>) => {
    if (!currentData || currentItemIndex < 0) return;
    const newData = [...currentData];
    newData[currentItemIndex] = updatedItem as any;

    loadData(newData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
  };

  const updateWeaponEquipType = (typeId: number): boolean => {
    if (!isWeaponItem || currentItemIndex <= 0 || !equipExtensionsFilePath || !equipExtensionsData) {
      return false;
    }

    const currentTypeId = getWeaponEquipTypeAtIndex(equipExtensionsData, currentItemIndex);
    if (currentTypeId === typeId) {
      return false;
    }

    const nextWeaponEquipTypes = [...equipExtensionsData.weaponEquipTypes];
    nextWeaponEquipTypes[currentItemIndex] = typeId;
    const nextExtensions: EquipExtensionsData = {
      ...equipExtensionsData,
      weaponEquipTypes: nextWeaponEquipTypes,
    };

    DataLoaderService.cacheFileData(equipExtensionsFilePath, EQUIP_EXTENSIONS_FILE_NAME, nextExtensions);
    markFileDirty(equipExtensionsFilePath);
    markItemDirty(equipExtensionsFilePath, currentItemIndex);
    setReferenceRevision((value) => value + 1);
    return true;
  };

  const handleSaveBaseAttributes = () => {
    if (!currentData || currentItemIndex < 0) return;

    const values = form.getFieldsValue();
    const newParams: number[] = [];
    const newFloatParams: number[] = [];
    for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
      const attr = BASE_ATTRIBUTES[i];
      newParams[i] = toIntOrZero(values[attr.key]);
      newFloatParams[i] = toFloatOrZero(values[getFloatFieldKey(attr.key)]);
    }
    const nextPrice = supportsPrice ? toIntOrZero(values[PRICE_FIELD_KEY]) : 0;
    const nextAttackSkillId = isWeaponItem ? toIntOrZero(values[ATTACK_SKILL_FIELD_KEY]) : 0;
    const nextAttackElementId = isWeaponItem ? toIntOrZero(values[ATTACK_ELEMENT_FIELD_KEY]) : 0;

    const sourceItem = currentData[currentItemIndex] as RPGItem | null;
    if (!sourceItem) return;

    const shouldUpdateItem = !areNumberArraysEqual(sourceItem.params, newParams)
      || !areNumberArraysEqual(sourceItem.floatParams, newFloatParams)
      || (supportsPrice && toIntOrZero(sourceItem.price) !== nextPrice)
      || (isWeaponItem && toIntOrZero(sourceItem.attackSkillId) !== nextAttackSkillId)
      || (isWeaponItem && toIntOrZero(sourceItem.attackElementId) !== nextAttackElementId);
    const nextEquipTypeId = isWeaponItem ? toIntOrZero(values[EQUIP_TYPE_FIELD_KEY]) : 0;

    if (shouldUpdateItem) {
      pendingDraftRef.current = hasCustomChanges
        ? {
            customFields: customFields.map((field) => ({ ...field })),
            hasBaseChanges: false,
            hasCustomChanges: true,
          }
        : null;

      updateCurrentItem({
        ...sourceItem,
        ...(supportsPrice ? { price: nextPrice } : {}),
        ...(isWeaponItem ? {
          attackSkillId: nextAttackSkillId,
          attackElementId: nextAttackElementId,
        } : {}),
        params: newParams,
        floatParams: newFloatParams,
      });
    }

    const extensionChanged = isWeaponItem ? updateWeaponEquipType(nextEquipTypeId) : false;

    if (!shouldUpdateItem && !extensionChanged) {
      setHasBaseChanges(false);
      ToastManager.info('基础属性没有变化');
      return;
    }

    setHasBaseChanges(false);
    ToastManager.success('基础属性已保存');
  };

  const handleSaveCustomAttributes = () => {
    if (!currentData || currentItemIndex < 0) return;

    const sourceItem = currentData[currentItemIndex] as any;
    if (!sourceItem) return;

    pendingDraftRef.current = hasBaseChanges
      ? {
          baseValues: form.getFieldsValue(),
          hasBaseChanges: true,
          hasCustomChanges: false,
        }
      : null;

    updateCurrentItem({
      ...sourceItem,
      customParams: buildCustomParams(),
    });

    setHasCustomChanges(false);
    ToastManager.success('自定义属性已保存');
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: '', value: 0, floatValue: 0 }]);
    setHasCustomChanges(true);
  };

  const removeCustomField = (index: number) => {
    const newFields = [...customFields];
    newFields.splice(index, 1);
    setCustomFields(newFields);
    setHasCustomChanges(true);
  };

  const updateCustomField = (index: number, field: keyof CustomAttribute, value: string | number) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setCustomFields(newFields);
    setHasCustomChanges(true);
  };

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧项目以加载属性</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-dark-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          属性定义
        </h2>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveBaseAttributes}
            disabled={!hasBaseChanges}
            style={{
              backgroundColor: hasBaseChanges ? 'var(--color-accent)' : undefined,
            }}
          >
            保存基础属性
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveCustomAttributes}
            disabled={!hasCustomChanges}
          >
            保存自定义属性
          </Button>
        </Space>
      </div>

      <Form form={form} onValuesChange={handleValuesChange}>
        <Card
          title="基础属性"
          className="mb-4"
          headStyle={{
            backgroundColor: '#252b3d',
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
          }}
          bodyStyle={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="grid grid-cols-4 gap-x-4 gap-y-4">
            {BASE_ATTRIBUTES.flatMap(({ key, label, floatLabel }) => {
              const floatKey = getFloatFieldKey(key);
              return [
                (
                  <Form.Item
                    key={key}
                    name={key}
                    label={<span className="text-xs text-gray-400">{label}</span>}
                    className="mb-0"
                  >
                    <Input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      className="w-full"
                      placeholder="整数"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                ),
                (
                  <Form.Item
                    key={floatKey}
                    name={floatKey}
                    label={<span className="text-xs text-gray-400">{floatLabel}</span>}
                    className="mb-0"
                  >
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      className="w-full"
                      placeholder="数字"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                ),
              ];
            })}
            {supportsPrice ? (
              <Form.Item
                key={PRICE_FIELD_KEY}
                name={PRICE_FIELD_KEY}
                label={<span className="text-xs text-gray-400">价格</span>}
                className="mb-0"
              >
                <Input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  className="w-full"
                  placeholder="输入价格"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : null}
            {isWeaponItem ? (
              <>
                <Form.Item
                  key={ATTACK_SKILL_FIELD_KEY}
                  name={ATTACK_SKILL_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">攻击技能</span>}
                  className="mb-0"
                >
                  <Select
                    options={skillOptions}
                    className="w-full"
                    placeholder="选择攻击技能"
                  />
                </Form.Item>
                <Form.Item
                  key={ATTACK_ELEMENT_FIELD_KEY}
                  name={ATTACK_ELEMENT_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">攻击元素</span>}
                  className="mb-0"
                >
                  <Select
                    options={elementOptions}
                    className="w-full"
                    placeholder="选择攻击元素"
                  />
                </Form.Item>
                <Form.Item
                  key={EQUIP_TYPE_FIELD_KEY}
                  name={EQUIP_TYPE_FIELD_KEY}
                  label={<span className="text-xs text-gray-400">装备类型</span>}
                  className="mb-0"
                >
                  <Select
                    options={equipTypeOptions}
                    className="w-full"
                    placeholder="选择装备类型"
                  />
                </Form.Item>
              </>
            ) : null}
          </div>
        </Card>
      </Form>

      <Card
        title={
          <div className="flex justify-between items-center">
            <span>自定义属性</span>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={addCustomField}
            >
              添加
            </Button>
          </div>
        }
        headStyle={{
          backgroundColor: '#252b3d',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
        bodyStyle={{ backgroundColor: '#1a1f2e' }}
      >
        {customFields.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无自定义属性</p>
        ) : (
          <Space direction="vertical" className="w-full">
            <div className="flex gap-2 items-center px-1">
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                名称（第1列）
              </span>
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                数值（第2列）
              </span>
              <span className="text-xs text-gray-400" style={{ flex: 1 }}>
                浮动数值（第3列）
              </span>
              <span className="text-xs text-gray-400" style={{ width: 32 }}>
                操作
              </span>
            </div>
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="名称"
                  value={field.name}
                  onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                  style={{ flex: 1 }}
                  aria-label="自定义属性名称"
                />
                <Input
                  type="number"
                  placeholder="数值"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', Number(e.target.value))}
                  style={{ flex: 1 }}
                  aria-label="自定义属性数值"
                />
                <Input
                  type="number"
                  placeholder="浮动数值"
                  value={field.floatValue}
                  onChange={(e) => updateCustomField(index, 'floatValue', Number(e.target.value))}
                  style={{ flex: 1 }}
                  aria-label="自定义属性浮动数值"
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeCustomField(index)}
                />
              </div>
            ))}
          </Space>
        )}
      </Card>

    </div>
  );
}

function getParamLabel(key: string): string {
  const labels: Record<string, string> = {
    mhp: '最大生命值',
    mmp: '最大魔法值',
    atk: '攻击力',
    def: '防御力',
    mat: '魔法攻击力',
    mdf: '魔法防御力',
    agi: '速度',
    luk: '幸运',
  };
  return labels[key] || key;
}

function getParamIndex(key: string): number {
  const indices: Record<string, number> = {
    mhp: 0, mmp: 1, atk: 2, def: 3,
    mat: 4, mdf: 5, agi: 6, luk: 7,
  };
  return indices[key] || 0;
}

export default PropertyPanel;
