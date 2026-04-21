import { describe, expect, it } from 'vitest';
import { ExternalDataChangeQueue } from './ExternalDataChangeQueue';

describe('ExternalDataChangeQueue', () => {
  it('会按标准化路径聚合同一文件的重复事件', () => {
    const queue = new ExternalDataChangeQueue({ duplicateTtlMs: 500 });

    expect(queue.enqueue({
      filePath: 'D:/Project/data/Weapons.json',
      fileName: 'Weapons.json',
      changeType: 'write',
    }, 0)).toBe(true);

    expect(queue.enqueue({
      filePath: 'D:\\Project\\data\\Weapons.json',
      fileName: 'weapons.json',
      changeType: 'write',
    }, 0)).toBe(true);

    const payloads = queue.drainPending();
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual({
      filePath: 'D:\\Project\\data\\Weapons.json',
      fileName: 'weapons.json',
      changeType: 'write',
    });
  });

  it('会在同一处理会话内抑制同一路径的重复入队', () => {
    const queue = new ExternalDataChangeQueue({ duplicateTtlMs: 500 });
    const payload = {
      filePath: 'D:/Project/data/Weapons.json',
      fileName: 'Weapons.json',
      changeType: 'write',
    } as const;

    queue.enqueue(payload, 0);
    const firstBatch = queue.drainPending();
    queue.markBatchHandled(firstBatch, 10);

    expect(queue.enqueue(payload, 20)).toBe(false);
    expect(queue.hasPending()).toBe(false);

    expect(queue.enqueue({
      filePath: 'D:/Project/data/Skills.json',
      fileName: 'Skills.json',
      changeType: 'write',
    }, 20)).toBe(true);
    expect(queue.drainPending()).toHaveLength(1);
  });

  it('会在会话结束后保留短时冷却并在过期后允许重新入队', () => {
    const queue = new ExternalDataChangeQueue({ duplicateTtlMs: 500 });
    const payload = {
      filePath: 'D:/Project/data/Animations.json',
      fileName: 'Animations.json',
      changeType: 'write',
    } as const;

    queue.enqueue(payload, 0);
    queue.markBatchHandled(queue.drainPending(), 10);
    queue.resetSession(20);

    expect(queue.enqueue(payload, 200)).toBe(false);
    expect(queue.getPendingSize()).toBe(0);

    expect(queue.enqueue(payload, 600)).toBe(true);
    expect(queue.getPendingSize()).toBe(1);
  });

  it('会忽略不可重载的数据文件事件', () => {
    const queue = new ExternalDataChangeQueue();

    expect(queue.enqueue({
      filePath: 'D:/Project/data/NotTracked.txt',
      fileName: 'NotTracked.txt',
      changeType: 'write',
    })).toBe(false);
    expect(queue.getPendingSize()).toBe(0);
  });
});
