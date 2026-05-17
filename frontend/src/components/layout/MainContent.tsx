import { Button, Empty } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { Suspense, lazy } from 'react';
import { EventSystem } from '../../core/EventSystem';
import { useEditorStore } from '../../stores/editorStore';

const CodeEditorPanel = lazy(() => import('../panels/CodeEditorPanel'));
const PropertyPanel = lazy(() => import('../panels/PropertyPanel'));
const EffectPanel = lazy(() => import('../panels/EffectPanel'));
const QuestPanel = lazy(() => import('../panels/QuestPanel'));
const ProjectilePanel = lazy(() => import('../panels/ProjectilePanel'));
const MapPanel = lazy(() => import('../panels/MapPanel'));
const EquipPanel = lazy(() => import('../panels/EquipPanel'));
const RefitPanel = lazy(() => import('../panels/RefitPanel'));
const DropPanel = lazy(() => import('../panels/DropPanel'));

const PanelFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-dark-900 text-gray-500">
    正在加载面板...
  </div>
);

export function MainContent() {
  const currentData = useEditorStore((state) => state.currentData);
  const currentMapData = useEditorStore((state) => state.currentMapData);
  const uiMode = useEditorStore((state) => state.uiMode);
  const currentFile = useEditorStore((state) => state.currentFile);
  const config = useEditorStore((state) => state.config);

  const renderPanel = () => {
    switch (uiMode) {
      case 'script':
        return <CodeEditorPanel />;
      case 'property':
        return <PropertyPanel />;
      case 'effect':
        return <EffectPanel />;
      case 'quest':
        return <QuestPanel />;
      case 'projectile':
        return <ProjectilePanel />;
      case 'map':
        return <MapPanel />;
      case 'equip':
        return <EquipPanel />;
      case 'refit':
        return <RefitPanel />;
      case 'drop':
        return <DropPanel />;
      default:
        return <CodeEditorPanel />;
    }
  };

  const renderEmptyState = () => {
    if (uiMode === 'map' || (currentData && currentData.length > 0)) {
      return null;
    }

    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <Empty
          description={
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold text-gray-300 mb-2">请选择文件</h2>
              <p className="text-gray-500">
                请通过菜单栏的"文件" -&gt; "打开文件"来选择要编辑的数据文件
              </p>
            </div>
          }
        />
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-900">
      {config.dataPath && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#30384d] bg-[#161b28]">
          <div className="text-sm text-gray-400">
            全局工具
            {currentFile ? <span className="ml-3 text-gray-500">当前文件: {currentFile}</span> : null}
          </div>
          <Button
            icon={<ToolOutlined />}
            size="small"
            onClick={() => EventSystem.emit('data:audit-repair-request')}
          >
            数据体检/修复
          </Button>
        </div>
      )}
      <Suspense fallback={<PanelFallback />}>
        {uiMode === 'map' || currentMapData || currentData ? renderPanel() : renderEmptyState()}
      </Suspense>
    </div>
  );
}
