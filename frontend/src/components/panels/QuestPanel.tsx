import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Input, Button, Select, Checkbox, Collapse, Space, Tag, Badge, InputNumber, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../stores/editorStore';
import type { RPGQuest, QuestObjective, QuestReward, QuestRequirement, SwitchAction, VariableAction } from '../../types';
import { ToastManager } from '../common/ToastManager';
import { InputDialog } from '../common/InputDialog';
import { DataLoaderService } from '../../services/DataLoaderService';
import { EventSystem } from '../../core/EventSystem';
import {
  buildQuestDependencySummary,
  type QuestDependencyIssue,
  type QuestDependencySummary,
} from '../../services/QuestDependencyService';

const { Panel } = Collapse;
const { TextArea } = Input;

const REQUIREMENT_TYPES = [
  { value: 0, label: '无要求' },
  { value: 1, label: '等级要求' },
  { value: 2, label: '前置任务' },
  { value: 3, label: '物品' },
  { value: 4, label: '武器' },
  { value: 5, label: '防具' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' },
  { value: 8, label: '金币' },
];

const OBJECTIVE_TYPES = [
  { value: 1, label: '击杀敌人' },
  { value: 2, label: '收集物品' },
  { value: 3, label: '收集武器' },
  { value: 4, label: '收集防具' },
  { value: 5, label: '开关值' },
  { value: 6, label: '变量值' },
  { value: 7, label: '收集金币' },
];

const REWARD_TYPES = [
  { value: 1, label: '物品' },
  { value: 2, label: '武器' },
  { value: 3, label: '防具' },
  { value: 4, label: '金币' },
  { value: 5, label: '经验值' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' },
];

const DIFFICULTIES = [
  { value: 1, label: '易', color: 'green' },
  { value: 2, label: '普通', color: 'blue' },
  { value: 3, label: '困难', color: 'orange' },
  { value: 4, label: '专家', color: 'red' },
  { value: 5, label: '大师', color: 'purple' },
];

const OPERATORS = ['>', '>=', '<', '<=', '===', '!=='];
const VARIABLE_OPERATORS = ['+', '-', '*', '/', '='];

type SwitchActionKey = 'startSwitches' | 'switches';
type VariableActionKey = 'startVariables' | 'variables';

interface DataItem {
  id: number;
  name: string;
}

const createDefaultQuest = (): RPGQuest => ({
  title: '新任务',
  giver: 'NPC',
  category: true,
  repeatable: false,
  difficulty: 1,
  description: ['描述'],
  requirements: [],
  objectives: [
    {
      type: 1,
      enemyId: 1,
      targetValue: 1,
      calculateType: true,
      operator: '>=',
      description: '击杀1个敌人',
      switches: [],
      variables: [],
    },
  ],
  rewards: [
    {
      type: 4,
      targetValue: 100,
      description: '获得100金币',
    },
  ],
  startSwitches: [],
  switches: [],
  startVariables: [],
  variables: [],
});

const cloneQuest = (source: RPGQuest, overrides: Partial<RPGQuest> = {}): RPGQuest => ({
  ...source,
  ...overrides,
  description: Array.isArray(source.description) ? [...source.description] : [],
  requirements: Array.isArray(source.requirements) ? source.requirements.map((item) => ({ ...item })) : [],
  objectives: Array.isArray(source.objectives)
    ? source.objectives.map((item) => ({
      ...item,
      switches: Array.isArray(item.switches) ? item.switches.map((action) => ({ ...action })) : [],
      variables: Array.isArray(item.variables) ? item.variables.map((action) => ({ ...action })) : [],
    }))
    : [],
  rewards: Array.isArray(source.rewards) ? source.rewards.map((item) => ({ ...item })) : [],
  startSwitches: Array.isArray(source.startSwitches) ? source.startSwitches.map((item) => ({ ...item })) : [],
  switches: Array.isArray(source.switches) ? source.switches.map((item) => ({ ...item })) : [],
  startVariables: Array.isArray(source.startVariables) ? source.startVariables.map((item) => ({ ...item })) : [],
  variables: Array.isArray(source.variables) ? source.variables.map((item) => ({ ...item })) : [],
});

export function QuestPanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentData = useEditorStore((state) => state.currentData);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const config = useEditorStore((state) => state.config);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>(['template', 'basic', 'actions', 'chain', 'objectives', 'rewards']);
  const [dataOptions, setDataOptions] = useState({
    actors: [] as DataItem[],
    enemies: [] as DataItem[],
    items: [] as DataItem[],
    weapons: [] as DataItem[],
    armors: [] as DataItem[],
    quests: [] as DataItem[],
    switches: [] as DataItem[],
    variables: [] as DataItem[],
  });

  const quest = currentItem as RPGQuest | null;
  const questData = useMemo(() => (Array.isArray(currentData) ? (currentData as (RPGQuest | null)[]) : null), [currentData]);
  const [dependencySummary, setDependencySummary] = useState<QuestDependencySummary>(() =>
    buildQuestDependencySummary(questData, currentItemIndex),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDependencySummary(buildQuestDependencySummary(questData, currentItemIndex));
    }, 80);
    return () => clearTimeout(timer);
  }, [questData, currentItemIndex]);

  const formatDependencyIssue = useCallback((issue: QuestDependencyIssue): string => {
    if (issue.type === 'missing') {
      return `任务 #${issue.questIndex}（${issue.questTitle}）引用了不存在的前置任务 #${issue.targetQuestId}`;
    }
    if (issue.type === 'self') {
      return `任务 #${issue.questIndex}（${issue.questTitle}）存在自引用依赖`;
    }
    if (issue.type === 'cycle') {
      const path = Array.isArray(issue.path) ? issue.path.join(' -> ') : '';
      return `检测到环依赖：${path || `任务 #${issue.questIndex}`}`;
    }
    return `任务 #${issue.questIndex} 存在依赖异常`;
  }, []);

  const extractDataItems = (data: unknown[] | null): DataItem[] => {
    if (!data || !Array.isArray(data) || data.length < 2) return [];
    return data.slice(1).map((item: any, index) => ({
      id: item?.id ?? index + 1,
      name: item?.name || `未命名 ${index + 1}`,
    }));
  };

  const extractSystemData = (systemData: unknown[] | null): { switches: DataItem[], variables: DataItem[] } => {
    if (!systemData || !Array.isArray(systemData) || systemData.length < 2) {
      return { switches: [], variables: [] };
    }
    const system = systemData[1] as any;
    const switches: DataItem[] = [];
    const variables: DataItem[] = [];

    if (Array.isArray(system?.switches)) {
      system.switches.forEach((name: string, index: number) => {
        if (name) switches.push({ id: index, name });
      });
    }
    if (Array.isArray(system?.variables)) {
      system.variables.forEach((name: string, index: number) => {
        if (name) variables.push({ id: index, name });
      });
    }

    return { switches, variables };
  };

  useEffect(() => {
    const loadDataOptions = () => {
      const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
      const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
      const itemsData = DataLoaderService.getCachedDataByName('Items.json');
      const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
      const armorsData = DataLoaderService.getCachedDataByName('Armors.json');
      const questsData = DataLoaderService.getCachedDataByName('Quests.json');
      const systemData = DataLoaderService.getCachedDataByName('System.json');

      const { switches, variables } = extractSystemData(systemData);
      setDataOptions({
        actors: extractDataItems(actorsData),
        enemies: extractDataItems(enemiesData),
        items: extractDataItems(itemsData),
        weapons: extractDataItems(weaponsData),
        armors: extractDataItems(armorsData),
        quests: extractDataItems(questsData),
        switches,
        variables,
      });
    };

    loadDataOptions();
    EventSystem.on('data:file-loaded', loadDataOptions);
    const retryTimer = setTimeout(() => {
      const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
      if (!enemiesData || enemiesData.length < 2) {
        loadDataOptions();
      }
    }, 500);

    return () => {
      EventSystem.off('data:file-loaded', loadDataOptions);
      clearTimeout(retryTimer);
    };
  }, [config.dataPath, config.projectRoot]);

  const getSelectOptions = (items: DataItem[]) => {
    return items.map((item) => ({
      value: item.id || 0,
      label: `${item.id} : ${item.name}`,
    }));
  };

  const selectQuestByIndex = useCallback((index: number) => {
    if (index <= 0) return;
    const { selectItem } = useEditorStore.getState();
    selectItem(index);
  }, []);

  const getDefaultOptionId = useCallback((items: DataItem[]) => items[0]?.id ?? 1, []);

  const applyQuestDataAndSelect = useCallback((nextData: (RPGQuest | null)[], nextIndex: number) => {
    const { loadData, selectItem } = useEditorStore.getState();
    loadData(nextData as any[], currentFilePath || '', 'quest');
    const clamped = Math.min(Math.max(nextIndex, 1), Math.max(nextData.length - 1, 1));
    selectItem(clamped);
    setDataOptions((prev) => ({ ...prev, quests: extractDataItems(nextData as unknown[]) }));
    setHasChanges(true);
  }, [currentFilePath]);

  const updateQuest = useCallback((updates: Partial<RPGQuest>) => {
    if (!quest || !currentData || currentItemIndex < 0) return;
    const updatedQuest = { ...quest, ...updates };
    const newData = [...currentData];
    newData[currentItemIndex] = updatedQuest;
    const { loadData } = useEditorStore.getState();
    loadData(newData as any[], currentFilePath || '', 'quest');
    setHasChanges(true);
  }, [quest, currentData, currentItemIndex, currentFilePath]);

  const handleSave = useCallback(() => {
    if (!currentFilePath) return;
    markFileDirty(currentFilePath);
    setHasChanges(false);
    const currentSummary = buildQuestDependencySummary(questData, currentItemIndex);
    setDependencySummary(currentSummary);
    if (currentSummary.issues.length > 0) {
      ToastManager.warning(`任务已保存，但检测到 ${currentSummary.issues.length} 个依赖问题`);
      return;
    }
    ToastManager.success('任务已保存');
  }, [currentFilePath, currentItemIndex, markFileDirty, questData]);

  const handleCreateQuest = useCallback(() => {
    if (!currentData) return;
    const nextData = [...currentData, createDefaultQuest()] as (RPGQuest | null)[];
    applyQuestDataAndSelect(nextData, nextData.length - 1);
    ToastManager.success('已新建任务');
  }, [currentData, applyQuestDataAndSelect]);

  const handleCopy = useCallback(async () => {
    if (!quest || !currentData) return;
    const newTitle = await InputDialog.show({
      title: '复制任务',
      placeholder: '输入新任务标题',
      defaultValue: `${quest.title} (复制)`,
    });
    if (!newTitle) return;

    const copiedQuest = cloneQuest(quest, { title: newTitle, id: undefined });
    const nextData = [...currentData, copiedQuest] as (RPGQuest | null)[];
    applyQuestDataAndSelect(nextData, nextData.length - 1);
    ToastManager.success('任务已复制');
  }, [quest, currentData, applyQuestDataAndSelect]);

  const handleDeleteQuest = useCallback(() => {
    if (!currentData || currentItemIndex <= 0) return;
    if (currentData.length <= 2) {
      applyQuestDataAndSelect([null, createDefaultQuest()], 1);
      ToastManager.success('已删除任务（保留默认任务）');
      return;
    }
    const nextData = [...currentData] as (RPGQuest | null)[];
    nextData.splice(currentItemIndex, 1);
    const nextIndex = Math.min(currentItemIndex, nextData.length - 1);
    applyQuestDataAndSelect(nextData, nextIndex);
    ToastManager.success('任务已删除');
  }, [currentData, currentItemIndex, applyQuestDataAndSelect]);

  const addObjective = useCallback(() => {
    const newObjective: QuestObjective = {
      type: 1,
      enemyId: 1,
      targetValue: 1,
      calculateType: true,
      operator: '>=',
      description: '击杀1个敌人',
      switches: [],
      variables: [],
    };
    updateQuest({ objectives: [...(quest?.objectives || []), newObjective] });
  }, [quest, updateQuest]);

  const updateObjective = useCallback((index: number, updates: Partial<QuestObjective>) => {
    const objectives = [...(quest?.objectives || [])];
    objectives[index] = { ...objectives[index], ...updates };
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  const removeObjective = useCallback((index: number) => {
    const objectives = [...(quest?.objectives || [])];
    objectives.splice(index, 1);
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  const addReward = useCallback(() => {
    const newReward: QuestReward = { type: 4, targetValue: 100, description: '获得100金币' };
    updateQuest({ rewards: [...(quest?.rewards || []), newReward] });
  }, [quest, updateQuest]);

  const updateReward = useCallback((index: number, updates: Partial<QuestReward>) => {
    const rewards = [...(quest?.rewards || [])];
    rewards[index] = { ...rewards[index], ...updates };
    updateQuest({ rewards });
  }, [quest, updateQuest]);

  const removeReward = useCallback((index: number) => {
    const rewards = [...(quest?.rewards || [])];
    rewards.splice(index, 1);
    updateQuest({ rewards });
  }, [quest, updateQuest]);

  const addRequirement = useCallback(() => {
    const requirement: QuestRequirement = {
      type: 1,
      description: '等级要求',
      targetValue: 1,
      actorId: 1,
      operator: '>=',
    };
    updateQuest({ requirements: [...(quest?.requirements || []), requirement] });
  }, [quest, updateQuest]);

  const updateRequirement = useCallback((index: number, updates: Partial<QuestRequirement>) => {
    const requirements = [...(quest?.requirements || [])];
    requirements[index] = { ...requirements[index], ...updates };
    updateQuest({ requirements });
  }, [quest, updateQuest]);

  const removeRequirement = useCallback((index: number) => {
    const requirements = [...(quest?.requirements || [])];
    requirements.splice(index, 1);
    updateQuest({ requirements });
  }, [quest, updateQuest]);

  const addSwitchAction = useCallback((type: 'start' | 'complete') => {
    const action: SwitchAction = { switchId: getDefaultOptionId(dataOptions.switches), value: true };
    const key: SwitchActionKey = type === 'start' ? 'startSwitches' : 'switches';
    updateQuest({ [key]: [...(quest?.[key] || []), action] } as Partial<RPGQuest>);
  }, [quest, dataOptions.switches, getDefaultOptionId, updateQuest]);

  const addVariableAction = useCallback((type: 'start' | 'complete') => {
    const action: VariableAction = { variableId: getDefaultOptionId(dataOptions.variables), value: 0, op: '=' };
    const key: VariableActionKey = type === 'start' ? 'startVariables' : 'variables';
    updateQuest({ [key]: [...(quest?.[key] || []), action] } as Partial<RPGQuest>);
  }, [quest, dataOptions.variables, getDefaultOptionId, updateQuest]);

  const updateSwitchAction = useCallback((key: SwitchActionKey, actionIndex: number, updates: Partial<SwitchAction>) => {
    const actions = [...(quest?.[key] || [])];
    if (!actions[actionIndex]) return;
    actions[actionIndex] = { ...actions[actionIndex], ...updates };
    updateQuest({ [key]: actions } as Partial<RPGQuest>);
  }, [quest, updateQuest]);

  const removeSwitchAction = useCallback((key: SwitchActionKey, actionIndex: number) => {
    const actions = [...(quest?.[key] || [])];
    actions.splice(actionIndex, 1);
    updateQuest({ [key]: actions } as Partial<RPGQuest>);
  }, [quest, updateQuest]);

  const updateVariableAction = useCallback((key: VariableActionKey, actionIndex: number, updates: Partial<VariableAction>) => {
    const actions = [...(quest?.[key] || [])];
    if (!actions[actionIndex]) return;
    actions[actionIndex] = { ...actions[actionIndex], ...updates };
    updateQuest({ [key]: actions } as Partial<RPGQuest>);
  }, [quest, updateQuest]);

  const removeVariableAction = useCallback((key: VariableActionKey, actionIndex: number) => {
    const actions = [...(quest?.[key] || [])];
    actions.splice(actionIndex, 1);
    updateQuest({ [key]: actions } as Partial<RPGQuest>);
  }, [quest, updateQuest]);

  const addObjectiveSwitchAction = useCallback((objectiveIndex: number) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const switches = [...(objective.switches || []), { switchId: getDefaultOptionId(dataOptions.switches), value: true }];
    objectives[objectiveIndex] = { ...objective, switches };
    updateQuest({ objectives });
  }, [quest, dataOptions.switches, getDefaultOptionId, updateQuest]);

  const addObjectiveVariableAction = useCallback((objectiveIndex: number) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const variables = [...(objective.variables || []), { variableId: getDefaultOptionId(dataOptions.variables), value: 0, op: '+' }];
    objectives[objectiveIndex] = { ...objective, variables };
    updateQuest({ objectives });
  }, [quest, dataOptions.variables, getDefaultOptionId, updateQuest]);

  const updateObjectiveSwitchAction = useCallback((objectiveIndex: number, actionIndex: number, updates: Partial<SwitchAction>) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const switches = [...(objective.switches || [])];
    if (!switches[actionIndex]) return;
    switches[actionIndex] = { ...switches[actionIndex], ...updates };
    objectives[objectiveIndex] = { ...objective, switches };
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  const updateObjectiveVariableAction = useCallback((objectiveIndex: number, actionIndex: number, updates: Partial<VariableAction>) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const variables = [...(objective.variables || [])];
    if (!variables[actionIndex]) return;
    variables[actionIndex] = { ...variables[actionIndex], ...updates };
    objectives[objectiveIndex] = { ...objective, variables };
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  const removeObjectiveSwitchAction = useCallback((objectiveIndex: number, actionIndex: number) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const switches = [...(objective.switches || [])];
    switches.splice(actionIndex, 1);
    objectives[objectiveIndex] = { ...objective, switches };
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  const removeObjectiveVariableAction = useCallback((objectiveIndex: number, actionIndex: number) => {
    const objectives = [...(quest?.objectives || [])];
    const objective = objectives[objectiveIndex];
    if (!objective) return;
    const variables = [...(objective.variables || [])];
    variables.splice(actionIndex, 1);
    objectives[objectiveIndex] = { ...objective, variables };
    updateQuest({ objectives });
  }, [quest, updateQuest]);

  if (!quest) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧任务以编辑</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0e17]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          任务编辑器
          {hasChanges && <Badge dot color="orange" className="ml-2" />}
        </h2>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!hasChanges}
          style={{ backgroundColor: hasChanges ? 'var(--color-accent)' : undefined }}
        >
          保存
        </Button>
      </div>

      <Collapse
        activeKey={activeKeys}
        onChange={setActiveKeys}
        className="quest-collapse"
      >
        <Panel header="任务模板" key="template">
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={handleCreateQuest}>
              新建
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>
            <Popconfirm
              title="确认删除当前任务？"
              okText="删除"
              cancelText="取消"
              onConfirm={handleDeleteQuest}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Tag color="cyan">当前条目 #{Math.max(1, currentItemIndex)}</Tag>
          </Space>
        </Panel>
        <Panel
          header="基本信息"
          key="basic"
          extra={
            <Tag color={DIFFICULTIES[quest.difficulty - 1]?.color}>
              {DIFFICULTIES[quest.difficulty - 1]?.label}
            </Tag>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">任务标题</label>
              <Input
                value={quest.title}
                onChange={(e) => updateQuest({ title: e.target.value })}
                placeholder="输入任务标题"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">发布者</label>
              <Input
                value={quest.giver}
                onChange={(e) => updateQuest({ giver: e.target.value })}
                placeholder="输入发布者名称"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">难度</label>
              <Select
                value={quest.difficulty}
                onChange={(value) => updateQuest({ difficulty: value })}
                className="w-full"
                options={DIFFICULTIES.map((item) => ({ value: item.value, label: item.label }))}
              />
            </div>
            <div className="flex items-end gap-4">
              <Checkbox checked={quest.category} onChange={(e) => updateQuest({ category: e.target.checked })}>
                主线任务
              </Checkbox>
              <Checkbox checked={quest.repeatable} onChange={(e) => updateQuest({ repeatable: e.target.checked })}>
                可重复
              </Checkbox>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">任务描述</label>
              <TextArea
                value={quest.description?.join('\n')}
                onChange={(e) => updateQuest({ description: e.target.value.split('\n') })}
                rows={3}
                placeholder="输入任务描述，每行将作为描述数组的一个元素"
              />
            </div>
          </div>
        </Panel>
        <Panel header="任务开始/完成事件" key="actions">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card
              size="small"
              title="开始开关"
              extra={(
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addSwitchAction('start')}>
                  添加
                </Button>
              )}
            >
              <Space direction="vertical" className="w-full">
                {(quest.startSwitches || []).map((action, actionIndex) => (
                  <Space key={`start-switch-${actionIndex}`} wrap className="w-full">
                    <Select
                      value={action.switchId || getDefaultOptionId(dataOptions.switches)}
                      onChange={(value) => updateSwitchAction('startSwitches', actionIndex, { switchId: value })}
                      style={{ width: 220 }}
                      options={getSelectOptions(dataOptions.switches)}
                      placeholder="选择开关"
                    />
                    <Select
                      value={action.value ? 'true' : 'false'}
                      onChange={(value) => updateSwitchAction('startSwitches', actionIndex, { value: value === 'true' })}
                      style={{ width: 100 }}
                      options={[
                        { value: 'true', label: '开启' },
                        { value: 'false', label: '关闭' },
                      ]}
                    />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSwitchAction('startSwitches', actionIndex)} />
                  </Space>
                ))}
                {(!quest.startSwitches || quest.startSwitches.length === 0) && (
                  <p className="text-gray-500 text-center py-2">暂无开始开关</p>
                )}
              </Space>
            </Card>

            <Card
              size="small"
              title="完成开关"
              extra={(
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addSwitchAction('complete')}>
                  添加
                </Button>
              )}
            >
              <Space direction="vertical" className="w-full">
                {(quest.switches || []).map((action, actionIndex) => (
                  <Space key={`finish-switch-${actionIndex}`} wrap className="w-full">
                    <Select
                      value={action.switchId || getDefaultOptionId(dataOptions.switches)}
                      onChange={(value) => updateSwitchAction('switches', actionIndex, { switchId: value })}
                      style={{ width: 220 }}
                      options={getSelectOptions(dataOptions.switches)}
                      placeholder="选择开关"
                    />
                    <Select
                      value={action.value ? 'true' : 'false'}
                      onChange={(value) => updateSwitchAction('switches', actionIndex, { value: value === 'true' })}
                      style={{ width: 100 }}
                      options={[
                        { value: 'true', label: '开启' },
                        { value: 'false', label: '关闭' },
                      ]}
                    />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSwitchAction('switches', actionIndex)} />
                  </Space>
                ))}
                {(!quest.switches || quest.switches.length === 0) && (
                  <p className="text-gray-500 text-center py-2">暂无完成开关</p>
                )}
              </Space>
            </Card>

            <Card
              size="small"
              title="开始变量"
              extra={(
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addVariableAction('start')}>
                  添加
                </Button>
              )}
            >
              <Space direction="vertical" className="w-full">
                {(quest.startVariables || []).map((action, actionIndex) => (
                  <Space key={`start-variable-${actionIndex}`} wrap className="w-full">
                    <Select
                      value={action.variableId || getDefaultOptionId(dataOptions.variables)}
                      onChange={(value) => updateVariableAction('startVariables', actionIndex, { variableId: value })}
                      style={{ width: 220 }}
                      options={getSelectOptions(dataOptions.variables)}
                      placeholder="选择变量"
                    />
                    <Select
                      value={action.op || '='}
                      onChange={(value) => updateVariableAction('startVariables', actionIndex, { op: value })}
                      style={{ width: 80 }}
                      options={VARIABLE_OPERATORS.map((op) => ({ value: op, label: op }))}
                    />
                    <InputNumber
                      value={action.value ?? 0}
                      onChange={(value) => updateVariableAction('startVariables', actionIndex, { value: value ?? 0 })}
                      placeholder="值"
                    />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeVariableAction('startVariables', actionIndex)} />
                  </Space>
                ))}
                {(!quest.startVariables || quest.startVariables.length === 0) && (
                  <p className="text-gray-500 text-center py-2">暂无开始变量</p>
                )}
              </Space>
            </Card>

            <Card
              size="small"
              title="完成变量"
              extra={(
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addVariableAction('complete')}>
                  添加
                </Button>
              )}
            >
              <Space direction="vertical" className="w-full">
                {(quest.variables || []).map((action, actionIndex) => (
                  <Space key={`finish-variable-${actionIndex}`} wrap className="w-full">
                    <Select
                      value={action.variableId || getDefaultOptionId(dataOptions.variables)}
                      onChange={(value) => updateVariableAction('variables', actionIndex, { variableId: value })}
                      style={{ width: 220 }}
                      options={getSelectOptions(dataOptions.variables)}
                      placeholder="选择变量"
                    />
                    <Select
                      value={action.op || '='}
                      onChange={(value) => updateVariableAction('variables', actionIndex, { op: value })}
                      style={{ width: 80 }}
                      options={VARIABLE_OPERATORS.map((op) => ({ value: op, label: op }))}
                    />
                    <InputNumber
                      value={action.value ?? 0}
                      onChange={(value) => updateVariableAction('variables', actionIndex, { value: value ?? 0 })}
                      placeholder="值"
                    />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeVariableAction('variables', actionIndex)} />
                  </Space>
                ))}
                {(!quest.variables || quest.variables.length === 0) && (
                  <p className="text-gray-500 text-center py-2">暂无完成变量</p>
                )}
              </Space>
            </Card>
          </div>
        </Panel>
        <Panel
          header={`前置条件 (${quest.requirements?.length || 0})`}
          key="requirements"
          extra={
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                addRequirement();
              }}
            >
              添加
            </Button>
          }
        >
          <Space direction="vertical" className="w-full">
            {quest.requirements?.map((req, index) => (
              <Card
                key={index}
                size="small"
                extra={(
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRequirement(index)}
                  />
                )}
              >
                <Space wrap>
                  <Select
                    value={req.type}
                    onChange={(value) => updateRequirement(index, { type: value })}
                    style={{ width: 120 }}
                    options={REQUIREMENT_TYPES}
                  />
                  {req.type === 2 && (
                    <Select
                      value={req.questId || 1}
                      onChange={(value) => updateRequirement(index, { questId: value })}
                      style={{ width: 200 }}
                      options={getSelectOptions(dataOptions.quests)}
                      placeholder="选择前置任务"
                    />
                  )}
                  {req.type === 3 && (
                    <>
                      <Select
                        value={req.itemId || 1}
                        onChange={(value) => updateRequirement(index, { itemId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.items)}
                        placeholder="选择物品"
                      />
                      <InputNumber
                        value={(req.targetValue as number) ?? 1}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 1 })}
                        placeholder="数量"
                      />
                    </>
                  )}
                  {req.type === 4 && (
                    <>
                      <Select
                        value={req.weaponId || 1}
                        onChange={(value) => updateRequirement(index, { weaponId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.weapons)}
                        placeholder="选择武器"
                      />
                      <InputNumber
                        value={(req.targetValue as number) ?? 1}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 1 })}
                        placeholder="数量"
                      />
                    </>
                  )}
                  {req.type === 5 && (
                    <>
                      <Select
                        value={req.armorId || 1}
                        onChange={(value) => updateRequirement(index, { armorId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.armors)}
                        placeholder="选择防具"
                      />
                      <InputNumber
                        value={(req.targetValue as number) ?? 1}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 1 })}
                        placeholder="数量"
                      />
                    </>
                  )}
                  {req.type === 1 && (
                    <>
                      <InputNumber
                        value={(req.targetValue as number) ?? 1}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 1 })}
                        placeholder="目标等级"
                      />
                      {dataOptions.actors.length > 0 ? (
                        <Select
                          value={req.actorId ?? getDefaultOptionId(dataOptions.actors)}
                          onChange={(value) => updateRequirement(index, { actorId: value })}
                          style={{ width: 220 }}
                          options={getSelectOptions(dataOptions.actors)}
                          placeholder="选择角色"
                        />
                      ) : (
                        <InputNumber
                          value={req.actorId ?? 1}
                          onChange={(value) => updateRequirement(index, { actorId: value ?? 1 })}
                          placeholder="角色ID"
                        />
                      )}
                      <Select
                        value={req.operator || '>='}
                        onChange={(value) => updateRequirement(index, { operator: value })}
                        style={{ width: 80 }}
                        options={OPERATORS.map((op) => ({ value: op, label: op }))}
                      />
                    </>
                  )}
                  {req.type === 6 && (
                    <>
                      <Select
                        value={req.switchId || 1}
                        onChange={(value) => updateRequirement(index, { switchId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.switches)}
                        placeholder="选择开关"
                      />
                      <Select
                        value={req.targetValue === true ? 'true' : 'false'}
                        onChange={(value) => updateRequirement(index, { targetValue: value === 'true' })}
                        style={{ width: 100 }}
                        options={[
                          { value: 'true', label: '开启' },
                          { value: 'false', label: '关闭' },
                        ]}
                      />
                    </>
                  )}
                  {req.type === 7 && (
                    <>
                      <Select
                        value={req.variableId || 1}
                        onChange={(value) => updateRequirement(index, { variableId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.variables)}
                        placeholder="选择变量"
                      />
                      <Select
                        value={req.operator || '>='}
                        onChange={(value) => updateRequirement(index, { operator: value })}
                        style={{ width: 80 }}
                        options={OPERATORS.map((op) => ({ value: op, label: op }))}
                      />
                      <InputNumber
                        value={(req.targetValue as number) ?? 0}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 0 })}
                        placeholder="目标值"
                      />
                    </>
                  )}
                  {req.type === 8 && (
                    <>
                      <InputNumber
                        value={(req.targetValue as number) ?? 1}
                        onChange={(value) => updateRequirement(index, { targetValue: value ?? 1 })}
                        placeholder="金币数量"
                      />
                      <Select
                        value={req.operator || '>='}
                        onChange={(value) => updateRequirement(index, { operator: value })}
                        style={{ width: 80 }}
                        options={OPERATORS.map((op) => ({ value: op, label: op }))}
                      />
                    </>
                  )}
                  <Input
                    value={req.description}
                    onChange={(e) => updateRequirement(index, { description: e.target.value })}
                    placeholder="描述"
                    style={{ width: 200 }}
                  />
                </Space>
              </Card>
            ))}
            {(!quest.requirements || quest.requirements.length === 0) && (
              <p className="text-gray-500 text-center py-4">暂无前置条件</p>
            )}
          </Space>
        </Panel>

        <Panel
          header={`任务链与检查 (${dependencySummary.issues.length})`}
          key="chain"
        >
          <div className="space-y-3">
            {dependencySummary.issues.length === 0 ? (
              <Tag color="green">未发现依赖问题</Tag>
            ) : (
              <div className="space-y-2">
                <Tag color="red">
                  发现 {dependencySummary.issues.length} 个依赖问题
                </Tag>
                {dependencySummary.issues.map((issue, index) => (
                  <div key={`issue-${issue.type}-${issue.questIndex}-${index}`} className="text-sm text-orange-300">
                    {issue.questIndex > 0 ? (
                      <button
                        type="button"
                        className="text-left hover:text-orange-200 underline-offset-2 hover:underline"
                        onClick={() => selectQuestByIndex(issue.questIndex)}
                        title="点击定位到对应任务"
                      >
                        {index + 1}. {formatDependencyIssue(issue)}
                      </button>
                    ) : (
                      <span>{index + 1}. {formatDependencyIssue(issue)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card size="small" title={`前置任务（直接 ${dependencySummary.directPrerequisites.length}）`}>
                <Space wrap>
                  {dependencySummary.directPrerequisites.length === 0 ? (
                    <span className="text-gray-500 text-sm">无直接前置任务</span>
                  ) : (
                    dependencySummary.directPrerequisites.map((node, index) => (
                      <Tag
                        key={`pre-${node.index}-${node.viaQuestId}-${index}`}
                        color={node.missing ? 'red' : 'blue'}
                        onClick={() => {
                          if (!node.missing && node.index > 0) {
                            selectQuestByIndex(node.index);
                          }
                        }}
                        style={{ cursor: node.missing ? 'default' : 'pointer' }}
                      >
                        {node.missing ? node.title : `#${node.index} ${node.title}`}
                      </Tag>
                    ))
                  )}
                </Space>
              </Card>

              <Card size="small" title={`后继任务（直接 ${dependencySummary.directDependents.length}）`}>
                <Space wrap>
                  {dependencySummary.directDependents.length === 0 ? (
                    <span className="text-gray-500 text-sm">无直接后继任务</span>
                  ) : (
                    dependencySummary.directDependents.map((node, index) => (
                      <Tag
                        key={`dep-${node.index}-${index}`}
                        color="purple"
                        onClick={() => {
                          if (node.index > 0) {
                            selectQuestByIndex(node.index);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        #{node.index} {node.title}
                      </Tag>
                    ))
                  )}
                </Space>
              </Card>
            </div>

            <div className="text-xs text-gray-400">
              传递前置数：{dependencySummary.transitivePrerequisiteCount}，传递后继数：{dependencySummary.transitiveDependentCount}
            </div>
            <div className="text-xs text-gray-500">提示：可点击依赖问题、前置任务、后继任务标签快速定位。</div>
          </div>
        </Panel>
        <Panel
          header={`任务目标 (${quest.objectives?.length || 0})`}
          key="objectives"
          extra={
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                addObjective();
              }}
            >
              添加
            </Button>
          }
        >
          <Space direction="vertical" className="w-full">
            {quest.objectives?.map((obj, index) => (
              <Card
                key={index}
                size="small"
                title={`目标 ${index + 1}`}
                extra={(
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeObjective(index)}
                  />
                )}
              >
                <div className="space-y-3">
                  <Space wrap className="w-full">
                    <Select
                      value={obj.type}
                      onChange={(value) => updateObjective(index, { type: value })}
                      style={{ width: 120 }}
                      options={OBJECTIVE_TYPES}
                    />
                    {obj.type === 1 && (
                      <Select
                        value={obj.enemyId || 1}
                        onChange={(value) => updateObjective(index, { enemyId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.enemies)}
                        placeholder="选择敌人"
                      />
                    )}
                    {obj.type === 2 && (
                      <Select
                        value={obj.itemId || 1}
                        onChange={(value) => updateObjective(index, { itemId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.items)}
                        placeholder="选择物品"
                      />
                    )}
                    {obj.type === 3 && (
                      <Select
                        value={obj.weaponId || 1}
                        onChange={(value) => updateObjective(index, { weaponId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.weapons)}
                        placeholder="选择武器"
                      />
                    )}
                    {obj.type === 4 && (
                      <Select
                        value={obj.armorId || 1}
                        onChange={(value) => updateObjective(index, { armorId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.armors)}
                        placeholder="选择防具"
                      />
                    )}
                    {obj.type === 5 && (
                      <>
                        <Select
                          value={obj.switchId || 1}
                          onChange={(value) => updateObjective(index, { switchId: value })}
                          style={{ width: 200 }}
                          options={getSelectOptions(dataOptions.switches)}
                          placeholder="选择开关"
                        />
                        <Select
                          value={obj.targetValue === true ? 'true' : 'false'}
                          onChange={(value) => updateObjective(index, { targetValue: value === 'true' })}
                          style={{ width: 100 }}
                          options={[
                            { value: 'true', label: '开启' },
                            { value: 'false', label: '关闭' },
                          ]}
                        />
                      </>
                    )}
                    {obj.type === 6 && (
                      <>
                        <Select
                          value={obj.variableId || 1}
                          onChange={(value) => updateObjective(index, { variableId: value })}
                          style={{ width: 200 }}
                          options={getSelectOptions(dataOptions.variables)}
                          placeholder="选择变量"
                        />
                        <Select
                          value={obj.operator || '>='}
                          onChange={(value) => updateObjective(index, { operator: value })}
                          style={{ width: 80 }}
                          options={OPERATORS.map((op) => ({ value: op, label: op }))}
                        />
                        <InputNumber
                          value={(obj.targetValue as number) ?? 0}
                          onChange={(value) => updateObjective(index, { targetValue: value ?? 0 })}
                          placeholder="目标值"
                        />
                      </>
                    )}
                    {obj.type === 7 && (
                      <InputNumber
                        value={(obj.targetValue as number) ?? 1}
                        onChange={(value) => updateObjective(index, { targetValue: value ?? 1 })}
                        placeholder="金币数量"
                      />
                    )}
                    {obj.type !== 5 && obj.type !== 6 && (
                      <>
                        <Select
                          value={obj.operator || '>='}
                          onChange={(value) => updateObjective(index, { operator: value })}
                          style={{ width: 80 }}
                          options={OPERATORS.map((op) => ({ value: op, label: op }))}
                        />
                        <InputNumber
                          value={(obj.targetValue as number) ?? 1}
                          onChange={(value) => updateObjective(index, { targetValue: value ?? 1 })}
                          placeholder="目标值"
                        />
                      </>
                    )}
                    <Checkbox
                      checked={obj.calculateType}
                      onChange={(e) => updateObjective(index, { calculateType: e.target.checked })}
                    >
                      累计计算
                    </Checkbox>
                    <Input
                      value={obj.description}
                      onChange={(e) => updateObjective(index, { description: e.target.value })}
                      placeholder="描述"
                      style={{ width: 300 }}
                    />
                  </Space>

                  <div className="w-full border-t border-[#30384d] pt-3">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <Card
                        size="small"
                        title="完成后开关"
                        extra={(
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => addObjectiveSwitchAction(index)}
                          >
                            添加
                          </Button>
                        )}
                      >
                        <Space direction="vertical" className="w-full">
                          {(obj.switches || []).map((action, actionIndex) => (
                            <Space key={`objective-switch-${index}-${actionIndex}`} wrap className="w-full">
                              <Select
                                value={action.switchId || getDefaultOptionId(dataOptions.switches)}
                                onChange={(value) => updateObjectiveSwitchAction(index, actionIndex, { switchId: value })}
                                style={{ width: 220 }}
                                options={getSelectOptions(dataOptions.switches)}
                                placeholder="选择开关"
                              />
                              <Select
                                value={action.value ? 'true' : 'false'}
                                onChange={(value) => updateObjectiveSwitchAction(index, actionIndex, { value: value === 'true' })}
                                style={{ width: 100 }}
                                options={[
                                  { value: 'true', label: '开启' },
                                  { value: 'false', label: '关闭' },
                                ]}
                              />
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeObjectiveSwitchAction(index, actionIndex)}
                              />
                            </Space>
                          ))}
                          {(!obj.switches || obj.switches.length === 0) && (
                            <p className="text-gray-500 text-center py-2">暂无完成后开关</p>
                          )}
                        </Space>
                      </Card>

                      <Card
                        size="small"
                        title="完成后变量"
                        extra={(
                          <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => addObjectiveVariableAction(index)}
                          >
                            添加
                          </Button>
                        )}
                      >
                        <Space direction="vertical" className="w-full">
                          {(obj.variables || []).map((action, actionIndex) => (
                            <Space key={`objective-variable-${index}-${actionIndex}`} wrap className="w-full">
                              <Select
                                value={action.variableId || getDefaultOptionId(dataOptions.variables)}
                                onChange={(value) => updateObjectiveVariableAction(index, actionIndex, { variableId: value })}
                                style={{ width: 220 }}
                                options={getSelectOptions(dataOptions.variables)}
                                placeholder="选择变量"
                              />
                              <Select
                                value={action.op || '+'}
                                onChange={(value) => updateObjectiveVariableAction(index, actionIndex, { op: value })}
                                style={{ width: 80 }}
                                options={VARIABLE_OPERATORS.map((op) => ({ value: op, label: op }))}
                              />
                              <InputNumber
                                value={action.value ?? 0}
                                onChange={(value) => updateObjectiveVariableAction(index, actionIndex, { value: value ?? 0 })}
                                placeholder="值"
                              />
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeObjectiveVariableAction(index, actionIndex)}
                              />
                            </Space>
                          ))}
                          {(!obj.variables || obj.variables.length === 0) && (
                            <p className="text-gray-500 text-center py-2">暂无完成后变量</p>
                          )}
                        </Space>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </Panel>
        <Panel
          header={`任务奖励 (${quest.rewards?.length || 0})`}
          key="rewards"
          extra={
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                addReward();
              }}
            >
              添加
            </Button>
          }
        >
          <Space direction="vertical" className="w-full">
            {quest.rewards?.map((reward, index) => (
              <Card
                key={index}
                size="small"
                extra={(
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeReward(index)}
                  />
                )}
              >
                <Space wrap>
                  <Select
                    value={reward.type}
                    onChange={(value) => updateReward(index, { type: value })}
                    style={{ width: 100 }}
                    options={REWARD_TYPES}
                  />
                  {reward.type === 1 && (
                    <Select
                      value={reward.itemId || 1}
                      onChange={(value) => updateReward(index, { itemId: value })}
                      style={{ width: 200 }}
                      options={getSelectOptions(dataOptions.items)}
                      placeholder="选择物品"
                    />
                  )}
                  {reward.type === 2 && (
                    <Select
                      value={reward.weaponId || 1}
                      onChange={(value) => updateReward(index, { weaponId: value })}
                      style={{ width: 200 }}
                      options={getSelectOptions(dataOptions.weapons)}
                      placeholder="选择武器"
                    />
                  )}
                  {reward.type === 3 && (
                    <Select
                      value={reward.armorId || 1}
                      onChange={(value) => updateReward(index, { armorId: value })}
                      style={{ width: 200 }}
                      options={getSelectOptions(dataOptions.armors)}
                      placeholder="选择防具"
                    />
                  )}
                  {reward.type === 6 && (
                    <>
                      <Select
                        value={reward.switchId || 1}
                        onChange={(value) => updateReward(index, { switchId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.switches)}
                        placeholder="选择开关"
                      />
                      <Select
                        value={reward.targetValue === true ? 'true' : 'false'}
                        onChange={(value) => updateReward(index, { targetValue: value === 'true' })}
                        style={{ width: 100 }}
                        options={[
                          { value: 'true', label: '开启' },
                          { value: 'false', label: '关闭' },
                        ]}
                      />
                    </>
                  )}
                  {reward.type === 7 && (
                    <>
                      <Select
                        value={reward.variableId || 1}
                        onChange={(value) => updateReward(index, { variableId: value })}
                        style={{ width: 200 }}
                        options={getSelectOptions(dataOptions.variables)}
                        placeholder="选择变量"
                      />
                      <Select
                        value={reward.op || '='}
                        onChange={(value) => updateReward(index, { op: value })}
                        style={{ width: 80 }}
                        options={VARIABLE_OPERATORS.map((op) => ({ value: op, label: op }))}
                      />
                    </>
                  )}
                  {reward.type !== 6 && (
                    <InputNumber
                      value={(reward.targetValue as number) ?? 1}
                      onChange={(value) => updateReward(index, { targetValue: value ?? 1 })}
                      placeholder={reward.type === 4 ? '金币数量' : reward.type === 5 ? '经验值' : '数值'}
                    />
                  )}
                  <Input
                    value={reward.description}
                    onChange={(e) => updateReward(index, { description: e.target.value })}
                    placeholder="描述"
                    style={{ width: 200 }}
                  />
                </Space>
              </Card>
            ))}
          </Space>
        </Panel>
      </Collapse>
    </div>
  );
}

export default QuestPanel;
