/**
 * ScriptCacheManager - 脚本缓存管理器
 * 管理脚本内容的缓存，支持时间戳和脏标记
 */

import { EventSystem } from '../core/EventSystem';

interface ScriptCacheEntry {
  content: string;
  timestamp: number;
  dirty: boolean;
  originalContent: string;
}

const isEntryDirty = (entry: ScriptCacheEntry): boolean => entry.content !== entry.originalContent;

const buildLineCounter = (lines: string[]): Map<string, number> => {
  const counter = new Map<string, number>();
  for (const line of lines) {
    counter.set(line, (counter.get(line) || 0) + 1);
  }
  return counter;
};

const resolveLineDiff = (fromLines: string[], toLines: string[]): string => {
  const counter = buildLineCounter(fromLines);
  const diff: string[] = [];
  for (const line of toLines) {
    const count = counter.get(line) || 0;
    if (count > 0) {
      counter.set(line, count - 1);
      continue;
    }
    diff.push(line);
  }
  return diff.join('\n');
};

class ScriptCacheManagerClass {
  private cache: Map<string, ScriptCacheEntry> = new Map();
  private maxCacheSize = 100;

  /**
   * 获取缓存的脚本内容
   */
  get(filePath: string): ScriptCacheEntry | undefined {
    return this.cache.get(filePath);
  }

  /**
   * 设置缓存
   */
  set(filePath: string, content: string, originalContent?: string): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(filePath)) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const existing = this.cache.get(filePath);
    const nextOriginalContent = originalContent ?? existing?.originalContent ?? content;
    const entry: ScriptCacheEntry = {
      content,
      timestamp: Date.now(),
      dirty: content !== nextOriginalContent,
      originalContent: nextOriginalContent,
    };

    this.cache.set(filePath, entry);
  }

  /**
   * 标记脚本为已修改
   */
  markDirty(filePath: string): void {
    const entry = this.cache.get(filePath);
    if (entry && !entry.dirty) {
      entry.dirty = true;
      entry.timestamp = Date.now();
      EventSystem.emit('script:dirty', filePath);
    }
  }

  /**
   * 标记脚本为已保存
   */
  markClean(filePath: string): void {
    const entry = this.cache.get(filePath);
    if (entry && (entry.dirty || isEntryDirty(entry))) {
      entry.dirty = false;
      entry.originalContent = entry.content;
      EventSystem.emit('script:clean', filePath);
    }
  }

  /**
   * 检查脚本是否有未保存的更改
   */
  isDirty(filePath: string): boolean {
    const entry = this.cache.get(filePath);
    return entry ? isEntryDirty(entry) : false;
  }

  /**
   * 获取脚本内容（如果已修改则返回修改后的内容）
   */
  getContent(filePath: string): string | undefined {
    return this.cache.get(filePath)?.content;
  }

  /**
   * 获取原始脚本内容
   */
  getOriginalContent(filePath: string): string | undefined {
    return this.cache.get(filePath)?.originalContent;
  }

  /**
   * 获取脚本的修改内容（与原始内容的差异）
   */
  getChanges(filePath: string): { added: string; removed: string } | null {
    const entry = this.cache.get(filePath);
    if (!entry || !isEntryDirty(entry)) return null;

    const originalLines = entry.originalContent.split('\n');
    const currentLines = entry.content.split('\n');
    const added = resolveLineDiff(originalLines, currentLines);
    const removed = resolveLineDiff(currentLines, originalLines);

    return { added, removed };
  }

  /**
   * 删除缓存
   */
  delete(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    EventSystem.emit('script:cache-cleared');
  }

  /**
   * 获取所有脏文件的列表
   */
  getDirtyFiles(): string[] {
    const dirty: string[] = [];
    for (const [path, entry] of this.cache) {
      if (isEntryDirty(entry)) {
        dirty.push(path);
      }
    }
    return dirty;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    total: number;
    dirty: number;
    clean: number;
  } {
    let dirty = 0;
    for (const entry of this.cache.values()) {
      if (isEntryDirty(entry)) dirty++;
    }
    return {
      total: this.cache.size,
      dirty,
      clean: this.cache.size - dirty,
    };
  }
}

export const ScriptCacheManager = new ScriptCacheManagerClass();
export default ScriptCacheManager;
