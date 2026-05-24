import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Select, Input, InputNumber, Space, Collapse, Slider, Popconfirm, Tag } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  RedoOutlined,
  SwapOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '../../stores/editorStore';
import { ProjectileCanvas } from '../common/ProjectileCanvas';
import type { ProjectilePreviewTemplate, ProjectileTemplate, TrajectorySegment } from '../../types';
import { ToastManager } from '../common/ToastManager';
import { InputDialog } from '../common/InputDialog';
import { DataLoaderService } from '../../services/DataLoaderService';
import { BACKSLASH_REGEXP, TRAILING_PATH_SEPARATORS_REGEXP, WINDOWS_DRIVE_REGEXP } from '../../constants/regexp';
import { EventSystem } from '../../core/EventSystem';
import {
  cloneProjectileTemplate,
  createDefaultProjectileTemplate,
  stripProjectilePreviewFields,
} from '../../services/ProjectileTemplateService';
import {
  findDataEntryById,
  resolveActorProjectileOffset,
  resolveEnemyProjectileOffset,
  resolveThrowProjectileWtypeId,
  normalizeDurationFrames,
  THROW_PROJECTILE_WEAPON_LABEL,
  THROW_PROJECTILE_WEAPON_OPTION_ID,
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

const resolveDataItemLabel = (items: DataItem[], id: number, emptyLabel = '未选择') => {
  if (id === THROW_PROJECTILE_WEAPON_OPTION_ID) {
    return THROW_PROJECTILE_WEAPON_LABEL;
  }
  if (id <= 0) {
    return emptyLabel;
  }
  const match = items.find((item) => item.id === id);
  return match ? `${match.id} : ${match.name}` : `${id}`;
};

const ANIMATIONS_FILE_NAME = 'Animations.json';
const ACTORS_FILE_NAME = 'Actors.json';
const ENEMIES_FILE_NAME = 'Enemies.json';
const WEAPONS_FILE_NAME = 'Weapons.json';
const SKILLS_FILE_NAME = 'Skills.json';
const SYSTEM_FILE_NAME = 'System.json';
const PROJECTILE_REFERENCE_FILES = new Set([
  ANIMATIONS_FILE_NAME.toLowerCase(),
  ACTORS_FILE_NAME.toLowerCase(),
  ENEMIES_FILE_NAME.toLowerCase(),
  WEAPONS_FILE_NAME.toLowerCase(),
  SKILLS_FILE_NAME.toLowerCase(),
  SYSTEM_FILE_NAME.toLowerCase(),
]);

export function ProjectilePanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentData = useEditorStore((state) => state.currentData);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeKeys, setActiveKeys] = useState<string[]>(['template', 'offset', 'preview', 'settings', 'segments']);
  const [offsetRevision, setOffsetRevision] = useState(0);
  const [referenceRevision, setReferenceRevision] = useState(0);
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
  const [previewSourceType, setPreviewSourceType] = useState<'actor' | 'enemy'>('actor');
  const [previewSourceId, setPreviewSourceId] = useState(0);
  const [previewTargetType, setPreviewTargetType] = useState<'actor' | 'enemy'>('enemy');
  const [previewTargetId, setPreviewTargetId] = useState(0);
  const actorWeaponMemoryRef = useRef<Record<number, number>>({});
  const enemySkillMemoryRef = useRef<Record<number, number>>({});

  const template = currentItem as ProjectileTemplate | null;
  const hasTemplate = Boolean(template);
  const sourceType = previewSourceType;
  const targetType = previewTargetType;
  const systemData = useMemo(() => DataLoaderService.getCachedDataByName(SYSTEM_FILE_NAME), [referenceRevision]);
  const throwProjectileWtypeId = useMemo(() => resolveThrowProjectileWtypeId(systemData), [systemData]);

  const config = useEditorStore((state) => state.config);

  const rememberSourceSelection = useCallback(() => {
    const currentSourceType = previewSourceType;
    const sourceId = previewSourceId;
    if (sourceId <= 0) return;

    if (currentSourceType === 'actor') {
      const weaponId = actorOffsetWeaponId;
      if (weaponId !== 0) {
        actorWeaponMemoryRef.current[sourceId] = weaponId;
      }
      return;
    }

    const skillId = enemyOffsetSkillId;
    if (skillId > 0) {
      enemySkillMemoryRef.current[sourceId] = skillId;
    }
  }, [actorOffsetWeaponId, enemyOffsetSkillId, previewSourceId, previewSourceType]);

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

  const extractAnimationItems = useCallback((data: unknown[] | null): AnimationItem[] => {
    if (!Array.isArray(data) || data.length < 2) {
      return [];
    }
    return data.slice(1).map((item: any, index) => ({
      id: item?.id ?? index + 1,
      name: item?.name || `动画 ${index + 1}`,
    }));
  }, []);

  const loadReferenceData = useCallback(() => {
    setAnimationOptions(extractAnimationItems(DataLoaderService.getCachedDataByName(ANIMATIONS_FILE_NAME)));
    setActors(extractDataItems(DataLoaderService.getCachedDataByName(ACTORS_FILE_NAME)));
    setEnemies(extractDataItems(DataLoaderService.getCachedDataByName(ENEMIES_FILE_NAME)));
    setWeapons(extractDataItems(DataLoaderService.getCachedDataByName(WEAPONS_FILE_NAME)));
    setSkills(extractDataItems(DataLoaderService.getCachedDataByName(SKILLS_FILE_NAME)));
  }, [extractAnimationItems]);

  // 加载动画和角色/敌人/武器/技能数据
  useEffect(() => {
    loadReferenceData();

    const refreshReferences = (payload?: unknown) => {
      const fileName = payload && typeof payload === 'object' && !Array.isArray(payload) && 'fileName' in payload
        ? String((payload as { fileName?: unknown }).fileName || '').toLowerCase()
        : '';
      if (!fileName || PROJECTILE_REFERENCE_FILES.has(fileName)) {
        loadReferenceData();
        setReferenceRevision((value) => value + 1);
      }
    };

    // 监听数据清单加载完成事件（工作空间加载时触发）
    EventSystem.on('data:manifest-loaded', refreshReferences);

    // 监听数据文件加载事件（菜单切换数据文件时触发）
    EventSystem.on('data:file-loaded', refreshReferences);

    // 延迟再试一次（确保数据已加载）
    const retryTimer = setTimeout(() => {
      const animationsData = DataLoaderService.getCachedDataByName(ANIMATIONS_FILE_NAME);
      if (!animationsData || animationsData.length < 2) {
        loadReferenceData();
      }
    }, 500);

    return () => {
      EventSystem.off('data:manifest-loaded', refreshReferences);
      EventSystem.off('data:file-loaded', refreshReferences);
      clearTimeout(retryTimer);
    };
  }, [config.dataPath, config.projectRoot, loadReferenceData]);

  const animationSelectOptions = useMemo(() => [
    { value: 0, label: '无动画' },
    ...animationOptions.map((item) => ({
      value: item.id || 0,
      label: `${item.id} : ${item.name}`,
    })),
  ], [animationOptions]);

  const actorSelectOptions = useMemo(() => [
    { value: 0, label: '未选择' },
    ...actors.map((item) => ({
      value: item.id,
      label: `${item.id} : ${item.name}`,
    })),
  ], [actors]);
  const enemySelectOptions = useMemo(() => [
    { value: 0, label: '未选择' },
    ...enemies.map((item) => ({
      value: item.id,
      label: `${item.id} : ${item.name}`,
    })),
  ], [enemies]);
  const weaponSelectOptions = useMemo(() => [
    { value: 0, label: '未选择' },
    ...weapons.map((item) => ({
      value: item.id,
      label: `${item.id} : ${item.name}`,
    })),
  ], [weapons]);
  const actorOffsetWeaponOptions = useMemo(() => {
    const [emptyOption, ...weaponItems] = weaponSelectOptions;
    return [
      emptyOption,
      {
        value: THROW_PROJECTILE_WEAPON_OPTION_ID,
        label: `${throwProjectileWtypeId} : ${THROW_PROJECTILE_WEAPON_LABEL}`,
      },
      ...weaponItems,
    ];
  }, [throwProjectileWtypeId, weaponSelectOptions]);
  const skillSelectOptions = useMemo(() => [
    { value: 0, label: '未选择' },
    ...skills.map((item) => ({
      value: item.id,
      label: `${item.id} : ${item.name}`,
    })),
  ], [skills]);
  const sourceOptions = useMemo(
    () => (sourceType === 'actor' ? actorSelectOptions : enemySelectOptions),
    [actorSelectOptions, enemySelectOptions, sourceType],
  );
  const targetOptions = useMemo(
    () => (targetType === 'actor' ? actorSelectOptions : enemySelectOptions),
    [actorSelectOptions, enemySelectOptions, targetType],
  );
  const currentActorOffsetName = useMemo(
    () => resolveDataItemLabel(actors, actorOffsetActorId, '未选择角色'),
    [actorOffsetActorId, actors],
  );
  const currentActorOffsetWeaponName = useMemo(
    () => resolveDataItemLabel(weapons, actorOffsetWeaponId, '未选择武器'),
    [actorOffsetWeaponId, weapons],
  );
  const currentEnemyOffsetName = useMemo(
    () => resolveDataItemLabel(enemies, enemyOffsetEnemyId, '未选择敌人'),
    [enemies, enemyOffsetEnemyId],
  );
  const currentEnemyOffsetSkillName = useMemo(
    () => resolveDataItemLabel(skills, enemyOffsetSkillId, '未选择技能'),
    [enemyOffsetSkillId, skills],
  );

  // 更新模板
  const updateTemplate = useCallback((updates: Partial<ProjectileTemplate>) => {
    if (!template || !currentData || currentItemIndex < 0) return;

    const updatedTemplate = {
      ...stripProjectilePreviewFields(template as unknown as Record<string, unknown>),
      ...updates,
    };
    const newData = [...currentData];
    newData[currentItemIndex] = updatedTemplate;
    
    const { loadData } = useEditorStore.getState();
    loadData(newData as any[], currentFilePath || '', 'projectile');
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
  }, [template, currentData, currentItemIndex, currentFilePath, markFileDirty, markItemDirty]);

  const applyProjectileDataAndSelect = useCallback((nextData: (ProjectileTemplate | null)[], nextIndex: number) => {
    const { loadData, selectItem } = useEditorStore.getState();
    loadData(nextData as any[], currentFilePath || '', 'projectile');
    const clamped = Math.min(Math.max(nextIndex, 1), Math.max(nextData.length - 1, 1));
    selectItem(clamped);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, clamped);
    }
  }, [currentFilePath, markFileDirty, markItemDirty]);

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
    setPreviewSourceType(value);
    setPreviewSourceId(0);
    if (value === 'actor') {
      setActorOffsetActorId(0);
      setActorOffsetWeaponId(0);
    } else {
      setEnemyOffsetEnemyId(0);
      setEnemyOffsetSkillId(0);
    }
  }, [rememberSourceSelection]);

  const handleSourceIdChange = useCallback((value: number) => {
    rememberSourceSelection();
    if (sourceType === 'actor') {
      const rememberedWeaponId = getRememberedActorWeapon(value);
      setPreviewSourceId(value);
      setActorOffsetActorId(value);
      setActorOffsetWeaponId(rememberedWeaponId);
      return;
    }

    const rememberedSkillId = getRememberedEnemySkill(value);
    setPreviewSourceId(value);
    setEnemyOffsetEnemyId(value);
    setEnemyOffsetSkillId(rememberedSkillId);
  }, [getRememberedActorWeapon, getRememberedEnemySkill, rememberSourceSelection, sourceType]);

  const handleSourceWeaponChange = useCallback((value: number) => {
    const sourceId = previewSourceId;
    if (sourceId > 0 && value !== 0) {
      actorWeaponMemoryRef.current[sourceId] = value;
    }
    setActorOffsetWeaponId(value);
  }, [previewSourceId]);

  const handleSourceSkillChange = useCallback((value: number) => {
    const sourceId = previewSourceId;
    if (sourceId > 0 && value > 0) {
      enemySkillMemoryRef.current[sourceId] = value;
    }
    setEnemyOffsetSkillId(value);
  }, [previewSourceId]);

  const getActorOffsetFromCache = useCallback((actorId: number, weaponId: number) => {
    if (actorId <= 0 || weaponId === 0) return { x: 0, y: 0 };
    const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
    const actor = findDataEntryById(actorsData, actorId);
    let weapon: Record<string, unknown> | null = null;
    if (weaponId === THROW_PROJECTILE_WEAPON_OPTION_ID) {
      weapon = { id: THROW_PROJECTILE_WEAPON_OPTION_ID, wtypeId: throwProjectileWtypeId };
    } else if (weaponId > 0) {
      const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
      weapon = findDataEntryById(weaponsData, weaponId);
    }
    return resolveActorProjectileOffset(actor, weapon);
  }, [throwProjectileWtypeId]);

  const getEnemyOffsetFromCache = useCallback((enemyId: number, skillId: number) => {
    if (enemyId <= 0 || skillId <= 0) return { x: 0, y: 0 };
    const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
    const enemy = findDataEntryById(enemiesData, enemyId);
    return resolveEnemyProjectileOffset(enemy, skillId);
  }, []);

  useEffect(() => {
    if (!hasTemplate) return;
    setPreviewSourceType('actor');
    setPreviewSourceId(0);
    setPreviewTargetType('enemy');
    setPreviewTargetId(0);
    setActorOffsetActorId(0);
    setActorOffsetWeaponId(0);
    setEnemyOffsetEnemyId(0);
    setEnemyOffsetSkillId(0);
  }, [currentItemIndex, hasTemplate, template?.id]);

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

  const handleSaveActorOffset = useCallback((silent = false) => {
    if (actorOffsetActorId <= 0 || actorOffsetWeaponId === 0) {
      if (!silent) {
        ToastManager.error('请选择角色与武器');
      }
      return;
    }

    const actorsData = DataLoaderService.getCachedDataByName('Actors.json');
    const weaponsData = DataLoaderService.getCachedDataByName('Weapons.json');
    const actorFilePath = DataLoaderService.getFilePathByName('Actors.json')
      || (config.dataPath ? `${config.dataPath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '').replace(BACKSLASH_REGEXP, '/')}/Actors.json` : '');

    if (!actorsData || !actorFilePath) {
      if (!silent) {
        ToastManager.error('角色数据未加载');
      }
      return;
    }

    let wtypeId = 0;
    if (actorOffsetWeaponId === THROW_PROJECTILE_WEAPON_OPTION_ID) {
      wtypeId = throwProjectileWtypeId;
    } else {
      const weapon = findDataEntryById(weaponsData, actorOffsetWeaponId);
      wtypeId = Number((weapon?.wtypeId as number) || 0);
    }
    if (wtypeId <= 0) {
      if (!silent) {
        ToastManager.error('武器类型无效，无法保存偏移');
      }
      return;
    }

    const actorIndex = findDataIndexById(actorsData, actorOffsetActorId);
    if (actorIndex <= 0) {
      if (!silent) {
        ToastManager.error('角色数据未找到');
      }
      return;
    }

    const nextActors = [...actorsData];
    const sourceActor = nextActors[actorIndex] as Record<string, unknown> | null;
    if (!sourceActor || typeof sourceActor !== 'object') {
      if (!silent) {
        ToastManager.error('角色数据无效');
      }
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
    if (!silent) {
      ToastManager.success('角色发射偏移已保存');
    }
  }, [
    actorOffsetActorId,
    actorOffsetWeaponId,
    actorOffsetX,
    actorOffsetY,
    currentFilePath,
    markFileDirty,
    markItemDirty,
    throwProjectileWtypeId,
  ]);

  const handleSaveEnemyOffset = useCallback((silent = false) => {
    if (enemyOffsetEnemyId <= 0 || enemyOffsetSkillId <= 0) {
      if (!silent) {
        ToastManager.error('请选择敌人与技能');
      }
      return;
    }

    const enemiesData = DataLoaderService.getCachedDataByName('Enemies.json');
    const enemyFilePath = DataLoaderService.getFilePathByName('Enemies.json')
      || (config.dataPath ? `${config.dataPath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '').replace(BACKSLASH_REGEXP, '/')}/Enemies.json` : '');

    if (!enemiesData || !enemyFilePath) {
      if (!silent) {
        ToastManager.error('敌人数据未加载');
      }
      return;
    }

    const enemyIndex = findDataIndexById(enemiesData, enemyOffsetEnemyId);
    if (enemyIndex <= 0) {
      if (!silent) {
        ToastManager.error('敌人数据未找到');
      }
      return;
    }

    const nextEnemies = [...enemiesData];
    const sourceEnemy = nextEnemies[enemyIndex] as Record<string, unknown> | null;
    if (!sourceEnemy || typeof sourceEnemy !== 'object') {
      if (!silent) {
        ToastManager.error('敌人数据无效');
      }
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
    if (!silent) {
      ToastManager.success('敌人发射偏移已保存');
    }
  }, [
    currentFilePath,
    enemyOffsetEnemyId,
    enemyOffsetSkillId,
    enemyOffsetX,
    enemyOffsetY,
    markFileDirty,
    markItemDirty,
  ]);

  useEffect(() => {
    if (actorOffsetActorId <= 0 || actorOffsetWeaponId === 0) {
      return;
    }
    const currentOffset = getActorOffsetFromCache(actorOffsetActorId, actorOffsetWeaponId);
    if (currentOffset.x === actorOffsetX && currentOffset.y === actorOffsetY) {
      return;
    }
    const timer = window.setTimeout(() => {
      handleSaveActorOffset(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    actorOffsetActorId,
    actorOffsetWeaponId,
    actorOffsetX,
    actorOffsetY,
    getActorOffsetFromCache,
    handleSaveActorOffset,
  ]);

  useEffect(() => {
    if (enemyOffsetEnemyId <= 0 || enemyOffsetSkillId <= 0) {
      return;
    }
    const currentOffset = getEnemyOffsetFromCache(enemyOffsetEnemyId, enemyOffsetSkillId);
    if (currentOffset.x === enemyOffsetX && currentOffset.y === enemyOffsetY) {
      return;
    }
    const timer = window.setTimeout(() => {
      handleSaveEnemyOffset(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    enemyOffsetEnemyId,
    enemyOffsetSkillId,
    enemyOffsetX,
    enemyOffsetY,
    getEnemyOffsetFromCache,
    handleSaveEnemyOffset,
  ]);

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

    rememberSourceSelection();

    const nextSourceType = targetType;
    const nextSourceId = previewTargetId;
    const nextTargetType = sourceType;
    const nextTargetId = previewSourceId;

    let nextWeaponId: number | undefined;
    let nextSkillId: number | undefined;

    if (nextSourceType === 'actor') {
      const rememberedWeaponId = getRememberedActorWeapon(nextSourceId);
      nextWeaponId = rememberedWeaponId !== 0 ? rememberedWeaponId : undefined;
      nextSkillId = undefined;
      setActorOffsetActorId(nextSourceId);
      setActorOffsetWeaponId(nextWeaponId || 0);
    } else {
      const rememberedSkillId = getRememberedEnemySkill(nextSourceId);
      nextSkillId = rememberedSkillId > 0 ? rememberedSkillId : undefined;
      nextWeaponId = undefined;
      setEnemyOffsetEnemyId(nextSourceId);
      setEnemyOffsetSkillId(nextSkillId || 0);
    }

    setPreviewSourceType(nextSourceType);
    setPreviewSourceId(nextSourceId);
    setPreviewTargetType(nextTargetType);
    setPreviewTargetId(nextTargetId);

    ToastManager.success('已交换发射方与目标方数据');
  }, [
    getRememberedActorWeapon,
    getRememberedEnemySkill,
    previewSourceId,
    previewTargetId,
    rememberSourceSelection,
    sourceType,
    targetType,
    template,
  ]);

  const totalFrames = getSegments().reduce((sum, seg) => sum + normalizeDurationFrames(seg.duration), 0) || 0;
  const previewTemplate = useMemo<ProjectilePreviewTemplate | null>(() => {
    if (!template) return null;
    return sourceType === 'actor'
      ? {
          ...template,
          sourceType,
          sourceId: previewSourceId,
          targetType,
          targetId: previewTargetId,
          weaponId: actorOffsetWeaponId || undefined,
          skillId: undefined,
        }
      : {
          ...template,
          sourceType,
          sourceId: previewSourceId,
          targetType,
          targetId: previewTargetId,
          weaponId: undefined,
          skillId: enemyOffsetSkillId || undefined,
        };
  }, [
    actorOffsetWeaponId,
    enemyOffsetSkillId,
    previewSourceId,
    previewTargetId,
    sourceType,
    targetType,
    template,
  ]);

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
        </h2>
        <span className="text-xs text-gray-500">自动记录变更并标记脏文件</span>
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
              该配置会直接写入 `Actors.json / Enemies.json` 的 `projectileOffset` 字段，并跟随下方当前发射方配置实时影响预览起始位置。
            </p>
            <Card
              size="small"
              title={sourceType === 'actor' ? '当前我方发射偏移' : '当前敌方发射偏移'}
              bodyStyle={{ backgroundColor: '#131825' }}
            >
              {sourceType === 'actor' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                    <div>角色：{currentActorOffsetName}</div>
                    <div>武器：{currentActorOffsetWeaponName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                    <div>敌人：{currentEnemyOffsetName}</div>
                    <div>技能：{currentEnemyOffsetSkillName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                </div>
              )}
              <div className="mt-3">
                <span className="text-xs text-gray-500">自动记录偏移并标记脏文件</span>
              </div>
            </Card>
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
                showSearch
                optionFilterProp="label"
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
                    showSearch
                    optionFilterProp="label"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">发射方 ID</label>
                    <Select
                      value={previewSourceId}
                      onChange={(value) => handleSourceIdChange(value)}
                      options={sourceOptions}
                      className="w-full"
                      placeholder="选择发射方"
                    showSearch
                    optionFilterProp="label"
                    />
                  </div>
                  {sourceType === 'actor' ? (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">武器</label>
                      <Select
                        value={actorOffsetWeaponId}
                        onChange={(value) => handleSourceWeaponChange(value)}
                        options={actorOffsetWeaponOptions}
                        className="w-full"
                        placeholder="选择武器"
                      showSearch
                      optionFilterProp="label"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">技能</label>
                      <Select
                        value={enemyOffsetSkillId}
                        onChange={(value) => handleSourceSkillChange(value)}
                        options={skillSelectOptions}
                        className="w-full"
                        placeholder="选择技能"
                      showSearch
                      optionFilterProp="label"
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
                        setPreviewTargetType(value as 'actor' | 'enemy');
                        setPreviewTargetId(0);
                      }}
                      options={[
                        { value: 'actor', label: '角色' },
                        { value: 'enemy', label: '敌人' },
                      ]}
                      className="w-full"
                    showSearch
                    optionFilterProp="label"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">目标方 ID</label>
                    <Select
                      value={previewTargetId}
                      onChange={(value) => setPreviewTargetId(value)}
                      options={targetOptions}
                      className="w-full"
                      placeholder="选择目标"
                    showSearch
                    optionFilterProp="label"
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div className="w-full rounded overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
              <ProjectileCanvas
                template={previewTemplate}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                offsetRevision={offsetRevision}
                referenceRevision={referenceRevision}
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
                    options={animationSelectOptions}
                    className="w-full"
                    placeholder="选择起始动画"
                  showSearch
                  optionFilterProp="label"
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
                    options={animationSelectOptions}
                    className="w-full"
                    placeholder="选择发射动画"
                  showSearch
                  optionFilterProp="label"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">结束动画</label>
                  <Select
                    value={template.endAnimationId || 0}
                    onChange={(value) => updateTemplate({ endAnimationId: value || undefined })}
                    options={animationSelectOptions}
                    className="w-full"
                    placeholder="选择结束动画"
                  showSearch
                  optionFilterProp="label"
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
                    showSearch
                    optionFilterProp="label"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Y轴缓动</label>
                    <Select
                      value={segment.easeY || segment.easing || 'linear'}
                      onChange={(value) => updateSegment(index, { easeY: value })}
                      options={EASING_OPTIONS}
                      className="w-full"
                    showSearch
                    optionFilterProp="label"
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
    const normalized = (value || '').replace(BACKSLASH_REGEXP, '/');
    return WINDOWS_DRIVE_REGEXP.test(normalized) ? normalized.toLowerCase() : normalized;
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
