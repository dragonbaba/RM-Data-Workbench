import { Empty, Input, Badge } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { EventSystem } from '../../core/EventSystem';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { VirtualList } from '../common/VirtualList';
import { BACKSLASH_REGEXP, TRAILING_PATH_SEPARATORS_REGEXP, WINDOWS_DRIVE_REGEXP } from '../../constants/regexp';

const EQUIP_EXTENSIONS_FILE_NAME = 'EquipExtensions.json';
const ACTORS_FILE_NAME = 'Actors.json';
const ENEMIES_FILE_NAME = 'Enemies.json';

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(TRAILING_PATH_SEPARATORS_REGEXP, '')}/${fileName}`;
};

const normalizePathKey = (value: string) => {
  const normalized = (value || '').replace(BACKSLASH_REGEXP, '/');
  return WINDOWS_DRIVE_REGEXP.test(normalized) ? normalized.toLowerCase() : normalized;
};

export function LeftPanel() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentMapInfos = useEditorStore((state) => state.currentMapInfos);
  const currentMapId = useEditorStore((state) => state.currentMapId);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const selectItem = useEditorStore((state) => state.selectItem);
  const uiMode = useEditorStore((state) => state.uiMode);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const dirtyFiles = useEditorStore((state) => state.dirtyFiles);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const config = useEditorStore((state) => state.config);
  const [searchTerm, setSearchTerm] = useState('');
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState(200);

  const items = useMemo(() => currentData?.slice(1) || [], [currentData]);
  const mapItems = currentMapInfos || [];
  const isMapListActive = currentFileType === 'map';
  
  // 检查当前文件是否有未保存的更改
  const activeDirtyFilePaths = useMemo(() => {
    if (uiMode === 'equip' || uiMode === 'refit') {
      return [
        DataLoaderService.getFilePathByName(EQUIP_EXTENSIONS_FILE_NAME) || joinPath(config.dataPath, EQUIP_EXTENSIONS_FILE_NAME),
      ];
    }
    if (uiMode === 'projectile') {
      return [
        currentFilePath,
        DataLoaderService.getFilePathByName(ACTORS_FILE_NAME) || joinPath(config.dataPath, ACTORS_FILE_NAME),
        DataLoaderService.getFilePathByName(ENEMIES_FILE_NAME) || joinPath(config.dataPath, ENEMIES_FILE_NAME),
      ];
    }
    return [currentFilePath];
  }, [config.dataPath, currentFilePath, uiMode]);

  const isCurrentFileDirty = useMemo(() => {
    for (let i = 0; i < activeDirtyFilePaths.length; i++) {
      const path = activeDirtyFilePaths[i];
      if (!path) continue;
      if (dirtyFiles[normalizePathKey(path)]) {
        return true;
      }
    }
    return false;
  }, [activeDirtyFilePaths, dirtyFiles]);

  const indexedItems = useMemo(() => (
    items.flatMap((item, index) => (
      uiMode === 'effect' && !item
        ? []
        : [{
          item,
          actualIndex: index + 1,
        }]
    ))
  ), [items, uiMode]);

  // 过滤项目
  const filteredItems = useMemo(() => {
    if (isMapListActive) {
      if (!searchTerm) return mapItems;
      const term = searchTerm.toLowerCase();
      return mapItems.filter((item) => (item.name || '').toLowerCase().includes(term));
    }

    if (!searchTerm) return indexedItems;

    const term = searchTerm.toLowerCase();
    return indexedItems.filter(({ item }) => {
      const name = ((item as any)?.name || (item as any)?.title || '').toLowerCase();
      return name.includes(term);
    });
  }, [indexedItems, isMapListActive, mapItems, searchTerm]);

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!listContainerRef.current) return;
      const rect = listContainerRef.current.getBoundingClientRect();
      setListHeight(Math.max(120, Math.floor(rect.height)));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // 渲染项目项
  const renderDataItem = (entry: { item: any; actualIndex: number }) => {
    const { item, actualIndex } = entry;
    const isActive = actualIndex === currentItemIndex;
    const itemName = item?.name || item?.title || `[项目${actualIndex}]`;
    
    return (
      <div
        key={actualIndex}
        onClick={() => selectItem(actualIndex)}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer
          hover:bg-[#252b3d] transition-colors
          ${isActive ? 'bg-cyan-900/30 border-l-2 border-[#00d4ff]' : 'border-l-2 border-transparent'}
        `}
        style={{
          backgroundColor: isActive ? 'rgba(0, 212, 255, 0.1)' : undefined,
        }}
      >
        <span 
          className="text-xs font-mono min-w-[40px]"
          style={{ color: 'var(--color-accent)' }}
        >
          #{actualIndex}
        </span>
        <span className="text-gray-200 text-sm flex-1 truncate">
          {itemName}
        </span>
      </div>
    );
  };

  const renderMapItem = (item: { id: number; name: string }) => {
    const isActive = item.id === currentMapId;
    const itemName = item.name || `[地图${item.id}]`;

    return (
      <div
        key={item.id}
        onClick={() => EventSystem.emit('map:open', item.id)}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer
          hover:bg-[#252b3d] transition-colors
          ${isActive ? 'bg-cyan-900/30 border-l-2 border-[#00d4ff]' : 'border-l-2 border-transparent'}
        `}
        style={{
          backgroundColor: isActive ? 'rgba(0, 212, 255, 0.1)' : undefined,
        }}
      >
        <span
          className="text-xs font-mono min-w-[40px]"
          style={{ color: 'var(--color-accent)' }}
        >
          #{item.id}
        </span>
        <span className="text-gray-200 text-sm flex-1 truncate">
          {itemName}
        </span>
      </div>
    );
  };

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-[#30384d] bg-[#1a1f2e]">
      <div className="px-4 py-3 border-b border-[#30384d]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
            {isMapListActive ? '地图列表' : uiMode === 'drop' ? '敌人列表' : uiMode === 'effect' ? '效果列表' : uiMode === 'refit' ? '角色列表' : '项目列表'}
          </h2>
          {isCurrentFileDirty && (
            <Badge 
              count="已修改" 
              style={{ 
                backgroundColor: '#ffaa00',
                color: '#000',
                fontSize: '10px',
              }} 
            />
          )}
        </div>
      </div>
      
      {/* 搜索框 */}
      <div className="px-3 py-2 border-b border-[#30384d]">
        <Input
          placeholder="搜索项目..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          style={{
            backgroundColor: '#0a0e17',
            borderColor: '#30384d',
          }}
        />
      </div>

      <div className="flex-1 overflow-hidden" ref={listContainerRef}>
        {filteredItems.length === 0 ? (
          <div className="p-4">
            <Empty 
              description={searchTerm ? '未找到匹配的项目' : '打开菜单选择文件'} 
            />
          </div>
        ) : isMapListActive ? (
          <VirtualList
            items={filteredItems as { id: number; name: string }[]}
            itemHeight={40}
            containerHeight={listHeight}
            renderItem={renderMapItem}
          />
        ) : (
          <VirtualList
            items={filteredItems as { item: any; actualIndex: number }[]}
            itemHeight={40}
            containerHeight={listHeight}
            renderItem={renderDataItem}
          />
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-3 py-2 border-t border-[#30384d] text-xs text-gray-500">
        共 {isMapListActive ? mapItems.length : items.length} 个项目
        {searchTerm && ` (显示 ${filteredItems.length} 个)`}
      </div>
    </div>
  );
}

export default LeftPanel;
