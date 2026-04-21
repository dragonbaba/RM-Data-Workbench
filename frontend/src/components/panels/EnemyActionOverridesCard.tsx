import { Card, Form, InputNumber, Select, Switch } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { EnemyAction, RPGEnemy } from '../../types';
import {
  createDefaultEnemyActionOverride,
  normalizeEnemyActionOverride,
} from '../../services/EnemyPropertyService';
import { arePlainDataEqual } from '../../services/PlainDataCompare';

interface EnemyActionOverridesCardProps {
  enemy: RPGEnemy | null;
  skillsData: unknown[] | null | undefined;
  fieldKey: string;
}

const TARGET_CAMP_OPTIONS = [
  { value: 1, label: '1 : 敌方' },
  { value: 2, label: '2 : 我方' },
  { value: 3, label: '3 : 自身' },
  { value: 4, label: '4 : 全阵营' },
];

const TARGET_LIFE_STATE_OPTIONS = [
  { value: 1, label: '1 : 存活' },
  { value: 2, label: '2 : 死亡' },
  { value: 3, label: '3 : 全状态' },
];

const SELECT_MODE_OPTIONS = [
  { value: 1, label: '1 : 单体选中' },
  { value: 2, label: '2 : 全体选中' },
];

const AREA_MODE_OPTIONS = [
  { value: 1, label: '1 : 单体' },
  { value: 2, label: '2 : 范围' },
  { value: 3, label: '3 : 贯穿' },
  { value: 4, label: '4 : 全体' },
];

const AREA_SHAPE_TYPE_OPTIONS = [
  { value: 1, label: '1 : 圆形' },
  { value: 2, label: '2 : 扇形' },
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const getSkillName = (skillsData: unknown[] | null | undefined, skillId: number): string => {
  if (!Array.isArray(skillsData) || skillId <= 0) {
    return `技能 ${skillId}`;
  }
  const skill = skillsData[skillId];
  if (!isRecord(skill)) {
    return `技能 ${skillId}`;
  }
  return typeof skill.name === 'string' && skill.name.trim()
    ? skill.name.trim()
    : `未命名技能 ${skillId}`;
};

const getSkillData = (skillsData: unknown[] | null | undefined, skillId: number): unknown => {
  if (!Array.isArray(skillsData) || skillId <= 0) {
    return {};
  }
  return skillsData[skillId] ?? {};
};

const getActionSkillId = (action: EnemyAction): number => {
  return Math.max(0, toIntOrZero(action.skillId));
};

const getActionKey = (action: EnemyAction): string => {
  return `${getActionSkillId(action)}`;
};

const collectValidActions = (enemy: RPGEnemy | null): EnemyAction[] => {
  const source = Array.isArray(enemy?.actions) ? enemy.actions : [];
  const result: EnemyAction[] = [];
  for (let index = 0; index < source.length; index++) {
    const action = source[index];
    if (isRecord(action) && getActionSkillId(action as EnemyAction) > 0) {
      result.push(action as EnemyAction);
    }
  }
  return result;
};

const hasActionKey = (actions: EnemyAction[], selectedKey: string): boolean => {
  for (let index = 0; index < actions.length; index++) {
    if (getActionKey(actions[index]) === selectedKey) {
      return true;
    }
  }
  return false;
};

const buildActionCountBySkill = (actions: EnemyAction[]): Record<string, number> => {
  const counts: Record<string, number> = Object.create(null);
  for (let index = 0; index < actions.length; index++) {
    const key = getActionKey(actions[index]);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const setFieldIfChanged = (
  form: ReturnType<typeof Form.useFormInstance>,
  fieldKey: string,
  selectedKey: string,
  name: string,
  value: unknown,
) => {
  const path = [fieldKey, selectedKey, name];
  if (form.getFieldValue(path) !== value) {
    form.setFieldValue(path, value);
  }
};

const readScopedIntField = (
  form: ReturnType<typeof Form.useFormInstance>,
  fieldKey: string,
  selectedKey: string,
  name: string,
  fallbackValue: number,
) => {
  const currentValue = form.getFieldValue([fieldKey, selectedKey, name]);
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return fallbackValue;
  }
  return toIntOrZero(currentValue);
};

export function EnemyActionOverridesCard({
  enemy,
  skillsData,
  fieldKey,
}: EnemyActionOverridesCardProps) {
  const form = Form.useFormInstance();
  const actions = useMemo(() => {
    return collectValidActions(enemy);
  }, [enemy]);
  const [selectedKey, setSelectedKey] = useState<string>(() => (actions[0] ? getActionKey(actions[0]) : ''));
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false);

  useEffect(() => {
    if (actions.length === 0) {
      setSelectedKey('');
      return;
    }
    if (!hasActionKey(actions, selectedKey)) {
      setSelectedKey(getActionKey(actions[0]));
    }
  }, [actions, selectedKey]);

  useEffect(() => {
    setManualOverrideEnabled(false);
  }, [selectedKey]);

  const actionCountBySkill = useMemo(() => {
    return buildActionCountBySkill(actions);
  }, [actions]);

  const selectAction = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const key = event.currentTarget.dataset.actionKey;
    if (key) {
      setSelectedKey(key);
    }
  }, []);

  const selectedSkillId = Math.max(0, toIntOrZero(selectedKey));
  const selectedSkillName = getSkillName(skillsData, selectedSkillId);
  const watchedTargetCamp = Form.useWatch([fieldKey, selectedKey || '__none__', 'targetCamp'], form) ?? 1;
  const watchedSelectMode = Form.useWatch([fieldKey, selectedKey || '__none__', 'selectMode'], form) ?? 1;
  const watchedAreaMode = Form.useWatch([fieldKey, selectedKey || '__none__', 'areaMode'], form) ?? 1;
  const watchedShapeType = Form.useWatch([fieldKey, selectedKey || '__none__', 'shapeType'], form) ?? 0;
  const watchedAreaTargetCount = Form.useWatch([fieldKey, selectedKey || '__none__', 'areaTargetCount'], form) ?? 0;
  const watchedOverride = Form.useWatch([fieldKey, selectedKey || '__none__'], form);

  useEffect(() => {
    if (!selectedKey) {
      return;
    }

    let nextTargetLifeState = form.getFieldValue([fieldKey, selectedKey, 'targetLifeState']);
    let nextSelectMode = readScopedIntField(form, fieldKey, selectedKey, 'selectMode', watchedSelectMode);
    let nextAreaMode = readScopedIntField(form, fieldKey, selectedKey, 'areaMode', watchedAreaMode);
    let nextShapeType = readScopedIntField(form, fieldKey, selectedKey, 'shapeType', watchedShapeType);
    let nextAreaTargetCount = readScopedIntField(form, fieldKey, selectedKey, 'areaTargetCount', watchedAreaTargetCount);
    const currentTargetCamp = readScopedIntField(form, fieldKey, selectedKey, 'targetCamp', watchedTargetCamp);

    if (currentTargetCamp === 3) {
      nextTargetLifeState = 1;
      nextSelectMode = 1;
      nextAreaMode = 1;
    } else if (currentTargetCamp === 4) {
      nextSelectMode = 2;
      nextAreaMode = 4;
    } else if (nextSelectMode === 2) {
      nextAreaMode = 4;
    }

    if (nextAreaMode === 1 || nextAreaMode === 4) {
      nextShapeType = 0;
      nextAreaTargetCount = 0;
    } else if (nextAreaMode === 3) {
      nextShapeType = 3;
      nextAreaTargetCount = 0;
    } else {
      nextAreaMode = 2;
      if (nextShapeType !== 1 && nextShapeType !== 2) nextShapeType = 1;
      if (toIntOrZero(nextAreaTargetCount) <= 0) nextAreaTargetCount = 1;
    }

    setFieldIfChanged(form, fieldKey, selectedKey, 'targetLifeState', nextTargetLifeState);
    setFieldIfChanged(form, fieldKey, selectedKey, 'selectMode', nextSelectMode);
    setFieldIfChanged(form, fieldKey, selectedKey, 'areaMode', nextAreaMode);
    setFieldIfChanged(form, fieldKey, selectedKey, 'shapeType', nextShapeType);
    setFieldIfChanged(form, fieldKey, selectedKey, 'areaTargetCount', nextAreaTargetCount);
  }, [
    fieldKey,
    form,
    selectedKey,
    watchedAreaMode,
    watchedAreaTargetCount,
    watchedSelectMode,
    watchedShapeType,
    watchedTargetCamp,
  ]);

  const resetSelectedOverride = () => {
    if (!selectedKey || selectedSkillId <= 0) {
      return;
    }
    form.setFieldValue([fieldKey, selectedKey], createDefaultEnemyActionOverride(selectedSkillId, skillsData));
  };

  const activeShapeType = watchedAreaMode === 3
    ? 3
    : watchedAreaMode === 2
      ? (watchedShapeType === 2 ? 2 : 1)
      : 0;
  const shouldShowTargetCount = watchedAreaMode === 2;
  const shouldShowShapeSelect = watchedAreaMode === 2;
  const shouldShowShapeSection = watchedAreaMode !== 1 && watchedAreaMode !== 4;
  const normalizedSelectedOverride = selectedSkillId > 0
    ? normalizeEnemyActionOverride(watchedOverride, getSkillData(skillsData, selectedSkillId))
    : null;
  const defaultSelectedOverride = selectedSkillId > 0
    ? createDefaultEnemyActionOverride(selectedSkillId, skillsData)
    : null;
  const hasCustomOverride = normalizedSelectedOverride !== null
    && defaultSelectedOverride !== null
    && !arePlainDataEqual(normalizedSelectedOverride, defaultSelectedOverride);
  const isOverrideEnabled = hasCustomOverride || manualOverrideEnabled;
  const switchSelectedOverride = (checked: boolean) => {
    setManualOverrideEnabled(checked);
    if (!checked) {
      resetSelectedOverride();
    }
  };

  return (
    <Card
      title="敌人技能覆盖"
      className="mb-4"
      headStyle={{
        backgroundColor: '#252b3d',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
      }}
      bodyStyle={{ backgroundColor: '#1a1f2e' }}
    >
      <div className="text-xs text-gray-500 mb-4">
        左侧来自敌人 `actions[]`，这里只读。右侧写入 `actionOverrides[skillId]`，相同 skillId 的多条行动共用同一套目标、范围和连续次数。
      </div>
      {actions.length === 0 ? (
        <div className="rounded border border-dashed border-gray-600 px-4 py-6 text-sm text-gray-500 text-center">
          当前敌人没有可配置技能行动。
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-4">
          <div className="space-y-2">
            {actions.map((action, index) => {
              const key = getActionKey(action);
              const skillId = getActionSkillId(action);
              const isShared = (actionCountBySkill[key] ?? 0) > 1;
              return (
                <button
                  key={`${index}-${key}`}
                  type="button"
                  data-action-key={key}
                  className={[
                    'w-full rounded border px-3 py-2 text-left transition-colors',
                    selectedKey === key
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-100'
                      : 'border-gray-700 bg-gray-900/40 text-gray-300 hover:border-gray-500',
                  ].join(' ')}
                  onClick={selectAction}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{skillId} : {getSkillName(skillsData, skillId)}</span>
                    {isShared ? <span className="text-[11px] text-cyan-300">共用</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    rating {toIntOrZero(action.rating)} | condition {toIntOrZero(action.conditionType)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded border border-gray-700 bg-gray-950/30 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-200">{selectedSkillId} : {selectedSkillName}</div>
                <div className="text-xs text-gray-500">
                  当前连续 {normalizedSelectedOverride?.repeatTime ?? 1} 次，重复行动 {normalizedSelectedOverride?.actionRepeat ?? 1} 次
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>覆盖技能范围</span>
                <Switch
                  size="small"
                  checked={isOverrideEnabled}
                  onChange={switchSelectedOverride}
                  checkedChildren="覆盖"
                  unCheckedChildren="默认"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <Form.Item
                name={[fieldKey, selectedKey, 'targetCamp']}
                label={<span className="text-xs text-gray-400">目标阵营</span>}
                className="mb-0"
              >
                <Select options={TARGET_CAMP_OPTIONS} className="w-full" disabled={!isOverrideEnabled} />
              </Form.Item>
              <Form.Item
                name={[fieldKey, selectedKey, 'targetLifeState']}
                label={<span className="text-xs text-gray-400">生命状态</span>}
                className="mb-0"
              >
                <Select
                  options={TARGET_LIFE_STATE_OPTIONS}
                  className="w-full"
                  disabled={!isOverrideEnabled || watchedTargetCamp === 3}
                />
              </Form.Item>
              <Form.Item
                name={[fieldKey, selectedKey, 'selectMode']}
                label={<span className="text-xs text-gray-400">选中模式</span>}
                className="mb-0"
              >
                <Select
                  options={SELECT_MODE_OPTIONS}
                  className="w-full"
                  disabled={!isOverrideEnabled || watchedTargetCamp === 3 || watchedTargetCamp === 4}
                />
              </Form.Item>
              <Form.Item
                name={[fieldKey, selectedKey, 'areaMode']}
                label={<span className="text-xs text-gray-400">范围模式</span>}
                className="mb-0"
              >
                <Select
                  options={AREA_MODE_OPTIONS}
                  className="w-full"
                  disabled={!isOverrideEnabled || watchedTargetCamp === 3 || watchedTargetCamp === 4 || watchedSelectMode === 2}
                />
              </Form.Item>
              {shouldShowShapeSelect ? (
                <Form.Item
                  name={[fieldKey, selectedKey, 'shapeType']}
                  label={<span className="text-xs text-gray-400">范围形状</span>}
                  className="mb-0"
                >
                  <Select options={AREA_SHAPE_TYPE_OPTIONS} className="w-full" disabled={!isOverrideEnabled} />
                </Form.Item>
              ) : null}
              {shouldShowTargetCount ? (
                <Form.Item
                  name={[fieldKey, selectedKey, 'areaTargetCount']}
                  label={<span className="text-xs text-gray-400">范围目标数</span>}
                  className="mb-0"
                >
                  <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                </Form.Item>
              ) : null}
              <Form.Item
                name={[fieldKey, selectedKey, 'repeatTime']}
                label={<span className="text-xs text-gray-400">连续次数</span>}
                className="mb-0"
              >
                <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
              </Form.Item>
              <Form.Item
                name={[fieldKey, selectedKey, 'repeatTimeFloat']}
                label={<span className="text-xs text-gray-400">连续浮动</span>}
                className="mb-0"
              >
                <InputNumber min={0} step={0.01} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
              </Form.Item>
              <Form.Item
                name={[fieldKey, selectedKey, 'actionRepeat']}
                label={<span className="text-xs text-gray-400">重复行动</span>}
                className="mb-0"
              >
                <InputNumber min={1} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
              </Form.Item>
            </div>

            {shouldShowShapeSection ? (
              <div className="mt-4 grid grid-cols-4 gap-x-4 gap-y-4">
                {activeShapeType === 1 ? (
                  <Form.Item
                    name={[fieldKey, selectedKey, 'shapeParams', '1', 'radius']}
                    label={<span className="text-xs text-gray-400">圆形半径</span>}
                    className="mb-0"
                  >
                    <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                  </Form.Item>
                ) : null}
                {activeShapeType === 2 ? (
                  <>
                    <Form.Item
                      name={[fieldKey, selectedKey, 'shapeParams', '2', 'radius']}
                      label={<span className="text-xs text-gray-400">扇形半径</span>}
                      className="mb-0"
                    >
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                    </Form.Item>
                    <Form.Item
                      name={[fieldKey, selectedKey, 'shapeParams', '2', 'angleDeg']}
                      label={<span className="text-xs text-gray-400">扇形角度</span>}
                      className="mb-0"
                    >
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                    </Form.Item>
                  </>
                ) : null}
                {activeShapeType === 3 ? (
                  <>
                    <Form.Item
                      name={[fieldKey, selectedKey, 'shapeParams', '3', 'width']}
                      label={<span className="text-xs text-gray-400">矩形宽度</span>}
                      className="mb-0"
                    >
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                    </Form.Item>
                    <Form.Item
                      name={[fieldKey, selectedKey, 'shapeParams', '3', 'length']}
                      label={<span className="text-xs text-gray-400">矩形长度</span>}
                      className="mb-0"
                    >
                      <InputNumber min={0} step={1} className="w-full" style={{ width: '100%' }} disabled={!isOverrideEnabled} />
                    </Form.Item>
                  </>
                ) : null}
                <div className="col-span-4 text-xs text-gray-500">
                  运行时只读取当前 `skillId` 对应的覆盖对象，不再临时合并技能字段。
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
