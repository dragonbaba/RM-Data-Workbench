import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import MapPanel from './MapPanel';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import type { RPGMap } from '../../types';

const MAP_FILE_PATH = 'D:/Project/data/Map001.json';
const NORMALIZED_MAP_FILE_PATH = 'd:/project/data/map001.json';

const createMapData = (overrides: Partial<RPGMap> = {}): RPGMap => ({
  displayName: '旧地图名',
  tilesetId: 1,
  width: 20,
  height: 15,
  scrollType: 0,
  disableDashing: false,
  inRoom: false,
  encounterStep: 30,
  note: '',
  autoplayBgm: false,
  autoplayBgs: false,
  data: [],
  events: [],
  ...overrides,
});

describe('MapPanel dirty save chain', () => {
  beforeEach(() => {
    DataLoaderService.clearCache();
    useEditorStore.setState({
      currentData: null,
      currentMapData: null,
      currentMapInfos: [],
      currentMapId: null,
      currentFile: '',
      currentFilePath: '',
      currentFileType: 'map',
      currentItemIndex: 0,
      currentItem: null,
      currentScriptKey: '',
      dirtyFiles: {},
      dirtyItemIndexes: {},
      uiMode: 'map',
      workspaceRoot: '',
    });
  });

  it('地图属性变更会立即标记当前 Map 文件为 dirty 并同步缓存', async () => {
    useEditorStore.getState().loadMapData(createMapData(), MAP_FILE_PATH, 1);
    render(<MapPanel />);

    fireEvent.change(screen.getByPlaceholderText('地图显示名称'), {
      target: { value: '新地图名' },
    });

    await waitFor(() => {
      expect(useEditorStore.getState().dirtyFiles[NORMALIZED_MAP_FILE_PATH]).toBe(true);
    });

    const cachedMap = DataLoaderService.getCachedData<RPGMap>(MAP_FILE_PATH);
    expect(cachedMap?.displayName).toBe('新地图名');
  });
});
