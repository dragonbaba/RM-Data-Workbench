import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DropPanel } from './DropPanel';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';

const ENEMIES_FILE_PATH = 'D:/Project/data/Enemies.json';
const ITEMS_FILE_PATH = 'D:/Project/data/Items.json';
const WEAPONS_FILE_PATH = 'D:/Project/data/Weapons.json';
const ARMORS_FILE_PATH = 'D:/Project/data/Armors.json';

const createEnemy = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: '史莱姆',
  enemyDrops: [
    {
      dropType: 0,
      dropChance: 10,
      isRare: false,
      dropId: 1,
    },
  ],
  ...overrides,
});

describe('DropPanel', () => {
  beforeEach(() => {
    DataLoaderService.clearCache();
    DataLoaderService.cacheFileData(ITEMS_FILE_PATH, 'Items.json', [null, { id: 1, name: '护目镜' }]);
    DataLoaderService.cacheFileData(WEAPONS_FILE_PATH, 'Weapons.json', [null]);
    DataLoaderService.cacheFileData(ARMORS_FILE_PATH, 'Armors.json', [null]);

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
      uiMode: 'drop',
      workspaceRoot: '',
    });
  });

  it('显示并保存 enemyDrops 单项的 isRare 开关', async () => {
    useEditorStore.getState().loadData([null, createEnemy()], ENEMIES_FILE_PATH, 'data');

    render(<DropPanel />);

    const rareSwitch = (await screen.findAllByRole('switch'))[0];
    expect(rareSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(rareSwitch);

    await waitFor(() => {
      const currentEnemy = useEditorStore.getState().currentData?.[1] as { enemyDrops?: Array<{ isRare?: boolean }> };
      expect(currentEnemy.enemyDrops?.[0]).toMatchObject({ isRare: true });
    });
  });

  it('旧掉落数据缺失 isRare 时按 false 渲染', async () => {
    useEditorStore.getState().loadData([
      null,
      createEnemy({
        enemyDrops: [{ dropType: 0, dropChance: 10, dropId: 1 }],
      }),
    ], ENEMIES_FILE_PATH, 'data');

    render(<DropPanel />);

    const rareSwitch = (await screen.findAllByRole('switch'))[0];
    expect(rareSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('图鉴挑战额外奖励保存到原 bookChallenge 星级字段', async () => {
    useEditorStore.getState().loadData([
      null,
      createEnemy({
        isBoss: true,
        bookChallenge: {
          challengeTroopId: 2,
          stars: [
            {
              star: 1,
              goldCost: 100,
              levelRequirement: 5,
              baseParamRate: 1.5,
              passiveStates: [3],
              dropRateMultiplier: 1,
              goldMultiplier: 1,
              expMultiplier: 1,
              extraRewards: [],
            },
          ],
        },
      }),
    ], ENEMIES_FILE_PATH, 'data');

    render(<DropPanel />);

    fireEvent.click(await screen.findByRole('button', { name: /添加额外奖励/ }));

    await waitFor(() => {
      const currentEnemy = useEditorStore.getState().currentData?.[1] as {
        bookChallenge?: {
          challengeTroopId?: number;
          stars?: Array<{
            goldCost?: number;
            passiveStates?: number[];
            extraRewards?: Array<{ rewardType?: string; dataId?: number; amount?: number }>;
          }>;
        };
      };
      expect(currentEnemy.bookChallenge).toMatchObject({
        challengeTroopId: 2,
        stars: [
          {
            goldCost: 100,
            passiveStates: [3],
            extraRewards: [
              {
                rewardType: 'item',
                dataId: 0,
                amount: 1,
              },
            ],
          },
        ],
      });
    });
  });
});
