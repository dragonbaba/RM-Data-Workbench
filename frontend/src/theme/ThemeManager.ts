/**
 * ThemeManager - 主题管理器
 * 管理应用主题、强调色、动画等设置
 * 
 * 适配 React + Zustand 架构
 */

import { useEditorStore } from '../stores/editorStore';
import { EventSystem } from '../core/EventSystem';

// ============ 类型定义 ============

export type Theme = 'dark' | 'light';
export type AccentColor = 'cyan' | 'magenta' | 'green' | 'orange';
export type ThemePreset = 'cyberpunk' | 'minimal' | 'high-contrast';
export type FontSize = 'small' | 'medium' | 'large';
export type UpdateFrequency = 'startup' | 'daily' | 'weekly' | 'manual';

export interface ThemeConfig {
  theme: Theme;
  accentColor: AccentColor;
  animationsEnabled: boolean;
  themePreset: ThemePreset;
  fontSize: FontSize;
  compactMode: boolean;
  updateCheckFrequency: UpdateFrequency;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  warning: string;
  success: string;
}

// ============ 主题配置 ============

const ACCENT_COLORS: Record<AccentColor, string> = {
  cyan: '#00d4ff',
  magenta: '#ff00ff',
  green: '#00ff88',
  orange: '#ff8800',
};

const THEME_COLORS: Record<Theme, ThemeColors> = {
  dark: {
    primary: '#00d4ff',
    secondary: '#1a1f2e',
    accent: '#00d4ff',
    background: '#0a0e17',
    surface: '#1a1f2e',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    border: '#30384d',
    error: '#ff4444',
    warning: '#ffaa00',
    success: '#00ff88',
  },
  light: {
    primary: '#0066cc',
    secondary: '#f3f4f6',
    accent: '#0066cc',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    error: '#dc2626',
    warning: '#d97706',
    success: '#059669',
  },
};

const PRESET_CONFIGS: Record<ThemePreset, Partial<ThemeConfig>> = {
  cyberpunk: {
    theme: 'dark',
    accentColor: 'cyan',
    animationsEnabled: true,
  },
  minimal: {
    theme: 'dark',
    accentColor: 'cyan',
    animationsEnabled: false,
  },
  'high-contrast': {
    theme: 'dark',
    accentColor: 'green',
    animationsEnabled: false,
  },
};

// ============ CSS 变量映射 ============

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  background: '--color-background',
  surface: '--color-surface',
  text: '--color-text',
  textMuted: '--color-text-muted',
  border: '--color-border',
  error: '--color-error',
  warning: '--color-warning',
  success: '--color-success',
};

// ============ ThemeManager ============

class ThemeManagerClass {
  private initialized = false;
  private currentColors: ThemeColors = THEME_COLORS.dark;

  /**
   * 初始化主题系统
   */
  initialize(): void {
    if (this.initialized) return;

    const store = useEditorStore.getState();
    this.applyTheme(store.config);
    
    this.initialized = true;
    EventSystem.emit('theme:initialized');
  }

  /**
   * 应用主题配置
   */
  applyTheme(config: Partial<ThemeConfig>): void {
    const store = useEditorStore.getState();
    const mergedConfig = { ...store.config, ...config };
    
    // 应用预设
    if (config.themePreset) {
      const preset = PRESET_CONFIGS[config.themePreset];
      Object.assign(mergedConfig, preset);
    }

    // 更新 CSS 变量
    this.updateCSSVariables(mergedConfig);
    
    // 更新 body class
    this.updateBodyClasses(mergedConfig);
    
    // 更新当前颜色
    this.currentColors = this.getThemeColors(mergedConfig.theme, mergedConfig.accentColor);

    // 触发事件
    EventSystem.emit('theme:changed', mergedConfig);
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    useEditorStore.getState().updateConfig({ theme });
    this.applyTheme({ theme });
  }

  /**
   * 设置强调色
   */
  setAccentColor(color: AccentColor): void {
    useEditorStore.getState().updateConfig({ accentColor: color });
    this.applyTheme({ accentColor: color });
  }

  /**
   * 设置主题预设
   */
  setPreset(preset: ThemePreset): void {
    useEditorStore.getState().updateConfig({ themePreset: preset });
    this.applyTheme({ themePreset: preset });
  }

  /**
   * 设置动画开关
   */
  setAnimations(enabled: boolean): void {
    useEditorStore.getState().updateConfig({ animationsEnabled: enabled });
    document.body.classList.toggle('animations-disabled', !enabled);
    EventSystem.emit('theme:animations-changed', enabled);
  }

  /**
   * 设置字体大小
   */
  setFontSize(size: FontSize): void {
    useEditorStore.getState().updateConfig({ fontSize: size });
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${size}`);
  }

  /**
   * 设置紧凑模式
   */
  setCompactMode(enabled: boolean): void {
    useEditorStore.getState().updateConfig({ compactMode: enabled });
    document.body.classList.toggle('compact-mode', enabled);
  }

  /**
   * 获取当前主题颜色
   */
  getCurrentColors(): ThemeColors {
    return this.currentColors;
  }

  /**
   * 获取主题颜色配置
   */
  getThemeColors(theme: Theme, accentColor: AccentColor): ThemeColors {
    const colors = { ...THEME_COLORS[theme] };
    colors.accent = ACCENT_COLORS[accentColor];
    colors.primary = ACCENT_COLORS[accentColor];
    return colors;
  }

  /**
   * 获取强调色值
   */
  getAccentColorValue(color?: AccentColor): string {
    const store = useEditorStore.getState();
    return ACCENT_COLORS[color || store.config.accentColor];
  }

  /**
   * 切换主题（暗黑/明亮）
   */
  toggleTheme(): void {
    const store = useEditorStore.getState();
    const newTheme = store.config.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // ============ 私有方法 ============

  /**
   * 更新 CSS 变量
   */
  private updateCSSVariables(config: ThemeConfig): void {
    const root = document.documentElement;
    const colors = this.getThemeColors(config.theme, config.accentColor);

    // 设置颜色变量
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = CSS_VAR_MAP[key as keyof ThemeColors];
      if (cssVar) {
        root.style.setProperty(cssVar, value);
      }
    });

    // 设置强调色
    root.style.setProperty('--color-accent', ACCENT_COLORS[config.accentColor]);
    
    // 设置字体大小变量
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[config.fontSize]);
  }

  /**
   * 更新 body class
   */
  private updateBodyClasses(config: ThemeConfig): void {
    const body = document.body;
    
    // 主题 class
    body.classList.remove('theme-dark', 'theme-light');
    body.classList.add(`theme-${config.theme}`);
    
    // 预设 class
    body.classList.remove('preset-cyberpunk', 'preset-minimal', 'preset-high-contrast');
    body.classList.add(`preset-${config.themePreset}`);
    
    // 动画 class
    body.classList.toggle('animations-disabled', !config.animationsEnabled);
    
    // 字体大小 class
    body.classList.remove('font-small', 'font-medium', 'font-large');
    body.classList.add(`font-${config.fontSize}`);
    
    // 紧凑模式 class
    body.classList.toggle('compact-mode', config.compactMode);
  }
}

// ============ 导出单例 ============

export const ThemeManager = new ThemeManagerClass();

export default ThemeManager;

// ============ React Hook ============

/**
 * 使用主题的 Hook
 */
export function useTheme() {
  const store = useEditorStore();
  
  return {
    config: store.config,
    colors: ThemeManager.getCurrentColors(),
    setTheme: ThemeManager.setTheme.bind(ThemeManager),
    setAccentColor: ThemeManager.setAccentColor.bind(ThemeManager),
    setPreset: ThemeManager.setPreset.bind(ThemeManager),
    setAnimations: ThemeManager.setAnimations.bind(ThemeManager),
    setFontSize: ThemeManager.setFontSize.bind(ThemeManager),
    setCompactMode: ThemeManager.setCompactMode.bind(ThemeManager),
    toggleTheme: ThemeManager.toggleTheme.bind(ThemeManager),
  };
}
