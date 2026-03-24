import { describe, it, expect, beforeEach } from 'vitest';
import { Logger } from '../services/Logger';

describe('Logger', () => {
  beforeEach(() => {
    Logger.clear();
    Logger.setLevel('debug');
  });

  it('should log messages at different levels', () => {
    Logger.debug('debug message');
    Logger.info('info message');
    Logger.warn('warn message');
    Logger.error('error message');
    
    const logs = Logger.getLogs();
    expect(logs).toHaveLength(4);
    expect(logs[0].level).toBe('debug');
    expect(logs[1].level).toBe('info');
    expect(logs[2].level).toBe('warn');
    expect(logs[3].level).toBe('error');
  });

  it('should respect log level', () => {
    Logger.setLevel('warn');
    
    Logger.debug('debug message');
    Logger.info('info message');
    Logger.warn('warn message');
    Logger.error('error message');
    
    const logs = Logger.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe('warn');
    expect(logs[1].level).toBe('error');
  });

  it('should include source in logs', () => {
    Logger.info('test message', null, 'TestSource');
    
    const logs = Logger.getLogs();
    expect(logs[0].source).toBe('TestSource');
  });

  it('should include data in logs', () => {
    const testData = { key: 'value' };
    Logger.info('test message', testData);
    
    const logs = Logger.getLogs();
    expect(logs[0].data).toEqual(testData);
  });

  it('should filter logs by level', () => {
    Logger.debug('debug');
    Logger.info('info');
    Logger.error('error');
    
    const errorLogs = Logger.getLogsByLevel('error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].message).toBe('error');
  });

  it('should filter logs by source', () => {
    Logger.info('message 1', null, 'SourceA');
    Logger.info('message 2', null, 'SourceB');
    Logger.info('message 3', null, 'SourceA');
    
    const sourceALogs = Logger.getLogsBySource('SourceA');
    expect(sourceALogs).toHaveLength(2);
  });

  it('should search logs', () => {
    Logger.info('hello world');
    Logger.info('goodbye world');
    Logger.info('other message');
    
    const results = Logger.searchLogs('world');
    expect(results).toHaveLength(2);
  });

  it('should clear all logs', () => {
    Logger.info('message 1');
    Logger.info('message 2');
    
    Logger.clear();
    
    const logs = Logger.getLogs();
    expect(logs).toHaveLength(0);
  });

  it('should provide log statistics', () => {
    Logger.debug('debug');
    Logger.info('info');
    Logger.info('info 2');
    Logger.error('error');
    
    const stats = Logger.getStats();
    expect(stats.total).toBe(4);
    expect(stats.byLevel.debug).toBe(1);
    expect(stats.byLevel.info).toBe(2);
    expect(stats.byLevel.error).toBe(1);
  });

  it('should create contextual logger', () => {
    const contextLogger = Logger.withContext('MyComponent');
    
    contextLogger.info('test message');
    
    const logs = Logger.getLogs();
    expect(logs[0].source).toBe('MyComponent');
    expect(logs[0].message).toBe('test message');
  });

  it('should export logs to JSON', () => {
    Logger.info('test');
    
    const exported = Logger.exportLogs('json');
    const parsed = JSON.parse(exported);
    
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe('test');
  });

  it('should export logs to CSV', () => {
    Logger.info('test');
    
    const exported = Logger.exportLogs('csv');
    
    expect(exported).toContain('timestamp,level,source,message,data');
    expect(exported).toContain('test');
  });
});
