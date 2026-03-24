import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventSystem } from '../core/EventSystem';

describe('EventSystem', () => {
  beforeEach(() => {
    EventSystem.clear();
  });

  it('should register and trigger event listeners', () => {
    const handler = vi.fn();
    EventSystem.on('test:event', handler);
    EventSystem.emit('test:event', 'data');
    
    expect(handler).toHaveBeenCalledWith('data');
  });

  it('should support multiple listeners for same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    EventSystem.on('test:event', handler1);
    EventSystem.on('test:event', handler2);
    EventSystem.emit('test:event', 'data');
    
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should remove specific listener', () => {
    const handler = vi.fn();
    EventSystem.on('test:event', handler);
    EventSystem.off('test:event', handler);
    EventSystem.emit('test:event', 'data');
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once listener', () => {
    const handler = vi.fn();
    EventSystem.once('test:event', handler);
    
    EventSystem.emit('test:event', 'data1');
    EventSystem.emit('test:event', 'data2');
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('data1');
  });

  it('should check if event has listeners', () => {
    expect(EventSystem.has('test:event')).toBe(false);
    
    EventSystem.on('test:event', () => {});
    expect(EventSystem.has('test:event')).toBe(true);
  });

  it('should get listener count', () => {
    expect(EventSystem.listenerCount('test:event')).toBe(0);
    
    EventSystem.on('test:event', () => {});
    EventSystem.on('test:event', () => {});
    
    expect(EventSystem.listenerCount('test:event')).toBe(2);
  });

  it('should remove all listeners for event', () => {
    EventSystem.on('test:event', () => {});
    EventSystem.on('test:event', () => {});
    
    EventSystem.off('test:event');
    
    expect(EventSystem.listenerCount('test:event')).toBe(0);
  });

  it('should remove listeners by namespace', () => {
    EventSystem.on('file:loaded', () => {});
    EventSystem.on('file:saved', () => {});
    EventSystem.on('other:event', () => {});
    
    EventSystem.offNamespace('file');
    
    expect(EventSystem.has('file:loaded')).toBe(false);
    expect(EventSystem.has('file:saved')).toBe(false);
    expect(EventSystem.has('other:event')).toBe(true);
  });
});
