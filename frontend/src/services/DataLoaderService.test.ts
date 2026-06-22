import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileExists, ReadJSON, WriteJSON } from '../../wailsjs/go/main/App';
import { DataLoaderService } from './DataLoaderService';

describe('DataLoaderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DataLoaderService.clearCache();
    DataLoaderService.setDataPath('');
  });

  it('加载已有 EquipExtensions.json 时不会把规范化结果静默写回磁盘', async () => {
    vi.mocked(FileExists).mockImplementation(async (filePath: string) => {
      return filePath.endsWith('Actors.json')
        || filePath.endsWith('Weapons.json')
        || filePath.endsWith('EquipExtensions.json');
    });

    vi.mocked(ReadJSON).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('Actors.json')) {
        return [null, { id: 1, name: '角色1' }];
      }
      if (filePath.endsWith('Weapons.json')) {
        return [null, { id: 1, name: '武器1' }, { id: 2, name: '武器2' }];
      }
      if (filePath.endsWith('EquipExtensions.json')) {
        return {
          weaponEquipTypes: [null, 10],
          systemWeaponEquipTypes: [10, 11],
          actorEquipSlots: [null, [10]],
          actorEquips: [null, [1]],
        };
      }
      return null;
    });

    const extensions = await DataLoaderService.ensureEquipExtensionsLoaded('D:/Project/data', { force: true });

    expect(extensions).toEqual({
      weaponEquipTypes: [null, 10, 0],
      systemWeaponEquipTypes: [10, 11],
      actorEquipSlots: [null, [10]],
      actorEquips: [null, [1]],
      actorRefitRules: [null, { slots: [] }],
    });
    expect(WriteJSON).not.toHaveBeenCalled();
  });

  it('加载已有 EquipExtensions.json 时按 Actors.json 的 isTank 规范化战车固定槽', async () => {
    vi.mocked(FileExists).mockImplementation(async (filePath: string) => {
      return filePath.endsWith('Actors.json')
        || filePath.endsWith('Weapons.json')
        || filePath.endsWith('EquipExtensions.json');
    });

    vi.mocked(ReadJSON).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('Actors.json')) {
        return [null, { id: 1, name: '战车1', isTank: true }];
      }
      if (filePath.endsWith('Weapons.json')) {
        return [null, ...Array.from({ length: 19 }, (_, index) => ({ id: index + 1, name: `装备${index + 1}` }))];
      }
      if (filePath.endsWith('EquipExtensions.json')) {
        return {
          weaponEquipTypes: [null],
          systemWeaponEquipTypes: [],
          actorEquipSlots: [null, [10, 0, 0, 0, 0, 7, 0, 8, 0, 0, 0, 0]],
          actorEquips: [null, [19, 0, 0, 0, 0, 68, 0, 112, 0, 140]],
          actorRefitRules: [null, { slots: [] }],
        };
      }
      return null;
    });

    const extensions = await DataLoaderService.ensureEquipExtensionsLoaded('D:/Project/data', { force: true });

    expect(extensions?.actorEquipSlots[1]).toEqual([10, 0, 0, 0, 0, 7, 0, 8, 0, 0, 8, 9]);
    expect(extensions?.actorEquips[1]).toEqual([19, 0, 0, 0, 0, 68, 0, 112, 0, 140, 0, 0]);
    expect(WriteJSON).not.toHaveBeenCalled();
  });

  it('缺失 ClassLevelExtensions.json 时会按当前职业数量创建空文件', async () => {
    vi.mocked(FileExists).mockImplementation(async (filePath: string) => {
      return filePath.endsWith('Classes.json');
    });

    vi.mocked(ReadJSON).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('Classes.json')) {
        return [
          null,
          {
            id: 1,
            name: '猎人',
            expParams: [30, 20, 30, 30],
            params: Array.from({ length: 8 }, (_, index) => {
              const levels = new Array(100).fill(0);
              levels[99] = (index + 1) * 10;
              return levels;
            }),
          },
          {
            id: 2,
            name: '机械师',
            expParams: [40, 30, 40, 40],
            params: Array.from({ length: 8 }, (_, index) => {
              const levels = new Array(100).fill(0);
              levels[99] = (index + 1) * 20;
              return levels;
            }),
          },
        ];
      }
      return null;
    });

    const extensions = await DataLoaderService.ensureClassLevelExtensionsLoaded('D:/Project/data', { force: true });

    expect(extensions).toEqual({
      schemaVersion: 2,
      classes: [
        null,
        {
          maxLevel: 100,
          expParams: [30, 20, 30, 30],
          paramCurves: [
            { target: 10, mode: 'standard' },
            { target: 20, mode: 'standard' },
            { target: 30, mode: 'standard' },
            { target: 40, mode: 'standard' },
            { target: 50, mode: 'standard' },
            { target: 60, mode: 'standard' },
            { target: 70, mode: 'standard' },
            { target: 80, mode: 'standard' },
          ],
        },
        {
          maxLevel: 100,
          expParams: [40, 30, 40, 40],
          paramCurves: [
            { target: 20, mode: 'standard' },
            { target: 40, mode: 'standard' },
            { target: 60, mode: 'standard' },
            { target: 80, mode: 'standard' },
            { target: 100, mode: 'standard' },
            { target: 120, mode: 'standard' },
            { target: 140, mode: 'standard' },
            { target: 160, mode: 'standard' },
          ],
        },
      ],
    });
    expect(WriteJSON).toHaveBeenCalledWith('D:/Project/data/ClassLevelExtensions.json', extensions);
  });

  it('加载已有 ClassLevelExtensions.json 时不会把规范化结果静默写回磁盘', async () => {
    vi.mocked(FileExists).mockImplementation(async (filePath: string) => {
      return filePath.endsWith('Classes.json')
        || filePath.endsWith('ClassLevelExtensions.json');
    });

    vi.mocked(ReadJSON).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('Classes.json')) {
        return [
          null,
          {
            id: 1,
            name: '猎人',
            expParams: [30, 20, 30, 30],
            params: Array.from({ length: 8 }, (_, index) => {
              const levels = new Array(100).fill(0);
              levels[99] = (index + 1) * 10;
              return levels;
            }),
          },
          {
            id: 2,
            name: '机械师',
            expParams: [40, 30, 40, 40],
            params: Array.from({ length: 8 }, (_, index) => {
              const levels = new Array(100).fill(0);
              levels[99] = (index + 1) * 20;
              return levels;
            }),
          },
        ];
      }
      if (filePath.endsWith('ClassLevelExtensions.json')) {
        return {
          schemaVersion: 99,
          classes: [
            null,
            {
              levels: [
                { level: 99, exp: 10, params: [1] },
                { level: 100, exp: 123.9, params: [1, 2] },
              ],
            },
          ],
        };
      }
      return null;
    });

    const extensions = await DataLoaderService.ensureClassLevelExtensionsLoaded('D:/Project/data', { force: true });

    expect(extensions).toEqual({
      schemaVersion: 2,
      classes: [
        null,
        {
          maxLevel: 100,
          expParams: [30, 20, 30, 30],
          paramCurves: [
            { target: 1, mode: 'standard' },
            { target: 2, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
            { target: 0, mode: 'standard' },
          ],
        },
        {
          maxLevel: 100,
          expParams: [40, 30, 40, 40],
          paramCurves: [
            { target: 20, mode: 'standard' },
            { target: 40, mode: 'standard' },
            { target: 60, mode: 'standard' },
            { target: 80, mode: 'standard' },
            { target: 100, mode: 'standard' },
            { target: 120, mode: 'standard' },
            { target: 140, mode: 'standard' },
            { target: 160, mode: 'standard' },
          ],
        },
      ],
    });
    expect(WriteJSON).not.toHaveBeenCalled();
  });
});
