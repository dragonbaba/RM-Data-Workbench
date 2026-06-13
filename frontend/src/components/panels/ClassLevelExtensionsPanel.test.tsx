import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassLevelExtensionsPanel } from './ClassLevelExtensionsPanel';
import { DataLoaderService } from '../../services/DataLoaderService';
import { CLASS_LEVEL_EXTENSIONS_FILE_NAME, type ClassGrowthMode } from '../../services/ClassLevelExtensionsService';

const FILE_PATH = 'D:/Project/data/ClassLevelExtensions.json';
const CLASS_ENTRY = {
  id: 1,
  name: '猎人',
  expParams: [30, 20, 30, 30],
  params: Array.from({ length: 8 }, (_, index) => {
    const levels = new Array(100).fill(0);
    levels[99] = (index + 1) * 10;
    return levels;
  }),
};
const ATTRIBUTE_LABELS = ['最大生命值', '最大魔法值', '攻击力', '防御力', '魔法攻击力', '魔法防御力', '速度', '幸运'];

const createExtensionData = () => ({
  schemaVersion: 2,
  classes: [
    null,
    {
      maxLevel: 100,
      expParams: [30, 20, 30, 30] as [number, number, number, number],
      paramCurves: ATTRIBUTE_LABELS.map((_, index) => ({
        target: (index + 1) * 10,
        mode: 'standard' as ClassGrowthMode,
      })),
    },
  ],
});

describe('ClassLevelExtensionsPanel', () => {
  beforeEach(() => {
    DataLoaderService.clearCache();
  });

  it('编辑曲线配置时只写回扩展文件缓存', async () => {
    const markFileDirty = vi.fn();
    const markItemDirty = vi.fn();
    const onChanged = vi.fn();

    render(
      <ClassLevelExtensionsPanel
        classEntry={CLASS_ENTRY}
        classIndex={1}
        filePath={FILE_PATH}
        data={createExtensionData()}
        attributeLabels={ATTRIBUTE_LABELS}
        markFileDirty={markFileDirty}
        markItemDirty={markItemDirty}
        onChanged={onChanged}
      />,
    );

    expect(screen.queryByRole('button', { name: /新增等级/ })).not.toBeInTheDocument();
    expect(screen.getByText('自动预览')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('拓展最大等级'), { target: { value: '102' } });

    await waitFor(() => {
      const cached = DataLoaderService.getCachedDataByName<{
        schemaVersion: number;
        classes: Array<{
          maxLevel: number;
          paramCurves: Array<{ target: number; mode: string }>;
        } | null>;
      }>(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
      expect(cached?.schemaVersion).toBe(2);
      expect(cached?.classes[1]?.maxLevel).toBe(102);
    });

    fireEvent.change(screen.getByLabelText('经验曲线基础值'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('攻击力 最大等级目标'), { target: { value: '88' } });

    await waitFor(() => {
      const cached = DataLoaderService.getCachedDataByName<{
        classes: Array<{
          expParams: number[];
          paramCurves: Array<{ target: number; mode: string }>;
        } | null>;
      }>(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
      expect(cached?.classes[1]?.expParams[0]).toBe(45);
      expect(cached?.classes[1]?.paramCurves[2].target).toBe(88);
    });

    expect(markFileDirty).toHaveBeenCalledWith(FILE_PATH);
    expect(markItemDirty).toHaveBeenCalledWith(FILE_PATH, 1);
    expect(onChanged).toHaveBeenCalled();
  });
});
