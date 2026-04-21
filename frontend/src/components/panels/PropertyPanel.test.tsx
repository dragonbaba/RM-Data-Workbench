import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyPanel from './PropertyPanel';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';

const WEAPONS_FILE_PATH = 'D:/Project/data/Weapons.json';

const createWeapon = (overrides: Record<string, unknown> = {}) => ({
  id: 132,
  name: '散射弩',
  params: [0, 0, 0, 0, 0, 0, 0, 0],
  floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
  extraParams: [],
  vehicleParams: [],
  upgradeParams: [],
  ownerParams: {
    elementRate: [0],
    extraParams: [0, 0, 0, 0, 0, 0],
    paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
    scalar: [0],
    specialParams: [0, 0, 0, 0, 0],
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
});
