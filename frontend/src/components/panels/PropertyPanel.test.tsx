import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyPanel from './PropertyPanel';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { auditAndRepairDataFiles } from '../../services/DataAuditService';
import type { RPGItem } from '../../types';
import { CLASS_LEVEL_EXTENSIONS_FILE_NAME } from '../../services/ClassLevelExtensionsService';
import type { ClassGrowthMode } from '../../services/ClassLevelExtensionsService';
import { normalizeEquipmentDataEntry } from '../../services/EquipmentPropertyService';

const WEAPONS_FILE_PATH = 'D:/Project/data/Weapons.json';
const ARMORS_FILE_PATH = 'D:/Project/data/Armors.json';
const STATES_FILE_PATH = 'D:/Project/data/States.json';
const SKILLS_FILE_PATH = 'D:/Project/data/Skills.json';
const ACTORS_FILE_PATH = 'D:/Project/data/Actors.json';
const CLASSES_FILE_PATH = 'D:/Project/data/Classes.json';
const CLASS_LEVEL_EXTENSIONS_FILE_PATH = 'D:/Project/data/ClassLevelExtensions.json';

const createParamTemplate = (value: number) => ({
  value,
  floatValue: 0,
  upgradeValue: 0,
  upgradeFloatValue: 0,
});

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
  qualityLevel: 0,
  price: 0,
  areaOverride: 1,
  areaMode: 2,
  shapeType: 2,
  areaTargetCount: 2,
  repeatTime: 1,
  repeatTimeFloat: 0,
  attackSkillId: 0,
  weaponImageId: 3,
  shapeParams: {
    1: { radius: 120 },
    2: { radius: 900, angleDeg: 20 },
    3: { width: 80, length: 240 },
  },
  customParams: {},
  ...overrides,
});
const createArmor = (overrides: Record<string, unknown> = {}): RPGItem => ({
  id: 9,
  name: '测试甲',
  params: [0, 0, 0, 0, 0, 0, 0, 0],
  floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
  extraParams: Array.from({ length: 6 }, () => createParamTemplate(0)),
  vehicleParams: [
    createParamTemplate(11),
    createParamTemplate(12),
    createParamTemplate(13),
    createParamTemplate(14),
    createParamTemplate(15),
    createParamTemplate(16),
    createParamTemplate(17),
    createParamTemplate(19),
  ],
  upgradeParams: Array.from({ length: 3 }, () => createParamTemplate(0)),
  ownerParams: {
    baseParams: [0, 0, 0, 0, 0, 0, 0, 0],
    paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
    extraParams: [0, 0, 0, 0, 0, 0],
    scalar: [0, 0],
    specialParams: [0, 0, 0, 0, 0, 0],
  },
  passiveStates: [],
  effects: [],
  qualityLock: false,
  qualityLevel: 0,
  price: 77,
  elementRates: [0, 0],
  elementRateFloats: [0, 0],
  upgradeCosts: [],
  customParams: {},
  ...overrides,
} as unknown as RPGItem);

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
      damageElementIds: [],
      allowCritical: true,
      damageScatter: 20,
      formula: { mode: 'basic', scriptKey: '' },
    },
    durabilityChange: { mode: 'none', value: 0 },
    skillDurability: { halfBrokenSkipRate: 0 },
  },
  ...overrides,
} as unknown as RPGItem);
const createState = (overrides: Record<string, unknown> = {}): RPGItem => ({
  id: 7,
  name: '禁疗状态',
  ownerParams: {
    baseParams: [0, 0, 0, 0, 0, 0, 0, 0],
    paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
    elementRate: [0],
    extraParams: [0, 0, 0, 0, 0, 0],
    scalar: [0],
    specialParams: [0, 0, 0, 0, 0, 0],
  },
  passiveStates: [],
  effects: [],
  chargeConfig: {
    blockActions: false,
    grantAction: false,
    releaseSkillId: 0,
    queueScope: 0,
    queueShift: 0,
  },
  forbidHeal: false,
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

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const AUDIT_SYSTEM_DATA = {
  elements: ['', '通常'],
  weaponTypes: ['', '主炮', '副炮', 'SE'],
};

const createAuditFixtureFiles = (armorsData: unknown) => new Map<string, unknown>([
  ['D:/Project/data/System.json', AUDIT_SYSTEM_DATA],
  ['D:/Project/data/Actors.json', [null]],
  ['D:/Project/data/Classes.json', [null]],
  ['D:/Project/data/States.json', [null]],
  ['D:/Project/data/Enemies.json', [null]],
  ['D:/Project/data/Items.json', [null]],
  ['D:/Project/data/Weapons.json', [null]],
  ['D:/Project/data/Armors.json', [null, armorsData]],
  ['D:/Project/data/Projectiles.json', [null]],
  ['D:/Project/data/Troops.json', [null]],
  ['D:/Project/data/Skills.json', [null]],
  ['D:/Project/data/Effects.json', [null]],
  ['D:/Project/data/EquipExtensions.json', {
    weaponEquipTypes: [null],
    systemWeaponEquipTypes: [],
    actorEquipSlots: [null],
    actorEquips: [null],
    actorRefitRules: [null],
  }],
]);
const createClass = (overrides: Record<string, unknown> = {}): RPGItem => {
  const params = Array.from({ length: 8 }, (_, paramIndex) => {
    const levels = new Array(100).fill(0);
    levels[99] = (paramIndex + 1) * 10;
    return levels;
  });

  return {
    id: 1,
    name: '猎人',
    expParams: [30, 20, 30, 30],
    params,
    ownerParams: {
      baseParams: [0, 0, 0, 0, 0, 0, 0, 0],
      paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRate: [0],
      extraParams: [0, 0, 0, 0, 0, 0],
      scalar: [0],
      specialParams: [0, 0, 0, 0, 0, 0],
    },
    passiveStates: [],
    effects: [],
    ...overrides,
  } as unknown as RPGItem;
};

const createClassLevelExtensionData = () => ({
  schemaVersion: 2,
  classes: [
    null,
    {
      maxLevel: 100,
      expParams: [30, 20, 30, 30] as [number, number, number, number],
      paramCurves: Array.from({ length: 8 }, (_, index) => ({
        target: (index + 1) * 10,
        mode: 'standard' as ClassGrowthMode,
      })),
    },
  ],
});

describe('PropertyPanel range initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    DataLoaderService.clearCache();
    vi.spyOn(DataLoaderService, 'ensureEquipExtensionsLoaded').mockResolvedValue(null);
    vi.spyOn(DataLoaderService, 'ensureClassLevelExtensionsLoaded').mockResolvedValue(createClassLevelExtensionData());

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

  it('武器基础属性会显示并保存锁定品质等级', async () => {
    useEditorStore.getState().loadData([null, createWeapon({ qualityLock: true, qualityLevel: 2 })], WEAPONS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('锁定品质等级');
    const qualityInput = document.querySelector('#qualityLevel') as HTMLInputElement | null;
    if (qualityInput === null) throw new Error('qualityLevel input not found');
    fireEvent.change(qualityInput, { target: { value: '5' } });

    await waitFor(() => {
      const currentWeapon = useEditorStore.getState().currentData?.[1] as {
        qualityLock?: boolean;
        qualityLevel?: number;
      };
      expect(currentWeapon.qualityLock).toBe(true);
      expect(currentWeapon.qualityLevel).toBe(5);
    });
  });

  it('武器普通属性修改会被保存到 params', async () => {
    useEditorStore.getState().loadData([null, createWeapon()], WEAPONS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await waitFor(() => {
      expect(document.querySelector('#atk')).not.toBeNull();
    });
    const atkInput = document.querySelector('#atk') as HTMLInputElement;
    fireEvent.change(atkInput, { target: { value: '15' } });

    await waitFor(() => {
      const currentWeapon = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentWeapon.params?.[2]).toBe(15);
    });
  });

  it('武器基础属性会显示并保存还原次数', async () => {
    useEditorStore.getState().loadData([null, createWeapon({ revertTimes: 2 })], WEAPONS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('还原次数');
    const revertTimesInput = document.querySelector('#revertTimes') as HTMLInputElement | null;
    if (revertTimesInput === null) throw new Error('revertTimes input not found');
    fireEvent.change(revertTimesInput, { target: { value: '5' } });

    await waitFor(() => {
      const currentWeapon = useEditorStore.getState().currentData?.[1] as {
        revertTimes?: number;
      };
      expect(currentWeapon.revertTimes).toBe(5);
    });
  });

  it('防具保存其他属性时会保留发射期连发模板字段', async () => {
    useEditorStore.getState().loadData([null, createArmor({ revertTimes: 4 })], ARMORS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    expect(await screen.findByText('发射期连发')).toBeInTheDocument();
    await screen.findByText('还原次数');
    const revertTimesInput = document.querySelector('#revertTimes') as HTMLInputElement | null;
    if (revertTimesInput === null) throw new Error('revertTimes input not found');
    fireEvent.change(revertTimesInput, { target: { value: '6' } });
    const priceInput = await screen.findByDisplayValue('77');
    fireEvent.change(priceInput, { target: { value: '88' } });

    await waitFor(() => {
      const currentArmor = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentArmor.price).toBe(88);
      expect(currentArmor.revertTimes).toBe(6);
      expect(currentArmor.vehicleParams).toHaveLength(8);
      expect(currentArmor.vehicleParams?.[7]?.value).toBe(19);
    });

  });

  it('防具元素属性率基础值修改会标记 Armors.json 脏标志', async () => {
    DataLoaderService.cacheFileData('D:/Project/data/System.json', 'System.json', AUDIT_SYSTEM_DATA);
    useEditorStore.getState().loadData([null, createArmor()], ARMORS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await screen.findByText('元素属性率');
    const elementRateInput = document.querySelector('#elementRates_1') as HTMLInputElement | null;
    if (elementRateInput === null) throw new Error('elementRates_1 input not found');
    fireEvent.change(elementRateInput, { target: { value: '-0.25' } });

    await waitFor(() => {
      const state = useEditorStore.getState();
      const currentArmor = state.currentData?.[1] as RPGItem;
      expect(currentArmor.elementRates?.[1]).toBeCloseTo(-0.25);
      expect(state.dirtyFiles['d:/project/data/armors.json']).toBe(true);
      expect(state.getDirtyItemIndexes(ARMORS_FILE_PATH)).toEqual([1]);
    });
  });

  it('修改强化次数时会按模板自动补齐逐级耗材', async () => {
    const tyrantCosts = Array.from({ length: 40 }, (_, index) => ({
      successRate: index === 39 ? 1 : 90,
      goldCost: (index + 1) * 1000,
      requiredItemId: index >= 30 ? 183 : 90,
      requiredItemAmount: index + 1,
      protectItemId: index >= 31 ? 167 : 166,
      protectItemAmount: index + 2,
    }));
    useEditorStore.getState().loadData([
      null,
      createArmor(),
      createArmor({
        id: 368,
        name: '暴君',
        upgradeParams: [
          { value: 40, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
          createParamTemplate(0),
          createParamTemplate(0),
        ],
        upgradeCosts: tyrantCosts,
      }),
    ], ARMORS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    await waitFor(() => {
      expect(document.querySelector('#upgradeParams_0_value')).not.toBeNull();
    });
    const timesInput = document.querySelector('#upgradeParams_0_value') as HTMLInputElement;
    fireEvent.change(timesInput, { target: { value: '40' } });

    await waitFor(() => {
      const currentArmor = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentArmor.upgradeParams?.[0]?.value).toBe(40);
      expect(currentArmor.upgradeCosts).toHaveLength(40);
      expect(currentArmor.upgradeCosts?.[39]).toEqual(tyrantCosts[39]);
    });
  });

  it('防具保存结果再次经过修复模式不会写回 Armors.json', async () => {
    DataLoaderService.cacheFileData('D:/Project/data/System.json', 'System.json', AUDIT_SYSTEM_DATA);
    useEditorStore.getState().loadData([null, createArmor()], ARMORS_FILE_PATH, 'data');

    render(<PropertyPanel />);

    const priceInput = await screen.findByDisplayValue('77');
    fireEvent.change(priceInput, { target: { value: '99' } });

    let currentArmor: RPGItem | null = null;
    await waitFor(() => {
      currentArmor = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentArmor?.price).toBe(99);
      expect(currentArmor?.vehicleParams).toHaveLength(8);
      expect(currentArmor?.vehicleParams?.[7]?.value).toBe(19);
      expect(normalizeEquipmentDataEntry(currentArmor, { isArmor: true, systemData: AUDIT_SYSTEM_DATA })).toEqual(currentArmor);
    });

    const files = createAuditFixtureFiles(currentArmor);
    const writeJson = vi.fn(async (filePath: string, data: unknown) => {
      files.set(filePath, cloneJson(data));
    });
    const summary = await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => cloneJson(files.get(filePath))),
      writeJson,
    });

    expect(summary.repairedFiles).toBe(0);
    expect(summary.repairedEntries).toBe(0);
    expect(writeJson).not.toHaveBeenCalled();
  });
  it('状态禁疗开关会写回 forbidHeal 字段', async () => {
    useEditorStore.getState().loadData([null, createState()], STATES_FILE_PATH, 'data');

    render(<PropertyPanel />);

    const forbidHealSwitch = await screen.findByRole('switch', { name: '禁止一切回血' });
    fireEvent.click(forbidHealSwitch);

    await waitFor(() => {
      const currentState = useEditorStore.getState().currentData?.[1] as RPGItem;
      expect(currentState.forbidHeal).toBe(true);
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

  it('职业拓展等级面板只标脏 ClassLevelExtensions.json', async () => {
    const classEntry = createClass();
    const originalParams = JSON.parse(JSON.stringify(classEntry.params));

    DataLoaderService.cacheFileData(CLASS_LEVEL_EXTENSIONS_FILE_PATH, CLASS_LEVEL_EXTENSIONS_FILE_NAME, {
      schemaVersion: 2,
      classes: createClassLevelExtensionData().classes,
    });
    useEditorStore.getState().loadData([null, classEntry], CLASSES_FILE_PATH, 'data');

    render(<PropertyPanel />);

    const atkTargetInput = await screen.findByLabelText('攻击力 最大等级目标');
    fireEvent.change(atkTargetInput, { target: { value: '88' } });

    await waitFor(() => {
      const cached = DataLoaderService.getCachedDataByName(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
      expect(cached).toEqual({
        schemaVersion: 2,
        classes: [
          null,
          {
            maxLevel: 100,
            expParams: [30, 20, 30, 30],
            paramCurves: [
              { target: 10, mode: 'standard' },
              { target: 20, mode: 'standard' },
              { target: 88, mode: 'standard' },
              { target: 40, mode: 'standard' },
              { target: 50, mode: 'standard' },
              { target: 60, mode: 'standard' },
              { target: 70, mode: 'standard' },
              { target: 80, mode: 'standard' },
            ],
          },
        ],
      });
    });

    const state = useEditorStore.getState();
    expect(state.dirtyFiles['d:/project/data/classlevelextensions.json']).toBe(true);
    expect(state.dirtyFiles['d:/project/data/classes.json']).toBeUndefined();
    expect((state.currentData?.[1] as RPGItem | undefined)?.params).toEqual(originalParams);
  });
});
