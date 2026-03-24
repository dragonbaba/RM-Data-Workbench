import { describe, expect, it } from 'vitest';
import { hasLegacyTimestampScriptPath } from './ScriptPathCompat';

describe('ScriptPathCompat', () => {
  it('会识别旧版时间戳脚本路径', () => {
    expect(hasLegacyTimestampScriptPath('scripts/2_actionSequence_1766338208382.js')).toBe(true);
    expect(hasLegacyTimestampScriptPath('D:/RMProjects/MyGame/scripts/2_actionSequence_1766338208382.js')).toBe(true);
  });

  it('不会把当前无时间戳脚本路径误判为旧格式', () => {
    expect(hasLegacyTimestampScriptPath('scripts/2_actionSequence.js')).toBe(false);
    expect(hasLegacyTimestampScriptPath('scripts/2_actionSequence_2.js')).toBe(false);
    expect(hasLegacyTimestampScriptPath('')).toBe(false);
  });
});
