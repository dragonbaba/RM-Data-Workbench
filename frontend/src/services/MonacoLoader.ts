/**
 * MonacoLoader - Monaco 编辑器加载管理器
 * 负责懒加载 Monaco 编辑器并管理配置
 */

import { EventSystem } from '../core/EventSystem';
import { FileExists, ListDtsFiles, ReadFileString } from '../../wailsjs/go/main/App';
import type { Theme, ThemePreset } from '../theme/ThemeManager';

type MonacoApi = typeof import('monaco-editor');

let monacoInstance: MonacoApi | null = null;
let loadPromise: Promise<MonacoApi | null> | null = null;
let rpgTypeLibDisposers: Array<{ dispose: () => void }> = [];
let workspaceLibDisposers: Array<{ dispose: () => void }> = [];
const MONACO_POLL_INTERVAL_MS = 50;
const MONACO_LOAD_TIMEOUT_MS = 5000;

// 主题注册状态
let themesRegistered = false;
let configuredTypeScriptMonaco: MonacoApi | null = null;
const appliedWorkspaceRoots = new Set<string>();
const appliedWorkspaceLibKeys = new Set<string>();

const sleep = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const getWindowMonaco = (): MonacoApi | null => {
  if (typeof window === 'undefined') return null;
  return ((window as any).monaco as MonacoApi | undefined) || null;
};

const waitForMonaco = async (timeoutMs: number): Promise<MonacoApi | null> => {
  const start = Date.now();
  let instance = getWindowMonaco();
  while (!instance && Date.now() - start < timeoutMs) {
    await sleep(MONACO_POLL_INTERVAL_MS);
    instance = getWindowMonaco();
  }
  return instance;
};

/**
 * 加载 Monaco 编辑器
 */
export async function loadMonaco(): Promise<MonacoApi | null> {
  if (monacoInstance) {
    return monacoInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const runtimeInstance = await waitForMonaco(MONACO_LOAD_TIMEOUT_MS);
      if (!runtimeInstance) {
        console.warn('[MonacoLoader] Monaco load timed out');
        return null;
      }

      monacoInstance = runtimeInstance;
      initializeMonaco(monacoInstance);
      return monacoInstance;
    } catch (error) {
      console.error('[MonacoLoader] Failed to load Monaco:', error);
      return monacoInstance;
    }
  })();

  const loaded = await loadPromise;
  if (!loaded) {
    loadPromise = null;
  }
  return loaded;
}

/**
 * 获取 Monaco 实例
 */
export function getMonaco(): MonacoApi | null {
  return monacoInstance;
}

export function setMonacoInstance(instance: MonacoApi | null): void {
  if (!instance) return;
  monacoInstance = instance;
  initializeMonaco(monacoInstance);
}

/**
 * 初始化 Monaco 配置
 */
function initializeMonaco(monaco: MonacoApi | null): void {
  if (!monaco) return;

  // 注册主题
  registerThemes(monaco);

  // 配置 TypeScript
  configureTypeScript(monaco);

  // 触发事件
  EventSystem.emit('editor:ready');
}

/**
 * 注册自定义主题
 */
function registerThemes(monaco: MonacoApi | null): void {
  if (themesRegistered || !monaco) return;

  monaco.editor.defineTheme('cyberpunk-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '00D4FF' },
      { token: 'identifier', foreground: 'F3F4F6' },
      { token: 'string', foreground: '00FF88' },
      { token: 'number', foreground: 'FF8800' },
      { token: 'regexp', foreground: 'FF00FF' },
      { token: 'operator', foreground: '00D4FF' },
    ],
    colors: {
      'editor.background': '#0A0E17',
      'editor.foreground': '#F3F4F6',
      'editor.lineHighlightBackground': '#1A1F2E',
      'editor.selectionBackground': '#00D4FF30',
      'editor.inactiveSelectionBackground': '#00D4FF15',
      'editorCursor.foreground': '#00D4FF',
      'editorLineNumber.foreground': '#30384D',
      'editorLineNumber.activeForeground': '#00D4FF',
      'editorIndentGuide.background': '#30384D',
      'editorIndentGuide.activeBackground': '#00D4FF50',
    },
  });

  monaco.editor.defineTheme('cyberpunk-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5F7A61', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0066CC' },
      { token: 'identifier', foreground: '1F2937' },
      { token: 'string', foreground: '0F9D58' },
      { token: 'number', foreground: 'C96A00' },
      { token: 'regexp', foreground: 'C2188B' },
      { token: 'operator', foreground: '0066CC' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1F2937',
      'editor.lineHighlightBackground': '#F3F6FB',
      'editor.selectionBackground': '#0066CC26',
      'editor.inactiveSelectionBackground': '#0066CC12',
      'editorCursor.foreground': '#0066CC',
      'editorLineNumber.foreground': '#9CA3AF',
      'editorLineNumber.activeForeground': '#0066CC',
      'editorIndentGuide.background': '#E5E7EB',
      'editorIndentGuide.activeBackground': '#0066CC40',
    },
  });

  // 高对比度主题
  monaco.editor.defineTheme('high-contrast', {
    base: 'hc-black',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7CA668', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'identifier', foreground: 'FFFFFF' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#FFFFFF',
    },
  });

  themesRegistered = true;
}

/**
 * 配置 TypeScript
 */
function configureTypeScript(monaco: MonacoApi | null): void {
  if (!monaco) return;
  if (configuredTypeScriptMonaco === monaco) return;
  configuredTypeScriptMonaco = monaco;

  const typescript = monaco.languages.typescript;

  // 配置 JavaScript 编译选项
  typescript.javascriptDefaults.setCompilerOptions({
    target: typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: typescript.ModuleResolutionKind.NodeJs,
    module: typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });

  // 添加 RPG Maker 类型定义
  const rpgTypes = `
    declare const player: {
      x: number;
      y: number;
      hp: number;
      mp: number;
      level: number;
      getPosition(): { x: number; y: number };
      setPosition(x: number, y: number): void;
      moveTo(x: number, y: number, speed?: number): void;
      attack(target: any, damage: number): void;
      useSkill(skillId: number): void;
      playAnimation(animName: string): void;
      showDamage(amount: number, isCrit?: boolean): void;
    };

    declare const target: {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      isAlive(): boolean;
      takeDamage(damage: number): void;
    };

    declare class Entity {
      x: number;
      y: number;
      sprite: any;
      body: any;
      stats: {
        hp: number;
        mp: number;
        atk: number;
        def: number;
      };
      constructor(x: number, y: number);
      setup(): void;
      update(deltaTime: number): void;
      getPosition(): { x: number; y: number };
      setPosition(x: number, y: number): void;
      moveTo(x: number, y: number, speed?: number): void;
      attack(target: any, damage: number): void;
      useSkill(skillId: number): void;
      playAnimation(animName: string): void;
      showDamage(amount: number, isCrit?: boolean): void;
      fadeIn(duration: number): void;
      fadeOut(duration: number): void;
    }

    declare const EventSystem: {
      on(event: string, callback: (...args: any[]) => void): void;
      off(event: string, callback?: (...args: any[]) => void): void;
      emit(event: string, ...args: any[]): void;
    };

    declare const logger: {
      debug(message: string, data?: any, source?: string): void;
      info(message: string, data?: any, source?: string): void;
      warn(message: string, data?: any, source?: string): void;
      error(message: string, data?: any, source?: string): void;
    };

    declare function addItem(itemId: number, quantity: number): void;
    declare function removeItem(itemId: number, quantity: number): void;
    declare function playSound(soundId: string): void;
    declare function playMusic(musicId: string): void;
    declare function showDialog(text: string): void;
  `;

  rpgTypeLibDisposers.forEach((disposer) => disposer.dispose());
  rpgTypeLibDisposers = [];
  rpgTypeLibDisposers.push(typescript.javascriptDefaults.addExtraLib(rpgTypes, 'rpg-maker.d.ts'));
  rpgTypeLibDisposers.push(typescript.typescriptDefaults.addExtraLib(rpgTypes, 'rpg-maker.d.ts'));
}

/**
 * 设置编辑器主题
 */
export function setEditorTheme(themeName: string): void {
  if (!monacoInstance) return;
  monacoInstance.editor.setTheme(themeName);
}

export function resolveEditorThemeName(theme: Theme, preset: ThemePreset): string {
  if (preset === 'high-contrast') {
    return theme === 'light' ? 'hc-light' : 'high-contrast';
  }

  if (preset === 'minimal') {
    return theme === 'light' ? 'vs' : 'vs-dark';
  }

  return theme === 'light' ? 'cyberpunk-light' : 'cyberpunk-dark';
}

/**
 * 应用工作区类型提示（读取 workspace 目录下的 .d.ts）
 */
export async function applyWorkspaceSettings(workspaceRoot: string): Promise<void> {
  if (!workspaceRoot) return;
  if (appliedWorkspaceRoots.has(workspaceRoot)) return;

  const exists = await FileExists(workspaceRoot);
  if (!exists) return;

  const monacoApi = await loadMonaco();
  if (!monacoApi) return;

  const dtsFiles = await ListDtsFiles(workspaceRoot);
  if (!Array.isArray(dtsFiles) || dtsFiles.length === 0) return;

  for (const filePath of dtsFiles) {
    try {
      const content = await ReadFileString(filePath);
      if (content) {
        const virtualPath = monacoApi.Uri.file(filePath).toString();
        const normalizedVirtualPath = virtualPath.toLowerCase();
        const jsLibKey = `js:${normalizedVirtualPath}`;
        const tsLibKey = `ts:${normalizedVirtualPath}`;
        if (!appliedWorkspaceLibKeys.has(jsLibKey)) {
          workspaceLibDisposers.push(monacoApi.languages.typescript.javascriptDefaults.addExtraLib(content, virtualPath));
          appliedWorkspaceLibKeys.add(jsLibKey);
        }
        if (!appliedWorkspaceLibKeys.has(tsLibKey)) {
          workspaceLibDisposers.push(monacoApi.languages.typescript.typescriptDefaults.addExtraLib(content, virtualPath));
          appliedWorkspaceLibKeys.add(tsLibKey);
        }
      }
    } catch {
      // ignore invalid d.ts files
    }
  }
  appliedWorkspaceRoots.add(workspaceRoot);
}

export function clearWorkspaceExtraLibs(): void {
  workspaceLibDisposers.forEach((disposer) => disposer.dispose());
  workspaceLibDisposers = [];
  appliedWorkspaceRoots.clear();
  appliedWorkspaceLibKeys.clear();
}

/**
 * 格式化代码
 */
export async function formatCode(code: string, language: string = 'javascript'): Promise<string> {
  if (!monacoInstance) {
    return code;
  }

  try {
    const model = monacoInstance.editor.createModel(code, language);
    // 使用 editor.action.formatDocument 命令
    const editor = monacoInstance.editor.create(document.createElement('div'));
    editor.setModel(model);
    await editor.getAction('editor.action.formatDocument')?.run();
    const result = model.getValue();
    editor.dispose();
    model.dispose();
    return result;
  } catch (error) {
    console.warn('[MonacoLoader] Format failed:', error);
    return code;
  }
}

export default {
  loadMonaco,
  getMonaco,
  setEditorTheme,
  formatCode,
};
