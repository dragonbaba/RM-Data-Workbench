import { afterEach, describe, expect, it } from 'vitest';
import { ScriptCacheManager } from './ScriptCacheManager';
import { EventSystem } from '../core/EventSystem';

describe('ScriptCacheManager', () => {
  afterEach(() => {
    ScriptCacheManager.clear();
  });

  it('会按当前内容和原始内容重新计算脏状态，而不是继承旧 dirty 标记', () => {
    const filePath = 'D:/RMProjects/MyGame/scripts/2_actionSequence.js';

    ScriptCacheManager.set(filePath, 'export const run = 1;', 'export const run = 1;');
    ScriptCacheManager.markDirty(filePath);
    expect(ScriptCacheManager.isDirty(filePath)).toBe(false);

    ScriptCacheManager.set(filePath, 'export const run = 1;', 'export const run = 1;');
    expect(ScriptCacheManager.isDirty(filePath)).toBe(false);
    expect(ScriptCacheManager.getDirtyFiles()).toEqual([]);
  });

  it('内容和原始内容一致时不会进入脏文件列表', () => {
    const filePath = 'D:/RMProjects/MyGame/scripts/2_actionSequence.js';

    ScriptCacheManager.set(filePath, '', '');
    expect(ScriptCacheManager.isDirty(filePath)).toBe(false);
    expect(ScriptCacheManager.getDirtyFiles()).toEqual([]);

    ScriptCacheManager.set(filePath, 'export function run() {}', 'export function run() {}');
    expect(ScriptCacheManager.isDirty(filePath)).toBe(false);
    expect(ScriptCacheManager.getDirtyFiles()).toEqual([]);
  });

  it('内容脏状态变化时会发出 dirty 和 clean 事件', () => {
    const filePath = 'D:/RMProjects/MyGame/scripts/2_actionSequence.js';
    const events: string[] = [];
    const onDirty = () => events.push('dirty');
    const onClean = () => events.push('clean');
    EventSystem.on('script:dirty', onDirty);
    EventSystem.on('script:clean', onClean);

    try {
      ScriptCacheManager.set(filePath, 'changed', 'original');
      ScriptCacheManager.set(filePath, 'saved', 'saved');

      expect(events).toEqual(['dirty', 'clean']);
    } finally {
      EventSystem.off('script:dirty', onDirty);
      EventSystem.off('script:clean', onClean);
    }
  });
});
