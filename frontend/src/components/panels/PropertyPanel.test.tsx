import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyPanel from './PropertyPanel';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import type { RPGItem } from '../../types';

const WEAPONS_FILE_PATH = 'D:/Project/data/Weapons.json';
const SKILLS_FILE_PATH = 'D:/Project/data/Skills.json';
const ACTORS_FILE_PATH = 'D:/Project/data/Actors.json';

const createWeapon = (overrides: Record<string, unknown> = {}) => ({
  id: 132,
  name: '散射弩',
  params: [0, 0, 0, 0, 0, 0, 0, 0],
  floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
  extraParams: [],
  vehicleParams: [],
  upgradeParams: [],
  ownerParams: {
    baseParams: [0, 0, 0, 0, 0, 0, 0, 0],
    elementRate: [0],
    paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
    extraParams: [0, 0, 0, 0, 0, 0],
    scalar: [0],
    specialParams: [0, 0, 0, 0, 0, 0],
  },
  passiveStates: [],
  effects: [],
  qualityLock: false,
  price: 0,
  areaOverride: 1,
  areaMode: 2,
  shapeType: 2,
  areaTargetCount: 2,
  repeatTime: 1,
  repeatTimeFloat: 0,
  attackSkillId: 0,
  attackElementId: 0,
  weaponImageId: 3,
  shapeParams: {
    1: { radius: 120 },
    2: { radius: 900, angleDeg: 20 },
    3: { width: 80, length: 240 },
  },
  customParams: {},
  ...overrides,
});

const createSkill = (id: number, overrides: Record<string, unknown> = {}): RPGItem => ({
  id,
  name: `测试技能${id}`,
  targetType: 0,
  limits: -1,
  needTargetSelect: false,
  needWeaponSelect: false,
  projectileId: 0,
  skillProjectileTag: 0,
  reactionSuccessRate: 0,
  reactionPriority: 0,
  targetCamp: 1,
  targetLifeState: 1,
  selectMode: 1,
  areaMode: 1,
  actionSequenceType: 1,
  actionSequenceScriptKey: '',
  skillCosts: [],
  skillEffectSpec: {
    damage: {
      damageType: 'none',
      damageElementId: 0,
      allowCritical: true,
      damageScatter: 20,
      formula: { mode: 'basic', scriptKey: '' },
    },
    durabilityChange: { mode: 'none', value: 0 },
    skillDurability: { halfBrokenSkipRate: 0 },
  },
  ...overrides,
} as unknown as RPGItem);

const createActor = (overrides: Record<string, unknown> = {}): RPGItem => ({
  id: 1,
  name: '主角',
  params: [100, 0, 10, 8, 0, 0, 12, 5],
  ownerParams: {
    baseParams: [0, 0, 17, 0, 0, 0, 0, 0],
    paramRate: [0, 0, 0.2, 0, 0, 0, 0, 0],
    elementRate: [0, 0, 0],
    extraParams: [0, 0, 0, 0, 0, 0],
    scalar: [0],
    specialParams: [0, 0, 0, 0, 0, 0],
  },
  passiveStates: [],
  effects: [],
  isStaticImage: false,
  isTank: false,
  ...overrides,
} as unknown as RPGItem);

describe('PropertyPanel range initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    DataLoaderService.clearCache();
    vi.spyOn(DataLoaderService, 'ensureEquipExtensionsLoaded').mockResolvedValue(null);

    useEditorStore.setState({
      currentData: null,
      currentMapData: null,
      currentMapInfos: [],
      currentMapId: null,
      currentFile: '',
      currentFilePath: '',
      currentFileType: 'data',
      currentItemIndex: 0,
      currentItem: null,
      currentScriptKey: '',
      dirtyFiles: {},
      dirtyItemIndexes: {},
      uiMode: 'property',
      workspaceRoot: '',
    });
  });

  it('武器范围初始化时不会把合法扇形收口成圆形', async () => {
    useEditorStore.getState().loadData([null, createWeapon()], WEAPONS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('扇形角度');
    expect(screen.getByText('扇形半径')).toBeInTheDocument();
    expect(screen.queryByText('圆形半径')).not.toBeInTheDocument();

    await waitFor(() => {
      const currentWeapon = useEditorStore.getState().currentData?.[1] as {
        shapeType?: number;
        areaTargetCount?: number;
      };
      expect(currentWeapon.shapeType).toBe(2);
      expect(currentWeapon.areaTargetCount).toBe(2);
    });
  });

  it('武器基础属性会显示并保存 weaponImageId', async () => {
    useEditorStore.getState().loadData([null, createWeapon({ weaponImageId: 3 })], WEAPONS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    const weaponImageInput = await screen.findByDisplayValue('3');
    fireEvent.change(weaponImageInput, { target: { value: '5' } });

    await waitFor(() => {
      const currentWeapon = useEditorStore.getState().currentData?.[1] as {
        weaponImageId?: number;
      };
      expect(currentWeapon.weaponImageId).toBe(5);
    });
  });

  it('角色属性面板会暴露并保存 owner 基础属性', async () => {
    useEditorStore.getState().loadData([null, createActor()], ACTORS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('角色扩展');
    expect(screen.getByText('基础属性追加')).toBeInTheDocument();
    expect(screen.getByText('基础属性倍率追加')).toBeInTheDocument();

    const baseAtkInput = await screen.findByDisplayValue('17');
    fireEvent.change(baseAtkInput, { target: { value: '19' } });

    await waitFor(() => {
      const currentActor = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentActor.ownerParams?.baseParams?.[2]).toBe(19);
    });
  });

  it('技能属性初始化和切换条目不会触发递归更新', async () => {
    useEditorStore.getState().loadData([
      null,
      createSkill(1),
      createSkill(2, { targetType: 2, limits: 3, needTargetSelect: true, needWeaponSelect: true }),
    ], SKILLS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('技能伤害 / 耐久协议');
    expect(screen.getByText('作用目标类型')).toBeInTheDocument();

    act(() => {
      useEditorStore.getState().selectItem(2);
    });

    await waitFor(() => {
      expect(useEditorStore.getState().currentItemIndex).toBe(2);
    });
    expect(screen.getByText('技能伤害 / 耐久协议')).toBeInTheDocument();
  });
});
