import { describe, expect, it } from 'vitest';
import {
  buildTrajectoryPoints,
  findDataEntryById,
  normalizeBattlerType,
  normalizeDurationFrames,
  resolveActorProjectileOffset,
  resolveEnemyProjectileOffset,
  resolveThrowProjectileWtypeId,
  segmentDurationToMs,
  THROW_PROJECTILE_WEAPON_OPTION_ID,
  shouldUseStaticActorPreviewFrame,
  toDurationFrameDisplay,
} from './ProjectilePreviewUtils';
import type { TrajectorySegment } from '../types';

describe('ProjectilePreviewUtils', () => {
  it('normalizes duration as frames (no seconds conversion)', () => {
    expect(normalizeDurationFrames(60)).toBe(60);
    expect(segmentDurationToMs(120)).toBeCloseTo(2000, 5);
  });

  it('clamps and truncates invalid/float durations', () => {
    expect(normalizeDurationFrames(0.5)).toBe(1);
    expect(toDurationFrameDisplay(6.9)).toBe(6);
    expect(normalizeDurationFrames(-1)).toBe(1);
  });

  it('builds trajectory points using absolute segment coordinates with final target lock', () => {
    const segments: TrajectorySegment[] = [
      { targetX: 10, targetY: -5, duration: 0.2 },
      { targetX: 0, targetY: 0, duration: 0.2 },
    ];

    const points = buildTrajectoryPoints(segments, 100, 100, 300, 80);
    expect(points).toHaveLength(3);
    expect(points[1]).toEqual({ x: 10, y: -5 });
    expect(points[2]).toEqual({ x: 300, y: 80 });
  });

  it('resolves actor projectile offset by weapon type id', () => {
    const actor = {
      id: 1,
      projectileOffset: {
        1: { x: -62, y: -30 },
      },
    };
    const weapon = { id: 10, wtypeId: 1 };

    expect(resolveActorProjectileOffset(actor, weapon)).toEqual({ x: -62, y: -30 });
  });

  it('resolves enemy projectile offset by skill id', () => {
    const enemy = {
      id: 3,
      projectileOffset: {
        6: { x: 0, y: 0 },
      },
    };

    expect(resolveEnemyProjectileOffset(enemy, 6)).toEqual({ x: 0, y: 0 });
  });

  it('resolves throw projectile weapon type id from wrapped system data', () => {
    expect(resolveThrowProjectileWtypeId([null, {
      weaponTypes: ['', '主炮', '副炮', 'SE'],
    }])).toBe(4);
    expect(THROW_PROJECTILE_WEAPON_OPTION_ID).toBe(-1);
  });

  it('returns 0 for null/undefined/invalid system data without crashing', () => {
    expect(resolveThrowProjectileWtypeId(null)).toBe(0);
    expect(resolveThrowProjectileWtypeId(undefined)).toBe(0);
    expect(resolveThrowProjectileWtypeId(42)).toBe(0);
    expect(resolveThrowProjectileWtypeId([null, null])).toBe(0);
    expect(resolveThrowProjectileWtypeId([null, {}])).toBe(0);
  });

  it('finds data entry by id from cache array', () => {
    const data = [null, { id: 1, name: 'A' }, { id: 2, name: 'B' }];
    expect(findDataEntryById(data as unknown[], 2)).toEqual({ id: 2, name: 'B' });
  });

  it('normalizes legacy battler type values', () => {
    expect(normalizeBattlerType('角色', 'enemy')).toBe('actor');
    expect(normalizeBattlerType('敌人', 'actor')).toBe('enemy');
  });

  it('detects actor static preview flag from meta.isStaticImage', () => {
    expect(shouldUseStaticActorPreviewFrame({
      id: 1,
      meta: {
        isStaticImage: true,
      },
    })).toBe(true);
    expect(shouldUseStaticActorPreviewFrame({
      id: 2,
      meta: {
        isStaticImage: false,
      },
    })).toBe(false);
    expect(shouldUseStaticActorPreviewFrame({
      id: 3,
    })).toBe(false);
  });
});
