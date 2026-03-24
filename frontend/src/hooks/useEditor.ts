import { useEditorStore } from '../stores/editorStore';

export function useEditor() {
  const store = useEditorStore();
  
  return {
    // State
    currentData: store.currentData,
    currentMapData: store.currentMapData,
    currentMapInfos: store.currentMapInfos,
    currentMapId: store.currentMapId,
    currentFile: store.currentFile,
    currentFilePath: store.currentFilePath,
    currentFileType: store.currentFileType,
    currentItemIndex: store.currentItemIndex,
    currentItem: store.currentItem,
    currentScriptKey: store.currentScriptKey,
    config: store.config,
    uiMode: store.uiMode,
    workspaceRoot: store.workspaceRoot,
    
    // Actions
    setMode: store.setMode,
    loadData: store.loadData,
    loadMapBrowser: store.loadMapBrowser,
    loadMapData: store.loadMapData,
    updateCurrentMapData: store.updateCurrentMapData,
    selectItem: store.selectItem,
    selectScript: store.selectScript,
    updateConfig: store.updateConfig,
    setWorkspaceRoot: store.setWorkspaceRoot,
  };
}
