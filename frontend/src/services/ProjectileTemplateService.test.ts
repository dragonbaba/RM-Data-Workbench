import { describe, expect, it } from 'vitest';
import {
  cloneProjectileTemplate,
  createDefaultProjectileTemplate,
  normalizeProjectileDataEntry,
  stripProjectilePreviewFields,
} from './ProjectileTemplateService';

describe('ProjectileTemplateService', () => {
  it('creates the expected default projectile template', () => {
    expect(createDefaultProjectileTemplate()).toEqual({
      name: '新弹道',
      startAnimationId: 0,
      launchAnimation: {
        animationId: 0,
        segments: [
          {
            targetX: 0,
            targetY: -120,
            duration: 60,
            easeX: 'linear',
            easeY: 'linear',
          },
        ],
      },
      endAnimationId: 0,
    });
  });

  it('deep clones nested launch animation data while applying overrides', () => {
    const source = createDefaultProjectileTemplate();
    source.launchAnimation.segments[0].targetX = 64;

    const cloned = cloneProjectileTemplate(source, { name: '复制弹道' });
    cloned.launchAnimation.segments[0].targetX = 128;

    expect(cloned.name).toBe('复制弹道');
    expect(source.launchAnimation.segments[0].targetX).toBe(64);
    expect(cloned.launchAnimation.segments[0].targetX).toBe(128);
  });

  it('strips preview-only fields before persisting edited templates', () => {
    const persisted = stripProjectilePreviewFields({
      ...createDefaultProjectileTemplate(),
      sourceType: 'actor',
      sourceId: 1,
      targetType: 'enemy',
      targetId: 2,
      weaponId: 3,
      skillId: 4,
    });

    expect(persisted).not.toHaveProperty('sourceType');
    expect(persisted).not.toHaveProperty('sourceId');
    expect(persisted).not.toHaveProperty('targetType');
    expect(persisted).not.toHaveProperty('targetId');
    expect(persisted).not.toHaveProperty('weaponId');
    expect(persisted).not.toHaveProperty('skillId');
  });

  it('normalizes legacy projectile fields and strips preview-only data', () => {
    const normalized = normalizeProjectileDataEntry({
      id: 2,
      name: '旧模板',
      sourceType: '角色',
      sourceId: 1,
      targetType: '敌人',
      targetId: 2,
      weaponId: 3,
      skillId: 4,
      launchAnimation: {
        animationId: 5,
        segments: [
          { targetX: 20, targetY: -30, duration: 0, easing: 'easeInQuad' },
        ],
      },
    });

    expect(normalized).toMatchObject({
      launchAnimation: {
        animationId: 5,
        segments: [
          {
            targetX: 20,
            targetY: -30,
            duration: 1,
            easeX: 'easeInQuad',
            easeY: 'easeInQuad',
          },
        ],
      },
    });
    expect(normalized).not.toHaveProperty('sourceType');
    expect(normalized).not.toHaveProperty('sourceId');
    expect(normalized).not.toHaveProperty('targetType');
    expect(normalized).not.toHaveProperty('targetId');
    expect(normalized).not.toHaveProperty('weaponId');
    expect(normalized).not.toHaveProperty('skillId');
    expect(normalized?.launchAnimation.segments[0]).not.toHaveProperty('easing');
  });
});
