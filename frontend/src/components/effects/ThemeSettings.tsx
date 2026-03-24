import React from 'react';
import { ThemeManager, AccentColor, ThemePreset, FontSize } from '../../theme/ThemeManager';
import { useTheme } from '../../theme/ThemeManager';

/**
 * 主题设置面板
 * 用于调整主题、强调色、动画等设置
 */
export const ThemeSettings: React.FC = () => {
  const {
    config,
    setTheme,
    setAccentColor,
    setPreset,
    setAnimations,
    setFontSize,
    setCompactMode,
    toggleTheme,
  } = useTheme();

  const accentColors: { value: AccentColor; label: string; color: string }[] = [
    { value: 'cyan', label: '青色', color: '#00d4ff' },
    { value: 'magenta', label: '洋红', color: '#ff00ff' },
    { value: 'green', label: '绿色', color: '#00ff88' },
    { value: 'orange', label: '橙色', color: '#ff8800' },
  ];

  const presets: { value: ThemePreset; label: string; description: string }[] = [
    { value: 'cyberpunk', label: '赛博朋克', description: '科幻风格，动态效果' },
    { value: 'minimal', label: '极简', description: '简洁清爽，无动画' },
    { value: 'high-contrast', label: '高对比度', description: '高对比度，易于阅读' },
  ];

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent)' }}>
        主题设置
      </h2>

      {/* 主题模式 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400">主题模式</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 rounded border transition-all ${
              config.theme === 'dark'
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            暗黑
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-4 py-2 rounded border transition-all ${
              config.theme === 'light'
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            明亮
          </button>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded border border-gray-600 text-gray-400 hover:border-gray-500 transition-all"
          >
            切换
          </button>
        </div>
      </div>

      {/* 强调色 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400">强调色</label>
        <div className="flex gap-3">
          {accentColors.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setAccentColor(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${
                config.accentColor === value
                  ? 'border-current'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              style={{
                color: config.accentColor === value ? color : '#9ca3af',
                borderColor: config.accentColor === value ? color : undefined,
                backgroundColor: config.accentColor === value ? `${color}20` : undefined,
              }}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 主题预设 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400">主题预设</label>
        <div className="grid grid-cols-1 gap-2">
          {presets.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setPreset(value)}
              className={`flex flex-col items-start p-3 rounded border text-left transition-all ${
                config.themePreset === value
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <span className={config.themePreset === value ? 'text-cyan-400' : 'text-gray-300'}>
                {label}
              </span>
              <span className="text-xs text-gray-500 mt-1">{description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 字体大小 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400">字体大小</label>
        <div className="flex gap-2">
          {fontSizes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFontSize(value)}
              className={`px-4 py-2 rounded border transition-all ${
                config.fontSize === value
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 动画开关 */}
      <div className="flex items-center justify-between p-3 rounded border border-gray-600">
        <div>
          <div className="font-medium text-gray-300">动画效果</div>
          <div className="text-xs text-gray-500">启用动态背景和过渡动画</div>
        </div>
        <button
          onClick={() => setAnimations(!config.animationsEnabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            config.animationsEnabled ? 'bg-cyan-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              config.animationsEnabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 紧凑模式 */}
      <div className="flex items-center justify-between p-3 rounded border border-gray-600">
        <div>
          <div className="font-medium text-gray-300">紧凑模式</div>
          <div className="text-xs text-gray-500">减小间距和边距</div>
        </div>
        <button
          onClick={() => setCompactMode(!config.compactMode)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            config.compactMode ? 'bg-cyan-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              config.compactMode ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ThemeSettings;
