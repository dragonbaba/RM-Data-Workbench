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
    });
    expect(WriteJSON).not.toHaveBeenCalled();
  });
});
