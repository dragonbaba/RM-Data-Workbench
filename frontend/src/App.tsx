import { ConfigProvider, theme } from 'antd';
import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { useFileOperations } from './hooks/useFileOperations';
import { useEditorStore } from './stores/editorStore';
import { DataLoaderService } from './services/DataLoaderService';
import { ScriptPathManager } from './services/ScriptPathManager';
import { ThemeManager } from './theme/ThemeManager';
import { DynamicBackground } from './components/effects/DynamicBackground';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/global.css';

function App() {
  const { setupMenuListeners } = useFileOperations();
  const { config } = useEditorStore();

  useEffect(() => {
    // 初始化主题系统
    ThemeManager.initialize();
    
    // 设置菜单监听
    const disposeListeners = setupMenuListeners();
    
    // 检查是否有持久化的工作空间配置，如果有则加载数据
    let preloadTimer: ReturnType<typeof setTimeout> | null = null;
    if (config.dataPath && config.projectRoot) {
      DataLoaderService.setDataPath(config.dataPath);
      ScriptPathManager.setWorkspaceRoot(config.projectRoot);
      
      // 延迟加载数据，确保组件已挂载
      preloadTimer = setTimeout(() => {
        DataLoaderService.preloadManifest(config.dataPath);
      }, 100);
    }

    return () => {
      if (preloadTimer) {
        clearTimeout(preloadTimer);
      }
      disposeListeners?.();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#00d4ff',
            colorBgBase: '#0a0e17',
            colorTextBase: '#f3f4f6',
            borderRadius: 4,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
          },
        }}
      >
        <div className="app relative">
          {/* 动态背景 */}
          <DynamicBackground />
          
          {/* 主布局 */}
          <MainLayout />
        </div>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
