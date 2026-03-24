import type { ProjectileTemplate } from '../types';

export const createDefaultProjectileTemplate = (): ProjectileTemplate => ({
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

export const cloneProjectileTemplate = (
  source: ProjectileTemplate,
  overrides: Partial<ProjectileTemplate> = {},
): ProjectileTemplate => ({
  ...source,
  ...overrides,
  launchAnimation: {
    animationId: source.launchAnimation?.animationId || 0,
    segments: Array.isArray(source.launchAnimation?.segments)
      ? source.launchAnimation.segments.map((segment) => ({ ...segment }))
      : [],
  },
});
