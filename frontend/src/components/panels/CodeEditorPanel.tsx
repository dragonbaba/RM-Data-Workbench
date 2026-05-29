import React, { useRef, useCallback, useEffect, memo, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useEditorStore } from '../../stores/editorStore';
import { ScriptCacheManager } from '../../services/ScriptCacheManager';
import { ToastManager } from '../common/ToastManager';
import { applyWorkspaceSettings, clearWorkspaceExtraLibs, loadMonaco, resolveEditorThemeName, setEditorTheme, setMonacoInstance } from '../../services/MonacoLoader';
import { registerEnhancements } from '../../services/MonacoEnhancements';
import { useTheme } from '../../theme/ThemeManager';
import { getScriptFilePath, loadScriptContent, saveScriptContent } from '../../services/ScriptOperations';
import { hasLegacyTimestampScriptPath } from '../../services/ScriptPathCompat';
import { EventSystem } from '../../core/EventSystem';

// 编辑器选项常量 - 避免重复创建对象
const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16 },
  folding: true,
  lineNumbers: 'on' as const,
  renderWhitespace: 'selection' as const,
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
};

export const CodeEditorPanel = memo(() => {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentScriptKey = useEditorStore((state) => state.currentScriptKey);
  const selectScript = useEditorStore((state) => state.selectScript);
  const editorConfig = useEditorStore((state) => state.config);
  const { config } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const disposableRef = useRef<monaco.IDisposable | null>(null);
  const commandDisposableRef = useRef<monaco.IDisposable | null>(null);
  const saveHandlerRef = useRef<(() => void) | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const scriptPathRef = useRef('');
  const scriptOriginalRef = useRef('');
  const applyingEditorContentRef = useRef(false);
  const [scriptContent, setScriptContent] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const pendingLoadRef = useRef<{ key: string; storedPath: string; resolvedPath: string } | null>(null);
  const preloadErrorRef = useRef<Record<string, string>>({});
  const preloadedScriptManifestRef = useRef<Record<string, string> | null>(null);

  const scripts = useMemo(() => {
    return ((currentItem as any)?.scripts || {}) as Record<string, string>;
  }, [currentItem]);
  const scriptKeys = useMemo(() => Object.keys(scripts), [scripts]);
  const storedScriptPath = currentScriptKey ? scripts[currentScriptKey] : '';
  const storedScriptPathString = typeof storedScriptPath === 'string' ? storedScriptPath : '';
  const scriptFilePath = storedScriptPathString ? getScriptFilePath(storedScriptPathString) : '';
  const editorTheme = useMemo(
    () => resolveEditorThemeName(config.theme, config.themePreset),
    [config.theme, config.themePreset]
  );
  const isCurrentScriptDirty = useMemo(
    () => Boolean(scriptFilePath && ScriptCacheManager.isDirty(scriptFilePath)),
    [dirtyRevision, scriptFilePath],
  );
  const getLegacyPathError = useCallback((pathValue: string) => (
    `检测到旧版时间戳脚本路径，已不再兼容: ${pathValue}。请改为无时间戳文件名，例如 2_actionSequence.js`
  ), []);

  const applyEditorContent = useCallback((content: string, filePath: string) => {
    scriptPathRef.current = filePath || '';
    const editor = editorRef.current;
    const monacoApi = monacoRef.current;
    try {
      applyingEditorContentRef.current = true;
      if (editor && monacoApi && filePath) {
        const modelUri = monacoApi.Uri.file(filePath);
        const existing = monacoApi.editor.getModel(modelUri);
        const model = existing ?? monacoApi.editor.createModel(content, 'javascript', modelUri);
        editor.setModel(model);
        modelRef.current = model;
        if (model.getValue() !== content) {
          model.setValue(content);
        }
        return;
      }

      const activeEditor = editorRef.current;
      if (!activeEditor) {
        return;
      }
      if (activeEditor.getValue() !== content) {
        activeEditor.setValue(content);
      }
    } catch {
      // ignore disposed editor
    } finally {
      applyingEditorContentRef.current = false;
    }
  }, []);

  const loadAndApplyScript = useCallback(async (key: string, storedPathValue: string, resolvedPath: string) => {
    if (!key || !storedPathValue) {
      setLoadError('');
      setScriptContent('');
      scriptOriginalRef.current = '';
      applyEditorContent('', resolvedPath);
      return;
    }

    setIsLoading(true);
    try {
      const content = await loadScriptContent(storedPathValue, { bypassCache: true });
      if (content === null) {
        const message = `脚本文件未找到: ${resolvedPath || storedPathValue || '未知路径'}`;
        const nextContent = `// 脚本: ${key}\n// 文件不存在或无法读取\n// 路径: ${resolvedPath || storedPathValue || '未知'}`;
        setLoadError(message);
        setScriptContent(nextContent);
        scriptOriginalRef.current = nextContent;
        applyEditorContent(nextContent, resolvedPath);
        return;
      }

      setLoadError('');
      setScriptContent(content);
      scriptOriginalRef.current = content;
      applyEditorContent(content, resolvedPath);
      if (resolvedPath) {
        delete preloadErrorRef.current[resolvedPath];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || '未知错误');
      const message = `脚本加载失败: ${resolvedPath || storedPathValue || '未知路径'}`;
      const nextContent = `// 脚本: ${key}\n// 加载失败\n// 路径: ${resolvedPath || storedPathValue || '未知'}\n// 错误: ${errorMessage}`;
      setLoadError(message);
      setScriptContent(nextContent);
      scriptOriginalRef.current = nextContent;
      applyEditorContent(nextContent, resolvedPath);
      if (resolvedPath) {
        preloadErrorRef.current[resolvedPath] = errorMessage;
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyEditorContent]);

  const requestScriptLoad = useCallback((key: string, storedPathValue: string, resolvedPath: string) => {
    pendingLoadRef.current = { key, storedPath: storedPathValue, resolvedPath };
    if (!editorReady) {
      return;
    }
    void loadAndApplyScript(key, storedPathValue, resolvedPath);
  }, [loadAndApplyScript, editorReady]);

  // 编辑器挂载时 - 优化清理逻辑
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    setEditorReady(true);
    setMonacoInstance(monacoInstance as unknown as typeof import('monaco-editor'));

    // 加载 Monaco 并注册增强
    loadMonaco().then(() => {
      registerEnhancements();
      setEditorTheme(editorTheme);
    });

    const workspaceRoot = editorConfig.workspacePath || editorConfig.workspaceRoot;
    if (workspaceRoot) {
      clearWorkspaceExtraLibs();
      void applyWorkspaceSettings(workspaceRoot);
    }

    // 设置编辑器选项
    editor.updateOptions({
      ...EDITOR_OPTIONS,
      fontSize: config.fontSize === 'small' ? 14 : config.fontSize === 'large' ? 18 : 16,
    });

    // 清理旧的监听器
    if (disposableRef.current) {
      disposableRef.current.dispose();
      disposableRef.current = null;
    }

    // 监听内容变化
    disposableRef.current = editor.onDidChangeModelContent(() => {
      if (applyingEditorContentRef.current) {
        return;
      }
      const content = editor.getValue();
      const activePath = scriptPathRef.current;
      if (activePath) {
        ScriptCacheManager.set(activePath, content, scriptOriginalRef.current);
        if (content !== scriptOriginalRef.current) {
          ScriptCacheManager.markDirty(activePath);
        } else {
          ScriptCacheManager.markClean(activePath);
        }
      }
    });
    const pending = pendingLoadRef.current;
    if (pending) {
      pendingLoadRef.current = null;
      void loadAndApplyScript(pending.key, pending.storedPath, pending.resolvedPath);
      return;
    }
    if (scriptContent) {
      applyEditorContent(scriptContent, scriptFilePath);
    }
  }, [config.fontSize, scriptContent, scriptFilePath, applyEditorContent, loadAndApplyScript, editorTheme]);

  // 主题变化时更新编辑器主题
  useEffect(() => {
    setEditorTheme(editorTheme);
  }, [editorTheme]);

  // 保存处理
  const handleSave = useCallback(async () => {
    if (!editorRef.current || !currentScriptKey) return;
    const content = editorRef.current.getValue();
    const result = await saveScriptContent(currentScriptKey, content);
    if (result.status === 'saved') {
      const activePath = scriptPathRef.current;
      if (activePath) {
        const cached = ScriptCacheManager.get(activePath);
        scriptOriginalRef.current = cached?.originalContent ?? content;
      } else {
        scriptOriginalRef.current = content;
      }
      ToastManager.success('脚本已保存');
    }
  }, [currentScriptKey]);

  useEffect(() => {
    saveHandlerRef.current = () => {
      void handleSave();
    };
  }, [handleSave]);

  useEffect(() => {
    const refreshDirtyState = () => setDirtyRevision((value) => value + 1);
    EventSystem.on('script:dirty', refreshDirtyState);
    EventSystem.on('script:clean', refreshDirtyState);
    EventSystem.on('script:cache-cleared', refreshDirtyState);
    return () => {
      EventSystem.off('script:dirty', refreshDirtyState);
      EventSystem.off('script:clean', refreshDirtyState);
      EventSystem.off('script:cache-cleared', refreshDirtyState);
    };
  }, []);

  // 键盘快捷键 - 只注册一次，避免重复绑定
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const monacoInstance = monacoRef.current;
    if (!monacoInstance) return;
    if (commandDisposableRef.current) return;

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      saveHandlerRef.current?.();
    });

    // addCommand 返回的是 string 类型的 ID，不是 IDisposable
    commandDisposableRef.current = {
      dispose: () => {
        // Monaco 编辑器没有提供移除命令的 API
        // 命令会在编辑器销毁时自动清理
      }
    } as monaco.IDisposable;
  }, [editorReady]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (disposableRef.current) {
        disposableRef.current.dispose();
        disposableRef.current = null;
      }
      if (commandDisposableRef.current) {
        commandDisposableRef.current.dispose();
        commandDisposableRef.current = null;
      }
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
      editorRef.current = null;
      monacoRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!currentScriptKey) {
      setScriptContent('');
      setLoadError('');
      scriptOriginalRef.current = '';
      applyEditorContent('', '');
    }
  }, [currentScriptKey, applyEditorContent]);

  useEffect(() => {
    if (!currentScriptKey) return;
    const pathValue = typeof scripts[currentScriptKey] === 'string' ? scripts[currentScriptKey] : '';
    const resolvedPath = pathValue ? getScriptFilePath(pathValue) : '';

    if (hasLegacyTimestampScriptPath(pathValue)) {
      setLoadError(getLegacyPathError(pathValue));
      setScriptContent('');
      scriptOriginalRef.current = '';
      applyEditorContent('', '');
      return;
    }

    if (!pathValue || !resolvedPath) {
      setLoadError('脚本路径无效');
      setScriptContent('');
      scriptOriginalRef.current = '';
      applyEditorContent('', resolvedPath);
      return;
    }

    const cachedEntry = ScriptCacheManager.get(resolvedPath);
    if (cachedEntry) {
      const cached = cachedEntry.content;
      setLoadError('');
      setScriptContent(cached);
      scriptOriginalRef.current = cachedEntry.originalContent ?? cached;
      applyEditorContent(cached, resolvedPath);
      return;
    }

    const preloadError = preloadErrorRef.current[resolvedPath];
    if (preloadError) {
      const nextContent = `// 脚本: ${currentScriptKey}\n// 加载失败\n// 路径: ${resolvedPath}\n// 错误: ${preloadError}`;
      setLoadError(`脚本加载失败: ${resolvedPath}`);
      setScriptContent(nextContent);
      scriptOriginalRef.current = nextContent;
      applyEditorContent(nextContent, resolvedPath);
      return;
    }

    requestScriptLoad(currentScriptKey, pathValue, resolvedPath);
  }, [currentScriptKey, scripts, applyEditorContent, requestScriptLoad, getLegacyPathError]);

  useEffect(() => {
    const entries = scriptKeys.map((key) => [key, typeof scripts[key] === 'string' ? scripts[key] : ''] as const);
    if (entries.length === 0) return;
    const nextManifest: Record<string, string> = {};
    let sameManifest = !!preloadedScriptManifestRef.current;
    for (let index = 0; index < entries.length; index++) {
      const [key, storedPathValue] = entries[index];
      nextManifest[key] = storedPathValue;
      if (!sameManifest || preloadedScriptManifestRef.current?.[key] !== storedPathValue) {
        sameManifest = false;
      }
    }
    if (sameManifest && Object.keys(preloadedScriptManifestRef.current || {}).length === entries.length) {
      return;
    }
    preloadedScriptManifestRef.current = nextManifest;

    const preload = async () => {
      for (const [key, value] of entries) {
        const storedPathValue = typeof value === 'string' ? value : '';
        if (!storedPathValue) continue;
        if (hasLegacyTimestampScriptPath(storedPathValue)) {
          const resolvedPath = getScriptFilePath(storedPathValue);
          preloadErrorRef.current[resolvedPath || storedPathValue] = getLegacyPathError(storedPathValue);
          continue;
        }
        const resolvedPath = getScriptFilePath(storedPathValue);
        try {
          await loadScriptContent(storedPathValue);
          if (resolvedPath) {
            delete preloadErrorRef.current[resolvedPath];
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error || '未知错误');
          if (resolvedPath) {
            preloadErrorRef.current[resolvedPath] = errorMessage;
          }
        }
      }
    };

    void preload();
  }, [getLegacyPathError, scriptKeys, scripts]);

  useEffect(() => {
    if (!editorReady) return;
    const pending = pendingLoadRef.current;
    if (!pending) return;
    pendingLoadRef.current = null;
    void loadAndApplyScript(pending.key, pending.storedPath, pending.resolvedPath);
  }, [editorReady, loadAndApplyScript]);

  useEffect(() => {
    if (!editorReady) return;
    const workspaceRoot = editorConfig.workspacePath || editorConfig.workspaceRoot;
    if (!workspaceRoot) return;
    clearWorkspaceExtraLibs();
    void applyWorkspaceSettings(workspaceRoot);
  }, [editorReady, editorConfig.workspacePath, editorConfig.workspaceRoot]);

  useEffect(() => {
    if (!currentScriptKey) return;
    if (!scriptContent) return;
    if (!editorRef.current) return;
    applyEditorContent(scriptContent, scriptFilePath);
  }, [currentScriptKey, scriptContent, scriptFilePath, applyEditorContent]);

  useEffect(() => {
    scriptPathRef.current = scriptFilePath;
  }, [scriptFilePath]);

  return (
    <div className="flex-1 flex" style={{ backgroundColor: 'var(--color-background)' }}>
      <div
        className="flex-1 flex"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div
          className="w-60 flex flex-col"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>脚本列表</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {scriptKeys.length === 0 ? (
              <div className="p-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无脚本</div>
            ) : null}
            {scriptKeys.map((key) => {
              const isActive = key === currentScriptKey;
              const storedPath = scripts[key];
              const pathValue = typeof storedPath === 'string' ? storedPath : '';
              const resolvedPath = pathValue ? getScriptFilePath(pathValue) : '';
              const isDirty = Boolean(resolvedPath && ScriptCacheManager.isDirty(resolvedPath));
              return (
                <button
                  key={key}
                  onClick={() => {
                    const pathValue = typeof scripts[key] === 'string' ? scripts[key] : '';
                    const resolvedPath = pathValue ? getScriptFilePath(pathValue) : '';
                    selectScript(key);
                    if (hasLegacyTimestampScriptPath(pathValue)) {
                      const nextError = getLegacyPathError(pathValue);
                      setLoadError(nextError);
                      setScriptContent('');
                      scriptOriginalRef.current = '';
                      applyEditorContent('', '');
                      return;
                    }
                    if (resolvedPath) {
                      const cachedEntry = ScriptCacheManager.get(resolvedPath);
                      if (cachedEntry) {
                        const cached = cachedEntry.content;
                        setLoadError('');
                        setScriptContent(cached);
                        scriptOriginalRef.current = cachedEntry.originalContent ?? cached;
                        applyEditorContent(cached, resolvedPath);
                        return;
                      }
                    }
                    const preloadError = resolvedPath
                      ? preloadErrorRef.current[resolvedPath]
                      : preloadErrorRef.current[pathValue];
                    if (preloadError) {
                      const nextContent = `// 脚本: ${key}\n// 加载失败\n// 路径: ${resolvedPath || pathValue || '未知'}\n// 错误: ${preloadError}`;
                      setLoadError(`脚本加载失败: ${resolvedPath || pathValue || '未知路径'}`);
                      setScriptContent(nextContent);
                      scriptOriginalRef.current = nextContent;
                      applyEditorContent(nextContent, resolvedPath);
                      return;
                    }
                    requestScriptLoad(key, pathValue, resolvedPath);
                  }}
                  disabled={!editorReady}
                  className="w-full text-left px-3 py-2 text-xs"
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-secondary)' : 'transparent',
                    color: !editorReady
                      ? 'var(--color-text-muted)'
                      : isActive
                        ? 'var(--color-accent)'
                        : 'var(--color-text)',
                    cursor: editorReady ? 'pointer' : 'not-allowed',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{key}</span>
                    {isDirty && (
                      <span className="ml-2 shrink-0" style={{ color: 'var(--color-accent)' }}>*</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div
            className="px-4 py-3 flex items-center"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span style={{ color: 'var(--color-accent)' }}>代码编辑</span>
              {currentScriptKey && (
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  - {currentScriptKey}{isCurrentScriptDirty ? ' *' : ''}
                </span>
              )}
              {scriptFilePath && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({scriptFilePath})</span>
              )}
              {isLoading && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
              )}
              {!editorReady && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>编辑器初始化中...</span>
              )}
              {loadError && (
                <span className="text-xs text-[#ffaa00]">{loadError}</span>
              )}
            </h2>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={scriptContent}
              theme={editorTheme}
              onMount={handleEditorDidMount}
              options={EDITOR_OPTIONS}
              key="script-editor"
              path={scriptFilePath || currentScriptKey || 'script-editor'}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

CodeEditorPanel.displayName = 'CodeEditorPanel';

export default CodeEditorPanel;
