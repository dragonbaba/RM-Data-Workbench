import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EffectPanel } from './EffectPanel';
import { EventSystem } from '../../core/EventSystem';
import { DataLoaderService } from '../../services/DataLoaderService';
import { createGameEffectTemplate } from '../../services/GameEffectService';
import { useEditorStore } from '../../stores/editorStore';
import type { GameEffectEntry } from '../../types';

const EFFECTS_FILE_PATH = 'D:/Project/data/Effects.json';
const NORMALIZED_EFFECTS_FILE_PATH = 'd:/project/data/effects.json';
const SYSTEM_FILE_PATH = 'D:/Project/data/System.json';

const systemData = {
  elements: ['', '通常', '火炎'],
  terms: {
    params: ['体力', '驾驶', '攻击', '防御', '战斗', '修理', '速度', '幸运', '命中', '回避'],
  },
};

const createEffect = (name: string): GameEffectEntry => {
  const effect = createGameEffectTemplate('single_cunit_bonus', [null, systemData]);
  effect.id = 1;
  effect.name = name;
  return effect;
};

describe('EffectPanel draft flush', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    DataLoaderService.clearCache();
    DataLoaderService.cacheFileData(SYSTEM_FILE_PATH, 'System.json', [null, systemData]);
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
      uiMode: 'effect',
      workspaceRoot: '',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('保存全部前会同步写入当前效果草稿并保留所有脏索引', () => {
    useEditorStore.getState().loadData([null, createEffect('旧效果')], EFFECTS_FILE_PATH, 'data');
    useEditorStore.getState().markItemDirty(EFFECTS_FILE_PATH, 2);

    render(<EffectPanel />);

    fireEvent.change(screen.getByPlaceholderText('输入效果名称'), {
      target: { value: '新效果' },
    });
    expect(screen.getByDisplayValue('新效果')).toBeInTheDocument();

    act(() => {
      EventSystem.emit('editor:flush-pending-draft');
    });

    const currentEffect = useEditorStore.getState().currentData?.[1] as GameEffectEntry | undefined;
    expect(currentEffect?.name).toBe('新效果');
    expect(useEditorStore.getState().dirtyFiles[NORMALIZED_EFFECTS_FILE_PATH]).toBe(true);
    expect(useEditorStore.getState().getDirtyItemIndexes(EFFECTS_FILE_PATH)).toEqual([1, 2]);
  });
});
