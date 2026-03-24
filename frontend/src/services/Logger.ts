/**
 * Logger - 日志系统
 * 分级日志记录，支持文件轮转和日志搜索
 */

import { EventSystem } from '../core/EventSystem';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

interface LoggerOptions {
  maxEntries?: number;
  persistToStorage?: boolean;
  storageKey?: string;
  enableConsoleOutput?: boolean;
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

class LoggerClass {
  private logs: LogEntry[] = [];
  private maxEntries: number;
  private persistToStorage: boolean;
  private storageKey: string;
  private storage: StorageLike | null = null;
  private enableConsoleOutput: boolean;
  private currentLevel: LogLevel = 'debug';

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(options: LoggerOptions = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.persistToStorage = options.persistToStorage || false;
    this.storageKey = options.storageKey || 'rpg-editor-logs';
    this.enableConsoleOutput = options.enableConsoleOutput ?? !this.isTestRuntime();
    this.storage = this.resolveStorage();

    if (this.persistToStorage && this.storage) {
      this.loadFromStorage();
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: any, source?: string): void {
    this.log('debug', message, data, source);
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: any, source?: string): void {
    this.log('info', message, data, source);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any, source?: string): void {
    this.log('warn', message, data, source);
  }

  /**
   * 记录错误日志
   */
  error(message: string, data?: any, source?: string): void {
    this.log('error', message, data, source);
  }

  /**
   * 通用日志记录
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    // 检查日志级别
    if (this.levelPriority[level] < this.levelPriority[this.currentLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      source,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }

    // 持久化
    if (this.persistToStorage) {
      this.saveToStorage();
    }

    // 触发事件
    EventSystem.emit('log:new', entry);

    // 控制台输出
    if (this.enableConsoleOutput) {
      this.consoleOutput(entry);
    }
  }

  /**
   * 控制台输出
   */
  private consoleOutput(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    const source = entry.source ? ` [${entry.source}]` : '';

    const consoleMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[entry.level];

    if (entry.data !== undefined) {
      consoleMethod(prefix + source, entry.message, entry.data);
    } else {
      consoleMethod(prefix + source, entry.message);
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按级别获取日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按来源获取日志
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source);
  }

  /**
   * 搜索日志
   */
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log =>
      log.message.toLowerCase().includes(lowerQuery) ||
      (log.source?.toLowerCase().includes(lowerQuery)) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 过滤日志
   */
  filterLogs(
    options: {
      level?: LogLevel;
      source?: string;
      startTime?: number;
      endTime?: number;
    }
  ): LogEntry[] {
    return this.logs.filter(log => {
      if (options.level && log.level !== options.level) return false;
      if (options.source && log.source !== options.source) return false;
      if (options.startTime && log.timestamp < options.startTime) return false;
      if (options.endTime && log.timestamp > options.endTime) return false;
      return true;
    });
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
    if (this.persistToStorage && this.storage) {
      this.storage.removeItem(this.storageKey);
    }
    EventSystem.emit('log:cleared');
  }

  /**
   * 导出日志
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,level,source,message,data\n';
      const rows = this.logs.map(log =>
        `${new Date(log.timestamp).toISOString()},${log.level},${log.source || ''},"${log.message}",${JSON.stringify(log.data || '')}`
      ).join('\n');
      return headers + rows;
    }

    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 获取日志统计
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<string, number>;
  } {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    const bySource: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      if (log.source) {
        bySource[log.source] = (bySource[log.source] || 0) + 1;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      bySource,
    };
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('[Logger] Failed to save logs to storage:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Logger] Failed to load logs from storage:', error);
    }
  }

  private resolveStorage(): StorageLike | null {
    try {
      const globalStorage = (globalThis as { localStorage?: unknown }).localStorage as Partial<StorageLike> | undefined;
      if (
        !globalStorage ||
        typeof globalStorage.getItem !== 'function' ||
        typeof globalStorage.setItem !== 'function' ||
        typeof globalStorage.removeItem !== 'function'
      ) {
        return null;
      }

      const testKey = '__logger_storage_probe__';
      globalStorage.setItem(testKey, '1');
      globalStorage.removeItem(testKey);
      return globalStorage as StorageLike;
    } catch {
      return null;
    }
  }

  private isTestRuntime(): boolean {
    try {
      const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
      if (!processEnv) return false;
      return processEnv.VITEST === 'true' || processEnv.NODE_ENV === 'test';
    } catch {
      return false;
    }
  }

  /**
   * 创建带上下文的日志记录器
   */
  withContext(source: string): {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  } {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, source),
      info: (message: string, data?: any) => this.info(message, data, source),
      warn: (message: string, data?: any) => this.warn(message, data, source),
      error: (message: string, data?: any) => this.error(message, data, source),
    };
  }
}

// 创建全局日志实例
export const Logger = new LoggerClass({
  maxEntries: 500,
  persistToStorage: true,
});

export default Logger;
