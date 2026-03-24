import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Select, Input, InputNumber, Space, Badge, Collapse, Slider, Popconfirm, Tag } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  SaveOutlined,
  RedoOutlined,
  SwapOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '../../stores/editorStore';
import { ProjectileCanvas } from '../common/ProjectileCanvas';
import type { ProjectileTemplate, TrajectorySegment } from '../../types';
import { ToastManager } from '../common/ToastManager';
import { InputDialog } from '../common/InputDialog';
import { DataLoaderService } from '../../services/DataLoaderService';
import { EventSystem } from '../../core/EventSystem';
import { cloneProjectileTemplate, createDefaultProjectileTemplate } from '../../services/ProjectileTemplateService';
import {
  findDataEntryById,
  normalizeBattlerType,
  resolveActorProjectileOffset,
  resolveEnemyProjectileOffset,
  normalizeDurationFrames,
  toDurationFrameDisplay,
} from '../../services/ProjectilePreviewUtils';

const { Panel } = Collapse;

// 缓动函数选项 - 使用与旧版一致的选项
const EASING_OPTIONS = [
  { value: 'linear', label: '线性移动' },
  { value: 'easeInQuad', label: '二次方缓入' },
  { value: 'easeOutQuad', label: '二次方缓出' },
  { value: 'easeInOutQuad', label: '二次方缓入缓出' },
  { value: 'easeInCubic', label: '三次方缓入' },
  { value: 'easeOutCubic', label: '三次方缓出' },
  { value: 'easeInOutCubic', label: '三次方缓入缓出' },
  { value: 'easeInQuart', label: '四次方缓入' },
  { value: 'easeOutQuart', label: '四次方缓出' },
  { value: 'easeInOutQuart', label: '四次方缓入缓出' },
  { value: 'easeInSine', label: '正弦曲线缓入' },
  { value: 'easeOutSine', label: '正弦曲线缓出' },
  { value: 'easeInOutSine', label: '正弦曲线缓入缓出' },
  { value: 'easeInExpo', label: '指数曲线缓入' },
  { value: 'easeOutExpo', label: '指数曲线缓出' },
  { value: 'easeInOutExpo', label: '指数曲线缓入缓出' },
  { value: 'easeInCirc', label: '圆形缓入' },
  { value: 'easeOutCirc', label: '圆形缓出' },
  { value: 'easeInOutCirc', label: '圆形缓入缓出' },
  { value: 'easeInElastic', label: '弹跳缓入' },
  { value: 'easeOutElastic', label: '弹跳缓出' },
  { value: 'easeInOutElastic', label: '弹跳缓入缓出' },
  { value: 'easeInBack', label: '超过缓入' },
  { value: 'easeOutBack', label: '超过缓出' },
  { value: 'easeInOutBack', label: '超过缓入缓出' },
  { value: 'easeInBounce', label: '弹跳超过缓入' },
  { value: 'easeOutBounce', label: '弹跳超过缓出' },
  { value: 'easeInOutBounce', label: '弹跳超过缓入缓出' },
];

// 动画数据项
interface AnimationItem {
  id?: number;
  name?: string;
}

// 数据项类型
interface DataItem {
  id: number;
  name: string;
}

export function ProjectilePanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentData = useEditorStore((state) => state.currentData);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>(['template', 'offset', 'preview', 'settings', 'segments']);
  const [offsetRevision, setOffsetRevision] = useState(0);
  const [emitterSide, setEmitterSide] = useState<'left' | 'right'>('left');
  
  // 动画选项
  const [animationOptions, setAnimationOptions] = useState<AnimationItem[]>([]);
  // 角色、敌人、武器、技能数据
  const [actors, setActors] = useState<DataItem[]>([]);
  const [enemies, setEnemies] = useState<DataItem[]>([]);
  const [weapons, setWeapons] = useState<DataItem[]>([]);
  const [skills, setSkills] = useState<DataItem[]>([]);
  const [actorOffsetActorId, setActorOffsetActorId] = useState(0);
  const [actorOffsetWeaponId, setActorOffsetWeaponId] = useState(0);
  const [actorOffsetX, setActorOffsetX] = useState(0);
  const [actorOffsetY, setActorOffsetY] = useState(0);
  const [enemyOffsetEnemyId, setEnemyOffsetEnemyId] = useState(0);
  const [enemyOffsetSkillId, setEnemyOffsetSkillId] = useState(0);
  const [enemyOffsetX, setEnemyOffsetX] = useState(0);
  const [enemyOffsetY, setEnemyOffsetY] = useState(0);
  const actorWeaponMemoryRef = useRef<Record<number, number>>({});
  const enemySkillMemoryRef = useRef<Record<number, number>>({});

  const template = currentItem as ProjectileTemplate | null;
  const sourceType = normalizeBattlerType(template?.sourceType, 'actor');
  const targetType = normalizeBattlerType(template?.targetType, 'enemy');

  const config = useEditorStore((state) => state.config);

  const rememberSourceSelection = useCallback((snapshot?: ProjectileTemplate | null) => {
    const current = snapshot ?? template;
    if (!current) return;

    const currentSourceType = normalizeBattlerType(current.sourceType, 'actor');
    const sourceId = Number(current.sourceId || 0);
    if (sourceId <= 0) return;

    if (currentSourceType === 'actor') {
      const weaponId = Number(current.weaponId || 0);
      if (weaponId > 0) {
        actorWeaponMemoryRef.current[sourceId] = weaponId;
      }
      return;
    }

    const skillId = Number(current.skillId || 0);
    if (skillId > 0) {
      enemySkillMemoryRef.current[sourceId] = skillId;
    }
  }, [template]);

  const getRememberedActorWeapon = useCallback((actorId: number) => {
    if (actorId <= 0) return 0;
    return Number(actorWeaponMemoryRef.current[actorId] || 0);
  }, []);

  const getRememberedEnemySkill = useCallback((enemyId: number) => {
    if (enemyId <= 0) return 0;
    return Number(enemySkillMemoryRef.current[enemyId] || 0);
  }, []);

  // 从缓存数据中提取选项
  const extractDataItems = (data: unknown[] | null): DataItem[] => {
    if (!data || !Array.isArray(data) || data.length < 2) return [];
    return data.slice(1).map((item: any, index) => ({
      id: item?.id ?? index + 1,
      name: item?.name || `未命名 ${index + 1}`,
    }));
  };

  // 加载动画和角色/敌人/武器/技能数据
  useEffect(() => {
    const loadData = () => {
      // 加载动画数据
      const animationsData = DataLoaderService.getCachedDataByName('Animations.json');
      if (animationsData && Array.isArray(animationsData)) {
        const options = animationsData.slice(1).map((item: any, index) => ({
          id: item?.id ?? index + 1,
          name: item?.name || `动画 ${index + 1}`,
        }));
        setAnimationOptions(options);
      }

      // 加载角色数据
      const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
      setActors(extractDataItems(actorsData));

      // 加载敌人数据
      const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
      setEnemies(extractDataItems(enemiesData));

      // 加载武器数据
      const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
      setWeapons(extractDataItems(weaponsData));

      // 加载技能数据
      const skillsData = DataLoaderService.getCachedDataByName('Skills.json');
      setSkills(extractDataItems(skillsData));
    };

    loadData();

    // 监听数据清单加载完成事件（工作空间加载时触发）
    const handleManifestLoaded = () => {
      loadData();
    };
    EventSystem.on('data:manifest-loaded', handleManifestLoaded);

    // 监听数据文件加载事件（菜单切换数据文件时触发）
    const handleDataFileLoaded = () => {
      loadData();
    };
    EventSystem.on('data:file-loaded', handleDataFileLoaded);

    // 延迟再试一次（确保数据已加载）
    const retryTimer = setTimeout(() => {
      const animationsData = DataLoaderService.getCachedDataByName('Animations.json');
      if (!animationsData || animationsData.length < 2) {
        loadData();
      }
    }, 500);

    return () => {
      EventSystem.off('data:manifest-loaded', handleManifestLoaded);
      EventSystem.off('data:file-loaded', handleDataFileLoaded);
      clearTimeout(retryTimer);
    };
  }, [config.dataPath, config.projectRoot]);

  // 生成动画 Select 选项
  const getAnimationOptions = () => {
    return [
      { value: 0, label: '无动画' },
      ...animationOptions.map(item => ({
        value: item.id || 0,
        label: `${item.id} : ${item.name}`,
      })),
    ];
  };

  // 生成数据 Select 选项
  const getDataOptions = (items: DataItem[]) => {
    return [
      { value: 0, label: '未选择' },
      ...items.map(item => ({
        value: item.id,
        label: `${item.id} : ${item.name}`,
      })),
    ];
  };

  // 获取发射方选项（根据类型）
  const getSourceOptions = () => {
    return sourceType === 'actor' ? getDataOptions(actors) : getDataOptions(enemies);
  };

  // 获取目标方选项（根据类型）
  const getTargetOptions = () => {
    return targetType === 'actor' ? getDataOptions(actors) : getDataOptions(enemies);
  };

  // 更新模板
  const updateTemplate = useCallback((updates: Partial<ProjectileTemplate>) => {
    if (!template || !currentData || currentItemIndex < 0) return;

    const updatedTemplate = { ...template, ...updates };
    const newData = [...currentData];
    newData[currentItemIndex] = updatedTemplate;
    
    const { loadData } = useEditorStore.getState();
    loadData(newData as any[], currentFilePath || '', 'projectile');
    
    setHasChanges(true);
  }, [template, currentData, currentItemIndex, currentFilePath]);

  const applyProjectileDataAndSelect = useCallback((nextData: (ProjectileTemplate | null)[], nextIndex: number) => {
    const { loadData, selectItem } = useEditorStore.getState();
    loadData(nextData as any[], currentFilePath || '', 'projectile');
    const clamped = Math.min(Math.max(nextIndex, 1), Math.max(nextData.length - 1, 1));
    selectItem(clamped);
    setHasChanges(true);
  }, [currentFilePath]);

  const handleCreateProjectile = useCallback(() => {
    if (!currentData) return;
    const nextData = [...currentData, createDefaultProjectileTemplate()] as (ProjectileTemplate | null)[];
    applyProjectileDataAndSelect(nextData, nextData.length - 1);
    ToastManager.success('已新建弹道模板');
  }, [applyProjectileDataAndSelect, currentData]);

  const handleCopyProjectile = useCallback(async () => {
    if (!template || !currentData) return;
    const newName = await InputDialog.show({
      title: '复制弹道模板',
      placeholder: '输入新弹道模板名称',
      defaultValue: `${template.name} (复制)`,
    });
    if (!newName) return;

    const copiedTemplate = cloneProjectileTemplate(template, {
      id: undefined,
      name: newName,
    });
    const nextData = [...currentData, copiedTemplate] as (ProjectileTemplate | null)[];
    applyProjectileDataAndSelect(nextData, nextData.length - 1);
    ToastManager.success('弹道模板已复制');
  }, [applyProjectileDataAndSelect, currentData, template]);

  const handleDeleteProjectile = useCallback(() => {
    if (!currentData || currentItemIndex <= 0) return;
    if (currentData.length <= 2) {
      applyProjectileDataAndSelect([null, createDefaultProjectileTemplate()], 1);
      ToastManager.success('已删除弹道模板（保留默认模板）');
      return;
    }

    const nextData = [...currentData] as (ProjectileTemplate | null)[];
    nextData.splice(currentItemIndex, 1);
    const nextIndex = Math.min(currentItemIndex, nextData.length - 1);
    applyProjectileDataAndSelect(nextData, nextIndex);
    ToastManager.success('弹道模板已删除');
  }, [applyProjectileDataAndSelect, currentData, currentItemIndex]);

  const handleSourceTypeChange = useCallback((value: 'actor' | 'enemy') => {
    rememberSourceSelection();
    updateTemplate({
      sourceType: value,
      sourceId: 0,
      weaponId: undefined,
      skillId: undefined,
    });
  }, [rememberSourceSelection, updateTemplate]);

  const handleSourceIdChange = useCallback((value: number) => {
    rememberSourceSelection();
    if (sourceType === 'actor') {
      const rememberedWeaponId = getRememberedActorWeapon(value);
      updateTemplate({
        sourceId: value,
        weaponId: rememberedWeaponId > 0 ? rememberedWeaponId : undefined,
        skillId: undefined,
      });
      return;
    }

    const rememberedSkillId = getRememberedEnemySkill(value);
    updateTemplate({
      sourceId: value,
      skillId: rememberedSkillId > 0 ? rememberedSkillId : undefined,
      weaponId: undefined,
    });
  }, [getRememberedActorWeapon, getRememberedEnemySkill, rememberSourceSelection, sourceType, updateTemplate]);

  const handleSourceWeaponChange = useCallback((value: number) => {
    const sourceId = Number(template?.sourceId || 0);
    if (sourceId > 0 && value > 0) {
      actorWeaponMemoryRef.current[sourceId] = value;
    }
    updateTemplate({ weaponId: value > 0 ? value : undefined });
  }, [template, updateTemplate]);

  const handleSourceSkillChange = useCallback((value: number) => {
    const sourceId = Number(template?.sourceId || 0);
    if (sourceId > 0 && value > 0) {
      enemySkillMemoryRef.current[sourceId] = value;
    }
    updateTemplate({ skillId: value > 0 ? value : undefined });
  }, [template, updateTemplate]);

  const getActorOffsetFromCache = useCallback((actorId: number, weaponId: number) => {
    if (actorId <= 0 || weaponId <= 0) return { x: 0, y: 0 };
    const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
    const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
    const actor = findDataEntryById(actorsData, actorId);
    const weapon = findDataEntryById(weaponsData, weaponId);
    return resolveActorProjectileOffset(actor, weapon);
  }, []);

  const getEnemyOffsetFromCache = useCallback((enemyId: number, skillId: number) => {
    if (enemyId <= 0 || skillId <= 0) return { x: 0, y: 0 };
    const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
    const enemy = findDataEntryById(enemiesData, enemyId);
    return resolveEnemyProjectileOffset(enemy, skillId);
  }, []);

  useEffect(() => {
    if (!template) return;
    rememberSourceSelection(template);
    if (sourceType === 'actor') {
      setActorOffsetActorId(template.sourceId || 0);
      setActorOffsetWeaponId(template.weaponId || 0);
    } else {
      setEnemyOffsetEnemyId(template.sourceId || 0);
      setEnemyOffsetSkillId(template.skillId || 0);
    }
  }, [template, sourceType, rememberSourceSelection]);

  useEffect(() => {
    const offset = getActorOffsetFromCache(actorOffsetActorId, actorOffsetWeaponId);
    setActorOffsetX(offset.x);
    setActorOffsetY(offset.y);
  }, [actorOffsetActorId, actorOffsetWeaponId, getActorOffsetFromCache]);

  useEffect(() => {
    const offset = getEnemyOffsetFromCache(enemyOffsetEnemyId, enemyOffsetSkillId);
    setEnemyOffsetX(offset.x);
    setEnemyOffsetY(offset.y);
  }, [enemyOffsetEnemyId, enemyOffsetSkillId, getEnemyOffsetFromCache]);

  const handleSaveActorOffset = useCallback(() => {
    if (actorOffsetActorId <= 0 || actorOffsetWeaponId <= 0) {
      ToastManager.error('请选择角色与武器');
      return;
    }

    const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
    const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
    const actorFilePath = DataLoaderService.getFilePathByName('Actors.json')
      || (config.dataPath ? `${config.dataPath.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/Actors.json` : '');

    if (!actorsData || !actorFilePath) {
      ToastManager.error('角色数据未加载');
      return;
    }

    const weapon = findDataEntryById(weaponsData, actorOffsetWeaponId);
    const wtypeId = Number((weapon?.wtypeId as number) || 0);
    if (wtypeId <= 0) {
      ToastManager.error('武器类型无效，无法保存偏移');
      return;
    }

    const actorIndex = findDataIndexById(actorsData, actorOffsetActorId);
    if (actorIndex <= 0) {
      ToastManager.error('角色数据未找到');
      return;
    }

    const nextActors = [...actorsData];
    const sourceActor = nextActors[actorIndex] as Record<string, unknown> | null;
    if (!sourceActor || typeof sourceActor !== 'object') {
      ToastManager.error('角色数据无效');
      return;
    }

    const actor = { ...sourceActor };
    const rawOffset = actor.projectileOffset;
    if (Array.isArray(rawOffset)) {
      const nextOffset = [...rawOffset];
      nextOffset[wtypeId] = { x: actorOffsetX, y: actorOffsetY };
      actor.projectileOffset = nextOffset;
    } else {
      const nextOffset = {
        ...(rawOffset && typeof rawOffset === 'object' ? (rawOffset as Record<string, unknown>) : {}),
        [String(wtypeId)]: { x: actorOffsetX, y: actorOffsetY },
      };
      actor.projectileOffset = nextOffset;
    }
    nextActors[actorIndex] = actor;

    DataLoaderService.cacheFileData(actorFilePath, 'Actors.json', nextActors);
    markFileDirty(actorFilePath);
    markItemDirty(actorFilePath, actorIndex);

    if (normalizePathKey(currentFilePath) === normalizePathKey(actorFilePath)) {
      useEditorStore.getState().loadData(nextActors as any[], actorFilePath, 'data');
    }

    setOffsetRevision((prev) => prev + 1);
    ToastManager.success('角色发射偏移已保存');
  }, [
    actorOffsetActorId,
    actorOffsetWeaponId,
    actorOffsetX,
    actorOffsetY,
    currentFilePath,
    markFileDirty,
    markItemDirty,
  ]);

  const handleSaveEnemyOffset = useCallback(() => {
    if (enemyOffsetEnemyId <= 0 || enemyOffsetSkillId <= 0) {
      ToastManager.error('请选择敌人与技能');
      return;
    }

    const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
    const enemyFilePath = DataLoaderService.getFilePathByName('Enemies.json')
      || (config.dataPath ? `${config.dataPath.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/Enemies.json` : '');

    if (!enemiesData || !enemyFilePath) {
      ToastManager.error('敌人数据未加载');
      return;
    }

    const enemyIndex = findDataIndexById(enemiesData, enemyOffsetEnemyId);
    if (enemyIndex <= 0) {
      ToastManager.error('敌人数据未找到');
      return;
    }

    const nextEnemies = [...enemiesData];
    const sourceEnemy = nextEnemies[enemyIndex] as Record<string, unknown> | null;
    if (!sourceEnemy || typeof sourceEnemy !== 'object') {
      ToastManager.error('敌人数据无效');
      return;
    }

    const enemy = { ...sourceEnemy };
    const rawOffset = enemy.projectileOffset;
    if (Array.isArray(rawOffset)) {
      const nextOffset = [...rawOffset];
      nextOffset[enemyOffsetSkillId] = { x: enemyOffsetX, y: enemyOffsetY };
      enemy.projectileOffset = nextOffset;
    } else {
      const nextOffset = {
        ...(rawOffset && typeof rawOffset === 'object' ? (rawOffset as Record<string, unknown>) : {}),
        [String(enemyOffsetSkillId)]: { x: enemyOffsetX, y: enemyOffsetY },
      };
      enemy.projectileOffset = nextOffset;
    }
    nextEnemies[enemyIndex] = enemy;

    DataLoaderService.cacheFileData(enemyFilePath, 'Enemies.json', nextEnemies);
    markFileDirty(enemyFilePath);
    markItemDirty(enemyFilePath, enemyIndex);

    if (normalizePathKey(currentFilePath) === normalizePathKey(enemyFilePath)) {
      useEditorStore.getState().loadData(nextEnemies as any[], enemyFilePath, 'data');
    }

    setOffsetRevision((prev) => prev + 1);
    ToastManager.success('敌人发射偏移已保存');
  }, [
    currentFilePath,
    enemyOffsetEnemyId,
    enemyOffsetSkillId,
    enemyOffsetX,
    enemyOffsetY,
    markFileDirty,
    markItemDirty,
  ]);

  // 保存
  const handleSave = useCallback(() => {
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      setHasChanges(false);
      ToastManager.success('弹道模板已保存');
    }
  }, [currentFilePath, markFileDirty]);

  // 获取轨迹段数组（从嵌套结构）
  const getSegments = useCallback(() => {
    return template?.launchAnimation?.segments || [];
  }, [template]);

  // 更新轨迹段数组（到嵌套结构）
  const updateSegments = useCallback((newSegments: TrajectorySegment[]) => {
    updateTemplate({
      launchAnimation: {
        ...template?.launchAnimation,
        animationId: template?.launchAnimation?.animationId || 0,
        segments: newSegments,
      },
    });
  }, [template, updateTemplate]);

  // 添加轨迹节点
  const addSegment = useCallback(() => {
    const newSegment: TrajectorySegment = {
      targetX: 0,
      targetY: -120,
      duration: 60,
      easeX: 'linear',
      easeY: 'linear',
    };
    const currentSegments = getSegments();
    updateSegments([...currentSegments, newSegment]);
  }, [getSegments, updateSegments]);

  // 更新轨迹节点
  const updateSegment = useCallback((index: number, updates: Partial<TrajectorySegment>) => {
    const currentSegments = getSegments();
    const newSegments = [...currentSegments];
    newSegments[index] = { ...newSegments[index], ...updates };
    updateSegments(newSegments);
  }, [getSegments, updateSegments]);

  // 删除轨迹节点
  const removeSegment = useCallback((index: number) => {
    const currentSegments = getSegments();
    const newSegments = [...currentSegments];
    newSegments.splice(index, 1);
    updateSegments(newSegments);
  }, [getSegments, updateSegments]);

  // 播放控制
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 50);
  }, []);

  const handleSwapSourceAndTarget = useCallback(() => {
    if (!template) return;

    rememberSourceSelection(template);

    const nextSourceType = targetType;
    const nextSourceId = Number(template.targetId || 0);
    const nextTargetType = sourceType;
    const nextTargetId = Number(template.sourceId || 0);

    let nextWeaponId: number | undefined;
    let nextSkillId: number | undefined;

    if (nextSourceType === 'actor') {
      const rememberedWeaponId = getRememberedActorWeapon(nextSourceId);
      nextWeaponId = rememberedWeaponId > 0 ? rememberedWeaponId : undefined;
      nextSkillId = undefined;
    } else {
      const rememberedSkillId = getRememberedEnemySkill(nextSourceId);
      nextSkillId = rememberedSkillId > 0 ? rememberedSkillId : undefined;
      nextWeaponId = undefined;
    }

    updateTemplate({
      sourceType: nextSourceType,
      sourceId: nextSourceId,
      targetType: nextTargetType,
      targetId: nextTargetId,
      weaponId: nextWeaponId,
      skillId: nextSkillId,
    });

    ToastManager.success('已交换发射方与目标方数据');
  }, [getRememberedActorWeapon, getRememberedEnemySkill, rememberSourceSelection, sourceType, targetType, template, updateTemplate]);

  const totalFrames = getSegments().reduce((sum, seg) => sum + normalizeDurationFrames(seg.duration), 0) || 0;

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧弹道模板以编辑</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0e17]">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          弹道编辑器
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

      <Collapse activeKey={activeKeys} onChange={setActiveKeys}>
        <Panel header="弹道模板" key="template">
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={handleCreateProjectile}>
              新建
            </Button>
            <Button icon={<CopyOutlined />} onClick={() => void handleCopyProjectile()}>
              复制
            </Button>
            <Popconfirm
              title="确认删除当前弹道模板？"
              okText="删除"
              cancelText="取消"
              onConfirm={handleDeleteProjectile}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Tag color="cyan">当前条目 #{Math.max(1, currentItemIndex)}</Tag>
          </Space>
        </Panel>

        <Panel header="发射偏移配置" key="offset">
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              该配置会直接写入 `Actors.json / Enemies.json` 的 `projectileOffset` 字段，并实时影响下方预览起始位置。
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Card size="small" title="我方角色（按武器类型）" bodyStyle={{ backgroundColor: '#131825' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">角色</label>
                    <Select
                      value={actorOffsetActorId}
                      onChange={setActorOffsetActorId}
                      options={getDataOptions(actors)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">武器</label>
                    <Select
                      value={actorOffsetWeaponId}
                      onChange={setActorOffsetWeaponId}
                      options={getDataOptions(weapons)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">偏移 X</label>
                    <InputNumber
                      value={actorOffsetX}
                      onChange={(value) => setActorOffsetX(Number(value || 0))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">偏移 Y</label>
                    <InputNumber
                      value={actorOffsetY}
                      onChange={(value) => setActorOffsetY(Number(value || 0))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    type="primary"
                    onClick={handleSaveActorOffset}
                    disabled={actorOffsetActorId <= 0 || actorOffsetWeaponId <= 0}
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    保存角色偏移
                  </Button>
                </div>
              </Card>

              <Card size="small" title="敌方单位（按技能）" bodyStyle={{ backgroundColor: '#131825' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">敌人</label>
                    <Select
                      value={enemyOffsetEnemyId}
                      onChange={setEnemyOffsetEnemyId}
                      options={getDataOptions(enemies)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">技能</label>
                    <Select
                      value={enemyOffsetSkillId}
                      onChange={setEnemyOffsetSkillId}
                      options={getDataOptions(skills)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">偏移 X</label>
                    <InputNumber
                      value={enemyOffsetX}
                      onChange={(value) => setEnemyOffsetX(Number(value || 0))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">偏移 Y</label>
                    <InputNumber
                      value={enemyOffsetY}
                      onChange={(value) => setEnemyOffsetY(Number(value || 0))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    type="primary"
                    onClick={handleSaveEnemyOffset}
                    disabled={enemyOffsetEnemyId <= 0 || enemyOffsetSkillId <= 0}
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    保存敌人偏移
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </Panel>

        {/* 预览区域 */}
        <Panel
          header={
            <div className="flex justify-between items-center w-full pr-8">
              <span>弹道预览</span>
              <Space onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-500">发射方位置:</span>
                <Select
                  size="small"
                  value={emitterSide}
                  onChange={(value) => setEmitterSide(value)}
                  options={[
                    { value: 'left', label: '左侧发射 / 右侧目标' },
                    { value: 'right', label: '右侧发射 / 左侧目标' },
                  ]}
                  style={{ width: 180 }}
                />
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={handleSwapSourceAndTarget}
                >
                  交换发射/目标数据
                </Button>
                <span className="text-xs text-gray-500">总时长: {totalFrames}f</span>
              </Space>
            </div>
          }
          key="preview"
        >
          <div className="space-y-4">
            {/* 发射方/目标方设置（预览配置）*/}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card size="small" title="发射方配置" bodyStyle={{ backgroundColor: '#131825' }}>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">发射方类型</label>
                    <Select
                      value={sourceType}
                      onChange={(value) => handleSourceTypeChange(value as 'actor' | 'enemy')}
                      options={[
                        { value: 'actor', label: '角色' },
                        { value: 'enemy', label: '敌人' },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">发射方 ID</label>
                    <Select
                      value={template?.sourceId || 0}
                      onChange={(value) => handleSourceIdChange(value)}
                      options={getSourceOptions()}
                      className="w-full"
                      placeholder="选择发射方"
                    />
                  </div>
                  {sourceType === 'actor' ? (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">武器</label>
                      <Select
                        value={template?.weaponId || 0}
                        onChange={(value) => handleSourceWeaponChange(value)}
                        options={getDataOptions(weapons)}
                        className="w-full"
                        placeholder="选择武器"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">技能</label>
                      <Select
                        value={template?.skillId || 0}
                        onChange={(value) => handleSourceSkillChange(value)}
                        options={getDataOptions(skills)}
                        className="w-full"
                        placeholder="选择技能"
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card size="small" title="目标方配置" bodyStyle={{ backgroundColor: '#131825' }}>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">目标方类型</label>
                    <Select
                      value={targetType}
                      onChange={(value) => {
                        updateTemplate({
                          targetType: value as 'actor' | 'enemy',
                          targetId: 0,
                        });
                      }}
                      options={[
                        { value: 'actor', label: '角色' },
                        { value: 'enemy', label: '敌人' },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">目标方 ID</label>
                    <Select
                      value={template?.targetId || 0}
                      onChange={(value) => updateTemplate({ targetId: value })}
                      options={getTargetOptions()}
                      className="w-full"
                      placeholder="选择目标"
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div className="w-full rounded overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
              <ProjectileCanvas
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                offsetRevision={offsetRevision}
                emitterSide={emitterSide}
                onPlaybackComplete={() => setIsPlaying(false)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handlePlay}
                  disabled={isPlaying}
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  播放
                </Button>
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePause}
                  disabled={!isPlaying}
                >
                  暂停
                </Button>
                <Button
                  icon={<RedoOutlined />}
                  onClick={handleReset}
                >
                  重置
                </Button>
              </Space>
              
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-gray-400">播放速度:</span>
                <Slider
                  value={playbackSpeed}
                  onChange={setPlaybackSpeed}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-32"
                />
                <span className="text-sm text-gray-400 w-12">{playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* 模板设置 */}
        <Panel header="模板设置" key="settings">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">模板名称</label>
                <Input
                  value={template.name}
                  onChange={(e) => updateTemplate({ name: e.target.value })}
                  placeholder="输入模板名称"
                />
              </div>
            </div>

            {/* 动画设置 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">动画设置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">起始动画</label>
                  <Select
                    value={template.startAnimationId || 0}
                    onChange={(value) => updateTemplate({ startAnimationId: value || undefined })}
                    options={getAnimationOptions()}
                    className="w-full"
                    placeholder="选择起始动画"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">发射动画</label>
                  <Select
                    value={template?.launchAnimation?.animationId || 0}
                    onChange={(value) => {
                      updateTemplate({
                        launchAnimation: {
                          animationId: value || 0,
                          segments: template?.launchAnimation?.segments || [],
                        },
                      });
                    }}
                    options={getAnimationOptions()}
                    className="w-full"
                    placeholder="选择发射动画"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">结束动画</label>
                  <Select
                    value={template.endAnimationId || 0}
                    onChange={(value) => updateTemplate({ endAnimationId: value || undefined })}
                    options={getAnimationOptions()}
                    className="w-full"
                    placeholder="选择结束动画"
                  />
                </div>
              </div>
            </div>

          </div>
        </Panel>

        {/* 轨迹节点 */}
        <Panel
          header={
            <div className="flex justify-between items-center w-full pr-8">
              <span>轨迹节点 ({getSegments().length || 0})</span>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  addSegment();
                }}
              >
                添加节点
              </Button>
            </div>
          }
          key="segments"
        >
          <Space direction="vertical" className="w-full">
            {getSegments().map((segment, index) => (
              <Card
                key={index}
                size="small"
                title={`节点 ${index + 1}`}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeSegment(index)}
                  />
                }
              >
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">目标 X</label>
                    <InputNumber
                      value={segment.targetX}
                      onChange={(value) => updateSegment(index, { targetX: value || 0 })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">目标 Y</label>
                    <InputNumber
                      value={segment.targetY}
                      onChange={(value) => updateSegment(index, { targetY: value || 0 })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">持续时间 (帧)</label>
                    <InputNumber
                      value={toDurationFrameDisplay(segment.duration)}
                      onChange={(value) => updateSegment(index, { duration: value || 1 })}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">X轴缓动</label>
                    <Select
                      value={segment.easeX || segment.easing || 'linear'}
                      onChange={(value) => updateSegment(index, { easeX: value })}
                      options={EASING_OPTIONS}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Y轴缓动</label>
                    <Select
                      value={segment.easeY || segment.easing || 'linear'}
                      onChange={(value) => updateSegment(index, { easeY: value })}
                      options={EASING_OPTIONS}
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            ))}
            {(getSegments().length === 0) && (
              <p className="text-gray-500 text-center py-4">暂无轨迹节点，点击上方按钮添加</p>
            )}
          </Space>
        </Panel>
      </Collapse>
    </div>
  );
}

export default ProjectilePanel;
  const normalizePathKey = (value: string) => {
    const normalized = (value || '').replace(/\\/g, '/');
    return /^[A-Za-z]:\//.test(normalized) ? normalized.toLowerCase() : normalized;
  };

  const findDataIndexById = (data: unknown[] | null, id: number): number => {
    if (!Array.isArray(data) || id <= 0) return -1;
    for (let i = 1; i < data.length; i++) {
      const entry = data[i] as Record<string, unknown> | null;
      if (entry && typeof entry === 'object' && Number(entry.id) === id) {
        return i;
      }
    }
    if (id < data.length) return id;
    return -1;
  };
