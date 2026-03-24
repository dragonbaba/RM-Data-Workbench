import { describe, expect, it } from 'vitest';
import { cloneProjectileTemplate, createDefaultProjectileTemplate } from './ProjectileTemplateService';

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
      sourceType: 'actor',
      sourceId: 0,
      targetType: 'enemy',
      targetId: 0,
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
});
